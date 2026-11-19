import { PAL, type SpriteDef } from '../painter';
import { EMBLEM_SIZE, groundShadow } from './common';

/** Korba: an antique French-style building (slate mansard roof, iron balconies), a café table and a vintage street lamp. */
export const KORBA: SpriteDef = {
  key: 'emblem-korba',
  w: EMBLEM_SIZE,
  h: EMBLEM_SIZE,
  draw(p) {
    groundShadow(p, 24, 44, 22, 4);
    const stone = '#f4e4c6';
    const stoneShade = '#dcc59c';
    const slate = '#7d8aa3';
    const iron = '#2f2a2e';
    // mansard roof with dormers and a little dome
    p.poly([[3, 14], [37, 14], [33, 5], [7, 5]], slate);
    p.rect(7, 5, 26, 1, '#a3afc4');
    p.ellipse(20, 5, 5, 4, slate).ellipse(19, 4, 2, 1.5, '#a3afc4');
    p.vline(20, 0, 2, PAL.gold);
    for (const x of [9, 27]) {
      p.rect(x, 8, 4, 5, PAL.white).rect(x + 1, 9, 2, 4, PAL.windowDark);
      p.poly([[x - 1, 8], [x + 5, 8], [x + 2, 5]], '#5f6b84');
    }
    p.rect(2, 13, 36, 2, stoneShade).rect(2, 13, 36, 1, PAL.gold);
    // stone façade with tall windows and iron balconies
    p.rect(3, 15, 34, 28, stone);
    p.rect(33, 15, 4, 28, stoneShade);
    for (const y of [17, 26]) {
      for (const x of [6, 14, 22, 29]) {
        p.rect(x, y, 4, 6, PAL.windowDark).ellipse(x + 2, y, 2, 1.5, PAL.windowDark);
        p.rect(x, y, 4, 2, PAL.window).px(x, y, PAL.windowLight);
        p.rect(x - 1, y - 2, 6, 1, stoneShade);
        p.rect(x - 1, y + 5, 6, 1, iron).px(x - 1, y + 4, iron).px(x + 1, y + 4, iron).px(x + 3, y + 4, iron).px(x + 4, y + 4, iron);
      }
      p.hline(3, y + 7, 34, stoneShade);
    }
    // ground floor: arched doorway and a café with a green awning
    p.rect(6, 35, 6, 8, '#6b4a35').ellipse(9, 35, 3, 2.5, '#6b4a35').px(11, 39, PAL.gold);
    for (let i = 0; i < 10; i++) p.rect(15 + i * 2, 33, 2, 3, i % 2 ? PAL.white : PAL.green);
    p.rect(16, 36, 18, 7, PAL.windowDark).rect(17, 37, 7, 5, PAL.window).rect(27, 37, 6, 6, '#94603f');
    // café table + chairs out front
    p.ellipse(42, 40, 4, 1.5, PAL.white).vline(42, 40, 3, PAL.grayDark);
    p.rect(37, 39, 2, 4, PAL.trunk).rect(46, 39, 2, 4, PAL.trunk);
    p.rect(40, 37, 2, 2, '#f6e7d0').px(43, 38, PAL.red);
    // vintage street lamp
    p.vline(1, 24, 19, iron);
    p.rect(0, 42, 3, 2, iron);
    p.rect(-1, 19, 5, 5, iron).rect(0, 20, 3, 3, PAL.yellow);
    p.px(1, 18, iron);
  },
};
