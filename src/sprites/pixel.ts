import Phaser from 'phaser';

/**
 * Pixel sprites are defined as character grids + a palette and turned into
 * textures at boot. Any sprite can later be swapped for a hand-drawn PNG of the
 * same size by loading that PNG under the same texture key instead.
 */
export type Palette = Record<string, string>;

export interface PixelSprite {
  key: string;
  palette: Palette;
  /** One grid per frame; every row of every frame must have the same length. */
  frames: string[][];
  /** Add a 1 px dark outline around the opaque pixels (grows the frame by 2 px). */
  outline?: string;
}

/** Draws all frames side by side into one texture and registers numbered frames. */
export function makePixelTexture(scene: Phaser.Scene, sprite: PixelSprite) {
  if (scene.textures.exists(sprite.key)) return;
  const pad = sprite.outline ? 1 : 0;
  const gw = sprite.frames[0][0].length;
  const gh = sprite.frames[0].length;
  const fw = gw + pad * 2;
  const fh = gh + pad * 2;
  const canvas = document.createElement('canvas');
  canvas.width = fw * sprite.frames.length;
  canvas.height = fh;
  const ctx = canvas.getContext('2d')!;

  sprite.frames.forEach((grid, f) => {
    const ox = f * fw + pad;
    const solid = (x: number, y: number) =>
      y >= 0 && y < gh && x >= 0 && x < gw && grid[y][x] !== '.' && sprite.palette[grid[y][x]] !== undefined;

    if (sprite.outline) {
      ctx.fillStyle = sprite.outline;
      for (let y = -1; y <= gh; y++) {
        for (let x = -1; x <= gw; x++) {
          if (solid(x, y)) continue;
          if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) ctx.fillRect(ox + x, pad + y, 1, 1);
        }
      }
    }
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const c = grid[y][x];
        if (c === '.' || !sprite.palette[c]) continue;
        ctx.fillStyle = sprite.palette[c];
        ctx.fillRect(ox + x, pad + y, 1, 1);
      }
    }
  });

  const tex = scene.textures.addCanvas(sprite.key, canvas)!;
  sprite.frames.forEach((_, f) => tex.add(f, 0, f * fw, 0, fw, fh));
}
