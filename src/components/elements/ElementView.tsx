import { memo, useEffect, useLayoutEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { El, LabelEl, NoteEl, PhotoEl, TapeEl, TextEl, TicketEl } from '../../types';
import { colorCss, fontCss } from '../../theme';
import { StickerSvg } from './Stickers';

interface Props {
  el: El;
  editing: boolean;
  editable: boolean;
  onTextCommit?: (field: string, value: string) => void;
}

/** Pure visual rendering of an element, positioned by its parent wrapper. */
export const ElementView = memo(function ElementView({ el, editing, editable, onTextCommit }: Props) {
  switch (el.type) {
    case 'text':
      return <TextView el={el} editing={editing} onCommit={(v) => onTextCommit?.('text', v)} />;
    case 'photo':
      return <PhotoView el={el} editable={editable} />;
    case 'sticker':
      if (el.kind === 'custom')
        return (
          <div className={`el-sticker is-custom${el.diecut ? ' is-diecut' : ''}`}>
            {el.src ? <img src={el.src} alt="" draggable={false} /> : <div className="el-photo__empty" />}
          </div>
        );
      return (
        <div className={`el-sticker${el.diecut ? ' is-diecut' : ''}`}>
          <StickerSvg kind={el.kind} fill={colorCss(el.color)} ink={colorCss(el.color2)} text={el.text} diecut={el.diecut} />
        </div>
      );
    case 'tape':
      return <TapeView el={el} />;
    case 'note':
      return <NoteView el={el} editing={editing} onCommit={(v) => onTextCommit?.('text', v)} />;
    case 'ticket':
      return <TicketView el={el} editing={editing} onCommit={(v) => onTextCommit?.('title', v)} />;
    case 'label':
      return <LabelView el={el} editing={editing} onCommit={(v) => onTextCommit?.('text', v)} />;
  }
});

/* ------------------------------------------------------------------ */

/**
 * The characters actually typed, with line breaks. Unlike innerText this ignores CSS
 * (text-transform: uppercase must not turn "hello" into a saved "HELLO").
 */
function readPlainText(node: Node): string {
  let out = '';
  node.childNodes.forEach((child, i) => {
    if (child.nodeType === Node.TEXT_NODE) out += child.nodeValue ?? '';
    else if (child.nodeName === 'BR') out += '\n';
    else {
      // some browsers wrap new lines in <div>/<p> while editing
      const block = /^(DIV|P)$/.test(child.nodeName);
      if (block && i > 0 && !out.endsWith('\n')) out += '\n';
      out += readPlainText(child);
    }
  });
  return out;
}

function Editable({
  value,
  editing,
  onCommit,
  className,
  style,
}: {
  value: string;
  editing: boolean;
  onCommit: (v: string) => void;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (editing) {
      node.focus();
      const range = document.createRange();
      range.selectNodeContents(node);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [editing]);

  // The DOM owns the text while typing; otherwise mirror external changes (undo, inspector).
  useLayoutEffect(() => {
    const node = ref.current;
    if (node && !editing && readPlainText(node) !== value) node.textContent = value;
  }, [value, editing]);

  return (
    <div
      ref={ref}
      className={className}
      style={style}
      contentEditable={editing ? 'plaintext-only' : false}
      suppressContentEditableWarning
      spellCheck={false}
      onBlur={(e) => onCommit(readPlainText(e.currentTarget).replace(/\n$/, ''))}
      onKeyDown={(e) => {
        if (e.key === 'Escape') (e.currentTarget as HTMLElement).blur();
        e.stopPropagation();
      }}
      onPointerDown={(e) => editing && e.stopPropagation()}
    />
  );
}

function TextView({ el, editing, onCommit }: { el: TextEl; editing: boolean; onCommit: (v: string) => void }) {
  const style: CSSProperties = {
    fontFamily: fontCss(el.font),
    fontSize: el.size,
    color: colorCss(el.color),
    textAlign: el.align,
    fontWeight: el.weight,
    fontStyle: el.italic ? 'italic' : 'normal',
    letterSpacing: `${el.spacing}em`,
    lineHeight: el.leading,
    textTransform: el.upper ? 'uppercase' : 'none',
  };
  return (
    // alignment on the wrapper too: highlighted text is inline, where text-align alone does nothing
    <div className="el-text" style={{ textAlign: el.align }}>
      <Editable
        value={el.text}
        editing={editing}
        onCommit={onCommit}
        className={`el-text__inner${el.bg ? ' has-mark' : ''}`}
        style={{ ...style, ['--mark' as string]: colorCss(el.bg) }}
      />
    </div>
  );
}

const TOUCH = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

const PHOTO_FILTERS: Record<PhotoEl['filter'], string> = {
  none: 'none',
  mono: 'grayscale(1) contrast(1.08) brightness(1.03)',
  warm: 'sepia(.28) saturate(1.18) contrast(1.02)',
  faded: 'contrast(.86) brightness(1.08) saturate(.72)',
  cool: 'hue-rotate(-8deg) saturate(.9) brightness(1.04) contrast(1.04)',
};

function PhotoView({ el, editable }: { el: PhotoEl; editable: boolean }) {
  const frameStyle = { ['--frame' as string]: colorCss(el.frameColor) } as CSSProperties;
  return (
    <figure className={`el-photo frame-${el.frame}`} style={frameStyle}>
      <div className="el-photo__window">
        {el.src ? (
          <img
            src={el.src}
            alt={el.caption || 'scrapbook photo'}
            draggable={false}
            style={{ objectPosition: `${el.focusX}% ${el.focusY}%`, filter: PHOTO_FILTERS[el.filter] }}
          />
        ) : (
          <div className="el-photo__empty">
            <span>{editable ? `${TOUCH ? 'double-tap' : 'double-click'}\nto add a photo` : ''}</span>
          </div>
        )}
      </div>
      {el.frame === 'polaroid' && (
        <figcaption style={{ fontFamily: fontCss(el.captionFont), color: colorCss(el.captionColor) }}>{el.caption}</figcaption>
      )}
    </figure>
  );
}

const TAPE_BG: Record<TapeEl['pattern'], (a: string, b: string) => string> = {
  solid: (a) => a,
  stripes: (a, b) => `repeating-linear-gradient(-45deg, ${a} 0 8px, ${b} 8px 16px)`,
  dots: (a, b) => `radial-gradient(${b} 22%, transparent 24%) 0 0 / 12px 12px, ${a}`,
  grid: (a, b) =>
    `linear-gradient(${b} 1px, transparent 1px) 0 0 / 10px 10px, linear-gradient(90deg, ${b} 1px, transparent 1px) 0 0 / 10px 10px, ${a}`,
  gingham: (a, b) =>
    `linear-gradient(90deg, color-mix(in srgb, ${b} 55%, transparent) 50%, transparent 50%) 0 0 / 14px 14px, linear-gradient(color-mix(in srgb, ${b} 55%, transparent) 50%, transparent 50%) 0 0 / 14px 14px, ${a}`,
  hearts: (a, b) =>
    `url("data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><path d='M10 15c-4-3-6-5-6-7.5C4 6 5 5 6.5 5 8 5 9 6 10 7.5 11 6 12 5 13.5 5 15 5 16 6 16 7.5 16 10 14 12 10 15z' fill='white' fill-opacity='.75'/></svg>`,
    )}") 0 0 / 20px 20px, ${a}`,
};

function TapeView({ el }: { el: TapeEl }) {
  const a = colorCss(el.color);
  const b = colorCss(el.color2);
  // The hearts pattern is baked white; tint the rest with color2.
  return <div className="el-tape" style={{ background: TAPE_BG[el.pattern](a, b) }} />;
}

function NoteView({ el, editing, onCommit }: { el: NoteEl; editing: boolean; onCommit: (v: string) => void }) {
  const lh = Math.round(el.size * 1.25);
  return (
    <div
      className={`el-note paper-${el.paper}`}
      style={{ ['--note' as string]: colorCss(el.color), ['--line' as string]: `${lh}px` } as CSSProperties}
    >
      <Editable
        value={el.text}
        editing={editing}
        onCommit={onCommit}
        className="el-note__text"
        style={{ fontFamily: fontCss(el.font), fontSize: el.size, lineHeight: `${lh}px`, color: colorCss(el.ink) }}
      />
    </div>
  );
}

function TicketView({ el, editing, onCommit }: { el: TicketEl; editing: boolean; onCommit: (v: string) => void }) {
  return (
    <div className="el-ticket" style={{ ['--tk' as string]: colorCss(el.color), color: colorCss(el.ink) } as CSSProperties}>
      <div className="el-ticket__main">
        <Editable value={el.title} editing={editing} onCommit={onCommit} className="el-ticket__title" />
        <div className="el-ticket__sub">{el.sub}</div>
      </div>
      <div className="el-ticket__stub">
        <span>{el.num}</span>
      </div>
    </div>
  );
}

function LabelView({ el, editing, onCommit }: { el: LabelEl; editing: boolean; onCommit: (v: string) => void }) {
  return (
    <div className="el-label" style={{ ['--lb' as string]: colorCss(el.color), color: colorCss(el.ink) } as CSSProperties}>
      <Editable value={el.text} editing={editing} onCommit={onCommit} className="el-label__text" />
    </div>
  );
}
