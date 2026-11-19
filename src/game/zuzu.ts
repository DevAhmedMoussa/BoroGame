import Phaser from 'phaser';
import { ART } from './scenery';

/** How close Kuku has to be (world px) for the "Pet Zuzu" button to appear. */
export const ZUZU_RADIUS = 80;

/**
 * Zuzu, the fluffy white dog who lives by Kuku's home.
 * Idles with little tail wags; when petted she hops, wags fast and bursts into hearts.
 */
export class Zuzu {
  readonly img: Phaser.GameObjects.Image;
  private happyUntil = 0;
  private nextWag = 1500;
  private wagUntil = 0;
  private reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(
    private scene: Phaser.Scene,
    readonly x: number,
    readonly y: number,
  ) {
    this.img = scene.add.image(x, y, 'zuzu', 0).setOrigin(0.5, 1).setScale(ART).setDepth(y);
  }

  /** Where Kuku stands to pet her (just to her left). */
  get standSpot() {
    return { x: this.x - 46, y: this.y + 4 };
  }

  isNear(px: number, py: number) {
    return Math.hypot(px - this.x, py - (this.y - 10)) < ZUZU_RADIUS;
  }

  pet() {
    const now = this.scene.time.now;
    this.happyUntil = now + 1800;
    const count = this.reduce ? 4 : 10;
    for (let i = 0; i < count; i++) {
      this.scene.time.delayedCall(i * 110, () => {
        const heart = this.scene.add
          .image(this.x + (Math.random() - 0.5) * 30, this.y - 30, 'heart')
          .setScale(ART * (0.8 + Math.random() * 0.6))
          .setDepth(9500);
        this.scene.tweens.add({
          targets: heart,
          x: heart.x + (Math.random() - 0.5) * 60,
          y: heart.y - 60 - Math.random() * 50,
          alpha: { from: 1, to: 0 },
          scale: heart.scale * 1.3,
          duration: 1100 + Math.random() * 500,
          ease: 'Sine.easeOut',
          onComplete: () => heart.destroy(),
        });
      });
    }
  }

  update(time: number) {
    const happy = time < this.happyUntil;
    if (happy) {
      // happy face, fast wag, bouncy hops
      this.img.setFrame(Math.floor(time / 120) % 2 === 0 ? 2 : 1);
      this.img.y = this.reduce ? this.y : this.y - Math.abs(Math.sin(time / 130)) * 8;
      return;
    }
    this.img.y = this.y;
    if (time > this.nextWag) {
      this.wagUntil = time + 900;
      this.nextWag = time + 2500 + Math.random() * 3000;
    }
    this.img.setFrame(time < this.wagUntil ? Math.floor(time / 160) % 2 : 0);
  }
}
