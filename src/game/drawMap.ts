import Phaser from 'phaser';
import type { Place } from '../content';
import type { RoadGraph } from '../lib/roads';
import { DISTRICTS, ISLAND, NILE, SAHEL, WORLD_H, WORLD_W, nileAt, wx, wy } from './world';

/**
 * Phase 1 "plain colored map": flat shapes only. The full pixel-art pass
 * (Phase 4) replaces this with tiles and sprites.
 */
const C = {
  sand: 0xe8d3a3,
  desert: 0xdcbf86,
  dune: 0xcfae70,
  sea: 0x3fc1c9,
  seaDeep: 0x2a9fb0,
  beach: 0xf6ecd2,
  cloud: 0xffffff,
  nile: 0x3aa7b8,
  nileBank: 0x2b6f7c,
  island: 0x9ccf7e,
  islandEdge: 0x4f8a45,
  roadEdge: 0x6b5440,
  road: 0xb8aa94,
  highway: 0xc9a46a,
  bridge: 0x9b8063,
  outline: 0x3b2a1e,
};

export function drawMap(scene: Phaser.Scene, places: Place[], graph: RoadGraph) {
  const g = scene.add.graphics();

  // Ground
  g.fillStyle(C.sand).fillRect(0, 0, WORLD_W, WORLD_H);

  // Desert edges (west and east) with a few dune strokes
  g.fillStyle(C.desert).fillRect(0, wy(0.2), wx(0.05), WORLD_H);
  g.fillStyle(C.desert).fillRect(wx(0.955), wy(0.2), wx(0.045), WORLD_H);
  g.fillStyle(C.desert).fillRect(0, wy(SAHEL.sandBottom), WORLD_W, wy(0.215 - SAHEL.sandBottom));
  g.lineStyle(4, C.dune, 1);
  for (let i = 0; i < 40; i++) {
    const x = (i * 337) % WORLD_W;
    const y = wy(0.14) + ((i * 211) % wy(0.07));
    g.beginPath().arc(x, y, 40, Math.PI * 1.15, Math.PI * 1.85).strokePath();
  }

  // Sahel: sea + white sand beach
  g.fillStyle(C.seaDeep).fillRect(0, 0, WORLD_W, wy(SAHEL.seaBottom) * 0.5);
  g.fillStyle(C.sea).fillRect(0, wy(SAHEL.seaBottom) * 0.5, WORLD_W, wy(SAHEL.seaBottom) * 0.5);
  g.fillStyle(C.beach).fillRect(0, wy(SAHEL.seaBottom), WORLD_W, wy(SAHEL.sandBottom - SAHEL.seaBottom));
  g.lineStyle(4, 0xffffff, 0.8);
  for (let x = 0; x < WORLD_W; x += 96) {
    g.beginPath().arc(x + 48, wy(SAHEL.seaBottom), 48, Math.PI, 0).strokePath();
  }

  // "Far away" cloud band separating Sahel from Cairo
  g.lineStyle(4, C.outline, 0.5);
  for (const yN of [SAHEL.cloudTop, SAHEL.cloudBottom]) {
    for (let x = 0; x < WORLD_W; x += 48) g.lineBetween(x, wy(yN), x + 24, wy(yN));
  }
  g.fillStyle(C.cloud, 0.75);
  for (let i = 0; i < 14; i++) {
    const cx = 80 + i * 175 + ((i * 53) % 60);
    const cy = wy((SAHEL.cloudTop + SAHEL.cloudBottom) / 2) + ((i % 3) - 1) * 30;
    g.fillEllipse(cx, cy, 150, 60).fillEllipse(cx - 45, cy + 12, 90, 44).fillEllipse(cx + 50, cy + 10, 100, 46);
  }

  // Districts (soft tinted zones)
  for (const d of DISTRICTS) {
    g.fillStyle(d.color, 0.75).fillEllipse(wx(d.x), wy(d.y), wx(d.rx) * 2, wy(d.ry) * 2);
  }

  // Nile: stamp circles along the centerline (bank first, then water)
  const nileTop = NILE[0][1];
  for (const [color, extra] of [
    [C.nileBank, 8],
    [C.nile, 0],
  ] as const) {
    g.fillStyle(color);
    for (let y = wy(nileTop); y <= WORLD_H + 40; y += 6) {
      const { cx, half } = nileAt(y / WORLD_H);
      g.fillCircle(wx(cx), y, wx(half) + extra);
    }
  }
  // Zamalek island
  g.fillStyle(C.islandEdge).fillEllipse(wx(ISLAND.x), wy(ISLAND.y), wx(ISLAND.rx) * 2 + 12, wy(ISLAND.ry) * 2 + 12);
  g.fillStyle(C.island).fillEllipse(wx(ISLAND.x), wy(ISLAND.y), wx(ISLAND.rx) * 2, wy(ISLAND.ry) * 2);

  // Roads: outline pass then fill pass so joints look clean
  const widthFor = (k: string) => (k === 'highway' ? 30 : k === 'spur' ? 18 : 24);
  const fillFor = (k: string) => (k === 'highway' ? C.highway : k === 'bridge' ? C.bridge : C.road);
  for (const pass of ['edge', 'fill'] as const) {
    for (const e of graph.edges) {
      const a = graph.nodes.get(e.a)!;
      const b = graph.nodes.get(e.b)!;
      const w = widthFor(e.kind) + (pass === 'edge' ? 8 : 0);
      const color = pass === 'edge' ? C.roadEdge : fillFor(e.kind);
      g.lineStyle(w, color, 1).lineBetween(a.x, a.y, b.x, b.y);
      g.fillStyle(color).fillCircle(a.x, a.y, w / 2).fillCircle(b.x, b.y, w / 2);
    }
  }
  // Highway centre dashes
  g.lineStyle(3, 0xfff2c8, 0.9);
  for (const e of graph.edges.filter((e) => e.kind === 'highway')) {
    const a = graph.nodes.get(e.a)!;
    const b = graph.nodes.get(e.b)!;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    for (let s = 0; s < len; s += 40) {
      const t0 = s / len;
      const t1 = Math.min(1, (s + 18) / len);
      g.lineBetween(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0, a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1);
    }
  }

  // Place dots (the DOM overlay draws the tappable label above each one)
  for (const p of places) {
    const x = wx(p.position.x);
    const y = wy(p.position.y);
    g.fillStyle(0xffffff, 0.35).fillCircle(x, y, 50);
    g.lineStyle(4, C.outline, 0.6).strokeCircle(x, y, 50);
    g.fillStyle(C.outline).fillCircle(x, y, 16);
    g.fillStyle(0xf2b544).fillCircle(x, y, 11);
  }

  return g;
}
