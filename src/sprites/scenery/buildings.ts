import { PAL, type Pix, type SpriteDef } from '../painter';

/**
 * Filler buildings in a cozy 3/4 view: a roof seen from above, the front wall below it.
 * Each sprite's bottom edge is the ground line (placed with origin at bottom-centre).
 */

const shadow = (p: Pix, w: number, h: number) => p.ellipse(w / 2, h - 2, w / 2, 2.5, PAL.shadow);

/** Classic Cairo apartment block: flat roof with a water tank and satellite dish, AC units, laundry. */
function apartment(key: string, wall: string, wallShade: string, floors: number, seed: number): SpriteDef {
  const w = 28;
  const h = 14 + floors * 8;
  return {
    key,
    w,
    h,
    draw(p) {
      shadow(p, w, h);
      const roofH = 8;
      // roof top
      p.rect(1, 1, 26, roofH, PAL.roof);
      p.rect(1, 1, 26, 1, PAL.grayLight);
      p.rect(1, roofH, 26, 1, PAL.roofDark);
      p.rect(4, 2, 5, 4, PAL.grayLight).rect(4, 5, 5, 1, PAL.gray); // water tank
      p.circle(20, 4, 2.2, PAL.white).px(20, 4, PAL.gray); // satellite dish
      if (seed % 2) p.rect(12, 3, 4, 3, PAL.whiteShade);
      // front wall
      const top = roofH + 1;
      const bottom = h - 3;
      p.rect(1, top, 26, bottom - top, wall);
      p.rect(23, top, 4, bottom - top, wallShade);
      // windows per floor
      for (let f = 0; f < floors; f++) {
        const y = top + 2 + f * 8;
        for (let c = 0; c < 3; c++) {
          const x = 3 + c * 7;
          p.rect(x, y, 4, 5, PAL.windowDark).rect(x, y, 4, 2, PAL.window).px(x, y, PAL.windowLight);
          p.rect(x - 1, y + 5, 6, 1, wallShade);
          const r = (seed * 7 + f * 3 + c * 5) % 9;
          if (r === 0) p.rect(x + 3, y + 1, 3, 2, PAL.whiteShade); // AC unit
          if (r === 4) p.rect(x - 1, y + 6, 6, 1, PAL.grayDark).px(x, y + 7, PAL.red).px(x + 2, y + 7, PAL.blue).px(x + 4, y + 7, PAL.yellow); // laundry
          if (r === 6) p.rect(x - 1, y + 4, 6, 2, PAL.grayDark); // balcony rail
        }
      }
      // entrance
      p.rect(11, bottom - 6, 6, 6, PAL.door).rect(12, bottom - 5, 4, 5, '#94603f');
      p.rect(10, bottom - 7, 8, 1, wallShade);
    },
  };
}

/** Heliopolis-style building with a row of arches. */
function arcade(key: string, wall: string, shade: string): SpriteDef {
  return {
    key,
    w: 34,
    h: 30,
    draw(p) {
      shadow(p, 34, 30);
      p.rect(1, 1, 32, 6, PAL.roof).rect(1, 6, 32, 1, PAL.roofDark);
      p.rect(1, 7, 32, 20, wall);
      p.rect(29, 7, 4, 20, shade);
      p.rect(1, 7, 32, 1, PAL.gold);
      for (const x of [4, 13, 22]) {
        p.rect(x, 10, 5, 5, PAL.windowDark).ellipse(x + 2.5, 10, 2.5, 2, PAL.windowDark).px(x + 1, 11, PAL.windowLight);
        p.rect(x, 19, 6, 8, '#6b4a35').ellipse(x + 3, 19, 3, 3, '#6b4a35');
      }
      p.rect(1, 16, 32, 1, shade);
    },
  };
}

/** White villa with a terracotta tiled roof. */
function villa(key: string, wall: string, roof: string, roofDark: string): SpriteDef {
  return {
    key,
    w: 30,
    h: 28,
    draw(p) {
      shadow(p, 30, 28);
      p.poly([[1, 13], [29, 13], [24, 2], [6, 2]], roof);
      for (let y = 5; y < 13; y += 3) p.hline(4, y, 22, roofDark);
      p.rect(1, 12, 28, 2, roofDark);
      p.rect(3, 14, 24, 11, wall);
      p.rect(23, 14, 4, 11, PAL.whiteShade);
      p.rect(6, 16, 5, 5, PAL.window).px(6, 16, PAL.windowLight).rect(6, 20, 5, 1, PAL.windowDark);
      p.rect(19, 16, 3, 5, PAL.window).px(19, 16, PAL.windowLight);
      p.rect(13, 17, 5, 8, PAL.door).ellipse(15.5, 17, 2.5, 2, PAL.door);
      p.px(4, 24, PAL.pink).px(9, 24, PAL.red).px(26, 24, PAL.pink);
    },
  };
}

/** Small mosque: dome and a slender minaret. */
const mosque: SpriteDef = {
  key: 'b-mosque',
  w: 34,
  h: 46,
  draw(p) {
    shadow(p, 34, 46);
    // minaret
    p.rect(26, 6, 5, 37, PAL.cream).rect(29, 6, 2, 37, PAL.creamShade);
    p.rect(25, 18, 7, 2, PAL.creamShade).rect(25, 30, 7, 2, PAL.creamShade);
    p.poly([[26, 6], [31, 6], [28.5, 1]], '#7fb07a');
    p.vline(28, 0, 2, PAL.gold);
    p.px(27, 10, PAL.windowDark).px(27, 23, PAL.windowDark);
    // prayer hall + dome
    p.rect(2, 24, 26, 19, PAL.cream).rect(23, 24, 5, 19, PAL.creamShade);
    p.ellipse(13, 24, 9, 8, '#7fb07a');
    p.ellipse(11, 21, 4, 3, '#a6d39e');
    p.vline(13, 13, 3, PAL.gold).px(13, 12, PAL.gold);
    p.rect(2, 24, 26, 1, PAL.creamShade);
    for (const x of [5, 12, 19]) p.rect(x, 29, 4, 7, PAL.windowDark).ellipse(x + 2, 29, 2, 2, PAL.windowDark);
    p.rect(11, 37, 6, 6, PAL.door).ellipse(14, 37, 3, 2, PAL.door);
  },
};

/** Row of two little shops with striped awnings. */
function shops(key: string, a: string, b: string, wall: string): SpriteDef {
  return {
    key,
    w: 32,
    h: 26,
    draw(p) {
      shadow(p, 32, 26);
      p.rect(1, 1, 30, 5, PAL.roof).rect(1, 5, 30, 1, PAL.roofDark);
      p.rect(1, 6, 30, 17, wall);
      p.rect(27, 6, 4, 17, PAL.creamShade);
      p.rect(3, 8, 11, 3, PAL.white).rect(18, 8, 11, 3, PAL.white);
      p.rect(4, 9, 9, 1, a).rect(19, 9, 9, 1, b);
      for (const [x, c] of [[2, a], [17, b]] as Array<[number, string]>) {
        for (let i = 0; i < 7; i++) p.rect(x + i * 2, 12, 2, 4, i % 2 ? PAL.white : c);
        p.rect(x, 16, 14, 1, PAL.ink);
        p.rect(x + 1, 17, 12, 6, PAL.windowDark).rect(x + 2, 18, 4, 4, PAL.window);
        p.rect(x + 8, 18, 4, 5, PAL.door);
      }
    },
  };
}

/** Modern glass tower. */
function tower(key: string, floors: number): SpriteDef {
  const h = 10 + floors * 4;
  return {
    key,
    w: 22,
    h,
    draw(p) {
      shadow(p, 22, h);
      p.rect(1, 1, 20, 5, PAL.grayLight).rect(1, 5, 20, 1, PAL.gray);
      p.rect(4, 2, 4, 2, PAL.gray);
      p.rect(1, 6, 20, h - 9, PAL.glass);
      p.rect(16, 6, 5, h - 9, PAL.glassDark);
      for (let y = 8; y < h - 3; y += 4) p.hline(1, y, 15, '#b9e6f2');
      for (let x = 5; x < 16; x += 5) p.vline(x, 6, h - 9, '#74b8d2');
      p.line(2, h - 6, 10, 9, PAL.glassLight);
      p.rect(7, h - 7, 6, 4, PAL.windowDark);
    },
  };
}

/** Sahel white chalet with a dome. */
function chalet(key: string, door: string): SpriteDef {
  return {
    key,
    w: 22,
    h: 24,
    draw(p) {
      shadow(p, 22, 24);
      p.rect(2, 9, 18, 12, PAL.white).rect(16, 9, 4, 12, PAL.whiteShade);
      p.ellipse(10, 9, 7, 6, PAL.white).ellipse(12, 7, 3, 2.5, PAL.whiteShade);
      p.rect(5, 13, 4, 8, door).ellipse(7, 13, 2, 1.5, door);
      p.rect(12, 12, 3, 3, PAL.teal);
      p.rect(1, 20, 20, 1, PAL.whiteShade);
    },
  };
}

const kiosk: SpriteDef = {
  key: 'b-kiosk',
  w: 16,
  h: 18,
  draw(p) {
    shadow(p, 16, 18);
    for (let i = 0; i < 7; i++) p.rect(1 + i * 2, 2, 2, 4, i % 2 ? PAL.white : PAL.blue);
    p.rect(2, 6, 12, 9, PAL.cream).rect(11, 6, 3, 9, PAL.creamShade);
    p.rect(3, 7, 7, 4, PAL.windowDark);
    p.px(4, 8, PAL.red).px(6, 8, PAL.yellow).px(8, 9, PAL.green);
    p.rect(2, 11, 12, 1, PAL.trunk);
  },
};

export const BUILDINGS = {
  apartments: [
    apartment('b-apt-peach', PAL.peach, PAL.peachShade, 3, 1),
    apartment('b-apt-cream', PAL.cream, PAL.creamShade, 4, 2),
    apartment('b-apt-terra', '#e8a07a', '#cf825c', 3, 3),
    apartment('b-apt-sand', '#ecd2a2', '#d4b27a', 5, 4),
    apartment('b-apt-pink', '#f2c0b4', '#dc9e90', 2, 5),
  ],
  arcades: [arcade('b-arcade-cream', PAL.cream, PAL.creamShade), arcade('b-arcade-peach', '#f7d9b8', '#e2bb93')],
  villas: [
    villa('b-villa-white', PAL.white, PAL.terracotta, PAL.terraDark),
    villa('b-villa-cream', PAL.cream, '#c8644a', '#a14c35'),
    villa('b-villa-peach', '#fbe3cc', PAL.terracotta, PAL.terraDark),
  ],
  mosque,
  shops: [shops('b-shops-1', PAL.red, PAL.green, PAL.cream), shops('b-shops-2', PAL.blue, PAL.gold, '#f7e0c4')],
  towers: [tower('b-tower-6', 6), tower('b-tower-9', 9)],
  chalets: [chalet('b-chalet-blue', PAL.blue), chalet('b-chalet-teal', PAL.teal)],
  kiosk,
};

export const BUILDING_SPRITES: SpriteDef[] = [
  ...BUILDINGS.apartments,
  ...BUILDINGS.arcades,
  ...BUILDINGS.villas,
  BUILDINGS.mosque,
  ...BUILDINGS.shops,
  ...BUILDINGS.towers,
  ...BUILDINGS.chalets,
  BUILDINGS.kiosk,
];
