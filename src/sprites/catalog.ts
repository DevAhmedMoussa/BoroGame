import { EMBLEMS } from './emblems';
import type { SpriteDef } from './painter';
import { ANIMAL_SPRITES } from './scenery/animals';
import { BUILDING_SPRITES } from './scenery/buildings';
import { DISTRICT_BUILDING_SPRITES } from './scenery/districtBuildings';
import { NATURE_SPRITES } from './scenery/nature';
import { STREET_SPRITES } from './scenery/street';

/** Every code-drawn sprite, turned into a texture at boot. */
export const ALL_SPRITES: SpriteDef[] = [
  ...Object.values(EMBLEMS),
  ...BUILDING_SPRITES,
  ...DISTRICT_BUILDING_SPRITES,
  ...NATURE_SPRITES,
  ...ANIMAL_SPRITES,
  ...STREET_SPRITES,
];
