import { SAHEL, WORLD_H, WORLD_W, isWater, wy } from '../game/world';
import type { RoadGraph } from './roads';

const EDGE_MARGIN = 10;
const BRIDGE_HALF_WIDTH = 11;

/** Where the avatar may stand: anywhere on land inside the world, plus on bridges. */
export class Walkable {
  private bridges: Array<{ ax: number; ay: number; bx: number; by: number }> = [];
  private seaLine = wy(SAHEL.seaBottom) + 14;
  private ponds: Array<{ x: number; y: number; rx: number; ry: number }> = [];

  constructor(graph: RoadGraph) {
    for (const e of graph.edges) {
      if (e.kind !== 'bridge') continue;
      const a = graph.nodes.get(e.a)!;
      const b = graph.nodes.get(e.b)!;
      this.bridges.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y });
    }
  }

  /** Ponds out in the countryside can't be walked into either. */
  block(ponds: Array<{ x: number; y: number; rx: number; ry: number }>) {
    this.ponds.push(...ponds);
  }

  at(x: number, y: number): boolean {
    if (x < EDGE_MARGIN || x > WORLD_W - EDGE_MARGIN || y < this.seaLine || y > WORLD_H - EDGE_MARGIN) return false;
    for (const p of this.ponds) if (((x - p.x) / (p.rx + 6)) ** 2 + ((y - p.y) / (p.ry + 6)) ** 2 < 1) return false;
    if (!isWater(x / WORLD_W, y / WORLD_H)) return true;
    return this.bridges.some((br) => distToSegment(x, y, br.ax, br.ay, br.bx, br.by) <= BRIDGE_HALF_WIDTH);
  }

  segment(ax: number, ay: number, bx: number, by: number): boolean {
    const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 8));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      if (!this.at(ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
    }
    return true;
  }
}

export function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}
