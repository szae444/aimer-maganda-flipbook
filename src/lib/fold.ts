/**
 * Paper-fold geometry for a soft page turn.
 *
 * Coordinates are the right page's own: the spine is x = 0, the outer edge x = W.
 * A is the page corner being pulled (at rest), C is where that corner is now.
 * The crease is the perpendicular bisector of A–C. Everything on A's side of the
 * crease is lifted and mirrored across it, revealing the page's back side.
 *
 * Rendering only ever changes transforms (see Book.tsx): a large rotated box with
 * overflow:hidden acts as the crease clip, so phones never repaint page content
 * mid-turn — the GPU just moves already-painted layers.
 */

export interface Pt {
  x: number;
  y: number;
}

/** 2D affine matrix in CSS order: x' = a·x + c·y + e, y' = b·x + d·y + f */
export type Mat = [number, number, number, number, number, number];

export const mul = (m: Mat, n: Mat): Mat => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];

export const inv = (m: Mat): Mat => {
  const det = m[0] * m[3] - m[1] * m[2];
  const a = m[3] / det;
  const b = -m[1] / det;
  const c = -m[2] / det;
  const d = m[0] / det;
  return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])];
};

export const css = (m: Mat) => `matrix(${m.map((v) => (Math.abs(v) < 1e-9 ? 0 : +v.toFixed(5))).join(',')})`;

/** Paper cannot stretch: keep the pulled corner within reach of the spine. */
export function constrainCorner(A: Pt, C: Pt, W: number, H: number): Pt {
  let { x, y } = C;
  const near = { x: 0, y: A.y };
  const far = { x: 0, y: H - A.y };
  const diag = Math.hypot(W, H);
  let d = Math.hypot(x - near.x, y - near.y);
  if (d > W) {
    x = near.x + ((x - near.x) / d) * W;
    y = near.y + ((y - near.y) / d) * W;
  }
  d = Math.hypot(x - far.x, y - far.y);
  if (d > diag) {
    x = far.x + ((x - far.x) / d) * diag;
    y = far.y + ((y - far.y) / d) * diag;
  }
  return { x, y };
}

export interface Fold {
  /** A point on the crease and the crease normal (pointing toward the lifted side). */
  M: Pt;
  n: Pt;
  /** Places the back face (local coords) where the folded flap lands. */
  back: Mat;
  /** How far the lifted part reaches from the crease. */
  depth: number;
}

/** Reflection across the crease, composed with the back face's mirror (x → W − x). */
function backMatrix(M: Pt, n: Pt, W: number): Mat {
  const r11 = 1 - 2 * n.x * n.x;
  const r12 = -2 * n.x * n.y;
  const r22 = 1 - 2 * n.y * n.y;
  const tx = M.x - (r11 * M.x + r12 * M.y);
  const ty = M.y - (r12 * M.x + r22 * M.y);
  return [-r11, -r12, r12, r22, r11 * W + tx, r12 * W + ty];
}

export function computeFold(A: Pt, Cin: Pt, W: number, H: number): Fold | null {
  const C = constrainCorner(A, Cin, W, H);
  const vx = A.x - C.x;
  const vy = A.y - C.y;
  const len = Math.hypot(vx, vy);
  if (len < 0.5) return null;
  const n = { x: vx / len, y: vy / len };
  const M = { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 };
  let depth = 0;
  for (const p of [
    { x: 0, y: 0 },
    { x: W, y: 0 },
    { x: W, y: H },
    { x: 0, y: H },
  ])
    depth = Math.max(depth, (p.x - M.x) * n.x + (p.y - M.y) * n.y);
  return { M, n, back: backMatrix(M, n, W), depth };
}

/** Resting states expressed as folds, so a soft page never switches rendering mode. */
export const restFold = (turned: boolean, W: number): Fold => {
  // unturned: a virtual crease just past the outer edge (nothing lifted, flap off-page)
  // turned: the crease is the spine itself (whole page flipped onto the left)
  const M = { x: turned ? 0 : W + 1, y: 0 };
  const n = { x: 1, y: 0 };
  return { M, n, back: backMatrix(M, n, W), depth: 0 };
};

/**
 * The clip box: local (u, v) → page coords, placing its right edge on the crease.
 * Its size is BIG × 2·BIG, so everything on the spine side of the crease is inside.
 */
export function clipMatrix(M: Pt, n: Pt, BIG: number): Mat {
  const t = { x: -n.y, y: n.x };
  return [n.x, n.y, t.x, t.y, M.x - BIG * n.x - BIG * t.x, M.y - BIG * n.y - BIG * t.y];
}

/**
 * Places a size×size light texture along the part of the crease that lies on the page,
 * stretching it `reach` px away from the crease on side `dir` (±1 × normal).
 * Returns null when the crease misses the page (nothing to light).
 */
export function creaseStrip(M: Pt, n: Pt, dir: 1 | -1, reach: number, W: number, H: number, size: number): Mat | null {
  const t = { x: -n.y, y: n.x };
  // clip the crease line M + s·t to the page rectangle
  let lo = -Infinity;
  let hi = Infinity;
  for (const [m, d, max] of [
    [M.x, t.x, W],
    [M.y, t.y, H],
  ] as const) {
    if (Math.abs(d) < 1e-9) {
      if (m < 0 || m > max) return null;
      continue;
    }
    const a = (0 - m) / d;
    const b = (max - m) / d;
    lo = Math.max(lo, Math.min(a, b));
    hi = Math.min(hi, Math.max(a, b));
  }
  if (!(hi > lo)) return null;
  const len = hi - lo + 8;
  const mid = (lo + hi) / 2;
  const c = { x: M.x + mid * t.x, y: M.y + mid * t.y };
  const kx = (dir * reach) / size;
  const ky = len / size;
  return [n.x * kx, n.y * kx, t.x * ky, t.y * ky, c.x - (len / 2) * t.x, c.y - (len / 2) * t.y];
}
