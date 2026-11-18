import type { PixelSprite } from './pixel';

/** Kuku's little pink car for long trips (top-down, faces right; rotated to heading). Her curls peek out of the roof. */
export const CAR: PixelSprite = {
  key: 'car',
  outline: '#2b1d14',
  palette: {
    R: '#ff8fc4',
    r: '#e0619f',
    L: '#ffd1e6',
    G: '#cfeaf5',
    K: '#2b2b2b',
    Y: '#fff3a8',
    H: '#1c120e',
    h: '#4a3026',
    S: '#e2ad86',
  },
  frames: [
    [
      '...KKKK........KKKK...',
      '..rrrrrrrrrrrrrrrrrr..',
      '.rRRRRRRRRRRRRRRRRRRr.',
      'rRRLLGGGHHhHGGGGRRRRRY',
      'rRRLGGGHhHHHHGGGGRRRRR',
      'rRRLGGGHHHSSHGGGGRRRRR',
      'rRRLGGGHhHSSHGGGGRRRRR',
      'rRRLGGGHHHHhHGGGGRRRRR',
      'rRRLLGGGHHHHGGGGRRRRRY',
      '.rRRRRRRRRRRRRRRRRRRr.',
      '..rrrrrrrrrrrrrrrrrr..',
      '...KKKK........KKKK...',
    ],
  ],
};

export const HEART: PixelSprite = {
  key: 'heart',
  outline: '#2b1d14',
  palette: { R: '#e5566f', W: '#ffd0d8' },
  frames: [['.RR.RR.', 'RWRRRRR', 'RRRRRRR', '.RRRRR.', '..RRR..', '...R...']],
};

export const SPARKLE: PixelSprite = {
  key: 'sparkle',
  palette: { Y: '#fff2a8', W: '#ffffff' },
  frames: [['..Y..', '..Y..', 'YYWYY', '..Y..', '..Y..']],
};

export const FLAG: PixelSprite = {
  key: 'flag',
  outline: '#2b1d14',
  palette: { R: '#e5566f', r: '#b83a52', P: '#6b5440' },
  frames: [['PRRRR', 'PRRRr', 'PRRr.', 'PRr..', 'P....', 'P....', 'P....', 'P....']],
};
