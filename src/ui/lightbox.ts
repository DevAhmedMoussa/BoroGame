/**
 * Full-screen photo view: pinch (or wheel) to zoom, drag to pan when zoomed,
 * double-tap to zoom in/out, single tap / ✕ / Escape to close.
 */
export function openLightbox(src: string, alt: string): Promise<void> {
  return new Promise((resolve) => {
    const box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', alt || 'Photo');
    box.innerHTML = `<img alt="" draggable="false"><button type="button" class="px-btn lightbox-close" aria-label="Close photo">✕</button>`;
    const img = box.querySelector('img')!;
    img.src = src;
    img.alt = alt;
    document.getElementById('ui')!.appendChild(box);

    let scale = 1;
    let tx = 0;
    let ty = 0;
    const apply = () => (img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`);
    const clampPan = () => {
      const r = img.getBoundingClientRect();
      const maxX = Math.max(0, (r.width - innerWidth) / 2);
      const maxY = Math.max(0, (r.height - innerHeight) / 2);
      tx = Math.max(-maxX, Math.min(maxX, tx));
      ty = Math.max(-maxY, Math.min(maxY, ty));
    };

    const pts = new Map<number, { x: number; y: number }>();
    let pinch: { d: number; s: number } | null = null;
    let moved = false;
    let lastTap = 0;
    let tapTimer = 0;

    const close = () => {
      window.removeEventListener('keydown', onKey, true);
      window.clearTimeout(tapTimer);
      box.classList.add('closing');
      setTimeout(() => box.remove(), 150);
      resolve();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener('keydown', onKey, true);
    box.querySelector('.lightbox-close')!.addEventListener('click', (e) => {
      e.stopPropagation();
      close();
    });

    box.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('.lightbox-close')) return;
      box.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) moved = false;
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: scale };
        moved = true;
      }
    });
    box.addEventListener('pointermove', (e) => {
      const prev = pts.get(e.pointerId);
      if (!prev) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size >= 2) {
        const [a, b] = [...pts.values()];
        scale = Math.max(1, Math.min(5, (pinch.s * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.d));
        clampPan();
        apply();
        return;
      }
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
      if (scale > 1) {
        tx += dx;
        ty += dy;
        clampPan();
        apply();
      }
    });
    const end = (e: PointerEvent) => {
      if (!pts.delete(e.pointerId)) return;
      if (pts.size < 2) pinch = null;
      if (pts.size > 0 || moved) return;
      // A tap: double-tap toggles zoom, single tap closes (when not zoomed)
      const now = performance.now();
      if (now - lastTap < 300) {
        window.clearTimeout(tapTimer);
        lastTap = 0;
        scale = scale > 1 ? 1 : 2.5;
        tx = ty = 0;
        img.classList.add('animate');
        apply();
        setTimeout(() => img.classList.remove('animate'), 200);
        return;
      }
      lastTap = now;
      tapTimer = window.setTimeout(() => {
        if (scale === 1) close();
      }, 300);
    };
    box.addEventListener('pointerup', end);
    box.addEventListener('pointercancel', end);
    box.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        scale = Math.max(1, Math.min(5, scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
        if (scale === 1) tx = ty = 0;
        clampPan();
        apply();
      },
      { passive: false },
    );
  });
}
