import type Phaser from 'phaser';
import { ART } from './scenery';

/** How close Kuku has to be (world px) for the "Pet …" button to appear. */
export const PET_RADIUS = 80;

/** Something Kuku can walk over to and pet (Zuzu, the owl). */
export interface Pet {
  readonly name: string;
  readonly x: number;
  readonly y: number;
  /** Where its name tag is pinned (below the point, or above it). */
  readonly tag: { x: number; y: number; above?: boolean };
  /** Where Kuku stands to pet it. */
  readonly standSpot: { x: number; y: number };
  /** Distance from Kuku (world px), for picking the closest pet. */
  distance(px: number, py: number): number;
  pet(): void;
  update(time: number): void;
}

/** A little burst of hearts floating up from (x, y). */
export function heartBurst(scene: Phaser.Scene, x: number, y: number, reduce: boolean) {
  const count = reduce ? 4 : 10;
  for (let i = 0; i < count; i++) {
    scene.time.delayedCall(i * 110, () => {
      const heart = scene.add
        .image(x + (Math.random() - 0.5) * 30, y, 'heart')
        .setScale(ART * (0.8 + Math.random() * 0.6))
        .setDepth(9500);
      scene.tweens.add({
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
