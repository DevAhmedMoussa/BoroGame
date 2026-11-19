import * as THREE from 'three';
import './wardrobe.css';
import { KUKU_GLASSES } from '../config';
import { LAYERS, normalizeOutfit, type Outfit } from '../lib/outfit';
import { dressKuku } from '../three/clothes';
import { buildKuku } from '../three/kukuModel';

type LayerKey = (typeof LAYERS)[number]['key'];

/**
 * Wardrobe screen: a big live 3D preview of Kuku turning slowly (drag to spin her),
 * ‹ › arrows to change each layer, colour swatches, and Done.
 * Only clothes and accessories change; her face, hair, skin and glasses stay hers.
 * Resolves with the chosen outfit.
 */
export function openWardrobe(initial: Outfit): Promise<Outfit> {
  return new Promise((resolve) => {
    let outfit = normalizeOutfit(initial);
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="wd px-frame" role="dialog" aria-modal="true" aria-labelledby="wd-title">
        <header class="wd-head">
          <h2 id="wd-title">Wardrobe</h2>
          <p>Pick today's outfit</p>
        </header>
        <div class="wd-stage" aria-label="Kuku preview (drag to turn her)"><canvas></canvas></div>
        <div class="wd-rows"></div>
        <button type="button" class="px-btn px-btn-wide wd-done">Done</button>
      </div>`;
    const stage = backdrop.querySelector<HTMLElement>('.wd-stage')!;
    const canvas = stage.querySelector('canvas')!;
    const rows = backdrop.querySelector<HTMLElement>('.wd-rows')!;

    // ---------- 3D preview
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xfff6ec, 0xb08a6a, 2.0));
    const key = new THREE.DirectionalLight(0xfff8f0, 1.35);
    key.position.set(-2, 4, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffe0ee, 0.7);
    rim.position.set(2, 2.5, -3);
    scene.add(rim);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(0.55, 40), new THREE.MeshBasicMaterial({ color: 0x2b1d14, transparent: true, opacity: 0.12 }));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const rig = buildKuku({ glasses: KUKU_GLASSES, outfit });
    // hands-on-hips pose, like her avatar
    rig.armL.rotation.set(0.1, 0, 0.62);
    rig.armR.rotation.set(0.1, 0, -0.62);
    rig.forearmL.rotation.set(0, 0, -1.5);
    rig.forearmR.rotation.set(0, 0, 1.5);
    const holder = new THREE.Group();
    holder.add(rig.root);
    scene.add(holder);

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    const el = THREE.MathUtils.degToRad(8);
    camera.position.set(0, 1.28 + Math.sin(el) * 30, Math.cos(el) * 30);
    camera.lookAt(0, 1.28, 0);
    const resize = () => {
      const w = Math.max(1, stage.clientWidth);
      const h = Math.max(1, stage.clientHeight);
      renderer.setSize(w, h, false);
      const half = 1.42;
      const aspect = w / h;
      camera.left = -half * aspect;
      camera.right = half * aspect;
      camera.top = half;
      camera.bottom = -half;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(stage);

    // slow turn, drag to spin
    let yaw = 0.35;
    let spin = 0.55;
    let drag: { x: number; yaw: number } | null = null;
    stage.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX, yaw };
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', (e) => {
      if (drag) yaw = drag.yaw + (e.clientX - drag.x) * 0.012;
    });
    const endDrag = () => {
      drag = null;
    };
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!drag && !reduce) yaw += spin * dt;
      holder.rotation.y = yaw;
      rig.body.position.y = reduce ? 0 : Math.sin(now / 450) * 0.006;
      rig.head.rotation.z = reduce ? 0 : Math.sin(now / 1200) * 0.04;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };

    // ---------- layer rows
    const renderRows = () => {
      rows.innerHTML = '';
      for (const layer of LAYERS) {
        const k = layer.key as LayerKey;
        const items = layer.items;
        const idx = Math.max(0, items.findIndex((i) => i.id === outfit[k]));
        const item = items[idx];
        const covered = k === 'top' && outfit.bottom === 'dress';
        const row = document.createElement('div');
        row.className = `wd-row${covered ? ' covered' : ''}`;
        row.innerHTML = `
          <span class="wd-label"></span>
          <button type="button" class="wd-arrow" aria-label="Previous ${layer.label.toLowerCase()}">‹</button>
          <span class="wd-name" aria-live="polite"></span>
          <button type="button" class="wd-arrow" aria-label="Next ${layer.label.toLowerCase()}">›</button>
          <div class="wd-swatches" role="radiogroup" aria-label="${layer.label} colour"></div>`;
        row.querySelector('.wd-label')!.textContent = layer.label;
        row.querySelector('.wd-name')!.textContent = covered ? 'Covered by the dress' : item.label;
        const [prev, next] = row.querySelectorAll<HTMLButtonElement>('.wd-arrow');
        prev.disabled = next.disabled = covered;
        const step = (d: number) => {
          const ni = (idx + d + items.length) % items.length;
          outfit = { ...outfit, [k]: items[ni].id, [`${k}Color`]: 0 };
          apply();
        };
        prev.addEventListener('click', () => step(-1));
        next.addEventListener('click', () => step(1));
        const sw = row.querySelector('.wd-swatches')!;
        if (!covered && item.id !== 'none') {
          item.colors.forEach((c, ci) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'wd-swatch';
            b.style.background = `#${c.toString(16).padStart(6, '0')}`;
            b.setAttribute('role', 'radio');
            b.setAttribute('aria-checked', String(outfit[`${k}Color`] === ci));
            b.setAttribute('aria-label', `Colour ${ci + 1}`);
            b.addEventListener('click', () => {
              outfit = { ...outfit, [`${k}Color`]: ci };
              apply();
            });
            sw.appendChild(b);
          });
        }
        rows.appendChild(row);
      }
    };
    const apply = () => {
      dressKuku(rig, outfit);
      // a little "twirl" so the change is noticed
      spin = 4;
      setTimeout(() => (spin = 0.55), 260);
      renderRows();
      renderer.render(scene, camera);
    };
    renderRows();

    // ---------- close
    const close = () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('keydown', onKey);
      renderer.dispose();
      renderer.forceContextLoss();
      backdrop.classList.add('closing', 'closing-pop');
      setTimeout(() => backdrop.remove(), 200);
      resolve(outfit);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') close();
    };
    window.addEventListener('keydown', onKey);
    backdrop.querySelector('.wd-done')!.addEventListener('click', close);

    document.getElementById('ui')!.appendChild(backdrop);
    holder.rotation.y = yaw;
    resize();
    raf = requestAnimationFrame(loop);
    backdrop.querySelector<HTMLButtonElement>('.wd-done')!.focus({ preventScroll: true });
  });
}
