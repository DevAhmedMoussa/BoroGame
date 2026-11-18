import type { PixelSprite } from './pixel';

/**
 * Kuku (24×32 + 1 px outline). Locked likeness from references/: a big cloud of
 * tight dark curls, black rectangular glasses, warm tan skin, big smile with
 * red lips; default outfit = white ribbed square-neck tank with a lace flower
 * on one strap, dainty gold necklace, dark trousers, white sneakers.
 * Phase 5 splits this into layers for the wardrobe.
 *
 * Frames: 0-2 down (stand, step L, step R), 3-5 up, 6-7 side (facing right; left is mirrored).
 */

// ---- hair top (shared by front and back) ----
const crown = [
  '........HH.HHH.HH.......',
  '.....HH.HHHHHHHHHH.HH...',
  '....HHHHHhHHHHhHHHHHH...',
  '...HHhHHHHHHHHHHHHhHHH..',
  '..HHHHHHhHHHHHHhHHHHHHH.',
  '..HhHHHHHHHHHHHHHHHHhHH.',
];

const front = [
  ...crown,
  '.HHHHHSSSHSSSSHSSSHHHHH.',
  'HHhHHSSSSSSSSSSSSSSHHhHH',
  'HHHHSGGGGGSSSSGGGGGSHHHH',
  'HHhHSGSESGGGGGGSESGSHhHH',
  'HHHHSGSESGSSSSGSESGSHHhH',
  'HHhHSGGGGGSSSSGGGGGSHHHH',
  'HHHHSbbSSSSSSSSSSbbSHhHH',
  'HHhHHSSSSMTTTTMSSSSHHHHH',
  'HHHHHSSSSSMMMMSSSSSHHhHH',
  'HHHhHHsSSSSSSSSSSsHHHHhH',
  'HHHHHHHHsSSSSSSsHHHHHHHH',
  'HhHHHHHHHHsSSsHHHHHHHhHH',
  'HHHHhHfFSYSSSSSSYSWWHhHH',
  'HHhHHFfFSSYSSSSYSSWWHHHH',
  'HHHHSfFSSSSYYSSSSSWWSHHH',
  'HHHSSWWWWWWWWWWWWWWSSHHH',
  '..HSSWWwWWwWWwWWwWWSSH..',
  '...SSWWwWWwWWwWWwWWSS...',
  '...SsWWwWWwWWwWWwWWsS...',
  '...SSwwwwwwwwwwwwwwSS...',
  '....SPPPPPPPPPPPPPPS....',
  '.....PPPPPPPPPPPPPP.....',
];

const back = [
  ...crown,
  '.HHHHHHHhHHHHHHHHhHHHHHH',
  '.HHhHHHHHHHHhHHHHHHHhHH.',
  'HHHHHHhHHHHHHHHhHHHHHHHH',
  'HHhHHHHHHHhHHHHHHHHhHHHH',
  'HHHHHhHHHHHHHHhHHHHHHHhH',
  'HHHHHHHHHhHHHHHHHhHHHHHH',
  'HhHHHHHHHHHHhHHHHHHHHhHH',
  'HHHHhHHHHHHHHHHHHhHHHHHH',
  'HHHHHHHHhHHHHHHHHHHHHhHH',
  'HHhHHHHHHHHHHhHHHHHHHHHH',
  'HHHHHHHHHHHhHHHHHHHhHHHH',
  'HhHHHHhHHHHHHHHHHHHHHHhH',
  'HHHHhHHHHHHHHHHHhHHHHHHH',
  'HHHHHHHHHhHHHHHHHHHHhHHH',
  'HHHHSHHHHHHHHHHHHHHHSHHH',
  'HHHSSWHHHHHHHHHHHHWSSHHH',
  '..HSSWWWWHHHHHHWWWWSSH..',
  '...SSWWwWWwWWwWWwWWSS...',
  '...SsWWwWWwWWwWWwWWsS...',
  '...SSwwwwwwwwwwwwwwSS...',
  '....SPPPPPPPPPPPPPPS....',
  '.....PPPPPPPPPPPPPP.....',
];

const side = [
  '........HH.HHH.HH.......',
  '....HH.HHHHHHHHHHHH.....',
  '...HHHHHhHHHHHhHHHHH....',
  '..HHhHHHHHHHHHHHHHHHH...',
  '.HHHHHHHhHHHHHHHhHHHHH..',
  '.HhHHHHHHHHHHHHHHHHHHH..',
  'HHHHHHHHHHHHHSSSHHHHHH..',
  'HHhHHHHHHHHHSSSSSSSHH...',
  'HHHHHHHHHHHSSSSSSSSSS...',
  'HHHhHHHHHHHGGGGGGGSSS...',
  'HHHHHHhHHHHSSGSESGSSSS..',
  'HHHhHHHHHHHSSGSESGSSSS..',
  'HHHhHHHHHHHSSGGGGGSSSS..',
  'HHhHHHHHHHHSSSSbbSSMT...',
  'HHHHHHHHHHHHSSSSSSSMM...',
  'HHHHhHHHHHHHHsSSSSSS....',
  'HHHHHHHHHHHHHHsSSSs.....',
  'HhHHHHHHHHHHHHSSS.......',
  'HHHHhHHHHHHHSSSYSS......',
  '.HHHHHHHHHWWSSYSSS......',
  '..HHHHHHHHWWSSSSSSS.....',
  '...HHHHHHHWWWWWWWWW.....',
  '....HHH..WWWSSWWWW......',
  '.........WwWSSwWWW......',
  '.........WWwSSWwWW......',
  '.........wwwSSwwww......',
  '.........PPPSSPPPP......',
  '.........PPPPPPPPP......',
];

const legs = {
  stand: ['.....PPPPPP..PPPPPP.....', '.....PPPPPP..PPPPPP.....', '.....KKKKKK..KKKKKK.....', '.....kkkkkk..kkkkkk.....'],
  stepL: ['.....PPPPPP..PPPPPP.....', '.....KKKKKK..PPPPPP.....', '.....kkkkkk..KKKKKK.....', '.............kkkkkk.....'],
  stepR: ['.....PPPPPP..PPPPPP.....', '.....PPPPPP..KKKKKK.....', '.....KKKKKK..kkkkkk.....', '.....kkkkkk.............'],
  sideStand: ['..........PPPPPPP.......', '..........PPPPPPP.......', '..........KKKKKKKK......', '..........kkkkkkkk......'],
  sideStride: ['.........PPPP.PPPP......', '........PPPP...PPPP.....', '........KKKKK..KKKKK....', '........kkkkk..kkkkk....'],
};

export const KUKU: PixelSprite = {
  key: 'kuku',
  outline: '#2b1d14',
  palette: {
    H: '#1c120e', // curls
    h: '#4a3026', // curl highlights
    S: '#e2ad86', // skin (warm light-medium tan)
    s: '#c48a63', // skin shade
    b: '#f0988a', // blush
    G: '#141414', // glasses
    E: '#2a1a12', // eyes
    M: '#c9373f', // red-coral lips
    T: '#ffffff', // smile
    W: '#f8f5ef', // white ribbed tank
    w: '#ddd5c7', // tank shade / ribs
    F: '#ffffff', // lace flower
    f: '#d8cfbf', // lace detail
    Y: '#e8b84a', // gold necklace
    P: '#2c2935', // dark trousers
    K: '#ffffff', // sneakers
    k: '#c9c4bd', // soles
  },
  frames: [
    [...front, ...legs.stand],
    [...front, ...legs.stepL],
    [...front, ...legs.stepR],
    [...back, ...legs.stand],
    [...back, ...legs.stepL],
    [...back, ...legs.stepR],
    [...side, ...legs.sideStand],
    [...side, ...legs.sideStride],
  ],
};

/** Walk cycles per facing (frame indices into KUKU.frames); index 0 is the idle frame. */
export const KUKU_CYCLES = {
  down: [0, 1, 0, 2],
  up: [3, 4, 3, 5],
  left: [6, 7, 6, 7],
  right: [6, 7, 6, 7],
} as const;
