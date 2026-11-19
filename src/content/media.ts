import generated from './photos.generated.json';

/** One photo or video of a place, as produced by `npm run photos`. */
export interface Media {
  file: string;
  type: 'image' | 'video';
  /** URL of the optimized file. */
  src: string;
  /** URL of the 96 px square thumbnail (images only). */
  thumb?: string;
  width?: number;
  height?: number;
  caption?: string;
}

const manifest = generated as Record<string, { photos: Media[]; cover: string | null }>;

export function mediaFor(placeId: string): Media[] {
  return manifest[placeId]?.photos ?? [];
}

/** Thumbnail URL for the map bubble (the cover photo, else the first photo), or null. */
export function coverThumb(placeId: string): string | null {
  return manifest[placeId]?.cover ?? null;
}

const preloaded = new Set<string>();

/** Start downloading the first few full-size photos so they're ready on arrival. */
export function preloadPlace(placeId: string, count = 2) {
  for (const m of mediaFor(placeId)
    .filter((m) => m.type === 'image')
    .slice(0, count)) {
    if (preloaded.has(m.src)) continue;
    preloaded.add(m.src);
    const img = new Image();
    img.decoding = 'async';
    img.src = m.src;
  }
}
