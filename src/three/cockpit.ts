import * as THREE from 'three';
import './cockpit.css';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { EMBLEMS } from '../sprites/emblems';
import { renderSprite } from '../sprites/painter';

/**
 * The cinematic drive: a full-screen 3D view from the driver's seat of Kuku's
 * pink convertible. The road streams towards you with scenery themed to the
 * destination, and a billboard with the place's emblem greets her on arrival.
 * It drives itself; Skip ends it early. Resolves when the ride is over.
 */

export type RideTheme = 'beach' | 'pyramids' | 'modern' | 'city';

export interface RideOptions {
  /** Shown as "Driving to …". */
  name: string;
  /** Emblem key in EMBLEMS (for the arrival billboard). */
  emblem?: string;
  theme: RideTheme;
  crossesNile: boolean;
  /** Seconds. */
  duration: number;
}

export function rideTheme(placeId?: string): RideTheme {
  if (placeId === 'sahel') return 'beach';
  if (placeId === 'pyramids') return 'pyramids';
  if (placeId === 'tagamo3' || placeId === 'zayed') return 'modern';
  return 'city';
}

const PINK = 0xff86bf;
const CREAM = 0xfff1e6;
const TAU = Math.PI * 2;

const std = (color: number, roughness = 0.7, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, ...extra });

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number], pixel = false) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  if (pixel) {
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
  }
  return t;
}

function speckles(base: string, dots: string[], n = 220) {
  return (g: CanvasRenderingContext2D) => {
    g.fillStyle = base;
    g.fillRect(0, 0, 64, 64);
    for (let i = 0; i < n; i++) {
      g.fillStyle = dots[i % dots.length];
      g.fillRect(Math.floor(Math.random() * 64), Math.floor(Math.random() * 64), 2, 2);
    }
  };
}

// ---------------------------------------------------------------- scenery parts (shared geometries)

interface Kit {
  build(kind: string): THREE.Object3D;
}

function makeKit(theme: RideTheme): Kit {
  const trunk = std(0x8a5a3a, 0.9);
  const leaf = std(0x5fae52, 0.8);
  const leafDark = std(0x3f8044, 0.8);
  const sand = std(0xdcbf86, 1);
  const rock = std(0xb49a74, 1);
  const black = std(0x2f2b33, 0.5);
  const lampHead = std(0xfff3b0, 0.4, { emissive: 0xffe08a, emissiveIntensity: 0.4 });
  const windowTex = (wall: string) =>
    canvasTexture(32, 64, (g) => {
      g.fillStyle = wall;
      g.fillRect(0, 0, 32, 64);
      for (let y = 4; y < 60; y += 10) for (let x = 4; x < 30; x += 9) {
        g.fillStyle = '#4d8fa6';
        g.fillRect(x, y, 5, 6);
        g.fillStyle = '#d4f1f7';
        g.fillRect(x, y, 2, 2);
      }
    });
  const walls = ['#f6ead2', '#f3b98f', '#e8a07a', '#f4e4c6', '#f2c0b4'].map((w) => new THREE.MeshStandardMaterial({ map: windowTex(w), roughness: 0.85 }));
  const glassTex = canvasTexture(32, 64, (g) => {
    g.fillStyle = '#8fd0e6';
    g.fillRect(0, 0, 32, 64);
    g.fillStyle = '#ffffff';
    for (let y = 0; y < 64; y += 6) g.fillRect(0, y, 32, 1);
    g.fillStyle = '#5a9fbf';
    for (let x = 8; x < 32; x += 8) g.fillRect(x, 0, 1, 64);
  });
  const glass = new THREE.MeshStandardMaterial({ map: glassTex, roughness: 0.15, metalness: 0.3 });
  const roofMat = std(0xc9b9a6, 0.9);
  const terracotta = std(0xd9744a, 0.8);
  const white = std(0xffffff, 0.7);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 10);
  const sphere = new THREE.SphereGeometry(1, 12, 10);
  const cone4 = new THREE.ConeGeometry(1, 1, 4);

  const palm = () => {
    const g = new THREE.Group();
    const t = new THREE.Mesh(cyl, trunk);
    t.scale.set(0.12, 3.2, 0.12);
    t.position.y = 1.6;
    g.add(t);
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Mesh(sphere, i % 2 ? leaf : leafDark);
      f.scale.set(1.0, 0.12, 0.3);
      const a = (i / 6) * TAU;
      f.position.set(Math.cos(a) * 0.7, 3.15, Math.sin(a) * 0.7);
      f.rotation.y = -a;
      f.rotation.z = -0.35;
      g.add(f);
    }
    return g;
  };
  const tree = () => {
    const g = new THREE.Group();
    const t = new THREE.Mesh(cyl, trunk);
    t.scale.set(0.15, 1.4, 0.15);
    t.position.y = 0.7;
    const c = new THREE.Mesh(sphere, leaf);
    c.scale.setScalar(1.1);
    c.position.y = 2.0;
    g.add(t, c);
    return g;
  };
  const lamp = () => {
    const g = new THREE.Group();
    const p = new THREE.Mesh(cyl, black);
    p.scale.set(0.05, 3, 0.05);
    p.position.y = 1.5;
    const h = new THREE.Mesh(box, lampHead);
    h.scale.set(0.3, 0.2, 0.3);
    h.position.y = 3.05;
    g.add(p, h);
    return g;
  };
  const building = () => {
    const g = new THREE.Group();
    const h = 4 + Math.random() * 7;
    const w = 3 + Math.random() * 2;
    const b = new THREE.Mesh(box, walls[Math.floor(Math.random() * walls.length)]);
    b.scale.set(w, h, 3.5);
    b.position.y = h / 2;
    const r = new THREE.Mesh(box, roofMat);
    r.scale.set(w + 0.2, 0.25, 3.7);
    r.position.y = h + 0.12;
    g.add(b, r);
    return g;
  };
  const tower = () => {
    const g = new THREE.Group();
    const h = 10 + Math.random() * 10;
    const b = new THREE.Mesh(box, glass);
    b.scale.set(3, h, 3);
    b.position.y = h / 2;
    const cap = new THREE.Mesh(box, white);
    cap.scale.set(3.2, 0.4, 3.2);
    cap.position.y = h;
    g.add(b, cap);
    return g;
  };
  const villa = () => {
    const g = new THREE.Group();
    const b = new THREE.Mesh(box, white);
    b.scale.set(3, 2, 3);
    b.position.y = 1;
    const roof = new THREE.Mesh(cone4, terracotta);
    roof.scale.set(2.4, 1.2, 2.4);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 2.6;
    g.add(b, roof);
    return g;
  };
  const dune = () => {
    const d = new THREE.Mesh(sphere, sand);
    d.scale.set(3 + Math.random() * 3, 0.8 + Math.random() * 0.8, 2.5);
    d.position.y = 0;
    return d;
  };
  const stone = () => {
    const d = new THREE.Mesh(sphere, rock);
    d.scale.set(0.5, 0.35, 0.45);
    d.position.y = 0.15;
    return d;
  };
  const chalet = () => {
    const g = new THREE.Group();
    const b = new THREE.Mesh(box, white);
    b.scale.set(2.2, 1.8, 2.2);
    b.position.y = 0.9;
    const d = new THREE.Mesh(sphere, white);
    d.scale.set(1.0, 0.8, 1.0);
    d.position.y = 1.8;
    g.add(b, d);
    return g;
  };
  const umbrella = () => {
    const g = new THREE.Group();
    const p = new THREE.Mesh(cyl, std(0x8d8a87));
    p.scale.set(0.04, 2, 0.04);
    p.position.y = 1;
    const top = new THREE.Mesh(new THREE.ConeGeometry(1, 0.5, 12), std([0xe5566f, 0x5b8fd6, 0xf0b429][Math.floor(Math.random() * 3)], 0.6));
    top.position.y = 2.1;
    g.add(p, top);
    return g;
  };
  const kinds: Record<string, () => THREE.Object3D> = { palm, tree, lamp, building, tower, villa, dune, stone, chalet, umbrella };
  void theme;
  return { build: (kind) => kinds[kind]() };
}

function pickKind(theme: RideTheme, near: number /* 0..1 progress of the ride */): string {
  const r = Math.random();
  switch (theme) {
    case 'beach':
      if (near > 0.72) return r < 0.4 ? 'umbrella' : r < 0.7 ? 'palm' : 'chalet';
      return r < 0.45 ? 'dune' : r < 0.75 ? 'stone' : r < 0.9 ? 'palm' : 'lamp';
    case 'pyramids':
      return r < 0.35 ? 'dune' : r < 0.6 ? 'palm' : r < 0.8 ? 'stone' : 'villa';
    case 'modern':
      return r < 0.35 ? 'tower' : r < 0.6 ? 'palm' : r < 0.8 ? 'villa' : 'lamp';
    default:
      return r < 0.5 ? 'building' : r < 0.7 ? 'lamp' : r < 0.85 ? 'tree' : 'palm';
  }
}

// ---------------------------------------------------------------- the cockpit

function buildCockpit() {
  const g = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color: PINK, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.1 });
  const cream = std(CREAM, 0.6);
  const chrome = std(0xffffff, 0.2, { metalness: 0.7 });

  const hood = new THREE.Mesh(new RoundedBoxGeometry(2.6, 0.3, 1.8, 4, 0.12), paint);
  hood.position.set(0, 0.6, -1.95);
  const dash = new THREE.Mesh(new RoundedBoxGeometry(2.5, 0.34, 0.55, 4, 0.12), paint);
  dash.position.set(0, 0.86, -1.0);
  const dashTop = new THREE.Mesh(new RoundedBoxGeometry(2.4, 0.06, 0.5, 2, 0.03), cream);
  dashTop.position.set(0, 1.04, -1.0);
  for (const side of [-1, 1]) {
    const door = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.35, 2.2, 3, 0.07), paint);
    door.position.set(side * 1.2, 0.8, -0.1);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 8), chrome);
    post.position.set(side * 1.05, 1.38, -1.1);
    post.rotation.x = -0.35;
    g.add(door, post);
  }
  const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.1, 8), chrome);
  topBar.rotation.z = Math.PI / 2;
  topBar.position.set(0, 1.71, -1.22);
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(2.1, 0.66),
    new THREE.MeshPhysicalMaterial({ color: 0xcfeaf5, transparent: true, opacity: 0.12, roughness: 0.05, depthWrite: false }),
  );
  glass.position.set(0, 1.39, -1.15);
  glass.rotation.x = -0.35;
  g.add(hood, dash, dashTop, topBar, glass);

  // speedometer
  const dialTex = canvasTexture(128, 128, (c) => {
    c.fillStyle = '#fff8ee';
    c.beginPath();
    c.arc(64, 64, 62, 0, TAU);
    c.fill();
    c.strokeStyle = '#2b1d14';
    c.lineWidth = 6;
    c.stroke();
    c.fillStyle = '#e5566f';
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI * 0.75 + (i / 8) * Math.PI * 1.5;
      c.fillRect(64 + Math.cos(a) * 46 - 3, 64 + Math.sin(a) * 46 - 3, 6, 6);
    }
    c.fillStyle = '#e5566f';
    c.beginPath();
    c.moveTo(64, 92);
    c.bezierCurveTo(44, 78, 52, 62, 64, 72);
    c.bezierCurveTo(76, 62, 84, 78, 64, 92);
    c.fill();
  });
  const dial = new THREE.Mesh(new THREE.CircleGeometry(0.11, 24), new THREE.MeshBasicMaterial({ map: dialTex }));
  dial.position.set(-0.42, 1.0, -0.8);
  dial.rotation.x = -0.6;
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.08, 0.004), std(0xe5566f, 0.4));
  needle.geometry.translate(0, 0.04, 0);
  needle.position.set(-0.42, 1.0, -0.795);
  needle.rotation.x = -0.6;
  g.add(dial, needle);

  // rear-view mirror with a swinging heart charm
  const mirror = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.09, 0.04, 2, 0.02), std(0x3a2a30, 0.4));
  mirror.position.set(0.0, 1.66, -1.16);
  const charm = new THREE.Group();
  charm.position.set(0.06, 1.62, -1.12);
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.14, 4), std(0xffffff));
  string.position.y = -0.07;
  const hs = new THREE.Shape();
  const k = 0.035;
  hs.moveTo(0, -0.9 * k);
  hs.bezierCurveTo(-0.2 * k, -0.6 * k, -k, -0.2 * k, -0.9 * k, 0.3 * k);
  hs.bezierCurveTo(-0.8 * k, 0.8 * k, -0.15 * k, 0.85 * k, 0, 0.35 * k);
  hs.bezierCurveTo(0.15 * k, 0.85 * k, 0.8 * k, 0.8 * k, 0.9 * k, 0.3 * k);
  hs.bezierCurveTo(k, -0.2 * k, 0.2 * k, -0.6 * k, 0, -0.9 * k);
  const heart = new THREE.Mesh(new THREE.ExtrudeGeometry(hs, { depth: 0.012, bevelEnabled: false }), std(0xe5566f, 0.4));
  heart.position.y = -0.16;
  charm.add(string, heart);
  g.add(mirror, charm);

  // steering wheel
  const wheel = new THREE.Group();
  wheel.position.set(0, 1.02, -0.76);
  wheel.rotation.x = -0.55;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.022, 10, 40), std(PINK, 0.4));
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 20), cream);
  hub.rotation.x = Math.PI / 2;
  const hubHeart = new THREE.Mesh(new THREE.ShapeGeometry(hs, 10), std(0xe5566f, 0.4));
  hubHeart.scale.setScalar(0.9);
  hubHeart.position.z = 0.025;
  wheel.add(rim, hub, hubHeart);
  for (const a of [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.016), cream);
    spoke.geometry.translate(0.08, 0, 0);
    spoke.rotation.z = a - Math.PI / 2;
    wheel.add(spoke);
  }
  g.add(wheel);
  return { group: g, wheel, needle, charm };
}

// ---------------------------------------------------------------- ride

export function playRide(opts: RideOptions): Promise<void> {
  return new Promise((resolve) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduce ? Math.min(opts.duration, 4) : opts.duration;

    const overlay = document.createElement('div');
    overlay.className = 'ride';
    overlay.innerHTML = `
      <canvas></canvas>
      <div class="ride-top">
        <span class="ride-title"></span>
        <div class="ride-bar"><i></i><b></b></div>
      </div>
      <button type="button" class="px-btn px-btn-wide ride-skip">Skip &gt;&gt;</button>
      <div class="ride-fade in"></div>`;
    overlay.querySelector('.ride-title')!.textContent = `Driving to ${opts.name}`;
    const canvas = overlay.querySelector('canvas')!;
    const barFill = overlay.querySelector<HTMLElement>('.ride-bar i')!;
    const barCar = overlay.querySelector<HTMLElement>('.ride-bar b')!;
    const fade = overlay.querySelector<HTMLElement>('.ride-fade')!;
    document.getElementById('ui')!.appendChild(overlay);

    // ---------- renderer, sky, light
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    const scene = new THREE.Scene();
    const horizon = opts.theme === 'beach' ? '#ffe9cc' : '#fde7c8';
    scene.background = canvasTexture(4, 256, (g) => {
      const grd = g.createLinearGradient(0, 0, 0, 256);
      grd.addColorStop(0, '#7fc8ee');
      grd.addColorStop(0.55, '#bfe4f4');
      grd.addColorStop(1, horizon);
      g.fillStyle = grd;
      g.fillRect(0, 0, 4, 256);
    });
    scene.fog = new THREE.Fog(new THREE.Color(horizon), 45, 170);
    scene.add(new THREE.HemisphereLight(0xfff6ec, 0xb08a6a, 1.6));
    const sun = new THREE.DirectionalLight(0xfff2dc, 1.6);
    sun.position.set(-20, 30, -10);
    scene.add(sun);
    const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(9, 32), new THREE.MeshBasicMaterial({ color: 0xfff3b0, fog: false }));
    sunDisc.position.set(40, 45, -260);
    scene.add(sunDisc);

    const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 400);
    camera.position.set(0, 1.28, 0.05);
    camera.lookAt(0, 0.85, -12);
    const baseRot = camera.rotation.clone();

    // ---------- ground and road (textures scroll as we drive)
    const groundColors: Record<RideTheme, [string, string[]]> = {
      beach: ['#e3c48c', ['#d2ae72', '#f0d9a6']],
      pyramids: ['#e3c48c', ['#d2ae72', '#f0d9a6']],
      modern: ['#e8d3a3', ['#d9c08c', '#9fcf72']],
      city: ['#e6d7b6', ['#d4c19c', '#f1e4c6']],
    };
    const [gBase, gDots] = groundColors[opts.theme];
    const groundTex = canvasTexture(64, 64, speckles(gBase, gDots), [60, 60], true);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -180;
    scene.add(ground);
    const ROAD_TILE = 8;
    const roadTex = canvasTexture(
      64,
      64,
      (g) => {
        g.fillStyle = '#7b7470';
        g.fillRect(0, 0, 64, 64);
        g.fillStyle = '#6c6560';
        for (let i = 0; i < 40; i++) g.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
        g.fillStyle = '#f6eed8';
        g.fillRect(2, 0, 3, 64);
        g.fillRect(59, 0, 3, 64);
        g.fillStyle = opts.theme === 'beach' ? '#f2c14e' : '#f6eed8';
        g.fillRect(30, 0, 4, 34);
      },
      [1, 400 / ROAD_TILE],
      true,
    );
    const road = new THREE.Mesh(new THREE.PlaneGeometry(7, 400), new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.9 }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.01, -195);
    scene.add(road);
    const curbMat = std(0xe9dcc0, 0.9);
    for (const side of [-1, 1]) {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 400), curbMat);
      curb.position.set(side * 3.7, 0.06, -195);
      scene.add(curb);
    }

    // ---------- the trip: progress eases in and out; everything is placed along the road (u)
    const D = 26 * duration;
    const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    const world = new THREE.Group();
    scene.add(world);
    const kit = makeKit(opts.theme);
    const props: Array<{ obj: THREE.Object3D; u: number }> = [];
    const nextU = { left: 6, right: 9 };
    const bridge = opts.crossesNile ? { start: D * 0.42, len: 46 } : null;
    const onBridge = (u: number) => !!bridge && u > bridge.start - 4 && u < bridge.start + bridge.len + 4;

    const spawnUntil = (dMax: number, d: number) => {
      for (const side of ['left', 'right'] as const) {
        while (nextU[side] < dMax && nextU[side] < D + 8) {
          const u = nextU[side];
          nextU[side] += 6 + Math.random() * 7;
          if (onBridge(u)) continue;
          const kind = pickKind(opts.theme, u / D);
          const obj = kit.build(kind);
          const far = kind === 'building' || kind === 'tower' || kind === 'villa' || kind === 'chalet' || kind === 'dune';
          const x = (side === 'left' ? -1 : 1) * (far ? 7 + Math.random() * 4 : 4.4 + Math.random() * 1.5);
          obj.position.x = x;
          obj.rotation.y = Math.random() * 0.4 - 0.2;
          world.add(obj);
          props.push({ obj, u });
        }
      }
      void d;
    };

    // oncoming traffic on the other lane
    const traffic: Array<{ obj: THREE.Object3D; u: number }> = [];
    {
      for (let i = 0; i < 3; i++) {
        const car = new THREE.Group();
        const body = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.6, 3, 3, 0.18), std([0x5b8fd6, 0xf2c14e, 0xffffff][i], 0.4));
        body.position.y = 0.5;
        const cab = new THREE.Mesh(new RoundedBoxGeometry(1.3, 0.5, 1.6, 3, 0.15), std(0xcfeaf5, 0.1));
        cab.position.set(0, 1.0, 0.1);
        car.add(body, cab);
        car.position.x = -1.7;
        world.add(car);
        traffic.push({ obj: car, u: 30 + i * 45 });
      }
    }

    // Nile bridge: water on both sides, railings, lamps
    if (bridge) {
      const b = new THREE.Group();
      const water = new THREE.Mesh(
        new THREE.PlaneGeometry(400, bridge.len + 30),
        new THREE.MeshStandardMaterial({ color: 0x3aa7b8, roughness: 0.2, metalness: 0.1 }),
      );
      water.rotation.x = -Math.PI / 2;
      water.position.set(0, 0.02, -(bridge.len / 2));
      const deck = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, bridge.len), std(0xa4876a, 0.8));
      deck.position.set(0, -0.1, -bridge.len / 2);
      b.add(water, deck);
      for (const side of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, bridge.len), std(0x5a4636, 0.6));
        rail.position.set(side * 3.9, 0.9, -bridge.len / 2);
        b.add(rail);
        for (let z = 0; z < bridge.len; z += 4) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.12), std(0x5a4636, 0.6));
          post.position.set(side * 3.9, 0.45, -z);
          b.add(post);
        }
        for (let z = 6; z < bridge.len; z += 14) {
          const l = kit.build('lamp');
          l.position.set(side * 4.3, 0, -z);
          b.add(l);
        }
      }
      // a felucca on the water
      const boat = new THREE.Group();
      const hull = new THREE.Mesh(new RoundedBoxGeometry(2.4, 0.4, 0.8, 2, 0.15), std(0x8a5a3a, 0.8));
      const sail = new THREE.Mesh(new THREE.ConeGeometry(1, 3.2, 3), std(0xffffff, 0.7));
      sail.scale.set(0.8, 1, 0.05);
      sail.position.y = 1.8;
      boat.add(hull, sail);
      boat.position.set(-14, 0.2, -bridge.len * 0.4);
      b.add(boat);
      world.add(b);
      props.push({ obj: b, u: bridge.start });
    }

    // ---------- destination: horizon features and the arrival billboard
    const dest = new THREE.Group();
    world.add(dest);
    props.push({ obj: dest, u: D + 16 });
    if (opts.theme === 'beach') {
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 300), new THREE.MeshStandardMaterial({ color: 0x37b3c4, roughness: 0.25, metalness: 0.1 }));
      sea.rotation.x = -Math.PI / 2;
      sea.position.set(0, 0.04, -150);
      const shore = new THREE.Mesh(new THREE.PlaneGeometry(400, 10), std(0xfbf1da, 1));
      shore.rotation.x = -Math.PI / 2;
      shore.position.set(0, 0.035, 3);
      const foam = new THREE.Mesh(new THREE.PlaneGeometry(400, 1.2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      foam.rotation.x = -Math.PI / 2;
      foam.position.set(0, 0.045, -1.5);
      dest.add(sea, shore, foam);
    }
    const horizonGroup = new THREE.Group();
    scene.add(horizonGroup);
    if (opts.theme === 'pyramids') {
      const stone = std(0xe9c27a, 0.9);
      for (const [x, s] of [
        [-30, 22],
        [5, 30],
        [34, 18],
      ]) {
        const p = new THREE.Mesh(new THREE.ConeGeometry(s * 0.8, s, 4), stone);
        p.rotation.y = Math.PI / 4;
        p.position.set(x, s / 2, 0);
        horizonGroup.add(p);
      }
    } else if (opts.theme === 'city' || opts.theme === 'modern') {
      const sky = std(opts.theme === 'modern' ? 0x9cc8dc : 0xd9c4a8, 1);
      for (let i = 0; i < 18; i++) {
        const h = 8 + Math.random() * (opts.theme === 'modern' ? 30 : 16);
        const b = new THREE.Mesh(new THREE.BoxGeometry(6 + Math.random() * 6, h, 4), sky);
        b.position.set(-80 + i * 9.5, h / 2, -Math.random() * 10);
        horizonGroup.add(b);
      }
    }
    horizonGroup.position.z = -170;

    // billboard with the destination's pixel emblem + name
    const emblemDef = opts.emblem ? EMBLEMS[opts.emblem] : undefined;
    const board = new THREE.Group();
    const posts = std(0x6b5440, 0.8);
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3.4, 0.15), posts);
      post.position.set(side * 1.3, 1.7, 0);
      board.add(post);
    }
    const panel = new THREE.Mesh(new RoundedBoxGeometry(3.2, 3.4, 0.15, 3, 0.1), std(0xfbf1dc, 0.7));
    panel.position.y = 3.6;
    board.add(panel);
    if (emblemDef) {
      const tex = new THREE.CanvasTexture(renderSprite(emblemDef));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      const art = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
      art.position.set(0, 3.95, 0.09);
      board.add(art);
    }
    const nameTex = canvasTexture(256, 48, (g) => {
      g.fillStyle = '#e5566f';
      g.fillRect(0, 0, 256, 48);
      g.fillStyle = '#ffffff';
      g.font = '16px "Press Start 2P", monospace';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(opts.name.toUpperCase(), 128, 26);
    });
    const label = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.56), new THREE.MeshBasicMaterial({ map: nameTex }));
    label.position.set(0, 2.25, 0.09);
    board.add(label);
    board.position.set(3.0, 0, 0);
    board.rotation.y = -0.35;
    dest.add(board);

    // ---------- cockpit
    const cockpit = buildCockpit();
    scene.add(cockpit.group);

    // ---------- resize
    const resize = () => {
      const w = overlay.clientWidth;
      const h = overlay.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // keep the road and wheel framed on tall phones
      camera.fov = w / h < 0.7 ? 68 : 58;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(overlay);
    resize();

    // ---------- loop
    let start = performance.now();
    let last = start;
    let raf = 0;
    let finished = false;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = Math.min(1, (now - start) / 1000 / duration);
      const d = ease(t) * D;
      const speed = t < 1 ? (ease(Math.min(1, t + 0.01)) - ease(t)) * D / (0.01 * duration) : 0;

      spawnUntil(d + 130, d);
      for (let i = props.length - 1; i >= 0; i--) {
        const p = props[i];
        p.obj.position.z = -(p.u - d);
        if (p.u < d - 6 && p.obj !== dest) {
          world.remove(p.obj);
          props.splice(i, 1);
        }
      }
      for (const car of traffic) {
        car.u -= 18 * dt; // they drive towards us
        if (car.u < d - 6) car.u = d + 90 + Math.random() * 40;
        car.obj.position.z = -(car.u - d);
        car.obj.visible = !(opts.theme === 'beach' && car.u > D);
      }
      roadTex.offset.y = d / ROAD_TILE;
      groundTex.offset.y = (d / 400) * 60;
      horizonGroup.position.z = -170 + ease(t) * (opts.theme === 'pyramids' ? 95 : 40);

      // gentle steering, lean, bounce, needle, charm
      const sway = reduce ? 0 : Math.sin(now / 900) * 0.18 + Math.sin(now / 370) * 0.05;
      cockpit.wheel.rotation.z = sway;
      camera.rotation.set(baseRot.x, baseRot.y - sway * 0.02, baseRot.z + sway * 0.03);
      camera.position.y = 1.28 + (reduce ? 0 : Math.sin(now / 55) * 0.004 * Math.min(1, speed / 20));
      cockpit.needle.rotation.z = Math.PI * 0.75 - Math.min(1, speed / 40) * Math.PI * 1.3;
      cockpit.charm.rotation.z = reduce ? 0 : Math.sin(now / 300) * 0.3 * Math.min(1, speed / 20) + sway * 0.5;

      barFill.style.width = `${t * 100}%`;
      barCar.style.left = `${t * 100}%`;
      renderer.render(scene, camera);
      if (t >= 1 && !finished) {
        finished = true;
        setTimeout(() => end(), 650);
      }
      raf = requestAnimationFrame(frame);
    };

    // ---------- start / end
    let ended = false;
    const end = () => {
      if (ended) return;
      ended = true;
      fade.classList.add('in');
      setTimeout(() => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        scene.traverse((o) => {
          const m = o as THREE.Mesh;
          m.geometry?.dispose();
          const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
          for (const mt of mats) {
            (mt as THREE.MeshStandardMaterial).map?.dispose();
            mt.dispose();
          }
        });
        (scene.background as THREE.Texture | null)?.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        overlay.remove();
        resolve();
      }, 260);
    };
    overlay.querySelector('.ride-skip')!.addEventListener('click', end);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') end();
    };
    window.addEventListener('keydown', onKey, { once: true });

    requestAnimationFrame((now) => {
      start = now;
      last = now;
      fade.classList.remove('in');
      frame(now);
    });
    // first frame immediately so there's no blank flash
    renderer.render(scene, camera);
  });
}
