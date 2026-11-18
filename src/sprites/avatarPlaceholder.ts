import type { PixelSprite } from './pixel';

/**
 * PHASE 2 PLACEHOLDER avatar (16×20 + outline): big dark curls, glasses, white
 * tank, dark trousers, white sneakers. Phase 5 replaces it with the full
 * layered Kuku sprite and proper walk cycles.
 *
 * Frames: 0-1 down, 2-3 up, 4-5 side (facing right; left is mirrored).
 */
const head = {
  down: [
    '....HHHHHHHH....',
    '..HHHhHHHHhHHH..',
    '.HHhHHHHHHHHhHH.',
    '.HHHHHHHHHHHHHH.',
    'HHhHSSSSSSSSHhHH',
    'HHHSSSSSSSSSSHHH',
    'HHHGGGGSSGGGGHHH',
    'HHhGOSGSSGOSGhHH',
    'HHHGGGGSSGGGGHHH',
    'HHHSSSsMMsSSSHHH',
    '.HHHSSSSSSSSHHH.',
  ],
  up: [
    '....HHHHHHHH....',
    '..HHHhHHHHhHHH..',
    '.HHhHHHHHHHHhHH.',
    '.HHHHHHHHHHHHHH.',
    'HHhHHHHHHhHHHhHH',
    'HHHHhHHHHHHHHHHH',
    'HHHHHHHHhHHHHHHH',
    'HHhHHHHHHHHHhHHH',
    'HHHHHHhHHHHHHhHH',
    'HHHHHHHHHHHHHHHH',
    '.HHHhHHHHHHhHHH.',
  ],
  side: [
    '...HHHHHHHH.....',
    '..HHhHHHHHhHH...',
    '.HHHHHHHHHHHHH..',
    '.HHhHHHHHHHHHH..',
    'HHHHHHHHSSSSHH..',
    'HHhHHHHSSSSSSH..',
    'HHHHHHSGGGGGG...',
    'HHhHHHSGOSGSS...',
    'HHHHHHSGGGGGS...',
    'HHHHHHSSSSSMs...',
    '.HHHhHHSSSS.....',
  ],
};

const body = {
  down: [
    '.HH.WWSSSSWW.HH.',
    '....SWWYYWWS....',
    '...SSWWWWWWSS...',
    '...S.wWWWWw.S...',
    '.....PPPPPP.....',
    '.....PPPPPP.....',
  ],
  up: [
    '.HH.WWWWWWWW.HH.',
    '....SWWWWWWS....',
    '...SSWWWWWWSS...',
    '...S.wWWWWw.S...',
    '.....PPPPPP.....',
    '.....PPPPPP.....',
  ],
  side: [
    '.HH..WWWWW......',
    '.....WWWWWS.....',
    '.....WWWWWS.....',
    '.....wWWWW......',
    '.....PPPPP......',
    '.....PPPPP......',
  ],
};

const legs = {
  frontA: ['.....PP..PP.....', '.....PP..PP.....', '.....KK..KK.....'],
  frontB: ['.....PP..PP.....', '.....PP...PP....', '.....KK...KK....'],
  sideA: ['.....PP.PP......', '....PP...PP.....', '....KK...KK.....'],
  sideB: ['......PPP.......', '......PPP.......', '......KKK.......'],
};

export const AVATAR_PLACEHOLDER: PixelSprite = {
  key: 'avatar-placeholder',
  outline: '#2b1d14',
  palette: {
    H: '#1e1411',
    h: '#4a3028',
    S: '#d9a77c',
    s: '#b9825a',
    G: '#1a1a1a',
    O: '#3a2318',
    M: '#d8494a',
    W: '#f6f2ea',
    w: '#d6cec0',
    Y: '#f2b544',
    P: '#34303f',
    K: '#ffffff',
  },
  frames: [
    [...head.down, ...body.down, ...legs.frontA],
    [...head.down, ...body.down, ...legs.frontB],
    [...head.up, ...body.up, ...legs.frontA],
    [...head.up, ...body.up, ...legs.frontB],
    [...head.side, ...body.side, ...legs.sideA],
    [...head.side, ...body.side, ...legs.sideB],
  ],
};

/** Little top-down car used for long trips (faces right; rotated to heading). */
export const CAR: PixelSprite = {
  key: 'car',
  outline: '#2b1d14',
  palette: { R: '#e5566f', r: '#b83a52', G: '#bfe6f0', K: '#2b2b2b', Y: '#ffe08a' },
  frames: [
    [
      '..KK.....KK...',
      'rRRRRRRRRRRRRr',
      'RRRGGRRRGGGRRY',
      'RRRGGRRRGGGRRR',
      'RRRGGRRRGGGRRY',
      'rRRRRRRRRRRRRr',
      '..KK.....KK...',
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
