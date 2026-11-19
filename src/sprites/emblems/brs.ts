import { PAL, type SpriteDef } from '../painter';
import { EMBLEM_SIZE, groundShadow, heart, text } from './common';

/** BRS: the school — brick building with a clock tower, a flag, a "BRS" banner and a little playground. */
export const BRS: SpriteDef = {
  key: 'emblem-brs',
  w: EMBLEM_SIZE,
  h: EMBLEM_SIZE,
  draw(p) {
    groundShadow(p, 24, 44, 22, 4);
    // clock tower
    p.rect(19, 4, 10, 14, '#f2c66d').rect(26, 4, 3, 14, '#dcab52');
    p.poly([[18, 5], [30, 5], [24, 0]], '#b85d45');
    p.circle(24, 10, 3, PAL.white).px(24, 9, PAL.ink).px(25, 10, PAL.ink).px(24, 10, PAL.ink);
    // flag
    p.vline(31, 0, 9, PAL.grayDark).rect(32, 0, 5, 3, PAL.red).hline(32, 1, 5, PAL.white);
    // main building
    p.rect(3, 16, 42, 4, '#b85d45').rect(3, 19, 42, 1, '#8f4433');
    p.rect(4, 20, 40, 22, '#f2c66d');
    p.rect(40, 20, 4, 22, '#dcab52');
    for (const x of [7, 13, 31, 37]) for (const y of [23, 31]) p.rect(x, y, 4, 4, PAL.window).px(x, y, PAL.windowLight).hline(x, y + 2, 4, PAL.windowDark);
    // banner with the name
    p.rect(16, 22, 16, 9, PAL.white).rect(17, 23, 14, 7, PAL.blue);
    text(p, 19, 24, 'BRS', PAL.white);
    // door
    p.rect(20, 33, 8, 9, PAL.door).rect(21, 34, 6, 8, '#94603f').hline(19, 42, 10, PAL.grayLight);
    // playground slide + a heart
    p.line(0, 44, 4, 37, PAL.red).line(1, 44, 5, 37, PAL.red).vline(5, 37, 7, PAL.grayDark);
    heart(p, 42, 43, PAL.pink, '#fff');
  },
};
