import { useId } from 'react';
import type { StickerKind } from '../../types';

interface Props {
  kind: StickerKind;
  fill: string;
  ink: string;
  text: string;
}

/** Stroke-only stickers stretch freely; filled ones keep their proportions. */
export const STRETCHY: StickerKind[] = ['arrow', 'scribble', 'squiggle'];

export const STICKER_KINDS: { kind: StickerKind; label: string }[] = [
  { kind: 'heart', label: 'Heart' },
  { kind: 'star', label: 'Star' },
  { kind: 'sparkle', label: 'Sparkle' },
  { kind: 'flower', label: 'Flower' },
  { kind: 'bow', label: 'Bow' },
  { kind: 'cherry', label: 'Cherries' },
  { kind: 'butterfly', label: 'Butterfly' },
  { kind: 'burst', label: 'Burst' },
  { kind: 'moon', label: 'Moon' },
  { kind: 'sun', label: 'Sun' },
  { kind: 'cloud', label: 'Cloud' },
  { kind: 'sprig', label: 'Sprig' },
  { kind: 'postmark', label: 'Postmark' },
  { kind: 'arrow', label: 'Arrow' },
  { kind: 'scribble', label: 'Circle' },
  { kind: 'squiggle', label: 'Squiggle' },
  { kind: 'asterisk', label: 'Asterisk' },
  { kind: 'check', label: 'Tick' },
  { kind: 'pin', label: 'Pin' },
  { kind: 'clip', label: 'Clip' },
];

const burstPoints = (() => {
  const pts: string[] = [];
  const n = 28;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? 39 : 48;
    pts.push(`${(50 + Math.cos(a) * r).toFixed(1)},${(50 + Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(' ');
})();

export function StickerSvg({ kind, fill, ink, text }: Props) {
  const uid = useId().replace(/:/g, '');
  const stretch = STRETCHY.includes(kind);
  const line = { fill: 'none', stroke: fill, strokeLinecap: 'round', strokeLinejoin: 'round', vectorEffect: 'non-scaling-stroke' } as const;
  const outline = { stroke: ink, strokeWidth: 2.6, strokeLinejoin: 'round', strokeLinecap: 'round' } as const;
  const shine = { fill: 'none', stroke: '#fff', strokeOpacity: 0.55, strokeWidth: 3, strokeLinecap: 'round' } as const;

  let body: React.ReactNode;
  switch (kind) {
    case 'star':
      body = (
        <>
          <polygon points="50,5 61.5,36 95,37 68.5,57.5 78,91 50,71 22,91 31.5,57.5 5,37 38.5,36" fill={fill} {...outline} />
          <path d="M44 22 L40 33" {...shine} />
        </>
      );
      break;
    case 'heart':
      body = (
        <>
          <path d="M50 87 C 22 67 7 51 10 32 C 12 16 33 9 50 28 C 67 9 88 16 90 32 C 93 51 78 67 50 87 Z" fill={fill} {...outline} />
          <path d="M23 34 C 23 27 28 22 35 21" {...shine} />
        </>
      );
      break;
    case 'sparkle':
      body = <path d="M50 4 C 53 36 64 47 96 50 C 64 53 53 64 50 96 C 47 64 36 53 4 50 C 36 47 47 36 50 4 Z" fill={fill} {...outline} />;
      break;
    case 'flower':
      body = (
        <>
          {[0, 72, 144, 216, 288].map((r) => (
            <ellipse key={r} cx="50" cy="27" rx="15" ry="22" transform={`rotate(${r} 50 50)`} fill={fill} {...outline} />
          ))}
          <circle cx="50" cy="50" r="12" fill={ink === fill ? '#fff' : ink} {...outline} stroke="rgba(0,0,0,.55)" />
        </>
      );
      break;
    case 'burst':
      body = (
        <>
          <polygon points={burstPoints} fill={fill} {...outline} stroke="rgba(0,0,0,.35)" strokeWidth={1.5} />
          <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fill={ink} style={{ font: `italic 26px var(--f-display)` }}>
            {text}
          </text>
        </>
      );
      break;
    case 'bow':
      body = (
        <g fill={fill} {...outline}>
          <path d="M47 50 L33 90 L41 85 L46 94 L52 52 Z" />
          <path d="M53 50 L67 90 L59 85 L54 94 L48 52 Z" />
          <path d="M50 44 C 35 20 8 20 10 40 C 12 58 36 54 50 47 Z" />
          <path d="M50 44 C 65 20 92 20 90 40 C 88 58 64 54 50 47 Z" />
          <ellipse cx="50" cy="46" rx="8" ry="9" />
          <path d="M22 34 C 26 30 32 30 36 34" {...shine} />
        </g>
      );
      break;
    case 'arrow':
      body = (
        <g {...line} strokeWidth={3.5}>
          <path d="M8 74 C 26 34 58 22 88 36" />
          <path d="M72 22 L89 36 L70 48" />
        </g>
      );
      break;
    case 'scribble':
      body = <path d="M24 60 C 12 34 46 14 76 20 C 98 26 98 62 70 76 C 44 90 10 82 6 56 C 4 38 28 20 54 20" {...line} strokeWidth={4} />;
      break;
    case 'squiggle':
      body = <path d="M4 60 C 14 40 22 80 34 58 S 54 38 64 58 S 84 80 96 52" {...line} strokeWidth={5} />;
      break;
    case 'moon':
      body = <path d="M62 8 A 42 42 0 1 0 92 72 A 34 34 0 1 1 62 8 Z" fill={fill} {...outline} />;
      break;
    case 'sun':
      body = (
        <>
          {Array.from({ length: 12 }, (_, i) => (
            <line key={i} x1="50" y1="21" x2="50" y2="7" transform={`rotate(${i * 30} 50 50)`} stroke={ink} strokeWidth={5} strokeLinecap="round" />
          ))}
          <circle cx="50" cy="50" r="22" fill={fill} stroke="rgba(0,0,0,.5)" strokeWidth={2.4} />
        </>
      );
      break;
    case 'cherry':
      body = (
        <>
          <g fill="none" stroke="#5a3b22" strokeWidth={3} strokeLinecap="round">
            <path d="M32 66 C 38 42 52 22 64 12" />
            <path d="M70 70 C 67 46 66 28 64 12" />
          </g>
          <path d="M64 12 C 74 2 92 6 95 14 C 84 23 72 21 64 12 Z" fill={ink} stroke="rgba(0,0,0,.45)" strokeWidth={2} />
          <circle cx="30" cy="72" r="17" fill={fill} stroke="rgba(0,0,0,.5)" strokeWidth={2.4} />
          <circle cx="70" cy="75" r="17" fill={fill} stroke="rgba(0,0,0,.5)" strokeWidth={2.4} />
          <path d="M21 66 C 22 62 25 60 28 59" {...shine} />
          <path d="M61 69 C 62 65 65 63 68 62" {...shine} />
        </>
      );
      break;
    case 'sprig':
      body = (
        <>
          <path d="M50 97 C 47 70 53 40 50 5" fill="none" stroke={ink} strokeWidth={2.4} strokeLinecap="round" />
          {[18, 36, 54, 72].map((y, i) => (
            <g key={y}>
              <ellipse cx="37" cy={y + 4} rx="13" ry="6" transform={`rotate(-32 37 ${y + 4})`} fill={fill} stroke={ink} strokeWidth={1.8} />
              <ellipse cx="63" cy={y + (i % 2 ? 10 : 0)} rx="13" ry="6" transform={`rotate(32 63 ${y + (i % 2 ? 10 : 0)})`} fill={fill} stroke={ink} strokeWidth={1.8} />
            </g>
          ))}
        </>
      );
      break;
    case 'butterfly':
      body = (
        <>
          <g fill={fill} {...outline}>
            <path d="M50 50 C 30 12 5 17 9 38 C 11 53 34 55 50 50 Z" />
            <path d="M50 50 C 70 12 95 17 91 38 C 89 53 66 55 50 50 Z" />
            <path d="M50 53 C 34 58 19 76 31 85 C 42 91 50 71 50 53 Z" />
            <path d="M50 53 C 66 58 81 76 69 85 C 58 91 50 71 50 53 Z" />
          </g>
          <ellipse cx="50" cy="53" rx="3.4" ry="19" fill={ink} />
          <path d="M49 36 C 46 26 42 21 37 19 M51 36 C 54 26 58 21 63 19" fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round" />
        </>
      );
      break;
    case 'cloud':
      body = <path d="M24 74 C 7 74 5 51 22 49 C 20 33 41 25 51 38 C 57 21 83 24 82 44 C 99 46 97 74 80 74 Z" fill={fill} {...outline} />;
      break;
    case 'asterisk':
      body = <path d="M50 8 L50 92 M14 29 L86 71 M14 71 L86 29" fill="none" stroke={fill} strokeWidth={10} strokeLinecap="round" />;
      break;
    case 'check':
      body = <path d="M12 54 L38 80 L90 16" fill="none" stroke={fill} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />;
      break;
    case 'pin':
      body = (
        <>
          <path d="M56 58 L82 92" stroke="rgba(0,0,0,.28)" strokeWidth={5} strokeLinecap="round" />
          <circle cx="47" cy="42" r="25" fill={fill} stroke="rgba(0,0,0,.45)" strokeWidth={2} />
          <circle cx="47" cy="42" r="13" fill="rgba(0,0,0,.12)" />
          <path d="M33 34 C 35 28 40 24 46 23" {...shine} strokeWidth={4} />
        </>
      );
      break;
    case 'clip':
      body = (
        <path
          d="M40 12 L40 76 C 40 92 63 92 63 76 L63 24 C 63 10 48 10 48 24 L48 70"
          fill="none"
          stroke={fill}
          strokeWidth={4.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
      break;
    case 'postmark':
      body = (
        <g filter={`url(#rough-${uid})`} opacity={0.88}>
          <defs>
            <filter id={`rough-${uid}`}>
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
              <feDisplacementMap in="SourceGraphic" scale="2.2" />
            </filter>
            <path id={`ring-${uid}`} d="M50 50 m -37 0 a 37 37 0 1 1 74 0 a 37 37 0 1 1 -74 0" />
          </defs>
          <circle cx="50" cy="50" r="47" fill="none" stroke={fill} strokeWidth={2.4} />
          <circle cx="50" cy="50" r="29" fill="none" stroke={fill} strokeWidth={1.6} />
          <text fill={fill} style={{ font: '8.6px var(--f-mono)', letterSpacing: '1.4px' }}>
            <textPath href={`#ring-${uid}`}>{text}</textPath>
          </text>
          <path d="M50 64 C 38 56 33 50 34 44 C 35 38 43 36 50 43 C 57 36 65 38 66 44 C 67 50 62 56 50 64 Z" fill={fill} />
        </g>
      );
      break;
  }

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio={stretch ? 'none' : 'xMidYMid meet'} width="100%" height="100%" overflow="visible" aria-hidden>
      {body}
    </svg>
  );
}
