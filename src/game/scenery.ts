import Phaser from 'phaser';
import type { Place } from '../content';
import { distToSegment } from '../lib/walkable';
import { mulberry, weighted } from '../lib/random';
import type { RoadGraph } from '../lib/roads';
import { ALL_SPRITES } from '../sprites/catalog';
import { EMBLEMS } from '../sprites/emblems';
import { renderSprite, type SpriteDef } from '../sprites/painter';
import { ANIMALS } from '../sprites/scenery/animals';
import { BUILDINGS } from '../sprites/scenery/buildings';
import { DISTRICT_BUILDINGS } from '../sprites/scenery/districtBuildings';
import { NATURE } from '../sprites/scenery/nature';
import { COUNTRY } from '../sprites/scenery/countryside';
import { CRITTERS } from '../sprites/scenery/critters';
import { LIFE, STREET, VEHICLES } from '../sprites/scenery/street';
import { MEADOW, inPond, paintCountryside, planCountryside, type Countryside, type Seg } from './countryside';
import { Critters, type CritterSpot } from './critters';
import { DISTRICTS, ISLAND, MAADI_LANES, OWL_OFFSET, PARKS, SAHEL, WORLD_H, WORLD_W, ZUZU_OFFSET, isWater, nileAt, wx, wy } from './world';

/** World px per art px: every sprite pixel is drawn as a 2×2 block. */
export const ART = 2;
/** Emblem placement: its bottom edge sits this far below the place point (world px). */
export const EMBLEM_DROP = 30;
/** How far the top of an emblem rises above the place point (world px). */
export const EMBLEM_TOP = 48 * ART - EMBLEM_DROP;

const SPRITES = new Map<string, SpriteDef>(ALL_SPRITES.map((s) => [s.key, s]));

/** Turn every code-drawn sprite into a Phaser texture (frames left to right). */
export function registerTextures(scene: Phaser.Scene) {
  for (const def of ALL_SPRITES) {
    if (scene.textures.exists(def.key)) continue;
    const tex = scene.textures.addCanvas(def.key, renderSprite(def))!;
    for (let f = 0; f < (def.frames ?? 1); f++) tex.add(f, 0, f * def.w, 0, def.w, def.h);
  }
}

// ---------------------------------------------------------------- placement

export interface Deco {
  key: string;
  x: number;
  /** Ground (feet) y in world px. */
  y: number;
  /** Not baked: palms sway, 'anim' sprites cycle their frames (swings, cats). */
  live?: 'palm' | 'anim';
  /** Special buildings that are never thinned out. */
  landmark?: boolean;
}

type Pick = string | SpriteDef | SpriteDef[];
type Table = Array<[Pick, number]>;

const B = BUILDINGS;
const D = DISTRICT_BUILDINGS;
const N = NATURE;
const A = ANIMALS;
/** Tagamo3 and Zayed: tall modern towers, malls, boutiques and bakeries. */
const HIGH_END: Table = [[D.skyscrapers, 3.5], [D.mall, 2], [D.boutique, 2.5], [D.bakeries, 1.5], [B.towers, 1], [B.villas, 1], [N.palms, 1.2], [STREET.cafes, 1.2], [N.flowers, 0.6]];
/** Each district's own architecture and feel (weights), plus how full it is (density). */
const TABLES: Record<string, { density: number; table: Table }> = {
  // Heliopolis around Kuku's Home and Korba: antique French-style buildings
  Heliopolis: { density: 0.85, table: [[D.french, 7], [D.frenchDome, 1.5], [B.arcades, 1.2], [STREET.cafes, 1], [STREET.lamp, 1], [B.mosque, 0.2], [N.trees, 0.8], [N.flowers, 0.6], [N.bush, 0.4]] },
  // Nasr City: packed, plain concrete blocks (an extra dense pass adds more)
  'Nasr City': { density: 0.95, table: [[D.blocks, 7], [B.apartments, 1.5], [B.shops, 1.5], [B.kiosk, 0.6], [B.mosque, 0.4]] },
  'New Cairo': { density: 0.8, table: HIGH_END },
  'Sheikh Zayed': { density: 0.8, table: HIGH_END },
  // Maadi: leafy, bakeries, little villas on narrow streets
  Maadi: { density: 0.95, table: [[N.trees, 7], [N.bigTree, 3], [D.bakeries, 2], [B.villas, 1.5], [B.apartments, 0.4], [STREET.cafes, 0.8], [STREET.bench, 0.6], [N.flowers, 0.8]] },
  // BRS: the school's neighbourhood
  BRS: { density: 0.7, table: [[B.villas, 1.5], [D.bakeries, 0.8], [B.kiosk, 1], [STREET.bench, 1], [N.trees, 1], [N.flowers, 1], [STREET.lamp, 0.6]] },
  // Giza: nature and animals, mosques and churches, few buildings
  Giza: { density: 0.6, table: [[N.palms, 3], [A.cactus, 2.5], [N.camel, 1.2], [A.horse, 1.2], [A.goat, 1], [B.mosque, 0.5], [D.church, 0.5], [N.rock, 1], [N.shrub, 1.2], [B.apartments, 0.3]] },
  Downtown: { density: 0.9, table: [[B.apartments, 3], [D.french, 2], [B.shops, 2], [B.mosque, 0.6], [D.church, 0.3], [B.arcades, 1], [STREET.lamp, 0.6], [B.kiosk, 0.5]] },
  Mohandessin: { density: 0.85, table: [[B.apartments, 4], [B.shops, 2], [N.trees, 0.8], [B.kiosk, 0.5], [B.mosque, 0.3]] },
  island: { density: 0.85, table: [[B.villas, 2], [D.french, 1.2], [B.apartments, 1], [N.trees, 2.5], [N.palms, 1], [STREET.cafes, 0.6]] },
  park: { density: 0.6, table: [[N.trees, 2.5], [N.bigTree, 0.7], [N.bush, 1.5], [N.flowers, 3], [STREET.bench, 1.2], [STREET.lamp, 0.6], [N.palms, 0.8]] },
  // Between the districts: green meadows get flowers and the odd bush; bare sand stays mostly open
  meadow: { density: 0.16, table: [[N.flowers, 3], [N.bush, 1.6], [N.trees, 0.4]] },
  generic: { density: 0.08, table: [[N.palms, 1.5], [N.bush, 1]] },
  desert: { density: 0.22, table: [[N.dune, 3], [N.rock, 2], [N.shrub, 3], [A.cactus, 0.6]] },
  desertBand: { density: 0.3, table: [[N.dune, 3], [N.rock, 2], [N.shrub, 3]] },
};

function regionAt(x: number, y: number): string {
  const nx = x / WORLD_W;
  const ny = y / WORLD_H;
  if (ny < SAHEL.seaBottom) return 'sea';
  if (ny < SAHEL.sandBottom) return 'beach';
  if (ny < 0.215) return ny > SAHEL.cloudTop - 0.005 && ny < SAHEL.cloudBottom + 0.005 ? 'clouds' : 'desertBand';
  if (nx < 0.05 || nx > 0.955) return 'desert';
  const ix = (nx - ISLAND.x) / ISLAND.rx;
  const iy = (ny - ISLAND.y) / ISLAND.ry;
  if (ix * ix + iy * iy < 0.8) return 'island';
  for (const p of PARKS) if (((nx - p.x) / p.rx) ** 2 + ((ny - p.y) / p.ry) ** 2 < 0.9) return 'park';
  let best = 'generic';
  let bestD = 1;
  for (const d of DISTRICTS) {
    const dd = ((nx - d.x) / d.rx) ** 2 + ((ny - d.y) / d.ry) ** 2;
    if (dd < bestD) {
      bestD = dd;
      best = d.name;
    }
  }
  return best;
}

export interface SceneryPlan {
  decos: Deco[];
  critters: CritterSpot[];
  country: Countryside;
}

export function planScenery(places: Place[], graph: RoadGraph): SceneryPlan {
  const rand = mulberry(2024);
  const decos: Deco[] = [];
  const critters: CritterSpot[] = [];
  const roads: Seg[] = graph.edges.map((e) => {
    const a = graph.nodes.get(e.a)!;
    const b = graph.nodes.get(e.b)!;
    return { ax: a.x, ay: a.y, bx: b.x, by: b.y, half: e.kind === 'highway' ? 21 : e.kind === 'spur' ? 15 : 18 };
  });
  for (const [x1, y1, x2, y2] of MAADI_LANES) roads.push({ ax: wx(x1), ay: wy(y1), bx: wx(x2), by: wy(y2), half: 9 });
  const placePts = places.map((p) => ({ x: wx(p.position.x), y: wy(p.position.y) }));
  const home = places.find((p) => p.id === 'kuku-home');
  const zuzu = home ? { x: wx(home.position.x) + ZUZU_OFFSET.dx, y: wy(home.position.y) + ZUZU_OFFSET.dy } : null;
  const owl = home ? { x: wx(home.position.x) + OWL_OFFSET.dx, y: wy(home.position.y) + OWL_OFFSET.dy } : null;
  // Zuzu and the owl share a little lawn by Kuku's home that nothing else is built on
  const yard = zuzu && owl ? { x0: zuzu.x - 56, x1: owl.x + 84, y0: Math.min(zuzu.y, owl.y) - 46, y1: Math.max(zuzu.y, owl.y) + 30 } : null;
  const country = planCountryside(roads, placePts, yard ? [{ x: (yard.x0 + yard.x1) / 2, y: (yard.y0 + yard.y1) / 2 + 8, r: 120 }] : []);

  // Occupancy: spatial hash of placed boxes
  const CELL = 64;
  const hash = new Map<string, Array<[number, number, number, number]>>();
  const boxesNear = (x0: number, y0: number, x1: number, y1: number) => {
    const out: Array<[number, number, number, number]> = [];
    for (let cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++)
      for (let cy = Math.floor(y0 / CELL); cy <= Math.floor(y1 / CELL); cy++) out.push(...(hash.get(`${cx},${cy}`) ?? []));
    return out;
  };
  const occupy = (b: [number, number, number, number]) => {
    for (let cx = Math.floor(b[0] / CELL); cx <= Math.floor(b[2] / CELL); cx++)
      for (let cy = Math.floor(b[1] / CELL); cy <= Math.floor(b[3] / CELL); cy++) {
        const k = `${cx},${cy}`;
        if (!hash.has(k)) hash.set(k, []);
        hash.get(k)!.push(b);
      }
  };

  const tryPlace = (key: string, x: number, y: number, opts: { allowSea?: boolean; small?: boolean; live?: Deco['live']; pondOk?: boolean } = {}) => {
    const def = SPRITES.get(key)!;
    const hw = (def.w * ART) / 2 - 2;
    const h = def.h * ART;
    if (x - hw < 6 || x + hw > WORLD_W - 6 || y - h < 4 || y > WORLD_H - 4) return false;
    const samples: Array<[number, number]> = [
      [x, y],
      [x - hw, y],
      [x + hw, y],
      [x - hw, y - h * 0.5],
      [x + hw, y - h * 0.5],
      [x, y - h * 0.85],
    ];
    for (const [sx, sy] of samples) {
      if (!opts.allowSea && sy < wy(SAHEL.seaBottom) + 6) return false;
      if (isWater(sx / WORLD_W, sy / WORLD_H)) return false;
      // keep a sandy margin from the Nile bank
      const { cx, half } = nileAt(sy / WORLD_H);
      if (sy > wy(0.19) && Math.abs(sx / WORLD_W - cx) < half + 0.006 && !isOnIsland(sx, sy)) return false;
      for (const r of roads) if (distToSegment(sx, sy, r.ax, r.ay, r.bx, r.by) < r.half + 3) return false;
      if (!opts.pondOk && inPond(country.ponds, sx, sy, 1.2)) return false;
    }
    if (yard && x + hw > yard.x0 && x - hw < yard.x1 && y > yard.y0 && y - h < yard.y1) return false;
    for (const p of placePts) {
      const dx = (x - p.x) / (72 + hw);
      const dy = (y - h * 0.4 - (p.y - 10)) / (60 + h * 0.4);
      if (dx * dx + dy * dy < 1) return false;
    }
    const box: [number, number, number, number] = [x - hw, y - h * (opts.small ? 0.6 : 0.9), x + hw, y + 2];
    for (const o of boxesNear(...box)) if (box[0] < o[2] && box[2] > o[0] && box[1] < o[3] && box[3] > o[1]) return false;
    occupy(box);
    decos.push({ key, x: Math.round(x / ART) * ART, y: Math.round(y / ART) * ART, live: opts.live ?? (key.startsWith('n-palm') ? 'palm' : undefined) });
    return true;
  };

  const resolve = (pick: Pick): string => (typeof pick === 'string' ? pick : Array.isArray(pick) ? pick[Math.floor(rand() * pick.length)].key : pick.key);

  // 1) Sahel beach: chalets at the back, palms between, umbrellas and sunbeds near the water
  for (let x = 50; x < WORLD_W - 40; x += 70 + rand() * 20) {
    tryPlace(B.chalets[Math.floor(rand() * 2)].key, x, wy(0.124) + rand() * 10);
    if (rand() < 0.6) tryPlace(N.palms[Math.floor(rand() * 2)].key, x + 36, wy(0.104) + rand() * 8);
  }
  for (let row = 0; row < 2; row++) {
    for (let x = 40 + row * 45; x < WORLD_W - 30; x += 90 + rand() * 90) {
      const y = wy(0.06 + row * 0.018) + rand() * 14;
      if (tryPlace(STREET.beachUmbrellas[Math.floor(rand() * 3)].key, x, y) && rand() < 0.6) tryPlace(STREET.sunbed.key, x + 26, y + 8);
    }
  }

  // 2) Street furniture lining the roads (sparser than before; style depends on the district)
  for (const e of graph.edges) {
    if (e.kind !== 'road') continue;
    const a = graph.nodes.get(e.a)!;
    const b = graph.nodes.get(e.b)!;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / len;
    const uy = (b.y - a.y) / len;
    for (let d = 50; d < len - 50; d += 84) {
      for (const side of [-1, 1]) {
        const x = a.x + ux * d - uy * 30 * side;
        const y = a.y + uy * d + ux * 30 * side + 8;
        const region = regionAt(x, y);
        const leafy = region === 'Maadi' || region === 'park';
        if (rand() < (leafy ? 0.25 : 0.6)) continue;
        let key: string;
        if (leafy) key = N.trees[Math.floor(rand() * 3)].key;
        else if (region === 'New Cairo' || region === 'Sheikh Zayed' || region === 'Giza') key = rand() < 0.6 ? N.palms[Math.floor(rand() * 2)].key : STREET.lamp.key;
        else if (region === 'Heliopolis') key = rand() < 0.75 ? STREET.lamp.key : N.trees[0].key;
        else if (region === 'generic') key = rand() < 0.75 ? N.palms[0].key : STREET.lamp.key;
        else key = rand() < 0.55 ? STREET.lamp.key : N.trees[Math.floor(rand() * 3)].key;
        tryPlace(key, x, y);
      }
    }
  }

  // Landmarks that give districts their identity (placed before the fill so they get room)
  const near = (id: string, key: string, offsets: Array<[number, number]>) => {
    const p = places.find((q) => q.id === id);
    if (!p) return;
    for (const [dx, dy] of offsets) if (tryPlace(key, wx(p.position.x) + dx, wy(p.position.y) + dy)) return void (decos[decos.length - 1].landmark = true);
  };
  near('pyramids', D.gem.key, [[270, -10], [-270, 60], [230, 170], [-240, -150], [300, 120], [-300, 180]]);
  near('pyramids', D.church.key, [[-200, -40], [180, -120], [-150, 220]]);
  near('pyramids', B.mosque.key, [[150, -150], [-120, -200], [220, 240]]);
  near('brs', D.school.key, [[-180, 6], [180, 6], [0, 150], [-160, 130], [170, 130]]);
  near('kuku-home', D.frenchDome.key, [[-150, -40], [150, -60], [-120, 120]]);
  near('korba', D.frenchDome.key, [[130, 110], [-140, 100], [0, 150]]);
  {
    const ix = wx(ISLAND.x);
    const iy = wy(ISLAND.y);
    const spots: Array<[number, number]> = [[-38, -150], [38, -150], [-38, 200], [38, 200], [-40, -120]];
    for (const [dx, dy] of spots) if (tryPlace(D.palace.key, ix + dx, iy + dy)) break;
  }
  const pyrP = places.find((p) => p.id === 'pyramids');
  if (pyrP) {
    const px = wx(pyrP.position.x);
    const py = wy(pyrP.position.y);
    const herd: Array<[string, number]> = [[N.camel.key, 3], [A.horse.key, 2.5], [A.goat.key, 2], [A.cactus.key, 2], [N.palms[0].key, 1.5]];
    for (let i = 0; i < 18; i++) {
      const ang = rand() * Math.PI * 2;
      const r = 120 + rand() * 170;
      tryPlace(weighted(rand, herd), px + Math.cos(ang) * r * 1.2, py + Math.sin(ang) * r * 0.8 + 30);
    }
  }

  // 3) Camels near the pyramids
  const pyr = places.find((p) => p.id === 'pyramids');
  if (pyr) for (const [dx, dy] of [[-150, 60], [140, 70], [-70, 130], [60, 150]]) tryPlace(N.camel.key, wx(pyr.position.x) + dx, wy(pyr.position.y) + dy);

  // 3a) The perch for the owl next to Zuzu, then little scenes out in the countryside
  if (owl) decos.push({ key: COUNTRY.owlPerch.key, x: Math.round(owl.x / ART) * ART, y: Math.round(owl.y / ART) * ART, landmark: true });
  placeVignettes(country, tryPlace, critters, rand);

  // Cats lounging by the roads in town, pigeons pecking on the plazas
  for (let tries = 0, cats = 0; tries < 600 && cats < 18; tries++) {
    const e = graph.edges[Math.floor(rand() * graph.edges.length)];
    if (e.kind !== 'road') continue;
    const a = graph.nodes.get(e.a)!;
    const b = graph.nodes.get(e.b)!;
    const t = 0.15 + rand() * 0.7;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const side = rand() < 0.5 ? -1 : 1;
    const x = a.x + (b.x - a.x) * t - ((b.y - a.y) / len) * 30 * side;
    const y = a.y + (b.y - a.y) * t + ((b.x - a.x) / len) * 30 * side + 6;
    const region = regionAt(x, y);
    if (region === 'generic' || region === 'desert' || region === 'desertBand' || region === 'beach' || region === 'sea' || region === 'clouds') continue;
    if (tryPlace(CRITTERS.cats[cats % 3].key, x, y, { small: true, live: 'anim' })) cats++;
  }
  places.forEach((p, i) => {
    if (i % 2 === 1 && p.id !== 'kuku-home') return;
    critters.push({ kind: 'pigeons', x: wx(p.position.x) + (i % 4 < 2 ? -34 : 34), y: wy(p.position.y) + 24 });
  });

  // 3b) Signature buildings first, so each district's character gets the space:
  //     Nasr City crammed with plain blocks, Tagamo3/Zayed high-end, Heliopolis French, Maadi trees & bakeries
  const highEndPick = () =>
    weighted(rand, [[D.skyscrapers[0].key, 2], [D.skyscrapers[1].key, 2], [D.skyscrapers[2].key, 2], [D.boutique.key, 1.5], [D.mall.key, 1.2], [D.bakeries[0].key, 0.6], [D.bakeries[1].key, 0.6]] as Array<[string, number]>);
  const signature: Record<string, { step: number; chance: number; pick: () => string }> = {
    'Nasr City': { step: 44, chance: 1, pick: () => D.blocks[Math.floor(rand() * D.blocks.length)].key },
    'New Cairo': { step: 60, chance: 0.75, pick: highEndPick },
    'Sheikh Zayed': { step: 60, chance: 0.75, pick: highEndPick },
    Heliopolis: { step: 58, chance: 0.8, pick: () => D.french[Math.floor(rand() * D.french.length)].key },
    Maadi: { step: 36, chance: 0.95, pick: () => (rand() < 0.85 ? (rand() < 0.2 ? N.bigTree.key : N.trees[Math.floor(rand() * 3)].key) : D.bakeries[Math.floor(rand() * 2)].key) },
  };
  for (const [region, sig] of Object.entries(signature)) {
    for (let gy = 0; gy < WORLD_H; gy += sig.step) {
      for (let gx = 0; gx < WORLD_W; gx += sig.step) {
        const x = gx + (rand() - 0.5) * 14;
        const y = gy + (rand() - 0.5) * 14;
        if (regionAt(x, y) !== region || rand() > sig.chance) continue;
        tryPlace(sig.pick(), x, y, { small: region === 'Maadi' });
      }
    }
  }

  // 4) District fill on a jittered grid
  const step = 50;
  for (let gy = wy(SAHEL.sandBottom) + step / 2; gy < WORLD_H; gy += step) {
    for (let gx = step / 2; gx < WORLD_W; gx += step) {
      const x = gx + (rand() - 0.5) * 30;
      const y = gy + (rand() - 0.5) * 30;
      let region = regionAt(x, y);
      if (region === 'generic' && country.green(x, y) > MEADOW + 0.02) region = 'meadow';
      const t = TABLES[region];
      if (!t || rand() > t.density) continue;
      tryPlace(resolve(weighted(rand, t.table)), x, y);
    }
  }

  // 5) Little fillers: grass tufts, flowers, pebbles
  for (let i = 0; i < 1800; i++) {
    const x = rand() * WORLD_W;
    const y = wy(SAHEL.sandBottom) + rand() * (WORLD_H - wy(SAHEL.sandBottom));
    const region = regionAt(x, y);
    if (region === 'clouds' || (region === 'Nasr City' && rand() < 0.8)) continue;
    const desert = region === 'desert' || region === 'desertBand';
    let key: string;
    if (desert) key = rand() < 0.5 ? N.rock.key : N.shrub.key;
    else if (region === 'park') key = N.flowers[Math.floor(rand() * 2)].key;
    else if (region === 'generic') {
      // the meadows already have grass and flowers painted in; bare sand just gets the odd tuft
      if (country.green(x, y) > MEADOW || rand() < 0.75) continue;
      key = N.grassTuft.key;
    } else key = rand() < 0.75 ? N.grassTuft.key : N.flowers[Math.floor(rand() * 2)].key;
    tryPlace(key, x, y, { small: true });
  }

  // Thin out ordinary buildings by 35% across the whole map (landmarks and the North Coast chalets stay)
  const BUILDING_THINNING = 0.35;
  const kept = decos.filter((d) => !d.key.startsWith('b-') || d.landmark || d.key.startsWith('b-chalet') || rand() >= BUILDING_THINNING);
  kept.sort((a, b) => a.y - b.y);
  return { decos: kept, critters, country };
}

type TryPlace = (key: string, x: number, y: number, opts?: { small?: boolean; live?: Deco['live']; pondOk?: boolean }) => boolean;

/** Little scenes out in the meadows: each a small, deliberate arrangement rather than random scatter. */
function placeVignettes(country: Countryside, put: TryPlace, critters: CritterSpot[], rand: () => number) {
  const N = NATURE;
  const C = COUNTRY;
  const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
  const tree = () => pick(N.trees).key;
  for (const v of country.vignettes) {
    const { x, y } = v;
    switch (v.kind) {
      case 'grove': {
        put(rand() < 0.6 ? N.bigTree.key : N.trees[1].key, x, y);
        const n = 4 + Math.floor(rand() * 3);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + rand() * 0.5;
          const r = 44 + rand() * 20;
          put(tree(), x + Math.cos(a) * r * 1.25, y + Math.sin(a) * r * 0.8);
        }
        put(STREET.bench.key, x + 6, y + 34);
        put(pick(N.flowers).key, x - 30, y + 40, { small: true });
        critters.push({ kind: 'butterflies', x, y: y + 30 });
        break;
      }
      case 'farm': {
        put(pick(C.fields).key, x, y);
        put(pick(C.fields).key, x + 100, y + 6);
        put(C.hut.key, x - 86, y - 4);
        put(C.haybale.key, x - 46, y + 34, { small: true });
        put(C.haybale.key, x - 30, y + 42, { small: true });
        put(rand() < 0.5 ? C.donkey.key : ANIMALS.goat.key, x + 52, y + 46);
        put(N.palms[0].key, x - 120, y - 30);
        critters.push({ kind: 'chickens', x: x - 70, y: y + 40 });
        break;
      }
      case 'pond': {
        const p = country.ponds.find((q) => q.x === x && q.y === y)!;
        put(C.reeds.key, x - p.rx * 0.92, y + p.ry * 0.15, { small: true, pondOk: true });
        put(C.reeds.key, x + p.rx * 0.88, y - p.ry * 0.25, { small: true, pondOk: true });
        put(STREET.bench.key, x - 10, y + p.ry + 28);
        put(N.palms[0].key, x + p.rx + 26, y - 4);
        put(N.palms[1].key, x + p.rx + 50, y + 18);
        put(tree(), x - p.rx - 34, y - 6);
        put(N.bigTree.key, x - p.rx - 10, y - p.ry - 30);
        put(pick(C.beds).key, x + 36, y + p.ry + 30, { small: true });
        critters.push({ kind: 'ducks', x, y, rx: p.rx, ry: p.ry });
        critters.push({ kind: 'butterflies', x: x + 30, y: y + p.ry + 20 });
        break;
      }
      case 'picnic': {
        put(N.bigTree.key, x - 6, y - 20);
        put(C.picnic.key, x + 14, y + 40, { small: true });
        put(pick(N.flowers).key, x - 44, y + 30, { small: true });
        put(pick(C.beds).key, x + 66, y + 10, { small: true });
        put(tree(), x + 70, y - 40);
        critters.push({ kind: 'butterflies', x: x + 20, y: y + 30 });
        break;
      }
      case 'playground': {
        put(C.swing.key, x, y, { live: 'anim' });
        put(C.slide.key, x + 58, y + 6);
        put(C.sandbox.key, x - 54, y + 12, { small: true });
        put(STREET.bench.key, x + 4, y + 44);
        put(tree(), x - 52, y - 42);
        put(tree(), x + 66, y - 40);
        critters.push({ kind: 'pigeons', x: x - 20, y: y + 50 });
        break;
      }
      case 'garden': {
        for (const dx of [-40, 0, 40]) put(C.fence.key, x + dx, y - 34, { small: true });
        for (const [dx, dy] of [[-22, -8], [22, -8], [-22, 18], [22, 18]]) put(pick(C.beds).key, x + dx, y + dy, { small: true });
        put(tree(), x - 76, y - 10);
        put(STREET.bench.key, x + 70, y + 12);
        put(N.palms[1].key, x + 82, y - 30);
        critters.push({ kind: 'butterflies', x: x - 10, y: y + 4 });
        critters.push({ kind: 'butterflies', x: x + 20, y: y + 20 });
        break;
      }
      case 'dovecote': {
        put(C.dovecote.key, x, y);
        put(C.hut.key, x - 66, y + 10);
        put(C.haybale.key, x + 36, y + 16, { small: true });
        put(N.palms[0].key, x + 60, y - 14);
        critters.push({ kind: 'orbit', x, y: y - 86 });
        critters.push({ kind: 'chickens', x: x + 6, y: y + 50 });
        break;
      }
      case 'kite': {
        put(C.kiteKid.key, x, y, { small: true });
        put(pick(N.flowers).key, x - 30, y + 14, { small: true });
        put(pick(N.flowers).key, x + 34, y + 20, { small: true });
        put(tree(), x - 70, y - 30);
        critters.push({ kind: 'kite', x, y });
        critters.push({ kind: 'butterflies', x: x + 10, y: y + 30 });
        break;
      }
      case 'homestead': {
        put(C.hut.key, x, y);
        put(C.laundry.key, x + 66, y + 16);
        put(pick(CRITTERS.cats).key, x - 26, y + 18, { small: true, live: 'anim' });
        put(N.palms[0].key, x - 52, y - 16);
        put(tree(), x + 60, y - 34);
        put(pick(C.beds).key, x + 6, y + 30, { small: true });
        critters.push({ kind: 'chickens', x: x + 30, y: y + 52 });
        break;
      }
    }
  }
}

function isOnIsland(x: number, y: number) {
  const ix = (x / WORLD_W - ISLAND.x) / ISLAND.rx;
  const iy = (y / WORLD_H - ISLAND.y) / ISLAND.ry;
  return ix * ix + iy * iy < 0.85;
}

// ---------------------------------------------------------------- baking

/** Bakes ground + static scenery + emblems into one half-resolution map texture. */
export function bakeMap(
  scene: Phaser.Scene,
  ground: { base: Phaser.GameObjects.Graphics; top: Phaser.GameObjects.Graphics },
  plan: SceneryPlan,
  places: Place[],
) {
  const { decos } = plan;
  const rt = scene.add.renderTexture(0, 0, WORLD_W / ART, WORLD_H / ART).setOrigin(0, 0).setScale(ART).setDepth(0);
  ground.base.setScale(1 / ART);
  rt.draw(ground.base, 0, 0);
  ground.base.destroy();
  // meadows, footpaths and ponds sit on the sand, under the Nile and the roads
  const meadowKey = 'countryside-meadows';
  if (scene.textures.exists(meadowKey)) scene.textures.remove(meadowKey);
  scene.textures.addCanvas(meadowKey, paintCountryside(plan.country, ART));
  rt.draw(meadowKey, 0, 0);
  ground.top.setScale(1 / ART);
  rt.draw(ground.top, 0, 0);
  ground.top.destroy();
  scene.time.delayedCall(1000, () => scene.textures.exists(meadowKey) && scene.textures.remove(meadowKey));

  const emblemFor = (p: Place) => EMBLEMS[p.emblem] ?? EMBLEMS[p.id];
  const items: Array<{ key: string; x: number; y: number }> = [
    ...decos.filter((d) => !d.live),
    ...places.filter((p) => emblemFor(p)).map((p) => ({ key: emblemFor(p)!.key, x: wx(p.position.x), y: wy(p.position.y) + EMBLEM_DROP })),
  ].sort((a, b) => a.y - b.y);
  rt.beginDraw();
  for (const it of items) {
    const def = SPRITES.get(it.key)!;
    rt.batchDrawFrame(it.key, 0, Math.round(it.x / ART - def.w / 2), Math.round(it.y / ART - def.h));
  }
  rt.endDraw();

  // The Sahel road sign needs the pixel font, so it's stamped once the font is ready
  void document.fonts.load('8px "Press Start 2P"').then(() => {
    if (!rt.scene) return;
    const sign = sahelSign();
    const key = 'sign-sahel';
    if (!scene.textures.exists(key)) scene.textures.addCanvas(key, sign);
    rt.stamp(key, undefined, Math.round(wx(0.415) / ART), Math.round(wy(0.232) / ART), { originX: 0.5, originY: 1 });
  });
  return rt;
}

/** Green highway sign: "↑ SAHEL / NORTH COAST" (art px). */
function sahelSign(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 100;
  c.height = 46;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  g.fillStyle = 'rgba(43,29,20,0.28)';
  g.beginPath();
  g.ellipse(50, 44, 30, 2, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#5f5c5a';
  g.fillRect(20, 28, 3, 16);
  g.fillRect(77, 28, 3, 16);
  g.fillStyle = '#2b1d14';
  g.fillRect(0, 0, 100, 31);
  g.fillStyle = '#ffffff';
  g.fillRect(1, 1, 98, 29);
  g.fillStyle = '#2f8f5b';
  g.fillRect(3, 3, 94, 25);
  // arrow
  g.fillStyle = '#ffffff';
  g.fillRect(9, 9, 2, 8);
  g.fillRect(7, 11, 6, 1);
  g.fillRect(8, 10, 4, 1);
  g.fillRect(9, 9, 2, 1);
  g.font = '8px "Press Start 2P"';
  g.textBaseline = 'top';
  g.fillText('SAHEL', 17, 8);
  g.fillText('NORTH COAST', 6, 18);
  return c;
}

// ---------------------------------------------------------------- living things

interface Vehicle {
  img: Phaser.GameObjects.Image;
  from: string;
  to: string;
  t: number;
  speed: number;
}

/**
 * Everything that moves on the map: swaying palms, Nile ripples, feluccas,
 * traffic, birds, seagulls, drifting clouds and the glow at Kuku's home.
 * Off-screen things are skipped each frame.
 */
export class MapLife {
  private palms: Phaser.GameObjects.Image[] = [];
  private waves: Array<{ img: Phaser.GameObjects.Image; phase: number }> = [];
  private feluccas: Array<{ img: Phaser.GameObjects.Image; y: number; min: number; max: number; dir: number; speed: number }> = [];
  private vehicles: Vehicle[] = [];
  private clouds: Array<{ img: Phaser.GameObjects.Image; speed: number }> = [];
  private flocks: Array<{ birds: Phaser.GameObjects.Image[]; t: number; dur: number; wait: number; ax: number; ay: number; bx: number; by: number }> = [];
  private gulls: Array<{ img: Phaser.GameObjects.Image; cx: number; cy: number; r: number; phase: number }> = [];
  private glow?: Phaser.GameObjects.Ellipse;
  private anims: Array<{ img: Phaser.GameObjects.Image; kind: 'swing' | 'cat'; phase: number }> = [];
  private critters: Critters;
  private adj = new Map<string, string[]>();
  private reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(
    private scene: Phaser.Scene,
    private graph: RoadGraph,
    places: Place[],
    plan: SceneryPlan,
  ) {
    const rand = mulberry(7);
    const { decos } = plan;

    for (const d of decos.filter((d) => d.live === 'palm')) {
      this.palms.push(scene.add.image(d.x, d.y, d.key).setOrigin(0.5, 1).setScale(ART).setDepth(d.y));
    }
    for (const d of decos.filter((d) => d.live === 'anim')) {
      const img = scene.add.image(d.x, d.y, d.key, 0).setOrigin(0.5, 1).setScale(ART).setDepth(d.y);
      this.anims.push({ img, kind: d.key === COUNTRY.swing.key ? 'swing' : 'cat', phase: rand() * 10000 });
    }
    this.critters = new Critters(scene, graph, plan.critters, this.reduce);

    // Ripples on the Nile and the sea
    for (let i = 0; i < 260 && this.waves.length < 150; i++) {
      const y = wy(0.2) + rand() * (WORLD_H - wy(0.2));
      const { cx, half } = nileAt(y / WORLD_H);
      const x = wx(cx + (rand() - 0.5) * 2 * half * 0.85);
      if (!isWater(x / WORLD_W, y / WORLD_H)) continue;
      this.addWave(x, y, rand());
    }
    for (let i = 0; i < 90; i++) this.addWave(rand() * WORLD_W, 10 + rand() * (wy(SAHEL.seaBottom) - 30), rand());

    // Feluccas, each sailing its own stretch between bridges
    for (const [min, max] of [
      [0.31, 0.42],
      [0.58, 0.78],
      [0.82, 0.97],
    ]) {
      const img = scene.add.image(0, 0, LIFE.felucca.key).setOrigin(0.5, 0.92).setScale(ART).setDepth(2);
      this.feluccas.push({ img, y: wy(min + rand() * (max - min)), min: wy(min), max: wy(max), dir: rand() < 0.5 ? 1 : -1, speed: 10 + rand() * 6 });
    }

    // Traffic on the roads (not on the little spurs into the plazas)
    for (const e of graph.edges) {
      if (e.kind === 'spur') continue;
      if (!this.adj.has(e.a)) this.adj.set(e.a, []);
      if (!this.adj.has(e.b)) this.adj.set(e.b, []);
      this.adj.get(e.a)!.push(e.b);
      this.adj.get(e.b)!.push(e.a);
    }
    const drivable = graph.edges.filter((e) => e.kind !== 'spur');
    for (let i = 0; i < 16; i++) {
      const e = drivable[Math.floor(rand() * drivable.length)];
      const forward = rand() < 0.5;
      const key = VEHICLES[i % VEHICLES.length].key;
      const img = scene.add.image(0, 0, key).setScale(ART).setDepth(3);
      this.vehicles.push({ img, from: forward ? e.a : e.b, to: forward ? e.b : e.a, t: rand(), speed: 55 + rand() * 40 });
    }

    // Clouds drifting in the "far away" band
    for (let i = 0; i < 12; i++) {
      const img = scene.add
        .image(rand() * WORLD_W, wy(SAHEL.cloudTop + 0.006 + rand() * (SAHEL.cloudBottom - SAHEL.cloudTop - 0.012)), NATURE.cloud.key)
        .setScale(ART * (0.8 + rand() * 0.6))
        .setDepth(6000)
        .setAlpha(0.95);
      this.clouds.push({ img, speed: 4 + rand() * 6 });
    }

    // Birds and seagulls
    if (!this.reduce) {
      for (let f = 0; f < 3; f++) {
        const birds = [0, 1, 2].map(() => scene.add.image(0, 0, LIFE.bird.key).setScale(ART).setDepth(6001).setVisible(false));
        this.flocks.push({ birds, t: 0, dur: 1, wait: 2 + f * 4, ax: 0, ay: 0, bx: 0, by: 0 });
      }
      for (let i = 0; i < 6; i++) {
        const img = scene.add.image(0, 0, LIFE.gull.key).setScale(ART).setDepth(6001);
        this.gulls.push({ img, cx: 200 + rand() * (WORLD_W - 400), cy: wy(0.03 + rand() * 0.06), r: 40 + rand() * 60, phase: rand() * 10 });
      }
    }

    // A warm glow around Kuku's home (the home base)
    const home = places.find((p) => p.id === 'kuku-home');
    if (home) {
      this.glow = scene.add.ellipse(wx(home.position.x), wy(home.position.y) - 6, 170, 110, 0xffe08a, 0.22).setDepth(1).setBlendMode(Phaser.BlendModes.ADD);
    }
  }

  private addWave(x: number, y: number, r: number) {
    const img = this.scene.add.image(Math.round(x / ART) * ART, Math.round(y / ART) * ART, LIFE.wave.key, 0).setScale(ART).setDepth(1);
    this.waves.push({ img, phase: r * 5000 });
  }

  update(time: number, delta: number, view: Phaser.Geom.Rectangle, kuku: { x: number; y: number }) {
    const dt = Math.min(delta, 50) / 1000;
    const pad = 120;
    const vis = (x: number, y: number) => x > view.x - pad && x < view.right + pad && y > view.y - pad && y < view.bottom + pad * 2;

    this.critters.update(time, dt, vis, kuku);
    if (!this.reduce) {
      for (const a of this.anims) {
        if (!vis(a.img.x, a.img.y)) continue;
        const t = time + a.phase;
        if (a.kind === 'swing') a.img.setFrame([0, 1, 2, 1][Math.floor(t / 260) % 4]);
        else {
          // tail swish now and then, a slow blink
          const cycle = t % 5200;
          a.img.setFrame(cycle > 4900 ? 2 : cycle < 1600 ? Math.floor(t / 280) % 2 : 0);
        }
      }
    }

    if (!this.reduce) {
      for (const p of this.palms) if (vis(p.x, p.y)) p.rotation = Math.sin(time / 900 + p.x * 0.01) * 0.035;
      for (const w of this.waves) {
        if (!vis(w.img.x, w.img.y)) continue;
        const t = (time + w.phase) / 1000;
        w.img.setFrame(Math.floor(t * 1.4) % 2);
        w.img.setAlpha(0.35 + 0.45 * Math.abs(Math.sin(t * 0.9)));
      }
    }

    for (const f of this.feluccas) {
      f.y += f.dir * f.speed * dt;
      if (f.y > f.max) f.dir = -1;
      if (f.y < f.min) f.dir = 1;
      const { cx, half } = nileAt(f.y / WORLD_H);
      const sway = Math.sin(time / 2600 + f.min) * half * 0.35;
      f.img.setPosition(wx(cx) + wx(sway), f.y + (this.reduce ? 0 : Math.sin(time / 500 + f.min) * 1.5));
      f.img.setFlipX(f.dir < 0);
    }

    for (const v of this.vehicles) {
      const a = this.graph.nodes.get(v.from)!;
      const b = this.graph.nodes.get(v.to)!;
      const len = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
      v.t += (v.speed * dt) / len;
      if (v.t >= 1) {
        const options = this.adj.get(v.to)!.filter((n) => n !== v.from);
        const next = options.length ? options[Math.floor(Math.random() * options.length)] : v.from;
        v.from = v.to;
        v.to = next;
        v.t = 0;
        continue;
      }
      const ux = (b.x - a.x) / len;
      const uy = (b.y - a.y) / len;
      // drive on the right-hand lane
      const x = a.x + (b.x - a.x) * v.t - uy * 6;
      const y = a.y + (b.y - a.y) * v.t + ux * 6;
      v.img.setPosition(x, y).setRotation(Math.atan2(uy, ux));
      v.img.setVisible(vis(x, y));
    }

    for (const c of this.clouds) {
      c.img.x += c.speed * dt;
      if (c.img.x > WORLD_W + 60) c.img.x = -60;
    }

    for (const fl of this.flocks) {
      if (fl.wait > 0) {
        fl.wait -= dt;
        if (fl.wait <= 0) {
          // fly across the current view
          const fromLeft = Math.random() < 0.5;
          fl.ax = fromLeft ? view.x - 60 : view.right + 60;
          fl.bx = fromLeft ? view.right + 60 : view.x - 60;
          fl.ay = view.y + view.height * (0.15 + Math.random() * 0.5);
          fl.by = fl.ay + (Math.random() - 0.5) * view.height * 0.3;
          fl.t = 0;
          fl.dur = 7 + Math.random() * 4;
          fl.birds.forEach((b) => b.setVisible(true).setFlipX(!fromLeft));
        }
        continue;
      }
      fl.t += dt / fl.dur;
      const x = fl.ax + (fl.bx - fl.ax) * fl.t;
      const y = fl.ay + (fl.by - fl.ay) * fl.t;
      fl.birds.forEach((b, i) => {
        const back = i === 0 ? 0 : 1;
        const side = i === 1 ? -1 : 1;
        const dir = Math.sign(fl.bx - fl.ax);
        b.setPosition(x - dir * back * 18, y + side * back * 12 + Math.sin(time / 300 + i) * 3);
        b.setFrame(Math.floor((time + i * 90) / 160) % 2);
      });
      if (fl.t >= 1) {
        fl.birds.forEach((b) => b.setVisible(false));
        fl.wait = 5 + Math.random() * 8;
      }
    }

    for (const g of this.gulls) {
      if (!vis(g.cx, g.cy)) continue;
      const a = time / 3000 + g.phase;
      g.img.setPosition(g.cx + Math.cos(a) * g.r, g.cy + Math.sin(a) * g.r * 0.45).setFrame(Math.floor(time / 220 + g.phase) % 2);
    }

    if (this.glow && !this.reduce) this.glow.setAlpha(0.16 + 0.1 * Math.sin(time / 700));
  }
}
