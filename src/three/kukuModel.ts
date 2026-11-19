import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * 3D chibi Kuku, built entirely from code (no model files), styled to be cute:
 * big round head, short rounded body, big glossy eyes set low on the face,
 * soft blush, small happy smile.
 *
 * Locked likeness: big cloud of tight dark-brown curls, dark rectangular-ish
 * glasses, warm tan skin, smile with coral lips. Default outfit: white ribbed
 * square-neck tank with a lace flower on her right strap, dainty gold necklace,
 * dark trousers, white sneakers.
 *
 * Units: feet at y = 0, about 2.2 units tall, facing +Z (towards the camera).
 * Outfit meshes are kept separate so the Phase 5 wardrobe can recolor/swap them.
 */

export const COLORS = {
  skin: 0xf6c9a4,
  skinShade: 0xeab08a,
  hair: 0xffffff, // instance colors carry the real hair tones
  hairBase: 0x24150f,
  lips: 0xe2505c,
  mouth: 0x9a2f3f,
  tongue: 0xf07a86,
  eye: 0x2b1a12,
  brow: 0x4a2c1e,
  glasses: 0x231a18,
  tank: 0xfbf8f2,
  trousers: 0x34303f,
  gold: 0xe9b850,
  shoes: 0xffffff,
  soles: 0xf0d6de,
  blush: 0xff8f9a,
};

/** Hip height: the car seat uses this to sit her down. */
export const HIP_Y = 0.34;
const HEAD_Y = 1.28;
const HEAD_R = 0.62;
const HEAD_SCALE = new THREE.Vector3(1.06, 0.98, 0.95);

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

/** A softly lumpy sphere so each curl reads as a curl, not a ball. */
function curlGeometry() {
  // Merge the icosphere's duplicate vertices first so the curls shade smoothly (not faceted)
  const g = mergeVertices(new THREE.IcosahedronGeometry(1, 2).deleteAttribute('normal').deleteAttribute('uv'));
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = 1 + 0.08 * Math.sin(v.x * 7.1) * Math.sin(v.y * 6.3 + 1) * Math.sin(v.z * 6.7 + 2);
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
    const v = 128 + 100 * Math.sin((x / 32) * Math.PI * 2 * 4);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, 0, 1, 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 1);
  return t;
}

// ---------------------------------------------------------------- hair

const HAIR_CENTER = new THREE.Vector3(0, 0.12, -0.17);

/** Overall afro shape: round and fluffy on top, flaring a little at the jaw, ending at the shoulders. */
function hairSurface(d: THREE.Vector3) {
  const flare = d.y < 0 ? 1 + 0.22 * -d.y : 1;
  return new THREE.Vector3(d.x * 0.76 * flare, d.y * 0.68, d.z * 0.66).add(HAIR_CENTER);
}

function buildHair(rand: () => number) {
  const group = new THREE.Group();

  // 1) Solid volume underneath so there are never gaps between curls
  const baseGeo = new THREE.SphereGeometry(1, 48, 32);
  const bp = baseGeo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < bp.count; i++) {
    v.fromBufferAttribute(bp, i);
    const bump = 1 + 0.035 * Math.sin(v.x * 9) * Math.sin(v.y * 8 + 1) * Math.sin(v.z * 9 + 2);
    const p = hairSurface(v.clone().multiplyScalar(bump));
    bp.setXYZ(i, p.x, p.y, p.z);
  }
  baseGeo.computeVertexNormals();
  group.add(new THREE.Mesh(baseGeo, std(COLORS.hairBase, 0.55)));

  // 2) Small soft curls over the surface for the tight-curl texture
  const placements: Array<{ p: THREE.Vector3; n: THREE.Vector3; s: number }> = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const N = 480;
  for (let i = 0; i < N; i++) {
    const y = 1 - (2 * (i + 0.5)) / N;
    const r = Math.sqrt(1 - y * y);
    const d = new THREE.Vector3(Math.cos(i * golden) * r, y, Math.sin(i * golden) * r);
    const p = hairSurface(d);
    if (d.z > 0.2 && p.y < 0.34 && Math.abs(p.x) < 0.6) continue; // keep her face open
    if (d.y < -0.85) continue; // underside, never seen
    const n = p.clone().sub(HAIR_CENTER).normalize();
    p.addScaledVector(n, 0.015 + rand() * 0.02);
    placements.push({ p, n, s: 0.075 + rand() * 0.035 });
  }
  // A few soft curls along the hairline (forehead stays visible)
  for (let i = 0; i < 9; i++) {
    const x = -0.44 + (i / 8) * 0.88;
    const y = 0.43 + 0.06 * (1 - (x / 0.46) ** 2) + (rand() - 0.5) * 0.03;
    const { pos, normal } = onFace(x, Math.min(y, 0.54), 0.03);
    placements.push({ p: pos, n: normal, s: 0.085 + rand() * 0.03 });
  }
  // Curls framing her round cheeks
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const y = 0.12 - i * 0.14;
      const p = new THREE.Vector3(side * (0.66 + i * 0.025 + rand() * 0.02), y, 0.04 - i * 0.04);
      placements.push({ p, n: new THREE.Vector3(side, 0, 0.35).normalize(), s: 0.1 + rand() * 0.03 });
    }
  }

  const mesh = new THREE.InstancedMesh(curlGeometry(), std(COLORS.hair, 0.38, { metalness: 0.04 }), placements.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const spin = new THREE.Quaternion();
  const zAxis = new THREE.Vector3(0, 0, 1);
  const tones = [0x2a1811, 0x321d14, 0x3a2218, 0x43281c, 0x26150f];
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

// ---------------------------------------------------------------- face

function buildFace(head: THREE.Group) {
  const eyes: THREE.Group[] = [];
  const shine = std(0xffffff, 0.1, { emissive: 0xffffff, emissiveIntensity: 0.9 });
  for (const side of [-1, 1]) {
    // Big glossy kawaii eyes, set low and wide
    const eye = new THREE.Group();
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 18), std(COLORS.eye, 0.12));
    iris.scale.set(0.92, 1.18, 0.42);
    const ring = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 16), std(0x5a3624, 0.15));
    ring.scale.set(0.9, 1.1, 0.3);
    ring.position.set(0, -0.025, 0.02);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), std(0x140c08, 0.1));
    pupil.scale.set(0.9, 1.1, 0.3);
    pupil.position.set(0, -0.01, 0.03);
    const big = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), shine);
    big.position.set(side * -0.025 + 0.012, 0.045, 0.05);
    const small = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), shine);
    small.position.set(0.03, -0.05, 0.05);
    // A little lash flick at the outer corner
    const lash = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.045, 4, 6), std(COLORS.eye, 0.5));
    lash.position.set(side * 0.085, 0.085, 0.02);
    lash.rotation.z = side * -0.9;
    eye.add(iris, ring, pupil, big, small, lash);
    placeOnFace(eye, side * 0.225, -0.04, 0.0);
    head.add(eye);
    eyes.push(eye);

    // Soft, happy arched brows
    const brow = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.016, 6, 16, Math.PI * 0.7), std(COLORS.brow, 0.6));
    placeOnFace(brow, side * 0.23, 0.17, 0.02);
    brow.rotateZ(Math.PI * 0.15);
    head.add(brow);

    // Round rosy cheeks
    const blush = new THREE.Mesh(
      new THREE.CircleGeometry(0.1, 24),
      new THREE.MeshBasicMaterial({ color: COLORS.blush, transparent: true, opacity: 0.5, depthWrite: false }),
    );
    blush.scale.y = 0.75;
    placeOnFace(blush, side * 0.37, -0.2, 0.008);
    head.add(blush);
  }

  // Tiny button nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.032, 14, 10), std(COLORS.skinShade, 0.55));
  nose.scale.set(1.2, 0.8, 0.7);
  placeOnFace(nose, 0, -0.15, -0.005);
  head.add(nose);

  // Small, happy open smile with coral lips
  const smile = new THREE.Group();
  const mouthShape = new THREE.Shape();
  mouthShape.moveTo(-0.105, 0);
  mouthShape.quadraticCurveTo(0, -0.16, 0.105, 0);
  mouthShape.quadraticCurveTo(0, 0.015, -0.105, 0);
  const mouth = new THREE.Mesh(new THREE.ShapeGeometry(mouthShape, 16), std(COLORS.mouth, 0.5));
  const tongueShape = new THREE.Shape();
  tongueShape.moveTo(-0.055, -0.055);
  tongueShape.quadraticCurveTo(0, -0.125, 0.055, -0.055);
  tongueShape.quadraticCurveTo(0, -0.035, -0.055, -0.055);
  const tongue = new THREE.Mesh(new THREE.ShapeGeometry(tongueShape, 12), std(COLORS.tongue, 0.5));
  tongue.position.z = 0.002;
  const teethShape = new THREE.Shape();
  teethShape.moveTo(-0.088, -0.003);
  teethShape.quadraticCurveTo(0, -0.05, 0.088, -0.003);
  teethShape.quadraticCurveTo(0, 0.01, -0.088, -0.003);
  const teeth = new THREE.Mesh(new THREE.ShapeGeometry(teethShape, 12), std(0xffffff, 0.3));
  teeth.position.z = 0.003;
  const lip = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.11, 0.004, 0), new THREE.Vector3(0, -0.172, 0), new THREE.Vector3(0.11, 0.004, 0)),
      16,
      0.017,
      6,
    ),
    std(COLORS.lips, 0.35),
  );
  smile.add(mouth, tongue, teeth, lip);
  placeOnFace(smile, 0, -0.27, 0.012);
  head.add(smile);

  // Glasses: thin, softly rounded rectangles (light enough not to hide her eyes)
  const frameShape = roundedRect(0.33, 0.27, 0.1);
  frameShape.holes.push(roundedRect(0.29, 0.23, 0.08) as unknown as THREE.Path);
  const frameGeo = new THREE.ExtrudeGeometry(frameShape, { depth: 0.02, bevelEnabled: false, curveSegments: 8 });
  frameGeo.translate(0, 0, -0.01);
  const frameMat = std(COLORS.glasses, 0.35, { metalness: 0.15 });
  const lensMat = new THREE.MeshStandardMaterial({ color: 0xe6f4ff, roughness: 0.05, transparent: true, opacity: 0.12, depthWrite: false });
  for (const side of [-1, 1]) {
    const lens = new THREE.Group();
    lens.add(new THREE.Mesh(frameGeo, frameMat));
    lens.add(new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(0.29, 0.23, 0.08)), lensMat));
    placeOnFace(lens, side * 0.225, -0.03, 0.07);
    head.add(lens);
    const temple = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.018, 0.45), frameMat);
    temple.position.set(side * 0.42, 0.0, 0.1);
    temple.rotation.y = side * 0.14;
    head.add(temple);
  }
  const bridge = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.009, 6, 12, Math.PI), frameMat);
  bridge.position.copy(onFace(0, 0.0, 0.08).pos);
  head.add(bridge);

  return eyes;
}

// ---------------------------------------------------------------- body

export function buildKuku(): KukuRig {
  const rand = rng(7);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const skin = std(COLORS.skin, 0.55);
  const tankMat = std(COLORS.tank, 0.75, { bumpMap: ribTexture(), bumpScale: 0.5 });
  const trousersMat = std(COLORS.trousers, 0.8);
  const goldMat = std(COLORS.gold, 0.3, { metalness: 0.85 });

  // Short, rounded torso: skin shoulders above a square-neck ribbed tank
  const lathe = (pts: Array<[number, number]>) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 32);
  const chest = new THREE.Mesh(
    lathe([
      [0.27, 0.65],
      [0.28, 0.7],
      [0.23, 0.77],
      [0.1, 0.81],
      [0.001, 0.82],
    ]),
    skin,
  );
  chest.scale.z = 0.8;
  const tank = new THREE.Mesh(
    lathe([
      [0.001, 0.32],
      [0.22, 0.32],
      [0.255, 0.4],
      [0.255, 0.52],
      [0.272, 0.61],
      [0.275, 0.655],
      [0.001, 0.655],
    ]),
    tankMat,
  );
  tank.scale.z = 0.8;
  body.add(chest, tank);

  // Straps
  const straps: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const strap = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.12, 0.44, 2, 0.02), tankMat);
    strap.position.set(side * 0.15, 0.7, 0);
    straps.push(strap);
    body.add(strap);
  }

  // Lace flower on her right strap (viewer's left)
  const flower = new THREE.Group();
  const petalMat = std(0xffffff, 0.8);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), petalMat);
    petal.scale.set(1, 1, 0.45);
    petal.position.set(Math.cos(a) * 0.036, Math.sin(a) * 0.036, 0);
    flower.add(petal);
  }
  const centre = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), std(0xf6e7c8, 0.7));
  centre.position.z = 0.015;
  flower.add(centre);
  flower.position.set(-0.15, 0.69, 0.22);
  flower.rotation.x = -0.25;
  body.add(flower);

  // Dainty gold necklace with a little white pendant
  const necklace = new THREE.Group();
  const chain = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.006, 6, 40, Math.PI), goldMat);
  chain.rotation.z = Math.PI;
  necklace.add(chain);
  const pendant = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 10), std(0xffffff, 0.15, { metalness: 0.1 }));
  pendant.position.set(0, -0.125, 0.01);
  const setting = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 6, 16), goldMat);
  setting.position.copy(pendant.position);
  necklace.add(pendant, setting);
  necklace.position.set(0, 0.8, 0.17);
  necklace.rotation.x = -0.5;
  body.add(necklace);

  // Arms: short and soft, a little splayed (pivot at the shoulder)
  const makeArm = (side: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.29, 0.71, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.18, 6, 12), skin);
    arm.position.y = -0.14;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), skin);
    hand.position.y = -0.29;
    pivot.add(arm, hand);
    pivot.rotation.z = side * 0.22;
    body.add(pivot);
    return pivot;
  };
  const armR = makeArm(-1);
  const armL = makeArm(1);

  // Hips and short stubby legs (pivot at the hip)
  const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.22, 0.1, 24), trousersMat);
  hips.scale.z = 0.8;
  hips.position.y = HIP_Y;
  body.add(hips);
  const shoeMat = std(COLORS.shoes, 0.45);
  const soleMat = std(COLORS.soles, 0.6);
  const legMeshes: THREE.Mesh[] = [hips];
  const shoeMeshes: THREE.Mesh[] = [];
  const makeLeg = (side: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.115, HIP_Y, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.1, 6, 12), trousersMat);
    leg.position.y = -0.13;
    const shoe = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.12, 0.27, 3, 0.055), shoeMat);
    shoe.position.set(0, -0.27, 0.035);
    const sole = new THREE.Mesh(new RoundedBoxGeometry(0.205, 0.035, 0.275, 2, 0.015), soleMat);
    sole.position.set(0, -0.322, 0.035);
    pivot.add(leg, shoe, sole);
    body.add(pivot);
    legMeshes.push(leg);
    shoeMeshes.push(shoe, sole);
    return pivot;
  };
  const legR = makeLeg(-1);
  const legL = makeLeg(1);

  // Big round head
  const head = new THREE.Group();
  head.position.y = HEAD_Y;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R, 48, 36), skin);
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
