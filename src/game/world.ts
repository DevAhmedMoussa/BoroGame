/**
 * World geometry: size, Nile, Zamalek island, districts and the road graph.
 * Everything is in normalized coordinates (0..1, top-left = 0,0) and converted
 * to world pixels with `wx` / `wy`. Places themselves come from places.json.
 */

export const WORLD_W = 2400;
export const WORLD_H = 3600;
export const TILE = 16;

export const wx = (nx: number) => nx * WORLD_W;
export const wy = (ny: number) => ny * WORLD_H;

/** Where the Cairo part of the map begins (below the Sahel / desert band). */
export const CAIRO_TOP = 0.215;
export const SAHEL = { seaBottom: 0.035, sandBottom: 0.135, cloudTop: 0.15, cloudBottom: 0.2 };

/** Nile centerline: x, y and total width (all normalized; width as a fraction of WORLD_W). */
export const NILE: Array<[number, number, number]> = [
  [0.5, 0.195, 0.045],
  [0.49, 0.27, 0.045],
  [0.475, 0.36, 0.047],
  [0.465, 0.43, 0.075],
  [0.46, 0.5, 0.13],
  [0.46, 0.57, 0.075],
  [0.462, 0.64, 0.047],
  [0.458, 0.74, 0.045],
  [0.452, 0.84, 0.045],
  [0.447, 0.93, 0.045],
  [0.44, 1.02, 0.045],
];

/** Zamalek island (ellipse), sits in the wide part of the Nile. */
export const ISLAND = { x: 0.46, y: 0.5, rx: 0.036, ry: 0.066 };

export interface District {
  name: string;
  x: number;
  y: number;
  rx: number;
  ry: number;
  color: number;
}

export const DISTRICTS: District[] = [
  { name: 'Heliopolis', x: 0.75, y: 0.35, rx: 0.17, ry: 0.07, color: 0xf2c4b8 },
  { name: 'Nasr City', x: 0.73, y: 0.55, rx: 0.15, ry: 0.07, color: 0xd9c6ea },
  { name: 'New Cairo', x: 0.86, y: 0.77, rx: 0.14, ry: 0.08, color: 0xbfdcec },
  { name: 'Maadi', x: 0.6, y: 0.86, rx: 0.12, ry: 0.07, color: 0xbfe0a8 },
  { name: 'Sheikh Zayed', x: 0.11, y: 0.47, rx: 0.12, ry: 0.07, color: 0xf6d6a8 },
  { name: 'Giza', x: 0.22, y: 0.68, rx: 0.14, ry: 0.08, color: 0xf0d58f },
  { name: 'Downtown', x: 0.6, y: 0.47, rx: 0.08, ry: 0.06, color: 0xf3dcc0 },
  { name: 'Mohandessin', x: 0.33, y: 0.5, rx: 0.08, ry: 0.07, color: 0xe9d9b4 },
  { name: 'BRS', x: 0.72, y: 0.885, rx: 0.06, ry: 0.032, color: 0xf6e7a8 },
];

/** Green parks (normalized ellipses), drawn as grass with flowers and trees. */
export const PARKS: Array<{ x: number; y: number; rx: number; ry: number }> = [
  { x: 0.67, y: 0.29, rx: 0.045, ry: 0.022 }, // Merryland-ish park, Heliopolis
  { x: 0.82, y: 0.58, rx: 0.04, ry: 0.02 }, // International Garden, Nasr City
  { x: 0.78, y: 0.86, rx: 0.05, ry: 0.022 }, // New Cairo park
  { x: 0.63, y: 0.9, rx: 0.05, ry: 0.025 }, // Maadi green
  { x: 0.16, y: 0.42, rx: 0.045, ry: 0.02 }, // Zayed park
  { x: 0.32, y: 0.44, rx: 0.03, ry: 0.016 }, // Mohandessin square
  { x: 0.36, y: 0.75, rx: 0.035, ry: 0.02 }, // Giza gardens
];

/** Maadi's narrow little streets (decorative lanes, not part of the walking graph). Normalized [x1, y1, x2, y2]. */
export const MAADI_LANES: Array<[number, number, number, number]> = [
  [0.5, 0.848, 0.67, 0.848],
  [0.505, 0.878, 0.67, 0.878],
  [0.51, 0.908, 0.665, 0.908],
  [0.525, 0.83, 0.525, 0.93],
  [0.585, 0.83, 0.585, 0.93],
  [0.63, 0.835, 0.63, 0.925],
];

/** Where Zuzu the dog lives: offset from Kuku's Home, in world px. */
export const ZUZU_OFFSET = { dx: 105, dy: 48 };

export interface RoadNode {
  id: string;
  x: number;
  y: number;
}

/** Junctions (intersections, bridge ends, highway bends). */
export const ROAD_NODES: RoadNode[] = [
  // Desert highway up to Sahel
  { id: 'h0', x: 0.24, y: 0.095 },
  { id: 'h1', x: 0.31, y: 0.125 },
  { id: 'h2', x: 0.25, y: 0.16 },
  { id: 'h3', x: 0.33, y: 0.2 },
  { id: 'h4', x: 0.38, y: 0.245 },
  // North
  { id: 'wN', x: 0.43, y: 0.3 },
  { id: 'eN', x: 0.545, y: 0.3 },
  { id: 'helio', x: 0.64, y: 0.33 },
  { id: 'k1', x: 0.75, y: 0.365 },
  // Centre and bridges around Zamalek
  { id: 'w6', x: 0.37, y: 0.47 },
  { id: 'i6', x: 0.46, y: 0.47 },
  { id: 'e6', x: 0.58, y: 0.47 },
  { id: 'iQ', x: 0.46, y: 0.545 },
  { id: 'eQ', x: 0.58, y: 0.545 },
  // West
  { id: 'wZ', x: 0.22, y: 0.47 },
  { id: 'wZ0', x: 0.12, y: 0.47 },
  { id: 'wMid', x: 0.32, y: 0.6 },
  { id: 'p1', x: 0.24, y: 0.655 },
  // East
  { id: 'n1', x: 0.72, y: 0.52 },
  { id: 'eMidS', x: 0.63, y: 0.64 },
  { id: 't1', x: 0.78, y: 0.7 },
  { id: 't2', x: 0.86, y: 0.76 },
  // South
  { id: 'wS', x: 0.39, y: 0.8 },
  { id: 'eS', x: 0.52, y: 0.8 },
  { id: 'm1', x: 0.56, y: 0.835 },
  { id: 'b1', x: 0.71, y: 0.86 },
];

/** [from, to, kind] — bridges are the only way across the Nile. */
export const ROAD_EDGES: Array<[string, string, 'road' | 'highway' | 'bridge']> = [
  ['h0', 'h1', 'highway'],
  ['h1', 'h2', 'highway'],
  ['h2', 'h3', 'highway'],
  ['h3', 'h4', 'highway'],
  ['h4', 'wN', 'highway'],
  ['wN', 'eN', 'bridge'],
  ['wN', 'w6', 'road'],
  ['eN', 'helio', 'road'],
  ['eN', 'e6', 'road'],
  ['helio', 'k1', 'road'],
  ['k1', 'n1', 'road'],
  ['e6', 'n1', 'road'],
  ['w6', 'i6', 'bridge'],
  ['i6', 'e6', 'bridge'],
  ['i6', 'iQ', 'road'],
  ['iQ', 'eQ', 'bridge'],
  ['e6', 'eQ', 'road'],
  ['eQ', 'eMidS', 'road'],
  ['n1', 'eMidS', 'road'],
  ['n1', 't1', 'road'],
  ['eMidS', 't1', 'road'],
  ['t1', 't2', 'road'],
  ['eMidS', 'eS', 'road'],
  ['eS', 'm1', 'road'],
  ['m1', 'b1', 'road'],
  ['b1', 't2', 'road'],
  ['eS', 'wS', 'bridge'],
  ['wS', 'wMid', 'road'],
  ['wMid', 'p1', 'road'],
  ['wMid', 'w6', 'road'],
  ['w6', 'wZ', 'road'],
  ['wZ', 'wZ0', 'road'],
  ['wZ', 'p1', 'road'],
];

/** Interpolated Nile sample at a given normalized y: centre x and half-width (normalized x). */
export function nileAt(ny: number): { cx: number; half: number } {
  if (ny <= NILE[0][1]) return { cx: NILE[0][0], half: NILE[0][2] / 2 };
  for (let i = 0; i < NILE.length - 1; i++) {
    const [x0, y0, w0] = NILE[i];
    const [x1, y1, w1] = NILE[i + 1];
    if (ny >= y0 && ny <= y1) {
      const t = (ny - y0) / (y1 - y0);
      return { cx: x0 + (x1 - x0) * t, half: (w0 + (w1 - w0) * t) / 2 };
    }
  }
  const last = NILE[NILE.length - 1];
  return { cx: last[0], half: last[2] / 2 };
}

/** True if the normalized point is on the Nile (and not on Zamalek island). */
export function isWater(nx: number, ny: number): boolean {
  if (ny < NILE[0][1]) return false;
  const { cx, half } = nileAt(ny);
  if (Math.abs(nx - cx) > half) return false;
  const dx = (nx - ISLAND.x) / ISLAND.rx;
  const dy = (ny - ISLAND.y) / ISLAND.ry;
  return dx * dx + dy * dy > 1;
}
