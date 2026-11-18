/**
 * Renders the code-defined pixel sprites to PNG previews (for checking art
 * without running the game). Run: npx tsx scripts/preview-sprites.ts <outDir>
 */
import path from 'node:path';
import fs from 'node:fs';
import sharp from 'sharp';
import { KUKU } from '../src/sprites/kuku';
import { CAR, HEART, FLAG } from '../src/sprites/props';
import type { PixelSprite } from '../src/sprites/pixel';

const outDir = process.argv[2] ?? 'sprite-previews';
fs.mkdirSync(outDir, { recursive: true });
const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));

async function render(s: PixelSprite, scale = 8) {
  const pad = s.outline ? 1 : 0;
  const gw = s.frames[0][0].length, gh = s.frames[0].length;
  const fw = gw + pad * 2 + 2, fh = gh + pad * 2;
  const W = fw * s.frames.length, H = fh;
  const buf = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) buf.set([200, 230, 200, 255], i * 4); // light green backdrop
  const put = (x: number, y: number, c: string) => buf.set([...hex(c), 255], (y * W + x) * 4);
  s.frames.forEach((g, f) => {
    for (const [r, row] of g.entries()) if (row.length !== gw) throw new Error(`${s.key} frame ${f} row ${r} is ${row.length} wide, expected ${gw}`);
    const ox = f * fw + pad;
    const solid = (x: number, y: number) => y >= 0 && y < gh && x >= 0 && x < gw && g[y][x] !== '.';
    if (s.outline) for (let y = -1; y <= gh; y++) for (let x = -1; x <= gw; x++)
      if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) put(ox + x, pad + y, s.outline);
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) if (solid(x, y)) put(ox + x, pad + y, s.palette[g[y][x]]);
  });
  await sharp(buf, { raw: { width: W, height: H, channels: 4 } })
    .resize(W * scale, H * scale, { kernel: 'nearest' })
    .png()
    .toFile(path.join(outDir, `${s.key}.png`));
}

for (const s of [KUKU, CAR, HEART, FLAG]) await render(s);
console.log('previews written to', outDir);
