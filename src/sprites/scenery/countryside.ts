import { PAL, type Pix, type SpriteDef } from '../painter';

/**
 * The green land between the districts: little farms, groves, picnics,
 * playgrounds and gardens. Static sprites are baked into the map; the swing
 * is animated by MapLife.
 */

const shadow = (p: Pix, cx: number, cy: number, rx: number) => p.ellipse(cx, cy, rx, 1.8, PAL.shadow);

const SOIL = '#a8754a';
const SOIL_DARK = '#8a5a38';
const SKIN = '#c98d63';
const SKIN_LIGHT = '#e0a97e';

/** A crop plot with furrows. Wheat fields get a scarecrow. */
function field(key: string, kind: 'greens' | 'wheat' | 'flowers'): SpriteDef {
  const w = 46;
  const h = 30;
  return {
    key,
    w,
    h,
    draw(p) {
      const top = 8;
      p.rect(2, top + 1, w - 4, h - top - 3, SOIL).rect(3, top, w - 6, 1, SOIL).rect(3, h - 2, w - 6, 1, SOIL);
      for (let row = 0; row < 5; row++) {
        const y = top + 2 + row * 4;
        p.hline(3, y + 2, w - 6, SOIL_DARK);
        for (let x = 4 + (row % 2); x < w - 5; x += 3) {
          if (kind === 'greens') p.rect(x, y, 2, 2, '#5fae52').px(x, y, '#93d468');
          else if (kind === 'wheat') p.rect(x, y - 1, 1, 3, '#e3b448').px(x, y - 1, '#f6dc86').px(x + 1, y + 1, '#c99a34');
          else p.rect(x, y, 2, 2, PAL.leaf).px(x, y, [PAL.pink, PAL.yellow, PAL.white, PAL.lilac][(row + x) % 4]);
        }
      }
      if (kind === 'wheat') {
        // scarecrow in the middle of the field
        const cx = 23;
        p.vline(cx, 4, 16, PAL.trunkDark).hline(cx - 5, 9, 11, PAL.trunk);
        p.rect(cx - 2, 8, 5, 6, '#d9744a').px(cx - 1, 10, PAL.yellow).px(cx + 1, 12, '#5b8fd6');
        p.circle(cx + 0.5, 5.5, 2.4, '#f1d9a0').px(cx - 1, 5, PAL.ink).px(cx + 1, 5, PAL.ink);
        p.rect(cx - 3, 3, 7, 1, '#c98a22').rect(cx - 1, 1, 3, 2, '#c98a22');
        p.px(cx - 6, 9, '#f6dc86').px(cx + 6, 9, '#f6dc86').px(cx - 6, 10, '#f6dc86').px(cx + 6, 10, '#f6dc86');
      }
    },
  };
}

/** Countryside mud-brick house: flat roof with hay, a blue door. */
const hut: SpriteDef = {
  key: 'c-hut',
  w: 30,
  h: 27,
  draw(p) {
    shadow(p, 15, 25, 13);
    const wall = '#dcb07c';
    const shade = '#c4955e';
    p.rect(3, 10, 24, 14, wall).rect(21, 10, 6, 14, shade);
    for (const [x, y] of [[6, 12], [11, 16], [17, 12], [24, 18], [5, 20], [14, 21]]) p.hline(x, y, 3, shade);
    p.rect(2, 8, 26, 3, '#b8895a').hline(2, 10, 26, '#9c7046');
    p.ellipse(9, 6.5, 5, 2.4, '#e8c860').ellipse(19, 6, 6, 2.8, '#e8c860');
    p.hline(6, 5, 4, '#f6dc86').hline(16, 4, 5, '#f6dc86').px(12, 7, '#c9a040').px(22, 7, '#c9a040');
    // blue door with an arch, little windows
    p.rect(12, 15, 6, 9, '#3d7fc4').rect(13, 14, 4, 1, '#3d7fc4').vline(15, 15, 9, '#2f66a3').px(17, 19, PAL.gold);
    p.rect(5, 14, 4, 4, '#3a2a20').rect(5, 14, 4, 1, '#3d7fc4').rect(22, 14, 3, 4, '#3a2a20').rect(22, 14, 3, 1, '#3d7fc4');
    // a pot of geraniums by the door
    p.rect(19, 21, 3, 3, PAL.terracotta).px(19, 20, PAL.red).px(21, 20, PAL.red).px(20, 19, PAL.leaf);
  },
};

/** Pigeon tower (burg hamam), dotted with nesting holes. */
const dovecote: SpriteDef = {
  key: 'c-dovecote',
  w: 20,
  h: 36,
  draw(p) {
    shadow(p, 10, 34, 8);
    const c = '#f0e2c4';
    const s = '#d8c49c';
    p.poly([[3, 34], [17, 34], [14, 9], [6, 9]], c);
    p.poly([[12, 34], [17, 34], [14, 9], [12, 9]], s);
    p.ellipse(10, 8, 5, 4.5, c).ellipse(12, 8, 2.5, 4, s).px(10, 2, '#c9a87a').vline(10, 0, 3, '#8a5a3a');
    for (const y of [14, 21, 28]) p.hline(4 + (34 - y) * 0.1, y, 13 - (34 - y) * 0.2, '#c9a87a');
    for (let y = 11; y < 33; y += 3) for (let x = 6; x < 15; x += 2) if ((x + y) % 4 === 1) p.px(x + (y > 22 ? 0 : 0), y, '#5a4636');
    p.rect(8, 29, 4, 5, '#7a4a2e');
    // pigeons resting on the ledges
    p.px(5, 13, '#9aa0a8').px(6, 13, '#9aa0a8').px(14, 20, '#9aa0a8').px(15, 20, '#9aa0a8').px(15, 19, '#9aa0a8');
  },
};

const donkey: SpriteDef = {
  key: 'c-donkey',
  w: 20,
  h: 17,
  draw(p) {
    p.ellipse(10, 15, 8, 1.6, PAL.shadow);
    const c = '#a39d96';
    const d = '#7f7973';
    p.ellipse(9, 9, 6.5, 3.5, c);
    p.poly([[13, 8], [16, 3], [18, 4], [16, 9]], c);
    p.rect(15, 3, 4, 3, c).rect(17, 5, 2, 1, '#e8e2da').px(17, 3, PAL.ink);
    p.rect(15, 0, 1, 3, c).rect(17, 0, 1, 3, d);
    for (const x of [4, 7, 11, 13]) p.rect(x, 11, 1, 4, d).px(x, 14, PAL.ink);
    p.line(3, 8, 1, 12, d).px(1, 13, PAL.ink);
    p.ellipse(9, 10, 4, 1.5, '#bdb7b0');
  },
};

const haybale: SpriteDef = {
  key: 'c-hay',
  w: 13,
  h: 10,
  draw(p) {
    shadow(p, 6.5, 8, 6);
    p.rect(1, 2, 11, 6, '#e8c860').rect(2, 1, 9, 1, '#e8c860');
    p.vline(4, 1, 7, '#c9a040').vline(8, 1, 7, '#c9a040').hline(2, 3, 9, '#f6dc86');
  },
};

const fence: SpriteDef = {
  key: 'c-fence',
  w: 20,
  h: 9,
  draw(p) {
    const c = PAL.cream;
    p.hline(0, 3, 20, c).hline(0, 6, 20, c);
    for (const x of [1, 6, 11, 16]) p.rect(x, 1, 2, 7, c).px(x, 0, c).px(x + 1, 7, PAL.creamShade);
  },
};

/** Checked blanket with a basket, watermelon and two friends. */
const picnic: SpriteDef = {
  key: 'c-picnic',
  w: 28,
  h: 17,
  draw(p) {
    for (let y = 8; y < 16; y++) for (let x = 2; x < 26; x++) p.px(x, y, (Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? PAL.red : PAL.white);
    p.rect(15, 7, 6, 4, '#b07a3e').hline(15, 7, 6, '#d39a55').px(16, 6, '#8a5a3a').px(19, 6, '#8a5a3a').hline(16, 5, 4, '#8a5a3a');
    p.ellipse(10, 13, 3, 1.6, '#4fa35a').ellipse(10, 12.6, 2.4, 1.1, '#f05a6a').px(9, 12, PAL.ink).px(11, 12, PAL.ink);
    p.px(23, 11, PAL.white).px(23, 12, PAL.whiteShade);
    // two people sitting
    p.rect(3, 6, 4, 5, PAL.blue).circle(5, 4, 2.2, SKIN).rect(3, 1, 5, 2, '#3a2318').px(4, 4, PAL.ink);
    p.rect(22, 5, 4, 6, PAL.pink).circle(24, 3, 2.4, '#7a5aa6').rect(23, 3, 2, 2, SKIN_LIGHT);
  },
};

/** Swing with a kid on it (3 frames: back, middle, forward). */
const swing: SpriteDef = {
  key: 'c-swing',
  w: 24,
  h: 20,
  frames: 3,
  draw(p, f) {
    shadow(p, 12, 18, 10);
    p.line(2, 18, 4, 1, '#d9744a').line(7, 18, 5, 1, '#d9744a');
    p.line(22, 18, 20, 1, '#d9744a').line(17, 18, 19, 1, '#d9744a');
    p.hline(4, 1, 17, '#b0552f').hline(4, 2, 17, '#d9744a');
    const dx = [-3, 0, 3][f];
    p.line(10, 3, 10 + dx, 13, PAL.grayDark).line(14, 3, 14 + dx, 13, PAL.grayDark);
    p.rect(9 + dx, 13, 7, 2, '#8a5a3a');
    p.rect(10 + dx, 9, 5, 4, PAL.yellow).circle(12.5 + dx, 7, 2.2, SKIN).rect(10 + dx, 4, 5, 2, '#2b1d14').px(11 + dx, 7, PAL.ink).px(13 + dx, 7, PAL.ink);
    p.px(10 + dx, 15, PAL.blue).px(14 + dx, 15, PAL.blue);
  },
};

const slide: SpriteDef = {
  key: 'c-slide',
  w: 20,
  h: 19,
  draw(p) {
    shadow(p, 10, 17, 9);
    p.vline(3, 3, 14, PAL.grayDark).vline(7, 3, 14, PAL.grayDark);
    for (let y = 5; y < 17; y += 3) p.hline(3, y, 5, PAL.grayLight);
    p.rect(2, 2, 7, 2, PAL.blue);
    p.poly([[8, 3], [11, 3], [19, 15], [19, 17], [16, 17]], PAL.yellow);
    p.line(9, 3, 17, 16, '#f6c84e');
  },
};

/** Little sandbox with a bucket. */
const sandbox: SpriteDef = {
  key: 'c-sandbox',
  w: 18,
  h: 11,
  draw(p) {
    p.rect(1, 2, 16, 8, '#c9955a').rect(2, 3, 14, 6, '#f3dfa8').px(5, 5, '#e6cb8e').px(11, 7, '#e6cb8e');
    p.rect(11, 3, 3, 3, PAL.red).hline(11, 3, 3, '#ff8a9a').ellipse(6, 6, 2, 1.2, '#e6cb8e');
  },
};

/** Tulip bed. */
function bed(key: string, a: string, b: string): SpriteDef {
  return {
    key,
    w: 20,
    h: 10,
    draw(p) {
      p.ellipse(10, 7, 9.5, 2.6, SOIL).ellipse(10, 7.5, 8, 1.6, SOIL_DARK);
      for (let i = 0; i < 6; i++) {
        const x = 3 + i * 2.8;
        const y = 3 + (i % 2);
        p.vline(x, y + 1, 3, PAL.leafDark).rect(x - 0.5, y - 1, 2, 2, i % 2 ? a : b).px(x, y - 2, i % 2 ? a : b);
      }
    },
  };
}

const reeds: SpriteDef = {
  key: 'c-reeds',
  w: 12,
  h: 14,
  draw(p) {
    for (const [x, h] of [[2, 9], [4, 12], [6, 8], [8, 11], [10, 7]]) {
      p.vline(x, 13 - h, h, PAL.leafDark).px(x, 13 - h + 2, PAL.leaf);
      if (h > 9) p.rect(x, 13 - h, 1, 3, '#8a5a3a');
    }
    p.line(3, 12, 1, 8, PAL.leaf).line(9, 12, 11, 9, PAL.leaf);
  },
};

/** Washing line between two posts. */
const laundry: SpriteDef = {
  key: 'c-laundry',
  w: 32,
  h: 20,
  draw(p) {
    shadow(p, 16, 18, 14);
    p.rect(1, 2, 2, 16, PAL.trunk).rect(29, 2, 2, 16, PAL.trunk);
    for (let x = 3; x < 29; x++) p.px(x, 3 + Math.round(Math.sin(((x - 3) / 26) * Math.PI) * 2), PAL.grayDark);
    const at = (x: number) => 4 + Math.round(Math.sin(((x - 3) / 26) * Math.PI) * 2);
    p.rect(5, at(5), 5, 6, PAL.pink).rect(4, at(5), 7, 2, PAL.pink).px(7, at(5) + 2, PAL.white);
    p.rect(12, at(12), 5, 4, PAL.blue).rect(12, at(12) + 4, 2, 4, PAL.blue).rect(15, at(12) + 4, 2, 4, PAL.blue);
    p.rect(19, at(19), 4, 7, PAL.yellow).hline(19, at(19) + 5, 4, '#f2b544');
    p.rect(24, at(24), 3, 5, PAL.white).px(25, at(24) + 2, PAL.teal);
  },
};

/** A kid holding a kite string (the kite itself flies in MapLife). */
const kiteKid: SpriteDef = {
  key: 'c-kitekid',
  w: 10,
  h: 15,
  draw(p) {
    p.ellipse(5, 14, 3.5, 1, PAL.shadow);
    p.rect(3, 6, 4, 5, '#4fb0a5').rect(3, 11, 1, 3, '#3d6aad').rect(6, 11, 1, 3, '#3d6aad');
    p.circle(5, 3.5, 2.4, SKIN).rect(3, 0, 5, 2, '#2b1d14').px(4, 3, PAL.ink).px(6, 3, PAL.ink);
    p.line(7, 6, 9, 2, SKIN).px(9, 1, SKIN);
    p.px(2, 7, SKIN).px(2, 8, SKIN);
  },
};

/** The owl's wooden perch (a T-stand with a little seed dish). */
const owlPerch: SpriteDef = {
  key: 'c-owlperch',
  w: 18,
  h: 22,
  draw(p) {
    shadow(p, 9, 20, 6);
    p.rect(8, 6, 2, 14, PAL.trunk).vline(9, 6, 14, PAL.trunkDark);
    p.rect(4, 19, 10, 2, PAL.trunkDark);
    p.rect(1, 5, 16, 2, PAL.trunk).hline(1, 5, 16, '#a8744c');
    p.ellipse(14, 19, 3, 1.2, '#5b8fd6').px(13, 18, '#e8c860').px(15, 18, '#e8c860');
    p.px(15, 7, PAL.leaf).px(16, 8, PAL.leaf).px(14, 8, PAL.leafDark);
  },
};

export const COUNTRY = {
  fields: [field('c-field-greens', 'greens'), field('c-field-wheat', 'wheat'), field('c-field-flowers', 'flowers')],
  hut,
  dovecote,
  donkey,
  haybale,
  fence,
  picnic,
  swing,
  slide,
  sandbox,
  beds: [bed('c-bed-a', PAL.red, PAL.yellow), bed('c-bed-b', PAL.pink, PAL.white), bed('c-bed-c', PAL.lilac, PAL.yellow)],
  reeds,
  laundry,
  kiteKid,
  owlPerch,
};

export const COUNTRY_SPRITES: SpriteDef[] = [
  ...COUNTRY.fields,
  hut,
  dovecote,
  donkey,
  haybale,
  fence,
  picnic,
  swing,
  slide,
  sandbox,
  ...COUNTRY.beds,
  reeds,
  laundry,
  kiteKid,
  owlPerch,
];
