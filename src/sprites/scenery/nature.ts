import { PAL, type Pix, type SpriteDef } from '../painter';

const shadow = (p: Pix, cx: number, cy: number, rx: number) => p.ellipse(cx, cy, rx, 2, PAL.shadow);

function roundTree(key: string, leaf: string, dark: string, light: string, size: number): SpriteDef {
  const w = size + 4;
  const h = size + 8;
  return {
    key,
    w,
    h,
    draw(p) {
      const cx = w / 2;
      shadow(p, cx, h - 2, size / 2.4);
      p.rect(cx - 1.5, h - 9, 3, 7, PAL.trunk).rect(cx + 0.5, h - 9, 1, 7, PAL.trunkDark);
      p.ellipse(cx, size / 2 + 1, size / 2, size / 2.2, dark);
      p.ellipse(cx - 1, size / 2, size / 2.3, size / 2.6, leaf);
      p.ellipse(cx - size / 6, size / 3, size / 5, size / 6, light);
      p.px(cx + size / 4, size / 2 + 2, dark).px(cx - size / 4, size / 1.6, dark);
    },
  };
}

/** Palm tree drawn upright; the game sways it gently (origin at the trunk base). */
function palmTree(key: string, h: number): SpriteDef {
  return {
    key,
    w: 20,
    h,
    draw(p) {
      shadow(p, 10, h - 2, 5);
      for (let i = 0; i < h - 10; i++) {
        const x = 9 + Math.round(Math.sin(i / 6) * 1.2);
        p.rect(x, h - 3 - i, 2, 1, i % 3 === 0 ? PAL.trunkDark : PAL.trunk);
      }
      const tx = 10;
      const ty = 7;
      const f = PAL.leaf;
      const d = PAL.leafDark;
      p.line(tx, ty, 1, ty + 5, d).line(tx, ty, 19, ty + 5, d);
      p.line(tx, ty - 1, 2, ty - 3, f).line(tx, ty - 1, 18, ty - 3, f);
      p.line(tx, ty, 4, ty + 8, f).line(tx, ty, 16, ty + 8, f);
      p.line(tx, ty - 1, tx - 2, ty - 6, f).line(tx, ty - 1, tx + 3, ty - 6, d);
      p.rect(tx - 2, ty - 1, 4, 3, PAL.leafLight);
      p.px(tx - 1, ty + 2, '#c98a22').px(tx + 1, ty + 2, '#c98a22');
    },
  };
}

const bush: SpriteDef = {
  key: 'n-bush',
  w: 12,
  h: 9,
  draw(p) {
    shadow(p, 6, 7, 5);
    p.ellipse(6, 5, 5.5, 3.5, PAL.leafDark).ellipse(5, 4, 4, 2.5, PAL.leaf).px(4, 3, PAL.leafLight);
  },
};

function flowers(key: string, c1: string, c2: string): SpriteDef {
  return {
    key,
    w: 12,
    h: 7,
    outline: false,
    draw(p) {
      p.ellipse(6, 4, 6, 3, PAL.grassDark);
      for (const [x, y, c] of [[2, 3, c1], [5, 2, c2], [8, 3, c1], [4, 5, c2], [9, 5, c1]] as Array<[number, number, string]>) p.px(x, y, c);
    },
  };
}

const grassTuft: SpriteDef = {
  key: 'n-tuft',
  w: 7,
  h: 5,
  outline: false,
  draw(p) {
    p.px(1, 2, PAL.grassDark).px(1, 3, PAL.grassDark).px(3, 1, PAL.grassDark).px(3, 2, PAL.grass).px(3, 3, PAL.grassDark).px(5, 2, PAL.grassDark).px(5, 3, PAL.grassDark);
  },
};

const rock: SpriteDef = {
  key: 'n-rock',
  w: 10,
  h: 7,
  draw(p) {
    p.ellipse(5, 4, 4.5, 2.8, '#b49a74').ellipse(4, 3, 3, 1.8, '#cdb48b');
  },
};

const dune: SpriteDef = {
  key: 'n-dune',
  w: 34,
  h: 10,
  outline: false,
  draw(p) {
    p.ellipse(17, 7, 17, 4, '#dcbf86');
    p.ellipse(14, 6, 12, 3, '#e9d2a0');
    p.hline(6, 5, 10, '#f4e3bd');
  },
};

const shrub: SpriteDef = {
  key: 'n-shrub',
  w: 9,
  h: 7,
  draw(p) {
    p.line(4, 6, 1, 1, '#9a8152').line(4, 6, 7, 2, '#9a8152').line(4, 6, 4, 0, '#9a8152');
    p.px(1, 1, PAL.grassDark).px(7, 2, PAL.grassDark).px(4, 0, PAL.grassDark);
  },
};

const camel: SpriteDef = {
  key: 'n-camel',
  w: 22,
  h: 18,
  draw(p) {
    p.ellipse(11, 16, 8, 1.6, PAL.shadow);
    const c = '#c9955a';
    const d = '#a8763f';
    p.ellipse(10, 9, 6, 3.5, c);
    p.ellipse(9, 6, 3, 2.5, c);
    p.rect(15, 5, 2, 6, c);
    p.rect(15, 3, 5, 3, c).px(19, 4, PAL.ink);
    for (const x of [5, 8, 12, 14]) p.rect(x, 11, 1, 5, d);
    p.rect(7, 8, 5, 2, PAL.red).rect(8, 7, 3, 1, PAL.gold);
  },
};

const cloud: SpriteDef = {
  key: 'n-cloud',
  w: 44,
  h: 16,
  outline: false,
  draw(p) {
    p.ellipse(22, 10, 20, 6, 'rgba(255,255,255,0.85)');
    p.ellipse(15, 7, 9, 6, 'rgba(255,255,255,0.9)');
    p.ellipse(27, 6, 10, 6, 'rgba(255,255,255,0.95)');
    p.ellipse(25, 4, 5, 3, '#ffffff');
  },
};

export const NATURE = {
  trees: [
    roundTree('n-tree-a', PAL.leaf, PAL.leafDark, PAL.leafLight, 16),
    roundTree('n-tree-b', '#6cbc5a', '#468a45', '#a2df78', 20),
    roundTree('n-tree-c', '#7cb84f', '#557f37', '#b5dd78', 14),
  ],
  bigTree: roundTree('n-tree-big', PAL.leaf, PAL.leafDark, PAL.leafLight, 26),
  palms: [palmTree('n-palm-a', 32), palmTree('n-palm-b', 26)],
  bush,
  flowers: [flowers('n-flowers-a', PAL.red, PAL.yellow), flowers('n-flowers-b', PAL.pink, PAL.white)],
  grassTuft,
  rock,
  dune,
  shrub,
  camel,
  cloud,
};

export const NATURE_SPRITES: SpriteDef[] = [
  ...NATURE.trees,
  NATURE.bigTree,
  ...NATURE.palms,
  bush,
  ...NATURE.flowers,
  grassTuft,
  rock,
  dune,
  shrub,
  camel,
  cloud,
];
