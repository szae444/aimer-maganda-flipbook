import { memo, useContext, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { CSSProperties } from 'react';
import type { El, Page, PageBackground, PhotoEl } from '../types';
import { colorCss } from '../theme';
import { actions, useStore } from '../store';
import { ScaleContext, pickFile, trackDrag } from '../lib/gesture';
import { fileToCompressedDataUrl, imageAspect } from '../lib/image';
import { photo as makePhoto } from '../factories';
import { ElementView } from './elements/ElementView';

const KRAFT = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='f'><feTurbulence type='fractalNoise' baseFrequency='.85 .035' numOctaves='3' seed='8'/><feColorMatrix values='0 0 0 0 .25  0 0 0 0 .17  0 0 0 0 .08  0 0 0 -1.6 1.05'/></filter><rect width='100%' height='100%' filter='url(#f)' opacity='.2'/></svg>`,
)}")`;

export function pageBackground(bg: PageBackground): CSSProperties {
  const c = colorCss(bg.color);
  const tint = (pct: number) => `color-mix(in srgb, ${colorCss(bg.patternColor)} ${pct}%, transparent)`;
  const s = bg.patternScale;
  switch (bg.pattern) {
    case 'grid':
      return {
        backgroundColor: c,
        backgroundImage: `linear-gradient(${tint(30)} 1px, transparent 1px), linear-gradient(90deg, ${tint(30)} 1px, transparent 1px)`,
        backgroundSize: `${s}px ${s}px`,
        backgroundPosition: '-1px -1px',
      };
    case 'dots':
      return {
        backgroundColor: c,
        backgroundImage: `radial-gradient(${tint(60)} 1.3px, transparent 1.8px)`,
        backgroundSize: `${s}px ${s}px`,
      };
    case 'lines':
      return {
        backgroundColor: c,
        backgroundImage: `linear-gradient(90deg, transparent 54px, color-mix(in srgb, var(--c-accent1) 45%, transparent) 54px 55px, transparent 55px), linear-gradient(transparent ${s - 1}px, ${tint(38)} ${s - 1}px)`,
        backgroundSize: `100% 100%, 100% ${s}px`,
      };
    case 'linen':
      return {
        backgroundColor: c,
        backgroundImage: `repeating-linear-gradient(0deg, ${tint(9)} 0 1px, transparent 1px ${s}px), repeating-linear-gradient(90deg, ${tint(7)} 0 1px, transparent 1px ${s}px), ${KRAFT}`,
      };
    case 'kraft':
      return { backgroundColor: c, backgroundImage: KRAFT, backgroundSize: '240px 240px' };
    case 'gingham':
      return {
        backgroundColor: c,
        backgroundImage: `linear-gradient(90deg, ${tint(45)} 50%, transparent 50%), linear-gradient(${tint(45)} 50%, transparent 50%)`,
        backgroundSize: `${s}px ${s}px`,
      };
    case 'stripes':
      return {
        backgroundColor: c,
        backgroundImage: `repeating-linear-gradient(90deg, ${tint(35)} 0 ${s / 2}px, transparent ${s / 2}px ${s}px)`,
      };
    default:
      return { backgroundColor: c };
  }
}

interface Props {
  page: Page;
  index: number;
  side: 'left' | 'right';
  /** Renders interactive editing affordances. */
  interactive: boolean;
  /** Skip element rendering (offscreen leaves). */
  blank?: boolean;
}

export const PageFace = memo(function PageFace({ page, index, side, interactive, blank }: Props) {
  const selected = useStore((s) => (s.selected?.pageId === page.id ? s.selected.elId : null));
  const editingId = useStore((s) => s.editingId);
  const scale = useContext(ScaleContext);
  const ref = useRef<HTMLDivElement>(null);
  const [guides, setGuides] = useState<{ v: boolean; h: boolean }>({ v: false, h: false });
  const [dropping, setDropping] = useState(false);

  const toPage = (clientX: number, clientY: number) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: (clientX - r.left) / scale.current, y: (clientY - r.top) / scale.current };
  };

  const onDrop = async (e: React.DragEvent) => {
    setDropping(false);
    if (!interactive) return;
    const file = [...e.dataTransfer.files].find((f) => f.type.startsWith('image/'));
    if (!file) return;
    e.preventDefault();
    const src = await fileToCompressedDataUrl(file);
    const ratio = await imageAspect(src);
    const w = 220;
    const h = Math.round(w / ratio) + 46;
    const p = toPage(e.clientX, e.clientY);
    actions.addEl(page.id, { ...makePhoto({ src }), x: p.x - w / 2, y: p.y - h / 2, w, h, rot: Math.round(Math.random() * 8 - 4) });
  };

  const isFolio = page.role === 'page';

  return (
    <div
      ref={ref}
      className={`page page--${side} role-${page.role}${interactive ? ' is-interactive' : ''}${dropping ? ' is-dropping' : ''}`}
      style={pageBackground(page.background)}
      data-page-index={index}
      aria-label={`Page ${index + 1}`}
      onPointerDown={(e) => {
        if (!interactive || e.target !== e.currentTarget) return;
        useStore.getState().select(null);
        useStore.getState().setActivePage(page.id);
      }}
      onDragOver={(e) => {
        if (!interactive) return;
        e.preventDefault();
        setDropping(true);
      }}
      onDragLeave={() => setDropping(false)}
      onDrop={onDrop}
    >
      {!blank &&
        page.elements.map((el) => (
          <ElementBox
            key={el.id}
            el={el}
            pageId={page.id}
            interactive={interactive}
            selected={selected === el.id}
            editing={editingId === el.id}
            setGuides={setGuides}
          />
        ))}
      {!blank && interactive && selected && <Transformer pageId={page.id} el={page.elements.find((e) => e.id === selected)} />}
      {guides.v && <div className="guide guide--v" />}
      {guides.h && <div className="guide guide--h" />}
      {isFolio && <div className={`folio folio--${side}`}>{String(index - 1).padStart(2, '0')}</div>}
      <div className="page__grain" />
      <div className="page__gutter" />
    </div>
  );
});

/* ------------------------------------------------------------------ */

const TEXTY = new Set(['text', 'note', 'label', 'ticket']);

function boxStyle(el: El): CSSProperties {
  return {
    left: el.x,
    top: el.y,
    width: el.w,
    height: el.h,
    transform: `rotate(${el.rot}deg)`,
    opacity: el.opacity,
  };
}

const ElementBox = memo(function ElementBox({
  el,
  pageId,
  interactive,
  selected,
  editing,
  setGuides,
}: {
  el: El;
  pageId: string;
  interactive: boolean;
  selected: boolean;
  editing: boolean;
  setGuides: (g: { v: boolean; h: boolean }) => void;
}) {
  const scale = useContext(ScaleContext);

  /** Start typing on text-like items, or swap the picture on photos. */
  const activate = async () => {
    if (TEXTY.has(el.type)) {
      // flushSync so focus() runs inside the user gesture — iOS only opens the keyboard then
      flushSync(() => useStore.getState().setEditing(el.id));
    } else if (el.type === 'photo') {
      const file = await pickFile();
      if (!file) return;
      const src = await fileToCompressedDataUrl(file);
      actions.updateEl(pageId, el.id, { src } as Partial<PhotoEl>);
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!interactive || editing || e.button !== 0) return;
    e.stopPropagation();
    const st = useStore.getState();
    // touch screens rarely send double-clicks: a second tap on a selected item opens it instead
    const tapToOpen = selected && e.pointerType !== 'mouse' && !el.locked;
    st.select({ pageId, elId: el.id });
    if (el.locked) return;
    const { x: x0, y: y0 } = el;
    const W = st.book.theme.pageWidth;
    const H = st.book.theme.pageHeight;
    trackDrag(e, {
      onStart: () => useStore.getState().checkpoint(),
      onMove: (dx, dy, ev) => {
        let x = x0 + dx / scale.current;
        let y = y0 + dy / scale.current;
        let v = false;
        let h = false;
        if (!ev.altKey) {
          const snap = 6;
          if (Math.abs(x + el.w / 2 - W / 2) < snap) (x = W / 2 - el.w / 2), (v = true);
          if (Math.abs(y + el.h / 2 - H / 2) < snap) (y = H / 2 - el.h / 2), (h = true);
        }
        setGuides({ v, h });
        actions.updateEl(pageId, el.id, { x: Math.round(x), y: Math.round(y) }, true);
      },
      onEnd: (moved) => {
        setGuides({ v: false, h: false });
        if (!moved && tapToOpen) void activate();
      },
    });
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    if (!interactive || el.locked) return;
    e.stopPropagation();
    void activate();
  };

  return (
    <div
      className={`el el--${el.type}${selected ? ' is-selected' : ''}${editing ? ' is-editing' : ''}${el.locked ? ' is-locked' : ''}`}
      style={boxStyle(el)}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      <ElementView
        el={el}
        editing={editing}
        editable={interactive}
        onTextCommit={(field, value) => {
          useStore.getState().setEditing(null);
          actions.updateEl(pageId, el.id, { [field]: value } as Partial<El>);
        }}
      />
    </div>
  );
});

/* ------------------------------------------------------------------ */

const CORNERS = [
  { key: 'nw', sx: -1, sy: -1 },
  { key: 'ne', sx: 1, sy: -1 },
  { key: 'se', sx: 1, sy: 1 },
  { key: 'sw', sx: -1, sy: 1 },
] as const;

function Transformer({ pageId, el }: { pageId: string; el?: El }) {
  const scale = useContext(ScaleContext);
  const boxRef = useRef<HTMLDivElement>(null);
  if (!el || el.locked) return el ? <div className="xf is-locked" style={boxStyle({ ...el, opacity: 1 })} /> : null;

  const startResize = (e: React.PointerEvent, sx: number, sy: number) => {
    e.stopPropagation();
    const { x, y, w, h, rot } = el;
    const r = (rot * Math.PI) / 180;
    const cos = Math.cos(r);
    const sin = Math.sin(r);
    const cx = x + w / 2;
    const cy = y + h / 2;
    trackDrag(
      e,
      {
        onStart: () => useStore.getState().checkpoint(),
        onMove: (dx, dy, ev) => {
          const px = dx / scale.current;
          const py = dy / scale.current;
          // pointer delta in the element's local (unrotated) axes
          const lx = px * cos + py * sin;
          const ly = -px * sin + py * cos;
          let nw = Math.max(16, w + sx * lx);
          let nh = Math.max(12, h + sy * ly);
          if (ev.shiftKey || el.type === 'sticker') {
            const k = Math.max(16 / w, (sx * lx * w + sy * ly * h) / (w * w + h * h) + 1);
            nw = w * k;
            nh = h * k;
          }
          // keep the opposite corner pinned
          const ox = (sx * (nw - w)) / 2;
          const oy = (sy * (nh - h)) / 2;
          const ncx = cx + ox * cos - oy * sin;
          const ncy = cy + ox * sin + oy * cos;
          actions.updateEl(
            pageId,
            el.id,
            { x: Math.round(ncx - nw / 2), y: Math.round(ncy - nh / 2), w: Math.round(nw), h: Math.round(nh) },
            true,
          );
        },
      },
      1,
    );
  };

  const startRotate = (e: React.PointerEvent) => {
    e.stopPropagation();
    const rect = boxRef.current!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    trackDrag(
      e,
      {
        onStart: () => useStore.getState().checkpoint(),
        onMove: (_dx, _dy, ev) => {
          let a = (Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180) / Math.PI + 90;
          if (a > 180) a -= 360;
          if (ev.shiftKey) a = Math.round(a / 15) * 15;
          else {
            const near = Math.round(a / 45) * 45;
            if (Math.abs(a - near) < 3) a = near;
          }
          actions.updateEl(pageId, el.id, { rot: Math.round(a * 10) / 10 }, true);
        },
      },
      1,
    );
  };

  return (
    <div ref={boxRef} className="xf" style={boxStyle({ ...el, opacity: 1 })}>
      {CORNERS.map((c) => (
        <span
          key={c.key}
          className={`xf__handle xf__handle--${c.key}`}
          onPointerDown={(e) => startResize(e, c.sx, c.sy)}
          style={{ ['--s' as string]: 1 / scale.current } as CSSProperties}
        />
      ))}
      <span className="xf__stem" style={{ ['--s' as string]: 1 / scale.current } as CSSProperties} />
      <span
        className="xf__rotate"
        title="Drag to rotate (Shift snaps to 15°)"
        onPointerDown={startRotate}
        style={{ ['--s' as string]: 1 / scale.current } as CSSProperties}
      />
    </div>
  );
}
