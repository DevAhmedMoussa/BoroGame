import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/**
 * Kuku's glossy pink toy convertible, built from code. Faces +Z.
 * Kuku sits in the driver's seat at `seat` (her legs are hidden while driving).
 */
export interface CarRig {
  root: THREE.Group;
  wheels: THREE.Group[];
  /** Where Kuku's root goes while driving (car-local). */
  seat: THREE.Vector3;
}

const PINK = 0xff86bf;
const PINK_DARK = 0xd94f8f;
const CREAM = 0xfff1f6;

function heartShape(size: number) {
  const s = new THREE.Shape();
  const k = size;
  s.moveTo(0, -0.9 * k);
  s.bezierCurveTo(-0.2 * k, -0.6 * k, -1 * k, -0.2 * k, -0.9 * k, 0.3 * k);
  s.bezierCurveTo(-0.8 * k, 0.8 * k, -0.15 * k, 0.85 * k, 0, 0.35 * k);
  s.bezierCurveTo(0.15 * k, 0.85 * k, 0.8 * k, 0.8 * k, 0.9 * k, 0.3 * k);
  s.bezierCurveTo(1 * k, -0.2 * k, 0.2 * k, -0.6 * k, 0, -0.9 * k);
  return s;
}

export function buildCar(): CarRig {
  const root = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color: PINK, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.15 });
  const paintDark = new THREE.MeshStandardMaterial({ color: PINK_DARK, roughness: 0.5 });
  const cream = new THREE.MeshStandardMaterial({ color: CREAM, roughness: 0.6 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.6 });

  // Body
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.3, 0.44, 2.3, 4, 0.17), paint);
  body.position.y = 0.4;
  root.add(body);
  // Rounded hood bump and trunk
  const hood = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.16, 0.8, 4, 0.08), paint);
  hood.position.set(0, 0.62, 0.62);
  root.add(hood);
  // Cabin recess (convertible interior)
  const interior = new THREE.Mesh(new RoundedBoxGeometry(1.08, 0.06, 1.0, 3, 0.03), paintDark);
  interior.position.set(0, 0.615, -0.25);
  root.add(interior);
  // Seats
  for (const x of [-0.27, 0.27]) {
    const back = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.42, 0.13, 3, 0.06), cream);
    back.position.set(x, 0.82, -0.62);
    back.rotation.x = -0.15;
    root.add(back);
    const cushion = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.1, 0.4, 3, 0.04), cream);
    cushion.position.set(x, 0.66, -0.4);
    root.add(cushion);
  }
  // Windshield with white frame
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(1.06, 0.32),
    new THREE.MeshPhysicalMaterial({ color: 0xcfeaf5, roughness: 0.05, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }),
  );
  glass.position.set(0, 0.82, 0.18);
  glass.rotation.x = -0.45;
  root.add(glass);
  const frameTop = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 1.06, 4, 8), chrome);
  frameTop.rotation.z = Math.PI / 2;
  frameTop.position.set(0, 0.97, 0.11);
  root.add(frameTop);
  // Steering wheel
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 8, 20), new THREE.MeshStandardMaterial({ color: 0x3a2a30, roughness: 0.5 }));
  wheel.position.set(0.27, 0.8, 0.02);
  wheel.rotation.x = -0.75;
  root.add(wheel);

  // Bumpers
  for (const z of [1.18, -1.18]) {
    const bumper = new THREE.Mesh(new RoundedBoxGeometry(1.22, 0.13, 0.12, 3, 0.05), chrome);
    bumper.position.set(0, 0.26, z);
    root.add(bumper);
  }
  // Lights
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6c0, emissive: 0xfff0a0, emissiveIntensity: 0.6, roughness: 0.2 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xff4d6d, emissive: 0xff2050, emissiveIntensity: 0.4, roughness: 0.3 });
  for (const x of [-0.42, 0.42]) {
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), headMat);
    h.scale.z = 0.5;
    h.position.set(x, 0.45, 1.15);
    const t = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), tailMat);
    t.scale.z = 0.5;
    t.position.set(x, 0.45, -1.15);
    root.add(h, t);
  }
  // White hearts on the doors
  const heartMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  for (const side of [-1, 1]) {
    const heart = new THREE.Mesh(new THREE.ShapeGeometry(heartShape(0.11), 12), heartMat);
    heart.position.set(side * 0.652, 0.42, -0.05);
    heart.rotation.y = side * Math.PI / 2;
    root.add(heart);
  }

  // Wheels (rolling groups)
  const wheels: THREE.Group[] = [];
  const tyre = new THREE.MeshStandardMaterial({ color: 0x262626, roughness: 0.85 });
  for (const x of [-0.64, 0.64]) {
    for (const z of [0.75, -0.75]) {
      const g = new THREE.Group();
      g.position.set(x, 0.24, z);
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.2, 24), tyre);
      t.rotation.z = Math.PI / 2;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.21, 16), chrome);
      hub.rotation.z = Math.PI / 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.215, 0.04, 0.18), new THREE.MeshStandardMaterial({ color: PINK_DARK }));
      g.add(t, hub, spoke);
      root.add(g);
      wheels.push(g);
    }
  }

  return { root, wheels, seat: new THREE.Vector3(0.27, 0.37, -0.3) };
}
