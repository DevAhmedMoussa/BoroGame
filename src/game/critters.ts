import Phaser from 'phaser';
import { mulberry } from '../lib/random';
import type { RoadGraph } from '../lib/roads';
import { CRITTERS } from '../sprites/scenery/critters';

/** Where a group of little animals (or a kite) lives; planned with the scenery. */
export interface CritterSpot {
  kind: 'ducks' | 'butterflies' | 'pigeons' | 'chickens' | 'kite' | 'orbit';
  x: number;
  y: number;
  rx?: number;
  ry?: number;
}

const ART = 2;
const WALKERS = 46;
const BUTTERFLY_TINTS = [0xffb3d1, 0xffe17a, 0xbfe3ff, 0xd9b8ff, 0xffffff, 0xffc48a];

interface Walker {
  img: Phaser.GameObjects.Image;
  from: string;
  to: string;
  t: number;
  speed: number;
  side: number;
  phase: number;
}
interface Duck {
  img: Phaser.GameObjects.Image;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  lag: number;
  speed: number;
  phase: number;
}
interface Butterfly {
  img: Phaser.GameObjects.Image;
  cx: number;
  cy: number;
  phase: number;
  r: number;
}
interface Bird {
  img: Phaser.GameObjects.Image;
  hx: number;
  hy: number;
  x: number;
  y: number;
  state: 'ground' | 'flee' | 'away' | 'land';
  t: number;
  vx: number;
  vy: number;
  next: number;
}
interface Hen {
  img: Phaser.GameObjects.Image;
  cx: number;
  cy: number;
  tx: number;
  ty: number;
  wait: number;
  speed: number;
}
interface Kite {
  img: Phaser.GameObjects.Image;
  hx: number;
  hy: number;
  phase: number;
}
interface Orbiter {
  img: Phaser.GameObjects.Image;
  cx: number;
  cy: number;
  r: number;
  phase: number;
  speed: number;
}

/**
 * The little lives on the map: people strolling the sidewalks, ducks with
 * ducklings on the ponds, butterflies over flowers, pigeons that scatter when
 * Kuku walks through them, hens pottering about, kites and dovecote pigeons.
 * Everything off-screen is skipped (walkers keep walking, just invisibly).
 */
export class Critters {
  private walkers: Walker[] = [];
  private ducks: Duck[] = [];
  private butterflies: Butterfly[] = [];
  private birds: Bird[] = [];
  private hens: Hen[] = [];
  private kites: Kite[] = [];
  private orbiters: Orbiter[] = [];
  private strings: Phaser.GameObjects.Graphics;
  private adj = new Map<string, string[]>();

  constructor(
    private scene: Phaser.Scene,
    private graph: RoadGraph,
    spots: CritterSpot[],
    private reduce: boolean,
  ) {
    const rand = mulberry(31);
    const add = (key: string, x: number, y: number) => scene.add.image(x, y, key, 0).setOrigin(0.5, 1).setScale(ART).setDepth(y);

    // People walk along the sidewalks of the town roads and over the bridges
    const walkable = graph.edges.filter((e) => e.kind === 'road' || e.kind === 'bridge');
    for (const e of walkable) {
      for (const [a, b] of [[e.a, e.b], [e.b, e.a]]) {
        if (!this.adj.has(a)) this.adj.set(a, []);
        this.adj.get(a)!.push(b);
      }
    }
    for (let i = 0; i < WALKERS && walkable.length; i++) {
      const e = walkable[Math.floor(rand() * walkable.length)];
      const fwd = rand() < 0.5;
      this.walkers.push({
        img: add(CRITTERS.walkers[i % CRITTERS.walkers.length].key, 0, 0),
        from: fwd ? e.a : e.b,
        to: fwd ? e.b : e.a,
        t: rand(),
        speed: 18 + rand() * 12,
        side: rand() < 0.5 ? -1 : 1,
        phase: rand() * 1000,
      });
    }

    for (const s of spots) {
      if (s.kind === 'ducks') {
        const rx = (s.rx ?? 40) * 0.55;
        const ry = (s.ry ?? 24) * 0.5;
        const speed = (0.18 + rand() * 0.1) * (rand() < 0.5 ? -1 : 1);
        const phase = rand() * 10;
        this.ducks.push({ img: add(CRITTERS.duck.key, s.x, s.y), cx: s.x, cy: s.y, rx, ry, lag: 0, speed, phase });
        for (let i = 1; i <= 3; i++) this.ducks.push({ img: add(CRITTERS.duckling.key, s.x, s.y), cx: s.x, cy: s.y, rx, ry, lag: i * 0.32, speed, phase });
      } else if (s.kind === 'butterflies') {
        for (let i = 0; i < 2 + Math.floor(rand() * 2); i++) {
          const img = add(CRITTERS.butterfly.key, s.x, s.y).setTint(BUTTERFLY_TINTS[Math.floor(rand() * BUTTERFLY_TINTS.length)]);
          this.butterflies.push({ img, cx: s.x + (rand() - 0.5) * 30, cy: s.y, phase: rand() * 100, r: 18 + rand() * 18 });
        }
      } else if (s.kind === 'pigeons') {
        for (let i = 0; i < 5; i++) {
          const x = s.x + (rand() - 0.5) * 46;
          const y = s.y + (rand() - 0.5) * 18;
          this.birds.push({ img: add(CRITTERS.pigeon.key, x, y).setFlipX(rand() < 0.5), hx: x, hy: y, x, y, state: 'ground', t: 0, vx: 0, vy: 0, next: rand() * 2 });
        }
      } else if (s.kind === 'chickens') {
        for (let i = 0; i < 3; i++) {
          const x = s.x + (rand() - 0.5) * 40;
          const y = s.y + (rand() - 0.5) * 16;
          this.hens.push({ img: add(CRITTERS.chicken.key, x, y), cx: s.x, cy: s.y, tx: x, ty: y, wait: rand() * 3, speed: 16 });
        }
      } else if (s.kind === 'kite') {
        this.kites.push({ img: add(CRITTERS.kite.key, s.x + 40, s.y - 110).setDepth(6002), hx: s.x + 9, hy: s.y - 26, phase: rand() * 10 });
      } else if (s.kind === 'orbit') {
        for (let i = 0; i < 4; i++) {
          this.orbiters.push({
            img: scene.add.image(s.x, s.y, CRITTERS.pigeon.key, 2).setScale(ART).setDepth(6001),
            cx: s.x,
            cy: s.y,
            r: 26 + rand() * 22,
            phase: (i / 4) * Math.PI * 2,
            speed: 0.9 + rand() * 0.5,
          });
        }
      }
    }
    this.strings = scene.add.graphics().setDepth(6001);
  }

  update(time: number, dt: number, vis: (x: number, y: number) => boolean, kuku: { x: number; y: number }) {
    const s = time / 1000;
    const still = this.reduce;

    for (const w of this.walkers) {
      const a = this.graph.nodes.get(w.from)!;
      const b = this.graph.nodes.get(w.to)!;
      const len = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
      w.t += (w.speed * dt) / len;
      if (w.t >= 1) {
        const all = this.adj.get(w.to) ?? [];
        const onward = all.filter((n) => n !== w.from);
        const next = onward.length ? onward[Math.floor(Math.random() * onward.length)] : w.from; // dead end: turn back
        w.from = w.to;
        w.to = next;
        w.t = 0;
        continue;
      }
      const ux = (b.x - a.x) / len;
      const uy = (b.y - a.y) / len;
      const x = a.x + (b.x - a.x) * w.t - uy * 12 * w.side;
      const y = a.y + (b.y - a.y) * w.t + ux * 12 * w.side + 6;
      const on = vis(x, y);
      w.img.setVisible(on);
      if (!on) continue;
      w.img.setPosition(Math.round(x), Math.round(y)).setDepth(y).setFlipX(ux < 0);
      w.img.setFrame(still ? 0 : Math.floor((time + w.phase) / 220) % 2);
    }

    for (const d of this.ducks) {
      if (!vis(d.cx, d.cy)) continue;
      const a = d.phase + (still ? 0 : s * d.speed) - d.lag * Math.sign(d.speed);
      const x = d.cx + Math.cos(a) * d.rx;
      const y = d.cy + Math.sin(a) * d.ry + 4;
      // moving direction: derivative of the ellipse
      const dx = -Math.sin(a) * d.speed;
      d.img.setPosition(Math.round(x), Math.round(y)).setDepth(y).setFlipX(dx < 0);
      d.img.setFrame(still ? 0 : Math.floor(time / 320 + d.lag * 3) % 2);
    }

    for (const b of this.butterflies) {
      if (!vis(b.cx, b.cy)) continue;
      const t = s + b.phase;
      const x = b.cx + Math.sin(t * 0.6) * b.r + Math.sin(t * 2.3) * 4;
      const y = b.cy - 22 + Math.sin(t * 1.1) * b.r * 0.4 - Math.abs(Math.sin(t * 3.1)) * 6;
      b.img.setPosition(Math.round(x), Math.round(y)).setDepth(b.cy + 20);
      b.img.setFrame(still ? 0 : Math.floor(time / 110 + b.phase) % 2);
    }

    for (const bd of this.birds) this.updateBird(bd, dt, time, vis, kuku);

    for (const h of this.hens) {
      if (!vis(h.cx, h.cy)) continue;
      const near = Math.hypot(kuku.x - h.img.x, kuku.y - h.img.y) < 46;
      if (near && h.speed < 40) {
        // flustered: dash away from Kuku
        const ang = Math.atan2(h.img.y - kuku.y, h.img.x - kuku.x);
        h.tx = h.cx + Math.cos(ang) * 40;
        h.ty = h.cy + Math.sin(ang) * 18;
        h.speed = 70;
        h.wait = 0;
      }
      const dx = h.tx - h.img.x;
      const dy = h.ty - h.img.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 1.5 && !still) {
        const step = Math.min(dist, h.speed * dt);
        h.img.setPosition(h.img.x + (dx / dist) * step, h.img.y + (dy / dist) * step).setFlipX(dx < 0).setFrame(0).setDepth(h.img.y);
      } else {
        h.speed = 16;
        h.wait -= dt;
        h.img.setFrame(still ? 0 : Math.floor(time / 260) % 3 === 0 ? 1 : 0);
        if (h.wait <= 0) {
          h.tx = h.cx + (Math.random() - 0.5) * 60;
          h.ty = h.cy + (Math.random() - 0.5) * 24;
          h.wait = 1.5 + Math.random() * 3;
        }
      }
    }

    this.strings.clear();
    for (const k of this.kites) {
      if (!vis(k.hx, k.hy)) {
        k.img.setVisible(false);
        continue;
      }
      const t = s + k.phase;
      const kx = k.hx + 34 + (still ? 0 : Math.sin(t * 0.7) * 10);
      const ky = k.hy - 84 + (still ? 0 : Math.sin(t * 1.3) * 6);
      k.img.setVisible(true).setPosition(Math.round(kx), Math.round(ky)).setRotation(still ? 0 : Math.sin(t * 1.3) * 0.15);
      k.img.setFrame(still ? 0 : Math.floor(time / 240) % 2);
      // string with a soft sag
      this.strings.lineStyle(1.5, 0xffffff, 0.85).beginPath();
      const ex = kx;
      const ey = ky - 14;
      for (let i = 0; i <= 8; i++) {
        const u = i / 8;
        const x = k.hx + (ex - k.hx) * u;
        const y = k.hy + (ey - k.hy) * u + Math.sin(u * Math.PI) * 10;
        if (i === 0) this.strings.moveTo(x, y);
        else this.strings.lineTo(x, y);
      }
      this.strings.strokePath();
    }

    for (const o of this.orbiters) {
      if (!vis(o.cx, o.cy)) continue;
      const a = o.phase + (still ? 0 : s * o.speed);
      o.img.setPosition(o.cx + Math.cos(a) * o.r, o.cy + Math.sin(a) * o.r * 0.45).setFlipX(-Math.sin(a) < 0);
      o.img.setFrame(2 + (Math.floor(time / 150 + o.phase * 3) % 2));
    }
  }

  /** Pigeons peck about, burst into the air when Kuku comes close, and drift back later. */
  private updateBird(b: Bird, dt: number, time: number, vis: (x: number, y: number) => boolean, kuku: { x: number; y: number }) {
    if (!vis(b.hx, b.hy) && b.state === 'ground') return;
    const dKuku = Math.hypot(kuku.x - b.x, kuku.y - 10 - b.y);
    switch (b.state) {
      case 'ground': {
        if (dKuku < 62) {
          const ang = Math.atan2(b.y - kuku.y, b.x - kuku.x);
          b.vx = Math.cos(ang) * (110 + Math.random() * 50);
          b.vy = -120 - Math.random() * 50;
          b.state = 'flee';
          b.t = 0;
          b.img.setDepth(6001).setFlipX(b.vx < 0);
          break;
        }
        b.next -= dt;
        if (b.next <= 0) {
          // peck, or take a little hop
          if (Math.random() < 0.3) {
            b.x = Phaser.Math.Clamp(b.x + (Math.random() - 0.5) * 10, b.hx - 26, b.hx + 26);
            b.y = Phaser.Math.Clamp(b.y + (Math.random() - 0.5) * 6, b.hy - 10, b.hy + 10);
            b.img.setFlipX(Math.random() < 0.5);
          }
          b.next = 0.4 + Math.random() * 1.4;
        }
        b.img.setPosition(Math.round(b.x), Math.round(b.y)).setDepth(b.y);
        b.img.setFrame(this.reduce ? 0 : Math.floor(time / 300 + b.hx) % 4 === 0 ? 1 : 0);
        break;
      }
      case 'flee': {
        b.t += dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.vy += 40 * dt;
        b.img.setPosition(b.x, b.y).setFrame(2 + (Math.floor(time / 90) % 2)).setAlpha(Math.max(0, 1 - b.t / 1.4));
        if (b.t > 1.4) {
          b.state = 'away';
          b.t = 4 + Math.random() * 4;
          b.img.setVisible(false);
        }
        break;
      }
      case 'away': {
        b.t -= dt;
        if (b.t <= 0 && Math.hypot(kuku.x - b.hx, kuku.y - b.hy) > 140) {
          b.state = 'land';
          b.t = 0;
          b.x = b.hx + (Math.random() - 0.5) * 20;
          b.y = b.hy;
          b.img.setVisible(true).setAlpha(1).setFlipX(Math.random() < 0.5);
        }
        break;
      }
      case 'land': {
        b.t += dt / 1.1;
        const u = Math.min(1, b.t);
        b.img.setPosition(b.x - (1 - u) * 50 * (b.img.flipX ? -1 : 1), b.y - (1 - u) * (1 - u) * 90).setFrame(2 + (Math.floor(time / 110) % 2)).setDepth(6001);
        if (u >= 1) {
          b.state = 'ground';
          b.next = 1;
        }
        break;
      }
    }
  }
}
