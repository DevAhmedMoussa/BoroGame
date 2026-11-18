import type { MapScene } from '../game/MapScene';

/** Phase 1 HUD: zoom in / out / overview. The full HUD arrives in Phase 6. */
export function mountHud(root: HTMLElement, getScene: () => MapScene | undefined) {
  const hud = document.createElement('div');
  hud.className = 'hud hud-right';
  const buttons: Array<[string, string, (s: MapScene) => void]> = [
    ['+', 'Zoom in', (s) => s.camControl.stepZoom(1)],
    ['-', 'Zoom out', (s) => s.camControl.stepZoom(-1)],
    ['▣', 'Whole map', (s) => s.camControl.zoomTo(s.camControl.minZoom)],
  ];
  for (const [label, title, act] of buttons) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'px-btn';
    b.textContent = label;
    b.title = title;
    b.setAttribute('aria-label', title);
    b.addEventListener('click', () => {
      const s = getScene();
      if (s?.camControl) act(s);
    });
    hud.appendChild(b);
  }
  root.appendChild(hud);
}
