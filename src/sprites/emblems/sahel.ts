import { PAL, type SpriteDef } from '../painter';
import { EMBLEM_SIZE, groundShadow } from './common';

/** Sahel: a striped beach umbrella on white sand, a turquoise wave, a white domed chalet, the sun and a seagull. */
export const SAHEL: SpriteDef = {
  key: 'emblem-sahel',
  w: EMBLEM_SIZE,
  h: EMBLEM_SIZE,
  draw(p) {
    groundShadow(p, 24, 44, 22, 4);
    // sun
    p.circle(40, 7, 5, PAL.yellow);
    p.circle(40, 7, 3, '#fff3b0');
    // seagull
    p.rect(3, 6, 3, 1, PAL.white).rect(6, 7, 2, 1, PAL.white).rect(8, 6, 3, 1, PAL.white).px(7, 6, PAL.gold);
    // white domed chalet
    p.rect(26, 17, 18, 15, PAL.white);
    p.rect(40, 17, 4, 15, PAL.whiteShade);
    p.ellipse(35, 17, 8, 6, PAL.white);
    p.ellipse(37, 15, 4, 3, PAL.whiteShade);
    p.rect(29, 23, 5, 9, PAL.blue);
    p.ellipse(31.5, 23, 2.5, 2, PAL.blue);
    p.rect(37, 21, 4, 4, PAL.teal);
    // sand
    p.ellipse(22, 38, 23, 8, '#fbf3df');
    // turquoise wave
    p.ellipse(10, 42, 11, 5, PAL.teal);
    p.hline(2, 40, 6, PAL.white).hline(9, 38, 6, PAL.white).px(8, 39, PAL.white);
    // beach umbrella (red / white stripes)
    p.vline(20, 14, 26, PAL.grayDark);
    for (let i = 0; i < 9; i++) {
      const x = 10 + i * 2.4;
      const top = 12 + Math.abs(4 - i) * 0.8;
      p.rect(x, top, 3, 16 - top + 2, i % 2 ? PAL.white : PAL.red);
    }
    p.poly([[9, 18], [32, 18], [28, 20], [13, 20]], PAL.redDark);
    p.rect(19, 10, 3, 2, PAL.red);
    // towel + bucket
    p.rect(22, 36, 10, 4, PAL.yellow).rect(22, 37, 10, 1, PAL.blue);
    p.rect(14, 37, 4, 4, PAL.blue).hline(14, 36, 4, PAL.blueDark);
  },
};
