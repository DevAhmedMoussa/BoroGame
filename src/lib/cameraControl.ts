import Phaser from 'phaser';

/**
 * Pan (one finger / mouse drag, with a little fling), pinch-zoom (two fingers)
 * and mouse-wheel zoom for the main camera.
 *
 * "Zoom" here is the visual zoom: CSS px per world px. The camera's real zoom is
 * visual zoom × device pixel ratio, because the canvas renders at device resolution.
 */
export interface CameraControlOptions {
  dpr: number;
  /** World size in world px; the view is kept inside it. */
  world: { width: number; height: number };
  maxZoom: number;
  /** Zoom levels that pinch/wheel settle on (min-zoom is added automatically). */
  steps: number[];
  /** Returns false while another control (e.g. the joystick) owns the pointer. */
  canPan?: (pointer: Phaser.Input.Pointer) => boolean;
}

export class CameraControl {
  private cam: Phaser.Cameras.Scene2D.Camera;
  private active = new Map<number, { x: number; y: number }>();
  private pinch: { dist: number; zoom: number; wx: number; wy: number } | null = null;
  private velocity = { x: 0, y: 0 };
  private lastMove = 0;
  private wheelAcc = 0;
  private zoomTween?: Phaser.Tweens.Tween;
  /** True once the current gesture moved far enough to count as a drag, not a tap. */
  dragged = false;
  /** performance.now() when the last drag/pinch ended, so a release over a marker isn't a tap. */
  lastGestureEnd = 0;
  private downAt = { x: 0, y: 0 };
  onUserMove?: () => void;

  constructor(
    private scene: Phaser.Scene,
    private opts: CameraControlOptions,
  ) {
    this.cam = scene.cameras.main;
    scene.input.addPointer(2);
    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
    scene.input.on('wheel', this.onWheel, this);
    scene.events.on('update', this.onUpdate, this);
  }

  get minZoom() {
    const { width, height } = this.scene.scale;
    // Small enough to see the whole map at once ("overview").
    return Math.min(width / this.opts.world.width, height / this.opts.world.height) / this.opts.dpr;
  }

  get zoom() {
    return this.cam.zoom / this.opts.dpr;
  }

  private clampZoom(z: number) {
    return Phaser.Math.Clamp(z, this.minZoom, this.opts.maxZoom);
  }

  /** Set visual zoom keeping the world point under screen point (sx, sy) fixed. */
  setZoomAt(z: number, sx: number, sy: number, worldX?: number, worldY?: number) {
    const cam = this.cam;
    const before = worldX === undefined ? this.screenToWorld(sx, sy) : { x: worldX, y: worldY! };
    cam.setZoom(this.clampZoom(z) * this.opts.dpr);
    const zoom = cam.zoom;
    cam.scrollX = before.x - (sx + (cam.width * zoom - cam.width) / 2) / zoom;
    cam.scrollY = before.y - (sy + (cam.height * zoom - cam.height) / 2) / zoom;
    this.clampScroll();
  }

  /** Smoothly zoom to a level around a screen point (defaults to the centre). */
  zoomTo(z: number, sx = this.cam.width / 2, sy = this.cam.height / 2, duration = 220) {
    this.zoomTween?.stop();
    const anchor = this.screenToWorld(sx, sy);
    const from = this.zoom;
    const to = this.clampZoom(z);
    this.zoomTween = this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration,
      ease: 'Sine.easeOut',
      onUpdate: (tw) => this.setZoomAt(from + (to - from) * tw.getValue()!, sx, sy, anchor.x, anchor.y),
    });
  }

  /** Next zoom step up (dir = 1) or down (dir = -1) from the current zoom. */
  stepZoom(dir: 1 | -1, sx?: number, sy?: number) {
    const steps = this.allSteps();
    const z = this.zoom;
    const target =
      dir > 0 ? (steps.find((s) => s > z + 0.01) ?? steps[steps.length - 1]) : ([...steps].reverse().find((s) => s < z - 0.01) ?? steps[0]);
    this.zoomTo(target, sx, sy);
  }

  /** Ease the view towards centring (x, y); frame-rate independent. */
  followTowards(x: number, y: number, deltaMs: number) {
    const cam = this.cam;
    this.velocity = { x: 0, y: 0 };
    const k = 1 - Math.pow(1 - 0.12, deltaMs / 16.67);
    cam.scrollX += (x - cam.width / 2 - cam.scrollX) * k;
    cam.scrollY += (y - cam.height / 2 - cam.scrollY) * k;
    this.clampScroll();
  }

  centerOn(x: number, y: number) {
    this.cam.centerOn(x, y);
    this.clampScroll();
  }

  private allSteps() {
    const min = this.minZoom;
    return [min, ...this.opts.steps.filter((s) => s > min + 0.05 && s <= this.opts.maxZoom)];
  }

  private snapZoom(sx: number, sy: number) {
    const steps = this.allSteps();
    const z = this.zoom;
    const nearest = steps.reduce((best, s) => (Math.abs(Math.log(s / z)) < Math.abs(Math.log(best / z)) ? s : best));
    if (Math.abs(nearest - z) > 0.01) this.zoomTo(nearest, sx, sy, 160);
  }

  screenToWorld(sx: number, sy: number) {
    const cam = this.cam;
    const zoom = cam.zoom;
    return {
      x: (sx + (cam.width * zoom - cam.width) / 2) / zoom + cam.scrollX,
      y: (sy + (cam.height * zoom - cam.height) / 2) / zoom + cam.scrollY,
    };
  }

  /** Keep the view inside the world (or centred on it when zoomed out past it). */
  private clampScroll() {
    const cam = this.cam;
    const b = new Phaser.Geom.Rectangle(0, 0, this.opts.world.width, this.opts.world.height);
    const viewW = cam.width / cam.zoom;
    const viewH = cam.height / cam.zoom;
    const offX = (cam.width - viewW) / 2;
    const offY = (cam.height - viewH) / 2;
    cam.scrollX =
      viewW >= b.width ? b.x + (b.width - viewW) / 2 - offX : Phaser.Math.Clamp(cam.scrollX, b.x - offX, b.right - viewW - offX);
    cam.scrollY =
      viewH >= b.height ? b.y + (b.height - viewH) / 2 - offY : Phaser.Math.Clamp(cam.scrollY, b.y - offY, b.bottom - viewH - offY);
  }

  private onDown(p: Phaser.Input.Pointer) {
    if (this.opts.canPan && !this.opts.canPan(p)) return;
    this.zoomTween?.stop();
    this.active.set(p.id, { x: p.x, y: p.y });
    this.velocity = { x: 0, y: 0 };
    if (this.active.size === 1) {
      this.dragged = false;
      this.downAt = { x: p.x, y: p.y };
    }
    if (this.active.size === 2) this.startPinch();
  }

  private startPinch() {
    const [a, b] = [...this.active.values()];
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const w = this.screenToWorld(mid.x, mid.y);
    this.pinch = { dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), zoom: this.zoom, wx: w.x, wy: w.y };
    this.dragged = true;
  }

  private onMove(p: Phaser.Input.Pointer) {
    const prev = this.active.get(p.id);
    if (!prev) return;
    const cur = { x: p.x, y: p.y };
    this.active.set(p.id, cur);

    if (this.pinch && this.active.size >= 2) {
      const [a, b] = [...this.active.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      this.setZoomAt(this.pinch.zoom * (dist / this.pinch.dist), mid.x, mid.y, this.pinch.wx, this.pinch.wy);
      this.onUserMove?.();
      return;
    }

    if (Math.hypot(cur.x - this.downAt.x, cur.y - this.downAt.y) > 8 * this.opts.dpr) this.dragged = true;
    if (!this.dragged) return;
    const dx = (cur.x - prev.x) / this.cam.zoom;
    const dy = (cur.y - prev.y) / this.cam.zoom;
    this.cam.scrollX -= dx;
    this.cam.scrollY -= dy;
    this.clampScroll();
    const now = performance.now();
    const dt = Math.max(1, now - this.lastMove);
    this.lastMove = now;
    // Smoothed velocity in world px / ms for the fling
    this.velocity.x = this.velocity.x * 0.6 + (-dx / dt) * 0.4;
    this.velocity.y = this.velocity.y * 0.6 + (-dy / dt) * 0.4;
    this.onUserMove?.();
  }

  private onUp(p: Phaser.Input.Pointer) {
    if (!this.active.has(p.id)) return;
    this.active.delete(p.id);
    if (this.dragged) this.lastGestureEnd = performance.now();
    if (this.pinch) {
      if (this.active.size < 2) {
        const pos = { x: p.x, y: p.y };
        this.pinch = null;
        this.velocity = { x: 0, y: 0 };
        // Keep the remaining finger from jumping the map
        for (const [id] of this.active) this.active.set(id, { ...this.active.get(id)! });
        this.snapZoom(pos.x, pos.y);
      }
      return;
    }
    if (performance.now() - this.lastMove > 80) this.velocity = { x: 0, y: 0 };
  }

  private onWheel(p: Phaser.Input.Pointer, _objs: unknown, _dx: number, dy: number) {
    this.wheelAcc += dy;
    if (Math.abs(this.wheelAcc) < 60) return;
    this.stepZoom(this.wheelAcc < 0 ? 1 : -1, p.x, p.y);
    this.wheelAcc = 0;
    this.onUserMove?.();
  }

  private onUpdate(_t: number, delta: number) {
    if (this.active.size > 0) return;
    const v = this.velocity;
    if (Math.abs(v.x) + Math.abs(v.y) < 0.002) return;
    this.cam.scrollX += v.x * delta;
    this.cam.scrollY += v.y * delta;
    this.clampScroll();
    const decay = Math.pow(0.992, delta);
    v.x *= decay;
    v.y *= decay;
  }
}
