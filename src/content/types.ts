export interface PhotoEntry {
  file: string;
  caption?: string;
}

export interface Place {
  id: string;
  name: string;
  area: string;
  /** Normalized 0..1 across the world, top-left = 0,0 */
  position: { x: number; y: number };
  emblem: string;
  date?: string;
  cover?: string;
  photos?: PhotoEntry[];
  memory: string;
}

export interface Content {
  title: string;
  friendName: string;
  introMessage: string;
  finaleMessage: string;
  secretGateEnabled: boolean;
  secretQuestion: string;
  secretAnswer: string;
  places: Place[];
}
