/**
 * Creates colorful placeholder photos for every place listed in places.json
 * (only files that don't exist yet, so real photos are never overwritten).
 * Run: npm run placeholders
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import data from '../src/content/places.json' with { type: 'json' };

const ROOT = path.resolve(import.meta.dirname, '..');
const palettes = [
  ['#f6a96b', '#e5566f'],
  ['#5ec2c6', '#2d6a8f'],
  ['#f2d16b', '#d9822b'],
  ['#9ad18b', '#3f8a5a'],
  ['#c9a0e8', '#6b4fa0'],
  ['#f7b2c4', '#d0577a'],
];

function svg(w: number, h: number, title: string, n: number, colors: string[]) {
  const [a, b] = colors;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <circle cx="${w * 0.78}" cy="${h * 0.22}" r="${Math.min(w, h) * 0.1}" fill="#fff6d8" opacity="0.85"/>
  <path d="M0 ${h * 0.75} Q ${w * 0.3} ${h * 0.6} ${w * 0.55} ${h * 0.72} T ${w} ${h * 0.68} V ${h} H 0 Z" fill="#00000030"/>
  <text x="50%" y="46%" font-family="Verdana, sans-serif" font-size="${Math.round(w / 11)}" font-weight="bold"
    fill="#fff" text-anchor="middle" stroke="#00000055" stroke-width="3" paint-order="stroke">${title}</text>
  <text x="50%" y="58%" font-family="Verdana, sans-serif" font-size="${Math.round(w / 22)}"
    fill="#fff" text-anchor="middle">placeholder photo ${n}</text>
</svg>`;
}

let made = 0;
for (const [i, place] of data.places.entries()) {
  const dir = path.join(ROOT, 'public', 'photos', place.id);
  fs.mkdirSync(dir, { recursive: true });
  for (const [k, photo] of (place.photos ?? []).entries()) {
    if (!photo.file.startsWith('placeholder-')) continue;
    const out = path.join(dir, photo.file);
    if (fs.existsSync(out)) continue;
    const portrait = k % 2 === 1;
    const [w, h] = portrait ? [900, 1200] : [1200, 900];
    const title = place.name.replace(/&/g, '&amp;').replace(/'/g, '&#39;');
    await sharp(Buffer.from(svg(w, h, title, k + 1, palettes[(i + k) % palettes.length])))
      .jpeg({ quality: 82 })
      .toFile(out);
    made++;
  }
}
console.log(`Placeholder photos created: ${made}`);
