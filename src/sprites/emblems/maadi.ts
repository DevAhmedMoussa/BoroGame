import { PAL, type SpriteDef } from '../painter';
import { EMBLEM_SIZE, groundShadow } from './common';

/** Maadi: a big leafy tree over a quiet street, a bicycle and a café umbrella. */
export const MAADI: SpriteDef = {
  key: 'emblem-maadi',
  w: EMBLEM_SIZE,
  h: EMBLEM_SIZE,
  draw(p) {
    groundShadow(p, 22, 44, 22, 4);
    // trunk
    p.rect(17, 24, 6, 20, PAL.trunk);
    p.rect(21, 24, 2, 20, PAL.trunkDark);
    p.line(19, 30, 13, 24, PAL.trunk).line(21, 28, 28, 22, PAL.trunk);
    // layered canopy
    p.ellipse(20, 15, 17, 12, PAL.leafDark);
    p.ellipse(12, 15, 9, 8, PAL.leaf);
    p.ellipse(26, 13, 10, 9, PAL.leaf);
    p.ellipse(19, 9, 10, 7, PAL.leaf);
    p.ellipse(16, 8, 5, 3.5, PAL.leafLight);
    p.ellipse(27, 10, 4, 3, PAL.leafLight);
    p.ellipse(9, 13, 3, 2, PAL.leafLight);
    for (const [x, y] of [[6, 18], [14, 21], [30, 19], [24, 4], [34, 14]]) p.px(x, y, '#2f6a36');
    // bicycle leaning on the tree
    const bx = 24;
    p.ring(bx, 40, 4, 1, PAL.black).ring(bx + 11, 40, 4, 1, PAL.black);
    p.line(bx, 40, bx + 5, 34, PAL.red).line(bx + 5, 34, bx + 11, 40, PAL.red).line(bx + 5, 34, bx + 9, 34, PAL.red);
    p.line(bx + 9, 34, bx + 11, 40, PAL.red).line(bx + 5, 34, bx + 3, 31, PAL.red);
    p.rect(bx + 2, 30, 3, 1, PAL.black).rect(bx + 9, 32, 3, 1, PAL.black);
    // café umbrella (green & white) with a table
    p.vline(42, 25, 18, PAL.grayDark);
    for (let i = 0; i < 6; i++) p.rect(36 + i * 2, 23 - Math.abs(2.5 - i), 2, 3, i % 2 ? PAL.white : PAL.green);
    p.ellipse(42, 40, 4, 1.5, PAL.white);
  },
};
