/** Reads an image file and re-encodes it so large phone photos don't bloat saved books. */
export async function fileToCompressedDataUrl(file: File, maxSide = 1600, quality = 0.86): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
    const type = file.type === 'image/png' && hasAlpha(canvas) ? 'image/png' : 'image/webp';
    return canvas.toDataURL(type, quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function hasAlpha(canvas: HTMLCanvasElement) {
  const { data } = canvas.getContext('2d')!.getImageData(0, 0, Math.min(64, canvas.width), Math.min(64, canvas.height));
  for (let i = 3; i < data.length; i += 4) if (data[i] < 250) return true;
  return false;
}

export async function imageAspect(src: string) {
  const img = await loadImage(src);
  return img.naturalWidth / img.naturalHeight;
}

/* ---------------- Palette extraction (k-means) ---------------- */

type RGB = [number, number, number];

export const toHex = ([r, g, b]: RGB) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const luminance = ([r, g, b]: RGB) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

export function saturation([r, g, b]: RGB) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function dist(a: RGB, b: RGB) {
  // weighted RGB distance — cheap and perceptually decent
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return 2 * dr * dr + 4 * dg * dg + 3 * db * db;
}

/** Returns dominant colors from an image, most common first. */
export async function extractPalette(src: string, k = 9): Promise<string[]> {
  const img = await loadImage(src);
  const size = 72;
  const canvas = document.createElement('canvas');
  const scale = size / Math.max(img.naturalWidth, img.naturalHeight);
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px: RGB[] = [];
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 200) px.push([data[i], data[i + 1], data[i + 2]]);
  if (!px.length) return [];

  // farthest-point seeding keeps small-but-vivid accents from being swallowed
  const centers: RGB[] = [px[Math.floor(px.length / 2)]];
  while (centers.length < k) {
    let best = px[0];
    let bestD = -1;
    for (const p of px) {
      let d = Infinity;
      for (const c of centers) d = Math.min(d, dist(p, c));
      if (d > bestD) {
        bestD = d;
        best = p;
      }
    }
    centers.push(best);
  }
  const counts = new Array(k).fill(0);
  for (let iter = 0; iter < 10; iter++) {
    const sums = centers.map(() => [0, 0, 0, 0]);
    for (const p of px) {
      let bi = 0;
      let bd = Infinity;
      centers.forEach((c, i) => {
        const d = dist(p, c);
        if (d < bd) {
          bd = d;
          bi = i;
        }
      });
      const s = sums[bi];
      s[0] += p[0];
      s[1] += p[1];
      s[2] += p[2];
      s[3]++;
    }
    sums.forEach((s, i) => {
      counts[i] = s[3];
      if (s[3]) centers[i] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]];
    });
  }
  const ranked = centers
    .map((c, i) => ({ c, n: counts[i] }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  const out: RGB[] = [];
  for (const { c } of ranked) if (!out.some((o) => dist(o, c) < 400)) out.push(c);
  return out.map(toHex);
}

const mix = (a: string, b: string, t: number) => {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return toHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
};

/** Maps an extracted palette onto the book's color tokens. */
export function paletteToTokens(hexes: string[]) {
  const cols = hexes.map((h) => ({ h, rgb: hexToRgb(h) }));
  const byLight = [...cols].sort((a, b) => luminance(b.rgb) - luminance(a.rgb));
  const paper = byLight[0];
  const ink = byLight[byLight.length - 1];
  const rest = cols.filter((c) => c !== paper && c !== ink).sort((a, b) => saturation(b.rgb) - saturation(a.rgb));
  const pick = (i: number, fallback: string) => rest[i]?.h ?? fallback;
  const darkMid = [...rest].sort((a, b) => luminance(a.rgb) - luminance(b.rgb))[0]?.h ?? ink.h;
  return {
    paper: paper.h,
    paperAlt: byLight[1] && luminance(byLight[1].rgb) > 150 ? byLight[1].h : mix(paper.h, pick(0, ink.h), 0.18),
    ink: ink.h,
    muted: mix(ink.h, paper.h, 0.5),
    accent1: pick(0, ink.h),
    accent2: pick(1, ink.h),
    accent3: pick(2, ink.h),
    accent4: pick(3, mix(pick(0, ink.h), paper.h, 0.5)),
    cover: darkMid,
    coverInk: paper.h,
    desk: mix(ink.h, '#000000', 0.15),
    deskInk: paper.h,
  };
}
