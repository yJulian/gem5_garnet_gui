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
  // Create force nodes map
  const d3Nodes: ForceNodeDatum[] = nodes.map((n) => ({
    id: n.id,
    x: n.position.x || Math.random() * width,
    y: n.position.y || Math.random() * height,
  }));

  const d3NodesMap = new Map<string, ForceNodeDatum>();
  d3Nodes.forEach((node) => d3NodesMap.set(node.id, node));

  // Filter links to only valid endpoints present in nodes
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

  // Run simulation steps synchronously for layout computation
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
