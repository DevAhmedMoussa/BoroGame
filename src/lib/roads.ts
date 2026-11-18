import type { Place } from '../content';
import { ROAD_EDGES, ROAD_NODES, isWater, wx, wy } from '../game/world';

export type EdgeKind = 'road' | 'highway' | 'bridge' | 'spur';

export interface GraphNode {
  id: string;
  /** world px */
  x: number;
  y: number;
  placeId?: string;
}

export interface GraphEdge {
  a: string;
  b: string;
  kind: EdgeKind;
}

export interface RoadGraph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
}

/** True if the straight segment between two world points stays off the water. */
export function segmentIsDry(ax: number, ay: number, bx: number, by: number): boolean {
  const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / 8);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (isWater((ax + (bx - ax) * t) / wx(1), (ay + (by - ay) * t) / wy(1))) return false;
  }
  return true;
}

/**
 * Builds the road graph: fixed junctions + edges from world.ts, plus a short
 * "spur" from each place to its nearest junction that can be reached without
 * crossing the Nile. Places can therefore be moved in places.json freely.
 */
export function buildRoadGraph(places: Place[]): RoadGraph {
  const nodes = new Map<string, GraphNode>();
  for (const n of ROAD_NODES) nodes.set(n.id, { id: n.id, x: wx(n.x), y: wy(n.y) });
  const edges: GraphEdge[] = ROAD_EDGES.map(([a, b, kind]) => ({ a, b, kind }));

  for (const place of places) {
    const id = `place:${place.id}`;
    const p: GraphNode = { id, x: wx(place.position.x), y: wy(place.position.y), placeId: place.id };
    nodes.set(id, p);
    const candidates = ROAD_NODES.map((n) => ({ n, d: Math.hypot(wx(n.x) - p.x, wy(n.y) - p.y) })).sort(
      (u, v) => u.d - v.d,
    );
    const best = candidates.find(({ n }) => segmentIsDry(p.x, p.y, wx(n.x), wy(n.y)));
    if (best) edges.push({ a: id, b: best.n.id, kind: 'spur' });
  }
  return { nodes, edges };
}
