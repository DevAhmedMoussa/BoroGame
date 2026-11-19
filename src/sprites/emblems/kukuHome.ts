import { PAL, type SpriteDef } from '../painter';
import { EMBLEM_SIZE, groundShadow, heart } from './common';

/** Kuku's Home: cozy Heliopolis house with arched windows and a heart on the door. */
export const KUKU_HOME: SpriteDef = {
  key: 'emblem-kuku-home',
  w: EMBLEM_SIZE,
  h: EMBLEM_SIZE,
  draw(p) {
    groundShadow(p);
    // walls
    p.rect(8, 20, 32, 24, PAL.cream);
    p.rect(36, 20, 4, 24, PAL.creamShade);
    p.rect(8, 41, 32, 3, PAL.creamShade);
    // pink-terracotta roof
    p.poly([[5, 21], [43, 21], [37, 8], [11, 8]], PAL.terracotta);
    p.poly([[8, 17], [40, 17], [37, 8], [11, 8]], PAL.terraLight);
    for (let y = 11; y < 21; y += 3) p.hline(8, y, 32, PAL.terraDark);
    p.rect(5, 20, 38, 2, PAL.terraDark);
    // chimney with a little heart puff
    p.rect(31, 4, 4, 7, '#c0603d').rect(31, 4, 4, 1, PAL.terraDark);
    heart(p, 34, 0, PAL.pink, '#fff');
    // arched windows (Heliopolis style)
    for (const x of [11, 30]) {
      p.rect(x - 1, 25, 9, 11, PAL.white);
      p.ellipse(x + 3.5, 26, 4.5, 3.5, PAL.white);
      p.rect(x, 27, 7, 8, PAL.window);
      p.ellipse(x + 3.5, 27, 3.5, 2.5, PAL.window);
      p.rect(x, 31, 7, 4, PAL.windowDark);
      p.px(x + 1, 27, PAL.windowLight).px(x + 2, 28, PAL.windowLight);
      p.vline(x + 3, 25, 10, PAL.white);
      p.rect(x - 1, 35, 9, 2, PAL.creamShade);
      // flower box
      p.rect(x, 37, 7, 2, PAL.trunk);
      p.px(x + 1, 36, PAL.red).px(x + 3, 36, PAL.pink).px(x + 5, 36, PAL.red);
    }
    // door with a heart
    p.rect(20, 30, 8, 14, PAL.door);
    p.ellipse(24, 31, 4, 3, PAL.door);
    p.rect(21, 31, 6, 12, '#94603f');
    heart(p, 22, 35, PAL.pink, '#fff');
    p.px(26, 38, PAL.gold);
    // step and potted plants
    p.rect(18, 43, 12, 2, PAL.grayLight);
    for (const x of [14, 33]) {
      p.rect(x, 41, 3, 3, PAL.terracotta);
      p.ellipse(x + 1.5, 39.5, 2.5, 2, PAL.leaf);
      p.px(x + 1, 38, PAL.pink);
    }
  },
};
