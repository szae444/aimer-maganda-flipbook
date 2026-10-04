import { useState } from 'react';
import type { StickerKind } from '../types';
import { actions, useStore } from '../store';
import { colorCss } from '../theme';
import { sticker as makeSticker } from '../factories';
import { pickFile } from '../lib/gesture';
import { fileToStickerDataUrl } from '../lib/image';
import { STICKER_KINDS, StickerSvg } from './elements/Stickers';
import { Icon } from './Icon';

export interface StickerPick {
  kind: StickerKind;
  src?: string;
}

/**
 * Built-in stickers plus the user's own uploads. Uploading adds the image to the
 * sheet (saved with the book) and immediately picks it.
 */
export function StickerSheet({
  onPick,
  selected,
  colors,
}: {
  onPick: (pick: StickerPick) => void;
  selected?: StickerPick;
  /** Preview colors for built-ins (the selected sticker's colors in the inspector). */
  colors?: { color: string; color2: string };
}) {
  const custom = useStore((s) => s.book.stickers ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const upload = async () => {
    const file = await pickFile('image/png,image/webp,image/jpeg,image/gif,image/svg+xml');
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const src = await fileToStickerDataUrl(file);
      actions.addCustomSticker(src);
      onPick({ kind: 'custom', src });
    } catch {
      setError('That image could not be read. Try a PNG or JPG.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sticker-sheet">
      <div className="popover__label">Your stickers</div>
      <div className="sticker-grid">
        <button type="button" className="sticker-opt sticker-upload" onClick={upload} disabled={busy} title="Upload your own sticker">
          <Icon name="upload" size={20} />
          <span>{busy ? 'Adding…' : 'Upload'}</span>
        </button>
        {custom.map((s) => (
          <div key={s.id} className={`sticker-opt is-custom${selected?.kind === 'custom' && selected.src === s.src ? ' is-on' : ''}`}>
            <button type="button" className="sticker-opt__pick" title="Use this sticker" onClick={() => onPick({ kind: 'custom', src: s.src })}>
              <img src={s.src} alt="" draggable={false} />
            </button>
            <button type="button" className="sticker-opt__remove" title="Remove from your sheet" onClick={() => actions.removeCustomSticker(s.id)}>
              <Icon name="close" size={12} />
            </button>
          </div>
        ))}
      </div>
      {custom.length === 0 && <p className="hint">PNGs with a transparent background look best — they get a white die-cut edge.</p>}
      {error && <p className="hint is-error">{error}</p>}

      <div className="popover__label">Sticker sheet</div>
      <div className="sticker-grid">
        {STICKER_KINDS.map((k) => {
          const d = makeSticker(k.kind);
          return (
            <button
              type="button"
              key={k.kind}
              title={k.label}
              className={`sticker-opt${selected?.kind === k.kind ? ' is-on' : ''}`}
              onClick={() => onPick({ kind: k.kind })}
            >
              <StickerSvg kind={k.kind} fill={colorCss(colors?.color ?? d.color)} ink={colorCss(colors?.color2 ?? d.color2)} text="" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
