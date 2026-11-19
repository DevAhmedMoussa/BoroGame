import { PAL, type SpriteDef } from '../painter';

/** Little moving things that make the map feel lived in (all animated by MapLife). */

interface Look {
  skin: string;
  /** Hair colour, or a hijab colour when `hijab` is set. */
  hair: string;
  hijab?: boolean;
  top: string;
  bottom: string;
  /** Long dress / galabeya instead of trousers. */
  robe?: boolean;
}

/** A person walking towards the camera (2 frames). */
function walker(key: string, l: Look): SpriteDef {
  return {
    key,
    w: 9,
    h: 16,
    frames: 2,
    draw(p, f) {
      p.ellipse(4.5, 15, 3.2, 1, PAL.shadow);
      // legs / robe
      if (l.robe) {
        p.rect(2, 6, 5, 8, l.bottom).px(f ? 2 : 6, 14, PAL.ink).px(f ? 3 : 5, 14, PAL.ink);
      } else {
        p.rect(2, 11, 2, f ? 3 : 2, l.bottom).rect(5, 11, 2, f ? 2 : 3, l.bottom);
        p.px(2, f ? 14 : 13, PAL.ink).px(6, f ? 13 : 14, PAL.ink);
      }
      p.rect(2, 6, 5, 5, l.top);
      // swinging arms
      p.rect(1, f ? 6 : 7, 1, 4, l.top).px(1, f ? 10 : 11, l.skin);
      p.rect(7, f ? 7 : 6, 1, 4, l.top).px(7, f ? 11 : 10, l.skin);
      // head
      if (l.hijab) {
        p.circle(4.5, 3.2, 3, l.hair).rect(2, 5, 5, 2, l.hair);
        p.rect(3, 2, 3, 3, l.skin).px(3, 3, PAL.ink).px(5, 3, PAL.ink);
      } else {
        p.circle(4.5, 3.4, 2.6, l.skin).rect(2, 0, 5, 2, l.hair).px(2, 2, l.hair).px(6, 2, l.hair);
        p.px(3, 3, PAL.ink).px(5, 3, PAL.ink);
      }
    },
  };
}

export const WALKERS: SpriteDef[] = [
  walker('p-walk-a', { skin: '#e0a97e', hair: '#d9708f', hijab: true, top: '#c8a4e8', bottom: '#3d4f7a', robe: true }),
  walker('p-walk-b', { skin: '#c98d63', hair: '#2b1d14', top: '#ffffff', bottom: '#3d6aad' }),
  walker('p-walk-c', { skin: '#b07a52', hair: '#e8e2da', top: '#e6d6b4', bottom: '#e6d6b4', robe: true }),
  walker('p-walk-d', { skin: '#a9714a', hair: '#2b1d14', top: '#ffe17a', bottom: '#f2b544', robe: true }),
  walker('p-walk-e', { skin: '#e0a97e', hair: '#3fc1c9', hijab: true, top: '#ffffff', bottom: '#5f5c5a' }),
  walker('p-walk-f', { skin: '#d49a6e', hair: '#6a4128', top: '#e5566f', bottom: '#2a2a2e' }),
];

/** White duck paddling (2 frames). */
const duck: SpriteDef = {
  key: 'l-duck',
  w: 11,
  h: 8,
  frames: 2,
  draw(p, f) {
    p.hline(1, 7, 9, 'rgba(255,255,255,0.7)').px(f ? 0 : 10, 6, 'rgba(255,255,255,0.7)');
    p.ellipse(5, 5, 4.5, 2.2, PAL.white).ellipse(4, 5.5, 3, 1.2, PAL.whiteShade);
    p.px(1, 3, PAL.white).px(0, 3, PAL.white);
    p.circle(8, 2.5, 2, PAL.white).px(8, 2, PAL.ink).rect(10, 3, 1, 1, '#f2a33a').px(9, 3, '#f2a33a');
  },
};

const duckling: SpriteDef = {
  key: 'l-duckling',
  w: 7,
  h: 5,
  frames: 2,
  draw(p, f) {
    p.px(f ? 0 : 6, 4, 'rgba(255,255,255,0.7)');
    p.ellipse(3, 3, 2.5, 1.4, PAL.yellow).circle(5, 1.5, 1.3, PAL.yellow).px(5, 1, PAL.ink).px(6, 2, '#f2a33a');
  },
};

/** Butterfly: white wings so it can be tinted any colour (2 frames: open, closed). */
const butterfly: SpriteDef = {
  key: 'l-butterfly',
  w: 7,
  h: 6,
  frames: 2,
  draw(p, f) {
    if (f === 0) p.ellipse(1.5, 2, 1.6, 1.8, PAL.white).ellipse(5.5, 2, 1.6, 1.8, PAL.white).px(1, 4, PAL.white).px(5, 4, PAL.white);
    else p.rect(2, 1, 1, 3, PAL.white).rect(4, 1, 1, 3, PAL.white);
    p.vline(3, 1, 4, PAL.ink);
  },
};

/** Pigeon: 0 stand, 1 peck, 2 wings up, 3 wings down. */
const pigeon: SpriteDef = {
  key: 'l-pigeon',
  w: 9,
  h: 7,
  frames: 4,
  draw(p, f) {
    const g = '#a3a9b3';
    const d = '#7c8290';
    if (f < 2) {
      p.ellipse(4, 4, 3.4, 1.8, g).hline(1, 4, 4, d);
      const hy = f === 1 ? 4 : 2;
      p.circle(7, hy, 1.3, '#6c9c96').px(7, hy - 1, PAL.ink).px(8, hy, '#e8a0a8');
      p.px(3, 6, '#e8a0a8').px(5, 6, '#e8a0a8');
    } else {
      p.ellipse(4, 4, 3, 1.5, g).circle(7, 3.5, 1.2, '#6c9c96').px(8, 3, PAL.ink);
      if (f === 2) p.line(2, 3, 0, 0, d).line(5, 3, 6, 0, d).line(3, 3, 2, 0, g);
      else p.line(2, 5, 0, 6, d).line(5, 5, 6, 6, d);
    }
  },
};

/** Hen: 0 stand, 1 peck. */
const chicken: SpriteDef = {
  key: 'l-chicken',
  w: 9,
  h: 8,
  frames: 2,
  draw(p, f) {
    p.ellipse(4, 7, 3, 0.8, PAL.shadow);
    p.ellipse(4, 4, 3.4, 2.4, PAL.white).px(1, 2, PAL.white).px(0, 2, PAL.whiteShade).px(4, 4, PAL.whiteShade);
    const hy = f ? 4 : 2;
    p.circle(7, hy, 1.4, PAL.white).px(7, hy - 2, PAL.red).px(8, hy - 2, PAL.red).px(7, hy, PAL.ink).px(8, hy + 1, '#f2a33a').px(7, hy + 1, PAL.red);
    p.px(3, 7, '#f2a33a').px(5, 7, '#f2a33a');
  },
};

/** Sitting cat: 0/1 tail swish, 2 blink. */
function cat(key: string, fur: string, dark: string): SpriteDef {
  return {
    key,
    w: 12,
    h: 11,
    frames: 3,
    draw(p, f) {
      p.ellipse(6, 10, 4.5, 1, PAL.shadow);
      p.ellipse(5, 7, 3.5, 3, fur).rect(3, 8, 5, 2, fur);
      p.circle(5, 3.5, 2.6, fur).px(3, 0, fur).px(3, 1, fur).px(7, 0, fur).px(7, 1, fur).px(3, 1, '#f4a6bf');
      if (f === 2) p.hline(3, 3, 2, PAL.ink).hline(6, 3, 2, PAL.ink);
      else p.px(4, 3, PAL.ink).px(6, 3, PAL.ink);
      p.px(5, 4, '#f4a6bf').px(4, 6, dark).px(6, 7, dark).px(4, 8, dark);
      if (f === 1) p.line(8, 9, 10, 6, fur).px(11, 5, dark);
      else p.line(8, 9, 11, 9, fur).px(11, 8, dark);
    },
  };
}

/** Diamond kite with a ribbon tail (2 frames). */
const kite: SpriteDef = {
  key: 'l-kite',
  w: 11,
  h: 16,
  frames: 2,
  draw(p, f) {
    p.poly([[5, 0], [10, 5], [5, 10], [0, 5]], PAL.pink);
    p.poly([[5, 0], [10, 5], [5, 5]], PAL.yellow).poly([[0, 5], [5, 5], [5, 10]], PAL.teal);
    p.vline(5, 1, 9, PAL.white).hline(1, 5, 9, PAL.white);
    for (let i = 0; i < 5; i++) p.px(5 + (f ? 1 : -1) * (i % 2), 11 + i, i % 2 ? PAL.red : PAL.yellow);
  },
};

/**
 * The owl who lives next to Zuzu.
 * Frames: 0 idle, 1 blink, 2 looking sideways, 3 happy (wings up), 4 happy (wings down).
 */
const owl: SpriteDef = {
  key: 'owl',
  w: 20,
  h: 21,
  frames: 5,
  draw(p, f) {
    const body = '#9b6b45';
    const dark = '#7a4f30';
    const belly = '#ead3a8';
    const disc = '#f6e7cb';
    const happy = f >= 3;
    // wings (behind the body when happy and raised)
    if (f === 3) {
      p.poly([[4, 12], [0, 6], [1, 14], [4, 17]], dark).poly([[16, 12], [20, 6], [19, 14], [16, 17]], dark);
    }
    p.ellipse(10, 13, 7, 7, body);
    // ear tufts
    p.poly([[3, 7], [3, 1], [7, 5]], body).poly([[17, 7], [17, 1], [13, 5]], body).px(4, 3, dark).px(16, 3, dark);
    p.ellipse(10, 6.5, 7, 4.5, body);
    // belly with little chevrons
    p.ellipse(10, 15, 4.5, 4, belly);
    for (const [x, y] of [[8, 14], [11, 14], [9, 16], [12, 16], [10, 18]]) p.px(x, y, '#c9a77a').px(x + 1, y + 1, '#c9a77a');
    if (f !== 3) p.ellipse(3.5, 14, 2, 4.5, dark).ellipse(16.5, 14, 2, 4.5, dark);
    if (f === 4) p.ellipse(3, 15, 2, 4, dark).ellipse(17, 15, 2, 4, dark);
    // face discs + eyes
    p.circle(6.5, 8, 3.4, disc).circle(13.5, 8, 3.4, disc);
    if (f === 1) {
      p.hline(5, 8, 3, PAL.ink).hline(12, 8, 3, PAL.ink);
    } else if (happy) {
      for (const cx of [6.5, 13.5]) p.px(cx - 1.5, 8, PAL.ink).px(cx - 0.5, 7, PAL.ink).px(cx + 0.5, 7, PAL.ink).px(cx + 1.5, 8, PAL.ink);
    } else {
      const look = f === 2 ? 1 : 0;
      for (const cx of [6.5, 13.5]) {
        p.circle(cx, 8, 2.4, '#ffd04d');
        p.circle(cx + look * 0.8, 8, 1.4, PAL.ink).px(cx - 1 + look, 7, PAL.white);
      }
    }
    // beak + blush
    p.px(9, 10, '#f2a33a').px(10, 10, '#f2a33a').px(9, 11, '#d9822a').px(10, 11, '#d9822a');
    p.px(4, 11, '#f4a6bf').px(5, 11, '#f4a6bf').px(15, 11, '#f4a6bf').px(16, 11, '#f4a6bf');
    if (happy) p.px(3, 11, '#f4a6bf').px(17, 11, '#f4a6bf');
    // feet
    p.hline(7, 20, 2, '#f2a33a').hline(11, 20, 2, '#f2a33a');
  },
};

export const CRITTERS = {
  walkers: WALKERS,
  duck,
  duckling,
  butterfly,
  pigeon,
  chicken,
  cats: [cat('l-cat-a', '#f0a65a', '#c97a34'), cat('l-cat-b', '#9a9aa3', '#6e6e78'), cat('l-cat-c', '#f4efe6', '#c9bba6')],
  kite,
  owl,
};

export const CRITTER_SPRITES: SpriteDef[] = [...WALKERS, duck, duckling, butterfly, pigeon, chicken, ...CRITTERS.cats, kite, owl];
