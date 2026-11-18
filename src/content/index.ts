import raw from './places.json';
import type { Content } from './types';

export const content = raw as Content;
export type { Content, Place, PhotoEntry } from './types';
