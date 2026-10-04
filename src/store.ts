import { create } from 'zustand';
import { produce, type Draft } from 'immer';
import type { Book, El, Page, Theme } from './types';
import { createDefaultBook } from './defaultBook';
import { page as makePage } from './factories';
import { uid } from './lib/id';

export type Mode = 'read' | 'edit';
export type Panel = 'element' | 'page' | 'theme';

export interface Selection {
  pageId: string;
  elId: string;
}

interface State {
  book: Book;
  mode: Mode;
  /** Number of leaves turned (0 = closed on the front cover). Mirrors the book's resting state. */
  turned: number;
  selected: Selection | null;
  activePageId: string | null;
  editingId: string | null;
  panel: Panel;
  contentsOpen: boolean;
  extracted: string[];
  saveState: 'saved' | 'saving';
  past: Book[];
  future: Book[];

  setMode(m: Mode): void;
  setTurned(n: number): void;
  select(sel: Selection | null): void;
  setActivePage(id: string | null): void;
  setEditing(id: string | null): void;
  setPanel(p: Panel): void;
  setContentsOpen(open: boolean): void;
  setExtracted(c: string[]): void;
  setSaveState(s: 'saved' | 'saving'): void;

  /** Undoable change. */
  commit(recipe: (b: Draft<Book>) => void): void;
  /** Change without a history entry — call checkpoint() once at the start of a gesture. */
  live(recipe: (b: Draft<Book>) => void): void;
  checkpoint(): void;
  undo(): void;
  redo(): void;
  replaceBook(b: Book): void;
}

const HISTORY = 120;

export const useStore = create<State>((set, get) => ({
  book: createDefaultBook(),
  mode: 'read',
  turned: 0,
  selected: null,
  activePageId: null,
  editingId: null,
  panel: 'page',
  contentsOpen: false,
  extracted: [],
  saveState: 'saved',
  past: [],
  future: [],

  setMode: (mode) => set({ mode, selected: null, editingId: null, panel: 'page' }),
  setTurned: (turned) => set({ turned }),
  select: (selected) => set({ selected, editingId: null, panel: selected ? 'element' : get().panel === 'element' ? 'page' : get().panel, activePageId: selected?.pageId ?? get().activePageId }),
  setActivePage: (activePageId) => set({ activePageId }),
  setEditing: (editingId) => set({ editingId }),
  setPanel: (panel) => set({ panel }),
  setContentsOpen: (contentsOpen) => set({ contentsOpen }),
  setExtracted: (extracted) => set({ extracted }),
  setSaveState: (saveState) => set({ saveState }),

  commit: (recipe) => {
    const { book, past } = get();
    const next = produce(book, recipe);
    if (next === book) return;
    set({ book: next, past: [...past.slice(-HISTORY), book], future: [] });
  },
  live: (recipe) => set({ book: produce(get().book, recipe) }),
  checkpoint: () => {
    const { book, past } = get();
    if (past[past.length - 1] === book) return;
    set({ past: [...past.slice(-HISTORY), book], future: [] });
  },
  undo: () => {
    const { past, future, book } = get();
    const prev = past[past.length - 1];
    if (!prev) return;
    set({ book: prev, past: past.slice(0, -1), future: [book, ...future], editingId: null });
    fixSelection();
  },
  redo: () => {
    const { past, future, book } = get();
    const next = future[0];
    if (!next) return;
    set({ book: next, past: [...past, book], future: future.slice(1), editingId: null });
    fixSelection();
  },
  replaceBook: (b) => {
    const { book, past } = get();
    set({ book: b, past: [...past.slice(-HISTORY), book], future: [], selected: null, editingId: null });
  },
}));

function fixSelection() {
  const { selected, book } = useStore.getState();
  if (selected && !findEl(book, selected.pageId, selected.elId)) useStore.setState({ selected: null });
}

/* ------------------------------------------------------------------ */
/* Selectors & helpers                                                 */
/* ------------------------------------------------------------------ */

export const findPage = (b: Book | Draft<Book>, pageId: string) => b.pages.find((p) => p.id === pageId);

export function findEl(b: Book | Draft<Book>, pageId: string, elId: string) {
  return findPage(b, pageId)?.elements.find((e) => e.id === elId);
}

export const leafCount = (b: Book) => b.pages.length / 2;

/** Indices of pages visible for a given number of turned leaves. */
export function spreadPages(turned: number, total: number) {
  const left = turned > 0 ? turned * 2 - 1 : -1;
  const right = turned * 2 < total ? turned * 2 : -1;
  return { left, right };
}

/** Leaves to turn so that the page at `index` is visible. */
export const turnedForPage = (index: number) => Math.ceil(index / 2);

const S = () => useStore.getState();

export const actions = {
  updateEl(pageId: string, elId: string, patch: Partial<El>, live = false) {
    const fn = (b: Draft<Book>) => {
      const el = findEl(b, pageId, elId);
      if (el) Object.assign(el, patch);
    };
    live ? S().live(fn) : S().commit(fn);
  },

  addEl(pageId: string, el: El, select = true) {
    S().commit((b) => {
      findPage(b, pageId)?.elements.push(el as Draft<El>);
    });
    if (select) S().select({ pageId, elId: el.id });
  },

  removeEl(pageId: string, elId: string) {
    S().commit((b) => {
      const p = findPage(b, pageId);
      if (p) p.elements = p.elements.filter((e) => e.id !== elId);
    });
    S().select(null);
  },

  duplicateEl(pageId: string, elId: string) {
    const src = findEl(S().book, pageId, elId);
    if (!src) return;
    const copy = { ...structuredClone(src), id: uid(), x: src.x + 18, y: src.y + 18, locked: false };
    actions.addEl(pageId, copy);
  },

  /** 'up' | 'down' one step, or 'top' | 'bottom'. */
  reorderEl(pageId: string, elId: string, dir: 'up' | 'down' | 'top' | 'bottom') {
    S().commit((b) => {
      const p = findPage(b, pageId);
      if (!p) return;
      const i = p.elements.findIndex((e) => e.id === elId);
      if (i < 0) return;
      const [el] = p.elements.splice(i, 1);
      const j = dir === 'top' ? p.elements.length : dir === 'bottom' ? 0 : dir === 'up' ? Math.min(p.elements.length, i + 1) : Math.max(0, i - 1);
      p.elements.splice(j, 0, el);
    });
  },

  updatePage(pageId: string, recipe: (p: Draft<Page>) => void) {
    S().commit((b) => {
      const p = findPage(b, pageId);
      if (p) recipe(p);
    });
  },

  updateTheme(recipe: (t: Draft<Theme>) => void, live = false) {
    const fn = (b: Draft<Book>) => recipe(b.theme);
    live ? S().live(fn) : S().commit(fn);
  },

  /** Insert two blank pages after page index `after` (keeps the page count even). */
  addSpread(after: number) {
    const total = S().book.pages.length;
    const at = Math.min(Math.max(after + 1, 2), total - 2);
    S().commit((b) => {
      b.pages.splice(at, 0, makePage('page') as Draft<Page>, makePage('page', { pattern: 'grid', patternColor: '@muted' }) as Draft<Page>);
    });
    return at;
  },

  duplicateSpread(left: number) {
    const pages = S().book.pages;
    const pair = [pages[left], pages[left + 1]].filter(Boolean);
    if (pair.length < 2) return;
    S().commit((b) => {
      const copies = pair.map((p) => ({ ...structuredClone(p), id: uid('p'), role: 'page' as const, elements: p.elements.map((e) => ({ ...structuredClone(e), id: uid() })) }));
      b.pages.splice(left + 2, 0, ...(copies as Draft<Page>[]));
    });
  },

  /** Remove two consecutive inner pages starting at index `first`. */
  removeSpread(first: number) {
    const pages = S().book.pages;
    const a = pages[first];
    const c = pages[first + 1];
    if (!a || !c || a.role !== 'page' || c.role !== 'page') return false;
    S().commit((b) => {
      b.pages.splice(first, 2);
    });
    S().select(null);
    return true;
  },

  /** Swap a page with its neighbour. Covers stay put. */
  movePage(index: number, dir: -1 | 1) {
    const pages = S().book.pages;
    const j = index + dir;
    if (pages[index]?.role !== 'page' || pages[j]?.role !== 'page') return;
    S().commit((b) => {
      const [p] = b.pages.splice(index, 1);
      b.pages.splice(j, 0, p);
    });
  },

  resetBook() {
    S().replaceBook(createDefaultBook());
  },
};
