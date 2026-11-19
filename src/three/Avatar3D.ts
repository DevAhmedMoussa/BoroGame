import * as THREE from 'three';
import { buildCar, type CarRig } from './carModel';
import { KUKU_GLASSES } from '../config';
import { HIP_Y, buildKuku, type KukuRig } from './kukuModel';

/**
 * Renders the 3D Kuku (and her car) into a small transparent WebGL canvas that
 * sits over the Phaser map and follows her screen position every frame.
 * Movement logic stays in Phaser; this only draws.
 */

/** World px per 3D unit: Kuku is ~2.5 units, so ~85 world px tall. */
export const PX_PER_UNIT = 34;
/** Camera elevation (3/4 top-down view). */
const ELEVATION = THREE.MathUtils.degToRad(20);
/** Visible area around her, in 3D units on the view plane. */
const VIEW = { left: -1.7, right: 1.7, top: 3.05, bottom: -1.05 };
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

    this.kuku = buildKuku({ glasses: KUKU_GLASSES });
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
    const t = this.time;

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
    if (inCar) {
      const seat = this.car.seat;
      k.root.position.set(seat.x * CAR_SCALE, seat.y * CAR_SCALE - HIP_Y + 0.06, seat.z * CAR_SCALE);
    } else k.root.position.set(0, 0, 0);

    // Shadow follows the current shape
    this.shadow.scale.set(inCar ? 1.5 * CAR_SCALE : 0.7, inCar ? 2.5 * CAR_SCALE : 0.5, 1);
    this.shadow.rotation.z = this.yaw; // local z of the flattened plane is world up
    this.shadow.position.y = 0.005;
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = 1 / (1 + s.hop / 20);

    // Pose targets for this frame: [x, y, z] rotations per joint
    type V3 = [number, number, number];
    const pose = {
      armL: [0, 0, 0.1] as V3,
      armR: [0, 0, -0.1] as V3,
      foreL: [0, 0, 0] as V3,
      foreR: [0, 0, 0] as V3,
      legL: [0, 0, 0] as V3,
      legR: [0, 0, 0] as V3,
      shinL: [0, 0, 0] as V3,
      shinR: [0, 0, 0] as V3,
    };
    let bodyY = 0;
    let bodyYaw = 0;
    let bodyTilt = 0;
    let headTilt = 0;

    if (inCar) {
      // Hands on the wheel, wheels rolling, a little road bounce
      pose.armL = [-1.15, 0, 0.15];
      pose.armR = [-1.15, 0, -0.15];
      pose.foreL = [-0.55, 0, 0];
      pose.foreR = [-0.55, 0, 0];
      for (const wheel of this.car.wheels) wheel.rotation.x += dt * (s.moving ? 18 : 0);
      this.car.root.position.y = s.moving && !this.reduceMotion ? Math.abs(Math.sin(t * 22)) * 0.025 : 0;
      headTilt = Math.sin(t * 2.2) * 0.06; // happy head bop
    } else if (s.moving) {
      // Walk: arms swing against the legs, the back knee bends
      this.phase += dt * 9;
      const swing = Math.sin(this.phase);
      pose.armL = [-swing * 0.5, 0, 0.1];
      pose.armR = [swing * 0.5, 0, -0.1];
      pose.foreL = [-0.35, 0, 0];
      pose.foreR = [-0.35, 0, 0];
      pose.legL = [swing * 0.5, 0, 0];
      pose.legR = [-swing * 0.5, 0, 0];
      pose.shinL = [Math.max(0, swing) * 0.85, 0, 0];
      pose.shinR = [Math.max(0, -swing) * 0.85, 0, 0];
      bodyY = Math.abs(Math.cos(this.phase)) * 0.035;
      bodyYaw = swing * 0.06;
      headTilt = swing * 0.025;
    } else if (s.hop > 0.5) {
      // Arrival: arms up!
      pose.armL = [0, 0, 2.7];
      pose.armR = [0, 0, -2.7];
    } else {
      // Idle: hands on hips like her avatar, breathing, a gentle sway
      pose.armL = [0.1, 0, 0.62];
      pose.armR = [0.1, 0, -0.62];
      pose.foreL = [0, 0, -1.5];
      pose.foreR = [0, 0, 1.5];
      const breathe = this.reduceMotion ? 0 : Math.sin(t * 2.2);
      bodyY = breathe * 0.006;
      bodyTilt = this.reduceMotion ? 0 : Math.sin(t * 1.1) * 0.015;
      headTilt = this.reduceMotion ? 0 : Math.sin(t * 0.8) * 0.05;
    }

    const blend = ease(14);
    const apply = (obj: THREE.Object3D, [x, y, z]: V3) => {
      obj.rotation.x += (x - obj.rotation.x) * blend;
      obj.rotation.y += (y - obj.rotation.y) * blend;
      obj.rotation.z += (z - obj.rotation.z) * blend;
    };
    apply(k.armL, pose.armL);
    apply(k.armR, pose.armR);
    apply(k.forearmL, pose.foreL);
    apply(k.forearmR, pose.foreR);
    apply(k.legL, pose.legL);
    apply(k.legR, pose.legR);
    apply(k.shinL, pose.shinL);
    apply(k.shinR, pose.shinR);
    k.body.position.y += (bodyY - k.body.position.y) * ease(20);
    k.body.rotation.y += (bodyYaw - k.body.rotation.y) * blend;
    k.body.rotation.z += (bodyTilt - k.body.rotation.z) * blend;
    k.head.rotation.z += (headTilt - k.head.rotation.z) * blend;
    // Curls bounce a little with each step
    const bounce = s.moving && !inCar ? Math.abs(Math.cos(this.phase)) * 0.02 : 0;
    k.hair.scale.y += (1 + bounce - k.hair.scale.y) * ease(20);

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
