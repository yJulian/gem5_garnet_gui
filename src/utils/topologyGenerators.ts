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
 * Returns the closest cardinal handle direction ('top' | 'bottom' | 'left' | 'right')
 * given a directional vector (dx, dy).
 */
export function getCardinalHandle(dx: number, dy: number): 'top' | 'bottom' | 'left' | 'right' {
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left';
  } else {
    return dy >= 0 ? 'bottom' : 'top';
  }
}

/**
 * Generates an N x M Mesh (Grid) topology with clean perimeter/45° endpoint positioning
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

  const spacingX = 260;
  const spacingY = 220;
  const startX = 220;
  const startY = 160;

  // Create Routers & Endpoints in Grid
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const routerIndex = r * cols + c;
      const routerId = `R_${routerIndex}`;
      const posX = startX + c * spacingX;
      const posY = startY + r * spacingY;

      // Add Router Node
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

      // Attach Endpoint node with optimized directional positioning
      if (attachEndpoints) {
        const epId = `EP_${routerIndex}`;
        let epX = posX;
        let epY = posY;
        let rSourceHandle = 'source-top';
        let epTargetHandle = 'target-bottom';

        if (r === 0) {
          // Top row: Straight above
          epX = posX;
          epY = posY - 130;
          rSourceHandle = 'source-top';
          epTargetHandle = 'target-bottom';
        } else if (r === rows - 1) {
          // Bottom row: Straight below
          epX = posX;
          epY = posY + 130;
          rSourceHandle = 'source-bottom';
          epTargetHandle = 'target-top';
        } else if (c === 0) {
          // Leftmost column (middle rows): Directly left
          epX = posX - 210;
          epY = posY;
          rSourceHandle = 'source-left';
          epTargetHandle = 'target-right';
        } else if (c === cols - 1) {
          // Rightmost column (middle rows): Directly right
          epX = posX + 210;
          epY = posY;
          rSourceHandle = 'source-right';
          epTargetHandle = 'target-left';
        } else {
          // Inner grid routers: 45 degree angle to top-right
          epX = posX + 130;
          epY = posY - 90;
          rSourceHandle = 'source-right';
          epTargetHandle = 'target-left';
        }

        nodes.push({
          id: epId,
          position: { x: epX, y: epY },
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
          sourceHandle: epTargetHandle.replace('target', 'source'),
          targetHandle: rSourceHandle.replace('source', 'target'),
          latency: 1,
          bandwidth: bandwidth,
          weight: 1,
          vcs: 4,
          direction: 'bi',
        });
      }
    }
  }

  // Create Grid Inter-Router Links with directional handle assignments
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const currentId = `R_${r * cols + c}`;

      // East link (Right)
      if (c + 1 < cols) {
        const eastId = `R_${r * cols + (c + 1)}`;
        links.push({
          id: `link_${currentId}_${eastId}`,
          source: currentId,
          target: eastId,
          sourceHandle: 'source-right',
          targetHandle: 'target-left',
          latency: latency,
          bandwidth: bandwidth,
          weight: 1,
          vcs: 4,
          direction: bidirectional ? 'bi' : 'uni',
          srcPort: 'East',
          dstPort: 'West',
        });
      }

      // South link (Bottom)
      if (r + 1 < rows) {
        const southId = `R_${(r + 1) * cols + c}`;
        links.push({
          id: `link_${currentId}_${southId}`,
          source: currentId,
          target: southId,
          sourceHandle: 'source-bottom',
          targetHandle: 'target-top',
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

  // Horizontal Wraparound Links
  if (cols > 2) {
    for (let r = 0; r < rows; r++) {
      const westId = `R_${r * cols + 0}`;
      const eastId = `R_${r * cols + (cols - 1)}`;
      links.push({
        id: `link_wrap_h_${r}`,
        source: eastId,
        target: westId,
        sourceHandle: 'source-right',
        targetHandle: 'target-left',
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

  // Vertical Wraparound Links
  if (rows > 2) {
    for (let c = 0; c < cols; c++) {
      const northId = `R_${0 * cols + c}`;
      const southId = `R_${(rows - 1) * cols + c}`;
      links.push({
        id: `link_wrap_v_${c}`,
        source: southId,
        target: northId,
        sourceHandle: 'source-bottom',
        targetHandle: 'target-top',
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
 * Generates a Ring topology with N nodes and geometric angle-based port handles
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

  const centerX = 500;
  const centerY = 400;
  const radius = Math.max(220, count * 40);

  // Pre-calculate positions
  const positions: Array<{ x: number; y: number; angle: number }> = [];
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count;
    const posX = centerX + radius * Math.cos(angle);
    const posY = centerY + radius * Math.sin(angle);
    positions.push({ x: posX, y: posY, angle });
  }

  for (let i = 0; i < count; i++) {
    const pos = positions[i];
    const routerId = `R_${i}`;

    nodes.push({
      id: routerId,
      position: { x: pos.x, y: pos.y },
      data: {
        label: `Router ${i}`,
        type: 'router',
        routerId: i,
        latency: 1,
      },
    });

    // Attach Endpoint node radially outward with geometric handle binding
    if (attachEndpoints) {
      const epId = `EP_${i}`;
      const epX = centerX + (radius + 150) * Math.cos(pos.angle);
      const epY = centerY + (radius + 150) * Math.sin(pos.angle);

      // Outward vector from Router to Endpoint
      const dxEp = Math.cos(pos.angle);
      const dyEp = Math.sin(pos.angle);

      const rOutHandle = getCardinalHandle(dxEp, dyEp);
      const epInHandle = getCardinalHandle(-dxEp, -dyEp);

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
        sourceHandle: `source-${epInHandle}`,
        targetHandle: `target-${rOutHandle}`,
        latency: 1,
        bandwidth: bandwidth,
        weight: 1,
        vcs: 4,
        direction: 'bi',
      });
    }

    // Connect to next router in Ring with geometric cardinal handles
    const nextIdx = (i + 1) % count;
    const nextPos = positions[nextIdx];
    const nextRouterId = `R_${nextIdx}`;

    // Direction vector from Router i to Router i+1
    const dxLink = nextPos.x - pos.x;
    const dyLink = nextPos.y - pos.y;

    const srcHandleDir = getCardinalHandle(dxLink, dyLink);
    const dstHandleDir = getCardinalHandle(-dxLink, -dyLink);

    links.push({
      id: `link_ring_${i}_${nextIdx}`,
      source: routerId,
      target: nextRouterId,
      sourceHandle: `source-${srcHandleDir}`,
      targetHandle: `target-${dstHandleDir}`,
      latency: latency,
      bandwidth: bandwidth,
      weight: 1,
      vcs: 4,
      direction: bidirectional ? 'bi' : 'uni',
    });
  }

  return { nodes, links };
}
