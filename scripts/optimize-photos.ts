/**
 * Photo pipeline:  npm run photos   (also runs automatically before dev and build)
 *
 *  photos/<place-id>/*            your original photos and short .mp4 videos (never published)
 *  → public/photos-optimized/<place-id>/<name>.webp        full size, max 1600 px, WebP
 *  → public/photos-optimized/<place-id>/thumb/<name>.webp  96 px square for the map bubbles
 *  → src/content/photos.generated.json                     list the game reads
 *
 * - Respects EXIF rotation; strips all metadata (including GPS location).
 * - If a place has no "photos" list in places.json, every image in its folder is used, sorted by name.
 * - Checks places.json and prints friendly messages for anything that needs fixing.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC_DIR = path.join(ROOT, 'photos');
const OUT_DIR = path.join(ROOT, 'public', 'photos-optimized');
const MANIFEST = path.join(ROOT, 'src', 'content', 'photos.generated.json');
const PLACES = path.join(ROOT, 'src', 'content', 'places.json');

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.tif', '.tiff', '.avif']);
const VIDEO_EXT = new Set(['.mp4', '.webm']);
const FULL_MAX = 1600;
const THUMB = 96;

interface PhotoEntry {
  file: string;
  caption?: string;
}
interface PlaceIn {
  id: string;
  name: string;
  position: { x: number; y: number };
  cover?: string;
  photos?: PhotoEntry[];
  memory?: string;
}

const errors: string[] = [];
const warnings: string[] = [];
const naturalSort = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

// ---------------------------------------------------------------- read + validate places.json
let data: { places: PlaceIn[] };
try {
  data = JSON.parse(fs.readFileSync(PLACES, 'utf8'));
} catch (e) {
  console.error(`\n✗ src/content/places.json could not be read. Is a comma or quote missing?\n  ${(e as Error).message}\n`);
  process.exit(1);
}
const seen = new Set<string>();
for (const [i, p] of data.places.entries()) {
  const label = p.name ? `"${p.name}"` : `place #${i + 1}`;
  if (!p.id || !/^[a-z0-9-]+$/.test(p.id)) errors.push(`${label}: "id" must use only lowercase letters, numbers and dashes (got "${p.id}").`);
  if (seen.has(p.id)) errors.push(`${label}: the id "${p.id}" is used twice. Every place needs its own id.`);
  seen.add(p.id);
  if (!p.name) errors.push(`place "${p.id}": "name" is missing.`);
  const { x, y } = p.position ?? ({} as { x: number; y: number });
  if (typeof x !== 'number' || typeof y !== 'number' || x < 0 || x > 1 || y < 0 || y > 1)
    errors.push(`${label}: "position" x and y must both be numbers between 0 and 1.`);
}

// ---------------------------------------------------------------- process photos
interface MediaOut {
  file: string;
  type: 'image' | 'video';
  src: string;
  thumb?: string;
  width?: number;
  height?: number;
  caption?: string;
}
const manifest: Record<string, { photos: MediaOut[]; cover: string | null }> = {};
const keep = new Set<string>(); // output files still in use

const isFresh = (out: string, src: string) => fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs;
const rel = (abs: string) => path.relative(path.join(ROOT, 'public'), abs).split(path.sep).join('/');

let converted = 0;
for (const place of data.places) {
  const dir = path.join(SRC_DIR, place.id);
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => !f.startsWith('.') && fs.statSync(path.join(dir, f)).isFile())
    : [];
  if (!fs.existsSync(dir)) warnings.push(`${place.name}: no folder photos/${place.id}/ yet, so it shows no photos.`);

  const listed = place.photos && place.photos.length > 0;
  const entries: PhotoEntry[] = listed
    ? place.photos!
    : files
        .filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()) || VIDEO_EXT.has(path.extname(f).toLowerCase()))
        .sort(naturalSort)
        .map((file) => ({ file }));

  const out: MediaOut[] = [];
  for (const entry of entries) {
    const src = path.join(dir, entry.file);
    const ext = path.extname(entry.file).toLowerCase();
    if (!fs.existsSync(src)) {
      errors.push(`${place.name}: "${entry.file}" is listed in places.json but isn't in photos/${place.id}/ (check the spelling and extension).`);
      continue;
    }
    const base = path.basename(entry.file, path.extname(entry.file));
    if (VIDEO_EXT.has(ext)) {
      const dest = path.join(OUT_DIR, place.id, entry.file);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      if (!isFresh(dest, src)) fs.copyFileSync(src, dest);
      keep.add(dest);
      out.push({ file: entry.file, type: 'video', src: rel(dest), caption: entry.caption });
      continue;
    }
    if (!IMAGE_EXT.has(ext)) {
      warnings.push(`${place.name}: "${entry.file}" isn't a supported photo type (use .jpg, .png or .webp; iPhone .heic photos can be exported as JPG), so it's skipped.`);
      continue;
    }
    const full = path.join(OUT_DIR, place.id, `${base}.webp`);
    const thumb = path.join(OUT_DIR, place.id, 'thumb', `${base}.webp`);
    fs.mkdirSync(path.dirname(thumb), { recursive: true });
    keep.add(full);
    keep.add(thumb);
    try {
      if (!isFresh(full, src) || !isFresh(thumb, src)) {
        // .rotate() applies EXIF orientation; sharp drops all metadata (GPS included) unless asked to keep it.
        await sharp(src).rotate().resize({ width: FULL_MAX, height: FULL_MAX, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(full);
        await sharp(src).rotate().resize(THUMB, THUMB, { fit: 'cover', position: 'attention' }).webp({ quality: 72 }).toFile(thumb);
        converted++;
      }
      const meta = await sharp(full).metadata();
      out.push({ file: entry.file, type: 'image', src: rel(full), thumb: rel(thumb), width: meta.width, height: meta.height, caption: entry.caption });
    } catch (e) {
      errors.push(`${place.name}: "${entry.file}" couldn't be read as an image (${(e as Error).message}).`);
    }
  }

  if (listed) {
    const extra = files.filter((f) => !place.photos!.some((p) => p.file === f) && (IMAGE_EXT.has(path.extname(f).toLowerCase()) || VIDEO_EXT.has(path.extname(f).toLowerCase())));
    if (extra.length) warnings.push(`${place.name}: ${extra.length} file(s) in photos/${place.id}/ aren't listed in places.json, so they're hidden: ${extra.join(', ')}. (Remove the "photos" list to show every file automatically.)`);
  }
  let cover = out.find((m) => m.type === 'image' && m.file === place.cover)?.thumb ?? null;
  if (place.cover && !cover) warnings.push(`${place.name}: cover "${place.cover}" isn't one of its photos, so the first photo is used.`);
  cover ??= out.find((m) => m.type === 'image')?.thumb ?? null;
  manifest[place.id] = { photos: out, cover };
}

// Remove optimized files that no longer have an original
const walk = (d: string): string[] =>
  fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)])) : [];
let removed = 0;
for (const f of walk(OUT_DIR)) {
  if (!keep.has(f)) {
    fs.rmSync(f);
    removed++;
  }
}

fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');

// ---------------------------------------------------------------- report
const total = Object.values(manifest).reduce((n, p) => n + p.photos.length, 0);
for (const w of warnings) console.warn(`  ! ${w}`);
if (errors.length) {
  console.error(`\n✗ Please fix ${errors.length} thing(s) in places.json or the photos folder:\n`);
  for (const e of errors) console.error(`  • ${e}`);
  console.error('');
  process.exit(1);
}
console.log(`✓ Photos ready: ${total} across ${data.places.length} places (${converted} newly optimized${removed ? `, ${removed} old files removed` : ''}).`);
