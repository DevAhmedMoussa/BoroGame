import { PAL, type SpriteDef } from '../painter';

const horse: SpriteDef = {
  key: 'n-horse',
  w: 24,
  h: 20,
  draw(p) {
    p.ellipse(12, 18, 9, 1.6, PAL.shadow);
    const c = '#9a5f36';
    const d = '#7a4626';
    p.ellipse(11, 10, 7, 3.6, c);
    p.poly([[16, 9], [19, 3], [22, 4], [19, 10]], c); // neck
    p.rect(19, 2, 4, 3, c).px(22, 3, PAL.ink).px(20, 1, d);
    p.line(17, 4, 15, 9, PAL.ink).line(18, 3, 16, 8, '#3a2318'); // mane
    for (const x of [6, 9, 13, 16]) p.rect(x, 12, 1, 6, d).px(x, 17, PAL.ink);
    p.line(4, 9, 2, 14, '#3a2318'); // tail
    p.rect(9, 8, 5, 2, PAL.red).px(10, 7, PAL.gold); // saddle blanket
  },
};

const goat: SpriteDef = {
  key: 'n-goat',
  w: 15,
  h: 13,
  draw(p) {
    p.ellipse(7, 11, 5, 1.4, PAL.shadow);
    p.ellipse(7, 7, 4.5, 2.6, '#f4efe6');
    p.rect(10, 3, 3, 3, '#f4efe6').px(12, 4, PAL.ink).px(11, 2, '#8a7a66').px(10, 1, '#8a7a66');
    p.px(11, 6, '#d8cfc0');
    for (const x of [4, 6, 8, 10]) p.rect(x, 9, 1, 3, '#8a7a66');
    p.px(2, 6, '#d8cfc0');
  },
};

const cactus: SpriteDef = {
  key: 'n-cactus',
  w: 12,
  h: 17,
  draw(p) {
    p.ellipse(6, 15, 4, 1.3, PAL.shadow);
    const g = '#5f9e4f';
    const d = '#477c3c';
    p.rect(5, 2, 3, 13, g).vline(7, 2, 13, d);
    p.rect(1, 6, 2, 5, g).rect(1, 10, 4, 2, g);
    p.rect(9, 4, 2, 5, g).rect(7, 8, 4, 2, g);
    p.px(6, 1, PAL.pink).px(5, 1, PAL.red);
    for (const [x, y] of [[6, 5], [6, 9], [2, 8], [10, 6]]) p.px(x, y, '#c9e6a6');
  },
};

/**
 * Zuzu, the fluffy white dog by Kuku's home.
 * Frames: 0 idle (tail left), 1 wag (tail right), 2 happy (ears up, eyes closed, tongue out).
 */
const zuzu: SpriteDef = {
  key: 'zuzu',
  w: 24,
  h: 19,
  frames: 3,
  draw(p, f) {
    const W = PAL.white;
    const shade = '#e3e6ec';
    const ear = '#f1e2cf';
    p.ellipse(12, 17, 9, 1.8, PAL.shadow);
    // tail
    if (f === 0) p.circle(21, 8, 2.4, W).circle(22, 5.5, 1.8, W);
    else p.circle(20, 6, 2.4, W).circle(19, 3.5, 1.8, W);
    // fluffy body
    p.ellipse(14, 11, 7.5, 4.6, W);
    p.circle(10, 9.5, 2.6, W).circle(15, 8, 2.8, W).circle(19, 10, 2.4, W);
    p.ellipse(14, 13.5, 6, 1.8, shade);
    // legs + paws
    for (const [x, y] of [[9, 13], [12, 14], [16, 14], [19, 13]]) p.rect(x, y, 2, 16 - y, W).hline(x, 15, 2, shade);
    // head
    const hy = f === 2 ? 6 : 7;
    p.circle(7, hy, 5.2, W);
    p.circle(5, hy - 4, 2, W).circle(8, hy - 4.5, 2, W).circle(10.5, hy - 3, 1.6, W); // fluffy top
    // ears
    if (f === 2) p.ellipse(2.5, hy - 3, 1.6, 2.6, ear).ellipse(11.5, hy - 3, 1.6, 2.6, ear);
    else p.ellipse(2.2, hy + 0.5, 1.8, 3, ear).ellipse(11.8, hy + 0.5, 1.8, 3, ear);
    // face
    if (f === 2) {
      p.px(4, hy, PAL.ink).px(5, hy - 1, PAL.ink).px(6, hy, PAL.ink);
      p.px(8, hy, PAL.ink).px(9, hy - 1, PAL.ink).px(10, hy, PAL.ink);
      p.rect(7, hy + 3, 1, 2, PAL.pink);
    } else {
      p.rect(5, hy - 1, 1, 2, PAL.ink).rect(9, hy - 1, 1, 2, PAL.ink);
      p.px(5, hy - 1, '#6b6b7a').px(9, hy - 1, '#6b6b7a');
    }
    p.px(7, hy + 2, PAL.ink);
    p.px(4, hy + 2, '#ffb3c4').px(10, hy + 2, '#ffb3c4');
    // red collar with a gold tag
    p.hline(4, hy + 5, 7, PAL.red).px(7, hy + 6, PAL.gold);
  },
};

export const ANIMALS = { horse, goat, cactus, zuzu };
export const ANIMAL_SPRITES: SpriteDef[] = [horse, goat, cactus, zuzu];
