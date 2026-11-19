import { PAL, type Pix } from '../painter';

/** All emblems are 48×48 art px, standing on a soft ground shadow. */
export const EMBLEM_SIZE = 48;

export function groundShadow(p: Pix, cx = 24, cy = 44, rx = 20, ry = 4) {
  p.ellipse(cx, cy, rx, ry, PAL.shadow);
}

export function heart(p: Pix, x: number, y: number, c = PAL.red, hi = '#ffd0d8') {
  // 5×4 heart with its top-left at (x, y)
  p.rect(x, y, 2, 1, c).rect(x + 3, y, 2, 1, c);
  p.rect(x, y + 1, 5, 1, c);
  p.rect(x + 1, y + 2, 3, 1, c);
  p.px(x + 2, y + 3, c);
  p.px(x, y, hi);
}

export function palm(p: Pix, x: number, baseY: number, h = 16, lean = 1) {
  // trunk
  for (let i = 0; i < h; i++) {
    const dx = Math.round((i / h) ** 2 * 3 * lean);
    p.rect(x + dx, baseY - i, 2, 1, i % 3 === 0 ? PAL.trunkDark : PAL.trunk);
  }
  const tx = x + Math.round(3 * lean);
  const ty = baseY - h;
  // fronds
  const fr = PAL.leaf;
  const frD = PAL.leafDark;
  p.line(tx, ty, tx - 6, ty + 3, frD).line(tx + 1, ty, tx + 7, ty + 3, frD);
  p.line(tx, ty - 1, tx - 5, ty - 3, fr).line(tx + 1, ty - 1, tx + 6, ty - 3, fr);
  p.line(tx, ty, tx - 4, ty + 5, fr).line(tx + 1, ty, tx + 5, ty + 5, fr);
  p.rect(tx - 1, ty - 1, 4, 2, PAL.leafLight);
  p.px(tx, ty + 1, PAL.trunkDark).px(tx + 1, ty + 1, PAL.trunkDark);
}

/** 3×5 pixel letters for little signs. */
const GLYPHS: Record<string, string[]> = {
  B: ['XX.', 'X.X', 'XX.', 'X.X', 'XX.'],
  R: ['XX.', 'X.X', 'XX.', 'X.X', 'X.X'],
  S: ['.XX', 'X..', '.X.', '..X', 'XX.'],
  A: ['.X.', 'X.X', 'XXX', 'X.X', 'X.X'],
  H: ['X.X', 'X.X', 'XXX', 'X.X', 'X.X'],
  E: ['XXX', 'X..', 'XX.', 'X..', 'XXX'],
  L: ['X..', 'X..', 'X..', 'X..', 'XXX'],
};

export function text(p: Pix, x: number, y: number, s: string, c: string, scale = 1) {
  let cx = x;
  for (const ch of s) {
    const g = GLYPHS[ch];
    if (g) g.forEach((row, j) => [...row].forEach((v, i) => v === 'X' && p.rect(cx + i * scale, y + j * scale, scale, scale, c)));
    cx += 4 * scale;
  }
}
