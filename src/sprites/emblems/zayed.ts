import { PAL, type SpriteDef } from '../painter';
import { EMBLEM_SIZE, groundShadow } from './common';

/** Zayed: a fashion shoot — a model posing on a paper backdrop, a ring light and a camera on a tripod. */
export const ZAYED: SpriteDef = {
  key: 'emblem-zayed',
  w: EMBLEM_SIZE,
  h: EMBLEM_SIZE,
  draw(p) {
    groundShadow(p, 24, 44, 22, 4);
    // backdrop stand + pink paper roll sweeping onto the floor
    p.vline(9, 4, 38, PAL.grayDark).vline(36, 4, 38, PAL.grayDark);
    p.rect(8, 4, 30, 3, PAL.gray);
    p.rect(10, 7, 26, 30, PAL.pink);
    p.rect(10, 7, 26, 2, PAL.pinkDark);
    p.poly([[10, 37], [36, 37], [40, 43], [6, 43]], '#f7c4d4');
    // model: long dark curls, lilac top, hand on hip, one leg forward
    const skin = '#efbf98';
    p.ellipse(23, 12, 6, 5, '#3a2318'); // curly hair volume on top
    p.rect(17, 12, 4, 9, '#3a2318').rect(26, 12, 4, 9, '#3a2318'); // curls falling past her shoulders
    p.px(17, 21, '#3a2318').px(29, 21, '#3a2318').px(18, 22, '#3a2318').px(28, 22, '#3a2318');
    p.ellipse(23.5, 15, 3, 3.5, skin); // face
    p.rect(21, 11, 5, 2, '#4a2c1e'); // bangs
    p.px(22, 15, PAL.ink).px(25, 15, PAL.ink).px(23, 17, PAL.red).px(24, 17, PAL.red);
    p.rect(20, 20, 7, 8, PAL.lilac); // top
    p.rect(20, 27, 7, 2, '#b48ad6');
    p.line(20, 21, 17, 25, skin).line(17, 25, 20, 27, skin); // hand on hip
    p.line(26, 21, 29, 16, skin); // other hand up by her hair
    p.rect(21, 29, 2, 9, '#9fc3e6').rect(24, 29, 2, 9, '#9fc3e6'); // jeans
    p.line(25, 30, 27, 38, '#9fc3e6');
    p.rect(20, 38, 3, 2, PAL.white).rect(26, 38, 3, 2, PAL.white);
    // ring light on a stand (right)
    p.ring(42, 14, 6, 2, PAL.white);
    p.ring(42, 14, 7, 1, PAL.whiteShade);
    p.vline(42, 21, 21, PAL.grayDark);
    p.line(42, 41, 39, 44, PAL.grayDark).line(42, 41, 45, 44, PAL.grayDark);
    // camera on a tripod (front left) with a flash sparkle
    p.rect(1, 25, 8, 6, PAL.black).rect(3, 23, 3, 2, PAL.black);
    p.circle(6, 28, 2, PAL.grayLight).px(6, 28, PAL.windowDark);
    p.line(5, 31, 2, 43, PAL.grayDark).line(5, 31, 8, 43, PAL.grayDark).vline(5, 31, 12, PAL.grayDark);
    p.px(2, 20, PAL.yellow).px(2, 18, PAL.yellow).px(0, 20, PAL.yellow).px(4, 20, PAL.yellow).px(2, 22, PAL.yellow).px(2, 20, PAL.white);
  },
};
