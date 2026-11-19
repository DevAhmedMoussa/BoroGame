import type { SpriteDef } from '../painter';
import { BRS } from './brs';
import { KORBA } from './korba';
import { KUKU_HOME } from './kukuHome';
import { MAADI } from './maadi';
import { NASR_CITY } from './nasrCity';
import { PYRAMIDS } from './pyramids';
import { SAHEL } from './sahel';
import { TAGAMO3 } from './tagamo3';
import { ZAMALEK } from './zamalek';
import { ZAYED } from './zayed';

/** Emblems by the "emblem" name used in places.json. */
export const EMBLEMS: Record<string, SpriteDef> = {
  sahel: SAHEL,
  'kuku-home': KUKU_HOME,
  korba: KORBA,
  zayed: ZAYED,
  zamalek: ZAMALEK,
  'nasr-city': NASR_CITY,
  pyramids: PYRAMIDS,
  tagamo3: TAGAMO3,
  maadi: MAADI,
  brs: BRS,
};
