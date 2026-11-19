/**
 * Kuku's wardrobe: every clothing option and its colour swatches.
 * Only clothes and accessories can change; her face, hair, skin and glasses are locked.
 * (Pure data, shared by the 3D model and the wardrobe screen.)
 */

export interface Item {
  id: string;
  label: string;
  colors: number[];
}

export const TOPS: Item[] = [
  { id: 'knot', label: 'Knotted shirt', colors: [0xc8a4e8, 0xf4b6c8, 0xa8dcc4, 0xf3dc8a, 0xa9cbea, 0xf7f4ee] },
  { id: 'tank', label: 'Ribbed tank', colors: [0xf8f5ef, 0x2f2b33, 0xc8a4e8, 0xb7c9a8, 0xd9825f] },
  { id: 'tee', label: 'T-shirt', colors: [0xf8f5ef, 0xf4b6c8, 0x2f2b33, 0xf3dc8a, 0xa9cbea] },
  { id: 'hoodie', label: 'Cozy hoodie', colors: [0xe8a7b5, 0xb9a3e3, 0xc9c6cc, 0xf2e6cf, 0xa9c4a0] },
  { id: 'blouse', label: 'Ruffle blouse', colors: [0xfbfaf6, 0xf2e6cf, 0xbcd8f0, 0xf6c9cf, 0xd6c2ee] },
  { id: 'jacket', label: 'Denim jacket', colors: [0x7fa3cf, 0xa9c4e2, 0x4a6a96, 0x3a3a40, 0xf2b6c6] },
];

export const BOTTOMS: Item[] = [
  { id: 'jeans', label: 'Jeans', colors: [0xa9cbea, 0x6f97c9, 0x3d5a85, 0x2f2f36, 0xf1efe8] },
  { id: 'wide', label: 'Wide-leg trousers', colors: [0xe9dcc4, 0x2f2b33, 0xd2b48c, 0x8a8f5c, 0xc8a4e8] },
  { id: 'skirt', label: 'Midi skirt', colors: [0xf4b6c8, 0x2f2b33, 0x7fa3cf, 0xa9c4a0, 0xd9a83b, 0xc8a4e8] },
  { id: 'dress', label: 'Summer dress', colors: [0xf3d36b, 0xa9cbea, 0xf4b6c8, 0xfbfaf6, 0xa9c4a0, 0xe06666] },
];

export const SHOES: Item[] = [
  { id: 'sneakers', label: 'Sneakers', colors: [0xffffff, 0xf4b6c8, 0x2f2b33, 0xc8a4e8] },
  { id: 'sandals', label: 'Sandals', colors: [0xc79a6a, 0xffffff, 0x2f2b33, 0xe3b04b] },
  { id: 'boots', label: 'Boots', colors: [0x7a4a2e, 0x2f2b33, 0xeadfcb, 0x7a2e3a] },
];

export const ACCESSORIES: Item[] = [
  { id: 'none', label: 'No accessory', colors: [0xffffff] },
  { id: 'necklace', label: 'Gold necklace', colors: [0xe9b850, 0xd9d9de, 0xf2b6c6] },
  { id: 'tote', label: 'Tote bag', colors: [0xf0e6d2, 0xf4b6c8, 0x2f2b33, 0xa9c4a0] },
  { id: 'sunglasses', label: 'Sunglasses in her hair', colors: [0x1d1d22, 0x8a5a3a, 0xf4b6c8, 0xe9b850] },
  { id: 'flower', label: 'Flower clip', colors: [0xf4a6bf, 0xffffff, 0xf3d36b, 0xe5566f] },
  { id: 'sunhat', label: 'Sun hat', colors: [0xf4a6bf, 0x2f2b33, 0x7fa3cf, 0xe5566f] },
];

export interface Outfit {
  top: string;
  topColor: number;
  bottom: string;
  bottomColor: number;
  shoes: string;
  shoesColor: number;
  accessory: string;
  accessoryColor: number;
}

/** What she wears the first time: the outfit from her avatar. */
export const DEFAULT_OUTFIT: Outfit = {
  top: 'knot',
  topColor: 0,
  bottom: 'jeans',
  bottomColor: 0,
  shoes: 'sneakers',
  shoesColor: 0,
  accessory: 'none',
  accessoryColor: 0,
};

export const LAYERS = [
  { key: 'top', label: 'Top', items: TOPS },
  { key: 'bottom', label: 'Bottom', items: BOTTOMS },
  { key: 'shoes', label: 'Shoes', items: SHOES },
  { key: 'accessory', label: 'Extra', items: ACCESSORIES },
] as const;

/** Fills in anything missing or no longer valid (e.g. an old save). */
export function normalizeOutfit(o: Partial<Outfit> | undefined): Outfit {
  const out = { ...DEFAULT_OUTFIT, ...(o ?? {}) };
  for (const layer of LAYERS) {
    const id = out[layer.key];
    const item = layer.items.find((i) => i.id === id);
    if (!item) {
      out[layer.key] = DEFAULT_OUTFIT[layer.key];
      out[`${layer.key}Color`] = 0;
    } else {
      const ci = out[`${layer.key}Color`];
      if (typeof ci !== 'number' || ci < 0 || ci >= item.colors.length) out[`${layer.key}Color`] = 0;
    }
  }
  return out;
}

export function itemOf(layer: (typeof LAYERS)[number]['key'], o: Outfit): Item {
  return LAYERS.find((l) => l.key === layer)!.items.find((i) => i.id === o[layer])!;
}

export function colorOf(layer: (typeof LAYERS)[number]['key'], o: Outfit): number {
  return itemOf(layer, o).colors[o[`${layer}Color`]];
}
