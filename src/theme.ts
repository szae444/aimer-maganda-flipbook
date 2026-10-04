import type { ColorRef, ColorToken, FontRef, FontRole, Theme } from './types';

/* ------------------------------------------------------------------ */
/* Palette tokens                                                      */
/* ------------------------------------------------------------------ */

export const COLOR_TOKENS: { key: ColorToken; label: string; hint: string }[] = [
  { key: 'desk', label: 'Desk', hint: 'Background behind the book' },
  { key: 'deskInk', label: 'Desk ink', hint: 'Text and icons on the desk' },
  { key: 'paper', label: 'Paper', hint: 'Main page color' },
  { key: 'paperAlt', label: 'Paper 2', hint: 'Secondary paper, notes' },
  { key: 'ink', label: 'Ink', hint: 'Main text color' },
  { key: 'muted', label: 'Pencil', hint: 'Soft text, lines, grids' },
  { key: 'accent1', label: 'Accent 1', hint: '' },
  { key: 'accent2', label: 'Accent 2', hint: '' },
  { key: 'accent3', label: 'Accent 3', hint: '' },
  { key: 'accent4', label: 'Accent 4', hint: '' },
  { key: 'cover', label: 'Cover', hint: 'Book cloth' },
  { key: 'coverInk', label: 'Cover ink', hint: 'Foil / title on cover' },
];

export interface PalettePreset {
  name: string;
  colors: Record<ColorToken, string>;
}

export const PALETTE_PRESETS: PalettePreset[] = [
  {
    name: 'Cherry Ledger',
    colors: {
      desk: '#2B2421',
      deskInk: '#EFE6D6',
      paper: '#F4EDE0',
      paperAlt: '#E8DCC5',
      ink: '#2A201B',
      muted: '#9A8875',
      accent1: '#C4412E',
      accent2: '#E6B44A',
      accent3: '#7E9CB3',
      accent4: '#DDA9A2',
      cover: '#5A272C',
      coverInk: '#F2E3C9',
    },
  },
  {
    name: 'Matcha Post',
    colors: {
      desk: '#1F2620',
      deskInk: '#E9EBDD',
      paper: '#F2F0E4',
      paperAlt: '#DCE1C8',
      ink: '#1E2A22',
      muted: '#8C9A82',
      accent1: '#5E7F4E',
      accent2: '#E7A83A',
      accent3: '#B9573C',
      accent4: '#C9D7A8',
      cover: '#33452F',
      coverInk: '#EEE6C8',
    },
  },
  {
    name: 'Blue Hour',
    colors: {
      desk: '#151B2B',
      deskInk: '#E6E8F0',
      paper: '#F1EEE8',
      paperAlt: '#D9DEEA',
      ink: '#18213A',
      muted: '#8790A8',
      accent1: '#2D4BA0',
      accent2: '#E9C46A',
      accent3: '#D96C6C',
      accent4: '#A9BCE0',
      cover: '#1E2C5A',
      coverInk: '#EDE3CB',
    },
  },
  {
    name: 'Ink & Bone',
    colors: {
      desk: '#111111',
      deskInk: '#EDEAE3',
      paper: '#F2EFE8',
      paperAlt: '#E2DED4',
      ink: '#141414',
      muted: '#8E8A82',
      accent1: '#141414',
      accent2: '#D2452C',
      accent3: '#8E8A82',
      accent4: '#CFC9BC',
      cover: '#181818',
      coverInk: '#EDEAE3',
    },
  },
  {
    name: 'Peach Fuzz',
    colors: {
      desk: '#3A2A26',
      deskInk: '#FBEFE6',
      paper: '#FCF3EA',
      paperAlt: '#F7DCCB',
      ink: '#3B2620',
      muted: '#B39484',
      accent1: '#E8765A',
      accent2: '#F2C76E',
      accent3: '#9DB9A6',
      accent4: '#F4B6B0',
      cover: '#E8765A',
      coverInk: '#FFF6EC',
    },
  },
];

/* ------------------------------------------------------------------ */
/* Fonts                                                               */
/* ------------------------------------------------------------------ */

export const FONT_ROLES: { key: FontRole; label: string }[] = [
  { key: 'display', label: 'Display' },
  { key: 'hand', label: 'Handwriting' },
  { key: 'body', label: 'Body' },
  { key: 'mono', label: 'Typewriter' },
  { key: 'accent', label: 'Accent' },
];

interface FontSpec {
  family: string;
  group: 'Display' | 'Handwriting' | 'Body' | 'Typewriter';
  /** Google Fonts axis spec, when the family has more than a regular weight. */
  axes?: string;
  fallback: string;
}

const serif = 'Georgia, "Times New Roman", serif';
const script = '"Segoe Print", "Bradley Hand", cursive';
const mono = '"Courier New", monospace';
const sans = '"Segoe UI", Helvetica, Arial, sans-serif';

export const FONTS: FontSpec[] = [
  { family: 'Gloock', group: 'Display', fallback: serif },
  { family: 'Bodoni Moda', group: 'Display', axes: 'ital,wght@0,400..900;1,400..900', fallback: serif },
  { family: 'DM Serif Display', group: 'Display', axes: 'ital@0;1', fallback: serif },
  { family: 'Abril Fatface', group: 'Display', fallback: serif },
  { family: 'Young Serif', group: 'Display', fallback: serif },
  { family: 'Libre Caslon Display', group: 'Display', fallback: serif },
  { family: 'Playfair Display', group: 'Display', axes: 'ital,wght@0,400..900;1,400..900', fallback: serif },
  { family: 'Rozha One', group: 'Display', fallback: serif },
  { family: 'Italiana', group: 'Display', fallback: serif },
  { family: 'Shrikhand', group: 'Display', fallback: serif },
  { family: 'Bagel Fat One', group: 'Display', fallback: sans },
  { family: 'Rubik Mono One', group: 'Display', fallback: sans },
  { family: 'Bungee', group: 'Display', fallback: sans },
  { family: 'Monoton', group: 'Display', fallback: sans },
  { family: 'Pirata One', group: 'Display', fallback: serif },
  { family: 'UnifrakturMaguntia', group: 'Display', fallback: serif },
  { family: 'Pinyon Script', group: 'Display', fallback: script },

  { family: 'Reenie Beanie', group: 'Handwriting', fallback: script },
  { family: 'Homemade Apple', group: 'Handwriting', fallback: script },
  { family: 'Nothing You Could Do', group: 'Handwriting', fallback: script },
  { family: 'La Belle Aurore', group: 'Handwriting', fallback: script },
  { family: 'Mrs Saint Delafield', group: 'Handwriting', fallback: script },
  { family: 'Sue Ellen Francisco', group: 'Handwriting', fallback: script },
  { family: 'Covered By Your Grace', group: 'Handwriting', fallback: script },
  { family: 'Waiting for the Sunrise', group: 'Handwriting', fallback: script },
  { family: 'Gochi Hand', group: 'Handwriting', fallback: script },
  { family: 'Kalam', group: 'Handwriting', axes: 'wght@300;400;700', fallback: script },
  { family: 'Caveat', group: 'Handwriting', axes: 'wght@400..700', fallback: script },
  { family: 'Permanent Marker', group: 'Handwriting', fallback: script },
  { family: 'Rock Salt', group: 'Handwriting', fallback: script },

  { family: 'Newsreader', group: 'Body', axes: 'ital,wght@0,200..800;1,200..800', fallback: serif },
  { family: 'EB Garamond', group: 'Body', axes: 'ital,wght@0,400..800;1,400..800', fallback: serif },
  { family: 'Cormorant Garamond', group: 'Body', axes: 'ital,wght@0,300..700;1,300..700', fallback: serif },
  { family: 'Crimson Pro', group: 'Body', axes: 'ital,wght@0,200..900;1,200..900', fallback: serif },
  { family: 'Spectral', group: 'Body', axes: 'ital,wght@0,400;0,700;1,400', fallback: serif },
  { family: 'Lora', group: 'Body', axes: 'ital,wght@0,400..700;1,400..700', fallback: serif },
  { family: 'Work Sans', group: 'Body', axes: 'ital,wght@0,300..800;1,300..800', fallback: sans },
  { family: 'Karla', group: 'Body', axes: 'ital,wght@0,300..800;1,300..800', fallback: sans },

  { family: 'Special Elite', group: 'Typewriter', fallback: mono },
  { family: 'Courier Prime', group: 'Typewriter', axes: 'ital,wght@0,400;0,700;1,400', fallback: mono },
  { family: 'Cutive Mono', group: 'Typewriter', fallback: mono },
  { family: 'IBM Plex Mono', group: 'Typewriter', axes: 'ital,wght@0,400;0,600;1,400', fallback: mono },
  { family: 'DM Mono', group: 'Typewriter', axes: 'ital,wght@0,400;0,500;1,400', fallback: mono },
  { family: 'Major Mono Display', group: 'Typewriter', fallback: mono },
  { family: 'VT323', group: 'Typewriter', fallback: mono },
];

const FONT_MAP = new Map(FONTS.map((f) => [f.family, f]));

export const DEFAULT_FONTS: Record<FontRole, string> = {
  display: 'Gloock',
  hand: 'Reenie Beanie',
  body: 'Newsreader',
  mono: 'Special Elite',
  accent: 'UnifrakturMaguntia',
};

const loaded = new Set<string>();

/** Injects a Google Fonts stylesheet per family (isolated so one bad family never blocks the rest). */
export function ensureFonts(families: Iterable<string>) {
  for (const family of families) {
    if (!family || family.startsWith('@') || loaded.has(family)) continue;
    loaded.add(family);
    const spec = FONT_MAP.get(family);
    const name = family.replace(/ /g, '+');
    const href = `https://fonts.googleapis.com/css2?family=${name}${spec?.axes ? ':' + spec.axes : ''}&display=swap`;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }
}

export function loadAllFonts() {
  ensureFonts(FONTS.map((f) => f.family));
}

function stack(family: string) {
  const spec = FONT_MAP.get(family);
  return `"${family}", ${spec?.fallback ?? serif}`;
}

export function fontCss(ref: FontRef): string {
  if (ref.startsWith('@')) return `var(--f-${ref.slice(1)})`;
  return stack(ref);
}

export function colorCss(ref: ColorRef | undefined): string {
  if (!ref) return 'transparent';
  if (ref.startsWith('@')) return `var(--c-${ref.slice(1)})`;
  return ref;
}

/** Resolve a color ref to a concrete hex using the current theme (for color inputs). */
export function colorHex(ref: ColorRef, theme: Theme): string {
  if (ref.startsWith('@')) return theme.colors[ref.slice(1) as ColorToken] ?? '#000000';
  return ref;
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement.style;
  for (const [k, v] of Object.entries(theme.colors)) root.setProperty(`--c-${k}`, v);
  for (const [k, v] of Object.entries(theme.fonts)) root.setProperty(`--f-${k}`, stack(v));
  root.setProperty('--grain', String(theme.grain));
  root.setProperty('--page-w', `${theme.pageWidth}px`);
  root.setProperty('--page-h', `${theme.pageHeight}px`);
  ensureFonts(Object.values(theme.fonts));
  const meta = document.querySelector('meta[name="theme-color"]') ?? document.head.appendChild(Object.assign(document.createElement('meta'), { name: 'theme-color' }));
  meta.setAttribute('content', theme.colors.desk);
}

export const PAGE_SIZES: { label: string; w: number; h: number }[] = [
  { label: 'Classic 3:4', w: 480, h: 640 },
  { label: 'Tall 5:7', w: 460, h: 644 },
  { label: 'Square', w: 560, h: 560 },
  { label: 'Wide 4:3', w: 600, h: 450 },
];
