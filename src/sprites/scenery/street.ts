import { PAL, type SpriteDef } from '../painter';

/** Street furniture, beach props, vehicles and little animated life. */

const bench: SpriteDef = {
  key: 's-bench',
  w: 12,
  h: 8,
  draw(p) {
    p.rect(1, 1, 10, 2, PAL.trunk).rect(1, 4, 10, 2, PAL.trunk).rect(1, 3, 10, 1, PAL.trunkDark);
    p.rect(2, 6, 1, 2, PAL.black).rect(9, 6, 1, 2, PAL.black);
  },
};

const lamp: SpriteDef = {
  key: 's-lamp',
  w: 6,
  h: 18,
  draw(p) {
    p.vline(2, 4, 13, PAL.black).rect(1, 16, 3, 2, PAL.black);
    p.rect(1, 1, 4, 3, PAL.black).rect(2, 2, 2, 1, PAL.yellow);
  },
};

function cafe(key: string, c: string): SpriteDef {
  return {
    key,
    w: 18,
    h: 18,
    draw(p) {
      p.ellipse(9, 16, 8, 1.8, PAL.shadow);
      p.vline(9, 5, 11, PAL.grayDark);
      for (let i = 0; i < 8; i++) p.rect(1 + i * 2, 3 - Math.abs(3.5 - i) * 0.6 + 2, 2, 3, i % 2 ? PAL.white : c);
      p.ellipse(9, 14, 4, 1.5, PAL.white);
      p.rect(2, 12, 2, 4, PAL.trunk).rect(14, 12, 2, 4, PAL.trunk);
    },
  };
}

function beachUmbrella(key: string, c: string): SpriteDef {
  return {
    key,
    w: 18,
    h: 18,
    draw(p) {
      p.ellipse(10, 16, 7, 1.6, PAL.shadow);
      p.vline(9, 5, 12, PAL.grayDark);
      for (let i = 0; i < 8; i++) p.rect(1 + i * 2, 1 + Math.abs(3.5 - i) * 0.7, 2, 6 - Math.abs(3.5 - i) * 0.7, i % 2 ? PAL.white : c);
      p.rect(11, 13, 6, 2, i2(c));
    },
  };
}
const i2 = (c: string) => (c === PAL.red ? PAL.yellow : PAL.white);

const sunbed: SpriteDef = {
  key: 's-sunbed',
  w: 14,
  h: 6,
  draw(p) {
    p.rect(1, 2, 12, 2, PAL.white).rect(1, 1, 4, 1, PAL.white).rect(1, 4, 1, 2, PAL.grayDark).rect(12, 4, 1, 2, PAL.grayDark);
  },
};

/** Top-down vehicles facing right (rotated to their heading in game). */
function car(key: string, body: string, roof: string, extra?: (p: import('../painter').Pix) => void): SpriteDef {
  return {
    key,
    w: 16,
    h: 9,
    draw(p) {
      p.rect(2, 0, 3, 1, PAL.black).rect(11, 0, 3, 1, PAL.black).rect(2, 8, 3, 1, PAL.black).rect(11, 8, 3, 1, PAL.black);
      p.rect(0, 1, 16, 7, body);
      p.rect(5, 2, 7, 5, roof);
      p.rect(11, 2, 2, 5, PAL.glass).rect(4, 2, 1, 5, PAL.glassDark);
      p.px(15, 2, PAL.yellow).px(15, 6, PAL.yellow);
      extra?.(p);
    },
  };
}

const tuktuk: SpriteDef = {
  key: 'v-tuktuk',
  w: 12,
  h: 8,
  draw(p) {
    p.rect(2, 0, 2, 1, PAL.black).rect(2, 7, 2, 1, PAL.black).rect(10, 3, 2, 2, PAL.black);
    p.rect(0, 1, 10, 6, PAL.red).rect(2, 2, 6, 4, '#c73f55');
    p.rect(8, 2, 2, 4, PAL.yellow).rect(10, 3, 1, 2, PAL.grayDark);
  },
};

const microbus: SpriteDef = {
  key: 'v-microbus',
  w: 20,
  h: 9,
  draw(p) {
    p.rect(3, 0, 3, 1, PAL.black).rect(14, 0, 3, 1, PAL.black).rect(3, 8, 3, 1, PAL.black).rect(14, 8, 3, 1, PAL.black);
    p.rect(0, 1, 20, 7, PAL.white).rect(1, 2, 16, 5, PAL.whiteShade);
    p.rect(0, 4, 20, 1, PAL.blue);
    p.rect(17, 2, 2, 5, PAL.glass);
    p.px(19, 2, PAL.yellow).px(19, 6, PAL.yellow);
  },
};

/** Nile felucca, side view (sails right; flipped when sailing left). */
const felucca: SpriteDef = {
  key: 'l-felucca',
  w: 22,
  h: 26,
  draw(p) {
    p.ellipse(11, 24, 10, 1.6, 'rgba(255,255,255,0.45)');
    p.poly([[1, 20], [21, 20], [17, 24], [5, 24]], PAL.trunk);
    p.hline(3, 20, 17, PAL.trunkDark);
    p.vline(10, 3, 17, PAL.trunkDark);
    p.poly([[10, 3], [10, 19], [2, 19]], PAL.white);
    p.poly([[11, 5], [11, 18], [19, 18]], PAL.whiteShade);
    p.line(1, 20, 14, 1, PAL.trunkDark);
    p.px(13, 1, PAL.red).px(14, 1, PAL.red);
  },
};

/** Water sparkle / ripple, two frames. */
const wave: SpriteDef = {
  key: 'l-wave',
  w: 8,
  h: 3,
  frames: 2,
  outline: false,
  draw(p, f) {
    const c = 'rgba(255,255,255,0.75)';
    if (f === 0) p.px(0, 2, c).rect(1, 1, 2, 1, c).px(3, 2, c).rect(4, 1, 2, 1, c).px(6, 2, c);
    else p.rect(1, 2, 2, 1, c).px(3, 1, c).rect(4, 2, 2, 1, c).px(6, 1, c);
  },
};

/** Little birds flapping (2 frames). */
const bird: SpriteDef = {
  key: 'l-bird',
  w: 7,
  h: 4,
  frames: 2,
  outline: false,
  draw(p, f) {
    const c = PAL.ink;
    if (f === 0) p.px(0, 0, c).px(1, 1, c).px(2, 2, c).px(3, 2, c).px(4, 2, c).px(5, 1, c).px(6, 0, c);
    else p.px(0, 2, c).px(1, 2, c).px(2, 2, c).px(3, 3, c).px(4, 2, c).px(5, 2, c).px(6, 2, c);
  },
};

const gull: SpriteDef = {
  key: 'l-gull',
  w: 9,
  h: 5,
  frames: 2,
  draw(p, f) {
    const c = PAL.white;
    if (f === 0) p.rect(0, 1, 3, 1, c).rect(3, 2, 3, 1, c).rect(6, 1, 3, 1, c).px(4, 2, PAL.gold);
    else p.rect(0, 3, 3, 1, c).rect(3, 2, 3, 1, c).rect(6, 3, 3, 1, c).px(4, 2, PAL.gold);
  },
};

/** Festoon string lights between two posts (the glam lights of Tagamo3 and Zayed). */
const lights: SpriteDef = {
  key: 's-lights',
  w: 30,
  h: 18,
  draw(p) {
    p.vline(1, 2, 15, PAL.black).vline(28, 2, 15, PAL.black);
    p.rect(0, 16, 3, 2, PAL.black).rect(27, 16, 3, 2, PAL.black);
    for (let x = 2; x < 28; x++) {
      const y = 3 + Math.round(Math.sin(((x - 2) / 26) * Math.PI) * 5);
      p.px(x, y, '#5f5c5a');
      if (x % 3 === 0) p.px(x, y + 1, x % 2 ? PAL.yellow : PAL.pink);
    }
  },
};

export const STREET = {
  bench,
  lamp,
  cafes: [cafe('s-cafe-red', PAL.red), cafe('s-cafe-green', PAL.green), cafe('s-cafe-blue', PAL.blue)],
  beachUmbrellas: [beachUmbrella('s-umbrella-red', PAL.red), beachUmbrella('s-umbrella-blue', PAL.blue), beachUmbrella('s-umbrella-yellow', '#f0b429')],
  sunbed,
  lights,
};

export const VEHICLES = [
  car('v-car-red', '#e05a5a', '#c84444'),
  car('v-car-blue', '#5b8fd6', '#4a77b8'),
  car('v-car-yellow', '#f2c14e', '#d9a634'),
  car('v-taxi', PAL.white, PAL.whiteShade, (p) => p.rect(6, 4, 5, 1, PAL.black).dither(6, 3, 5, 3, PAL.black)),
  tuktuk,
  microbus,
];

export const LIFE = { felucca, wave, bird, gull };

export const STREET_SPRITES: SpriteDef[] = [
  bench,
  lamp,
  ...STREET.cafes,
  ...STREET.beachUmbrellas,
  sunbed,
  lights,
  ...VEHICLES,
  felucca,
  wave,
  bird,
  gull,
];
