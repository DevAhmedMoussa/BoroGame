/**
 * Circular 360° virtual joystick (bottom-left). Works with touch, mouse and pen
 * via pointer events. `value` is the knob offset, x/y in -1..1, magnitude 0..1.
 */
export class Joystick {
  readonly el: HTMLDivElement;
  private knob: HTMLDivElement;
  private pointerId: number | null = null;
  value = { x: 0, y: 0, magnitude: 0 };
  onStart?: () => void;

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'joystick';
    this.el.setAttribute('aria-label', 'Joystick: drag to walk');
    this.knob = document.createElement('div');
    this.knob.className = 'joystick-knob';
    this.el.appendChild(this.knob);
    root.appendChild(this.el);

    this.el.addEventListener('pointerdown', (e) => {
      // A new touch always wins: if an old one never reported its release, drop it.
      if (this.pointerId !== null) this.reset();
      e.preventDefault();
      this.pointerId = e.pointerId;
      try {
        this.el.setPointerCapture(e.pointerId);
      } catch {
        /* capture is a nice-to-have; window listeners below still catch the release */
      }
      this.el.classList.add('active');
      this.onStart?.();
      this.track(e);
    });
    this.el.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.pointerId) this.track(e);
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId === this.pointerId) this.reset();
    };
    this.el.addEventListener('pointerup', end);
    this.el.addEventListener('pointercancel', end);
    this.el.addEventListener('lostpointercapture', end);
    // Backup: the release can land on something drawn over the joystick
    // (e.g. a memory window popping up under her finger), so listen everywhere.
    window.addEventListener('pointerup', end, true);
    window.addEventListener('pointercancel', end, true);
    window.addEventListener('blur', () => this.reset());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.reset();
    });
  }

  /** Let go: knob back to the centre, no movement. */
  reset() {
    if (this.pointerId !== null && this.el.hasPointerCapture?.(this.pointerId)) {
      try {
        this.el.releasePointerCapture(this.pointerId);
      } catch {
        /* already released */
      }
    }
    this.pointerId = null;
    this.el.classList.remove('active');
    this.value = { x: 0, y: 0, magnitude: 0 };
    this.knob.style.transform = '';
  }

  get active() {
    return this.pointerId !== null;
  }

  private track(e: PointerEvent) {
    const r = this.el.getBoundingClientRect();
    const radius = r.width / 2;
    const maxTravel = radius * 0.62;
    let dx = e.clientX - (r.left + radius);
    let dy = e.clientY - (r.top + radius);
    const len = Math.hypot(dx, dy);
    if (len > maxTravel) {
      dx = (dx / len) * maxTravel;
      dy = (dy / len) * maxTravel;
    }
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const mag = Math.min(1, len / maxTravel);
    // Small dead zone in the middle
    const eff = mag < 0.12 ? 0 : (mag - 0.12) / 0.88;
    const dirLen = Math.hypot(dx, dy);
    this.value =
      dirLen > 0 ? { x: (dx / dirLen) * eff, y: (dy / dirLen) * eff, magnitude: eff } : { x: 0, y: 0, magnitude: 0 };
  }
}
