import { PAL, type Pix, type SpriteDef } from '../painter';

/**
 * Buildings that give each district its own character:
 * French-style Heliopolis/Korba, high-end Tagamo3/Zayed, Maadi bakeries,
 * dense Nasr City blocks, the BRS school, Giza's museum, churches, and a Zamalek palace.
 */

const shadow = (p: Pix, w: number, h: number) => p.ellipse(w / 2, h - 2, w / 2, 2.5, PAL.shadow);
const SLATE = '#7d8aa3';
const SLATE_DARK = '#5f6b84';
const SLATE_LIGHT = '#a3afc4';
const IRON = '#2f2a2e';

/** Antique French (Haussmann/Baron-era) building: slate mansard roof with dormers, iron balconies, ornate cornice. */
function french(key: string, stone: string, stoneShade: string, floors: number, shopAwning: string | null): SpriteDef {
  const w = 30;
  const h = 18 + floors * 9;
  return {
    key,
    w,
    h,
    draw(p) {
      shadow(p, w, h);
      // mansard roof with dormer windows and chimneys
      p.poly([[1, 12], [29, 12], [26, 3], [4, 3]], SLATE);
      p.rect(4, 3, 22, 1, SLATE_LIGHT);
      for (const x of [7, 14, 21]) {
        p.rect(x, 5, 4, 5, PAL.white).rect(x + 1, 6, 2, 4, PAL.windowDark).px(x + 1, 6, PAL.windowLight);
        p.poly([[x - 1, 5], [x + 5, 5], [x + 2, 2]], SLATE_DARK);
      }
      p.rect(3, 0, 3, 3, '#b0552f').rect(24, 0, 3, 3, '#b0552f');
      p.rect(0, 11, 30, 2, PAL.creamShade);
      p.rect(0, 11, 30, 1, PAL.gold);
      // stone facade
      const top = 13;
      const bottom = h - 3;
      p.rect(1, top, 28, bottom - top, stone);
      p.rect(26, top, 3, bottom - top, stoneShade);
      for (let f = 0; f < floors; f++) {
        const y = top + 2 + f * 9;
        for (const x of [3, 10, 17, 23]) {
          if (x === 23 && f % 2) continue;
          p.rect(x, y, 4, 6, PAL.windowDark).ellipse(x + 2, y, 2, 1.5, PAL.windowDark);
          p.rect(x, y, 4, 2, PAL.window).px(x, y, PAL.windowLight);
          p.rect(x - 1, y - 2, 6, 1, stoneShade); // pediment
          // wrought-iron balcony
          p.rect(x - 1, y + 5, 6, 1, IRON).px(x - 1, y + 4, IRON).px(x + 1, y + 4, IRON).px(x + 3, y + 4, IRON).px(x + 4, y + 4, IRON);
        }
        p.rect(1, y + 7, 28, 1, stoneShade);
      }
      // ground floor: arched door + café/shop with an awning
      p.rect(3, bottom - 7, 5, 7, PAL.door).ellipse(5.5, bottom - 7, 2.5, 2, PAL.door).px(7, bottom - 4, PAL.gold);
      if (shopAwning) {
        for (let i = 0; i < 9; i++) p.rect(11 + i * 2, bottom - 9, 2, 3, i % 2 ? PAL.white : shopAwning);
        p.rect(12, bottom - 6, 15, 6, PAL.windowDark).rect(13, bottom - 5, 6, 4, PAL.window).rect(21, bottom - 5, 5, 5, '#94603f');
      } else {
        p.rect(12, bottom - 7, 5, 7, PAL.door).ellipse(14.5, bottom - 7, 2.5, 2, PAL.door);
        p.rect(20, bottom - 7, 5, 5, PAL.windowDark);
      }
    },
  };
}

/** Rounded corner building with a domed turret (Heliopolis Baron style). */
const frenchDome: SpriteDef = {
  key: 'b-french-dome',
  w: 34,
  h: 50,
  draw(p) {
    shadow(p, 34, 50);
    // dome turret
    p.ellipse(17, 10, 8, 7, SLATE);
    p.ellipse(15, 8, 3, 2.5, SLATE_LIGHT);
    p.vline(17, 0, 4, PAL.gold).px(17, 0, PAL.gold);
    p.rect(9, 12, 16, 3, PAL.creamShade).rect(9, 12, 16, 1, PAL.gold);
    // body
    p.rect(3, 15, 28, 32, '#f3e2c4');
    p.rect(27, 15, 4, 32, '#dcc7a0');
    p.ellipse(17, 15, 14, 2, '#f3e2c4');
    for (let f = 0; f < 3; f++) {
      const y = 18 + f * 9;
      for (const x of [6, 13, 20]) {
        p.rect(x, y, 4, 6, PAL.windowDark).ellipse(x + 2, y, 2, 1.5, PAL.windowDark).px(x, y, PAL.windowLight);
        p.rect(x - 1, y + 5, 6, 1, IRON).px(x, y + 4, IRON).px(x + 3, y + 4, IRON);
      }
      p.hline(3, y + 7, 28, '#dcc7a0');
    }
    for (const x of [6, 14, 22]) p.rect(x, 40, 6, 7, '#6b4a35').ellipse(x + 3, 40, 3, 2.5, '#6b4a35');
    p.rect(3, 38, 28, 1, PAL.gold);
  },
};

/** Luxury mall / lifestyle centre: glass and white stone, a glowing gold sign, string lights. */
const mall: SpriteDef = {
  key: 'b-mall',
  w: 44,
  h: 34,
  draw(p) {
    shadow(p, 44, 34);
    p.rect(1, 2, 42, 5, PAL.grayLight).rect(1, 6, 42, 1, PAL.gray);
    p.rect(1, 7, 42, 24, PAL.white);
    p.rect(39, 7, 4, 24, PAL.whiteShade);
    // glass storefronts
    for (const x of [3, 15, 27]) {
      p.rect(x, 16, 10, 13, PAL.glass).rect(x, 16, 10, 2, PAL.glassLight).vline(x + 5, 16, 13, '#74b8d2');
      p.px(x + 2, 20, PAL.pink).px(x + 7, 22, PAL.gold).px(x + 3, 24, PAL.lilac);
    }
    // glowing gold sign
    p.rect(12, 8, 20, 5, PAL.ink).rect(13, 9, 18, 3, PAL.gold);
    for (let x = 14; x < 30; x += 2) p.px(x, 10, PAL.yellow);
    // string lights scalloped across the front
    for (let i = 0; i < 21; i++) p.px(1 + i * 2, 14 + Math.round(Math.abs(Math.sin(i * 0.6)) * 1.5), i % 3 === 0 ? PAL.pink : PAL.yellow);
    // potted topiaries
    for (const x of [1, 41]) p.rect(x, 27, 3, 3, PAL.ink).circle(x + 1.5, 25, 2, PAL.leaf);
  },
};

/** High-end boutique: black and gold facade with big display windows. */
const boutique: SpriteDef = {
  key: 'b-boutique',
  w: 24,
  h: 28,
  draw(p) {
    shadow(p, 24, 28);
    p.rect(1, 2, 22, 4, PAL.grayLight).rect(1, 5, 22, 1, PAL.gray);
    p.rect(1, 6, 22, 19, '#2e2a33');
    p.rect(1, 6, 22, 1, PAL.gold).rect(1, 24, 22, 1, PAL.gold);
    p.rect(5, 8, 14, 3, PAL.gold).rect(6, 9, 12, 1, PAL.yellow);
    p.rect(3, 13, 8, 11, '#f7e6c4').rect(13, 13, 8, 11, '#f7e6c4');
    p.px(5, 16, PAL.pink).px(7, 18, PAL.lilac).px(16, 16, PAL.red).px(18, 19, PAL.gold);
    p.vline(7, 13, 11, PAL.gold).vline(17, 13, 11, PAL.gold);
    for (const x of [2, 21]) p.px(x, 12, PAL.yellow);
  },
};

/** Cute bakery with a croissant sign. */
function bakery(key: string, wall: string, awning: string): SpriteDef {
  return {
    key,
    w: 22,
    h: 26,
    draw(p) {
      shadow(p, 22, 26);
      p.poly([[1, 9], [21, 9], [18, 2], [4, 2]], PAL.terracotta);
      p.rect(1, 8, 20, 1, PAL.terraDark);
      p.rect(2, 9, 18, 14, wall);
      p.rect(17, 9, 3, 14, PAL.creamShade);
      // croissant sign
      p.rect(6, 10, 10, 4, PAL.cream).rect(6, 10, 10, 1, PAL.white);
      p.ellipse(11, 12, 3.5, 1.4, '#d9963f').px(8, 12, '#b8742a').px(14, 12, '#b8742a').px(11, 11, '#f0c070');
      // striped awning
      for (let i = 0; i < 10; i++) p.rect(1 + i * 2, 14, 2, 3, i % 2 ? PAL.white : awning);
      // window with cakes + door
      p.rect(3, 17, 8, 6, PAL.windowLight).rect(3, 21, 8, 2, PAL.creamShade);
      p.px(4, 20, PAL.pink).px(6, 20, '#d9963f').px(8, 20, PAL.white).px(9, 19, PAL.red);
      p.rect(13, 17, 5, 6, PAL.door).px(16, 20, PAL.gold);
      p.rect(0, 22, 2, 2, PAL.leaf).rect(20, 22, 2, 2, PAL.leaf);
    },
  };
}

/** Plain, crowded concrete block (unpainted, red brick showing, rebar on the roof). */
function block(key: string, concrete: string, shade: string, floors: number, seed: number): SpriteDef {
  const w = 24;
  const h = 12 + floors * 7;
  return {
    key,
    w,
    h,
    draw(p) {
      shadow(p, w, h);
      p.rect(1, 1, 22, 6, '#b3a898').rect(1, 6, 22, 1, '#978b7b');
      for (const x of [3, 8, 14, 19]) p.vline(x, 0, 2, '#6b5d52'); // rebar sticking up
      p.circle(17, 4, 1.8, PAL.white);
      if (seed % 2) p.rect(4, 3, 4, 3, '#8f8f8f');
      p.rect(1, 7, 22, h - 10, concrete);
      p.rect(20, 7, 3, h - 10, shade);
      // patches of bare red brick
      p.dither(3 + (seed % 3) * 4, 9 + (seed % 2) * 6, 6, 5, '#b8654a');
      for (let f = 0; f < floors; f++) {
        const y = 9 + f * 7;
        for (const x of [3, 9, 15]) {
          const r = (seed * 5 + f * 7 + x) % 7;
          p.rect(x, y, 4, 4, r === 0 ? '#8a7f74' : PAL.windowDark).rect(x, y, 4, 1, '#9fb8c0');
          if (r === 3) p.rect(x - 1, y + 4, 6, 1, '#6b5d52');
          if (r === 5) p.rect(x + 3, y + 1, 2, 2, PAL.whiteShade);
        }
      }
      p.rect(9, h - 8, 5, 5, '#5a4a3d');
    },
  };
}

/** BRS school: brick building with a clock, flag and big windows (with a little playground). */
const school: SpriteDef = {
  key: 'b-school',
  w: 52,
  h: 38,
  draw(p) {
    shadow(p, 52, 38);
    p.rect(2, 7, 48, 4, '#b85d45').rect(2, 10, 48, 1, '#8f4433');
    p.rect(3, 11, 46, 23, '#f2c66d');
    p.rect(45, 11, 4, 23, '#dcab52');
    // central gable with a clock
    p.poly([[18, 11], [34, 11], [26, 3]], '#b85d45');
    p.circle(26, 8, 3, PAL.white).px(26, 7, PAL.ink).px(27, 8, PAL.ink).px(26, 8, PAL.ink);
    // flag on a pole
    p.vline(48, 0, 8, PAL.grayDark).rect(44, 0, 4, 3, PAL.red).rect(44, 1, 4, 1, PAL.white);
    // windows
    for (let r = 0; r < 2; r++) for (const x of [6, 13, 32, 39]) p.rect(x, 14 + r * 8, 5, 5, PAL.window).px(x, 14 + r * 8, PAL.windowLight).hline(x, 16 + r * 8, 5, PAL.windowDark);
    // door with steps
    p.rect(22, 22, 8, 12, PAL.door).rect(23, 23, 6, 11, '#94603f').hline(21, 33, 10, PAL.grayLight);
    p.rect(20, 14, 12, 5, PAL.white).rect(21, 15, 10, 3, '#3d6aad');
    // little playground slide
    p.line(0, 36, 4, 30, PAL.red).line(1, 36, 5, 30, PAL.red).vline(5, 30, 6, PAL.grayDark);
  },
};

/** Coptic church: twin domes with crosses and a bell tower. */
const church: SpriteDef = {
  key: 'b-church',
  w: 30,
  h: 44,
  draw(p) {
    shadow(p, 30, 44);
    p.rect(3, 6, 6, 35, PAL.cream).rect(7, 6, 2, 35, PAL.creamShade);
    p.ellipse(6, 6, 3.5, 3, '#c9a46a');
    p.vline(6, 0, 3, PAL.gold).hline(5, 1, 3, PAL.gold);
    p.rect(4, 11, 3, 4, PAL.windowDark).ellipse(5.5, 11, 1.5, 1.2, PAL.windowDark);
    p.rect(9, 20, 19, 21, PAL.cream).rect(24, 20, 4, 21, PAL.creamShade);
    p.ellipse(18, 20, 7, 6, '#c9a46a').ellipse(16, 18, 3, 2, '#e3c48c');
    p.vline(18, 10, 4, PAL.gold).hline(17, 11, 3, PAL.gold);
    p.rect(12, 28, 3, 5, PAL.windowDark).rect(21, 28, 3, 5, PAL.windowDark);
    p.circle(18, 29, 2, '#e5566f').px(18, 29, PAL.yellow);
    p.rect(15, 34, 6, 7, PAL.door).ellipse(18, 34, 3, 2, PAL.door);
  },
};

/** The Grand Egyptian Museum: long stone base with a huge translucent triangular facade. */
const gem: SpriteDef = {
  key: 'b-gem',
  w: 72,
  h: 38,
  draw(p) {
    shadow(p, 72, 38);
    // sloping roof plane (seen from above)
    p.poly([[2, 14], [70, 6], [70, 12], [2, 18]], '#d8c39a');
    // the triangular alabaster facade
    p.poly([[2, 18], [70, 12], [70, 34], [2, 34]], '#efe3c9');
    for (let x = 4; x < 70; x += 6) {
      const top = 18 - ((x - 2) / 68) * 6;
      p.line(x, top, x + 3, 34, '#d6c4a0');
      p.line(x + 6, top - 0.5, x + 3, 34, '#d6c4a0');
    }
    // glass triangles catching the light
    for (const x of [14, 32, 50]) p.poly([[x, 33], [x + 6, 22], [x + 12, 33]], PAL.glass);
    p.poly([[38, 33], [41, 27], [44, 33]], PAL.glassLight);
    // entrance + statue silhouette (Ramesses)
    p.rect(30, 27, 12, 7, '#7a6a55');
    p.rect(35, 21, 3, 6, '#9a7a50').rect(34, 20, 5, 2, '#9a7a50');
    p.rect(0, 34, 72, 2, PAL.sandDark);
  },
};

/** A Zamalek palace hotel: ornate cream façade, arched loggia, green roof. */
const palace: SpriteDef = {
  key: 'b-palace',
  w: 34,
  h: 32,
  draw(p) {
    shadow(p, 34, 32);
    p.rect(2, 3, 30, 6, '#6fa27a').rect(2, 8, 30, 1, '#4f7d5a');
    p.ellipse(17, 3, 5, 3, '#6fa27a');
    p.rect(2, 9, 30, 20, '#f5e8cf');
    p.rect(28, 9, 4, 20, '#dfcba4');
    p.rect(2, 9, 30, 1, PAL.gold);
    for (const x of [5, 11, 17, 23]) {
      p.rect(x, 12, 4, 5, PAL.windowDark).ellipse(x + 2, 12, 2, 1.5, PAL.windowDark).px(x, 12, PAL.windowLight);
      p.rect(x, 21, 4, 8, '#8a6448').ellipse(x + 2, 21, 2, 2, '#8a6448');
    }
    p.rect(2, 19, 30, 1, '#dfcba4');
  },
};

export const DISTRICT_BUILDINGS = {
  french: [
    french('b-french-cream', '#f4e4c6', '#dfc9a2', 3, PAL.green),
    french('b-french-beige', '#ead5b0', '#d2b98d', 4, null),
    french('b-french-rose', '#f3d6c8', '#dcb6a5', 3, PAL.red),
  ],
  frenchDome,
  mall,
  boutique,
  bakeries: [bakery('b-bakery-pink', '#fbe0e6', PAL.pink), bakery('b-bakery-cream', PAL.cream, PAL.blue)],
  blocks: [
    block('b-block-a', '#cfc2ae', '#b5a791', 4, 1),
    block('b-block-b', '#d6c8a8', '#bcae8e', 5, 2),
    block('b-block-c', '#c4b8a6', '#aa9e8c', 3, 3),
    block('b-block-d', '#d9cbb2', '#c0b199', 6, 4),
  ],
  school,
  church,
  gem,
  palace,
};

export const DISTRICT_BUILDING_SPRITES: SpriteDef[] = [
  ...DISTRICT_BUILDINGS.french,
  frenchDome,
  mall,
  boutique,
  ...DISTRICT_BUILDINGS.bakeries,
  ...DISTRICT_BUILDINGS.blocks,
  school,
  church,
  gem,
  palace,
];
