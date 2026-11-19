import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * 3D chibi Kuku, built entirely from code (no model files).
 * Locked likeness: big cloud of tight dark curls, black rectangular glasses,
 * warm tan skin, big smile with red-coral lips. Default outfit: white ribbed
 * square-neck tank with a lace flower on her right strap, dainty gold necklace,
 * dark trousers, white sneakers.
 *
 * Units: feet at y = 0, about 2.5 units tall, facing +Z (towards the camera).
 * Outfit meshes are kept separate so the Phase 5 wardrobe can recolor/swap them.
 */

export const COLORS = {
  skin: 0xf2c09a,
  skinShade: 0xe3a37c,
  hair: 0xffffff, // instance colors carry the real hair tones
  lips: 0xd8454f,
  mouth: 0x7d1d2a,
  eye: 0x3b2418,
  brow: 0x1c110c,
  glasses: 0x151515,
  tank: 0xf8f4ec,
  trousers: 0x2b2833,
  gold: 0xe3b04b,
  shoes: 0xffffff,
  soles: 0xd9d4cc,
  blush: 0xf19a8f,
};

const HEAD_Y = 1.42;
const HEAD_R = 0.58;
const HEAD_SCALE = new THREE.Vector3(1, 1.04, 0.95);

export interface KukuRig {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  hair: THREE.Group;
  eyes: THREE.Group[];
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  /** Meshes by outfit layer, for the wardrobe. */
  outfit: { top: THREE.Mesh[]; bottom: THREE.Mesh[]; shoes: THREE.Mesh[]; accessory: THREE.Object3D[] };
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

/** Point on the head surface (head-local coords) plus its outward normal. */
function onFace(x: number, y: number, lift = 0) {
  const ux = x / (HEAD_R * HEAD_SCALE.x);
  const uy = y / (HEAD_R * HEAD_SCALE.y);
  const uz = Math.sqrt(Math.max(0, 1 - ux * ux - uy * uy));
  const normal = new THREE.Vector3(ux / HEAD_SCALE.x, uy / HEAD_SCALE.y, uz / HEAD_SCALE.z).normalize();
  const pos = new THREE.Vector3(x, y, uz * HEAD_R * HEAD_SCALE.z).addScaledVector(normal, lift);
  return { pos, normal };
}

function placeOnFace(obj: THREE.Object3D, x: number, y: number, lift = 0) {
  const { pos, normal } = onFace(x, y, lift);
  obj.position.copy(pos);
  obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  return obj;
}

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** A lumpy sphere so each curl reads as a curl, not a ball. */
function curlGeometry() {
  // Merge the icosphere's duplicate vertices first so the curls shade smoothly (not faceted)
  const g = mergeVertices(new THREE.IcosahedronGeometry(1, 2).deleteAttribute('normal').deleteAttribute('uv'));
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = 1 + 0.1 * Math.sin(v.x * 7.1) * Math.sin(v.y * 6.3 + 1) * Math.sin(v.z * 6.7 + 2);
    v.multiplyScalar(n);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Vertical rib stripes for the tank top (used as a bump map). */
function ribTexture() {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 4;
  const ctx = c.getContext('2d')!;
  for (let x = 0; x < 32; x++) {
    const v = 128 + 110 * Math.sin((x / 32) * Math.PI * 2 * 4);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, 0, 1, 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 1);
  return t;
}

/** Overall afro shape: rounded on top, flaring out at the jaw, ending at the shoulders. Head-local coords. */
function hairSurface(d: THREE.Vector3) {
  const flare = d.y < 0 ? 1 + 0.3 * -d.y : 1;
  return new THREE.Vector3(d.x * 0.76 * flare, d.y * 0.7 + 0.1, d.z * 0.68 - 0.15);
}

function buildHair(rand: () => number) {
  const group = new THREE.Group();

  // 1) Solid volume underneath so there are never gaps between curls
  const baseGeo = new THREE.SphereGeometry(1, 48, 32);
  const bp = baseGeo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < bp.count; i++) {
    v.fromBufferAttribute(bp, i);
    const bump = 1 + 0.04 * Math.sin(v.x * 9) * Math.sin(v.y * 8 + 1) * Math.sin(v.z * 9 + 2);
    const p = hairSurface(v.clone().multiplyScalar(bump));
    bp.setXYZ(i, p.x, p.y, p.z);
  }
  baseGeo.computeVertexNormals();
  group.add(new THREE.Mesh(baseGeo, std(0x2a1911, 0.6)));

  // 2) Small lumpy curls over the surface for the tight-curl texture
  const placements: Array<{ p: THREE.Vector3; n: THREE.Vector3; s: number }> = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const N = 520;
  for (let i = 0; i < N; i++) {
    const y = 1 - (2 * (i + 0.5)) / N;
    const r = Math.sqrt(1 - y * y);
    const d = new THREE.Vector3(Math.cos(i * golden) * r, y, Math.sin(i * golden) * r);
    const p = hairSurface(d);
    if (d.z > 0.25 && p.y < 0.36 && Math.abs(p.x) < 0.56) continue; // face stays clear
    if (d.y < -0.85) continue; // underside, never seen
    const n = p.clone().sub(new THREE.Vector3(0, 0.1, -0.15)).normalize();
    p.addScaledVector(n, 0.02 + rand() * 0.02);
    placements.push({ p, n, s: 0.075 + rand() * 0.035 });
  }
  // Curly fringe across the forehead
  for (let i = 0; i < 12; i++) {
    const x = -0.48 + (i / 11) * 0.96;
    const y = 0.4 + 0.08 * (1 - (x / 0.5) ** 2) + (rand() - 0.5) * 0.04;
    const { pos, normal } = onFace(x * 0.95, Math.min(y, 0.5), 0.02);
    placements.push({ p: pos, n: normal, s: 0.1 + rand() * 0.035 });
  }
  // Curls framing her cheeks down to the jaw
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const y = 0.16 - i * 0.13;
      const p = new THREE.Vector3(side * (0.6 + i * 0.03 + rand() * 0.03), y, 0.1 - i * 0.03);
      placements.push({ p, n: new THREE.Vector3(side, 0, 0.4).normalize(), s: 0.11 + rand() * 0.035 });
    }
  }

  const mesh = new THREE.InstancedMesh(curlGeometry(), std(COLORS.hair, 0.42, { metalness: 0.05 }), placements.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const spin = new THREE.Quaternion();
  const zAxis = new THREE.Vector3(0, 0, 1);
  const tones = [0x2a1911, 0x301d14, 0x372117, 0x3e261a, 0x281710];
  placements.forEach(({ p, n, s }, i) => {
    q.setFromUnitVectors(zAxis, n);
    spin.setFromAxisAngle(zAxis, rand() * Math.PI * 2);
    q.multiply(spin);
    m.compose(p, q, new THREE.Vector3(s, s, s * 0.7));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, new THREE.Color(tones[Math.floor(rand() * tones.length)]));
  });
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
  return group;
}

function buildFace(head: THREE.Group) {
  const eyes: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.085, 20, 16), std(0xffffff, 0.3));
    sclera.scale.set(1, 1.15, 0.45);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.058, 20, 16), std(COLORS.eye, 0.25));
    iris.scale.set(1, 1.12, 0.5);
    iris.position.z = 0.03;
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), std(0xffffff, 0.1, { emissive: 0xffffff, emissiveIntensity: 0.6 }));
    glint.position.set(0.02, 0.025, 0.06);
    const lash = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.013, 6, 18, Math.PI), std(COLORS.brow, 0.5));
    lash.scale.set(1, 1.1, 1);
    lash.position.z = 0.02;
    eye.add(sclera, iris, glint, lash);
    placeOnFace(eye, side * 0.2, 0.03, 0.0);
    head.add(eye);
    eyes.push(eye);

    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.12, 4, 8), std(COLORS.brow, 0.6));
    placeOnFace(brow, side * 0.2, 0.23, 0.02);
    brow.rotateZ(Math.PI / 2 - side * 0.12);
    head.add(brow);

    const blush = new THREE.Mesh(
      new THREE.CircleGeometry(0.075, 20),
      new THREE.MeshBasicMaterial({ color: COLORS.blush, transparent: true, opacity: 0.45, depthWrite: false }),
    );
    placeOnFace(blush, side * 0.33, -0.15, 0.006);
    head.add(blush);
  }

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), std(COLORS.skinShade, 0.55));
  nose.scale.set(1, 0.8, 0.8);
  placeOnFace(nose, 0, -0.1, -0.01);
  head.add(nose);

  // Big warm smile: dark mouth, teeth, coral lips
  const smile = new THREE.Group();
  const mouthShape = new THREE.Shape();
  mouthShape.moveTo(-0.15, 0);
  mouthShape.quadraticCurveTo(0, -0.2, 0.15, 0);
  mouthShape.quadraticCurveTo(0, 0.025, -0.15, 0);
  const mouth = new THREE.Mesh(new THREE.ShapeGeometry(mouthShape, 16), std(COLORS.mouth, 0.5));
  const teethShape = new THREE.Shape();
  teethShape.moveTo(-0.125, 0.0);
  teethShape.quadraticCurveTo(0, -0.075, 0.125, 0.0);
  teethShape.quadraticCurveTo(0, 0.02, -0.125, 0.0);
  const teeth = new THREE.Mesh(new THREE.ShapeGeometry(teethShape, 16), std(0xffffff, 0.3));
  teeth.position.z = 0.002;
  const lipMat = std(COLORS.lips, 0.35);
  const lower = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.155, 0, 0), new THREE.Vector3(0, -0.215, 0), new THREE.Vector3(0.155, 0, 0)),
      16,
      0.022,
      6,
    ),
    lipMat,
  );
  const upper = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.155, 0, 0), new THREE.Vector3(0, 0.035, 0), new THREE.Vector3(0.155, 0, 0)),
      12,
      0.017,
      6,
    ),
    lipMat,
  );
  smile.add(mouth, teeth, lower, upper);
  placeOnFace(smile, 0, -0.24, 0.015);
  head.add(smile);

  // Glasses: dark rounded-rectangle frames with faint lenses
  const frameShape = roundedRect(0.29, 0.21, 0.06);
  frameShape.holes.push(roundedRect(0.23, 0.15, 0.04) as unknown as THREE.Path);
  const frameGeo = new THREE.ExtrudeGeometry(frameShape, { depth: 0.025, bevelEnabled: false, curveSegments: 6 });
  frameGeo.translate(0, 0, -0.0125);
  const frameMat = std(COLORS.glasses, 0.3, { metalness: 0.2 });
  const lensMat = new THREE.MeshStandardMaterial({ color: 0xd9eeff, roughness: 0.05, transparent: true, opacity: 0.18, depthWrite: false });
  for (const side of [-1, 1]) {
    const lens = new THREE.Group();
    lens.add(new THREE.Mesh(frameGeo, frameMat));
    lens.add(new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(0.235, 0.155, 0.04)), lensMat));
    placeOnFace(lens, side * 0.2, 0.03, 0.075);
    head.add(lens);
    const temple = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.024, 0.45), frameMat);
    temple.position.set(side * 0.37, 0.05, 0.12);
    temple.rotation.y = side * 0.12;
    head.add(temple);
  }
  const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.12, 8), frameMat);
  bridge.rotation.z = Math.PI / 2;
  bridge.position.copy(onFace(0, 0.06, 0.085).pos);
  head.add(bridge);

  return eyes;
}

export function buildKuku(): KukuRig {
  const rand = rng(7);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const skin = std(COLORS.skin, 0.55);
  const tankMat = std(COLORS.tank, 0.75, { bumpMap: ribTexture(), bumpScale: 0.6 });
  const trousersMat = std(COLORS.trousers, 0.8);
  const goldMat = std(COLORS.gold, 0.3, { metalness: 0.85 });

  // --- torso: skin shoulders/chest above a square-neck ribbed tank
  const torsoProfile = (pts: Array<[number, number]>) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 32);
  const chest = new THREE.Mesh(
    torsoProfile([
      [0.3, 0.77],
      [0.315, 0.82],
      [0.28, 0.9],
      [0.13, 0.95],
      [0.001, 0.96],
    ]),
    skin,
  );
  chest.scale.z = 0.72;
  const tank = new THREE.Mesh(
    torsoProfile([
      [0.001, 0.41],
      [0.25, 0.41],
      [0.272, 0.5],
      [0.262, 0.62],
      [0.292, 0.72],
      [0.305, 0.785],
      [0.001, 0.785],
    ]),
    tankMat,
  );
  tank.scale.z = 0.74;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.11, 0.22, 16), skin);
  neck.position.y = 0.95;
  body.add(chest, tank, neck);

  // Straps
  const straps: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const strap = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.16, 0.45, 2, 0.02), tankMat);
    strap.position.set(side * 0.17, 0.83, 0);
    straps.push(strap);
    body.add(strap);
  }

  // Lace flower on her right strap (viewer's left)
  const flower = new THREE.Group();
  const petalMat = std(0xffffff, 0.8);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.034, 10, 8), petalMat);
    petal.scale.set(1, 1, 0.45);
    petal.position.set(Math.cos(a) * 0.04, Math.sin(a) * 0.04, 0);
    flower.add(petal);
  }
  const centre = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), std(0xf3ead6, 0.7));
  centre.position.z = 0.015;
  flower.add(centre);
  for (let i = 0; i < 3; i++) {
    const bit = new THREE.Mesh(new THREE.SphereGeometry(0.022 - i * 0.004, 8, 6), petalMat);
    bit.scale.z = 0.5;
    bit.position.set(-0.03 + i * 0.01, -0.07 - i * 0.04, -0.01);
    flower.add(bit);
  }
  flower.position.set(-0.17, 0.82, 0.215);
  flower.rotation.x = -0.25;
  body.add(flower);

  // Dainty gold necklace with a little white pendant
  const necklace = new THREE.Group();
  const chain = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.006, 6, 40, Math.PI), goldMat);
  chain.rotation.z = Math.PI;
  necklace.add(chain);
  const pendant = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 10), std(0xffffff, 0.15, { metalness: 0.1 }));
  pendant.position.set(0, -0.155, 0.01);
  const setting = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.006, 6, 16), goldMat);
  setting.position.copy(pendant.position);
  necklace.add(pendant, setting);
  necklace.position.set(0, 0.95, 0.16);
  necklace.rotation.x = -0.45;
  body.add(necklace);

  // --- arms (pivot at the shoulder)
  const makeArm = (side: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.33, 0.85, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.34, 6, 12), skin);
    arm.position.y = -0.22;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 12), skin);
    hand.position.y = -0.45;
    pivot.add(arm, hand);
    pivot.rotation.z = side * 0.12;
    body.add(pivot);
    return pivot;
  };
  const armR = makeArm(-1);
  const armL = makeArm(1);

  // --- hips and legs (pivot at the hip)
  const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.25, 0.14, 24), trousersMat);
  hips.scale.z = 0.74;
  hips.position.y = 0.42;
  body.add(hips);
  const shoeMat = std(COLORS.shoes, 0.5);
  const soleMat = std(COLORS.soles, 0.7);
  const legMeshes: THREE.Mesh[] = [hips];
  const shoeMeshes: THREE.Mesh[] = [];
  const makeLeg = (side: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.125, 0.38, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.2, 6, 12), trousersMat);
    leg.position.y = -0.16;
    const shoe = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.12, 0.3, 3, 0.05), shoeMat);
    shoe.position.set(0, -0.32, 0.04);
    const sole = new THREE.Mesh(new RoundedBoxGeometry(0.21, 0.04, 0.31, 2, 0.015), soleMat);
    sole.position.set(0, -0.375, 0.04);
    pivot.add(leg, shoe, sole);
    body.add(pivot);
    legMeshes.push(leg);
    shoeMeshes.push(shoe, sole);
    return pivot;
  };
  const legR = makeLeg(-1);
  const legL = makeLeg(1);

  // --- head
  const head = new THREE.Group();
  head.position.y = HEAD_Y;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R, 40, 32), skin);
  skull.scale.copy(HEAD_SCALE);
  head.add(skull);
  const eyes = buildFace(head);
  const hair = buildHair(rand);
  head.add(hair);
  body.add(head);

  return {
    root,
    body,
    head,
    hair,
    eyes,
    armL,
    armR,
    legL,
    legR,
    outfit: { top: [tank, ...straps], bottom: legMeshes, shoes: shoeMeshes, accessory: [necklace, flower] },
  };
}
