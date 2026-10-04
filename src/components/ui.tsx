import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { ColorRef, ColorToken, FontRef } from '../types';
import { COLOR_TOKENS, FONTS, FONT_ROLES, colorCss, colorHex, fontCss, loadAllFonts } from '../theme';
import { useStore } from '../store';
import { Icon } from './Icon';

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="ui-section">
      <header className="ui-section__head">
        <h3>{title}</h3>
        {aside}
      </header>
      <div className="ui-section__body">{children}</div>
    </section>
  );
}

export function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`ui-field${wide ? ' is-wide' : ''}`}>
      <span className="ui-field__label">{label}</span>
      {children}
    </label>
  );
}

const checkpoint = () => useStore.getState().checkpoint();

export function NumberField({
  value,
  onChange,
  step = 1,
  min,
  max,
  suffix,
}: {
  value: number;
  onChange: (v: number, live: boolean) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <div className="ui-number">
      <input
        type="number"
        value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
        step={step}
        min={min}
        max={max}
        onFocus={checkpoint}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!Number.isNaN(v)) onChange(v, true);
        }}
      />
      {suffix && <span>{suffix}</span>}
    </div>
  );
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number, live: boolean) => void;
  format?: (v: number) => string;
}) {
  return (
    <div className="ui-slider">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onPointerDown={checkpoint}
        onKeyDown={checkpoint}
        onChange={(e) => onChange(parseFloat(e.target.value), true)}
        style={{ ['--fill' as string]: `${((value - min) / (max - min)) * 100}%` }}
      />
      <output>{format ? format(value) : value}</output>
    </div>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="ui-seg" role="radiogroup">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          title={o.title}
          className={o.value === value ? 'is-on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" className={`ui-toggle${checked ? ' is-on' : ''}`} role="switch" aria-checked={checked} onClick={() => onChange(!checked)}>
      <span className="ui-toggle__track">
        <span className="ui-toggle__thumb" />
      </span>
      {label}
    </button>
  );
}

export function TextArea({ value, onChange, rows = 3 }: { value: string; onChange: (v: string, live: boolean) => void; rows?: number }) {
  return <textarea className="ui-textarea" rows={rows} value={value} onFocus={checkpoint} onChange={(e) => onChange(e.target.value, true)} />;
}

export function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string, live: boolean) => void; placeholder?: string }) {
  return (
    <input className="ui-input" value={value} placeholder={placeholder} onFocus={checkpoint} onChange={(e) => onChange(e.target.value, true)} />
  );
}

/* ------------------------------------------------------------------ */

function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', esc);
    };
  }, [open]);
  return { open, setOpen, ref };
}

const tokenLabel = (ref: ColorRef) => COLOR_TOKENS.find((t) => `@${t.key}` === ref)?.label;

export function ColorField({
  value,
  onChange,
  allowNone,
}: {
  value: ColorRef;
  onChange: (v: ColorRef, live: boolean) => void;
  allowNone?: boolean;
}) {
  const { open, setOpen, ref } = usePopover();
  const theme = useStore((s) => s.book.theme);
  const extracted = useStore((s) => s.extracted);
  const hex = value ? colorHex(value, theme) : '#ffffff';
  const [draft, setDraft] = useState(hex);
  useEffect(() => setDraft(hex), [hex]);

  return (
    <div className="ui-color" ref={ref}>
      <button type="button" className="ui-color__btn" onClick={() => setOpen(!open)}>
        <span className={`swatch${value ? '' : ' is-none'}`} style={{ background: colorCss(value) }} />
        <span className="ui-color__name">{value ? tokenLabel(value) ?? value.toUpperCase() : 'None'}</span>
      </button>
      {open && (
        <div className="popover ui-color__pop">
          <div className="popover__label">Palette — follows the theme</div>
          <div className="swatches">
            {COLOR_TOKENS.map((t) => (
              <button
                key={t.key}
                type="button"
                title={t.label}
                className={`swatch${value === `@${t.key}` ? ' is-on' : ''}`}
                style={{ background: `var(--c-${t.key})` }}
                onClick={() => onChange(`@${t.key}`, false)}
              />
            ))}
            {allowNone && <button type="button" title="None" className={`swatch is-none${value ? '' : ' is-on'}`} onClick={() => onChange('', false)} />}
          </div>
          {extracted.length > 0 && (
            <>
              <div className="popover__label">From your reference image</div>
              <div className="swatches">
                {extracted.map((c) => (
                  <button key={c} type="button" title={c} className={`swatch${value === c ? ' is-on' : ''}`} style={{ background: c }} onClick={() => onChange(c, false)} />
                ))}
              </div>
            </>
          )}
          <div className="popover__label">Custom</div>
          <div className="ui-color__custom">
            <input
              type="color"
              value={/^#[0-9a-f]{6}$/i.test(hex) ? hex : '#000000'}
              onFocus={checkpoint}
              onClick={checkpoint}
              onChange={(e) => onChange(e.target.value, true)}
            />
            <input
              className="ui-input mono"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(e.target.value)) onChange(e.target.value, false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** Raw hex picker for theme tokens themselves. */
export function TokenSwatch({ token }: { token: ColorToken }) {
  const value = useStore((s) => s.book.theme.colors[token]);
  const extracted = useStore((s) => s.extracted);
  const { open, setOpen, ref } = usePopover();
  const meta = COLOR_TOKENS.find((t) => t.key === token)!;
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const set = (v: string, live: boolean) => {
    const fn = (b: { theme: { colors: Record<ColorToken, string> } }) => {
      b.theme.colors[token] = v;
    };
    live ? useStore.getState().live(fn) : useStore.getState().commit(fn);
  };
  return (
    <div className="token" ref={ref}>
      <button type="button" className="token__btn" onClick={() => setOpen(!open)} title={meta.hint}>
        <span className="token__chip" style={{ background: value }} />
        <span className="token__label">{meta.label}</span>
        <span className="token__hex mono">{value.toUpperCase()}</span>
      </button>
      {open && (
        <div className="popover token__pop">
          <div className="ui-color__custom">
            <input type="color" value={value} onFocus={checkpoint} onClick={checkpoint} onChange={(e) => set(e.target.value, true)} />
            <input
              className="ui-input mono"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                if (/^#([0-9a-f]{6})$/i.test(e.target.value)) set(e.target.value, false);
              }}
            />
          </div>
          {extracted.length > 0 && (
            <>
              <div className="popover__label">From your reference image</div>
              <div className="swatches">
                {extracted.map((c) => (
                  <button key={c} type="button" title={c} className="swatch" style={{ background: c }} onClick={() => set(c, false)} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function FontField({ value, onChange, rolesOnly = false }: { value: FontRef; onChange: (v: FontRef) => void; rolesOnly?: boolean }) {
  const { open, setOpen, ref } = usePopover();
  const fonts = useStore((s) => s.book.theme.fonts);
  useEffect(() => {
    if (open) loadAllFonts();
  }, [open]);
  const name = value.startsWith('@') ? `${FONT_ROLES.find((r) => `@${r.key}` === value)?.label} · ${fonts[value.slice(1) as keyof typeof fonts]}` : value;
  const groups = ['Display', 'Handwriting', 'Body', 'Typewriter'] as const;
  return (
    <div className="ui-font" ref={ref}>
      <button type="button" className="ui-font__btn" onClick={() => setOpen(!open)} style={{ fontFamily: fontCss(value) }}>
        <span>{name}</span>
        <Icon name="down" size={14} />
      </button>
      {open && (
        <div className="popover ui-font__pop">
          {!rolesOnly && (
            <>
              <div className="popover__label">Theme fonts — change once, update everywhere</div>
              {FONT_ROLES.map((r) => (
                <button
                  type="button"
                  key={r.key}
                  className={`ui-font__opt${value === `@${r.key}` ? ' is-on' : ''}`}
                  style={{ fontFamily: `var(--f-${r.key})` }}
                  onClick={() => (onChange(`@${r.key}`), setOpen(false))}
                >
                  <span>{fonts[r.key]}</span>
                  <small>{r.label}</small>
                </button>
              ))}
            </>
          )}
          {groups.map((g) => (
            <div key={g}>
              <div className="popover__label">{g}</div>
              {FONTS.filter((f) => f.group === g).map((f) => (
                <button
                  type="button"
                  key={f.family}
                  className={`ui-font__opt${value === f.family ? ' is-on' : ''}`}
                  style={{ fontFamily: fontCss(f.family) }}
                  onClick={() => (onChange(f.family), setOpen(false))}
                >
                  <span>{f.family}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
