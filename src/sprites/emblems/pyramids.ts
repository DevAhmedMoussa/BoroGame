import { PAL, type SpriteDef } from '../painter';
import { EMBLEM_SIZE, groundShadow } from './common';

/** The Pyramids: three pyramids and the Sphinx in front. */
export const PYRAMIDS: SpriteDef = {
  key: 'emblem-pyramids',
  w: EMBLEM_SIZE,
  h: EMBLEM_SIZE,
  draw(p) {
    groundShadow(p, 24, 43, 23, 4);
    const lit = '#ecc27a';
    const shade = '#c9964f';
    const pyr = (cx: number, base: number, half: number, h: number) => {
      p.poly([[cx - half, base], [cx, base - h], [cx, base]], lit);
      p.poly([[cx, base - h], [cx + half, base], [cx, base]], shade);
      for (let y = base - h + 4; y < base; y += 4) {
        const w = ((y - (base - h)) / h) * half;
        p.hline(Math.round(cx - w), y, Math.round(w), '#d9ab63');
      }
    };
    pyr(11, 36, 10, 14);
    pyr(37, 37, 11, 17);
    pyr(24, 38, 15, 28);
    p.px(24, 10, '#fff2c4').px(23, 11, '#fff2c4');
    // the Sphinx lying in front
    const s = '#d9ab63';
    const sd = '#b98848';
    p.rect(12, 38, 18, 5, s);
    p.rect(12, 42, 18, 1, sd);
    p.rect(26, 34, 6, 6, s); // head
    p.poly([[25, 34], [33, 34], [32, 40], [26, 40]], '#6d8fbf'); // nemes headdress
    p.rect(27, 35, 4, 4, s);
    p.px(28, 36, PAL.ink).px(30, 36, PAL.ink);
    p.rect(30, 40, 6, 3, s); // paws
    p.rect(9, 40, 4, 2, s); // tail end
  },
};
