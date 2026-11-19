import * as THREE from 'three';
import { buildCar, type CarRig } from './carModel';
import { buildKuku, type KukuRig } from './kukuModel';

/**
 * Renders the 3D Kuku (and her car) into a small transparent WebGL canvas that
 * sits over the Phaser map and follows her screen position every frame.
 * Movement logic stays in Phaser; this only draws.
 */

/** World px per 3D unit: Kuku is ~2.5 units, so ~75 world px tall. */
export const PX_PER_UNIT = 30;
/** Camera elevation (3/4 top-down view). */
const ELEVATION = THREE.MathUtils.degToRad(20);
/** Visible area around her, in 3D units on the view plane. */
const VIEW = { left: -1.7, right: 1.7, top: 2.85, bottom: -1.05 };
/** Upper bound for the canvas backing store (device px), to keep it cheap when zoomed in. */
const MAX_BACKING_PX = 760;
/** The car is drawn a little larger than life so it doesn't look tiny next to her curls. */
const CAR_SCALE = 1.2;

export interface AvatarState {
  /** Screen position (CSS px) of her feet. */
  sx: number;
  sy: number;
  /** Visual map zoom (CSS px per world px). */
  zoom: number;
  /** Facing direction in radians (0 = towards the camera / screen-down). */
  heading: number;
  moving: boolean;
  driving: boolean;
  /** Current hop height in world px. */
  hop: number;
  /** Seconds since last frame. */
  dt: number;
}

export class Avatar3D {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.OrthographicCamera;
  private kuku: KukuRig;
  private car: CarRig;
  private character = new THREE.Group();
  private shadow: THREE.Mesh;
  private cssSize = { w: 0, h: 0 };
  private yaw = 0;
  private phase = 0;
  private time = 0;
  private nextBlink = 2.5;
  private carAmount = 0; // 0 = walking, 1 = fully in the car
  private reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(
    parent: HTMLElement,
    private dpr: number,
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'avatar3d';
    parent.appendChild(this.canvas);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.camera = new THREE.OrthographicCamera(VIEW.left, VIEW.right, VIEW.top, VIEW.bottom, 0.1, 100);
    this.camera.position.set(0, Math.sin(ELEVATION), Math.cos(ELEVATION)).multiplyScalar(30);
    this.camera.lookAt(0, 0, 0);

    // Soft, warm lighting: sky/ground fill + a key light from the top-left + a cool rim
    this.scene.add(new THREE.HemisphereLight(0xfff6ec, 0xb08a6a, 2.0));
    const key = new THREE.DirectionalLight(0xfff8f0, 1.35);
    key.position.set(-2, 4, 3);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xffe0ee, 0.7);
    rim.position.set(2, 2.5, -3);
    this.scene.add(rim);

    // Contact shadow on the ground
    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.renderOrder = -1;
    this.scene.add(this.shadow);

    this.kuku = buildKuku();
    this.car = buildCar();
    this.car.root.visible = false;
    this.character.add(this.kuku.root, this.car.root);
    this.scene.add(this.character);
  }

  update(s: AvatarState) {
    this.resize(s.zoom);
    const { w, h } = this.cssSize;
    const originX = w / 2;
    const originY = (h * VIEW.top) / (VIEW.top - VIEW.bottom);
    this.canvas.style.transform = `translate3d(${Math.round(s.sx - originX)}px, ${Math.round(s.sy - originY)}px, 0)`;

    const dt = Math.min(s.dt, 0.05);
    this.time += dt;
    this.animate(s, dt);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.renderer.dispose();
    this.canvas.remove();
  }

  // ------------------------------------------------------------------

  private resize(zoom: number) {
    const w = (VIEW.right - VIEW.left) * PX_PER_UNIT * zoom;
    const h = (VIEW.top - VIEW.bottom) * PX_PER_UNIT * zoom;
    if (Math.abs(w - this.cssSize.w) < 1 && Math.abs(h - this.cssSize.h) < 1) return;
    this.cssSize = { w, h };
    const ratio = Math.min(this.dpr, MAX_BACKING_PX / Math.max(w, h));
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(Math.round(w), Math.round(h), false);
    this.canvas.style.width = `${Math.round(w)}px`;
    this.canvas.style.height = `${Math.round(h)}px`;
  }

  private animate(s: AvatarState, dt: number) {
    const k = this.kuku;
    const ease = (rate: number) => 1 - Math.exp(-dt * rate);

    // Turn smoothly towards the heading (shortest way round)
    let diff = s.heading - this.yaw;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.yaw += diff * ease(12);
    this.character.rotation.y = this.yaw;

    // Hop (arrival celebration)
    this.character.position.y = s.hop / PX_PER_UNIT;

    // Car in / out
    this.carAmount += ((s.driving ? 1 : 0) - this.carAmount) * ease(14);
    const inCar = this.carAmount > 0.5;
    this.car.root.visible = this.carAmount > 0.02;
    this.car.root.scale.setScalar(Math.max(0.001, this.carAmount) * CAR_SCALE);
    k.legL.visible = k.legR.visible = !inCar;
    if (inCar) k.root.position.copy(this.car.seat).multiplyScalar(this.carAmount * CAR_SCALE);
    else k.root.position.set(0, 0, 0);

    // Shadow follows the current shape
    const sw = inCar ? 1.5 * CAR_SCALE : 0.95;
    const sl = inCar ? 2.5 * CAR_SCALE : 0.75;
    this.shadow.scale.set(sw, sl, 1);
    this.shadow.rotation.z = this.yaw; // local z of the flattened plane is world up
    this.shadow.position.y = 0.005;
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = 1 / (1 + s.hop / 20);

    const t = this.time;
    if (inCar) {
      // Driving: hands on the wheel, wheels rolling, little road bounce
      k.armL.rotation.set(-1.1, 0, 0.15);
      k.armR.rotation.set(-1.1, 0, -0.15);
      for (const wheel of this.car.wheels) wheel.rotation.x += dt * (s.moving ? 18 : 0);
      this.car.root.position.y = s.moving && !this.reduceMotion ? Math.abs(Math.sin(t * 22)) * 0.025 : 0;
      k.body.position.y = 0;
      k.head.rotation.z = Math.sin(t * 2.2) * 0.05; // happy head bop
    } else if (s.moving) {
      // Walk cycle
      this.phase += dt * 11;
      const swing = Math.sin(this.phase);
      k.legL.rotation.x = swing * 0.6;
      k.legR.rotation.x = -swing * 0.6;
      k.armL.rotation.set(-swing * 0.55, 0, 0.22);
      k.armR.rotation.set(swing * 0.55, 0, -0.22);
      k.body.position.y = Math.abs(Math.cos(this.phase)) * 0.06;
      k.body.rotation.y = swing * 0.06;
      k.head.rotation.z = swing * 0.03;
      k.hair.scale.set(1, 1 + Math.abs(Math.cos(this.phase)) * 0.025, 1);
    } else {
      // Idle: settle the limbs, breathe, gentle hair bounce
      const settle = ease(10);
      k.legL.rotation.x += -k.legL.rotation.x * settle;
      k.legR.rotation.x += -k.legR.rotation.x * settle;
      const celebrating = s.hop > 0.5;
      const armTarget = celebrating ? 2.6 : 0.22;
      k.armL.rotation.x += -k.armL.rotation.x * settle;
      k.armR.rotation.x += -k.armR.rotation.x * settle;
      k.armL.rotation.z += (armTarget - k.armL.rotation.z) * ease(14);
      k.armR.rotation.z += (-armTarget - k.armR.rotation.z) * ease(14);
      k.body.rotation.y += -k.body.rotation.y * settle;
      const breathe = this.reduceMotion ? 0 : Math.sin(t * 2.2);
      k.body.position.y = breathe * 0.012;
      k.head.rotation.z = breathe * 0.025;
      k.hair.scale.set(1 + breathe * 0.01, 1 - breathe * 0.012, 1 + breathe * 0.01);
    }

    // Blink every few seconds
    if (t > this.nextBlink) {
      const b = (t - this.nextBlink) / 0.14;
      const open = b < 1 ? Math.abs(b * 2 - 1) : 1;
      for (const eye of k.eyes) eye.scale.y = Math.max(0.1, open);
      if (b >= 1) this.nextBlink = t + 2.5 + Math.random() * 3;
    }
  }
}

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  g.addColorStop(0, 'rgba(43,29,20,0.42)');
  g.addColorStop(0.6, 'rgba(43,29,20,0.22)');
  g.addColorStop(1, 'rgba(43,29,20,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
