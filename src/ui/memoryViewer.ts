import type { Place } from '../content';
import { renderMemory } from '../content/markdown';
import { coverThumb, mediaFor, type Media } from '../content/media';
import { openLightbox } from './lightbox';

/**
 * The memory window that opens when Kuku arrives at a place:
 * header (emblem, name, date, ✕), a horizontal swipeable photo slider
 * (never stacked), and the written memory underneath.
 *
 * Closes via ✕, tapping outside, swiping down, or Escape. Resolves when closed.
 */
export function openMemory(place: Place): Promise<void> {
  return new Promise((resolve) => {
    const media = mediaFor(place.id);
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="mv px-frame" role="dialog" aria-modal="true" aria-labelledby="mv-title">
        <header class="mv-head">
          <span class="mv-emblem" aria-hidden="true"></span>
          <div class="mv-titles">
            <h2 id="mv-title"></h2>
            <p class="mv-sub"></p>
          </div>
          <button type="button" class="px-btn mv-close" aria-label="Close">✕</button>
        </header>
        <section class="mv-media" aria-label="Photos">
          <div class="mv-track" tabindex="0"></div>
          <button type="button" class="mv-arrow prev" aria-label="Previous photo">‹</button>
          <button type="button" class="mv-arrow next" aria-label="Next photo">›</button>
          <div class="mv-counter" aria-live="polite"></div>
          <div class="mv-dots" aria-hidden="true"></div>
        </section>
        <article class="mv-text"></article>
      </div>`;

    const win = backdrop.querySelector<HTMLElement>('.mv')!;
    const track = backdrop.querySelector<HTMLElement>('.mv-track')!;
    const counter = backdrop.querySelector<HTMLElement>('.mv-counter')!;
    const dots = backdrop.querySelector<HTMLElement>('.mv-dots')!;
    const prevBtn = backdrop.querySelector<HTMLButtonElement>('.mv-arrow.prev')!;
    const nextBtn = backdrop.querySelector<HTMLButtonElement>('.mv-arrow.next')!;

    backdrop.querySelector('#mv-title')!.textContent = place.name;
    backdrop.querySelector('.mv-sub')!.textContent = [place.date, place.area].filter(Boolean).join(' · ');
    const thumb = coverThumb(place.id);
    if (thumb) backdrop.querySelector('.mv-emblem')!.innerHTML = `<img src="${thumb}" alt="">`;
    backdrop.querySelector('.mv-text')!.innerHTML = renderMemory(place.memory || 'Memory coming soon.');

    // ---- slides
    if (media.length === 0) {
      track.innerHTML = `<figure class="mv-slide mv-empty"><p>Photos coming soon</p></figure>`;
    }
    media.forEach((m, i) => track.appendChild(slide(m, i)));
    const count = Math.max(1, media.length);
    dots.innerHTML = media.length > 1 ? media.map(() => '<i></i>').join('') : '';
    backdrop.classList.toggle('single', media.length <= 1);

    let index = 0;
    const setIndex = (i: number) => {
      index = Math.max(0, Math.min(count - 1, i));
      counter.textContent = media.length ? `${index + 1} / ${media.length}` : '';
      dots.querySelectorAll('i').forEach((d, k) => d.classList.toggle('on', k === index));
      prevBtn.disabled = index === 0;
      nextBtn.disabled = index === count - 1;
      // Pause any video that scrolled away
      track.querySelectorAll('video').forEach((v, k) => {
        if (Number(v.dataset.index) !== index && !v.paused) v.pause();
        void k;
      });
    };
    const goTo = (i: number, smooth = true) => {
      const target = Math.max(0, Math.min(count - 1, i));
      track.scrollTo({ left: target * track.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
      setIndex(target);
    };
    track.addEventListener('scroll', () => setIndex(Math.round(track.scrollLeft / Math.max(1, track.clientWidth))), { passive: true });
    prevBtn.addEventListener('click', () => goTo(index - 1));
    nextBtn.addEventListener('click', () => goTo(index + 1));
    setIndex(0);

    // ---- mouse drag to swipe on desktop (touch uses native momentum scrolling + snap)
    let drag: { x: number; left: number; moved: boolean } | null = null;
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { x: e.clientX, left: track.scrollLeft, moved: false };
      track.classList.add('dragging');
    });
    window.addEventListener('pointermove', onMouseDrag);
    window.addEventListener('pointerup', onMouseUp);
    function onMouseDrag(e: PointerEvent) {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 4) drag.moved = true;
      track.scrollLeft = drag.left - dx;
    }
    function onMouseUp(e: PointerEvent) {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const moved = drag.moved;
      drag = null;
      track.classList.remove('dragging');
      if (moved) {
        suppressClick = true;
        setTimeout(() => (suppressClick = false), 50);
        const w = track.clientWidth;
        goTo(Math.abs(dx) > w * 0.15 ? index + (dx < 0 ? 1 : -1) : Math.round(track.scrollLeft / w));
      }
    }
    let suppressClick = false;

    // ---- tap a photo for full screen; tap a video to play/pause
    track.addEventListener('click', (e) => {
      if (suppressClick) return;
      const t = e.target as HTMLElement;
      const img = t.closest<HTMLImageElement>('img.mv-photo');
      if (img) {
        lightboxOpen = true;
        void openLightbox(img.currentSrc || img.src, img.alt).then(() => (lightboxOpen = false));
        return;
      }
      const fig = t.closest<HTMLElement>('.mv-slide.video');
      const video = fig?.querySelector('video');
      if (video) {
        if (video.paused) void video.play();
        else video.pause();
        fig!.classList.toggle('playing', !video.paused);
      }
    });

    // ---- swipe down (on the header or photos) to close
    let pull: { id: number; x: number; y: number; dy: number; active: boolean } | null = null;
    const pullZone = (t: EventTarget | null) => !!(t as HTMLElement)?.closest('.mv-head, .mv-media') && !(t as HTMLElement).closest('button');
    win.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || !pullZone(e.target)) return;
      pull = { id: e.pointerId, x: e.clientX, y: e.clientY, dy: 0, active: false };
    });
    win.addEventListener('pointermove', (e) => {
      if (!pull || e.pointerId !== pull.id) return;
      const dx = e.clientX - pull.x;
      const dy = e.clientY - pull.y;
      if (!pull.active && dy > 14 && dy > Math.abs(dx) * 1.4) pull.active = true;
      if (!pull.active) return;
      pull.dy = Math.max(0, dy);
      win.style.transition = 'none';
      win.style.transform = `translateY(${pull.dy}px)`;
      backdrop.style.background = `rgba(43, 29, 20, ${0.45 * Math.max(0.2, 1 - pull.dy / 400)})`;
    });
    const endPull = (e: PointerEvent) => {
      if (!pull || e.pointerId !== pull.id) return;
      const done = pull.active && pull.dy > 90;
      pull = null;
      win.style.transition = '';
      backdrop.style.background = '';
      if (done) close('down');
      else win.style.transform = '';
    };
    win.addEventListener('pointerup', endPull);
    win.addEventListener('pointercancel', endPull);

    // ---- close
    let lightboxOpen = false;
    let closed = false;
    function close(how: 'down' | 'pop' = 'pop') {
      if (closed) return;
      closed = true;
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointermove', onMouseDrag);
      window.removeEventListener('pointerup', onMouseUp);
      track.querySelectorAll('video').forEach((v) => v.pause());
      backdrop.classList.add('closing', how === 'down' ? 'closing-down' : 'closing-pop');
      setTimeout(() => backdrop.remove(), 200);
      resolve();
    }
    const onKey = (e: KeyboardEvent) => {
      if (lightboxOpen) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') goTo(index + 1);
      else if (e.key === 'ArrowLeft') goTo(index - 1);
    };
    window.addEventListener('keydown', onKey);
    backdrop.querySelector('.mv-close')!.addEventListener('click', () => close());
    backdrop.addEventListener('pointerdown', (e) => {
      if (e.target === backdrop) close();
    });

    document.getElementById('ui')!.appendChild(backdrop);
    backdrop.querySelector<HTMLButtonElement>('.mv-close')!.focus({ preventScroll: true });
  });
}

function slide(m: Media, i: number): HTMLElement {
  const fig = document.createElement('figure');
  fig.className = `mv-slide ${m.type}`;
  const bg = document.createElement('div');
  bg.className = 'mv-bg';
  if (m.thumb) bg.style.backgroundImage = `url("${m.thumb}")`;
  fig.appendChild(bg);
  if (m.type === 'video') {
    const v = document.createElement('video');
    v.className = 'mv-photo';
    v.src = m.src;
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = i < 2 ? 'metadata' : 'none';
    v.dataset.index = String(i);
    fig.appendChild(v);
    const play = document.createElement('span');
    play.className = 'mv-play';
    play.setAttribute('aria-hidden', 'true');
    fig.appendChild(play);
  } else {
    const img = document.createElement('img');
    img.className = 'mv-photo';
    img.src = m.src;
    img.alt = m.caption ?? '';
    img.draggable = false;
    img.decoding = 'async';
    // First two load right away (they were preloaded on the walk over); the rest when swiped to.
    img.loading = i < 2 ? 'eager' : 'lazy';
    if (m.width && m.height) {
      img.width = m.width;
      img.height = m.height;
    }
    fig.appendChild(img);
  }
  if (m.caption) {
    const cap = document.createElement('figcaption');
    cap.textContent = m.caption;
    fig.appendChild(cap);
  }
  return fig;
}
