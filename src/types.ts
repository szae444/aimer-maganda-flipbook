/** A color is either a palette token ("@accent1") or any CSS color ("#c8442f"). */
export type ColorRef = string;

/** A font is either a theme role ("@display") or a concrete family name ("Gloock"). */
export type FontRef = string;

export type FontRole = 'display' | 'hand' | 'body' | 'mono' | 'accent';

export type ColorToken =
  | 'desk'
  | 'deskInk'
  | 'paper'
  | 'paperAlt'
  | 'ink'
  | 'muted'
  | 'accent1'
  | 'accent2'
  | 'accent3'
  | 'accent4'
  | 'cover'
  | 'coverInk';

export type DeskStyle = 'plain' | 'linen' | 'grid' | 'felt';

export interface Theme {
  colors: Record<ColorToken, string>;
  fonts: Record<FontRole, string>;
  /** Paper grain overlay strength, 0–1. */
  grain: number;
  pageWidth: number;
  pageHeight: number;
  desk: DeskStyle;
  flipSound: boolean;
  /** Milliseconds for one page turn. */
  flipDuration: number;
}

export type PagePattern =
  | 'plain'
  | 'grid'
  | 'dots'
  | 'lines'
  | 'linen'
  | 'kraft'
  | 'gingham'
  | 'stripes';

export interface PageBackground {
  color: ColorRef;
  pattern: PagePattern;
  patternColor: ColorRef;
  /** Pattern cell size in px. */
  patternScale: number;
}

export type PageRole = 'cover' | 'endpaper' | 'page';

export interface Page {
  id: string;
  role: PageRole;
  background: PageBackground;
  elements: El[];
}

interface ElBase {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Degrees. */
  rot: number;
  opacity: number;
  locked?: boolean;
}

export interface TextEl extends ElBase {
  type: 'text';
  text: string;
  font: FontRef;
  size: number;
  color: ColorRef;
  align: 'left' | 'center' | 'right';
  weight: 400 | 700;
  italic: boolean;
  /** Letter spacing in em. */
  spacing: number;
  leading: number;
  upper: boolean;
  /** Highlighter / background behind text; '' for none. */
  bg: ColorRef;
}

export type PhotoFrame = 'polaroid' | 'plain' | 'deckle' | 'film' | 'stamp' | 'oval' | 'arch' | 'none';
export type PhotoFilter = 'none' | 'mono' | 'warm' | 'faded' | 'cool';

export interface PhotoEl extends ElBase {
  type: 'photo';
  src: string;
  frame: PhotoFrame;
  frameColor: ColorRef;
  caption: string;
  captionFont: FontRef;
  captionColor: ColorRef;
  filter: PhotoFilter;
  /** Object-position in %, 0–100. */
  focusX: number;
  focusY: number;
}

export type StickerKind =
  | 'star'
  | 'heart'
  | 'sparkle'
  | 'flower'
  | 'burst'
  | 'bow'
  | 'arrow'
  | 'scribble'
  | 'squiggle'
  | 'moon'
  | 'sun'
  | 'cherry'
  | 'sprig'
  | 'butterfly'
  | 'cloud'
  | 'asterisk'
  | 'pin'
  | 'clip'
  | 'check'
  | 'postmark'
  /** An image the user uploaded (see Book.stickers). */
  | 'custom';

export interface StickerEl extends ElBase {
  type: 'sticker';
  kind: StickerKind;
  color: ColorRef;
  color2: ColorRef;
  /** Die-cut white border like a real vinyl sticker. */
  diecut: boolean;
  /** Only used by burst and postmark. */
  text: string;
  /** Image data for custom stickers. */
  src?: string;
}

/** A sticker image the user uploaded, kept so it can be placed again. */
export interface CustomSticker {
  id: string;
  src: string;
}

export type TapePattern = 'solid' | 'stripes' | 'dots' | 'grid' | 'gingham' | 'hearts';

export interface TapeEl extends ElBase {
  type: 'tape';
  pattern: TapePattern;
  color: ColorRef;
  color2: ColorRef;
}

export type NotePaper = 'lined' | 'grid' | 'sticky' | 'kraft' | 'torn' | 'index';

export interface NoteEl extends ElBase {
  type: 'note';
  paper: NotePaper;
  color: ColorRef;
  text: string;
  font: FontRef;
  ink: ColorRef;
  size: number;
}

export interface TicketEl extends ElBase {
  type: 'ticket';
  title: string;
  sub: string;
  num: string;
  color: ColorRef;
  ink: ColorRef;
}

export interface LabelEl extends ElBase {
  type: 'label';
  text: string;
  color: ColorRef;
  ink: ColorRef;
}

export type El = TextEl | PhotoEl | StickerEl | TapeEl | NoteEl | TicketEl | LabelEl;
export type ElType = El['type'];

export interface Book {
  version: 1;
  title: string;
  theme: Theme;
  /** pages[0] is the front cover, the last page is the back cover. Always an even count. */
  pages: Page[];
  /** The user's own uploaded sticker sheet. */
  stickers: CustomSticker[];
}
