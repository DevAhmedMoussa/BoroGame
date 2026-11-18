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
      if (this.pointerId !== null) return;
      e.preventDefault();
      this.pointerId = e.pointerId;
      this.el.setPointerCapture(e.pointerId);
      this.el.classList.add('active');
      this.onStart?.();
      this.track(e);
    });
    this.el.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.pointerId) this.track(e);
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== this.pointerId) return;
      this.pointerId = null;
      this.el.classList.remove('active');
      this.value = { x: 0, y: 0, magnitude: 0 };
      this.knob.style.transform = '';
    };
    this.el.addEventListener('pointerup', end);
    this.el.addEventListener('pointercancel', end);
    this.el.addEventListener('lostpointercapture', end);
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
