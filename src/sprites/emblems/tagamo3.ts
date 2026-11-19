import { PAL, type SpriteDef } from '../painter';
import { EMBLEM_SIZE, groundShadow, palm } from './common';

/** Tagamo3: a modern glassy building on a palm-lined boulevard with café string lights. */
export const TAGAMO3: SpriteDef = {
  key: 'emblem-tagamo3',
  w: EMBLEM_SIZE,
  h: EMBLEM_SIZE,
  draw(p) {
    groundShadow(p, 24, 44, 22, 4);
    // stepped glass towers
    const tower = (x: number, y: number, w: number, h: number) => {
      p.rect(x, y, w, h, PAL.glass);
      p.rect(x + w - 3, y, 3, h, PAL.glassDark);
      for (let j = y + 2; j < y + h; j += 3) p.hline(x, j, w - 3, '#a9dced');
      for (let i = x + 3; i < x + w - 3; i += 4) p.vline(i, y, h, '#74b8d2');
      p.line(x + 1, y + h - 2, x + Math.min(w - 4, 8), y + 3, PAL.glassLight);
      p.rect(x - 1, y - 1, w + 2, 1, PAL.whiteShade);
    };
    tower(20, 4, 12, 39);
    tower(9, 14, 12, 29);
    tower(31, 18, 10, 25);
    // lobby
    p.rect(14, 38, 22, 5, PAL.cream);
    p.rect(22, 39, 6, 4, PAL.windowDark);
    // café string lights
    for (let i = 0; i < 9; i++) p.px(10 + i * 3, 33 + Math.round(Math.sin(i * 0.9) * 1.5), PAL.yellow);
    // palms on both sides
    palm(p, 3, 43, 18, 0.5);
    palm(p, 42, 43, 17, -0.6);
  },
};
