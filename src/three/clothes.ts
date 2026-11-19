import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { colorOf, type Outfit } from '../lib/outfit';
import type { KukuRig } from './kukuModel';

/**
 * Kuku's clothes, built in code and attached to her rig's joints.
 * dressKuku() removes whatever she's wearing and puts on the given outfit.
 * Units match kukuModel.ts (feet at y = 0, facing +Z).
 */

const TAU = Math.PI * 2;
const mat = (color: number, roughness = 0.8, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, ...extra });
const lathe = (pts: Array<[number, number]>, phiStart = 0, phiLength = TAU) =>
  new THREE.LatheGeometry(
    pts.map(([r, y]) => new THREE.Vector2(r, y)),
    32,
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
  t.repeat.set(6, 3);
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

// ---------------------------------------------------------------- tops

function sleevesShort(rig: KukuRig, put: Put, color: number, puff = 1) {
  for (const sh of [rig.armL, rig.armR]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), mat(color));
    cap.scale.set(0.075 * puff, 0.11 * puff, 0.075 * puff);
    cap.position.y = -0.07;
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.016, 8, 20), mat(tint(color, 0.3)));
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -0.16;
    put(sh, cap, cuff);
  }
}

function sleevesLong(rig: KukuRig, put: Put, color: number, cuffColor: number) {
  for (const [sh, el] of [
    [rig.armL, rig.forearmL],
    [rig.armR, rig.forearmR],
  ]) {
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.24, 6, 12), mat(color));
    upper.position.y = -0.16;
    const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.053, 0.18, 6, 12), mat(color));
    lower.position.y = -0.11;
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 14), mat(cuffColor));
    cuff.position.y = -0.22;
    put(sh, upper);
    put(el, lower, cuff);
  }
}

function tankBody(rig: KukuRig, put: Put, color: number) {
  const m = mat(color, 0.75, { bumpMap: ribTexture(), bumpScale: 0.5 });
  const t = new THREE.Mesh(
    lathe([
      [0.001, 1.2],
      [0.174, 1.2],
      [0.174, 1.36],
      [0.184, 1.5],
      [0.2, 1.62],
      [0.213, 1.665],
      [0.001, 1.665],
    ]),
    m,
  );
  t.scale.z = 0.73;
  put(rig.body, t);
  for (const side of [-1, 1]) {
    const strap = new THREE.Mesh(new RoundedBoxGeometry(0.055, 0.1, 0.4, 2, 0.02), m);
    strap.position.set(side * 0.14, 1.71, 0);
    put(rig.body, strap);
  }
}

const TOP_BUILDERS: Record<string, (rig: KukuRig, put: Put, color: number) => void> = {
  // Her avatar's lilac shirt, knotted at the waist
  knot(rig, put, color) {
    const m = mat(color);
    const light = mat(tint(color, 0.35));
    const t = new THREE.Mesh(
      lathe([
        [0.001, 1.25],
        [0.172, 1.25],
        [0.174, 1.36],
        [0.184, 1.5],
        [0.2, 1.62],
        [0.216, 1.71],
        [0.192, 1.78],
        [0.09, 1.82],
        [0.001, 1.83],
      ]),
      m,
    );
    t.scale.z = 0.73;
    const placket = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.46, 0.008), light);
    placket.position.set(0, 1.53, 0.136);
    placket.rotation.x = -0.05;
    put(rig.body, t, placket);
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), mat(0xffffff, 0.3));
      b.position.set(0, 1.38 + i * 0.1, 0.142);
      put(rig.body, b);
    }
    for (const side of [-1, 1]) {
      const c = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.012, 0.075, 2, 0.005), light);
      c.position.set(side * 0.055, 1.79, 0.075);
      c.rotation.set(0.5, side * 0.5, side * -0.35);
      const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.07, 4, 8), m);
      tail.position.set(side * 0.045, 1.21, 0.128);
      tail.rotation.z = side * 0.5;
      tail.scale.z = 0.6;
      put(rig.body, c, tail);
    }
    const knot = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), m);
    knot.scale.set(0.05, 0.04, 0.035);
    knot.position.set(0, 1.27, 0.124);
    put(rig.body, knot);
    sleevesShort(rig, put, color);
  },

  tank(rig, put, color) {
    tankBody(rig, put, color);
  },

  tee(rig, put, color) {
    const m = mat(color);
    const t = new THREE.Mesh(
      lathe([
        [0.001, 1.2],
        [0.178, 1.2],
        [0.178, 1.36],
        [0.188, 1.5],
        [0.204, 1.62],
        [0.22, 1.71],
        [0.196, 1.78],
        [0.085, 1.805],
        [0.068, 1.81],
      ]),
      m,
    );
    t.scale.z = 0.73;
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.01, 6, 20), mat(tint(color, -0.12)));
    band.rotation.x = Math.PI / 2;
    band.scale.y = 0.85;
    band.position.y = 1.808;
    const heart = new THREE.Mesh(new THREE.ShapeGeometry(heartShape(0.045), 12), mat(color === 0xf4b6c8 ? 0xe5566f : 0xf4a6bf, 0.6));
    heart.position.set(0.0, 1.56, 0.141);
    put(rig.body, t, band, heart);
    for (const sh of [rig.armL, rig.armR]) {
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.056, 0.15, 16), m);
      sleeve.position.y = -0.09;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.062, 14, 10), m);
      cap.position.y = -0.02;
      put(sh, sleeve, cap);
    }
  },

  hoodie(rig, put, color) {
    const m = mat(color, 0.9);
    const trim = mat(tint(color, -0.1), 0.9);
    const t = new THREE.Mesh(
      lathe([
        [0.001, 1.15],
        [0.195, 1.15],
        [0.204, 1.24],
        [0.198, 1.36],
        [0.205, 1.5],
        [0.218, 1.62],
        [0.234, 1.71],
        [0.208, 1.79],
        [0.09, 1.83],
        [0.07, 1.84],
      ]),
      m,
    );
    t.scale.z = 0.76;
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.198, 0.018, 8, 32), trim);
    band.rotation.x = Math.PI / 2;
    band.scale.y = 0.76;
    band.position.y = 1.16;
    const hood = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), m);
    hood.scale.set(0.17, 0.1, 0.11);
    hood.position.set(0, 1.83, -0.1);
    const pocket = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.11, 0.03, 2, 0.012), trim);
    pocket.position.set(0, 1.3, 0.152);
    put(rig.body, t, band, hood, pocket);
    for (const side of [-1, 1]) {
      const cord = new THREE.Mesh(new THREE.CapsuleGeometry(0.006, 0.12, 3, 6), mat(0xffffff, 0.5));
      cord.position.set(side * 0.03, 1.71, 0.158);
      put(rig.body, cord);
    }
    sleevesLong(rig, put, color, tint(color, -0.1));
  },

  blouse(rig, put, color) {
    const m = mat(color, 0.7);
    const t = new THREE.Mesh(
      lathe([
        [0.001, 1.16],
        [0.218, 1.16],
        [0.2, 1.26],
        [0.18, 1.36],
        [0.188, 1.5],
        [0.202, 1.62],
        [0.218, 1.71],
        [0.192, 1.78],
        [0.08, 1.81],
        [0.066, 1.82],
      ]),
      m,
    );
    t.scale.z = 0.74;
    put(rig.body, t);
    for (const r of [0.082, 0.1]) {
      const ruffle = new THREE.Mesh(new THREE.TorusGeometry(r, 0.016, 8, 28), m);
      ruffle.rotation.x = Math.PI / 2 - 0.25;
      ruffle.scale.y = 0.8;
      ruffle.position.set(0, 1.8 - (r - 0.082), 0.01);
      put(rig.body, ruffle);
    }
    for (let i = 0; i < 3; i++) {
      const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), mat(0xfff8ee, 0.2));
      pearl.position.set(0, 1.45 + i * 0.09, 0.143);
      put(rig.body, pearl);
    }
    sleevesShort(rig, put, color, 1.15);
  },

  // Denim jacket worn open over a white ribbed tank
  jacket(rig, put, color) {
    tankBody(rig, put, 0xf8f5ef);
    const m = mat(color, 0.85, { side: THREE.DoubleSide });
    const light = mat(tint(color, 0.25), 0.85);
    const open = 0.55;
    const t = new THREE.Mesh(
      lathe(
        [
          [0.205, 1.18],
          [0.21, 1.3],
          [0.21, 1.45],
          [0.222, 1.6],
          [0.238, 1.71],
          [0.212, 1.79],
          [0.11, 1.83],
        ],
        open,
        TAU - open * 2,
      ),
      m,
    );
    t.scale.z = 0.76;
    put(rig.body, t);
    for (const side of [-1, 1]) {
      const lapel = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.16, 0.012, 2, 0.005), light);
      lapel.position.set(side * 0.085, 1.7, 0.135);
      lapel.rotation.set(-0.15, side * 0.4, side * 0.3);
      const pocket = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.05, 0.012, 2, 0.004), light);
      pocket.position.set(side * 0.13, 1.58, 0.13);
      pocket.rotation.y = side * 0.55;
      put(rig.body, lapel, pocket);
    }
    sleevesLong(rig, put, color, tint(color, 0.25));
  },
};

// ---------------------------------------------------------------- bottoms

function waist(rig: KukuRig, put: Put, color: number, toY = 0.98) {
  const w = new THREE.Mesh(
    // (lathe points go bottom → top so the faces point outwards)
    lathe([
      [0.001, toY],
      [0.192, Math.max(toY, 1.0)],
      [0.207, Math.max(toY, 1.06)],
      [0.2, 1.14],
      [0.18, 1.24],
      [0.17, 1.33],
    ]),
    mat(color, 0.85),
  );
  w.scale.z = 0.77;
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.172, 0.012, 6, 32), mat(tint(color, 0.2), 0.85));
  band.rotation.x = Math.PI / 2;
  band.scale.y = 0.77;
  band.position.y = 1.32;
  put(rig.body, w, band);
}

function skirtShape(rig: KukuRig, put: Put, material: THREE.Material, top: number, flare: number) {
  const s = new THREE.Mesh(
    lathe([
      [0.285 + flare, top - 0.46],
      [0.28 + flare, top - 0.44],
      [0.25 + flare * 0.5, top - 0.3],
      [0.215 + flare * 0.2, top - 0.14],
      [0.2, top],
    ]),
    material,
  );
  s.scale.z = 0.85;
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
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.098, 0.09, 0.5, 16), m);
      thigh.position.y = -0.25;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), m);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.4, 16), m);
      shin.position.y = -0.2;
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.106, 0.106, 0.05, 16), light);
      cuff.position.y = -0.39;
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
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.104, 0.11, 0.5, 16), m);
      thigh.position.y = -0.25;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), m);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.47, 18), m);
      shin.position.y = -0.235;
      put(hip, thigh);
      put(knee, cap, shin);
    }
  },

  skirt(rig, put, color) {
    waist(rig, put, color, 1.1);
    skirtShape(rig, put, mat(color, 0.8, { side: THREE.DoubleSide }), 1.14, 0.03);
  },

  // Summer dress: replaces both top and bottom
  dress(rig, put, color) {
    const fabric = new THREE.MeshStandardMaterial({ map: dotsTexture(color), roughness: 0.75, side: THREE.DoubleSide });
    const bodice = new THREE.Mesh(
      lathe([
        [0.001, 1.12],
        [0.19, 1.12],
        [0.172, 1.24],
        [0.172, 1.36],
        [0.184, 1.5],
        [0.2, 1.62],
        [0.208, 1.665],
        [0.001, 1.665],
      ]),
      fabric,
    );
    bodice.scale.z = 0.74;
    put(rig.body, bodice);
    for (const side of [-1, 1]) {
      const strap = new THREE.Mesh(new RoundedBoxGeometry(0.035, 0.09, 0.4, 2, 0.012), mat(color, 0.75));
      strap.position.set(side * 0.13, 1.71, 0);
      put(rig.body, strap);
    }
    const sash = new THREE.Mesh(new THREE.TorusGeometry(0.173, 0.018, 8, 32), mat(0xffffff, 0.6));
    sash.rotation.x = Math.PI / 2;
    sash.scale.y = 0.74;
    sash.position.y = 1.25;
    put(rig.body, sash);
    skirtShape(rig, put, fabric, 1.16, 0.08);
  },
};

// ---------------------------------------------------------------- shoes

const SHOE_BUILDERS: Record<string, (rig: KukuRig, put: Put, color: number) => void> = {
  sneakers(rig, put, color) {
    for (const knee of [rig.shinL, rig.shinR]) {
      const shoe = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.1, 0.26, 3, 0.045), mat(color, 0.45));
      shoe.position.set(0, -0.53, 0.045);
      const sole = new THREE.Mesh(new RoundedBoxGeometry(0.135, 0.03, 0.265, 2, 0.012), mat(0xe8e4de, 0.6));
      sole.position.set(0, -0.565, 0.045);
      const laces = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 0.08), mat(0xffffff, 0.5));
      laces.position.set(0, -0.478, 0.08);
      put(knee, shoe, sole, laces);
    }
  },
  sandals(rig, put, color) {
    for (const knee of [rig.shinL, rig.shinR]) {
      const sole = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.025, 0.25, 2, 0.01), mat(color, 0.6));
      sole.position.set(0, -0.575, 0.045);
      put(knee, sole);
      for (const z of [0.0, 0.1]) {
        const strap = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.016, 0.025, 2, 0.006), mat(color, 0.5));
        strap.position.set(0, -0.535, z);
        put(knee, strap);
      }
      const ankle = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.008, 6, 18), mat(color, 0.5));
      ankle.rotation.x = Math.PI / 2;
      ankle.position.set(0, -0.48, 0);
      put(knee, ankle);
    }
  },
  boots(rig, put, color) {
    for (const knee of [rig.shinL, rig.shinR]) {
      const foot = new THREE.Mesh(new RoundedBoxGeometry(0.135, 0.11, 0.27, 3, 0.045), mat(color, 0.5));
      foot.position.set(0, -0.525, 0.045);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.1, 0.24, 16), mat(color, 0.5));
      shaft.position.y = -0.39;
      const sole = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.035, 0.275, 2, 0.012), mat(tint(color, -0.45), 0.6));
      sole.position.set(0, -0.565, 0.045);
      put(knee, foot, shaft, sole);
    }
  },
};

// ---------------------------------------------------------------- accessories

const ACCESSORY_BUILDERS: Record<string, (rig: KukuRig, put: Put, color: number) => void> = {
  none() {},

  necklace(rig, put, color) {
    const m = mat(color, 0.3, { metalness: 0.85 });
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.005, 6, 36, Math.PI), m);
    chain.rotation.set(-0.9, 0, Math.PI);
    chain.position.set(0, 1.82, 0.07);
    const pendant = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 10), mat(0xffffff, 0.15, { metalness: 0.1 }));
    pendant.position.set(0, 1.757, 0.15);
    put(rig.body, chain, pendant);
  },

  tote(rig, put, color) {
    const bag = new THREE.Mesh(new RoundedBoxGeometry(0.21, 0.22, 0.06, 3, 0.02), mat(color, 0.85));
    bag.position.set(-0.31, 1.27, -0.03);
    bag.rotation.y = -0.3;
    const strap = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(
          [
            [-0.37, 1.37, -0.01],
            [-0.33, 1.62, 0.07],
            [-0.21, 1.8, 0.0],
            [-0.25, 1.6, -0.09],
            [-0.25, 1.37, -0.06],
          ].map(([x, y, z]) => new THREE.Vector3(x, y, z)),
        ),
        24,
        0.009,
        6,
      ),
      mat(tint(color, -0.25), 0.7),
    );
    const heart = new THREE.Mesh(new THREE.ShapeGeometry(heartShape(0.035), 10), mat(0xe5566f, 0.6));
    heart.position.set(-0.3, 1.26, 0.005);
    heart.rotation.y = -0.3;
    put(rig.body, bag, strap, heart);
  },

  sunglasses(rig, put, color) {
    const frame = mat(color, 0.3, { metalness: 0.2 });
    const lens = mat(0x1d1d22, 0.1, { metalness: 0.3 });
    const g = new THREE.Group();
    for (const side of [-1, 1]) {
      const l = new THREE.Mesh(new THREE.CircleGeometry(1, 20), lens);
      l.scale.set(0.052, 0.038, 1);
      l.position.x = side * 0.068;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.12, 6, 20), frame);
      rim.scale.set(0.052, 0.038, 0.05);
      rim.position.x = side * 0.068;
      g.add(l, rim);
    }
    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.04, 6), frame);
    bridge.rotation.z = Math.PI / 2;
    g.add(bridge);
    g.position.set(0, 0.25, 0.29);
    g.rotation.x = -0.75;
    put(rig.head, g);
  },

  flower(rig, put, color) {
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      const petal = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mat(color, 0.6));
      petal.scale.set(0.034, 0.034, 0.014);
      petal.position.set(Math.cos(a) * 0.036, Math.sin(a) * 0.036, 0);
      g.add(petal);
    }
    const centre = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), mat(0xf3d36b, 0.5));
    centre.position.z = 0.01;
    g.add(centre);
    g.position.set(-0.25, 0.14, 0.15);
    g.rotation.y = -0.8;
    put(rig.head, g);
  },

  sunhat(rig, put, color) {
    const straw = mat(0xe9cf8f, 0.95);
    const g = new THREE.Group();
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.52, 0.018, 40), straw);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 0.16, 32), straw);
    crown.position.y = 0.08;
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 10, 0, TAU, 0, Math.PI / 2), straw);
    top.scale.y = 0.35;
    top.position.y = 0.16;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.283, 0.283, 0.045, 32), mat(color, 0.6));
    band.position.y = 0.03;
    g.add(brim, crown, top, band);
    g.position.set(0, 0.33, -0.02);
    g.rotation.set(-0.14, 0, 0.06);
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
