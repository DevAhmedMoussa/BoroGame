import Phaser from 'phaser';
import { PET_RADIUS, heartBurst, type Pet } from './pet';
import { ART } from './scenery';

/**
 * Zuzu, the fluffy white dog who lives by Kuku's home.
 * Idles with little tail wags; when petted she hops, wags fast and bursts into hearts.
 */
export class Zuzu implements Pet {
  readonly name = 'Zuzu';
  readonly action = 'Give Zuzu a Treat';
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

  get tag() {
    return { x: this.x, y: this.y };
  }

  /** Where Kuku stands to pet her (just to her left). */
  get standSpot() {
    return { x: this.x - 46, y: this.y + 4 };
  }

  distance(px: number, py: number) {
    const d = Math.hypot(px - this.x, py - (this.y - 10));
    return d < PET_RADIUS ? d : Infinity;
  }

  pet() {
    this.happyUntil = this.scene.time.now + 1800;
    heartBurst(this.scene, this.x, this.y - 30, this.reduce);
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
