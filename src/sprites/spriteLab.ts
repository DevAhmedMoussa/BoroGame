/** Dev-only: shows every code-drawn sprite enlarged (opened via /sprite-lab.html). */
import { ALL_SPRITES } from './catalog';
import { renderSprite } from './painter';

const q = new URLSearchParams(location.search);
const scale = Number(q.get('scale') ?? 4);
const only = q.get('only');
const grid = document.getElementById('grid')!;
await document.fonts.load('8px "Press Start 2P"').catch(() => undefined);

for (const def of ALL_SPRITES) {
  if (only && !def.key.includes(only)) continue;
  const strip = renderSprite(def);
  const c = document.createElement('canvas');
  c.width = strip.width * scale;
  c.height = strip.height * scale;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(strip, 0, 0, c.width, c.height);
  const fig = document.createElement('figure');
  fig.append(c, Object.assign(document.createElement('figcaption'), { textContent: `${def.key} ${def.w}×${def.h}` }));
  grid.appendChild(fig);
}
