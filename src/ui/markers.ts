import type { Place } from '../content';
import { wx, wy } from '../game/world';

/**
 * DOM labels positioned from world coordinates every frame, so they stay crisp
 * and keep a constant on-screen size at any zoom. Phase 3 turns these into the
 * full photo-bubble markers.
 */
export class MarkerLayer {
  private items = new Map<string, { place: Place; el: HTMLButtonElement; x: number; y: number }>();

  constructor(
    private root: HTMLElement,
    places: Place[],
    onTap: (place: Place) => void,
  ) {
    for (const place of places) {
      const el = document.createElement('button');
      el.className = 'marker';
      el.type = 'button';
      el.innerHTML = `<span class="marker-pin"></span><span class="marker-name"><span class="marker-check" aria-hidden="true"></span><span class="marker-label"></span></span>`;
      el.querySelector('.marker-label')!.textContent = place.name;
      el.setAttribute('aria-label', place.name);
      el.addEventListener('click', () => onTap(place));
      root.appendChild(el);
      this.items.set(place.id, { place, el, x: wx(place.position.x), y: wy(place.position.y) });
    }
  }

  setVisited(id: string, visited: boolean) {
    const it = this.items.get(id);
    if (!it) return;
    it.el.classList.toggle('visited', visited);
    it.el.setAttribute('aria-label', `${it.place.name}${visited ? ' (visited)' : ''}`);
  }

  setSelected(id: string | null) {
    for (const [pid, it] of this.items) it.el.classList.toggle('selected', pid === id);
  }

  /**
   * @param viewX/viewY top-left of the visible world rect
   * @param scale CSS px per world px
   * @param zoom visual zoom (for far-out simplification)
   */
  update(viewX: number, viewY: number, scale: number, zoom: number) {
    this.root.classList.toggle('far', zoom < 0.35);
    for (const it of this.items.values()) {
      const sx = Math.round((it.x - viewX) * scale);
      const sy = Math.round((it.y - viewY) * scale);
      it.el.style.transform = `translate(${sx}px, ${sy}px)`;
    }
  }
}
