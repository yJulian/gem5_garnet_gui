import { NoCProject, Gem5ComponentType, NoCLinkData } from '../types/noc';

export interface TopologyGeneratorOptions {
  cols?: number;
  rows?: number;
  nodeCount?: number;
  attachEndpoints?: boolean;
  endpointType?: Gem5ComponentType;
  bidirectional?: boolean;
  linkLatency?: number;
  linkBandwidth?: number;
}

/**
 * Generates an N x M Mesh (Grid) topology
 */
export function generateMeshTopology(options: TopologyGeneratorOptions): { nodes: NoCProject['nodes']; links: NoCLinkData[] } {
  const cols = Math.max(1, options.cols || 4);
  const rows = Math.max(1, options.rows || 4);
  const attachEndpoints = options.attachEndpoints ?? true;
  const endpointType = options.endpointType || 'CPU_Timing';
  const bidirectional = options.bidirectional ?? true;
  const latency = options.linkLatency || 1;
  const bandwidth = options.linkBandwidth || 128;

  const nodes: NoCProject['nodes'] = [];
  const links: NoCLinkData[] = [];

  const spacingX = 220;
  const spacingY = 180;
  const startX = 100;
  const startY = 100;

  // Create Routers in Grid
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const routerIndex = r * cols + c;
      const routerId = `R_${routerIndex}`;
      const posX = startX + c * spacingX;
      const posY = startY + r * spacingY;

      nodes.push({
        id: routerId,
        position: { x: posX, y: posY },
        data: {
          label: `Router ${routerIndex}`,
          type: 'router',
          routerId: routerIndex,
          latency: 1,
        },
      });

      // Attach endpoint node
      if (attachEndpoints) {
        const epId = `EP_${routerIndex}`;
        nodes.push({
          id: epId,
          position: { x: posX + 60, y: posY + 70 },
          data: {
            label: `NI ${routerIndex} (${endpointType})`,
            type: 'endpoint',
            gem5Component: endpointType,
          },
        });

        // Link Endpoint -> Router
        links.push({
          id: `link_${epId}_${routerId}`,
          source: epId,
          target: routerId,
          latency: 1,
          bandwidth: bandwidth,
          weight: 1,
          vcs: 4,
          direction: 'bi',
        });
      }
    }
  }

  // Create Grid Inter-Router Links
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const currentId = `R_${r * cols + c}`;

      // East link
      if (c + 1 < cols) {
        const eastId = `R_${r * cols + (c + 1)}`;
        links.push({
          id: `link_${currentId}_${eastId}`,
          source: currentId,
          target: eastId,
          latency: latency,
          bandwidth: bandwidth,
          weight: 1,
          vcs: 4,
          direction: bidirectional ? 'bi' : 'uni',
          srcPort: 'East',
          dstPort: 'West',
        });
      }

      // South link
      if (r + 1 < rows) {
        const southId = `R_${(r + 1) * cols + c}`;
        links.push({
          id: `link_${currentId}_${southId}`,
          source: currentId,
          target: southId,
          latency: latency,
          bandwidth: bandwidth,
          weight: 1,
          vcs: 4,
          direction: bidirectional ? 'bi' : 'uni',
          srcPort: 'South',
          dstPort: 'North',
        });
      }
    }
  }

  return { nodes, links };
}

/**
 * Generates an N x M Torus topology (Mesh + Wraparound links)
 */
export function generateTorusTopology(options: TopologyGeneratorOptions): { nodes: NoCProject['nodes']; links: NoCLinkData[] } {
  const mesh = generateMeshTopology(options);
  const cols = Math.max(1, options.cols || 4);
  const rows = Math.max(1, options.rows || 4);
  const bidirectional = options.bidirectional ?? true;
  const latency = options.linkLatency || 1;
  const bandwidth = options.linkBandwidth || 128;

  const links = [...mesh.links];

  // Horizontal Wraparound Links (East boundary to West boundary)
  if (cols > 2) {
    for (let r = 0; r < rows; r++) {
      const westId = `R_${r * cols + 0}`;
      const eastId = `R_${r * cols + (cols - 1)}`;
      links.push({
        id: `link_wrap_h_${r}`,
        source: eastId,
        target: westId,
        latency: latency,
        bandwidth: bandwidth,
        weight: 1,
        vcs: 4,
        direction: bidirectional ? 'bi' : 'uni',
        srcPort: 'East_Wrap',
        dstPort: 'West_Wrap',
      });
    }
  }

  // Vertical Wraparound Links (South boundary to North boundary)
  if (rows > 2) {
    for (let c = 0; c < cols; c++) {
      const northId = `R_${0 * cols + c}`;
      const southId = `R_${(rows - 1) * cols + c}`;
      links.push({
        id: `link_wrap_v_${c}`,
        source: southId,
        target: northId,
        latency: latency,
        bandwidth: bandwidth,
        weight: 1,
        vcs: 4,
        direction: bidirectional ? 'bi' : 'uni',
        srcPort: 'South_Wrap',
        dstPort: 'North_Wrap',
      });
    }
  }

  return { nodes: mesh.nodes, links };
}

/**
 * Generates a Ring topology with N nodes
 */
export function generateRingTopology(options: TopologyGeneratorOptions): { nodes: NoCProject['nodes']; links: NoCLinkData[] } {
  const count = Math.max(3, options.nodeCount || 8);
  const attachEndpoints = options.attachEndpoints ?? true;
  const endpointType = options.endpointType || 'CPU_Timing';
  const bidirectional = options.bidirectional ?? true;
  const latency = options.linkLatency || 1;
  const bandwidth = options.linkBandwidth || 128;

  const nodes: NoCProject['nodes'] = [];
  const links: NoCLinkData[] = [];

  const centerX = 400;
  const centerY = 300;
  const radius = Math.max(160, count * 28);

  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count;
    const posX = centerX + radius * Math.cos(angle);
    const posY = centerY + radius * Math.sin(angle);
    const routerId = `R_${i}`;

    nodes.push({
      id: routerId,
      position: { x: posX, y: posY },
      data: {
        label: `Router ${i}`,
        type: 'router',
        routerId: i,
        latency: 1,
      },
    });

    if (attachEndpoints) {
      const epId = `EP_${i}`;
      const epX = centerX + (radius + 80) * Math.cos(angle);
      const epY = centerY + (radius + 80) * Math.sin(angle);

      nodes.push({
        id: epId,
        position: { x: epX, y: epY },
        data: {
          label: `NI ${i} (${endpointType})`,
          type: 'endpoint',
          gem5Component: endpointType,
        },
      });

      links.push({
        id: `link_${epId}_${routerId}`,
        source: epId,
        target: routerId,
        latency: 1,
        bandwidth: bandwidth,
        weight: 1,
        vcs: 4,
        direction: 'bi',
      });
    }

    // Connect to next router in Ring
    const nextIdx = (i + 1) % count;
    const nextRouterId = `R_${nextIdx}`;
    links.push({
      id: `link_ring_${i}_${nextIdx}`,
      source: routerId,
      target: nextRouterId,
      latency: latency,
      bandwidth: bandwidth,
      weight: 1,
      vcs: 4,
      direction: bidirectional ? 'bi' : 'uni',
    });
  }

  return { nodes, links };
}
