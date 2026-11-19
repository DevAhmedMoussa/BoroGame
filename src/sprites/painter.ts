/**
 * Tiny pixel-art painter. Sprites are drawn in code onto a small canvas at
 * "art pixel" resolution (the map shows each art pixel as 2×2 world px), then
 * outlined and turned into game textures.
 *
 * To replace any sprite with a hand-drawn PNG later, draw a PNG of the same
 * size and load it in the game under the same texture key (the sprite's `key`);
 * registerTextures() skips keys that already exist.
 */
export type Color = string;

export class Pix {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;

  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    this.ctx.imageSmoothingEnabled = false;
  }

  px(x: number, y: number, c: Color) {
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    return this;
  }

  rect(x: number, y: number, w: number, h: number, c: Color) {
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    return this;
  }

  hline(x: number, y: number, len: number, c: Color) {
    return this.rect(x, y, len, 1, c);
  }

  vline(x: number, y: number, len: number, c: Color) {
    return this.rect(x, y, 1, len, c);
  }

  /** Filled ellipse, pixel-centre tested so it looks hand-placed. */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: Color) {
    this.ctx.fillStyle = c;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.ctx.fillRect(x, y, 1, 1);
      }
    }
    return this;
  }

  circle(cx: number, cy: number, r: number, c: Color) {
    return this.ellipse(cx, cy, r, r, c);
  }

  /** Ring (ellipse outline of a given thickness). */
  ring(cx: number, cy: number, r: number, thick: number, c: Color) {
    this.ctx.fillStyle = c;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d <= r && d > r - thick) this.ctx.fillRect(x, y, 1, 1);
      }
    }
    return this;
  }

  /** Bresenham line. */
  line(x0: number, y0: number, x1: number, y1: number, c: Color) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    this.ctx.fillStyle = c;
    for (;;) {
      this.ctx.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
    return this;
  }

  /** Filled polygon (pixel centres inside the shape). */
  poly(pts: Array<[number, number]>, c: Color) {
    const ys = pts.map((p) => p[1]);
    const minY = Math.floor(Math.min(...ys));
    const maxY = Math.ceil(Math.max(...ys));
    this.ctx.fillStyle = c;
    for (let y = minY; y <= maxY; y++) {
      const cy = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= cy && by > cy) || (by <= cy && ay > cy)) xs.push(ax + ((cy - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const from = Math.ceil(xs[i] - 0.5);
        const to = Math.floor(xs[i + 1] - 0.5);
        if (to >= from) this.ctx.fillRect(from, y, to - from + 1, 1);
      }
    }
    return this;
  }

  /** Checkerboard dither inside a rect (every other pixel). */
  dither(x: number, y: number, w: number, h: number, c: Color, phase = 0) {
    this.ctx.fillStyle = c;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if ((i + j + phase) % 2 === 0) this.ctx.fillRect(x + i, y + j, 1, 1);
    return this;
  }

  /** Erase pixels (for cut-outs). */
  clear(x: number, y: number, w: number, h: number) {
    this.ctx.clearRect(x, y, w, h);
    return this;
  }

  /** Draws a 1 px outline around every opaque pixel (only into transparent pixels). */
  outline(c: Color, skipBottomShadow = true) {
    const { w, h } = this;
    const img = this.ctx.getImageData(0, 0, w, h);
    const a = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : img.data[(y * w + x) * 4 + 3]);
    // Soft shadows (semi-transparent) don't get outlined
    const solid = (x: number, y: number) => a(x, y) > (skipBottomShadow ? 200 : 0);
    const out: Array<[number, number]> = [];
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (solid(x, y)) continue;
        if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) out.push([x, y]);
      }
    this.ctx.fillStyle = c;
    for (const [x, y] of out) {
      this.ctx.clearRect(x, y, 1, 1);
      this.ctx.fillRect(x, y, 1, 1);
    }
    return this;
  }
}

/** A code-drawn sprite. `frames` > 1 draws an animation strip (frame index passed to draw). */
export interface SpriteDef {
  key: string;
  w: number;
  h: number;
  frames?: number;
  /** Add the dark 1 px outline after drawing (default true). */
  outline?: boolean;
  draw(p: Pix, frame: number): void;
}

export const OUTLINE = '#2b1d14';

/** Renders all frames of a sprite into one horizontal strip canvas. */
export function renderSprite(def: SpriteDef): HTMLCanvasElement {
  const frames = def.frames ?? 1;
  const strip = document.createElement('canvas');
  strip.width = def.w * frames;
  strip.height = def.h;
  const ctx = strip.getContext('2d')!;
  for (let f = 0; f < frames; f++) {
    const p = new Pix(def.w, def.h);
    def.draw(p, f);
    if (def.outline !== false) p.outline(OUTLINE);
    ctx.drawImage(p.canvas, f * def.w, 0);
  }
  return strip;
}

/** Shared palette so everything feels like one place. */
export const PAL = {
  ink: '#2b1d14',
  shadow: 'rgba(43,29,20,0.28)',
  sand: '#e8d3a3',
  sandDark: '#d4b67e',
  sandLight: '#f4e6c3',
  grass: '#8cc46a',
  grassDark: '#6aa24f',
  grassLight: '#b0dc86',
  leaf: '#5fae52',
  leafDark: '#3f8044',
  leafLight: '#93d468',
  trunk: '#8a5a3a',
  trunkDark: '#6a4128',
  cream: '#f6ead2',
  creamShade: '#e0cba2',
  terracotta: '#d9744a',
  terraDark: '#b0552f',
  terraLight: '#ec9a6b',
  peach: '#f3b98f',
  peachShade: '#dd9b70',
  roof: '#c9b9a6',
  roofDark: '#a8957f',
  window: '#7fc3d6',
  windowDark: '#4d8fa6',
  windowLight: '#d4f1f7',
  door: '#7a4a2e',
  gold: '#f2b544',
  goldDark: '#c98a22',
  white: '#ffffff',
  whiteShade: '#dde4e8',
  glass: '#8fd0e6',
  glassDark: '#4f93b3',
  glassLight: '#dff6fb',
  pink: '#f4a6bf',
  pinkDark: '#d9708f',
  red: '#e5566f',
  redDark: '#b83a52',
  blue: '#5b8fd6',
  blueDark: '#3d6aad',
  teal: '#3fc1c9',
  water: '#3aa7b8',
  waterLight: '#8fdbe2',
  gray: '#8d8a87',
  grayDark: '#5f5c5a',
  grayLight: '#c6c2bd',
  black: '#2a2a2e',
  lilac: '#c8a4e8',
  green: '#4fa35a',
  yellow: '#ffe17a',
};
