import type { RoadGraph } from './roads';
import type { Walkable } from './walkable';

export interface Point {
  x: number;
  y: number;
}

/** Walking off-road to reach the first junction costs this much more than road. */
const OFFROAD_PENALTY = 3;

/**
 * Shortest route along the roads from any point to a graph node (Dijkstra
 * from the target, then the best road entry point reachable over land).
 * Returns world-px waypoints, starting at `from` and ending at the target node.
 */
export function findRoute(graph: RoadGraph, walk: Walkable, from: Point, targetId: string): Point[] | null {
  const target = graph.nodes.get(targetId);
  if (!target) return null;

  // Adjacency list
  const adj = new Map<string, Array<{ to: string; w: number }>>();
  for (const id of graph.nodes.keys()) adj.set(id, []);
  for (const e of graph.edges) {
    const a = graph.nodes.get(e.a)!;
    const b = graph.nodes.get(e.b)!;
    const w = Math.hypot(a.x - b.x, a.y - b.y);
    adj.get(e.a)!.push({ to: e.b, w });
    adj.get(e.b)!.push({ to: e.a, w });
  }

  // Dijkstra from the target (graph is undirected, so distances are symmetric)
  const dist = new Map<string, number>([[targetId, 0]]);
  const next = new Map<string, string>(); // next hop towards the target
  const open = new Set<string>([targetId]);
  const done = new Set<string>();
  while (open.size) {
    let cur = '';
    let best = Infinity;
    for (const id of open) {
      const d = dist.get(id)!;
      if (d < best) {
        best = d;
        cur = id;
      }
    }
    open.delete(cur);
    done.add(cur);
    for (const { to, w } of adj.get(cur)!) {
      if (done.has(to)) continue;
      const nd = best + w;
      if (nd < (dist.get(to) ?? Infinity)) {
        dist.set(to, nd);
        next.set(to, cur);
        open.add(to);
      }
    }
  }

  // Best entry node: cheap to reach over land from `from`, and close to the target by road.
  let entry: string | null = null;
  let entryCost = Infinity;
  for (const [id, node] of graph.nodes) {
    const d = dist.get(id);
    if (d === undefined) continue;
    const off = Math.hypot(node.x - from.x, node.y - from.y);
    const cost = off * OFFROAD_PENALTY + d;
    if (cost >= entryCost) continue;
    if (off > 4 && !walk.segment(from.x, from.y, node.x, node.y)) continue;
    entry = id;
    entryCost = cost;
  }
  if (!entry) return null;

  // Standing beside a place's dot? Head straight for the road instead of the dot first.
  const hop = next.get(entry);
  if (graph.nodes.get(entry)!.placeId && hop) {
    const h = graph.nodes.get(hop)!;
    if (walk.segment(from.x, from.y, h.x, h.y)) entry = hop;
  }

  const route: Point[] = [{ x: from.x, y: from.y }];
  let id: string | undefined = entry;
  while (id) {
    const n = graph.nodes.get(id)!;
    const last = route[route.length - 1];
    if (Math.hypot(n.x - last.x, n.y - last.y) > 1) route.push({ x: n.x, y: n.y });
    if (id === targetId) break;
    id = next.get(id);
  }
  return route;
}

export function routeLength(route: Point[]) {
  let len = 0;
  for (let i = 1; i < route.length; i++) len += Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y);
  return len;
}
