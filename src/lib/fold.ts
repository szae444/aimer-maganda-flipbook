/**
 * Paper-fold geometry for a soft page turn.
 *
 * Coordinates are the right page's own: the spine is x = 0, the outer edge x = W.
 * A is the page corner being pulled (at rest), C is where that corner is now.
 * The crease is the perpendicular bisector of A–C. Everything on A's side of the
 * crease is lifted and mirrored across it, revealing the page's back side.
 */

export interface Pt {
  x: number;
  y: number;
}

export interface Fold {
  /** Part of the front face still lying flat. */
  stay: Pt[];
  /** Part of the front face that has been lifted (also: where the page below is revealed). */
  lifted: Pt[];
  /** `lifted`, expressed in the back face's own coordinates (for its clip-path). */
  backClip: Pt[];
  /** Where the lifted part lands after folding over. */
  folded: Pt[];
  /** CSS matrix placing the back face (transform-origin 0 0). */
  matrix: string;
  /** A point on the crease and the crease normal (pointing toward A). */
  M: Pt;
  n: Pt;
  /** How far the lifted part reaches from the crease. */
  depth: number;
}

const dot = (a: Pt, b: Pt) => a.x * b.x + a.y * b.y;

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

/** Sutherland–Hodgman clip of a convex polygon against one half-plane. */
function clipHalf(poly: Pt[], M: Pt, n: Pt, keepPositive: boolean): Pt[] {
  const side = (p: Pt) => (keepPositive ? 1 : -1) * dot({ x: p.x - M.x, y: p.y - M.y }, n);
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const sa = side(a);
    const sb = side(b);
    if (sa >= 0) out.push(a);
    if ((sa >= 0) !== (sb >= 0)) {
      const t = sa / (sa - sb);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return out;
}

export function computeFold(A: Pt, Cin: Pt, W: number, H: number): Fold | null {
  const C = constrainCorner(A, Cin, W, H);
  const vx = A.x - C.x;
  const vy = A.y - C.y;
  const len = Math.hypot(vx, vy);
  if (len < 0.5) return null;
  const n = { x: vx / len, y: vy / len };
  const M = { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 };
  const rect = [
    { x: 0, y: 0 },
    { x: W, y: 0 },
    { x: W, y: H },
    { x: 0, y: H },
  ];
  const lifted = clipHalf(rect, M, n, true);
  const stay = clipHalf(rect, M, n, false);

  // reflection across the crease: p' = R p + t, with R = I - 2 n nᵀ
  const r11 = 1 - 2 * n.x * n.x;
  const r12 = -2 * n.x * n.y;
  const r22 = 1 - 2 * n.y * n.y;
  const tx = M.x - (r11 * M.x + r12 * M.y);
  const ty = M.y - (r12 * M.x + r22 * M.y);
  const reflect = (p: Pt) => ({ x: r11 * p.x + r12 * p.y + tx, y: r12 * p.x + r22 * p.y + ty });

  // The back face is mirrored: its local (bx, by) sits behind front point (W - bx, by).
  // Compose that mirror with the crease reflection into one CSS matrix.
  const a = -r11;
  const b = -r12;
  const c = r12;
  const d = r22;
  const e = r11 * W + tx;
  const f = r12 * W + ty;

  let depth = 0;
  for (const p of lifted) depth = Math.max(depth, dot({ x: p.x - M.x, y: p.y - M.y }, n));

  return {
    stay,
    lifted,
    backClip: lifted.map((p) => ({ x: W - p.x, y: p.y })),
    folded: lifted.map(reflect),
    matrix: `matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
    M,
    n,
    depth,
  };
}

export const polygon = (pts: Pt[], dx = 0) =>
  pts.length < 3 ? 'polygon(0 0, 0 0, 0 0)' : `polygon(${pts.map((p) => `${(p.x + dx).toFixed(2)}px ${p.y.toFixed(2)}px`).join(', ')})`;

/**
 * A linear-gradient running along direction `u`, with stops given as px offsets
 * from point `M`, for an element of size w×h whose centre is (cx, cy).
 */
export function gradientFrom(u: Pt, M: Pt, w: number, h: number, cx: number, cy: number, stops: [number, string][]) {
  const angle = (Math.atan2(u.x, -u.y) * 180) / Math.PI;
  const len = Math.abs(w * u.x) + Math.abs(h * u.y);
  const sx = cx - (u.x * len) / 2;
  const sy = cy - (u.y * len) / 2;
  const s = (M.x - sx) * u.x + (M.y - sy) * u.y;
  return `linear-gradient(${angle.toFixed(2)}deg, ${stops.map(([o, col]) => `${col} ${(s + o).toFixed(1)}px`).join(', ')})`;
}
