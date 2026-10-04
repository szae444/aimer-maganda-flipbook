import { get, set, del } from 'idb-keyval';
import type { Book } from '../types';
import { createDefaultBook } from '../defaultBook';

const KEY = 'aimer-maganda-flipbook:book';

export function isBook(x: unknown): x is Book {
  const b = x as Book;
  return !!b && typeof b === 'object' && Array.isArray(b.pages) && b.pages.length >= 2 && !!b.theme?.colors;
}

/** Fill in fields added in later versions so old saves keep working. */
export function normalizeBook(b: Book): Book {
  const def = createDefaultBook();
  const theme = {
    ...def.theme,
    ...b.theme,
    colors: { ...def.theme.colors, ...b.theme.colors },
    fonts: { ...def.theme.fonts, ...b.theme.fonts },
  };
  const pages = [...b.pages];
  if (pages.length % 2) pages.splice(pages.length - 1, 0, { ...def.pages[2], id: `p_pad${Date.now()}`, elements: [] });
  return { ...def, ...b, theme, pages };
}

/**
 * Load order: the visitor's own saved edits, then a published book.json next to the site,
 * then the built-in starter book.
 */
export async function loadBook(): Promise<{ book: Book; source: 'saved' | 'published' | 'starter' }> {
  try {
    const saved = await get(KEY);
    if (isBook(saved)) return { book: normalizeBook(saved), source: 'saved' };
  } catch {
    /* IndexedDB unavailable (private mode) */
  }
  try {
    const published = await fetchPublished();
    if (published) return { book: published, source: 'published' };
  } catch {
    /* no published book */
  }
  return { book: createDefaultBook(), source: 'starter' };
}

export async function fetchPublished(): Promise<Book | null> {
  const res = await fetch('./book.json', { cache: 'no-store' });
  if (!res.ok) return null;
  const json = await res.json();
  return isBook(json) ? normalizeBook(json) : null;
}

let timer: number | undefined;
export function saveBookSoon(book: Book, onSaved?: () => void) {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    set(KEY, book).then(onSaved, () => {});
  }, 450);
}

export const clearSaved = () => del(KEY);

export function downloadBook(book: Book) {
  const blob = new Blob([JSON.stringify(book)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'book.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export async function readBookFile(file: File): Promise<Book> {
  const json = JSON.parse(await file.text());
  if (!isBook(json)) throw new Error('That file is not an Aimer Maganda Flipbook export.');
  return normalizeBook(json);
}
