import '@fontsource/press-start-2p';
import '@fontsource/vt323';
import './style.css';
import './ui/memories.css';
import Phaser from 'phaser';
import { MapScene } from './game/MapScene';
import { mountHud } from './ui/hud';
import { Joystick } from './ui/joystick';

// Render the canvas at device resolution (capped at 2) and scale it back down with CSS.
const dpr = Math.min(window.devicePixelRatio || 1, 2);
const host = document.getElementById('game')!;
// Never 0×0 (a hidden tab or iframe can report that), which would break WebGL framebuffers.
const size = () => ({
  w: Math.max(16, Math.round(host.clientWidth * dpr)),
  h: Math.max(16, Math.round(host.clientHeight * dpr)),
});

const ui = document.getElementById('ui')!;
const joystick = new Joystick(ui);
const hud = mountHud(ui, () => mapScene());

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
  callbacks: {
    preBoot: (g) => {
      g.registry.set('dpr', dpr);
      g.registry.set('joystick', joystick);
      g.registry.set('onTripChange', (canSkip: boolean) => hud.setSkipVisible(canSkip));
      g.registry.set('onPetChange', (name: string | null) => hud.setPet(name));
    },
  },
});

function mapScene() {
  return game.scene.getScene('Map') as MapScene | undefined;
}

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

// Block page-level pinch zoom / double-tap zoom on iOS Safari.
for (const evt of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(evt, (e) => e.preventDefault(), { passive: false });
}

// Handy for debugging in the browser console during development only.
if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
