/**
 * Dev-only viewer for the 3D Kuku (opened via /avatar-lab.html during `npm run dev`).
 * Renders her big on a plain background so details can be checked and tuned.
 */
import * as THREE from 'three';
import { KUKU_GLASSES } from '../config';
import { buildCar } from './carModel';
import { HIP_Y, buildKuku } from './kukuModel';

const q = new URLSearchParams(location.search);
const view = q.get('view') ?? 'full';
const yaw = THREE.MathUtils.degToRad(Number(q.get('yaw') ?? 0));
const pose = q.get('pose') ?? 'idle';

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.setClearColor(0xf3e3c8);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xfff6ec, 0xb08a6a, 2.0));
const key = new THREE.DirectionalLight(0xfff8f0, 1.35);
key.position.set(-2, 4, 3);
scene.add(key);
const rim = new THREE.DirectionalLight(0xffe0ee, 0.7);
rim.position.set(2, 2.5, -3);
scene.add(rim);

const kuku = buildKuku({ glasses: q.get('glasses') !== '0' && KUKU_GLASSES });
const holder = new THREE.Group();
holder.rotation.y = yaw;
holder.add(kuku.root);
scene.add(holder);

if (pose === 'idle') {
  kuku.armL.rotation.set(0.1, 0, 0.62);
  kuku.armR.rotation.set(0.1, 0, -0.62);
  kuku.forearmL.rotation.set(0, 0, -1.5);
  kuku.forearmR.rotation.set(0, 0, 1.5);
} else if (pose === 'walk') {
  kuku.armL.rotation.set(-0.5, 0, 0.1);
  kuku.armR.rotation.set(0.5, 0, -0.1);
  kuku.forearmL.rotation.x = kuku.forearmR.rotation.x = -0.35;
  kuku.legL.rotation.x = 0.5;
  kuku.legR.rotation.x = -0.5;
  kuku.shinL.rotation.x = 0.85;
} else if (pose === 'car') {
  const car = buildCar();
  car.root.scale.setScalar(1.2);
  holder.add(car.root);
  kuku.legL.visible = kuku.legR.visible = false;
  kuku.root.position.set(car.seat.x * 1.2, car.seat.y * 1.2 - HIP_Y + 0.06, car.seat.z * 1.2);
  kuku.armL.rotation.set(-1.15, 0, 0.15);
  kuku.armR.rotation.set(-1.15, 0, -0.15);
  kuku.forearmL.rotation.x = kuku.forearmR.rotation.x = -0.55;
}

const aspect = innerWidth / innerHeight;
const half = view === 'face' ? 0.42 : pose === 'car' ? 1.9 : 1.45;
const centerY = view === 'face' ? 2.12 : pose === 'car' ? 1.0 : 1.25;
const camera = new THREE.OrthographicCamera(-half * aspect, half * aspect, half, -half, 0.1, 100);
const el = THREE.MathUtils.degToRad(view === 'face' ? 5 : 15);
camera.position.set(0, centerY + Math.sin(el) * 30, Math.cos(el) * 30);
camera.lookAt(0, centerY, 0);

renderer.render(scene, camera);
