import Phaser from 'phaser';
import { OWL_NAME } from '../config';
import { PET_RADIUS, heartBurst, type Pet } from './pet';
import { ART } from './scenery';

/** The perch's crossbar sits this high above its base (world px). */
const PERCH_TOP = 33;

/**
 * The owl who lives on a perch next to Zuzu. Blinks, looks around, and when
 * petted closes her eyes happily, flaps, hoots and bursts into hearts.
 * (x, y) is the foot of the perch.
 */
export class Owl implements Pet {
  readonly name = OWL_NAME;
  readonly action = `Pet ${OWL_NAME}`;
  readonly img: Phaser.GameObjects.Image;
  private happyUntil = 0;
  private blinkAt = 2000;
  private lookUntil = 0;
  private nextLook = 4000;
  private reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(
    private scene: Phaser.Scene,
    readonly x: number,
    readonly y: number,
  ) {
    this.img = scene.add.image(x, y - PERCH_TOP, 'owl', 0).setOrigin(0.5, 1).setScale(ART).setDepth(y + 1);
  }

  /** Name tag floats above her head, clear of Zuzu's. */
  get tag() {
    return { x: this.x, y: this.y - PERCH_TOP - 46, above: true };
  }

  /** Kuku stands just to the owl's right. */
  get standSpot() {
    return { x: this.x + 44, y: this.y + 6 };
  }

  distance(px: number, py: number) {
    const d = Math.hypot(px - this.x, py - (this.y - 10));
    return d < PET_RADIUS ? d : Infinity;
  }

  pet() {
    this.happyUntil = this.scene.time.now + 2000;
    this.img.setFlipX(false);
    heartBurst(this.scene, this.x, this.y - PERCH_TOP - 30, this.reduce);
    // a little "hoo hoo!"
    const hoo = this.scene.add
      .text(this.x - 12, this.y - PERCH_TOP - 40, 'hoo hoo!', {
        fontFamily: '"Press Start 2P"',
        fontSize: '12px',
        color: '#7a4f30',
        stroke: '#ffffff',
        strokeThickness: 5,
        resolution: 2,
      })
      .setOrigin(1, 1) // on the side away from Kuku, so her head doesn't cover it
      .setDepth(9501);
    this.scene.tweens.add({
      targets: hoo,
      y: hoo.y - 26,
      alpha: { from: 1, to: 0 },
      delay: 500,
      duration: 1100,
      ease: 'Sine.easeIn',
      onComplete: () => hoo.destroy(),
    });
    // a couple of loose feathers drifting down
    if (!this.reduce) {
      for (let i = 0; i < 3; i++) {
        const f = this.scene.add.rectangle(this.x + (Math.random() - 0.5) * 20, this.y - PERCH_TOP - 16, 4, 2, i % 2 ? 0xead3a8 : 0x9b6b45).setDepth(9500);
        this.scene.tweens.add({
          targets: f,
          x: f.x + (Math.random() - 0.5) * 50,
          y: f.y + 26 + Math.random() * 10,
          angle: (Math.random() - 0.5) * 360,
          alpha: { from: 1, to: 0 },
          duration: 1400 + Math.random() * 400,
          ease: 'Sine.easeInOut',
          onComplete: () => f.destroy(),
        });
      }
    }
  }

  update(time: number) {
    const baseY = this.y - PERCH_TOP;
    if (time < this.happyUntil) {
      this.img.setFrame(Math.floor(time / 140) % 2 === 0 ? 3 : 4);
      this.img.y = this.reduce ? baseY : baseY - Math.abs(Math.sin(time / 150)) * 6;
      return;
    }
    this.img.y = baseY;
    if (time > this.nextLook) {
      this.lookUntil = time + 1400;
      this.nextLook = time + 4000 + Math.random() * 5000;
      this.img.setFlipX(Math.random() < 0.5);
    }
    if (time > this.blinkAt + 160) this.blinkAt = time + 2200 + Math.random() * 3000;
    const blinking = time > this.blinkAt && time < this.blinkAt + 160;
    this.img.setFrame(blinking ? 1 : time < this.lookUntil ? 2 : 0);
  }
}
