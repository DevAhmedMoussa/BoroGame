import Phaser from 'phaser';
import type { Place } from '../content';
import type { RoadGraph } from '../lib/roads';
import { mulberry } from '../lib/random';
import { DISTRICTS, ISLAND, MAADI_LANES, NILE, PARKS, SAHEL, WORLD_H, WORLD_W, nileAt, wx, wy } from './world';

/**
 * The ground layer: sand, districts, parks, the Nile, the Sahel sea, roads,
 * bridges and the paved plazas at each place. Drawn once into a Graphics
 * object, then baked (at half resolution = one art pixel per 2 world px) into
 * the map texture, so it costs nothing per frame.
 */
const C = {
  sand: 0xe8d3a3,
  sandDark: 0xd9c08c,
  sandLight: 0xf1e1bb,
  desert: 0xdcbf86,
  desertDark: 0xc9a86c,
  seaDeep: 0x2a8fb0,
  sea: 0x37b3c4,
  seaShallow: 0x6fd6d6,
  foam: 0xf4fbf8,
  beach: 0xfbf1da,
  beachDark: 0xeedfbd,
  nile: 0x3aa7b8,
  nileLight: 0x5cc0cc,
  nileDark: 0x2d8a9b,
  bank: 0xbfa16f,
  grass: 0x9fcf72,
  grassDark: 0x7fb75a,
  grassLight: 0xbde08d,
  island: 0x9fcf72,
  sidewalk: 0xe9dcc0,
  curb: 0x9c8a6e,
  asphalt: 0x807873,
  asphaltDark: 0x6c6560,
  dash: 0xf6eed8,
  highway: 0x8a7f74,
  yellow: 0xf2c14e,
  deck: 0xa4876a,
  deckDark: 0x7d6349,
  rail: 0x5a4636,
  plaza: 0xf3e6c8,
  plazaDark: 0xe0cfa8,
  plazaRing: 0xc9b48a,
  cloud: 0xffffff,
  outline: 0x3b2a1e,
};

export function drawGround(scene: Phaser.Scene, places: Place[], graph: RoadGraph) {
  const g = scene.add.graphics();
  const rand = mulberry(42);

  // --- base sand with speckles
  g.fillStyle(C.sand).fillRect(0, 0, WORLD_W, WORLD_H);
  for (let i = 0; i < 9000; i++) {
    const x = Math.floor(rand() * WORLD_W / 2) * 2;
    const y = Math.floor(rand() * WORLD_H / 2) * 2;
    g.fillStyle(rand() < 0.6 ? C.sandDark : C.sandLight, 0.8).fillRect(x, y, 2, 2);
  }

  // --- desert edges and the band between Sahel and Cairo
  g.fillStyle(C.desert).fillRect(0, wy(SAHEL.sandBottom), WORLD_W, wy(0.215 - SAHEL.sandBottom));
  g.fillStyle(C.desert).fillRect(0, wy(0.2), wx(0.05), WORLD_H);
  g.fillStyle(C.desert).fillRect(wx(0.955), wy(0.2), wx(0.045), WORLD_H);
  for (let i = 0; i < 2500; i++) {
    const inBand = rand() < 0.5;
    const x = inBand ? rand() * WORLD_W : rand() < 0.5 ? rand() * wx(0.05) : wx(0.955) + rand() * wx(0.045);
    const y = inBand ? wy(SAHEL.sandBottom) + rand() * wy(0.08) : wy(0.2) + rand() * wy(0.8);
    g.fillStyle(C.desertDark, 0.7).fillRect(Math.floor(x / 2) * 2, Math.floor(y / 2) * 2, 2, 2);
  }

  // --- Sahel: layered sea, foam line, white sand
  const seaB = wy(SAHEL.seaBottom);
  g.fillStyle(C.seaDeep).fillRect(0, 0, WORLD_W, seaB * 0.45);
  g.fillStyle(C.sea).fillRect(0, seaB * 0.45, WORLD_W, seaB * 0.35);
  g.fillStyle(C.seaShallow).fillRect(0, seaB * 0.8, WORLD_W, seaB * 0.2);
  g.fillStyle(C.beach).fillRect(0, seaB, WORLD_W, wy(SAHEL.sandBottom) - seaB);
  g.fillStyle(C.beachDark).fillRect(0, seaB, WORLD_W, 10);
  // wavy shoreline foam
  g.fillStyle(C.foam);
  for (let x = 0; x < WORLD_W; x += 4) {
    const y = seaB - 6 + Math.round(Math.sin(x / 37) * 3 + Math.sin(x / 13) * 1.5) * 2;
    g.fillRect(x, y, 4, 6);
  }
  for (let i = 0; i < 700; i++) {
    g.fillStyle(C.beachDark, 0.8).fillRect(Math.floor(rand() * WORLD_W / 2) * 2, seaB + 12 + Math.floor((rand() * (wy(SAHEL.sandBottom) - seaB - 12)) / 2) * 2, 2, 2);
  }

  // --- "far away" cloud band separating Sahel from Cairo
  g.fillStyle(C.outline, 0.35);
  for (const yN of [SAHEL.cloudTop, SAHEL.cloudBottom]) for (let x = 0; x < WORLD_W; x += 32) g.fillRect(x, wy(yN), 16, 4);

  // --- districts: soft tinted zones
  for (const d of DISTRICTS) g.fillStyle(d.color, 0.55).fillEllipse(wx(d.x), wy(d.y), wx(d.rx) * 2, wy(d.ry) * 2);

  // --- parks
  for (const pk of PARKS) {
    g.fillStyle(C.grassDark).fillEllipse(wx(pk.x), wy(pk.y), wx(pk.rx) * 2 + 8, wy(pk.ry) * 2 + 8);
    g.fillStyle(C.grass).fillEllipse(wx(pk.x), wy(pk.y), wx(pk.rx) * 2, wy(pk.ry) * 2);
    for (let i = 0; i < 160; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 0.9;
      g.fillStyle(rand() < 0.5 ? C.grassDark : C.grassLight).fillRect(
        Math.floor((wx(pk.x) + Math.cos(a) * r * wx(pk.rx)) / 2) * 2,
        Math.floor((wy(pk.y) + Math.sin(a) * r * wy(pk.ry)) / 2) * 2,
        2,
        2,
      );
    }
  }

  // --- the Nile: sandy bank, water, a lighter channel down the middle
  const nileTop = wy(NILE[0][1]);
  const stamp = (color: number, extra: number, scale = 1) => {
    g.fillStyle(color);
    for (let y = nileTop; y <= WORLD_H + 40; y += 4) {
      const { cx, half } = nileAt(y / WORLD_H);
      g.fillCircle(wx(cx), y, wx(half) * scale + extra);
    }
  };
  stamp(C.bank, 12);
  stamp(C.nileDark, 2);
  stamp(C.nile, 0);
  stamp(C.nileLight, 0, 0.35);
  // Zamalek island with a sandy shore
  g.fillStyle(C.bank).fillEllipse(wx(ISLAND.x), wy(ISLAND.y), wx(ISLAND.rx) * 2 + 14, wy(ISLAND.ry) * 2 + 14);
  g.fillStyle(C.island).fillEllipse(wx(ISLAND.x), wy(ISLAND.y), wx(ISLAND.rx) * 2, wy(ISLAND.ry) * 2);
  for (let i = 0; i < 200; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * 0.92;
    g.fillStyle(rand() < 0.5 ? C.grassDark : C.grassLight).fillRect(
      Math.floor((wx(ISLAND.x) + Math.cos(a) * r * wx(ISLAND.rx)) / 2) * 2,
      Math.floor((wy(ISLAND.y) + Math.sin(a) * r * wy(ISLAND.ry)) / 2) * 2,
      2,
      2,
    );
  }

  // --- roads: curb → sidewalk → asphalt → dashes; bridges get a wooden deck with rails
  const seg = (e: (typeof graph.edges)[number]) => [graph.nodes.get(e.a)!, graph.nodes.get(e.b)!] as const;
  const stroke = (w: number, color: number, kinds: string[]) => {
    for (const e of graph.edges) {
      if (!kinds.includes(e.kind)) continue;
      const [a, b] = seg(e);
      g.lineStyle(w, color, 1).lineBetween(a.x, a.y, b.x, b.y);
      g.fillStyle(color).fillCircle(a.x, a.y, w / 2).fillCircle(b.x, b.y, w / 2);
    }
  };
  // bridge shadows on the water first
  for (const e of graph.edges.filter((e) => e.kind === 'bridge')) {
    const [a, b] = seg(e);
    g.lineStyle(30, C.nileDark, 0.8).lineBetween(a.x, a.y + 10, b.x, b.y + 10);
  }
  stroke(38, C.curb, ['highway']);
  stroke(34, C.desertDark, ['highway']);
  stroke(26, C.highway, ['highway']);
  stroke(34, C.curb, ['road', 'spur']);
  stroke(30, C.sidewalk, ['road', 'spur']);
  stroke(20, C.asphalt, ['road', 'spur']);
  stroke(34, C.rail, ['bridge']);
  stroke(30, C.deck, ['bridge']);
  // dashes and rails
  for (const e of graph.edges) {
    const [a, b] = seg(e);
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / len;
    const uy = (b.y - a.y) / len;
    const nx = -uy;
    const ny = ux;
    if (e.kind === 'bridge') {
      for (const side of [-1, 1]) {
        g.lineStyle(3, C.rail).lineBetween(a.x + nx * 13 * side, a.y + ny * 13 * side, b.x + nx * 13 * side, b.y + ny * 13 * side);
        for (let s = 0; s < len; s += 14) {
          g.fillStyle(C.rail).fillRect(a.x + ux * s + nx * 13 * side - 2, a.y + uy * s + ny * 13 * side - 4, 4, 6);
        }
      }
      for (let s = 6; s < len; s += 10) g.lineStyle(2, C.deckDark).lineBetween(a.x + ux * s - nx * 10, a.y + uy * s - ny * 10, a.x + ux * s + nx * 10, a.y + uy * s + ny * 10);
      continue;
    }
    const dashColor = e.kind === 'highway' ? C.yellow : C.dash;
    const dashLen = e.kind === 'highway' ? 20 : 12;
    if (e.kind === 'spur') continue;
    for (let s = 10; s < len - 10; s += dashLen * 2) {
      const t = Math.min(len, s + dashLen);
      g.lineStyle(3, dashColor).lineBetween(a.x + ux * s, a.y + uy * s, a.x + ux * t, a.y + uy * t);
    }
    if (e.kind === 'highway') {
      for (const side of [-1, 1]) {
        g.lineStyle(2, C.dash, 0.8).lineBetween(a.x + nx * 11 * side, a.y + ny * 11 * side, b.x + nx * 11 * side, b.y + ny * 11 * side);
      }
    }
  }

  // --- Maadi's narrow cobbled streets
  for (const [w, color] of [[18, C.curb], [14, 0xcfc1a4], [10, 0xb9ad98]] as Array<[number, number]>) {
    for (const [x1, y1, x2, y2] of MAADI_LANES) g.lineStyle(w, color).lineBetween(wx(x1), wy(y1), wx(x2), wy(y2));
  }
  for (const [x1, y1, x2, y2] of MAADI_LANES) {
    const len = Math.hypot(wx(x2) - wx(x1), wy(y2) - wy(y1));
    for (let d = 0; d < len; d += 6) {
      const t = d / len;
      const px = wx(x1) + (wx(x2) - wx(x1)) * t + (y1 === y2 ? 0 : -2);
      const py = wy(y1) + (wy(y2) - wy(y1)) * t + (y1 === y2 ? -2 : 0);
      g.fillStyle(0xa79b86).fillRect(Math.floor(px / 2) * 2, Math.floor(py / 2) * 2, 2, 2);
    }
  }

  // --- paved plazas at each place
  for (const p of places) {
    const x = wx(p.position.x);
    const y = wy(p.position.y);
    g.fillStyle(C.plazaRing).fillEllipse(x, y + 6, 132, 76);
    g.fillStyle(C.plaza).fillEllipse(x, y + 6, 124, 70);
    for (let i = -56; i <= 56; i += 8) {
      for (let j = -30; j <= 34; j += 8) {
        if ((i / 62) ** 2 + ((j - 6) / 35) ** 2 > 0.85) continue;
        if (((i + j) / 8) % 2 === 0) g.fillStyle(C.plazaDark).fillRect(x + i, y + j, 8, 8);
      }
    }
  }

  return g;
}
