import '@fontsource/press-start-2p';
import '@fontsource/vt323';
import './style.css';
import Phaser from 'phaser';
import { MapScene } from './game/MapScene';
import { mountHud } from './ui/hud';

// Render the canvas at device resolution (capped at 2) and scale it back down with CSS.
const dpr = Math.min(window.devicePixelRatio || 1, 2);
const host = document.getElementById('game')!;
// Never 0×0 (a hidden tab or iframe can report that), which would break WebGL framebuffers.
const size = () => ({
  w: Math.max(16, Math.round(host.clientWidth * dpr)),
  h: Math.max(16, Math.round(host.clientHeight * dpr)),
});

const { w, h } = size();
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: host,
  backgroundColor: '#8a6a48',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.NONE, width: w, height: h, zoom: 1 / dpr },
  input: { activePointers: 3 },
  disableContextMenu: true,
  scene: [MapScene],
  callbacks: { preBoot: (g) => g.registry.set('dpr', dpr) },
});

const mapScene = () => game.scene.getScene('Map') as MapScene | undefined;

let resizeQueued = false;
const onResize = () => {
  if (resizeQueued) return;
  resizeQueued = true;
  requestAnimationFrame(() => {
    resizeQueued = false;
    const s = size();
    game.scale.resize(s.w, s.h);
    const scene = mapScene();
    if (scene?.camControl) scene.onResize(s.w, s.h);
  });
};
new ResizeObserver(onResize).observe(host);

mountHud(document.getElementById('ui')!, mapScene);

// Block page-level pinch zoom / double-tap zoom on iOS Safari.
for (const evt of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(evt, (e) => e.preventDefault(), { passive: false });
}
