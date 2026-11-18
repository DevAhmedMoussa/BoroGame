import type { Place } from '../content';

/**
 * PHASE 2 STAND-IN: a simple pixel window confirming the arrival.
 * Phase 3 replaces the body with the photo slider and written memory.
 * Resolves when the window is closed (✕, tap outside, or Escape).
 */
export function openMemory(place: Place): Promise<void> {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal px-frame" role="dialog" aria-modal="true" aria-labelledby="memory-title">
        <div class="modal-head">
          <h2 id="memory-title"></h2>
          <button type="button" class="px-btn modal-close" aria-label="Close">✕</button>
        </div>
        <p class="modal-area"></p>
        <p class="modal-body">You made it! The photo slider and memory arrive in Phase 3.</p>
      </div>`;
    backdrop.querySelector('h2')!.textContent = place.name;
    backdrop.querySelector('.modal-area')!.textContent = [place.area, place.date].filter(Boolean).join(' · ');
    document.getElementById('ui')!.appendChild(backdrop);

    const close = () => {
      window.removeEventListener('keydown', onKey);
      backdrop.classList.add('closing');
      setTimeout(() => backdrop.remove(), 160);
      resolve();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    backdrop.querySelector('.modal-close')!.addEventListener('click', close);
    backdrop.addEventListener('pointerdown', (e) => {
      if (e.target === backdrop) close();
    });
    (backdrop.querySelector('.modal-close') as HTMLButtonElement).focus();
  });
}
