import { PAL, type SpriteDef } from '../painter';
import { EMBLEM_SIZE, groundShadow } from './common';

/** Zamalek: Cairo Tower (lotus lattice) with a felucca sailing beside it. */
export const ZAMALEK: SpriteDef = {
  key: 'emblem-zamalek',
  w: EMBLEM_SIZE,
  h: EMBLEM_SIZE,
  draw(p) {
    groundShadow(p, 30, 45, 12, 3);
    // a little bit of Nile on the left
    p.ellipse(11, 40, 12, 6, PAL.water);
    p.hline(4, 39, 4, PAL.waterLight).hline(12, 42, 5, PAL.waterLight);
    // tower: slender lattice shaft
    const tx = 30;
    p.rect(tx - 3, 14, 6, 30, '#d9b48a');
    p.rect(tx + 1, 14, 2, 30, '#b8916a');
    for (let y = 15; y < 43; y += 3) {
      p.px(tx - 2, y, '#8a6448').px(tx, y + 1, '#8a6448').px(tx + 2, y, '#8a6448');
    }
    // lotus-shaped top and observation deck
    p.poly([[tx - 6, 14], [tx + 6, 14], [tx + 4, 9], [tx - 4, 9]], '#d9b48a');
    p.rect(tx - 5, 8, 10, 2, PAL.cream);
    p.rect(tx - 4, 10, 8, 2, PAL.windowDark);
    p.rect(tx - 3, 5, 6, 3, '#d9b48a');
    p.vline(tx, 0, 5, PAL.red);
    p.px(tx, 0, PAL.white);
    // base
    p.rect(tx - 6, 42, 12, 3, PAL.creamShade);
    // felucca: brown hull, tall white lateen sail
    p.poly([[3, 38], [19, 38], [16, 41], [6, 41]], PAL.trunk);
    p.hline(5, 38, 13, PAL.trunkDark);
    p.vline(11, 20, 18, PAL.trunkDark);
    p.poly([[11, 20], [11, 37], [4, 37]], PAL.white);
    p.poly([[12, 22], [12, 36], [19, 36]], PAL.whiteShade);
    p.line(4, 37, 14, 18, PAL.trunkDark);
  },
};
