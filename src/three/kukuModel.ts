import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { ParametricGeometry } from 'three/examples/jsm/geometries/ParametricGeometry.js';

/**
 * 3D Kuku, built entirely from code (no model files), matched to her own
 * avatar (references/kuku-avatar-fullbody.jpg): slim, about five heads tall,
 * long voluminous dark-brown curls past the shoulders with curly bangs, oval
 * face with almond eyes and eyeliner, soft closed smile.
 * Default outfit: lilac short-sleeve shirt knotted at the waist, light-blue
 * high-waisted jeans with rolled cuffs, white sneakers.
 *
 * Units: feet at y = 0, about 2.45 units tall, facing +Z (towards the camera).
 * Outfit meshes are kept separate so the Phase 5 wardrobe can recolor/swap them.
 */

export interface KukuOptions {
  /** Her real-life glasses (off by default to match her avatar). */
  glasses?: boolean;
}

export const COLORS = {
  skin: 0xefbf98,
  skinShade: 0xdca17c,
  hairBase: 0x2c1a12,
  lips: 0xd9737d,
  lipsDark: 0xb85461,
  iris: 0x5a3320,
  liner: 0x24150e,
  brow: 0x3a2318,
  shirt: 0xc8a4e8,
  shirtLight: 0xdcc3f2,
  jeans: 0xa9cbea,
  jeansLight: 0xc4dcf2,
  shoes: 0xffffff,
  soles: 0xe8e4de,
  blush: 0xf5a29c,
  glasses: 0x231a18,
};

/** Hip joint height: the car seat uses it to sit her down. */
export const HIP_Y = 1.08;
const HEAD_Y = 2.15;
/** Head ellipsoid radii (the jaw tapers below the middle). */
const HEAD = { rx: 0.205, ry: 0.26, rz: 0.225, jaw: 0.3 };

export interface KukuRig {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  hair: THREE.Group;
  eyes: THREE.Group[];
  armL: THREE.Group;
  armR: THREE.Group;
  forearmL: THREE.Group;
  forearmR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  shinL: THREE.Group;
  shinR: THREE.Group;
  /** Meshes by outfit layer, for the wardrobe. */
  outfit: { top: THREE.Object3D[]; bottom: THREE.Object3D[]; shoes: THREE.Object3D[]; accessory: THREE.Object3D[] };
}

/** Small deterministic RNG so the curls are the same on every load. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const std = (color: number, roughness = 0.6, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, ...extra });

const lerpTable = (table: Array<[number, number]>, x: number) => {
  // table sorted by descending x
  if (x >= table[0][0]) return table[0][1];
  for (let i = 0; i < table.length - 1; i++) {
    const [x0, y0] = table[i];
    const [x1, y1] = table[i + 1];
    if (x <= x0 && x >= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return table[table.length - 1][1];
};

// ---------------------------------------------------------------- head

const jawTaper = (uy: number) => (uy < 0 ? 1 - HEAD.jaw * -uy : 1);

function headGeometry() {
  const g = new THREE.SphereGeometry(1, 48, 40);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    p.setXYZ(i, x * HEAD.rx * jawTaper(y), y * HEAD.ry, z * HEAD.rz);
  }
  g.computeVertexNormals();
  return g;
}

/** Point on the face (head-local) plus its outward normal. */
function onFace(x: number, y: number, lift = 0) {
  const uy = y / HEAD.ry;
  const t = jawTaper(uy);
  const ux = x / (HEAD.rx * t);
  const uz = Math.sqrt(Math.max(0, 1 - ux * ux - uy * uy));
  const normal = new THREE.Vector3(ux / (HEAD.rx * t), uy / HEAD.ry, uz / HEAD.rz).normalize();
  const pos = new THREE.Vector3(x, y, uz * HEAD.rz).addScaledVector(normal, lift);
  return { pos, normal };
}

function placeOnFace(obj: THREE.Object3D, x: number, y: number, lift = 0) {
  const { pos, normal } = onFace(x, y, lift);
  obj.position.copy(pos);
  obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  return obj;
}

const tube = (pts: Array<[number, number, number]>, radius: number, mat: THREE.Material) =>
  new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z))),
      20,
      radius,
      6,
    ),
    mat,
  );

function buildFace(head: THREE.Group, opts: KukuOptions) {
  const eyes: THREE.Group[] = [];
  const liner = std(COLORS.liner, 0.5);
  const shine = std(0xffffff, 0.1, { emissive: 0xffffff, emissiveIntensity: 0.8 });
  for (const side of [-1, 1]) {
    // Almond eye: white, brown iris, pupil, sparkle, winged liner on the upper lid
    const eye = new THREE.Group();
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), std(0xffffff, 0.3));
    sclera.scale.set(0.044, 0.026, 0.012);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), std(COLORS.iris, 0.2));
    iris.scale.set(0.022, 0.024, 0.008);
    iris.position.set(0, -0.001, 0.007);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), std(0x120a06, 0.1));
    pupil.scale.set(0.011, 0.012, 0.005);
    pupil.position.set(0, -0.001, 0.012);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 8, 6), shine);
    glint.position.set(0.007, 0.008, 0.016);
    const lid = tube(
      [
        [-0.047, -0.002, 0.004],
        [-0.02, 0.024, 0.01],
        [0.02, 0.026, 0.01],
        [0.05, 0.004, 0.004],
      ],
      0.0065,
      liner,
    );
    const wing = new THREE.Mesh(new THREE.CapsuleGeometry(0.005, 0.016, 3, 6), liner);
    wing.position.set(side * 0.052, 0.008, 0.004);
    wing.rotation.z = side * -1.0;
    // Mirror the eye so the wing and liner point outwards on both sides
    lid.scale.x = side;
    eye.add(sclera, iris, pupil, glint, lid, wing);
    placeOnFace(eye, side * 0.078, 0.0, 0.0);
    head.add(eye);
    eyes.push(eye);

    // Thin, softly arched brows
    const brow = tube(
      [
        [-0.04, -0.004, 0],
        [-0.01, 0.01, 0],
        [0.025, 0.012, 0],
        [0.048, 0.0, 0],
      ],
      0.0062,
      std(COLORS.brow, 0.6),
    );
    brow.scale.x = side;
    placeOnFace(brow, side * 0.08, 0.072, 0.004);
    head.add(brow);

    const blush = new THREE.Mesh(
      new THREE.CircleGeometry(0.035, 20),
      new THREE.MeshBasicMaterial({ color: COLORS.blush, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    blush.scale.y = 0.7;
    placeOnFace(blush, side * 0.115, -0.07, 0.003);
    head.add(blush);
  }

  // Small, softly shaded nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), std(COLORS.skinShade, 0.55));
  nose.scale.set(0.022, 0.03, 0.02);
  placeOnFace(nose, 0, -0.06, -0.006);
  head.add(nose);

  // Soft closed smile: curved upper lip line with full lower lip
  const smile = new THREE.Group();
  const upper = tube(
    [
      [-0.047, 0.008, 0],
      [-0.02, -0.004, 0.004],
      [0.02, -0.004, 0.004],
      [0.047, 0.008, 0],
    ],
    0.0075,
    std(COLORS.lipsDark, 0.4),
  );
  const lower = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), std(COLORS.lips, 0.35));
  lower.scale.set(0.034, 0.013, 0.012);
  lower.position.set(0, -0.014, 0.0);
  const top = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), std(COLORS.lips, 0.35));
  top.scale.set(0.036, 0.009, 0.01);
  top.position.set(0, 0.005, -0.001);
  smile.add(top, lower, upper);
  placeOnFace(smile, 0, -0.135, 0.004);
  head.add(smile);

  if (opts.glasses) {
    // Her real glasses: dark, thin, softly rounded rectangular frames
    const frameMat = std(COLORS.glasses, 0.3, { metalness: 0.2 });
    const lensMat = new THREE.MeshStandardMaterial({ color: 0xe6f4ff, roughness: 0.05, transparent: true, opacity: 0.1, depthWrite: false });
    const roundRect = (shape: THREE.Path, w: number, h: number, r: number) => {
      const x = -w / 2;
      const y = -h / 2;
      shape.moveTo(x + r, y);
      shape.lineTo(x + w - r, y);
      shape.quadraticCurveTo(x + w, y, x + w, y + r);
      shape.lineTo(x + w, y + h - r);
      shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      shape.lineTo(x + r, y + h);
      shape.quadraticCurveTo(x, y + h, x, y + h - r);
      shape.lineTo(x, y + r);
      shape.quadraticCurveTo(x, y, x + r, y);
      return shape;
    };
    const W = 0.112;
    const H = 0.078;
    const rim = 0.009;
    const frameShape = roundRect(new THREE.Shape(), W, H, 0.026) as THREE.Shape;
    frameShape.holes.push(roundRect(new THREE.Path(), W - rim * 2, H - rim * 2, 0.019));
    const frameGeo = new THREE.ExtrudeGeometry(frameShape, { depth: 0.008, bevelEnabled: false, curveSegments: 6 });
    frameGeo.translate(0, 0, -0.004);
    const lensGeo = new THREE.ShapeGeometry(roundRect(new THREE.Shape(), W - rim * 2, H - rim * 2, 0.019) as THREE.Shape);
    for (const side of [-1, 1]) {
      const lens = new THREE.Group();
      lens.add(new THREE.Mesh(frameGeo, frameMat), new THREE.Mesh(lensGeo, lensMat));
      placeOnFace(lens, side * 0.079, 0.002, 0.03);
      head.add(lens);
      // Arm running back over the ear into her curls
      const temple = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.01, 0.2), frameMat);
      temple.position.set(side * 0.19, 0.02, 0.07);
      temple.rotation.y = side * 0.12;
      head.add(temple);
    }
    const bridge = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.0045, 6, 12, Math.PI), frameMat);
    bridge.position.copy(onFace(0, 0.006, 0.034).pos);
    head.add(bridge);
  }

  return eyes;
}

// ---------------------------------------------------------------- hair

/** Radius of the hair mass at a given height (head-local y). */
const HAIR_RADIUS: Array<[number, number]> = [
  [0.37, 0.0],
  [0.34, 0.16],
  [0.28, 0.27],
  [0.16, 0.31],
  [0.0, 0.325],
  [-0.2, 0.35],
  [-0.4, 0.4],
  [-0.56, 0.43],
  [-0.7, 0.36],
];
/** Half-angle of the opening at the front (face, then neck and chest). */
const HAIR_GAP: Array<[number, number]> = [
  [0.17, 0.0],
  [0.1, 0.95],
  [-0.24, 0.95],
  [-0.4, 0.66],
  [-0.7, 0.66],
];
const HAIR_TOP = 0.37;
const HAIR_BOTTOM = -0.7;

function hairPoint(u: number, v: number, target = new THREE.Vector3()) {
  const y = HAIR_TOP + (HAIR_BOTTOM - HAIR_TOP) * v;
  const r = lerpTable(HAIR_RADIUS, y);
  const gap = lerpTable(HAIR_GAP, y);
  const phi = gap + u * (Math.PI * 2 - 2 * gap);
  return target.set(Math.sin(phi) * r, y, Math.cos(phi) * r * 0.92 - 0.025);
}

/** One corkscrew ringlet: a short tube wound into a helix, hanging along +Y. */
function ringletGeometry() {
  const pts: THREE.Vector3[] = [];
  const turns = 2.2;
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const a = t * Math.PI * 2 * turns;
    const r = 0.34 * (1 - 0.25 * t);
    pts.push(new THREE.Vector3(Math.cos(a) * r, 0.8 - t * 1.6, Math.sin(a) * r));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.21, 4, false);
}

function buildHair(rand: () => number) {
  const group = new THREE.Group();

  // 1) Solid mass: wraps the head and falls past the shoulders, open at the front for her face
  const shell = new ParametricGeometry((u, v, target) => hairPoint(u, v, target), 40, 30);
  group.add(new THREE.Mesh(shell, std(COLORS.hairBase, 0.6, { side: THREE.DoubleSide })));

  // 2) Ringlets over the whole mass (stretched vertically so they read as curls)
  const placements: Array<{ p: THREE.Vector3; n: THREE.Vector3; s: number }> = [];
  const cols = 38;
  const rows = 22;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const u = (i + 0.5 + (rand() - 0.5) * 0.7) / cols;
      const v = (j + 0.5 + (rand() - 0.5) * 0.7) / rows;
      const p = hairPoint(Math.min(1, Math.max(0, u)), Math.min(1, Math.max(0, v)));
      if (p.y > 0.33) continue;
      const n = new THREE.Vector3(p.x, 0, p.z + 0.025).normalize();
      if (p.y > 0.25) n.y = 0.8;
      n.normalize();
      p.addScaledVector(n, 0.012 + rand() * 0.012);
      placements.push({ p, n, s: 0.05 + rand() * 0.016 + (p.y < -0.3 ? 0.008 : 0) });
    }
  }
  // Crown
  for (let i = 0; i < 46; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * 0.26;
    const y = 0.37 - (r / 0.26) ** 2 * 0.1;
    placements.push({ p: new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r * 0.92 - 0.025), n: new THREE.Vector3(0, 1, 0), s: 0.05 + rand() * 0.015 });
  }
  // 3) Curly bangs across the forehead, a few falling a little lower at the sides
  for (let i = 0; i < 16; i++) {
    const x = -0.19 + (i / 15) * 0.38 + (rand() - 0.5) * 0.02;
    const edge = Math.abs(x) / 0.19;
    const y = 0.13 - edge * edge * 0.05 + (rand() - 0.5) * 0.03;
    const { pos, normal } = onFace(x * 0.95, y, 0.03);
    placements.push({ p: pos, n: normal, s: 0.042 + rand() * 0.012 });
    if (i % 2 === 0) {
      const up = onFace(x * 0.9, y + 0.06, 0.04);
      placements.push({ p: up.pos, n: up.normal, s: 0.045 + rand() * 0.01 });
    }
  }

  const mesh = new THREE.InstancedMesh(ringletGeometry(), std(0xffffff, 0.4, { metalness: 0.03 }), placements.length);
  const m = new THREE.Matrix4();
  const up = new THREE.Vector3(0, 1, 0);
  const tones = [0x2e1b12, 0x382116, 0x42281a, 0x4c2f1f, 0x2a170f, 0x5a3825, 0x65412b];
  placements.forEach(({ p, n, s }, i) => {
    // Basis: z = outward normal, y = as close to "up" as possible, so ringlets hang vertically
    const zAxis = n.clone().normalize();
    let xAxis = new THREE.Vector3().crossVectors(up, zAxis);
    if (xAxis.lengthSq() < 1e-4) xAxis = new THREE.Vector3(1, 0, 0);
    xAxis.normalize();
    const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis);
    const rot = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
    const tilt = new THREE.Matrix4().makeRotationZ((rand() - 0.5) * 0.5).multiply(new THREE.Matrix4().makeRotationY(rand() * Math.PI * 2));
    m.copy(rot).multiply(tilt).scale(new THREE.Vector3(s, s, s)).setPosition(p);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, new THREE.Color(tones[Math.floor(rand() * tones.length)]));
  });
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
  return group;
}

// ---------------------------------------------------------------- body

export function buildKuku(opts: KukuOptions = {}): KukuRig {
  const rand = rng(11);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const skin = std(COLORS.skin, 0.55);
  const shirt = std(COLORS.shirt, 0.8);
  const shirtLight = std(COLORS.shirtLight, 0.8);
  const jeans = std(COLORS.jeans, 0.85);
  const jeansLight = std(COLORS.jeansLight, 0.85);
  const lathe = (pts: Array<[number, number]>) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 32);

  // --- Shirt (cropped, knotted at the waist)
  const torso = new THREE.Mesh(
    lathe([
      [0.001, 1.25],
      [0.165, 1.25],
      [0.172, 1.36],
      [0.182, 1.5],
      [0.198, 1.62],
      [0.214, 1.71],
      [0.19, 1.78],
      [0.09, 1.82],
      [0.001, 1.83],
    ]),
    shirt,
  );
  torso.scale.z = 0.72;
  const placket = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.46, 0.008), shirtLight);
  placket.position.set(0, 1.53, 0.133);
  placket.rotation.x = -0.05;
  const buttons: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), std(0xffffff, 0.3));
    b.position.set(0, 1.38 + i * 0.1, 0.139);
    buttons.push(b);
  }
  const collar: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const c = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.012, 0.075, 2, 0.005), shirtLight);
    c.position.set(side * 0.055, 1.79, 0.075);
    c.rotation.set(0.5, side * 0.5, side * -0.35);
    collar.push(c);
  }
  // The knot at the front of the waist, with two little tails
  const knot: THREE.Mesh[] = [];
  const knotCore = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), shirt);
  knotCore.scale.set(0.05, 0.04, 0.035);
  knotCore.position.set(0, 1.27, 0.12);
  knot.push(knotCore);
  for (const side of [-1, 1]) {
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.07, 4, 8), shirt);
    tail.position.set(side * 0.045, 1.21, 0.125);
    tail.rotation.z = side * 0.5;
    tail.scale.z = 0.6;
    knot.push(tail);
  }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.062, 0.2, 16), skin);
  neck.position.y = 1.86;
  body.add(torso, placket, ...buttons, ...collar, ...knot, neck);

  // --- Arms with short puffed sleeves (shoulder + elbow pivots)
  const sleeves: THREE.Mesh[] = [];
  const makeArm = (side: number) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.215, 1.72, 0);
    const sleeve = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), shirt);
    sleeve.scale.set(0.075, 0.11, 0.075);
    sleeve.position.y = -0.07;
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.064, 0.016, 8, 20), shirtLight);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -0.165;
    sleeves.push(sleeve, cuff);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.043, 0.22, 6, 10), skin);
    upper.position.y = -0.17;
    const elbow = new THREE.Group();
    elbow.position.y = -0.32;
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.038, 0.2, 6, 10), skin);
    fore.position.y = -0.13;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), skin);
    hand.scale.set(0.042, 0.058, 0.028);
    hand.position.y = -0.29;
    elbow.add(fore, hand);
    shoulder.add(upper, sleeve, cuff, elbow);
    body.add(shoulder);
    return { shoulder, elbow };
  };
  const right = makeArm(-1);
  const left = makeArm(1);

  // --- High-waisted light jeans, straight wide legs with rolled cuffs (hip + knee pivots)
  const waist = new THREE.Mesh(
    lathe([
      [0.168, 1.33],
      [0.178, 1.24],
      [0.198, 1.14],
      [0.205, 1.06],
      [0.19, 1.0],
      [0.001, 0.98],
    ]),
    jeans,
  );
  waist.scale.z = 0.76;
  const waistband = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.012, 6, 32), jeansLight);
  waistband.rotation.x = Math.PI / 2;
  waistband.scale.y = 0.76;
  waistband.position.y = 1.32;
  body.add(waist, waistband);
  const shoeMat = std(COLORS.shoes, 0.45);
  const soleMat = std(COLORS.soles, 0.6);
  const legParts: THREE.Object3D[] = [waist, waistband];
  const shoeParts: THREE.Object3D[] = [];
  const makeLeg = (side: number) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.1, HIP_Y, 0);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.098, 0.09, 0.5, 16), jeans);
    thigh.position.y = -0.25;
    const knee = new THREE.Group();
    knee.position.y = -0.5;
    const kneeCap = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), jeans);
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.4, 16), jeans);
    shin.position.y = -0.2;
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.106, 0.106, 0.05, 16), jeansLight);
    cuff.position.y = -0.39;
    const shoe = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.1, 0.26, 3, 0.045), shoeMat);
    shoe.position.set(0, -0.53, 0.045);
    const sole = new THREE.Mesh(new RoundedBoxGeometry(0.135, 0.03, 0.265, 2, 0.012), soleMat);
    sole.position.set(0, -0.565, 0.045);
    knee.add(kneeCap, shin, cuff, shoe, sole);
    hip.add(thigh, knee);
    body.add(hip);
    legParts.push(thigh, kneeCap, shin, cuff);
    shoeParts.push(shoe, sole);
    return { hip, knee };
  };
  const rightLeg = makeLeg(-1);
  const leftLeg = makeLeg(1);

  // --- Head
  const head = new THREE.Group();
  head.position.y = HEAD_Y;
  head.add(new THREE.Mesh(headGeometry(), skin));
  const eyes = buildFace(head, opts);
  const hair = buildHair(rand);
  head.add(hair);
  body.add(head);

  return {
    root,
    body,
    head,
    hair,
    eyes,
    armL: left.shoulder,
    armR: right.shoulder,
    forearmL: left.elbow,
    forearmR: right.elbow,
    legL: leftLeg.hip,
    legR: rightLeg.hip,
    shinL: leftLeg.knee,
    shinR: rightLeg.knee,
    outfit: {
      top: [torso, placket, ...buttons, ...collar, ...knot, ...sleeves],
      bottom: legParts,
      shoes: shoeParts,
      accessory: [],
    },
  };
}
