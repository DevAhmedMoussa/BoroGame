import type { Place } from '../content';
import { wx, wy } from '../game/world';

/**
 * DOM labels positioned from world coordinates every frame, so they stay crisp
 * and keep a constant on-screen size at any zoom. Phase 3 turns these into the
 * full photo-bubble markers.
 */
export class MarkerLayer {
  private items: Array<{ place: Place; el: HTMLButtonElement; x: number; y: number }> = [];

  constructor(
    private root: HTMLElement,
    places: Place[],
    onTap: (place: Place) => void,
  ) {
    for (const place of places) {
      const el = document.createElement('button');
      el.className = 'marker';
      el.type = 'button';
      el.innerHTML = `<span class="marker-pin"></span><span class="marker-name"></span>`;
      el.querySelector('.marker-name')!.textContent = place.name;
      el.setAttribute('aria-label', place.name);
      el.addEventListener('click', () => onTap(place));
      root.appendChild(el);
      this.items.push({ place, el, x: wx(place.position.x), y: wy(place.position.y) });
    }
  }

  /**
   * @param viewX/viewY top-left of the visible world rect
   * @param scale CSS px per world px
   * @param zoom visual zoom (for far-out simplification)
   */
  update(viewX: number, viewY: number, scale: number, zoom: number) {
    this.root.classList.toggle('far', zoom < 0.35);
    for (const it of this.items) {
      const sx = Math.round((it.x - viewX) * scale);
      const sy = Math.round((it.y - viewY) * scale);
      it.el.style.transform = `translate(${sx}px, ${sy}px)`;
    }
  }
}
