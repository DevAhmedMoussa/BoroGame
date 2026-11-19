import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { colorOf, type Outfit } from '../lib/outfit';
import { BODY_DEPTH, FOOT_DROP, frontZ, torsoProfile, torsoR, type KukuRig } from './kukuModel';

/**
 * Kuku's clothes (chibi proportions), built in code and attached to her rig's joints.
 * Torso pieces follow the body outline from kukuModel.ts, so they always fit.
 * dressKuku() removes whatever she's wearing and puts on the given outfit.
 * Units match kukuModel.ts (feet at y = 0, facing +Z).
 */

const TAU = Math.PI * 2;
const mat = (color: number, roughness = 0.8, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, ...extra });
const lathe = (pts: Array<[number, number]>, phiStart = 0, phiLength = TAU) =>
  new THREE.LatheGeometry(
    pts.map(([r, y]) => new THREE.Vector2(r, y)),
    36,
    phiStart,
    phiLength,
  );
/** Mix a colour towards white (amt > 0) or black (amt < 0). */
function tint(color: number, amt: number) {
  const c = new THREE.Color(color);
  return amt >= 0 ? c.lerp(new THREE.Color(0xffffff), amt).getHex() : c.lerp(new THREE.Color(0x000000), -amt).getHex();
}
function ribTexture() {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 4;
  const ctx = c.getContext('2d')!;
  for (let x = 0; x < 32; x++) {
    const v = 128 + 100 * Math.sin((x / 32) * TAU * 4);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, 0, 1, 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 1);
  return t;
}
function dotsTexture(base: number) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = `#${new THREE.Color(base).getHexString()}`;
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#ffffff';
  for (const [x, y] of [[8, 8], [40, 8], [24, 28], [56, 28], [8, 48], [40, 48]]) {
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, TAU);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 2);
  return t;
}
function heartShape(k: number) {
  const s = new THREE.Shape();
  s.moveTo(0, -0.9 * k);
  s.bezierCurveTo(-0.2 * k, -0.6 * k, -k, -0.2 * k, -0.9 * k, 0.3 * k);
  s.bezierCurveTo(-0.8 * k, 0.8 * k, -0.15 * k, 0.85 * k, 0, 0.35 * k);
  s.bezierCurveTo(0.15 * k, 0.85 * k, 0.8 * k, 0.8 * k, 0.9 * k, 0.3 * k);
  s.bezierCurveTo(k, -0.2 * k, 0.2 * k, -0.6 * k, 0, -0.9 * k);
  return s;
}

type Put = (parent: THREE.Object3D, ...objs: THREE.Object3D[]) => void;

/** A torso-hugging layer from y0 up to y1, closing in to `neck` at the top (0 = flat top). */
function shell(y0: number, y1: number, off: number, material: THREE.Material, neck?: number, depth = BODY_DEPTH) {
  const pts = torsoProfile(y0, y1, off);
  if (neck !== undefined) pts.push([neck, y1 + 0.02]);
  const m = new THREE.Mesh(lathe(pts), material);
  m.scale.z = depth;
  return m;
}
/** Ring around the torso at height y. */
function ring(y: number, off: number, tube: number, material: THREE.Material) {
  const r = new THREE.Mesh(new THREE.TorusGeometry(torsoR(y) + off, tube, 8, 40), material);
  r.rotation.x = Math.PI / 2;
  r.scale.y = BODY_DEPTH;
  r.position.y = y;
  return r;
}

// ---------------------------------------------------------------- tops

function sleevesShort(rig: KukuRig, put: Put, color: number, puff = 1) {
  for (const sh of [rig.armL, rig.armR]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 14), mat(color));
    cap.scale.set(0.082 * puff, 0.1 * puff, 0.082 * puff);
    cap.position.y = -0.05;
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.066 * puff, 0.014, 8, 22), mat(tint(color, 0.3)));
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -0.11 - 0.02 * (puff - 1);
    put(sh, cap, cuff);
  }
}

function sleevesLong(rig: KukuRig, put: Put, color: number, cuffColor: number) {
  for (const [sh, el] of [
    [rig.armL, rig.forearmL],
    [rig.armR, rig.forearmR],
  ]) {
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.13, 6, 12), mat(color));
    upper.position.y = -0.1;
    const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.066, 0.08, 6, 12), mat(color));
    lower.position.y = -0.06;
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.035, 16), mat(cuffColor));
    cuff.position.y = -0.125;
    put(sh, upper);
    put(el, lower, cuff);
  }
}

function tankBody(rig: KukuRig, put: Put, color: number) {
  const m = mat(color, 0.75, { bumpMap: ribTexture(), bumpScale: 0.5 });
  put(rig.body, shell(0.76, 1.04, 0.012, m, 0.001));
  for (const side of [-1, 1]) {
    const strap = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.06, 0.3, 2, 0.02), m);
    strap.position.set(side * 0.115, 1.12, 0);
    put(rig.body, strap);
  }
}

const TOP_BUILDERS: Record<string, (rig: KukuRig, put: Put, color: number) => void> = {
  // Her avatar's lilac shirt, knotted at the waist
  knot(rig, put, color) {
    const m = mat(color);
    const light = mat(tint(color, 0.35));
    put(rig.body, shell(0.78, 1.17, 0.014, m, 0.085));
    const placket = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.3, 0.008), light);
    placket.position.set(0, 0.99, frontZ(0.99, 0.016));
    placket.rotation.x = -0.06;
    put(rig.body, placket);
    for (let i = 0; i < 3; i++) {
      const y = 0.9 + i * 0.08;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), mat(0xffffff, 0.3));
      b.position.set(0, y, frontZ(y, 0.022));
      put(rig.body, b);
    }
    for (const side of [-1, 1]) {
      const c = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.014, 0.075, 2, 0.006), light);
      c.position.set(side * 0.055, 1.17, 0.075);
      c.rotation.set(0.5, side * 0.5, side * -0.35);
      const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.06, 4, 8), m);
      tail.position.set(side * 0.045, 0.74, frontZ(0.74, 0.03));
      tail.rotation.z = side * 0.5;
      tail.scale.z = 0.6;
      put(rig.body, c, tail);
    }
    const knot = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), m);
    knot.scale.set(0.05, 0.04, 0.035);
    knot.position.set(0, 0.79, frontZ(0.79, 0.02));
    put(rig.body, knot);
    sleevesShort(rig, put, color);
  },

  tank(rig, put, color) {
    tankBody(rig, put, color);
  },

  tee(rig, put, color) {
    const m = mat(color);
    put(rig.body, shell(0.74, 1.17, 0.015, m, 0.085));
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.011, 6, 22), mat(tint(color, -0.12)));
    band.rotation.x = Math.PI / 2;
    band.position.y = 1.19;
    const heart = new THREE.Mesh(new THREE.ShapeGeometry(heartShape(0.05), 12), mat(color === 0xf4b6c8 ? 0xe5566f : 0xf4a6bf, 0.6));
    heart.position.set(0, 0.96, frontZ(0.96, 0.02));
    put(rig.body, band, heart);
    for (const sh of [rig.armL, rig.armR]) {
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.068, 0.11, 16), m);
      sleeve.position.y = -0.07;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.071, 14, 10), m);
      cap.position.y = -0.015;
      put(sh, sleeve, cap);
    }
  },

  hoodie(rig, put, color) {
    const m = mat(color, 0.9);
    const trim = mat(tint(color, -0.1), 0.9);
    put(rig.body, shell(0.68, 1.17, 0.03, m, 0.09, BODY_DEPTH * 1.02), ring(0.69, 0.03, 0.02, trim));
    const hood = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), m);
    hood.scale.set(0.17, 0.09, 0.1);
    hood.position.set(0, 1.17, -0.1);
    const pocket = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.09, 0.03, 2, 0.012), trim);
    pocket.position.set(0, 0.79, frontZ(0.79, 0.04));
    put(rig.body, hood, pocket);
    for (const side of [-1, 1]) {
      const cord = new THREE.Mesh(new THREE.CapsuleGeometry(0.007, 0.09, 3, 6), mat(0xffffff, 0.5));
      cord.position.set(side * 0.03, 1.07, frontZ(1.07, 0.04));
      put(rig.body, cord);
    }
    sleevesLong(rig, put, color, tint(color, -0.1));
  },

  blouse(rig, put, color) {
    const m = mat(color, 0.7, { side: THREE.DoubleSide });
    put(rig.body, shell(0.8, 1.17, 0.014, m, 0.085));
    // little peplum
    const pep = new THREE.Mesh(
      lathe([
        [0.235, 0.71],
        [0.215, 0.75],
        [torsoR(0.8) + 0.016, 0.8],
      ]),
      m,
    );
    pep.scale.z = BODY_DEPTH * 1.04;
    put(rig.body, pep);
    for (const r of [0.088, 0.106]) {
      const ruffle = new THREE.Mesh(new THREE.TorusGeometry(r, 0.016, 8, 28), m);
      ruffle.rotation.x = Math.PI / 2 - 0.25;
      ruffle.scale.y = 0.8;
      ruffle.position.set(0, 1.18 - (r - 0.088), 0.012);
      put(rig.body, ruffle);
    }
    for (let i = 0; i < 3; i++) {
      const y = 0.88 + i * 0.07;
      const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6), mat(0xfff8ee, 0.2));
      pearl.position.set(0, y, frontZ(y, 0.022));
      put(rig.body, pearl);
    }
    sleevesShort(rig, put, color, 1.18);
  },

  // Denim jacket worn open over a white ribbed tank
  jacket(rig, put, color) {
    tankBody(rig, put, 0xf8f5ef);
    const m = mat(color, 0.85, { side: THREE.DoubleSide });
    const light = mat(tint(color, 0.25), 0.85);
    const open = 0.6;
    const pts = torsoProfile(0.7, 1.16, 0.035);
    pts.push([0.11, 1.19]);
    const t = new THREE.Mesh(lathe(pts, open, TAU - open * 2), m);
    t.scale.z = BODY_DEPTH * 1.03;
    put(rig.body, t);
    for (const side of [-1, 1]) {
      const lapel = new THREE.Mesh(new RoundedBoxGeometry(0.065, 0.13, 0.012, 2, 0.005), light);
      lapel.position.set(side * 0.1, 1.08, frontZ(1.08, 0.03));
      lapel.rotation.set(-0.2, side * 0.45, side * 0.3);
      const pocket = new THREE.Mesh(new RoundedBoxGeometry(0.055, 0.045, 0.012, 2, 0.004), light);
      pocket.position.set(side * 0.14, 0.97, frontZ(0.97, 0.03) - 0.04);
      pocket.rotation.y = side * 0.65;
      put(rig.body, lapel, pocket);
    }
    sleevesLong(rig, put, color, tint(color, 0.25));
  },
};

// ---------------------------------------------------------------- bottoms

/** Shorts-like base that every bottom starts from (closed underneath). */
function waist(rig: KukuRig, put: Put, color: number, from = 0.5) {
  const m = mat(color, 0.85);
  const pts = torsoProfile(Math.max(from, 0.515), 0.82, 0.013);
  if (from <= 0.515) pts.unshift([0.001, 0.5]);
  const w = new THREE.Mesh(lathe(pts), m);
  w.scale.z = BODY_DEPTH;
  put(rig.body, w, ring(0.815, 0.014, 0.012, mat(tint(color, 0.2), 0.85)));
}

function skirtShape(rig: KukuRig, put: Put, material: THREE.Material, top: number, bottom: number, flare: number) {
  const h = top - bottom;
  const s = new THREE.Mesh(
    lathe([
      [0.27 + flare, bottom],
      [0.268 + flare, bottom + 0.02],
      [0.235 + flare * 0.5, bottom + h * 0.4],
      [0.205 + flare * 0.15, bottom + h * 0.75],
      [torsoR(top) + 0.016, top],
    ]),
    material,
  );
  s.scale.z = 0.86;
  put(rig.body, s);
}

const BOTTOM_BUILDERS: Record<string, (rig: KukuRig, put: Put, color: number) => void> = {
  jeans(rig, put, color) {
    waist(rig, put, color);
    const m = mat(color, 0.85);
    const light = mat(tint(color, 0.25), 0.85);
    for (const [hip, knee] of [
      [rig.legL, rig.shinL],
      [rig.legR, rig.shinR],
    ]) {
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.098, 0.094, 0.24, 16), m);
      thigh.position.y = -0.13;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.093, 14, 10), m);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.098, 0.2, 16), m);
      shin.position.y = -0.1;
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.104, 0.104, 0.045, 16), light);
      cuff.position.y = -0.2;
      put(hip, thigh);
      put(knee, cap, shin, cuff);
    }
  },

  wide(rig, put, color) {
    waist(rig, put, color);
    const m = mat(color, 0.85);
    for (const [hip, knee] of [
      [rig.legL, rig.shinL],
      [rig.legR, rig.shinR],
    ]) {
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.104, 0.108, 0.24, 16), m);
      thigh.position.y = -0.13;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.108, 14, 10), m);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.135, 0.27, 18), m);
      shin.position.y = -0.135;
      put(hip, thigh);
      put(knee, cap, shin);
    }
  },

  skirt(rig, put, color) {
    waist(rig, put, color, 0.62);
    skirtShape(rig, put, mat(color, 0.8, { side: THREE.DoubleSide }), 0.82, 0.4, 0.03);
  },

  // Summer dress: replaces both top and bottom
  dress(rig, put, color) {
    const fabric = new THREE.MeshStandardMaterial({ map: dotsTexture(color), roughness: 0.75, side: THREE.DoubleSide });
    put(rig.body, shell(0.78, 1.04, 0.012, fabric, 0.001));
    for (const side of [-1, 1]) {
      const strap = new THREE.Mesh(new RoundedBoxGeometry(0.035, 0.06, 0.3, 2, 0.012), mat(color, 0.75));
      strap.position.set(side * 0.11, 1.12, 0);
      put(rig.body, strap);
    }
    put(rig.body, ring(0.82, 0.02, 0.018, mat(0xffffff, 0.6)));
    skirtShape(rig, put, fabric, 0.84, 0.38, 0.08);
  },
};

// ---------------------------------------------------------------- shoes

const ground = () => -FOOT_DROP;

const SHOE_BUILDERS: Record<string, (rig: KukuRig, put: Put, color: number) => void> = {
  sneakers(rig, put, color) {
    for (const knee of [rig.shinL, rig.shinR]) {
      const shoe = new THREE.Mesh(new RoundedBoxGeometry(0.17, 0.12, 0.25, 4, 0.055), mat(color, 0.45));
      shoe.position.set(0, ground() + 0.075, 0.035);
      const sole = new THREE.Mesh(new RoundedBoxGeometry(0.176, 0.035, 0.256, 2, 0.014), mat(0xe8e4de, 0.6));
      sole.position.set(0, ground() + 0.018, 0.035);
      const laces = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.07), mat(0xffffff, 0.5));
      laces.position.set(0, ground() + 0.13, 0.08);
      laces.rotation.x = 0.35;
      put(knee, shoe, sole, laces);
    }
  },
  sandals(rig, put, color) {
    for (const knee of [rig.shinL, rig.shinR]) {
      const sole = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.028, 0.25, 2, 0.012), mat(color, 0.6));
      sole.position.set(0, ground() + 0.014, 0.035);
      put(knee, sole);
      for (const z of [0.0, 0.09]) {
        const strap = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.02, 0.028, 2, 0.008), mat(color, 0.5));
        strap.position.set(0, ground() + 0.075 - z * 0.25, z);
        put(knee, strap);
      }
      const ankle = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.009, 6, 18), mat(color, 0.5));
      ankle.rotation.x = Math.PI / 2;
      ankle.position.set(0, ground() + 0.13, 0);
      put(knee, ankle);
    }
  },
  boots(rig, put, color) {
    for (const knee of [rig.shinL, rig.shinR]) {
      const foot = new THREE.Mesh(new RoundedBoxGeometry(0.175, 0.13, 0.26, 4, 0.055), mat(color, 0.5));
      foot.position.set(0, ground() + 0.075, 0.035);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.092, 0.2, 16), mat(color, 0.5));
      shaft.position.y = ground() + 0.2;
      const sole = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.035, 0.265, 2, 0.014), mat(tint(color, -0.45), 0.6));
      sole.position.set(0, ground() + 0.018, 0.035);
      put(knee, foot, shaft, sole);
    }
  },
};

// ---------------------------------------------------------------- accessories

const ACCESSORY_BUILDERS: Record<string, (rig: KukuRig, put: Put, color: number) => void> = {
  none() {},

  necklace(rig, put, color) {
    const m = mat(color, 0.3, { metalness: 0.85 });
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.006, 6, 36, Math.PI), m);
    chain.rotation.set(-1.0, 0, Math.PI);
    chain.position.set(0, 1.17, 0.045);
    const pendant = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 10), mat(0xffffff, 0.15, { metalness: 0.1 }));
    pendant.position.set(0, 1.105, frontZ(1.105, 0.03));
    put(rig.body, chain, pendant);
  },

  tote(rig, put, color) {
    const bag = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.2, 0.06, 3, 0.022), mat(color, 0.85));
    bag.position.set(-0.3, 0.74, -0.02);
    bag.rotation.y = -0.3;
    const strap = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(
          [
            [-0.36, 0.83, 0.0],
            [-0.33, 1.0, 0.07],
            [-0.2, 1.15, 0.0],
            [-0.24, 1.0, -0.09],
            [-0.25, 0.83, -0.05],
          ].map(([x, y, z]) => new THREE.Vector3(x, y, z)),
        ),
        24,
        0.01,
        6,
      ),
      mat(tint(color, -0.25), 0.7),
    );
    const heart = new THREE.Mesh(new THREE.ShapeGeometry(heartShape(0.035), 10), mat(0xe5566f, 0.6));
    heart.position.set(-0.29, 0.73, 0.012);
    heart.rotation.y = -0.3;
    put(rig.body, bag, strap, heart);
  },

  sunglasses(rig, put, color) {
    const frame = mat(color, 0.3, { metalness: 0.2 });
    const lens = mat(0x1d1d22, 0.1, { metalness: 0.3 });
    const g = new THREE.Group();
    for (const side of [-1, 1]) {
      const l = new THREE.Mesh(new THREE.CircleGeometry(1, 22), lens);
      l.scale.set(0.075, 0.06, 1);
      l.position.x = side * 0.095;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.13, 6, 22), frame);
      rim.scale.set(0.075, 0.06, 0.06);
      rim.position.x = side * 0.095;
      g.add(l, rim);
    }
    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.04, 6), frame);
    bridge.rotation.z = Math.PI / 2;
    g.add(bridge);
    g.position.set(0, 0.46, 0.4);
    g.rotation.x = -0.7;
    put(rig.head, g);
  },

  flower(rig, put, color) {
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      const petal = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mat(color, 0.6));
      petal.scale.set(0.05, 0.05, 0.02);
      petal.position.set(Math.cos(a) * 0.052, Math.sin(a) * 0.052, 0);
      g.add(petal);
    }
    const centre = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), mat(0xf3d36b, 0.5));
    centre.position.z = 0.014;
    g.add(centre);
    g.position.set(-0.46, 0.26, 0.26);
    g.rotation.y = -0.7;
    put(rig.head, g);
  },

  sunhat(rig, put, color) {
    const straw = mat(0xe9cf8f, 0.95);
    const g = new THREE.Group();
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.8, 0.025, 48), straw);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.2, 36), straw);
    crown.position.y = 0.1;
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.38, 28, 10, 0, TAU, 0, Math.PI / 2), straw);
    top.scale.y = 0.35;
    top.position.y = 0.2;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.425, 0.425, 0.06, 36), mat(color, 0.6));
    band.position.y = 0.04;
    g.add(brim, crown, top, band);
    g.position.set(0, 0.46, -0.03);
    g.rotation.set(-0.16, 0, 0.07);
    put(rig.head, g);
  },
};

// ---------------------------------------------------------------- dressing

function disposeDeep(obj: THREE.Object3D) {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    for (const mt of mats) {
      (mt as THREE.MeshStandardMaterial).map?.dispose();
      (mt as THREE.MeshStandardMaterial).bumpMap?.dispose();
      mt.dispose();
    }
  });
}

/** Take off whatever Kuku is wearing and put on this outfit. */
export function dressKuku(rig: KukuRig, outfit: Outfit) {
  for (const obj of rig.clothes) {
    obj.parent?.remove(obj);
    disposeDeep(obj);
  }
  rig.clothes = [];
  const put: Put = (parent, ...objs) => {
    parent.add(...objs);
    rig.clothes.push(...objs);
  };
  if (outfit.bottom !== 'dress') TOP_BUILDERS[outfit.top]?.(rig, put, colorOf('top', outfit));
  BOTTOM_BUILDERS[outfit.bottom]?.(rig, put, colorOf('bottom', outfit));
  SHOE_BUILDERS[outfit.shoes]?.(rig, put, colorOf('shoes', outfit));
  ACCESSORY_BUILDERS[outfit.accessory]?.(rig, put, colorOf('accessory', outfit));
}
