import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useStore } from '../store';
import { ScaleContext } from '../lib/gesture';
import { playFlip } from '../lib/sound';
import { clamp } from '../lib/id';
import { clipMatrix, computeFold, constrainCorner, creaseStrip, css, inv, mul, restFold, type Fold, type Mat, type Pt } from '../lib/fold';
import { PageFace } from './PageFace';

/** Imperative handle so toolbars, thumbnails and keys can drive the book. */
export const bookControl = {
  next: () => {},
  prev: () => {},
  goTo: (_turned: number) => {},
};

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The corner currently being pulled on a soft page (leaf coordinates). */
interface Corner {
  leaf: number;
  A: Pt;
  C: Pt;
}

const PEEK_RADIUS = 120;
/** Bitmap size of the light strips; the GPU stretches them into place. */
const STRIP = 256;

const LIGHT_STOPS: Record<'shade' | 'cast', [number, string][]> = {
  // crease shadow, then a sheen where the paper curves, fading out across the flap
  shade: [
    [0, 'rgba(0,0,0,0.30)'],
    [0.025, 'rgba(0,0,0,0.12)'],
    [0.16, 'rgba(255,255,255,0.20)'],
    [0.5, 'rgba(255,255,255,0)'],
    [1, 'rgba(0,0,0,0.14)'],
  ],
  // shadow the lifted page casts on the page underneath
  cast: [
    [0, 'rgba(0,0,0,0.5)'],
    [1, 'rgba(0,0,0,0)'],
  ],
};

/**
 * A gradient drawn once into a small canvas. Canvases are GPU textures, so stretching
 * one across the crease costs no painting and almost no memory on phones.
 */
const FoldLight = memo(function FoldLight({ kind }: { kind: 'shade' | 'cast' }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const g = ctx.createLinearGradient(0, 0, STRIP, 0);
    for (const [at, color] of LIGHT_STOPS[kind]) g.addColorStop(at, color);
    ctx.clearRect(0, 0, STRIP, STRIP);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, STRIP, STRIP);
  }, [kind]);
  return <canvas ref={ref} width={STRIP} height={STRIP} className={kind === 'shade' ? 'fold-shade' : 'fold-cast__strip'} aria-hidden />;
});

export function Book() {
  const pages = useStore((s) => s.book.pages);
  const theme = useStore((s) => s.book.theme);
  const mode = useStore((s) => s.mode);
  const turned = useStore((s) => s.turned);
  const setTurned = useStore((s) => s.setTurned);

  const W = theme.pageWidth;
  const H = theme.pageHeight;
  const L = pages.length / 2;
  /** Half-size of the crease clip box: the page diagonal covers every point from any crease. */
  const BIG = Math.ceil(Math.hypot(W, H)) + 16;

  const stageRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const leafRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scaleRef = useRef(1);
  const posRef = useRef(turned);
  const cornerRef = useRef<Corner | null>(null);
  const animRef = useRef<number>(0);
  const peekAnimRef = useRef<number>(0);
  const busyRef = useRef(false);
  const peekingRef = useRef(false);
  const [scale, setScale] = useState(1);
  const [narrow, setNarrow] = useState(false);
  const [focus, setFocus] = useState<'left' | 'right'>('right');
  /** Which spread's neighbours have their content mounted. Lags `turned`, so mounting never happens mid-turn. */
  const [contentAt, setContentAt] = useState(turned);
  const [jumpAt, setJumpAt] = useState<number | null>(null);
  useEffect(() => {
    const id = window.setTimeout(() => {
      setContentAt(turned);
      setJumpAt(null);
    }, 140);
    return () => window.clearTimeout(id);
  }, [turned]);

  // covers are boards; everything else is paper
  const hard = useMemo(
    () => Array.from({ length: L }, (_, i) => pages[i * 2].role === 'cover' || pages[i * 2 + 1]?.role === 'cover'),
    [pages, L],
  );
  const hardRef = useRef(hard);
  hardRef.current = hard;

  /* ---------------- fit to stage ---------------- */
  useLayoutEffect(() => {
    const stage = stageRef.current!;
    const fit = () => {
      const r = stage.getBoundingClientRect();
      // one page at a time only on phone-sized stages; otherwise always show the full spread
      const isNarrow = r.width < 640 && r.width / r.height < ((W * 2) / H) * 0.8;
      const cols = isNarrow ? 1 : 2;
      const s = Math.min((r.width * 0.94) / (W * cols), (r.height * 0.9) / H);
      const changed = Math.abs(s - scaleRef.current) > 0.001;
      scaleRef.current = s;
      setScale(s);
      setNarrow(isNarrow);
      applyRef.current?.(posRef.current);
      if (changed) {
        // GPU layers keep the resolution they were painted at; repaint them once at the new size
        stage.classList.add('relayer');
        requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.remove('relayer')));
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [W, H]);

  /* ---------------- soft paper fold ---------------- */
  const fracFromC = useCallback((C: Pt) => clamp((W - C.x) / (2 * W), 0, 1), [W]);

  /** Default corner path for animated turns: the bottom corner lifts, arcs over and lands. */
  const cornerAt = useCallback(
    (f: number): Pt => ({
      x: W - 2 * W * f,
      y: H - Math.pow(Math.sin(Math.PI * f), 0.8) * H * 0.22,
    }),
    [W, H],
  );

  /*
   * Style writes go through a cache so each frame only touches what actually changed:
   * a turn moves one leaf, and the other leaves stay untouched (no style recalc for them).
   */
  const styleCache = useRef(new WeakMap<HTMLElement, Record<string, string>>());
  const write = (el: HTMLElement, key: string, value: string, set: (v: string) => void) => {
    let c = styleCache.current.get(el);
    if (!c) styleCache.current.set(el, (c = {}));
    if (c[key] === value) return;
    c[key] = value;
    set(value);
  };

  const setT = (el: HTMLElement | null | undefined, m: string) => el && write(el, 't', m, (v) => (el.style.transform = v));
  const setO = (el: HTMLElement | null | undefined, o: number) =>
    el && write(el, 'o', o.toFixed(3), (v) => (el.style.opacity = v));

  /** The structural parts of a leaf (looked up once per element). */
  const partsCache = useRef(new WeakMap<HTMLElement, Record<string, HTMLElement | null>>());
  const parts = (leaf: HTMLElement) => {
    let p = partsCache.current.get(leaf);
    if (!p) {
      const q = (s: string) => leaf.querySelector<HTMLElement>(s);
      p = {
        clip: q(':scope > .leaf__clip'),
        front: q('.leaf__face--front'),
        back: q('.leaf__face--back'),
        shade: q('.fold-shade'),
        cast: q('.fold-cast__strip'),
        frontShade: q('.leaf__face--front > .leaf__shade'),
        backShade: q('.leaf__face--back > .leaf__shade'),
        frontLift: q('.leaf__face--front > .leaf__lift'),
        backLift: q('.leaf__face--back > .leaf__lift'),
      };
      partsCache.current.set(leaf, p);
    }
    return p;
  };

  /**
   * Paper page: transforms only. A big rotated box with overflow:hidden sits with its edge
   * on the crease (the clip); the front face is counter-moved so it stays put, the back face
   * is mirrored over the crease, and two gradient strips are slid into place for the light.
   */
  const applySoft = useCallback(
    (leaf: HTMLElement, fold: Fold, light: number) => {
      const { clip, front, back, shade, cast } = parts(leaf);
      const clipM = clipMatrix(fold.M, fold.n, BIG);
      const unclip = inv(clipM);
      setT(clip, css(clipM));
      setT(front, css(unclip));
      setT(back, css(mul(unclip, fold.back)));
      let shadeM: Mat | null = null;
      let castM: Mat | null = null;
      if (light > 0.001) {
        const D = Math.max(1, fold.depth);
        const s = creaseStrip(fold.M, fold.n, -1, D, W, H, STRIP);
        shadeM = s && mul(inv(fold.back), s);
        castM = creaseStrip(fold.M, fold.n, 1, Math.min(90, D * 0.6), W, H, STRIP);
        if (shadeM) setT(shade, css(shadeM));
        if (castM) setT(cast, css(castM));
      }
      setO(shade, shadeM ? light : 0);
      setO(cast, castM ? light : 0);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [BIG],
  );

  /* ---------------- render a fractional position ---------------- */
  const apply = useCallback(
    (pos: number) => {
      const base = Math.floor(pos);
      const frac = pos - base;
      for (let i = 0; i < L; i++) {
        const leaf = leafRefs.current[i];
        if (!leaf) continue;
        const corner = cornerRef.current?.leaf === i ? cornerRef.current : null;
        let p = i < base ? 1 : i === base ? frac : 0;
        if (corner) p = fracFromC(corner.C);
        const moving = (p > 0 && p < 1) || !!corner;

        if (!hardRef.current[i]) {
          setT(leaf, 'none');
          const fold = moving ? computeFold(corner?.A ?? { x: W, y: H }, corner?.C ?? cornerAt(p), W, H) : null;
          applySoft(leaf, fold ?? restFold(p >= 0.5, W), fold ? 0.3 + 0.7 * Math.sin(Math.PI * clamp(p, 0, 1)) : 0);
        } else {
          // covers are boards: a 3D swing, with light faded in by opacity only
          const { clip, front, back, frontShade, backShade, frontLift, backLift } = parts(leaf);
          // clear anything left from when this leaf was a paper page (pages can be added/removed)
          setT(clip, '');
          setT(front, '');
          setT(back, '');
          setT(leaf, `perspective(${W * 5}px) rotateY(${(-180 * p).toFixed(2)}deg)`);
          setO(frontShade, p);
          setO(backShade, 1 - p);
          setO(frontLift, Math.sin(p * Math.PI));
          setO(backLift, Math.sin(p * Math.PI));
        }
        write(leaf, 'z', String(moving ? L + 2 : p >= 0.5 ? i + 1 : L - i), (v) => (leaf.style.zIndex = v));
        write(leaf, 'side', p >= 0.5 ? 'left' : 'right', (v) => (leaf.dataset.side = v));
        write(leaf, 'moving', moving ? '1' : '', (v) => (v ? (leaf.dataset.moving = v) : delete leaf.dataset.moving));
      }

      // A closed book sits centred; opening slides it so the spine is centred.
      const book = bookRef.current;
      if (book) {
        let offset = 0;
        if (!narrow) {
          if (pos < 1) offset = (-W / 2) * (1 - pos);
          else if (pos > L - 1) offset = (W / 2) * (pos - (L - 1));
        }
        setT(book, `scale(${scaleRef.current.toFixed(4)}) translateX(${offset.toFixed(2)}px)`);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [L, W, H, narrow, applySoft, cornerAt, fracFromC],
  );
  const applyRef = useRef(apply);
  applyRef.current = apply;

  useLayoutEffect(() => {
    // light canvases mount/unmount as leaves enter the content window: forget cached lookups
    partsCache.current = new WeakMap();
    posRef.current = clamp(posRef.current, 0, L);
    apply(posRef.current);
  }, [apply, L, pages, contentAt, jumpAt, turned]);

  /* ---------------- animation ---------------- */
  const finish = useCallback(
    (target: number) => {
      cornerRef.current = null;
      posRef.current = target;
      busyRef.current = false;
      apply(target);
      setTurned(target);
    },
    [apply, setTurned],
  );

  const animateTo = useCallback(
    (target: number) => {
      target = clamp(Math.round(target), 0, L);
      cancelAnimationFrame(animRef.current);
      cancelAnimationFrame(peekAnimRef.current);
      peekingRef.current = false;
      cornerRef.current = null;
      const from = posRef.current;
      const dist = Math.abs(target - from);
      if (dist < 0.001) return finish(target);
      busyRef.current = true;
      const per = reducedMotion() ? 160 : useStore.getState().book.theme.flipDuration;
      const duration = per * Math.min(dist, 1) + per * 0.22 * Math.max(0, dist - 1);
      const sound = useStore.getState().book.theme.flipSound;
      // only long jumps need pages mounted up front; single turns are already covered
      if (dist > 1.5) setJumpAt(target);
      let lastLeaf = Math.floor(from);
      if (sound) playFlip(0.45);
      const t0 = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / duration);
        const pos = from + (target - from) * ease(t);
        posRef.current = pos;
        apply(pos);
        const leaf = Math.floor(pos);
        if (sound && leaf !== lastLeaf && dist > 1 && t < 0.95) playFlip(0.25);
        lastLeaf = leaf;
        if (t < 1) animRef.current = requestAnimationFrame(step);
        else finish(target);
      };
      animRef.current = requestAnimationFrame(step);
    },
    [L, apply, finish],
  );

  /** Moves a pulled corner to `to`, then settles the book at `settle` leaves turned. */
  const animateCorner = useCallback(
    (leaf: number, A: Pt, to: Pt, settle: number, duration: number) => {
      cancelAnimationFrame(animRef.current);
      const from = cornerRef.current?.C ?? to;
      busyRef.current = true;
      const t0 = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / duration);
        const k = easeOut(t);
        // a little lift mid-way so the page arcs instead of sliding flat
        const arc = Math.sin(Math.PI * k) * Math.min(40, Math.abs(to.x - from.x) * 0.06) * (A.y > H / 2 ? 1 : -1);
        const C = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k - arc };
        cornerRef.current = { leaf, A, C };
        posRef.current = leaf + fracFromC(C);
        apply(posRef.current);
        if (t < 1) animRef.current = requestAnimationFrame(step);
        else finish(settle);
      };
      animRef.current = requestAnimationFrame(step);
    },
    [H, apply, finish, fracFromC],
  );

  /* ---------------- navigation (with single-page panning on phones) ---------------- */
  const target = () => Math.round(posRef.current);

  const next = useCallback(() => {
    const t = target();
    if (narrow && focus === 'left' && t < L) return setFocus('right');
    if (t >= L) return;
    animateTo(t + 1);
    setFocus('left');
  }, [narrow, focus, L, animateTo]);

  const prev = useCallback(() => {
    const t = target();
    if (narrow && focus === 'right' && t > 0) return setFocus('left');
    if (t <= 0) return;
    animateTo(t - 1);
    setFocus('right');
  }, [narrow, focus, animateTo]);

  useEffect(() => {
    bookControl.next = next;
    bookControl.prev = prev;
    bookControl.goTo = (n: number) => {
      animateTo(n);
      setFocus(n === 0 ? 'right' : 'left');
    };
  }, [next, prev, animateTo]);

  // on phones, picking a page in the editor pans to it
  const activePageId = useStore((s) => s.activePageId);
  useEffect(() => {
    if (!narrow || !activePageId) return;
    const idx = pages.findIndex((p) => p.id === activePageId);
    if (idx === turned * 2 - 1) setFocus('left');
    else if (idx === turned * 2) setFocus('right');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePageId]);

  // closed covers only have one visible side
  useEffect(() => {
    if (turned === 0) setFocus('right');
    else if (turned === L) setFocus('left');
  }, [turned, L]);

  /* ---------------- pointer helpers ---------------- */
  /** Pointer position in leaf coordinates (spine at x = 0). */
  const toLeaf = (clientX: number, clientY: number): Pt => {
    const r = bookRef.current!.getBoundingClientRect();
    const s = scaleRef.current;
    return { x: (clientX - (r.left + W * s)) / s, y: (clientY - r.top) / s };
  };

  /* ---------------- hover: the corner lifts toward the cursor ---------------- */
  const releasePeek = () => {
    if (!peekingRef.current || busyRef.current) return;
    peekingRef.current = false;
    const c = cornerRef.current;
    if (!c) return;
    const restX = c.leaf < Math.round(posRef.current) ? -W : W;
    const from = c.C;
    const to = { x: restX, y: c.A.y };
    const t0 = performance.now();
    cancelAnimationFrame(peekAnimRef.current);
    const step = (now: number) => {
      if (busyRef.current || peekingRef.current) return;
      const t = Math.min(1, (now - t0) / 220);
      const k = easeOut(t);
      cornerRef.current = { ...c, C: { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k } };
      apply(posRef.current);
      if (t < 1) peekAnimRef.current = requestAnimationFrame(step);
      else {
        cornerRef.current = null;
        apply(posRef.current);
      }
    };
    peekAnimRef.current = requestAnimationFrame(step);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (mode !== 'read' || busyRef.current || e.pointerType === 'touch' || e.buttons) return;
    const p = toLeaf(e.clientX, e.clientY);
    const t = target();
    let hit: Corner | null = null;
    // the corner curls up past the cursor, so even a light touch shows a proper peel
    const PEEL = 46;
    for (const ay of [H, 0]) {
      const dy = ay ? -1 : 1;
      if (p.x > 0 && t < L && !hardRef.current[t] && Math.hypot(p.x - W, p.y - ay) < PEEK_RADIUS) {
        const rest = { x: W, y: ay };
        hit = { leaf: t, A: rest, C: { x: rest.x + (p.x - rest.x) * 0.9 - PEEL, y: rest.y + (p.y - rest.y) * 0.9 + dy * PEEL * 0.7 } };
      } else if (p.x < 0 && t > 0 && !hardRef.current[t - 1] && Math.hypot(p.x + W, p.y - ay) < PEEK_RADIUS) {
        const rest = { x: -W, y: ay };
        hit = { leaf: t - 1, A: { x: W, y: ay }, C: { x: rest.x + (p.x - rest.x) * 0.9 + PEEL, y: rest.y + (p.y - rest.y) * 0.9 + dy * PEEL * 0.7 } };
      }
    }
    if (hit) {
      cancelAnimationFrame(peekAnimRef.current);
      peekingRef.current = true;
      hit.C = constrainCorner(hit.A, hit.C, W, H);
      cornerRef.current = hit;
      apply(posRef.current);
    } else releasePeek();
  };

  /* ---------------- drag to turn ---------------- */
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const onCorner = !!(e.target as HTMLElement).closest('.dogear');
    if (mode === 'edit' && !onCorner) return;
    const p0 = toLeaf(e.clientX, e.clientY);
    const t = target();
    const forward = p0.x >= 0;
    if ((forward && t >= L) || (!forward && t <= 0)) return;
    const leaf = forward ? t : t - 1;
    const soft = !hardRef.current[leaf];
    cancelAnimationFrame(animRef.current);
    cancelAnimationFrame(peekAnimRef.current);
    peekingRef.current = false;
    busyRef.current = true;

    // soft pages: pull the nearer corner; it follows the pointer
    const A: Pt = { x: W, y: p0.y > H / 2 ? H : 0 };
    const startC: Pt = cornerRef.current?.leaf === leaf ? cornerRef.current.C : { x: forward ? W : -W, y: A.y };
    const startPos = posRef.current;
    let lastX = p0.x;
    let lastTime = performance.now();
    let vx = 0;
    let dragged = false;
    let rustled = false;
    let lastClientX = e.clientX;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* capture is a nicety; window listeners below still track the drag */
    }

    const move = (ev: PointerEvent) => {
      const p = toLeaf(ev.clientX, ev.clientY);
      if (!dragged && Math.hypot(p.x - p0.x, p.y - p0.y) * scaleRef.current < 6) return;
      dragged = true;
      lastClientX = ev.clientX;
      const now = performance.now();
      vx = (p.x - lastX) / Math.max(1, now - lastTime);
      lastX = p.x;
      lastTime = now;
      if (soft) {
        let C = { x: startC.x + p.x - p0.x, y: startC.y + p.y - p0.y };
        // pulling the page away from the spine (or straight up/down) doesn't fold anything
        const rest = { x: forward ? W : -W, y: A.y };
        if (forward ? C.x > W - 1 : C.x < -W + 1) C = rest;
        C = constrainCorner(A, C, W, H);
        cornerRef.current = { leaf, A, C };
        posRef.current = leaf + fracFromC(C);
        if (!rustled && C !== rest && useStore.getState().book.theme.flipSound) {
          rustled = true;
          playFlip(0.35);
        }
      } else {
        // boards swing around the spine; the outer edge tracks the pointer
        const rel = clamp(p.x / W, -1, 1);
        const rel0 = clamp(p0.x / W, -1, 1);
        const frac = forward ? clamp((rel0 - rel) / (rel0 + 1), 0, 1) : 1 - clamp((rel - rel0) / (1 - rel0), 0, 1);
        posRef.current = leaf + frac;
        if (!rustled && frac > 0.01 && useStore.getState().book.theme.flipSound) {
          rustled = true;
          playFlip(0.35);
        }
      }
      apply(posRef.current);
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (!dragged) {
        busyRef.current = false;
        // a tap turns the page; on phones only one page shows, so use the screen half instead
        const stage = stageRef.current!.getBoundingClientRect();
        const goForward = narrow ? e.clientX > stage.left + stage.width / 2 : forward;
        const peeked = cornerRef.current;
        if (peeked && !narrow && peeked.leaf === leaf && soft) {
          // finish the turn from wherever the hovering corner already is
          const per = useStore.getState().book.theme.flipDuration;
          if (useStore.getState().book.theme.flipSound) playFlip(0.45);
          animateCorner(leaf, peeked.A, { x: forward ? -W : W, y: peeked.A.y }, forward ? t + 1 : t - 1, per * 0.85);
          setFocus(forward ? 'left' : 'right');
          return;
        }
        cornerRef.current = null;
        apply(startPos);
        if (goForward) next();
        else prev();
        return;
      }
      const f = posRef.current - leaf;
      // Phones show one page: a swipe that can't fold this page means "go to the other half of the spread".
      const swipe = lastClientX - e.clientX;
      if (narrow && ((forward && f < 0.03 && swipe > 40) || (!forward && f > 0.97 && swipe < -40))) {
        cornerRef.current = null;
        busyRef.current = false;
        apply(startPos);
        if (forward) prev();
        else next();
        return;
      }
      const flick = Math.abs(vx) > 0.35;
      const turnedOver = flick ? vx < 0 : forward ? f > 0.35 : f > 0.65;
      const settle = leaf + (turnedOver ? 1 : 0);
      if (soft) {
        const per = useStore.getState().book.theme.flipDuration;
        const remaining = Math.abs((turnedOver ? 1 : 0) - f);
        animateCorner(leaf, A, { x: turnedOver ? -W : W, y: A.y }, settle, Math.max(180, per * 0.75 * remaining + 120));
      } else {
        animateTo(settle);
      }
      setFocus(turnedOver ? 'left' : 'right');
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  /* ---------------- what to render ---------------- */
  const leaves = useMemo(() => Array.from({ length: L }, (_, i) => i), [L]);
  // Faces that can show during the next turn either way: fronts of leaves c-1..c+1, backs of c-2..c.
  // Only these hold page content (and a GPU layer); the rest are plain paper.
  const centres = jumpAt === null ? [contentAt, turned] : [contentAt, turned, jumpAt];
  const needFront = (i: number) => centres.some((c) => i >= c - 1 && i <= c + 1);
  const needBack = (i: number) => centres.some((c) => i >= c - 2 && i <= c);
  const pan = narrow ? (focus === 'left' ? W / 2 : -W / 2) : 0;
  const leftStack = Math.min(turned, 8);
  const rightStack = Math.min(L - turned, 8);

  const stageStyle = {
    '--scale': scale,
    '--pan': `${pan}px`,
    '--stack-l': leftStack,
    '--stack-r': rightStack,
  } as CSSProperties;

  return (
    <ScaleContext.Provider value={scaleRef}>
      <div
        ref={stageRef}
        className={`stage${narrow ? ' is-narrow' : ''}`}
        style={stageStyle}
        onClick={(e) => {
          // taps on the empty desk beside the book turn pages too (handy on phones)
          if (mode !== 'read' || (e.target as HTMLElement).closest('.book')) return;
          const r = stageRef.current!.getBoundingClientRect();
          if (e.clientX > r.left + r.width / 2) next();
          else prev();
        }}
      >
        <div className="stage__pan">
          <div
            ref={bookRef}
            className={`book mode-${mode}${turned === 0 ? ' is-closed-front' : ''}${turned === L ? ' is-closed-back' : ''}`}
            style={{ width: W * 2, height: H }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerLeave={releasePeek}
          >
            <div className="book__shadow book__shadow--left" />
            <div className="book__shadow book__shadow--right" />
            <div className="book__stack book__stack--left" />
            <div className="book__stack book__stack--right" />
            {leaves.map((i) => {
              const front = pages[i * 2];
              const back = pages[i * 2 + 1];
              const liveFront = needFront(i);
              const liveBack = needBack(i);
              const interactive = mode === 'edit' && Math.abs(i - turned) <= 1;
              const lit = !hard[i] && (liveFront || liveBack);
              // Paper faces nobody can see right now are hidden: otherwise they get painted into one
              // huge layer the size of the crease clip (hundreds of MB of GPU memory on a phone).
              // During a multi-page jump the pages flipping past must stay visible.
              const hideIdle = !hard[i] && jumpAt === null;
              return (
                <div
                  key={i}
                  ref={(n) => {
                    leafRefs.current[i] = n;
                  }}
                  className={`leaf${hard[i] ? ' is-hard' : ' is-soft'}`}
                  style={{ width: W, height: H, left: W }}
                >
                  <div className="leaf__clip" style={hard[i] ? undefined : { width: BIG, height: BIG * 2 }}>
                    {/* faces holding content get a stable GPU layer: painted once, then only moved */}
                    <div className={`leaf__face leaf__face--front${liveFront ? ' is-live' : hideIdle ? ' is-off' : ''}`}>
                      <PageFace page={front} index={i * 2} side="right" interactive={interactive && i === turned} blank={!liveFront} />
                      <div className="dogear dogear--right" aria-hidden />
                      <div className="leaf__shade" />
                      <div className="leaf__lift" />
                    </div>
                    <div className={`leaf__face leaf__face--back${liveBack ? ' is-live' : hideIdle ? ' is-off' : ''}`}>
                      {back && <PageFace page={back} index={i * 2 + 1} side="left" interactive={interactive && i === turned - 1} blank={!liveBack} />}
                      <div className="dogear dogear--left" aria-hidden />
                      <div className="leaf__shade" />
                      <div className="leaf__lift" />
                      {lit && <FoldLight kind="shade" />}
                    </div>
                  </div>
                  <div className="fold-cast">{lit && <FoldLight kind="cast" />}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ScaleContext.Provider>
  );
}
