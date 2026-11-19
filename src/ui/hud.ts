import type { MapScene } from '../game/MapScene';

const ICONS = {
  // 16×16 pixel icons as inline SVG (crisp at any DPR)
  hanger:
    '<svg viewBox="0 0 16 16" width="22" height="22" shape-rendering="crispEdges" fill="currentColor"><path d="M7 1h2v1h1v2H9v1h1v1h1v1h1v1h1v1h1v1h1v3H1v-3h1V9h1V8h1V7h1V6h1V5h1V3h1V2H7zM2 11v1h12v-1h-1v-1h-1V9h-1V8h-1V7H6v1H5v1H4v1H3v1z"/></svg>',
  recenter:
    '<svg viewBox="0 0 16 16" width="22" height="22" shape-rendering="crispEdges" fill="currentColor"><path d="M7 0h2v3H7zM7 13h2v3H7zM0 7h3v2H0zM13 7h3v2h-3zM5 3h6v1H5zM5 12h6v1H5zM3 5h1v6H3zM12 5h1v6h-1zM4 4h1v1H4zM11 4h1v1h-1zM4 11h1v1H4zM11 11h1v1h-1zM7 7h2v2H7z"/></svg>',
  plus: '<svg viewBox="0 0 16 16" width="18" height="18" shape-rendering="crispEdges" fill="currentColor"><path d="M7 2h2v12H7zM2 7h12v2H2z"/></svg>',
  minus: '<svg viewBox="0 0 16 16" width="18" height="18" shape-rendering="crispEdges" fill="currentColor"><path d="M2 7h12v2H2z"/></svg>',
  map: '<svg viewBox="0 0 16 16" width="20" height="20" shape-rendering="crispEdges" fill="currentColor"><path d="M1 2h4v1h1v1h4V3h1V2h4v12h-4v1h-1v-1H6v1H5v-1H1zM2 3v10h3V4H2zm4 1v9h4V4zm5 0v9h3V3h-3z"/></svg>',
};

function button(icon: string, label: string, onClick: () => void) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'px-btn';
  b.innerHTML = icon;
  b.title = label;
  b.setAttribute('aria-label', label);
  b.addEventListener('click', onClick);
  return b;
}

/** Map HUD (Phase 2): zoom, whole-map, recenter, and the Skip button for long trips. */
export function mountHud(root: HTMLElement, getScene: () => MapScene | undefined) {
  const withScene = (fn: (s: MapScene) => void) => () => {
    const s = getScene();
    if (s?.camControl) fn(s);
  };

  const right = document.createElement('div');
  right.className = 'hud hud-right';
  right.append(
    button(ICONS.plus, 'Zoom in', withScene((s) => s.camControl.stepZoom(1))),
    button(ICONS.minus, 'Zoom out', withScene((s) => s.camControl.stepZoom(-1))),
    button(ICONS.map, 'Whole map', withScene((s) => s.camControl.zoomTo(s.camControl.minZoom))),
    button(ICONS.recenter, 'Recenter on Kuku', withScene((s) => s.recenter())),
    button(ICONS.hanger, 'Wardrobe', withScene((s) => void s.openWardrobe())),
  );
  root.appendChild(right);

  const skip = document.createElement('button');
  skip.type = 'button';
  skip.className = 'px-btn px-btn-wide skip-btn';
  skip.textContent = 'Skip >>';
  skip.hidden = true;
  skip.addEventListener('click', withScene((s) => s.skipTrip()));
  root.appendChild(skip);

  const pet = document.createElement('button');
  pet.type = 'button';
  pet.className = 'px-btn px-btn-wide pet-btn';
  pet.innerHTML = '<span class="pet-heart" aria-hidden="true"></span><span>Pet Zuzu</span>';
  pet.hidden = true;
  pet.addEventListener('click', withScene((s) => s.petZuzu()));
  root.appendChild(pet);

  return {
    setSkipVisible(visible: boolean) {
      skip.hidden = !visible;
    },
    setPetVisible(visible: boolean) {
      pet.hidden = !visible;
    },
  };
}
