import type {
  El,
  ElType,
  LabelEl,
  NoteEl,
  Page,
  PageBackground,
  PageRole,
  PhotoEl,
  StickerEl,
  StickerKind,
  TapeEl,
  TextEl,
  TicketEl,
} from './types';
import { uid } from './lib/id';

type Partial2<T> = Partial<Omit<T, 'type' | 'id'>>;

const base = (w: number, h: number) => ({ id: uid(), x: 0, y: 0, w, h, rot: 0, opacity: 1 });

export const text = (o: Partial2<TextEl> = {}): TextEl => ({
  ...base(280, 80),
  type: 'text',
  text: 'Double-click to write',
  font: '@hand',
  size: 40,
  color: '@ink',
  align: 'left',
  weight: 400,
  italic: false,
  spacing: 0,
  leading: 1.1,
  upper: false,
  bg: '',
  ...o,
});

export const photo = (o: Partial2<PhotoEl> = {}): PhotoEl => ({
  ...base(200, 240),
  type: 'photo',
  src: '',
  frame: 'polaroid',
  frameColor: '#FBF8F1',
  caption: '',
  captionFont: '@hand',
  captionColor: '@ink',
  filter: 'none',
  focusX: 50,
  focusY: 50,
  ...o,
});

export const STICKER_DEFAULTS: Record<StickerKind, Partial2<StickerEl>> = {
  star: { color: '@accent2', color2: '@ink' },
  heart: { color: '@accent1', color2: '@ink' },
  sparkle: { color: '@accent2', color2: '@ink' },
  flower: { color: '@accent4', color2: '@accent2' },
  burst: { color: '@accent1', color2: '@paper', text: 'xo' },
  bow: { color: '@accent4', color2: '@ink' },
  arrow: { color: '@ink', color2: '@ink', diecut: false },
  scribble: { color: '@accent1', color2: '@ink', diecut: false },
  squiggle: { color: '@accent1', color2: '@ink', diecut: false },
  moon: { color: '@accent2', color2: '@ink' },
  sun: { color: '@accent2', color2: '@accent1' },
  cherry: { color: '@accent1', color2: '@accent3' },
  sprig: { color: '@accent3', color2: '@ink', diecut: false },
  butterfly: { color: '@accent3', color2: '@ink' },
  cloud: { color: '@paper', color2: '@ink' },
  asterisk: { color: '@accent1', color2: '@ink', diecut: false },
  pin: { color: '@accent1', color2: '@ink', diecut: false },
  clip: { color: '@muted', color2: '@ink', diecut: false },
  check: { color: '@accent1', color2: '@ink', diecut: false },
  postmark: { color: '@ink', color2: '@ink', diecut: false, text: 'AIMER · MAGANDA · 2026 · ' },
  custom: { diecut: true },
};

export const sticker = (kind: StickerKind, o: Partial2<StickerEl> = {}): StickerEl => ({
  ...base(90, 90),
  type: 'sticker',
  kind,
  color: '@accent1',
  color2: '@ink',
  diecut: true,
  text: '',
  ...STICKER_DEFAULTS[kind],
  ...o,
});

export const tape = (o: Partial2<TapeEl> = {}): TapeEl => ({
  ...base(150, 34),
  type: 'tape',
  pattern: 'stripes',
  color: '@accent4',
  color2: '@paper',
  opacity: 0.88,
  ...o,
});

export const note = (o: Partial2<NoteEl> = {}): NoteEl => ({
  ...base(220, 220),
  type: 'note',
  paper: 'lined',
  color: '@paper',
  text: 'a little note…',
  font: '@hand',
  ink: '@ink',
  size: 30,
  ...o,
});

export const ticket = (o: Partial2<TicketEl> = {}): TicketEl => ({
  ...base(260, 110),
  type: 'ticket',
  title: 'Admit One',
  sub: 'a day worth keeping',
  num: 'No. 0001',
  color: '@accent2',
  ink: '@ink',
  ...o,
});

export const label = (o: Partial2<LabelEl> = {}): LabelEl => ({
  ...base(170, 36),
  type: 'label',
  text: 'BEST DAY',
  color: '@ink',
  ink: '@paper',
  ...o,
});

export function makeEl(type: ElType): El {
  switch (type) {
    case 'text':
      return text();
    case 'photo':
      return photo();
    case 'sticker':
      return sticker('heart');
    case 'tape':
      return tape();
    case 'note':
      return note();
    case 'ticket':
      return ticket();
    case 'label':
      return label();
  }
}

export const bg = (o: Partial<PageBackground> = {}): PageBackground => ({
  color: '@paper',
  pattern: 'plain',
  patternColor: '@muted',
  patternScale: 24,
  ...o,
});

export const page = (role: PageRole = 'page', background: Partial<PageBackground> = {}, elements: El[] = []): Page => ({
  id: uid('p'),
  role,
  background: bg(background),
  elements,
});

/** Position helper for the starter book: at(el, x, y, rot) */
export function at<T extends El>(el: T, x: number, y: number, rot = 0, w?: number, h?: number): T {
  return { ...el, x, y, rot, w: w ?? el.w, h: h ?? el.h };
}
