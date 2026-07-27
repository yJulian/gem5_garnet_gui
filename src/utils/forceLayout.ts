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
 * Calculates silky-smooth Home Assistant Zigbee style network spring & collision physics.
 * Features:
 * - Gentle, continuous spring forces along connected edges with exponential hop-decay damping.
 * - Strict collision avoidance (minDist 180px) so node cards NEVER overlap.
 */
export function computeGentleGravityDrag(
  draggedNodeId: string,
  draggedPos: { x: number; y: number },
  nodes: Array<{ id: string; position: { x: number; y: number } }>,
  links: NoCLinkData[]
): Map<string, { x: number; y: number }> {
  const result = new Map<string, { x: number; y: number }>();

  nodes.forEach((n) => {
    result.set(n.id, {
      x: n.id === draggedNodeId ? draggedPos.x : n.position.x,
      y: n.id === draggedNodeId ? draggedPos.y : n.position.y,
    });
  });

  // 1. Compute hop distances from draggedNodeId using BFS
  const adjacency = new Map<string, string[]>();
  nodes.forEach((n) => adjacency.set(n.id, []));
  links.forEach((l) => {
    if (adjacency.has(l.source) && adjacency.has(l.target)) {
      adjacency.get(l.source)!.push(l.target);
      adjacency.get(l.target)!.push(l.source);
    }
  });

  const hopDepth = new Map<string, number>();
  hopDepth.set(draggedNodeId, 0);
  const queue = [draggedNodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentHop = hopDepth.get(current)!;
    const neighbors = adjacency.get(current) || [];

    neighbors.forEach((nbr) => {
      if (!hopDepth.has(nbr)) {
        hopDepth.set(nbr, currentHop + 1);
        queue.push(nbr);
      }
    });
  }

  const targetRestLength = 175; // Ideal link distance
  const minCollisionDist = 150; // Clearance to prevent card overlap
  const nodeIds = Array.from(result.keys());

  // 2. Gentle iterative physics relaxation loop (2 passes)
  for (let pass = 0; pass < 2; pass++) {
    // A. Spring forces on links with steep hop-decay damping
    links.forEach((l) => {
      const depthSrc = hopDepth.get(l.source) ?? 99;
      const depthDst = hopDepth.get(l.target) ?? 99;
      const minDepth = Math.min(depthSrc, depthDst);

      // Gentle exponential decay curve across graph levels: f(depth) = 0.015 * (0.35^depth)
      const springStiffness = 0.015 * Math.pow(0.35, minDepth);

      const posA = result.get(l.source)!;
      const posB = result.get(l.target)!;

      const dx = posB.x - posA.x;
      const dy = posB.y - posA.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) dist = 1;

      const delta = dist - targetRestLength;
      const forceX = (dx / dist) * delta * springStiffness;
      const forceY = (dy / dist) * delta * springStiffness;

      if (l.source === draggedNodeId) {
        result.set(l.target, {
          x: Math.round(posB.x - forceX),
          y: Math.round(posB.y - forceY),
        });
      } else if (l.target === draggedNodeId) {
        result.set(l.source, {
          x: Math.round(posA.x + forceX),
          y: Math.round(posA.y + forceY),
        });
      } else {
        result.set(l.source, {
          x: Math.round(posA.x + forceX * 0.5),
          y: Math.round(posA.y + forceY * 0.5),
        });
        result.set(l.target, {
          x: Math.round(posB.x - forceX * 0.5),
          y: Math.round(posB.y - forceY * 0.5),
        });
      }
    });

    // B. Collision Repulsion (gentle clearance)
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const idA = nodeIds[i];
        const idB = nodeIds[j];

        const posA = result.get(idA)!;
        const posB = result.get(idB)!;

        const dx = posB.x - posA.x;
        const dy = posB.y - posA.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minCollisionDist) {
          if (dist < 1) dist = 1;
          const overlap = minCollisionDist - dist;
          const pushX = (dx / dist) * overlap * 0.15;
          const pushY = (dy / dist) * overlap * 0.15;

          if (idA === draggedNodeId) {
            result.set(idB, {
              x: Math.round(posB.x + pushX),
              y: Math.round(posB.y + pushY),
            });
          } else if (idB === draggedNodeId) {
            result.set(idA, {
              x: Math.round(posA.x - pushX),
              y: Math.round(posA.y - pushY),
            });
          } else {
            result.set(idA, {
              x: Math.round(posA.x - pushX * 0.5),
              y: Math.round(posA.y - pushY * 0.5),
            });
            result.set(idB, {
              x: Math.round(posB.x + pushX * 0.5),
              y: Math.round(posB.y + pushY * 0.5),
            });
          }
        }
      }
    }

    // Pin dragged node firmly to mouse cursor position
    result.set(draggedNodeId, { x: draggedPos.x, y: draggedPos.y });
  }

  return result;
}
