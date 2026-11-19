import { PAL, type SpriteDef } from '../painter';
import { EMBLEM_SIZE, groundShadow } from './common';

/** Nasr City: a chunky retro camera with a lens glint and a little flash burst. */
export const NASR_CITY: SpriteDef = {
  key: 'emblem-nasr-city',
  w: EMBLEM_SIZE,
  h: EMBLEM_SIZE,
  draw(p) {
    groundShadow(p, 24, 44, 19, 3.5);
    // body
    p.rect(5, 17, 38, 24, PAL.black);
    p.rect(5, 17, 38, 3, '#46464d');
    p.rect(5, 22, 38, 15, '#8a5a3a'); // leatherette band
    for (let x = 6; x < 42; x += 2) p.dither(x, 23, 1, 13, '#7a4c30', x % 4);
    p.rect(5, 37, 38, 4, '#46464d');
    // silver top with viewfinder and dials
    p.rect(9, 12, 30, 6, PAL.grayLight);
    p.rect(9, 12, 30, 1, PAL.white);
    p.rect(19, 8, 10, 5, PAL.grayLight).rect(19, 8, 10, 1, PAL.white);
    p.rect(21, 9, 6, 3, PAL.windowDark);
    p.rect(33, 10, 4, 3, PAL.red); // shutter button
    p.rect(11, 10, 5, 3, PAL.gray);
    // flash
    p.rect(7, 13, 6, 4, PAL.white).rect(8, 14, 4, 2, PAL.yellow);
    // lens
    p.circle(24, 29, 11, PAL.grayDark);
    p.circle(24, 29, 9, PAL.grayLight);
    p.circle(24, 29, 7, PAL.black);
    p.circle(24, 29, 5, PAL.blueDark);
    p.circle(24, 29, 3, '#2a4f86');
    p.rect(20, 25, 3, 2, PAL.glassLight).px(21, 27, PAL.glassLight).px(27, 32, PAL.glass);
    // flash burst
    const y = PAL.yellow;
    p.vline(10, 2, 4, y).hline(7, 5, 3, y).hline(11, 5, 3, y).px(10, 5, PAL.white);
    p.px(5, 2, y).px(15, 2, y).px(5, 8, y).px(15, 8, y);
  },
};
