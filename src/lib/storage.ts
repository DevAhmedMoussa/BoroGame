import type { Outfit } from './outfit';

/** Everything the game remembers between visits, in one localStorage entry. */
export interface SaveData {
  visited: string[];
  outfit?: Partial<Outfit>;
  settings: { sound: boolean };
  seenTip?: boolean;
}

const KEY = 'kukus-cairo.v1';
const fresh = (): SaveData => ({ visited: [], settings: { sound: false } });

let cache: SaveData | null = null;

export function loadSave(): SaveData {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...fresh(), ...JSON.parse(raw) } : fresh();
  } catch {
    cache = fresh();
  }
  return cache!;
}

export function updateSave(change: (s: SaveData) => void) {
  const s = loadSave();
  change(s);
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode / storage full: keep it in memory only */
  }
}

export function markVisited(placeId: string): boolean {
  const s = loadSave();
  if (s.visited.includes(placeId)) return false;
  updateSave((d) => d.visited.push(placeId));
  return true;
}
