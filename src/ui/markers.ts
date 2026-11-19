import type { Place } from '../content';
import { coverThumb, mediaFor } from '../content/media';
import { EMBLEM_TOP } from '../game/scenery';
import { wx, wy } from '../game/world';

/**
 * Place markers as a DOM overlay positioned from world coordinates every frame,
 * so they stay crisp and keep a constant on-screen size at any zoom.
 *
 * Each marker: a floating "memory bubble" (tiny pixelated photo + camera count,
 * like Snap Map memories) above the place, an invisible hit area on the place
 * itself, and the name banner below. The whole thing is one big tap target.
 */

/** Below this zoom the map is "far": thumbnails hide, just the count shows. */
const FAR_ZOOM = 0.35;
/** Markers closer than this on screen (CSS px) get nudged apart. */
const MIN_GAP = { x: 64, y: 78 };

const CAMERA_ICON =
  '<svg viewBox="0 0 10 8" width="11" height="9" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true"><path d="M3 0h4v1h3v7H0V1h3zM4 2v1H3v3h1v1h2V6h1V3H6V2zm0 1h2v3H4z"/></svg>';
const STAR =
  '<svg viewBox="0 0 7 7" width="10" height="10" shape-rendering="crispEdges" aria-hidden="true"><path fill="#fff6b0" d="M3 0h1v2h1v1h2v1H5v1H4v2H3V5H2V4H0V3h2V2h1z"/><path fill="#fff" d="M3 3h1v1H3z"/></svg>';

interface Item {
  place: Place;
  el: HTMLButtonElement;
  x: number;
  y: number;
  sx: number;
  sy: number;
  ox: number;
}

export class MarkerLayer {
  private items = new Map<string, Item>();

  constructor(
    private root: HTMLElement,
    places: Place[],
    onTap: (place: Place) => void,
  ) {
    places.forEach((place, i) => {
      const count = mediaFor(place.id).length;
      const el = document.createElement('button');
      el.className = 'marker';
      el.type = 'button';
      el.style.setProperty('--bob-delay', `${(i * 0.37) % 2.4}s`);
      el.innerHTML = `
        <span class="marker-bubble">
          <span class="bubble-photo"><canvas width="24" height="24"></canvas></span>
          <span class="bubble-count">${CAMERA_ICON}<span class="bubble-num"></span></span>
          <span class="bubble-sparkle">${STAR}</span>
        </span>
        <span class="marker-pin"></span>
        <span class="marker-name"><span class="marker-check" aria-hidden="true"></span><span class="marker-label"></span></span>`;
      el.querySelector('.marker-label')!.textContent = place.name;
      el.querySelector('.bubble-num')!.textContent = String(count);
      el.classList.toggle('empty', count === 0);
      this.label(el, place, false, count);
      el.addEventListener('click', () => onTap(place));
      root.appendChild(el);
      this.drawThumb(el.querySelector('canvas')!, place.id);
      this.items.set(place.id, { place, el, x: wx(place.position.x), y: wy(place.position.y), sx: 0, sy: 0, ox: 0 });
    });
  }

  /** Cover photo squeezed into 24×24 px and shown enlarged with hard pixels, to match the art style. */
  private drawThumb(canvas: HTMLCanvasElement, placeId: string) {
    const url = coverThumb(placeId);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ead7b3';
    ctx.fillRect(0, 0, 24, 24);
    if (!url) return;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, 24, 24);
    };
    img.src = url;
  }

  private label(el: HTMLElement, place: Place, visited: boolean, count = mediaFor(place.id).length) {
    el.setAttribute('aria-label', `${place.name}, ${count} photo${count === 1 ? '' : 's'}${visited ? ', visited' : ''}`);
  }

  setVisited(id: string, visited: boolean) {
    const it = this.items.get(id);
    if (!it) return;
    it.el.classList.toggle('visited', visited);
    this.label(it.el, it.place, visited);
  }

  private tags: Array<{ el: HTMLButtonElement; x: number; y: number }> = [];

  /** A small name tag pinned to a world point (e.g. Zuzu the dog), below it or `above` it. */
  addTag(text: string, x: number, y: number, onTap: () => void, above = false) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = above ? 'map-tag above' : 'map-tag';
    el.innerHTML = `<span class="map-tag-paw" aria-hidden="true"></span><span></span>`;
    el.lastElementChild!.textContent = text;
    el.setAttribute('aria-label', text);
    el.addEventListener('click', onTap);
    this.root.appendChild(el);
    this.tags.push({ el, x, y });
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
    this.root.classList.toggle('far', zoom < FAR_ZOOM);
    this.root.style.setProperty('--lift', `${Math.round(Math.max(18, EMBLEM_TOP * scale + 4))}px`);
    const list = [...this.items.values()];
    for (const it of list) {
      it.sx = Math.round((it.x - viewX) * scale);
      it.sy = Math.round((it.y - viewY) * scale);
      it.ox = 0;
    }
    // Nudge markers that would overlap on screen (e.g. Korba and Kuku's Home when zoomed out)
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const dx = b.sx - a.sx;
        if (Math.abs(b.sy - a.sy) >= MIN_GAP.y || Math.abs(dx) >= MIN_GAP.x) continue;
        const push = (MIN_GAP.x - Math.abs(dx)) / 2;
        const dir = dx >= 0 ? 1 : -1;
        a.ox -= push * dir;
        b.ox += push * dir;
      }
    }
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    for (const t of this.tags) {
      const x = Math.round((t.x - viewX) * scale);
      const y = Math.round((t.y - viewY) * scale);
      t.el.style.transform = `translate(${x}px, ${y}px)`;
    }
    for (const it of list) {
      const x = it.sx + Math.round(it.ox);
      const offscreen = x < -80 || x > w + 80 || it.sy < -60 || it.sy > h + 160;
      it.el.style.visibility = offscreen ? 'hidden' : '';
      if (!offscreen) it.el.style.transform = `translate(${x}px, ${it.sy}px)`;
    }
  }
}
