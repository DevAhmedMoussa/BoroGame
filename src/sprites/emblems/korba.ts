import { PAL, type SpriteDef } from '../painter';
import { EMBLEM_SIZE, groundShadow } from './common';

/** Korba: cream arcade building, a café table with a striped umbrella, a vintage street lamp. */
export const KORBA: SpriteDef = {
  key: 'emblem-korba',
  w: EMBLEM_SIZE,
  h: EMBLEM_SIZE,
  draw(p) {
    groundShadow(p, 24, 44, 22, 4);
    // building
    p.rect(3, 8, 34, 34, PAL.cream);
    p.rect(33, 8, 4, 34, PAL.creamShade);
    // ornamental cornice
    p.rect(2, 6, 36, 3, PAL.creamShade);
    p.rect(2, 5, 36, 1, PAL.gold);
    for (let x = 4; x < 37; x += 4) p.rect(x, 3, 2, 2, PAL.creamShade);
    // upper windows with green shutters
    for (const x of [6, 16, 26]) {
      p.rect(x, 12, 6, 8, PAL.windowDark);
      p.ellipse(x + 3, 12, 3, 2, PAL.windowDark);
      p.rect(x - 2, 12, 2, 8, PAL.green).rect(x + 6, 12, 2, 8, PAL.green);
      p.rect(x - 1, 21, 8, 1, PAL.creamShade);
      p.px(x + 1, 13, PAL.windowLight);
    }
    // ground-floor arcade
    for (const x of [5, 15, 25]) {
      p.rect(x, 29, 8, 13, '#6b4a35');
      p.ellipse(x + 4, 29, 4, 4, '#6b4a35');
      p.rect(x + 1, 32, 6, 10, '#8a6448');
    }
    p.rect(3, 25, 34, 2, PAL.creamShade);
    // café table + umbrella
    p.vline(43, 26, 15, PAL.grayDark);
    for (let i = 0; i < 6; i++) p.rect(36 + i * 2, 24 - Math.abs(2.5 - i), 2, 3, i % 2 ? PAL.white : PAL.red);
    p.ellipse(43, 40, 4, 1.5, PAL.white);
    p.vline(43, 40, 3, PAL.grayDark);
    // little chairs
    p.rect(37, 39, 2, 4, PAL.trunk).rect(46, 39, 2, 4, PAL.trunk);
    // vintage street lamp
    p.vline(1, 22, 21, PAL.black);
    p.rect(0, 42, 3, 2, PAL.black);
    p.rect(-1, 18, 5, 4, PAL.black);
    p.rect(0, 19, 3, 2, PAL.yellow);
  },
};
