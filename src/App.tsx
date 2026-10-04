import { useEffect, useState } from 'react';
import type { ElType, Page, StickerKind } from './types';
import { actions, findEl, spreadPages, turnedForPage, useStore } from './store';
import { applyTheme, ensureFonts } from './theme';
import { makeEl, photo as makePhoto, sticker as makeSticker } from './factories';
import { fileToCompressedDataUrl, imageAspect } from './lib/image';
import { pickFile } from './lib/gesture';
import { saveBookSoon } from './lib/persist';
import { EDITOR_ENABLED } from './config';
import { Book, bookControl } from './components/Book';
import { Inspector, useEditablePage } from './components/Inspector';
import { PageFace } from './components/PageFace';
import { Icon } from './components/Icon';
import { STICKER_KINDS, StickerSvg } from './components/elements/Stickers';
import { colorCss } from './theme';

export default function App() {
  const book = useStore((s) => s.book);
  const mode = useStore((s) => s.mode);

  // theme → CSS variables
  useEffect(() => applyTheme(book.theme), [book.theme]);
  useEffect(() => {
    document.title = book.title;
  }, [book.title]);

  // fonts picked per-element
  useEffect(() => {
    const fams = new Set<string>();
    for (const p of book.pages)
      for (const e of p.elements) {
        if ('font' in e) fams.add(e.font);
        if (e.type === 'photo') fams.add(e.captionFont);
      }
    ensureFonts(fams);
  }, [book.pages]);

  // autosave
  useEffect(() => {
    useStore.getState().setSaveState('saving');
    saveBookSoon(book, () => useStore.getState().setSaveState('saved'));
  }, [book]);

  useKeyboard();
  usePasteImages();

  return (
    <div className={`app mode-${mode} desk-${book.theme.desk}`}>
      <Header />
      <main className="app__main">
        {mode === 'edit' && <AddDock />}
        <div className="app__stage">
          <Book />
        </div>
        {mode === 'edit' && <Inspector />}
      </main>
      <NavBar />
      <Contents />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Header() {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const saveState = useStore((s) => s.saveState);

  return (
    <header className="topbar">
      <a className="wordmark" href="./" aria-label="Aimer Maganda Flipbook — home">
        <span className="wordmark__a">Aimer</span>
        <span className="wordmark__m">maganda</span>
        <span className="wordmark__f">flipbook</span>
      </a>

      <div className="topbar__right">
        {mode === 'edit' && (
          <div className="topbar__tools">
            <span className={`savestate is-${saveState}`}>{saveState === 'saving' ? 'saving…' : 'saved'}</span>
            <button className="icon-btn" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={() => useStore.getState().undo()}>
              <Icon name="undo" />
            </button>
            <button className="icon-btn" title="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={() => useStore.getState().redo()}>
              <Icon name="redo" />
            </button>
          </div>
        )}
        {EDITOR_ENABLED && (
          <div className="modeswitch" role="tablist" aria-label="Mode">
            <button role="tab" aria-selected={mode === 'read'} className={mode === 'read' ? 'is-on' : ''} onClick={() => setMode('read')}>
              <Icon name="book" size={16} /> Read
            </button>
            <button role="tab" aria-selected={mode === 'edit'} className={mode === 'edit' ? 'is-on' : ''} onClick={() => setMode('edit')}>
              <Icon name="pen" size={16} /> Edit
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */

const TOOLS: { type: ElType; label: string; icon: string }[] = [
  { type: 'text', label: 'Text', icon: 'text' },
  { type: 'photo', label: 'Photo', icon: 'image' },
  { type: 'sticker', label: 'Sticker', icon: 'sticker' },
  { type: 'tape', label: 'Tape', icon: 'tape' },
  { type: 'note', label: 'Note', icon: 'note' },
  { type: 'ticket', label: 'Ticket', icon: 'ticket' },
  { type: 'label', label: 'Label', icon: 'label' },
];

function AddDock() {
  const { id: pageId } = useEditablePage();
  const theme = useStore((s) => s.book.theme);
  const [stickers, setStickers] = useState(false);

  const place = <T extends { w: number; h: number; x: number; y: number; rot: number }>(el: T): T => ({
    ...el,
    x: Math.round(theme.pageWidth / 2 - el.w / 2 + (Math.random() * 40 - 20)),
    y: Math.round(theme.pageHeight / 2 - el.h / 2 + (Math.random() * 40 - 20)),
    rot: el.rot || Math.round((Math.random() * 6 - 3) * 2) / 2,
  });

  const add = async (type: ElType) => {
    if (type === 'sticker') return setStickers((s) => !s);
    setStickers(false);
    if (type === 'photo') {
      const file = await pickFile();
      const el = makePhoto();
      if (file) {
        el.src = await fileToCompressedDataUrl(file);
        const ratio = await imageAspect(el.src);
        el.h = Math.round((el.w - 24) / ratio) + 70;
      }
      return actions.addEl(pageId, place(el));
    }
    const el = makeEl(type);
    if (type === 'tape') el.rot = Math.round(Math.random() * 16 - 8);
    actions.addEl(pageId, place(el));
  };

  const addSticker = (kind: StickerKind) => {
    actions.addEl(pageId, place(makeSticker(kind)));
  };

  return (
    <aside className="dock" aria-label="Add to page">
      <div className="dock__label">Add</div>
      {TOOLS.map((t) => (
        <button key={t.type} className={`dock__btn${t.type === 'sticker' && stickers ? ' is-on' : ''}`} onClick={() => add(t.type)} title={`Add ${t.label.toLowerCase()}`}>
          <Icon name={t.icon} size={20} />
          <span>{t.label}</span>
        </button>
      ))}
      {stickers && (
        <div className="dock__drawer">
          <div className="popover__label">Sticker sheet</div>
          <div className="sticker-grid">
            {STICKER_KINDS.map((k) => {
              const d = makeSticker(k.kind);
              return (
                <button key={k.kind} className="sticker-opt" title={k.label} onClick={() => addSticker(k.kind)}>
                  <StickerSvg kind={k.kind} fill={colorCss(d.color)} ink={colorCss(d.color2)} text="" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}

/* ------------------------------------------------------------------ */

/** Inner pages are numbered like the printed folios; covers and endpapers have no number. */
function spreadLabel(pages: Page[], indices: number[]) {
  const nums = indices.filter((i) => pages[i]?.role === 'page').map((i) => String(i - 1).padStart(2, '0'));
  return nums.length ? nums.join('–') : 'Endpapers';
}

function NavBar() {
  const turned = useStore((s) => s.turned);
  const pages = useStore((s) => s.book.pages);
  const sound = useStore((s) => s.book.theme.flipSound);
  const total = pages.length;
  const L = total / 2;
  const { left, right } = spreadPages(turned, total);
  const label = turned === 0 ? 'Cover' : turned === L ? 'Back cover' : spreadLabel(pages, [left, right]);

  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  };

  return (
    <footer className="navbar">
      <div className="navbar__group">
        <button className="icon-btn" title="Contents" onClick={() => useStore.getState().setContentsOpen(true)}>
          <Icon name="grid" />
        </button>
      </div>
      <div className="navbar__pager">
        <button className="icon-btn" title="First page (Home)" disabled={turned === 0} onClick={() => bookControl.goTo(0)}>
          <Icon name="first" />
        </button>
        <button className="icon-btn icon-btn--big" title="Previous (←)" disabled={turned === 0} onClick={() => bookControl.prev()}>
          <Icon name="prev" size={22} />
        </button>
        <div className="navbar__count">
          <span className="navbar__now">{label}</span>
          <span className="navbar__of">/ {String(total).padStart(2, '0')}</span>
          <span className="navbar__progress" style={{ ['--p' as string]: turned / L }} />
        </div>
        <button className="icon-btn icon-btn--big" title="Next (→)" disabled={turned === L} onClick={() => bookControl.next()}>
          <Icon name="next" size={22} />
        </button>
        <button className="icon-btn" title="Last page (End)" disabled={turned === L} onClick={() => bookControl.goTo(L)}>
          <Icon name="last" />
        </button>
      </div>
      <div className="navbar__group">
        <button
          className="icon-btn"
          title={sound ? 'Mute page sound' : 'Turn on page sound'}
          onClick={() => actions.updateTheme((t) => void (t.flipSound = !t.flipSound))}
        >
          <Icon name={sound ? 'sound' : 'mute'} />
        </button>
        <button className="icon-btn" title="Fullscreen" onClick={toggleFull}>
          <Icon name="expand" />
        </button>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */

function Contents() {
  const open = useStore((s) => s.contentsOpen);
  const pages = useStore((s) => s.book.pages);
  const turned = useStore((s) => s.turned);
  const theme = useStore((s) => s.book.theme);
  const close = () => useStore.getState().setContentsOpen(false);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open]);

  if (!open) return null;
  const thumbW = 92;
  const s = thumbW / theme.pageWidth;
  const spreads: number[][] = [[0]];
  for (let i = 1; i < pages.length; i += 2) spreads.push(i + 1 < pages.length ? [i, i + 1] : [i]);

  return (
    <div className="contents" role="dialog" aria-label="Contents" onClick={close}>
      <div className="contents__sheet" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>Contents</h2>
          <button className="icon-btn" onClick={close} title="Close (Esc)">
            <Icon name="close" />
          </button>
        </header>
        <div className="contents__grid">
          {spreads.map((sp) => {
            const t = turnedForPage(sp[0]);
            return (
              <button
                key={sp[0]}
                className={`thumb${t === turned ? ' is-current' : ''}`}
                onClick={() => {
                  bookControl.goTo(t);
                  close();
                }}
              >
                <span className="thumb__pages" style={{ height: theme.pageHeight * s }}>
                  {sp.map((i) => (
                    <span key={i} className="thumb__page" style={{ width: thumbW, height: theme.pageHeight * s }}>
                      <span style={{ transform: `scale(${s})`, width: theme.pageWidth, height: theme.pageHeight }}>
                        <PageFace page={pages[i]} index={i} side={i % 2 ? 'left' : 'right'} interactive={false} />
                      </span>
                    </span>
                  ))}
                </span>
                <span className="thumb__label">{sp[0] === 0 ? 'Cover' : sp.length === 1 ? 'Back' : spreadLabel(pages, sp)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement;
  return t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName);
}

function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      const st = useStore.getState();
      const mod = e.ctrlKey || e.metaKey;
      const sel = st.selected;

      if (st.mode === 'edit' && mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        return e.shiftKey ? st.redo() : st.undo();
      }
      if (st.mode === 'edit' && mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        return st.redo();
      }

      if (st.mode === 'edit' && sel) {
        const el = findEl(st.book, sel.pageId, sel.elId);
        if (!el) return;
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          return actions.removeEl(sel.pageId, sel.elId);
        }
        if (mod && e.key.toLowerCase() === 'd') {
          e.preventDefault();
          return actions.duplicateEl(sel.pageId, sel.elId);
        }
        if (e.key === 'Escape') return st.select(null);
        if (e.key === 'Enter' && ['text', 'note', 'label', 'ticket'].includes(el.type)) {
          e.preventDefault();
          return st.setEditing(el.id);
        }
        if (e.key === ']') return actions.reorderEl(sel.pageId, sel.elId, e.shiftKey ? 'top' : 'up');
        if (e.key === '[') return actions.reorderEl(sel.pageId, sel.elId, e.shiftKey ? 'bottom' : 'down');
        const step = e.shiftKey ? 10 : 1;
        const nudge: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
        if (nudge[e.key] && !el.locked) {
          e.preventDefault();
          const [dx, dy] = nudge[e.key];
          return actions.updateEl(sel.pageId, sel.elId, { x: el.x + dx, y: el.y + dy });
        }
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'PageDown') bookControl.next();
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') bookControl.prev();
      else if (e.key === 'Home') bookControl.goTo(0);
      else if (e.key === 'End') bookControl.goTo(st.book.pages.length / 2);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

function usePasteImages() {
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const st = useStore.getState();
      if (st.mode !== 'edit' || isTyping(e as unknown as KeyboardEvent)) return;
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
      if (!file) return;
      e.preventDefault();
      const { left, right } = spreadPages(st.turned, st.book.pages.length);
      const pageId = st.activePageId ?? st.book.pages[right >= 0 ? right : left].id;
      const src = await fileToCompressedDataUrl(file);
      const ratio = await imageAspect(src);
      const el = makePhoto({ src });
      el.h = Math.round((el.w - 24) / ratio) + 70;
      el.x = Math.round(st.book.theme.pageWidth / 2 - el.w / 2);
      el.y = Math.round(st.book.theme.pageHeight / 2 - el.h / 2);
      el.rot = -2;
      actions.addEl(pageId, el);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);
}
