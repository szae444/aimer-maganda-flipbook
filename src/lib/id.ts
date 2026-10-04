export const uid = (prefix = 'e') => `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
