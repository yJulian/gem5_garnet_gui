import { NoCProject } from '../types/noc';

export interface MemoryRangeParsed {
  start: bigint;
  size: bigint;
  end: bigint; // start + size
  startHex: string;
  endHex: string;
  sizeFormatted: string;
}

export type SanityIssueType = 'error' | 'warning';
export type SanityIssueCode =
  | 'MEMORY_OVERLAP'
  | 'INVALID_MEMORY_START'
  | 'INVALID_MEMORY_SIZE'
  | 'DUPLICATE_ROUTER_ID'
  | 'UNCONNECTED_ENDPOINT'
  | 'DISCONNECTED_ISLAND'
  | 'INVALID_LATENCY'
  | 'INVALID_BANDWIDTH'
  | 'INVALID_BUFFER';

export interface SanityIssue {
  id: string;
  type: SanityIssueType;
  code: SanityIssueCode;
  nodeId?: string;
  linkId?: string;
  title: string;
  message: string;
  relatedNodeIds?: string[];
}

/**
 * Parses size strings like "512MB", "1GB", "64kB", "4096" into bytes (BigInt).
 */
export function parseSizeBytes(sizeStr: string): bigint | null {
  if (!sizeStr || typeof sizeStr !== 'string') return null;
  const clean = sizeStr.trim().toUpperCase();
  const match = clean.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)?$/);
  if (!match) return null;

  const val = parseFloat(match[1]);
  if (isNaN(val) || val <= 0) return null;

  const unit = match[2] || 'B';
  let multiplier = 1n;
  switch (unit) {
    case 'KB':
      multiplier = 1024n;
      break;
    case 'MB':
      multiplier = 1024n * 1024n;
      break;
    case 'GB':
      multiplier = 1024n * 1024n * 1024n;
      break;
    case 'TB':
      multiplier = 1024n * 1024n * 1024n * 1024n;
      break;
    case 'B':
    default:
      multiplier = 1n;
      break;
  }

  try {
    return BigInt(Math.floor(val)) * multiplier;
  } catch {
    return null;
  }
}

/**
 * Parses start address string (e.g. "0x80000000" or "2147483648") into BigInt.
 */
export function parseAddressBigInt(addrStr: string): bigint | null {
  if (!addrStr || typeof addrStr !== 'string') return null;
  const clean = addrStr.trim();
  if (!clean) return null;

  try {
    if (clean.toLowerCase().startsWith('0x')) {
      return BigInt(clean);
    }
    return BigInt(clean);
  } catch {
    return null;
  }
}

/**
 * Formats BigInt byte address to Hex string (e.g., "0x80000000").
 */
export function formatAddressHex(val: bigint): string {
  return '0x' + val.toString(16).toUpperCase();
}

/**
 * Formats byte size into human readable string (e.g., "512MB", "1GB").
 */
export function formatSizeBytes(bytes: bigint): string {
  const kb = 1024n;
  const mb = 1024n * 1024n;
  const gb = 1024n * 1024n * 1024n;
  const tb = 1024n * 1024n * 1024n * 1024n;

  if (bytes % tb === 0n && bytes >= tb) return `${bytes / tb}TB`;
  if (bytes % gb === 0n && bytes >= gb) return `${bytes / gb}GB`;
  if (bytes % mb === 0n && bytes >= mb) return `${bytes / mb}MB`;
  if (bytes % kb === 0n && bytes >= kb) return `${bytes / kb}kB`;
  return `${bytes}B`;
}

/**
 * Helper to parse a node's memory range into structured BigInt interval [start, end).
 */
export function getNodeMemoryRange(nodeData: { addrRangeStart?: string; addrRangeSize?: string }): MemoryRangeParsed | null {
  if (!nodeData.addrRangeStart || !nodeData.addrRangeSize) return null;
  const start = parseAddressBigInt(nodeData.addrRangeStart);
  const size = parseSizeBytes(nodeData.addrRangeSize);

  if (start === null || size === null || size <= 0n) return null;

  const end = start + size;
  return {
    start,
    size,
    end,
    startHex: formatAddressHex(start),
    endHex: formatAddressHex(end),
    sizeFormatted: formatSizeBytes(size),
  };
}

/**
 * Comprehensive Sanity Checker for an NoCProject.
 * Returns array of warnings & errors.
 */
export function validateProjectSanity(project: NoCProject): SanityIssue[] {
  const issues: SanityIssue[] = [];

  // 1. Router ID Duplicity & Non-negative Checks
  const routerNodes = project.nodes.filter((n) => n.data.type === 'router');
  const routerIdMap = new Map<number, string[]>();

  routerNodes.forEach((node) => {
    const rId = node.data.routerId ?? 0;
    if (rId < 0) {
      issues.push({
        id: `err_router_id_neg_${node.id}`,
        type: 'error',
        code: 'INVALID_LATENCY',
        nodeId: node.id,
        title: 'Negative Router ID',
        message: `Router "${node.data.label}" has a negative Router ID (${rId}). Must be >= 0.`,
      });
    }

    if (!routerIdMap.has(rId)) {
      routerIdMap.set(rId, []);
    }
    routerIdMap.get(rId)!.push(node.id);
  });

  routerIdMap.forEach((nodeIds, rId) => {
    if (nodeIds.length > 1) {
      nodeIds.forEach((nodeId) => {
        const otherNodes = nodeIds.filter((id) => id !== nodeId);
        const node = project.nodes.find((n) => n.id === nodeId);
        issues.push({
          id: `err_router_dup_${rId}_${nodeId}`,
          type: 'error',
          code: 'DUPLICATE_ROUTER_ID',
          nodeId,
          relatedNodeIds: otherNodes,
          title: 'Duplicate Router ID',
          message: `Router "${node?.data.label || nodeId}" shares Router ID ${rId} with ${otherNodes.length} other router(s).`,
        });
      });
    }
  });

  // 2. Unconnected Endpoints Validation
  const endpointNodes = project.nodes.filter((n) => n.data.type !== 'router');
  endpointNodes.forEach((epNode) => {
    const isConnected = project.links.some(
      (link) => link.source === epNode.id || link.target === epNode.id
    );
    if (!isConnected) {
      issues.push({
        id: `warn_unconnected_${epNode.id}`,
        type: 'warning',
        code: 'UNCONNECTED_ENDPOINT',
        nodeId: epNode.id,
        title: 'Unconnected Endpoint',
        message: `Endpoint "${epNode.data.label}" is not connected to any router or link in the NoC topology.`,
      });
    }
  });

  // 2b. Router Backbone Island Detection (BFS Inter-Router Connectivity)
  if (routerNodes.length > 1) {
    const routerAdjacency = new Map<string, string[]>();
    routerNodes.forEach((r) => routerAdjacency.set(r.id, []));

    // Consider strictly inter-router links (IntLink)
    project.links.forEach((l) => {
      const srcIsRouter = routerNodes.some((r) => r.id === l.source);
      const dstIsRouter = routerNodes.some((r) => r.id === l.target);
      if (srcIsRouter && dstIsRouter) {
        routerAdjacency.get(l.source)!.push(l.target);
        routerAdjacency.get(l.target)!.push(l.source);
      }
    });

    const visitedRouters = new Set<string>();
    const routerComponents: string[][] = [];

    routerNodes.forEach((rNode) => {
      if (!visitedRouters.has(rNode.id)) {
        const comp: string[] = [];
        const queue = [rNode.id];
        visitedRouters.add(rNode.id);

        while (queue.length > 0) {
          const curr = queue.shift()!;
          comp.push(curr);
          const nbrs = routerAdjacency.get(curr) || [];
          nbrs.forEach((nbr) => {
            if (!visitedRouters.has(nbr)) {
              visitedRouters.add(nbr);
              queue.push(nbr);
            }
          });
        }

        routerComponents.push(comp);
      }
    });

    if (routerComponents.length > 1) {
      // Sort components by router count descending (component 0 is main router backbone)
      routerComponents.sort((a, b) => b.length - a.length);

      for (let cIdx = 1; cIdx < routerComponents.length; cIdx++) {
        const islandRouterIds = routerComponents[cIdx];

        islandRouterIds.forEach((rId) => {
          const rNode = project.nodes.find((n) => n.id === rId);
          issues.push({
            id: `warn_island_router_${rId}`,
            type: 'warning',
            code: 'DISCONNECTED_ISLAND',
            nodeId: rId,
            relatedNodeIds: islandRouterIds.filter((id) => id !== rId),
            title: 'Disconnected Router Island',
            message: `Router "${rNode?.data.label || rId}" belongs to an isolated Router backbone island (${islandRouterIds.length} router(s)) disconnected from main NoC.`,
          });

          // Propagate island warning to attached endpoints
          project.links.forEach((l) => {
            let attachedEpId: string | null = null;
            if (l.source === rId) attachedEpId = l.target;
            else if (l.target === rId) attachedEpId = l.source;

            if (attachedEpId) {
              const epNode = project.nodes.find((n) => n.id === attachedEpId && n.data.type !== 'router');
              if (epNode) {
                issues.push({
                  id: `warn_island_ep_${attachedEpId}`,
                  type: 'warning',
                  code: 'DISCONNECTED_ISLAND',
                  nodeId: attachedEpId,
                  title: 'Endpoint on Disconnected Island',
                  message: `Endpoint "${epNode.data.label}" is attached to isolated Router "${rNode?.data.label || rId}" which is disconnected from main NoC.`,
                });
              }
            }
          });
        });
      }
    }
  }

  // 3. Memory Region Validation & Overlap Detection
  const nodesWithMemory: Array<{
    nodeId: string;
    label: string;
    range: MemoryRangeParsed;
  }> = [];

  project.nodes.forEach((node) => {
    // Validate individual memory string fields if provided
    if (node.data.addrRangeStart) {
      const parsedStart = parseAddressBigInt(node.data.addrRangeStart);
      if (parsedStart === null) {
        issues.push({
          id: `err_invalid_start_${node.id}`,
          type: 'error',
          code: 'INVALID_MEMORY_START',
          nodeId: node.id,
          title: 'Invalid Memory Start Address',
          message: `Node "${node.data.label}" has invalid memory start address "${node.data.addrRangeStart}". Use hex (0x80000000) or integer.`,
        });
      }
    }

    if (node.data.addrRangeSize) {
      const parsedSize = parseSizeBytes(node.data.addrRangeSize);
      if (parsedSize === null) {
        issues.push({
          id: `err_invalid_size_${node.id}`,
          type: 'error',
          code: 'INVALID_MEMORY_SIZE',
          nodeId: node.id,
          title: 'Invalid Memory Size',
          message: `Node "${node.data.label}" has invalid memory size "${node.data.addrRangeSize}". Use formats like 512MB, 1GB, 2GB.`,
        });
      }
    }

    const range = getNodeMemoryRange(node.data);
    if (range) {
      nodesWithMemory.push({
        nodeId: node.id,
        label: node.data.label,
        range,
      });
    }
  });

  // Overlap Detection Engine across all memory-mapped nodes
  for (let i = 0; i < nodesWithMemory.length; i++) {
    for (let j = i + 1; j < nodesWithMemory.length; j++) {
      const itemA = nodesWithMemory[i];
      const itemB = nodesWithMemory[j];

      const rA = itemA.range;
      const rB = itemB.range;

      // Overlap condition: max(startA, startB) < min(endA, endB)
      const maxStart = rA.start > rB.start ? rA.start : rB.start;
      const minEnd = rA.end < rB.end ? rA.end : rB.end;

      if (maxStart < minEnd) {
        // Overlap detected!
        issues.push({
          id: `err_overlap_${itemA.nodeId}_${itemB.nodeId}`,
          type: 'error',
          code: 'MEMORY_OVERLAP',
          nodeId: itemA.nodeId,
          relatedNodeIds: [itemB.nodeId],
          title: 'Memory Address Conflict',
          message: `Memory range [${rA.startHex} - ${rA.endHex}] of "${itemA.label}" overlaps with [${rB.startHex} - ${rB.endHex}] of "${itemB.label}".`,
        });

        issues.push({
          id: `err_overlap_${itemB.nodeId}_${itemA.nodeId}`,
          type: 'error',
          code: 'MEMORY_OVERLAP',
          nodeId: itemB.nodeId,
          relatedNodeIds: [itemA.nodeId],
          title: 'Memory Address Conflict',
          message: `Memory range [${rB.startHex} - ${rB.endHex}] of "${itemB.label}" overlaps with [${rA.startHex} - ${rA.endHex}] of "${itemA.label}".`,
        });
      }
    }
  }

  // 4. Link Property Sanity Checks
  project.links.forEach((link) => {
    if (link.latency <= 0) {
      issues.push({
        id: `err_link_lat_${link.id}`,
        type: 'error',
        code: 'INVALID_LATENCY',
        linkId: link.id,
        title: 'Invalid Link Latency',
        message: `Link "${link.source} -> ${link.target}" has non-positive latency (${link.latency} cycles). Must be >= 1.`,
      });
    }

    if (link.bandwidth <= 0) {
      issues.push({
        id: `err_link_bw_${link.id}`,
        type: 'error',
        code: 'INVALID_BANDWIDTH',
        linkId: link.id,
        title: 'Invalid Link Bandwidth',
        message: `Link "${link.source} -> ${link.target}" has non-positive bandwidth (${link.bandwidth} bits/cycle).`,
      });
    }
  });

  return issues;
}

/**
 * Scans existing nodes in project to find the next available, non-overlapping memory base address.
 * Starts search at 0x80000000 (2GB mark).
 */
export function findNextFreeMemoryAddress(
  project: NoCProject,
  currentNodeId: string | null,
  requiredSizeBytes: bigint = 536870912n // Default 512MB
): string {
  const occupiedRanges: Array<{ start: bigint; end: bigint }> = [];

  project.nodes.forEach((n) => {
    if (n.id === currentNodeId) return;
    const r = getNodeMemoryRange(n.data);
    if (r) {
      occupiedRanges.push({ start: r.start, end: r.end });
    }
  });

  occupiedRanges.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));

  let candidateStart = 0x80000000n; // 2GB base

  for (const range of occupiedRanges) {
    const candidateEnd = candidateStart + requiredSizeBytes;
    if (candidateEnd <= range.start) {
      return formatAddressHex(candidateStart);
    }
    if (candidateStart < range.end) {
      candidateStart = range.end;
    }
  }

  return formatAddressHex(candidateStart);
}

/**
 * Automatically reassigns non-overlapping memory address ranges to all memory-mapped nodes.
 */
export function autoFixAllMemoryOverlaps(project: NoCProject): NoCProject {
  const memoryTypes = ['DRAM_DDR3', 'DRAM_DDR4', 'DRAM_HBM2', 'Directory', 'DMA', 'Cache_L2'];
  let currentStart = 0x80000000n;

  const updatedNodes = project.nodes.map((n) => {
    const isMemoryNode = n.data.type === 'endpoint' && memoryTypes.includes(n.data.gem5Component || '');
    const hasManualMemory = n.data.addrRangeStart || n.data.addrRangeSize;

    if (isMemoryNode || hasManualMemory) {
      const sizeBytes = parseSizeBytes(n.data.addrRangeSize || '512MB') || 536870912n;
      const newStartHex = formatAddressHex(currentStart);
      const newSizeStr = formatSizeBytes(sizeBytes);
      currentStart += sizeBytes;

      return {
        ...n,
        data: {
          ...n.data,
          addrRangeStart: newStartHex,
          addrRangeSize: newSizeStr,
        },
      };
    }
    return n;
  });

  return {
    ...project,
    nodes: updatedNodes,
  };
}
