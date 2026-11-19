/**
 * How Kuku is drawn on the map:
 *  - '3d'    smooth 3D model (Three.js), loaded after the map appears
 *  - 'pixel' the original pixel-art sprite
 * To go back to pixel art for everyone, change the default below to 'pixel'.
 * For a quick comparison on a phone, add ?avatar=pixel or ?avatar=3d to the link.
 * If 3D can't start on a device, the game falls back to pixel art automatically.
 */
export type AvatarStyle = '3d' | 'pixel';

const DEFAULT_AVATAR_STYLE: AvatarStyle = '3d';

export function avatarStyle(): AvatarStyle {
  const fromUrl = new URLSearchParams(location.search).get('avatar');
  return fromUrl === 'pixel' || fromUrl === '3d' ? fromUrl : DEFAULT_AVATAR_STYLE;
}

/** Her real-life glasses on the 3D avatar (set to false to take them off). */
export const KUKU_GLASSES = true;
