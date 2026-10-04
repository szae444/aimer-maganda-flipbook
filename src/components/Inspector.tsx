import { useState } from 'react';
import type {
  El,
  NotePaper,
  PagePattern,
  PhotoFilter,
  PhotoFrame,
  StickerKind,
  TapePattern,
} from '../types';
import { actions, findEl, findPage, spreadPages, turnedForPage, useStore } from '../store';
import { COLOR_TOKENS, FONT_ROLES, PAGE_SIZES, PALETTE_PRESETS, colorCss } from '../theme';
import { fileToCompressedDataUrl, extractPalette, imageAspect, paletteToTokens } from '../lib/image';
import { pickFile } from '../lib/gesture';
import { downloadBook, readBookFile, clearSaved } from '../lib/persist';
import { StickerSheet } from './StickerSheet';
import { Icon } from './Icon';
import { ColorField, Field, FontField, NumberField, Section, Segmented, Slider, TextArea, TextInput, Toggle, TokenSwatch } from './ui';
import { bookControl } from './Book';

export function Inspector() {
  const panel = useStore((s) => s.panel);
  const selected = useStore((s) => s.selected);
  const setPanel = useStore((s) => s.setPanel);

  return (
    <aside className="inspector" aria-label="Editor">
      <nav className="inspector__tabs">
        {selected && (
          <button className={panel === 'element' ? 'is-on' : ''} onClick={() => setPanel('element')}>
            Element
          </button>
        )}
        <button className={panel === 'page' ? 'is-on' : ''} onClick={() => setPanel('page')}>
          Page
        </button>
        <button className={panel === 'theme' ? 'is-on' : ''} onClick={() => setPanel('theme')}>
          Theme
        </button>
      </nav>
      <div className="inspector__body">
        {panel === 'element' && selected ? <ElementPanel /> : panel === 'theme' ? <ThemePanel /> : <PagePanel />}
      </div>
    </aside>
  );
}

/* ================================================================== */

const TYPE_LABEL: Record<El['type'], string> = {
  text: 'Text',
  photo: 'Photo',
  sticker: 'Sticker',
  tape: 'Washi tape',
  note: 'Note paper',
  ticket: 'Ticket',
  label: 'Label tape',
};

function ElementPanel() {
  const sel = useStore((s) => s.selected)!;
  const el = useStore((s) => findEl(s.book, sel.pageId, sel.elId));
  if (!el) return null;
  const set = (patch: Partial<El>, live = false) => actions.updateEl(sel.pageId, el.id, patch, live);
  const S = set as (patch: Record<string, unknown>, live?: boolean) => void;

  return (
    <>
      <div className="el-head">
        <h2>{TYPE_LABEL[el.type]}</h2>
        <div className="el-head__actions">
          <button className="icon-btn" title="Duplicate (Ctrl+D)" onClick={() => actions.duplicateEl(sel.pageId, el.id)}>
            <Icon name="copy" />
          </button>
          <button className="icon-btn" title={el.locked ? 'Unlock' : 'Lock in place'} onClick={() => set({ locked: !el.locked })}>
            <Icon name={el.locked ? 'lock' : 'unlock'} />
          </button>
          <button className="icon-btn is-danger" title="Delete (Del)" onClick={() => actions.removeEl(sel.pageId, el.id)}>
            <Icon name="trash" />
          </button>
        </div>
      </div>

      {el.type === 'text' && (
        <Section title="Words">
          <TextArea value={el.text} onChange={(v, l) => S({ text: v }, l)} rows={3} />
          <Field label="Font" wide>
            <FontField value={el.font} onChange={(v) => S({ font: v })} />
          </Field>
          <Field label="Size" wide>
            <Slider value={el.size} min={8} max={260} onChange={(v, l) => S({ size: v }, l)} format={(v) => `${v}px`} />
          </Field>
          <div className="row">
            <Field label="Color">
              <ColorField value={el.color} onChange={(v, l) => S({ color: v }, l)} />
            </Field>
            <Field label="Highlighter">
              <ColorField value={el.bg} allowNone onChange={(v, l) => S({ bg: v }, l)} />
            </Field>
          </div>
          <div className="row">
            <Segmented
              value={el.align}
              onChange={(v) => S({ align: v })}
              options={[
                { value: 'left', label: 'Left' },
                { value: 'center', label: 'Center' },
                { value: 'right', label: 'Right' },
              ]}
            />
          </div>
          <div className="row chips">
            <button className={`chip${el.weight === 700 ? ' is-on' : ''}`} onClick={() => S({ weight: el.weight === 700 ? 400 : 700 })}>
              <b>Bold</b>
            </button>
            <button className={`chip${el.italic ? ' is-on' : ''}`} onClick={() => S({ italic: !el.italic })}>
              <i>Italic</i>
            </button>
            <button className={`chip${el.upper ? ' is-on' : ''}`} onClick={() => S({ upper: !el.upper })}>
              CAPS
            </button>
          </div>
          <Field label="Letter spacing" wide>
            <Slider value={el.spacing} min={-0.1} max={0.6} step={0.01} onChange={(v, l) => S({ spacing: v }, l)} format={(v) => v.toFixed(2)} />
          </Field>
          <Field label="Line height" wide>
            <Slider value={el.leading} min={0.7} max={2.2} step={0.05} onChange={(v, l) => S({ leading: v }, l)} format={(v) => v.toFixed(2)} />
          </Field>
        </Section>
      )}

      {el.type === 'photo' && (
        <Section title="Photo">
          <div className="row">
            <button
              className="btn"
              onClick={async () => {
                const f = await pickFile();
                if (f) S({ src: await fileToCompressedDataUrl(f) });
              }}
            >
              <Icon name="image" /> {el.src ? 'Replace photo' : 'Add photo'}
            </button>
            {el.src && (
              <button className="btn btn--ghost" onClick={() => S({ src: '' })}>
                Remove
              </button>
            )}
          </div>
          <Field label="Frame" wide>
            <div className="frame-grid">
              {(['polaroid', 'plain', 'deckle', 'film', 'stamp', 'oval', 'arch', 'none'] as PhotoFrame[]).map((f) => (
                <button key={f} className={`frame-opt${el.frame === f ? ' is-on' : ''}`} onClick={() => S({ frame: f })}>
                  <span className={`frame-ico frame-ico--${f}`} />
                  {f}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Frame color">
            <ColorField value={el.frameColor} onChange={(v, l) => S({ frameColor: v }, l)} />
          </Field>
          {el.frame === 'polaroid' && (
            <>
              <Field label="Caption" wide>
                <TextInput value={el.caption} onChange={(v, l) => S({ caption: v }, l)} placeholder="write on the polaroid…" />
              </Field>
              <div className="row">
                <Field label="Caption font">
                  <FontField value={el.captionFont} onChange={(v) => S({ captionFont: v })} />
                </Field>
                <Field label="Ink">
                  <ColorField value={el.captionColor} onChange={(v, l) => S({ captionColor: v }, l)} />
                </Field>
              </div>
            </>
          )}
          <Field label="Film look" wide>
            <Segmented
              value={el.filter}
              onChange={(v: PhotoFilter) => S({ filter: v })}
              options={(['none', 'warm', 'faded', 'mono', 'cool'] as PhotoFilter[]).map((f) => ({ value: f, label: f }))}
            />
          </Field>
          {el.src && (
            <>
              <Field label="Crop ↔" wide>
                <Slider value={el.focusX} min={0} max={100} onChange={(v, l) => S({ focusX: v }, l)} format={(v) => `${v}%`} />
              </Field>
              <Field label="Crop ↕" wide>
                <Slider value={el.focusY} min={0} max={100} onChange={(v, l) => S({ focusY: v }, l)} format={(v) => `${v}%`} />
              </Field>
            </>
          )}
        </Section>
      )}

      {el.type === 'sticker' && (
        <Section title="Sticker">
          <StickerSheet
            selected={{ kind: el.kind, src: el.src }}
            colors={{ color: el.color, color2: el.color2 }}
            onPick={async ({ kind, src }) => {
              if (kind !== 'custom') return S({ kind });
              // swap to an uploaded image, keeping its proportions within the current width
              const ratio = src ? await imageAspect(src) : 1;
              S({ kind, src, h: Math.round(el.w / ratio) });
            }}
          />
          {el.kind !== 'custom' && (
            <div className="row">
              <Field label="Color">
                <ColorField value={el.color} onChange={(v, l) => S({ color: v }, l)} />
              </Field>
              <Field label="Second color">
                <ColorField value={el.color2} onChange={(v, l) => S({ color2: v }, l)} />
              </Field>
            </div>
          )}
          <Toggle checked={el.diecut} onChange={(v) => S({ diecut: v })} label="Die-cut white edge" />
          {(el.kind === 'burst' || el.kind === 'postmark') && (
            <Field label="Sticker text" wide>
              <TextInput value={el.text} onChange={(v, l) => S({ text: v }, l)} />
            </Field>
          )}
        </Section>
      )}

      {el.type === 'tape' && (
        <Section title="Washi tape">
          <Field label="Pattern" wide>
            <Segmented
              value={el.pattern}
              onChange={(v: TapePattern) => S({ pattern: v })}
              options={(['solid', 'stripes', 'dots', 'grid', 'gingham', 'hearts'] as TapePattern[]).map((p) => ({ value: p, label: p }))}
            />
          </Field>
          <div className="row">
            <Field label="Tape">
              <ColorField value={el.color} onChange={(v, l) => S({ color: v }, l)} />
            </Field>
            <Field label="Pattern">
              <ColorField value={el.color2} onChange={(v, l) => S({ color2: v }, l)} />
            </Field>
          </div>
        </Section>
      )}

      {el.type === 'note' && (
        <Section title="Note">
          <TextArea value={el.text} onChange={(v, l) => S({ text: v }, l)} rows={5} />
          <Field label="Paper" wide>
            <Segmented
              value={el.paper}
              onChange={(v: NotePaper) => S({ paper: v })}
              options={(['lined', 'grid', 'index', 'sticky', 'kraft', 'torn'] as NotePaper[]).map((p) => ({ value: p, label: p }))}
            />
          </Field>
          <Field label="Font" wide>
            <FontField value={el.font} onChange={(v) => S({ font: v })} />
          </Field>
          <Field label="Size" wide>
            <Slider value={el.size} min={10} max={80} onChange={(v, l) => S({ size: v }, l)} format={(v) => `${v}px`} />
          </Field>
          <div className="row">
            <Field label="Paper color">
              <ColorField value={el.color} onChange={(v, l) => S({ color: v }, l)} />
            </Field>
            <Field label="Ink">
              <ColorField value={el.ink} onChange={(v, l) => S({ ink: v }, l)} />
            </Field>
          </div>
        </Section>
      )}

      {el.type === 'ticket' && (
        <Section title="Ticket">
          <Field label="Title" wide>
            <TextInput value={el.title} onChange={(v, l) => S({ title: v }, l)} />
          </Field>
          <Field label="Line" wide>
            <TextInput value={el.sub} onChange={(v, l) => S({ sub: v }, l)} />
          </Field>
          <Field label="Stub" wide>
            <TextInput value={el.num} onChange={(v, l) => S({ num: v }, l)} />
          </Field>
          <div className="row">
            <Field label="Card">
              <ColorField value={el.color} onChange={(v, l) => S({ color: v }, l)} />
            </Field>
            <Field label="Ink">
              <ColorField value={el.ink} onChange={(v, l) => S({ ink: v }, l)} />
            </Field>
          </div>
        </Section>
      )}

      {el.type === 'label' && (
        <Section title="Label tape">
          <Field label="Embossed text" wide>
            <TextInput value={el.text} onChange={(v, l) => S({ text: v }, l)} />
          </Field>
          <div className="row">
            <Field label="Tape">
              <ColorField value={el.color} onChange={(v, l) => S({ color: v }, l)} />
            </Field>
            <Field label="Letters">
              <ColorField value={el.ink} onChange={(v, l) => S({ ink: v }, l)} />
            </Field>
          </div>
        </Section>
      )}

      <Section
        title="Arrange"
        aside={
          <div className="mini-actions">
            {(['bottom', 'down', 'up', 'top'] as const).map((d) => (
              <button key={d} className="icon-btn" title={{ bottom: 'Send to back', down: 'Backward', up: 'Forward', top: 'Bring to front' }[d]} onClick={() => actions.reorderEl(sel.pageId, el.id, d)}>
                <Icon name={d} size={16} />
              </button>
            ))}
          </div>
        }
      >
        <div className="grid-4">
          <Field label="X">
            <NumberField value={el.x} onChange={(v, l) => S({ x: v }, l)} />
          </Field>
          <Field label="Y">
            <NumberField value={el.y} onChange={(v, l) => S({ y: v }, l)} />
          </Field>
          <Field label="W">
            <NumberField value={el.w} min={8} onChange={(v, l) => S({ w: Math.max(8, v) }, l)} />
          </Field>
          <Field label="H">
            <NumberField value={el.h} min={8} onChange={(v, l) => S({ h: Math.max(8, v) }, l)} />
          </Field>
        </div>
        <Field label="Tilt" wide>
          <Slider value={el.rot} min={-180} max={180} step={0.5} onChange={(v, l) => S({ rot: v }, l)} format={(v) => `${v}°`} />
        </Field>
        <Field label="Opacity" wide>
          <Slider value={el.opacity} min={0.05} max={1} step={0.01} onChange={(v, l) => S({ opacity: v }, l)} format={(v) => `${Math.round(v * 100)}%`} />
        </Field>
      </Section>
    </>
  );
}

/* ================================================================== */

const PATTERNS: PagePattern[] = ['plain', 'grid', 'dots', 'lines', 'linen', 'kraft', 'gingham', 'stripes'];

export function useEditablePage() {
  const turned = useStore((s) => s.turned);
  const activePageId = useStore((s) => s.activePageId);
  const pages = useStore((s) => s.book.pages);
  const { left, right } = spreadPages(turned, pages.length);
  const visibleIds = [pages[left]?.id, pages[right]?.id].filter(Boolean);
  const id = activePageId && visibleIds.includes(activePageId) ? activePageId : (pages[right] ?? pages[left]).id;
  const index = pages.findIndex((p) => p.id === id);
  return { id, index, left, right };
}

function PagePanel() {
  const { id, index, left, right } = useEditablePage();
  const page = useStore((s) => findPage(s.book, id));
  const total = useStore((s) => s.book.pages.length);
  const setActive = useStore((s) => s.setActivePage);
  const pages = useStore((s) => s.book.pages);
  if (!page) return null;
  const bg = page.background;
  const setBg = (patch: Partial<typeof bg>, live = false) => {
    // block body: an Immer recipe must not return a value while also editing the draft
    const recipe = (p: { background: typeof bg }) => {
      Object.assign(p.background, patch);
    };
    if (live) useStore.getState().live((b) => recipe(findPage(b, id)!));
    else actions.updatePage(id, recipe);
  };
  const roleName = page.role === 'cover' ? (index === 0 ? 'Front cover' : 'Back cover') : page.role === 'endpaper' ? 'Endpaper' : `Page ${index - 1}`;
  const firstInner = index % 2 === 1 ? index : index - 1; // left page of this spread
  const canDeleteSpread = pages[firstInner]?.role === 'page' && pages[firstInner + 1]?.role === 'page';

  return (
    <>
      <div className="el-head">
        <h2>{roleName}</h2>
        {left >= 0 && right >= 0 && (
          <Segmented
            value={id === pages[left].id ? 'L' : 'R'}
            onChange={(v) => setActive(v === 'L' ? pages[left].id : pages[right].id)}
            options={[
              { value: 'L', label: 'Left' },
              { value: 'R', label: 'Right' },
            ]}
          />
        )}
      </div>
      <p className="hint">Click empty paper to pick a page. Drop image files straight onto it.</p>

      <Section title="Paper">
        <Field label="Color">
          <ColorField value={bg.color} onChange={(v, l) => setBg({ color: v }, l)} />
        </Field>
        <Field label="Pattern" wide>
          <div className="pattern-grid">
            {PATTERNS.map((p) => (
              <button key={p} className={`pattern-opt${bg.pattern === p ? ' is-on' : ''}`} onClick={() => setBg({ pattern: p })}>
                <span className={`pattern-ico pattern-ico--${p}`} />
                {p}
              </button>
            ))}
          </div>
        </Field>
        {bg.pattern !== 'plain' && (
          <>
            <Field label="Pattern color">
              <ColorField value={bg.patternColor} onChange={(v, l) => setBg({ patternColor: v }, l)} />
            </Field>
            <Field label="Pattern size" wide>
              <Slider value={bg.patternScale} min={3} max={80} onChange={(v, l) => setBg({ patternScale: v }, l)} format={(v) => `${v}px`} />
            </Field>
          </>
        )}
      </Section>

      <Section title="Pages">
        <div className="btn-stack">
          <button
            className="btn"
            onClick={() => {
              const at = actions.addSpread(firstInner + 1);
              bookControl.goTo(turnedForPage(at));
            }}
          >
            <Icon name="plus" /> Add two pages after this spread
          </button>
          <button className="btn btn--ghost" disabled={!canDeleteSpread} onClick={() => actions.duplicateSpread(firstInner)}>
            <Icon name="copy" /> Duplicate this spread
          </button>
          <div className="row">
            <button className="btn btn--ghost" disabled={page.role !== 'page' || pages[index - 1]?.role !== 'page'} onClick={() => actions.movePage(index, -1)}>
              <Icon name="prev" /> Earlier
            </button>
            <button className="btn btn--ghost" disabled={page.role !== 'page' || pages[index + 1]?.role !== 'page'} onClick={() => actions.movePage(index, 1)}>
              Later <Icon name="next" />
            </button>
          </div>
          <button className="btn btn--ghost" onClick={() => actions.updatePage(id, (p) => void (p.elements = []))}>
            Clear everything on this page
          </button>
          <DangerButton disabled={!canDeleteSpread} label="Delete this spread" confirm="Tap again to delete both pages" onConfirm={() => actions.removeSpread(firstInner)} />
        </div>
        <p className="hint">
          {total} pages · covers and endpapers stay fixed so the book always closes properly.
        </p>
      </Section>
    </>
  );
}

function DangerButton({ label, confirm, onConfirm, disabled }: { label: string; confirm: string; onConfirm: () => void; disabled?: boolean }) {
  const [armed, setArmed] = useState(false);
  return (
    <button
      className={`btn btn--danger${armed ? ' is-armed' : ''}`}
      disabled={disabled}
      onBlur={() => setArmed(false)}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      <Icon name="trash" /> {armed ? confirm : label}
    </button>
  );
}

/* ================================================================== */

function ThemePanel() {
  const theme = useStore((s) => s.book.theme);
  const title = useStore((s) => s.book.title);
  const extracted = useStore((s) => s.extracted);
  const setExtracted = useStore((s) => s.setExtracted);
  const [ref, setRef] = useState<string>('');
  const [msg, setMsg] = useState('');

  const T = (recipe: (t: typeof theme) => void, live = false) => actions.updateTheme(recipe as never, live);

  const loadReference = async () => {
    const f = await pickFile();
    if (!f) return;
    const src = await fileToCompressedDataUrl(f, 800);
    setRef(src);
    setExtracted(await extractPalette(src));
  };

  return (
    <>
      <Section title="Book">
        <Field label="Site title" wide>
          <TextInput value={title} onChange={(v, l) => (l ? useStore.getState().live((b) => void (b.title = v)) : useStore.getState().commit((b) => void (b.title = v)))} />
        </Field>
      </Section>

      <Section title="Palette">
        <div className="presets">
          {PALETTE_PRESETS.map((p) => (
            <button key={p.name} className="preset" onClick={() => T((t) => void Object.assign(t.colors, p.colors))}>
              <span className="preset__strip">
                {(['paper', 'ink', 'accent1', 'accent2', 'accent3', 'accent4', 'cover'] as const).map((k) => (
                  <i key={k} style={{ background: p.colors[k] }} />
                ))}
              </span>
              <span className="preset__name">{p.name}</span>
            </button>
          ))}
        </div>

        <div className="ref-box">
          {ref ? <img src={ref} alt="Palette reference" /> : <div className="ref-box__empty">Got a reference image? Pull its colors in.</div>}
          <div className="ref-box__actions">
            <button className="btn" onClick={loadReference}>
              <Icon name="eyedrop" /> {ref ? 'Another image' : 'Copy colors from image'}
            </button>
            {extracted.length > 0 && (
              <button
                className="btn btn--accent"
                onClick={() => {
                  T((t) => void Object.assign(t.colors, paletteToTokens(extracted)));
                  setMsg('Applied — fine-tune any token below.');
                }}
              >
                Apply to palette
              </button>
            )}
          </div>
          {extracted.length > 0 && (
            <div className="swatches swatches--big">
              {extracted.map((c) => (
                <span key={c} className="swatch" style={{ background: c }} title={c} />
              ))}
            </div>
          )}
          {msg && <p className="hint">{msg}</p>}
        </div>

        <div className="tokens">
          {COLOR_TOKENS.map((t) => (
            <TokenSwatch key={t.key} token={t.key} />
          ))}
        </div>
      </Section>

      <Section title="Type">
        {FONT_ROLES.map((r) => (
          <Field key={r.key} label={r.label} wide>
            <FontField value={theme.fonts[r.key]} rolesOnly onChange={(v) => T((t) => void (t.fonts[r.key] = v))} />
          </Field>
        ))}
      </Section>

      <Section title="Paper & desk">
        <Field label="Paper grain" wide>
          <Slider value={theme.grain} min={0} max={1} step={0.01} onChange={(v, l) => T((t) => void (t.grain = v), l)} format={(v) => `${Math.round(v * 100)}%`} />
        </Field>
        <Field label="Desk" wide>
          <Segmented
            value={theme.desk}
            onChange={(v) => T((t) => void (t.desk = v))}
            options={[
              { value: 'linen', label: 'Linen' },
              { value: 'felt', label: 'Felt' },
              { value: 'grid', label: 'Cutting mat' },
              { value: 'plain', label: 'Plain' },
            ]}
          />
        </Field>
        <Field label="Page size" wide>
          <div className="size-grid">
            {PAGE_SIZES.map((s) => (
              <button
                key={s.label}
                className={`size-opt${theme.pageWidth === s.w && theme.pageHeight === s.h ? ' is-on' : ''}`}
                onClick={() => T((t) => void ((t.pageWidth = s.w), (t.pageHeight = s.h)))}
              >
                <span className="size-ico" style={{ aspectRatio: `${s.w} / ${s.h}` }} />
                {s.label}
              </button>
            ))}
          </div>
        </Field>
      </Section>

      <Section title="Page turn">
        <Field label="Speed" wide>
          <Slider value={theme.flipDuration} min={350} max={1800} step={50} onChange={(v, l) => T((t) => void (t.flipDuration = v), l)} format={(v) => `${(v / 1000).toFixed(2)}s`} />
        </Field>
        <Toggle checked={theme.flipSound} onChange={(v) => T((t) => void (t.flipSound = v))} label="Paper sound" />
      </Section>

      <DataSection />
    </>
  );
}

function DataSection() {
  const [err, setErr] = useState('');
  return (
    <Section title="Save & publish">
      <p className="hint">
        Edits save automatically in this browser. To publish, download <span className="mono">book.json</span> and put it in the project's{' '}
        <span className="mono">public/</span> folder — visitors then see your version.
      </p>
      <div className="btn-stack">
        <div className="row">
          <button className="btn" onClick={() => downloadBook(useStore.getState().book)}>
            <Icon name="download" /> Download
          </button>
          <button
            className="btn btn--ghost"
            onClick={async () => {
              const f = await pickFile('application/json,.json');
              if (!f) return;
              try {
                useStore.getState().replaceBook(await readBookFile(f));
                bookControl.goTo(0);
                setErr('');
              } catch (e) {
                setErr((e as Error).message);
              }
            }}
          >
            <Icon name="upload" /> Open file
          </button>
        </div>
        <DangerButton
          label="Start over with the sample book"
          confirm="Tap again — this replaces everything"
          onConfirm={async () => {
            await clearSaved();
            actions.resetBook();
            bookControl.goTo(0);
          }}
        />
      </div>
      {err && <p className="hint is-error">{err}</p>}
    </Section>
  );
}
