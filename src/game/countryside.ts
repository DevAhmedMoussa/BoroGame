import { mulberry, weighted } from '../lib/random';
import { distToSegment } from '../lib/walkable';
import { CAIRO_TOP, DISTRICTS, PARKS, WORLD_H, WORLD_W, isWater, nileAt } from './world';

/**
 * The land between the districts: rolling green meadows (greener towards the
 * Nile), ponds, dirt footpaths, and spots for little scenes (farms, groves,
 * picnics, playgrounds...). Planned from a seeded noise field so the map is
 * the same on every load, and painted once into the baked map texture.
 */

/** Land is meadow where green() is above this. */
export const MEADOW = 0.5;

export interface Seg {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  half: number;
}
export interface Pond {
  x: number;
  y: number;
  rx: number;
  ry: number;
  seed: number;
}
export type VignetteKind = 'grove' | 'farm' | 'pond' | 'picnic' | 'playground' | 'garden' | 'dovecote' | 'kite' | 'homestead';
export interface Vignette {
  kind: VignetteKind;
  x: number;
  y: number;
}
/** A round patch of lawn forced green (e.g. Zuzu and the owl's yard). */
export interface Lawn {
  x: number;
  y: number;
  r: number;
}
export interface Countryside {
  green(x: number, y: number): number;
  ponds: Pond[];
  paths: Array<Array<[number, number]>>;
  vignettes: Vignette[];
}

// ---------------------------------------------------------------- noise

function hash(ix: number, iy: number, seed: number) {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function vnoise(x: number, y: number, seed: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, seed);
  const b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed);
  const d = hash(ix + 1, iy + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** 0 at `a`, 1 at `b` (either direction), smooth in between. */
const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** 1 inside a district, fading to 0 just outside it. */
function builtAt(x: number, y: number) {
  const nx = x / WORLD_W;
  const ny = y / WORLD_H;
  let built = 0;
  for (const d of DISTRICTS) built = Math.max(built, smooth(1.55, 0.95, ((nx - d.x) / d.rx) ** 2 + ((ny - d.y) / d.ry) ** 2));
  return built;
}

function makeGreen(lawns: Lawn[]) {
  return (x: number, y: number) => {
    const nx = x / WORLD_W;
    const ny = y / WORLD_H;
    if (ny < CAIRO_TOP) return 0;
    let g = 0.6 * vnoise(x / 300, y / 300, 1) + 0.4 * vnoise(x / 120, y / 120, 2);
    // built-up districts: no meadows inside, a soft edge around them
    g -= builtAt(x, y) * 0.9;
    // the Nile valley is green
    const { cx, half } = nileAt(ny);
    g += 0.24 * smooth(0.07, 0.015, Math.abs(nx - cx) - half);
    for (const p of PARKS) g += 0.3 * smooth(1.8, 0.9, ((nx - p.x) / p.rx) ** 2 + ((ny - p.y) / p.ry) ** 2);
    // dry towards the desert edges and the highway band
    g -= 0.5 * smooth(0.11, 0.055, Math.min(nx, 1 - nx));
    g -= 0.5 * smooth(CAIRO_TOP + 0.04, CAIRO_TOP + 0.005, ny);
    for (const l of lawns) {
      const dx = x - l.x;
      const dy = y - l.y;
      if (dx > l.r || dx < -l.r || dy > l.r || dy < -l.r) continue;
      g += 1.2 * smooth(l.r, l.r * 0.5, Math.sqrt(dx * dx + dy * dy));
    }
    return g;
  };
}

// ---------------------------------------------------------------- planning

const KINDS: Array<[VignetteKind, number]> = [
  ['grove', 3],
  ['farm', 3],
  ['pond', 2.6],
  ['picnic', 1.6],
  ['playground', 1.2],
  ['garden', 1.6],
  ['dovecote', 1],
  ['kite', 1.3],
  ['homestead', 1.8],
];
const WITH_PATH = new Set<VignetteKind>(['farm', 'pond', 'picnic', 'playground', 'garden', 'dovecote', 'homestead']);

export function planCountryside(roads: Seg[], placePts: Array<{ x: number; y: number }>, lawns: Lawn[]): Countryside {
  const green = makeGreen(lawns);
  const rand = mulberry(77);
  const vignettes: Vignette[] = [];
  const ponds: Pond[] = [];
  const paths: Array<Array<[number, number]>> = [];
  const used = new Map<VignetteKind, number>();

  const roadClear = (x: number, y: number) => {
    let best = Infinity;
    for (const r of roads) best = Math.min(best, distToSegment(x, y, r.ax, r.ay, r.bx, r.by) - r.half);
    return best;
  };

  const step = 170;
  for (let gy = step / 2; gy < WORLD_H; gy += step) {
    for (let gx = step / 2; gx < WORLD_W; gx += step) {
      const x = gx + (rand() - 0.5) * 110;
      const y = gy + (rand() - 0.5) * 110;
      // open land between the districts (every scene gets its own patch of lawn, so sand is fine too)
      const g = green(x, y);
      const nx = x / WORLD_W;
      if (builtAt(x, y) > 0.05 || nx < 0.08 || nx > 0.92 || y / WORLD_H < CAIRO_TOP + 0.03) continue;
      if (roadClear(x, y) < 62) continue;
      if (placePts.some((p) => Math.hypot(p.x - x, p.y - y) < 175)) continue;
      if (lawns.some((l) => Math.hypot(l.x - x, l.y - y) < l.r + 110)) continue;
      const ny = y / WORLD_H;
      const { cx, half } = nileAt(ny);
      if (Math.abs(nx - cx) - half < 0.022) continue;
      if (isWater(x / WORLD_W, ny)) continue;
      if (vignettes.some((v) => Math.hypot(v.x - x, v.y - y) < 175)) continue;

      const table = KINDS.filter(([k]) => k !== 'pond' || (g > MEADOW - 0.06 && ponds.length < 9)).map(
        ([k, w]) => [k, w / (1 + (used.get(k) ?? 0) * 0.6)] as [VignetteKind, number],
      );
      const kind = weighted(rand, table);
      used.set(kind, (used.get(kind) ?? 0) + 1);
      vignettes.push({ kind, x, y });
      lawns.push({ x: x + 10, y: y + 10, r: kind === 'farm' ? 150 : kind === 'pond' ? 140 : 105 });
      if (kind === 'pond') {
        const rx = 60 + rand() * 18;
        ponds.push({ x, y, rx, ry: rx * (0.58 + rand() * 0.1), seed: rand() * 10 });
      }

      // a dirt footpath out to the nearest road
      if (WITH_PATH.has(kind)) {
        let best: { x: number; y: number; d: number } | null = null;
        for (const r of roads) {
          const dx = r.bx - r.ax;
          const dy = r.by - r.ay;
          const len2 = dx * dx + dy * dy || 1;
          const t = Math.max(0, Math.min(1, ((x - r.ax) * dx + (y - r.ay) * dy) / len2));
          const px = r.ax + dx * t;
          const py = r.ay + dy * t;
          const d = Math.hypot(px - x, py - y);
          if (!best || d < best.d) best = { x: px, y: py, d };
        }
        if (best && best.d < 420) {
          const ux = (best.x - x) / best.d;
          const uy = (best.y - y) / best.d;
          const start = kind === 'pond' ? 62 : 38;
          const sx = x + ux * start;
          const sy = y + uy * start;
          const bend = (rand() - 0.5) * 0.6 * best.d;
          const mx = (sx + best.x) / 2 - uy * bend;
          const my = (sy + best.y) / 2 + ux * bend;
          const pts: Array<[number, number]> = [];
          const n = Math.ceil(best.d / 5);
          for (let i = 0; i <= n; i++) {
            const t = i / n;
            const px = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * mx + t * t * best.x;
            const py = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * my + t * t * best.y;
            if (isWater(px / WORLD_W, py / WORLD_H)) break;
            pts.push([px, py]);
          }
          if (pts.length > 4) paths.push(pts);
        }
      }
    }
  }
  return { green, ponds, paths, vignettes };
}

// ---------------------------------------------------------------- painting

type RGB = [number, number, number];
const hex = (n: number): RGB => [(n >> 16) & 255, (n >> 8) & 255, n & 255];
const COL = {
  grass: hex(0x9fcf72),
  mid: hex(0x92c567),
  light: hex(0xb4dc85),
  dark: hex(0x7fb75a),
  lip: hex(0x6aa24f),
  blade: hex(0x86bd5e),
  flowers: [hex(0xffffff), hex(0xf4a6bf), hex(0xffe17a), hex(0xc8a4e8), hex(0xe5566f)],
  pathEdge: hex(0xcfb27c),
  path: hex(0xead7a6),
  pebble: hex(0xd9c290),
  mud: hex(0xc2a46c),
  waterDark: hex(0x2d8a9b),
  water: hex(0x3aa7b8),
  waterLight: hex(0x5cc0cc),
  sparkle: hex(0xd4f1f7),
  pad: hex(0x5fae52),
  padDark: hex(0x3f8044),
  lotus: hex(0xf4a6bf),
};

/**
 * Paints meadows, footpaths and ponds at art-pixel resolution (one pixel per
 * `art` world px). Transparent everywhere else, so it layers over the sand.
 */
export function paintCountryside(c: Countryside, art: number): HTMLCanvasElement {
  const W = Math.round(WORLD_W / art);
  const H = Math.round(WORLD_H / art);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  const d = img.data;
  const set = (i: number, c: RGB) => {
    d[i * 4] = c[0];
    d[i * 4 + 1] = c[1];
    d[i * 4 + 2] = c[2];
    d[i * 4 + 3] = 255;
  };

  // The green field is smooth, so sample it on a coarse grid and interpolate.
  const S = 8;
  const GW = Math.ceil(W / S) + 2;
  const GH = Math.ceil(H / S) + 2;
  const grid = new Float32Array(GW * GH);
  for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) grid[gy * GW + gx] = c.green(gx * S * art, gy * S * art);
  const mask = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    const gy = Math.floor(y / S);
    const fy = (y % S) / S;
    for (let x = 0; x < W; x++) {
      const gx = Math.floor(x / S);
      const fx = (x % S) / S;
      const i0 = gy * GW + gx;
      const top = grid[i0] + (grid[i0 + 1] - grid[i0]) * fx;
      const bot = grid[i0 + GW] + (grid[i0 + GW + 1] - grid[i0 + GW]) * fx;
      const g = top + (bot - top) * fy;
      mask[y * W + x] = g > MEADOW ? 1 : g > MEADOW - 0.035 ? 2 : 0;
    }
  }

  // mottled light/dark patches, sampled in 2×2 art-pixel clumps (pixel-art look, and cheap)
  const TW = Math.ceil(W / 2);
  const tex = new Float32Array(TW * Math.ceil(H / 2));
  for (let ty = 0; ty < H / 2; ty++) for (let tx = 0; tx < TW; tx++) tex[ty * TW + tx] = vnoise(tx / 3.6, ty / 3.6, 5);

  for (let y = 1; y < H - 2; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const m = mask[i];
      if (m === 0) continue;
      const h = hash(x, y, 9);
      if (m === 2) {
        // dry, sparse grass just outside the meadow edge
        if (h < 0.14) set(i, h < 0.05 ? COL.dark : COL.grass);
        continue;
      }
      if (mask[i + W] !== 1 || mask[i + 2 * W] !== 1) {
        set(i, COL.lip);
        continue;
      }
      if (mask[i - 1] !== 1 || mask[i + 1] !== 1 || mask[i - W] !== 1) {
        set(i, COL.dark);
        continue;
      }
      const n = tex[(y >> 1) * TW + (x >> 1)];
      let col = n > 0.68 ? COL.light : n < 0.3 ? COL.mid : COL.grass;
      if (h < 0.004) col = COL.flowers[Math.floor(hash(x, y, 3) * COL.flowers.length)];
      else if (h < 0.045) col = COL.blade;
      set(i, col);
    }
  }

  // Footpaths: a soft edge first for all of them, then the fill, so crossings merge
  const disc = (cx: number, cy: number, r: number, fn: (i: number, x: number, y: number) => void) => {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) fn(y * W + x, x, y);
      }
  };
  for (const path of c.paths) for (const [px, py] of path) disc(px / art, py / art, 3.4, (i) => set(i, COL.pathEdge));
  for (const path of c.paths)
    for (const [px, py] of path) disc(px / art, py / art, 2.5, (i, x, y) => set(i, hash(x, y, 4) < 0.08 ? COL.pebble : COL.path));

  // Ponds with a muddy, grassy bank, a highlight and lily pads
  for (const p of c.ponds) {
    const rx = p.rx / art;
    const ry = p.ry / art;
    const cx = p.x / art;
    const cy = p.y / art;
    for (let y = Math.floor(cy - ry * 1.25); y <= cy + ry * 1.25; y++) {
      for (let x = Math.floor(cx - rx * 1.25); x <= cx + rx * 1.25; x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        const a = Math.atan2(dy, dx);
        const wob = 1 + 0.07 * Math.sin(3 * a + p.seed) + 0.04 * Math.sin(5 * a + p.seed * 2);
        const r = Math.hypot(dx, dy) / wob;
        if (r > 1.16) continue;
        const i = y * W + x;
        if (r > 1.08) set(i, COL.lip);
        else if (r > 1) set(i, COL.mud);
        else if (r > 0.9 || dy > 0.78) set(i, COL.waterDark);
        else if (Math.hypot(dx + 0.25, (dy + 0.35) * 1.6) < 0.32 && Math.hypot(dx + 0.15, (dy + 0.25) * 1.6) > 0.26) set(i, COL.waterLight);
        else set(i, hash(x, y, 6) < 0.012 ? COL.sparkle : COL.water);
      }
    }
    const rand = mulberry(Math.floor(p.seed * 1000));
    for (let k = 0; k < 4; k++) {
      const a = rand() * Math.PI * 2;
      const r = 0.45 + rand() * 0.3;
      const lx = cx + Math.cos(a) * rx * r;
      const ly = cy + Math.sin(a) * ry * r;
      disc(lx, ly, 2.3, (i) => set(i, COL.padDark));
      disc(lx, ly - 0.4, 1.8, (i) => set(i, COL.pad));
      if (k % 2 === 0) set(Math.round(ly - 1) * W + Math.round(lx), COL.lotus);
    }
  }

  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** True if (x, y) is inside a pond (scaled by `pad`). */
export function inPond(ponds: Pond[], x: number, y: number, pad = 1) {
  return ponds.some((p) => ((x - p.x) / (p.rx * pad)) ** 2 + ((y - p.y) / (p.ry * pad)) ** 2 < 1);
}
