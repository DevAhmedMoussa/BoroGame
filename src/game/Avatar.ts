import Phaser from 'phaser';
import { KUKU_CYCLES } from '../sprites/kuku';

export type Facing = 'down' | 'up' | 'left' | 'right';

/** On-map scale for the pixel sprites (integer, so they stay crisp). */
export const SPRITE_SCALE = 2;

/** Sprite height in world px (32 px art + outline, scaled). */
export const AVATAR_HEIGHT = 34 * SPRITE_SCALE;

/**
 * The player character on the map: shadow, body sprite and a little car for
 * long trips. The sprite's feet sit at the container's origin.
 */
export class Avatar extends Phaser.GameObjects.Container {
  facing: Facing = 'down';
  private body_: Phaser.GameObjects.Sprite;
  private car: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Ellipse;
  private moving = false;
  private driving = false;
  private animTime = 0;
  private hop = 0;
  private reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.shadow = scene.add.ellipse(0, 0, 18 * SPRITE_SCALE, 6 * SPRITE_SCALE, 0x2b1d14, 0.28);
    this.body_ = scene.add.sprite(0, 1, 'kuku', 0).setOrigin(0.5, 1).setScale(SPRITE_SCALE);
    this.car = scene.add.sprite(0, -10, 'car', 0).setScale(SPRITE_SCALE).setVisible(false);
    this.add([this.shadow, this.body_, this.car]);
    scene.add.existing(this);
    this.addToUpdateList(); // containers don't get preUpdate by default
    this.setDepth(10);
  }

  /** Update facing from a movement direction (any angle). */
  faceVector(dx: number, dy: number) {
    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return;
    this.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    if (this.driving) this.car.setRotation(Math.atan2(dy, dx)).setFlipY(dx < 0);
  }

  setMoving(moving: boolean) {
    this.moving = moving;
  }

  setDriving(driving: boolean) {
    if (driving === this.driving) return;
    this.driving = driving;
    this.car.setVisible(driving);
    this.body_.setVisible(!driving);
    this.shadow.setSize((driving ? 22 : 18) * SPRITE_SCALE, 6 * SPRITE_SCALE);
    // A tiny "hop in / hop out" pop
    this.scene.tweens.add({ targets: this, scale: { from: 0.8, to: 1 }, duration: 160, ease: 'Back.easeOut' });
  }

  get isDriving() {
    return this.driving;
  }

  /** Arrival celebration: a little hop and a floating heart. Resolves when done. */
  celebrate(): Promise<void> {
    return new Promise((resolve) => {
      const heart = this.scene.add
        .image(this.x, this.y - AVATAR_HEIGHT - 6, 'heart')
        .setScale(SPRITE_SCALE)
        .setDepth(20);
      this.scene.tweens.add({
        targets: heart,
        y: heart.y - 18 * SPRITE_SCALE,
        alpha: { from: 1, to: 0 },
        duration: this.reduceMotion ? 500 : 900,
        ease: 'Sine.easeOut',
        onComplete: () => heart.destroy(),
      });
      if (this.reduceMotion) {
        this.scene.time.delayedCall(350, () => resolve());
        return;
      }
      this.scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 420,
        onUpdate: (tw) => (this.hop = Math.sin(tw.getValue()! * Math.PI) * 9 * SPRITE_SCALE),
        onComplete: () => {
          this.hop = 0;
          resolve();
        },
      });
    });
  }

  preUpdate(_time: number, delta: number) {
    this.animTime += delta;
    const cycle = KUKU_CYCLES[this.facing];
    const step = this.moving ? Math.floor(this.animTime / 140) % cycle.length : 0;
    this.body_.setFrame(cycle[step]);
    this.body_.setFlipX(this.facing === 'left');
    // Walk bob / idle breathing, snapped to whole sprite pixels
    const bob = this.moving
      ? Math.abs(Math.sin(this.animTime / 150 * Math.PI / 2)) * SPRITE_SCALE
      : this.reduceMotion
        ? 0
        : Math.round((Math.sin(this.animTime / 600) + 1) / 2) * SPRITE_SCALE * 0.5;
    this.body_.y = 1 - Math.round(bob) - this.hop;
    this.car.y = -10 - (this.moving && this.driving ? Math.round(Math.sin(this.animTime / 60)) : 0);
    this.shadow.setScale(this.hop > 0 ? 1 - this.hop / (40 * SPRITE_SCALE) : 1);
  }
}
