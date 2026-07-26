import { forceSimulation, forceManyBody, forceLink, forceCenter, forceCollide, SimulationNodeDatum, SimulationLinkDatum } from 'd3-force';
import { NoCProject, NoCLinkData } from '../types/noc';

export interface ForceNodeDatum extends SimulationNodeDatum {
  id: string;
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;
}

export interface ForceLinkDatum extends SimulationLinkDatum<ForceNodeDatum> {
  source: string | ForceNodeDatum;
  target: string | ForceNodeDatum;
}

/**
 * Calculates force-directed positions for a set of nodes and links using D3-force.
 */
export function computeForceLayout(
  nodes: NoCProject['nodes'],
  links: NoCLinkData[],
  width = 1000,
  height = 700
): Map<string, { x: number; y: number }> {
  const d3Nodes: ForceNodeDatum[] = nodes.map((n) => ({
    id: n.id,
    x: n.position.x || Math.random() * width,
    y: n.position.y || Math.random() * height,
  }));

  const d3NodesMap = new Map<string, ForceNodeDatum>();
  d3Nodes.forEach((node) => d3NodesMap.set(node.id, node));

  const d3Links: ForceLinkDatum[] = links
    .filter((l) => d3NodesMap.has(l.source) && d3NodesMap.has(l.target))
    .map((l) => ({
      source: l.source,
      target: l.target,
    }));

  const simulation = forceSimulation<ForceNodeDatum>(d3Nodes)
    .force('charge', forceManyBody().strength(-600))
    .force('link', forceLink<ForceNodeDatum, ForceLinkDatum>(d3Links).id((d) => d.id).distance(140))
    .force('center', forceCenter(width / 2, height / 2))
    .force('collide', forceCollide(75))
    .stop();

  for (let i = 0; i < 300; ++i) {
    simulation.tick();
  }

  const result = new Map<string, { x: number; y: number }>();
  d3Nodes.forEach((node) => {
    result.set(node.id, {
      x: Math.round(node.x),
      y: Math.round(node.y),
    });
  });

  return result;
}

/**
 * Calculates multi-level Home Assistant style gravity displacement, multi-hop trailing,
 * and permanent pushing across ALL graph depth levels (hop 1, hop 2, hop 3...).
 */
export function computeGentleGravityDrag(
  draggedNodeId: string,
  draggedPos: { x: number; y: number },
  nodes: NoCProject['nodes'],
  links: NoCLinkData[]
): Map<string, { x: number; y: number }> {
  const result = new Map<string, { x: number; y: number }>();

  nodes.forEach((n) => {
    result.set(n.id, {
      x: n.id === draggedNodeId ? draggedPos.x : n.position.x,
      y: n.id === draggedNodeId ? draggedPos.y : n.position.y,
    });
  });

  // 1. Build adjacency list for multi-hop graph traversal
  const adjacency = new Map<string, string[]>();
  nodes.forEach((n) => adjacency.set(n.id, []));
  links.forEach((l) => {
    if (adjacency.has(l.source) && adjacency.has(l.target)) {
      adjacency.get(l.source)!.push(l.target);
      adjacency.get(l.target)!.push(l.source);
    }
  });

  // 2. Multi-hop BFS Trailing Pass across ALL depth levels (Hop 1, Hop 2, Hop 3...)
  const visited = new Set<string>([draggedNodeId]);
  const queue: Array<{ id: string; parentId: string; hop: number }> = [];

  const initialNeighbors = adjacency.get(draggedNodeId) || [];
  initialNeighbors.forEach((nbrId) => {
    visited.add(nbrId);
    queue.push({ id: nbrId, parentId: draggedNodeId, hop: 1 });
  });

  const maxLinkDist = 170;

  while (queue.length > 0) {
    const { id, parentId, hop } = queue.shift()!;
    const parentPos = result.get(parentId)!;
    const nodePos = result.get(id)!;

    const dx = nodePos.x - parentPos.x;
    const dy = nodePos.y - parentPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    // Pull factor decays gracefully with hop depth: Hop 1=0.45, Hop 2=0.30, Hop 3=0.20, Hop 4=0.13...
    const springFactor = 0.45 * Math.pow(0.68, hop - 1);

    if (dist > maxLinkDist) {
      const targetX = parentPos.x + (dx / dist) * maxLinkDist;
      const targetY = parentPos.y + (dy / dist) * maxLinkDist;

      const newX = Math.round(nodePos.x + (targetX - nodePos.x) * springFactor);
      const newY = Math.round(nodePos.y + (targetY - nodePos.y) * springFactor);

      result.set(id, { x: newX, y: newY });
    }

    // Add unvisited neighbors to queue for multi-hop propagation across ALL levels
    const neighbors = adjacency.get(id) || [];
    neighbors.forEach((nbrId) => {
      if (!visited.has(nbrId)) {
        visited.add(nbrId);
        queue.push({ id: nbrId, parentId: id, hop: hop + 1 });
      }
    });
  }

  // 3. Multi-level Pushing & Collision Repulsion Pass (prevents node overlap across all levels)
  const minDistance = 165;
  const nodeIds = Array.from(result.keys());

  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = 0; j < nodeIds.length; j++) {
        if (i === j) continue;
        const idA = nodeIds[i];
        const idB = nodeIds[j];

        const posA = result.get(idA)!;
        const posB = result.get(idB)!;

        const dx = posB.x - posA.x;
        const dy = posB.y - posA.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minDistance) {
          if (dist < 1) dist = 1;
          const overlap = minDistance - dist;
          const ux = dx / dist;
          const uy = dy / dist;

          if (idA === draggedNodeId) {
            result.set(idB, {
              x: Math.round(posB.x + ux * overlap),
              y: Math.round(posB.y + uy * overlap),
            });
          } else if (idB !== draggedNodeId) {
            result.set(idB, {
              x: Math.round(posB.x + ux * overlap * 0.5),
              y: Math.round(posB.y + uy * overlap * 0.5),
            });
          }
        }
      }
    }
  }

  return result;
}
