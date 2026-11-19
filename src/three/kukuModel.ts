import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { DEFAULT_OUTFIT, type Outfit } from '../lib/outfit';
import { dressKuku } from './clothes';

/**
 * 3D Kuku, chibi style, built entirely from code (no model files).
 * About 2.5 heads tall: a big round head with a painted face (large sparkly
 * brown eyes, blush, a small happy smile), her round glasses, a big cloud of
 * dark curly hair, and a short, soft body with stubby limbs.
 *
 * Units: feet at y = 0, about 2.35 units tall, facing +Z (towards the camera).
 * Clothes are separate layers (clothes.ts) so the wardrobe can swap them; they
 * follow the body measurements exported here.
 */

export interface KukuOptions {
  /** Her real-life glasses. */
  glasses?: boolean;
  /** What she's wearing (defaults to the outfit from her avatar). */
  outfit?: Outfit;
}

export const COLORS = {
  skin: 0xf2c6a2,
  skinShade: 0xe2a684,
  hairDeep: 0x170d08,
  hair: 0x3c2317,
  hairShine: 0x6e4630,
  glasses: 0x2a1c18,
};

// ---------------------------------------------------------------- measurements

/** Hip joint height: the car seat uses it to sit her down. */
export const HIP_Y = 0.62;
/** Knee joint, relative to the hip. */
export const KNEE_DROP = 0.26;
/** Ground, relative to the knee. */
export const FOOT_DROP = 0.36;
export const HEAD_Y = 1.65;
/** Head ellipsoid radii. */
export const HEAD = { rx: 0.43, ry: 0.42, rz: 0.41 };
/** Softer, narrower jaw: x shrinks a little towards the chin (unit-sphere y). */
const jaw = (uy: number) => (uy < 0 ? 1 - 0.13 * uy * uy : 1);
export const SHOULDER = { x: 0.2, y: 1.08 };
/** Elbow, relative to the shoulder; hand centre relative to the elbow. */
export const ELBOW_DROP = 0.2;
export const HAND_DROP = 0.19;
/** Front-to-back squash of the torso. */
export const BODY_DEPTH = 0.78;

/** Torso radius by height (bottom → top). */
const TORSO: Array<[number, number]> = [
  [0.5, 0.001],
  [0.515, 0.15],
  [0.56, 0.188],
  [0.66, 0.184],
  [0.78, 0.172],
  [0.9, 0.178],
  [1.0, 0.19],
  [1.08, 0.186],
  [1.15, 0.148],
  [1.19, 0.08],
  [1.2, 0.001],
];

export function torsoR(y: number) {
  if (y <= TORSO[0][0]) return TORSO[0][1];
  for (let i = 0; i < TORSO.length - 1; i++) {
    const [y0, r0] = TORSO[i];
    const [y1, r1] = TORSO[i + 1];
    if (y >= y0 && y <= y1) {
      const t = (y - y0) / (y1 - y0);
      const s = t * t * (3 - 2 * t);
      return r0 + (r1 - r0) * (0.5 * t + 0.5 * s);
    }
  }
  return TORSO[TORSO.length - 1][1];
}

/** Lathe profile hugging the torso from y0 up to y1, pushed out by `off` (bottom → top). */
export function torsoProfile(y0: number, y1: number, off: number, steps = 12): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= steps; i++) {
    const y = y0 + ((y1 - y0) * i) / steps;
    pts.push([torsoR(y) + off, y]);
  }
  return pts;
}

/** How far the front of the torso (plus `off`) sticks out at height y. */
export const frontZ = (y: number, off = 0) => (torsoR(y) + off) * BODY_DEPTH;

// ---------------------------------------------------------------- rig

export interface KukuRig {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  hair: THREE.Object3D;
  armL: THREE.Group;
  armR: THREE.Group;
  forearmL: THREE.Group;
  forearmR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  shinL: THREE.Group;
  shinR: THREE.Group;
  /** Close (true) or open (false) her eyes. */
  setEyesClosed(closed: boolean): void;
  /** Everything currently worn (removed and rebuilt by dressKuku). */
  clothes: THREE.Object3D[];
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

export const std = (color: number, roughness = 0.6, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, ...extra });

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ---------------------------------------------------------------- face

/** Area of the head the face texture covers (angles from straight ahead). */
const FACE = { halfWidth: 1.1, top: 0.62, height: 1.62, w: 560, h: 400 };
const EYE = { ax: 0.37, ay: -0.08 };

/** Point on the head surface at the given angles (head-local) and its outward normal. */
export function onHead(ax: number, ay: number, lift = 0) {
  const d = new THREE.Vector3(Math.sin(ax) * Math.cos(ay), Math.sin(ay), Math.cos(ax) * Math.cos(ay));
  const k = jaw(d.y);
  const pos = new THREE.Vector3(d.x * HEAD.rx * k, d.y * HEAD.ry, d.z * HEAD.rz);
  const normal = new THREE.Vector3(pos.x / (HEAD.rx * k) ** 2, pos.y / HEAD.ry ** 2, pos.z / HEAD.rz ** 2).normalize();
  pos.addScaledVector(normal, lift);
  return { pos, normal };
}

/** Paints her face (eyes, brows, blush, smile) onto a transparent canvas. */
function paintFace(closed: boolean) {
  const c = document.createElement('canvas');
  c.width = FACE.w;
  c.height = FACE.h;
  const g = c.getContext('2d')!;
  const px = (ax: number, ay: number): [number, number] => [
    ((ax + FACE.halfWidth) / (FACE.halfWidth * 2)) * FACE.w,
    ((FACE.top - ay) / FACE.height) * FACE.h,
  ];
  const ink = '#1d0f09';

  // Blush
  for (const side of [-1, 1]) {
    const [x, y] = px(side * 0.62, -0.31);
    const grd = g.createRadialGradient(x, y, 2, x, y, 40);
    grd.addColorStop(0, 'rgba(255,128,138,0.62)');
    grd.addColorStop(1, 'rgba(255,128,138,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.ellipse(x, y, 42, 27, 0, 0, Math.PI * 2);
    g.fill();
  }

  // Brows: short, soft and slightly raised (happy)
  for (const side of [-1, 1]) {
    const [x, y] = px(side * (EYE.ax + 0.02), 0.22);
    g.strokeStyle = 'rgba(52,28,18,0.92)';
    g.lineWidth = 7;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x - side * 20, y + 4);
    g.quadraticCurveTo(x + side * 2, y - 8, x + side * 22, y + 1);
    g.stroke();
  }

  for (const side of [-1, 1]) {
    const [x, y] = px(side * EYE.ax, EYE.ay);
    g.save();
    g.translate(x, y);
    if (closed) {
      // Happy closed eyes: ∩ arcs with a lash flick
      g.strokeStyle = ink;
      g.lineWidth = 8;
      g.lineCap = 'round';
      g.beginPath();
      g.arc(0, 18, 31, Math.PI * 1.12, Math.PI * 1.88);
      g.stroke();
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(side * 24, 4);
      g.lineTo(side * 34, -2);
      g.stroke();
    } else {
      // Big sparkly eye: white, glossy brown iris, dark pupil, two highlights
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.ellipse(0, 2, 35, 46, 0, 0, Math.PI * 2);
      g.fill();
      const iris = g.createLinearGradient(0, -34, 0, 40);
      iris.addColorStop(0, '#24120a');
      iris.addColorStop(0.55, '#5a3220');
      iris.addColorStop(1, '#a46a3c');
      g.fillStyle = iris;
      g.beginPath();
      g.ellipse(0, 6, 30, 41, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#120804';
      g.beginPath();
      g.ellipse(0, 8, 15, 21, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.ellipse(side * -10, -13, 11, 13, -0.3, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.arc(side * 11, 24, 5.5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.beginPath();
      g.ellipse(0, 28, 14, 6, 0, 0, Math.PI * 2);
      g.fill();
      // Upper lash line, thicker towards the outside, with two flicks
      g.strokeStyle = ink;
      g.lineCap = 'round';
      g.lineWidth = 7.5;
      g.beginPath();
      g.ellipse(0, 2, 35, 46, 0, Math.PI * 1.1, Math.PI * 1.9);
      g.stroke();
      g.lineWidth = 5;
      for (const [a, len] of [
        [-0.35, 12],
        [-0.05, 10],
      ]) {
        const ex = side * 35 * Math.cos(a);
        const ey = 2 + 46 * Math.sin(a) - 16;
        g.beginPath();
        g.moveTo(ex - side * 3, ey + 6);
        g.lineTo(ex + side * len, ey - len * 0.35);
        g.stroke();
      }
    }
    g.restore();
  }

  // Small happy smile, a little open
  const [mx, my] = px(0, -0.44);
  g.save();
  g.translate(mx, my);
  g.fillStyle = '#9e2f3c';
  g.beginPath();
  g.moveTo(-22, -3);
  g.quadraticCurveTo(0, 3, 22, -3);
  g.quadraticCurveTo(17, 24, 0, 25);
  g.quadraticCurveTo(-17, 24, -22, -3);
  g.fill();
  g.fillStyle = '#f07a8a';
  g.beginPath();
  g.ellipse(0, 17, 11, 6.5, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#7a2230';
  g.lineWidth = 3.5;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-23, -4);
  g.quadraticCurveTo(0, 2, 23, -4);
  g.stroke();
  g.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function buildHead(opts: KukuOptions, skin: THREE.Material) {
  const head = new THREE.Group();
  head.position.y = HEAD_Y;

  // The skull is a unit sphere squashed into her head shape, so the face decal
  // (a slightly bigger sphere patch inside the same group) follows it exactly.
  const skull = new THREE.Group();
  skull.scale.set(HEAD.rx, HEAD.ry, HEAD.rz);
  const shaped = <G extends THREE.BufferGeometry>(geo: G) => {
    const p = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      p.setX(i, p.getX(i) * jaw(y / Math.hypot(p.getX(i), y, p.getZ(i))));
    }
    geo.computeVertexNormals();
    return geo;
  };
  skull.add(new THREE.Mesh(shaped(new THREE.SphereGeometry(1, 48, 36)), skin));
  const open = paintFace(false);
  const closed = paintFace(true);
  const faceMat = new THREE.MeshStandardMaterial({
    map: open,
    transparent: true,
    roughness: 0.55,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const decal = new THREE.Mesh(
    shaped(new THREE.SphereGeometry(1.004, 48, 36, Math.PI / 2 - FACE.halfWidth, FACE.halfWidth * 2, Math.PI / 2 - FACE.top, FACE.height)),
    faceMat,
  );
  decal.renderOrder = 1;
  skull.add(decal);
  head.add(skull);

  // Little button nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), std(COLORS.skinShade, 0.5));
  const n = onHead(0, -0.24, -0.012);
  nose.position.copy(n.pos);
  nose.scale.set(0.032, 0.024, 0.024);
  head.add(nose);

  if (opts.glasses) head.add(buildGlasses());

  return {
    head,
    setEyesClosed(c: boolean) {
      const want = c ? closed : open;
      if (faceMat.map !== want) {
        faceMat.map = want;
        faceMat.needsUpdate = true;
      }
    },
  };
}

/** Her glasses: dark, softly rounded frames, drawn a little big (chibi style). */
function buildGlasses() {
  const g = new THREE.Group();
  const frameMat = std(COLORS.glasses, 0.3, { metalness: 0.15 });
  const lensMat = new THREE.MeshStandardMaterial({ color: 0xeaf6ff, roughness: 0.05, transparent: true, opacity: 0.12, depthWrite: false });
  const roundRect = <T extends THREE.Path>(shape: T, w: number, h: number, r: number) => {
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
  const W = 0.2;
  const H = 0.175;
  const rim = 0.013;
  const R = 0.075;
  const frameShape = roundRect(new THREE.Shape(), W, H, R);
  frameShape.holes.push(roundRect(new THREE.Path(), W - rim * 2, H - rim * 2, R - rim));
  const frameGeo = new THREE.ExtrudeGeometry(frameShape, { depth: 0.012, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 2, curveSegments: 10 });
  frameGeo.translate(0, 0, -0.008);
  const lensGeo = new THREE.ShapeGeometry(roundRect(new THREE.Shape(), W - rim * 2, H - rim * 2, R - rim));
  const fwd = new THREE.Vector3(0, 0, 1);
  for (const side of [-1, 1]) {
    const { pos, normal } = onHead(side * (EYE.ax + 0.01), EYE.ay + 0.01, 0.045);
    const lens = new THREE.Group();
    lens.add(new THREE.Mesh(frameGeo, frameMat), new THREE.Mesh(lensGeo, lensMat));
    lens.position.copy(pos);
    lens.quaternion.setFromUnitVectors(fwd, normal.clone().lerp(fwd, 0.55).normalize());
    g.add(lens);
    // Arm running back over the ear into her curls
    const temple = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.016, 0.3), frameMat);
    temple.position.set(side * (pos.x + W * 0.42), pos.y + 0.03, pos.z - 0.17);
    temple.rotation.y = side * 0.32;
    g.add(temple);
  }
  const bridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.07, 4, 8), frameMat);
  bridge.rotation.z = Math.PI / 2;
  bridge.position.copy(onHead(0, EYE.ay + 0.05, 0.045).pos);
  g.add(bridge);
  return g;
}

// ---------------------------------------------------------------- hair

/**
 * A big, soft cloud of curls: a sphere pushed into her hair shape, covered in
 * rounded bumps (each bump reads as a curl), with an opening for her face
 * that has a scalloped, curly fringe. Darker in the dips, lighter on the tops.
 */
let hairCache: THREE.Group | null = null;

/** The hair is the same for every copy of her (map + wardrobe), so it's built once and shared. */
function buildHair() {
  if (!hairCache) hairCache = makeHair(rng(11));
  return hairCache.clone();
}

const HAIR_SEG = { w: 150, h: 110 };

function makeHair(rand: () => number) {
  const geo = new THREE.SphereGeometry(1, HAIR_SEG.w, HAIR_SEG.h);
  geo.deleteAttribute('uv');

  const lumps: Array<{ d: THREE.Vector3; cos: number; rho: number; amp: number }> = [];
  for (let i = 0; i < 760; i++) {
    const z = rand() * 2 - 1;
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(1 - z * z);
    const rho = 0.12 + rand() * 0.08;
    lumps.push({ d: new THREE.Vector3(Math.cos(a) * r, z, Math.sin(a) * r), cos: Math.cos(rho), rho, amp: 0.24 * rho + rand() * 0.01 });
  }
  // Sorted by height so each point only checks the curls near it
  lumps.sort((a, b) => a.d.y - b.d.y);
  const lumpY = lumps.map((l) => l.d.y);
  const firstAbove = (y: number) => {
    let lo = 0;
    let hi = lumpY.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (lumpY[mid] < y) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };

  const center = new THREE.Vector3(0, 0.03, -0.05);
  const p = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(p.count * 3);
  const deep = new THREE.Color(COLORS.hairDeep);
  const mid = new THREE.Color(COLORS.hair);
  const shine = new THREE.Color(COLORS.hairShine);
  const col = new THREE.Color();
  const d = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    d.set(p.getX(i), p.getY(i), p.getZ(i)).normalize();
    // Curl bumps
    let bump = 0;
    for (let li = firstAbove(d.y - 0.21); li < lumps.length && lumpY[li] <= d.y + 0.21; li++) {
      const l = lumps[li];
      const dot = d.dot(l.d);
      if (dot <= l.cos) continue;
      const ang = Math.acos(Math.min(1, dot)) / l.rho;
      const v = l.amp * (1 - ang * ang) ** 2;
      if (v > bump) bump = v;
    }
    // Overall shape: round on top, fuller and falling to her shoulders below
    const below = Math.max(0, -d.y);
    const rxz = 0.54 * (1 + 0.16 * Math.sin(Math.min(1, below * 1.4) * Math.PI * 0.5));
    const ry = d.y > 0 ? 0.5 : 0.5 + 0.3 * below;
    const out = new THREE.Vector3(d.x * rxz, d.y * ry, d.z * rxz * 0.94).addScaledVector(d, bump);

    // Face opening (with a curly fringe on top and curly edges at the sides)
    const az = Math.atan2(d.x, d.z);
    const el = Math.asin(d.y);
    const fringe = 0.27 + Math.cos(az * 13) * 0.03 - Math.abs(az) * 0.06;
    const side = 0.96 + Math.cos(el * 11) * 0.06;
    let m = (1 - smooth(side - 0.05, side, Math.abs(az))) * (1 - smooth(fringe - 0.03, fringe + 0.01, el));
    m = Math.max(m, smooth(-0.95, -1.15, el)); // open underneath
    // tuck just behind the face surface so the hair edge is a short, soft rim
    const tuck = new THREE.Vector3(d.x * HEAD.rx * 0.97, d.y * HEAD.ry * 0.97, d.z * HEAD.rz * 0.97).sub(center);
    out.lerp(tuck, m).add(center);
    p.setXYZ(i, out.x, out.y, out.z);

    // Colour: dark in the dips between curls, glossy on top of each curl and on the crown
    const t = Math.min(1, bump / 0.035);
    col.copy(deep).lerp(mid, 0.45 + 0.55 * Math.min(1, t * 1.3));
    if (t > 0.7) col.lerp(shine, (t - 0.7) * 1.2 * (0.6 + 0.4 * Math.max(0, d.y)));
    col.lerp(deep, Math.min(1, m * 2.5)); // the inside rim around her face sits in shadow
    colors.set([col.r, col.g, col.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  // The sphere's seam column is duplicated: average its normals so no line shows
  const nrm = geo.attributes.normal as THREE.BufferAttribute;
  const n = new THREE.Vector3();
  for (let iy = 0; iy <= HAIR_SEG.h; iy++) {
    const a = iy * (HAIR_SEG.w + 1);
    const b = a + HAIR_SEG.w;
    n.set(nrm.getX(a) + nrm.getX(b), nrm.getY(a) + nrm.getY(b), nrm.getZ(a) + nrm.getZ(b)).normalize();
    nrm.setXYZ(a, n.x, n.y, n.z);
    nrm.setXYZ(b, n.x, n.y, n.z);
  }
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, side: THREE.DoubleSide });
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geo, material), buildFaceCurls(rand, material));
  return group;
}

/** One soft curl: a small bumpy ball, glossy on top, darker underneath. */
function curlGeometry(rand: () => number) {
  let geo: THREE.BufferGeometry = new THREE.SphereGeometry(1, 22, 16);
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');
  geo = mergeVertices(geo);
  const bumps = Array.from({ length: 7 }, () => new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize());
  const p = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(p.count * 3);
  const d = new THREE.Vector3();
  const col = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    d.set(p.getX(i), p.getY(i), p.getZ(i)).normalize();
    let b = 0;
    for (const v of bumps) b = Math.max(b, Math.max(0, d.dot(v) - 0.6) / 0.4);
    const r = 0.9 + 0.16 * b * b;
    p.setXYZ(i, d.x * r, d.y * r, d.z * r);
    col.set(COLORS.hairDeep).lerp(new THREE.Color(COLORS.hair), 0.55 + 0.45 * Math.max(0, d.y * 0.5 + d.z * 0.5));
    if (b > 0.6) col.lerp(new THREE.Color(COLORS.hairShine), (b - 0.6) * 1.2);
    colors.set([col.r, col.g, col.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

/** Curly bangs across her forehead and curls framing her face (they also hide the hair's inner edge). */
function buildFaceCurls(rand: () => number, material: THREE.Material) {
  const spots: Array<{ ax: number; ay: number; s: number; lift: number }> = [];
  for (let i = 0; i < 13; i++) {
    const ax = -0.92 + (i / 12) * 1.84;
    spots.push({ ax, ay: 0.33 - Math.abs(ax) * 0.1 + (rand() - 0.5) * 0.04, s: 0.075 + rand() * 0.012, lift: 0.85 });
  }
  for (const side of [-1, 1]) {
    for (let j = 0; j < 7; j++) {
      const ay = 0.28 - j * 0.14;
      spots.push({ ax: side * (0.97 - j * 0.015), ay, s: 0.08 + rand() * 0.012 + j * 0.003, lift: 0.35 });
    }
  }
  const mesh = new THREE.InstancedMesh(curlGeometry(rand), material, spots.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  spots.forEach(({ ax, ay, s, lift }, i) => {
    const { pos } = onHead(ax, ay, s * lift);
    q.setFromEuler(new THREE.Euler((rand() - 0.5) * 0.6, (rand() - 0.5) * 0.6, rand() * Math.PI * 2));
    m.compose(pos, q, new THREE.Vector3(s, s * 1.08, s * 0.9));
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

// ---------------------------------------------------------------- body

/**
 * Builds Kuku: base body (skin), head with face, glasses and hair, then dresses her.
 * Clothing lives in clothes.ts and can be swapped any time with dressKuku().
 */
export function buildKuku(opts: KukuOptions = {}): KukuRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const skin = std(COLORS.skin, 0.55);

  // Torso (clothes sit just outside it)
  const torso = new THREE.Mesh(new THREE.LatheGeometry(torsoProfile(0.5, 1.2, 0, 20).map(([r, y]) => new THREE.Vector2(r, y)), 32), skin);
  torso.scale.z = BODY_DEPTH;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.078, 0.2, 16), skin);
  neck.position.y = 1.26;
  body.add(torso, neck);

  // Stubby arms (shoulder + elbow pivots) with round mitten hands
  const makeArm = (side: number) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * SHOULDER.x, SHOULDER.y, 0);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.056, 0.13, 6, 12), skin);
    upper.position.y = -0.1;
    const elbow = new THREE.Group();
    elbow.position.y = -ELBOW_DROP;
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.1, 6, 12), skin);
    fore.position.y = -0.08;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.066, 16, 12), skin);
    hand.scale.set(1, 1.05, 0.85);
    hand.position.y = -HAND_DROP;
    elbow.add(fore, hand);
    shoulder.add(upper, elbow);
    body.add(shoulder);
    return { shoulder, elbow };
  };
  const right = makeArm(-1);
  const left = makeArm(1);

  // Short legs (hip + knee pivots) with bare feet underneath the shoes
  const makeLeg = (side: number) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.095, HIP_Y, 0);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.13, 6, 12), skin);
    thigh.position.y = -0.12;
    const knee = new THREE.Group();
    knee.position.y = -KNEE_DROP;
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.16, 6, 12), skin);
    shin.position.y = -0.13;
    const foot = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), skin);
    foot.scale.set(0.075, 0.06, 0.11);
    foot.position.set(0, -FOOT_DROP + 0.06, 0.03);
    knee.add(shin, foot);
    hip.add(thigh, knee);
    body.add(hip);
    return { hip, knee };
  };
  const rightLeg = makeLeg(-1);
  const leftLeg = makeLeg(1);

  // Head, face, glasses and hair
  const { head, setEyesClosed } = buildHead(opts, skin);
  const hair = buildHair();
  head.add(hair);
  body.add(head);

  const rig: KukuRig = {
    root,
    body,
    head,
    hair,
    armL: left.shoulder,
    armR: right.shoulder,
    forearmL: left.elbow,
    forearmR: right.elbow,
    legL: leftLeg.hip,
    legR: rightLeg.hip,
    shinL: leftLeg.knee,
    shinR: rightLeg.knee,
    setEyesClosed,
    clothes: [],
  };
  dressKuku(rig, opts.outfit ?? DEFAULT_OUTFIT);
  return rig;
}
