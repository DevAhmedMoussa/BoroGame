import { PAL, type SpriteDef } from '../painter';
import { EMBLEM_SIZE, groundShadow, heart, text } from './common';

/**
 * BRS: a cheerful signboard with the name, hearts and flowers.
 * (Placeholder design until we know what BRS is — swap freely.)
 */
export const BRS: SpriteDef = {
  key: 'emblem-brs',
  w: EMBLEM_SIZE,
  h: EMBLEM_SIZE,
  draw(p) {
    groundShadow(p, 24, 44, 20, 4);
    // posts
    p.rect(10, 22, 3, 22, PAL.trunk).rect(35, 22, 3, 22, PAL.trunk);
    // board
    p.rect(4, 8, 40, 20, PAL.cream);
    p.rect(4, 8, 40, 2, PAL.white);
    p.rect(4, 26, 40, 2, PAL.creamShade);
    p.rect(6, 10, 36, 16, PAL.pink);
    p.rect(7, 11, 34, 14, '#fbd3df');
    text(p, 12, 13, 'BRS', PAL.redDark, 2);
    // hearts
    heart(p, 1, 3, PAL.red);
    heart(p, 41, 4, PAL.pink, '#fff');
    // flowers along the bottom
    for (const [x, c] of [[6, PAL.red], [16, PAL.yellow], [26, PAL.pink], [40, PAL.red]] as Array<[number, string]>) {
      p.vline(x, 38, 6, PAL.leafDark);
      p.px(x - 1, 37, c).px(x + 1, 37, c).px(x, 36, c).px(x, 38, c).px(x, 37, PAL.yellow);
    }
    p.ellipse(24, 43, 18, 2, PAL.grass);
  },
};
