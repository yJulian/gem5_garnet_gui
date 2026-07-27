import { NoCLinkData } from '../types/noc';

export type HandleDirection = 'top' | 'right' | 'bottom' | 'left';

/**
 * Returns optimal source and target cardinal handles ('top' | 'right' | 'bottom' | 'left')
 * based on relative vector position (dx, dy) between source and target nodes.
 */
export function getOptimalHandleDirections(
  srcPos: { x: number; y: number },
  dstPos: { x: number; y: number }
): { sourceHandle: HandleDirection; targetHandle: HandleDirection } {
  const dx = dstPos.x - srcPos.x;
  const dy = dstPos.y - srcPos.y;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) {
      return { sourceHandle: 'right', targetHandle: 'left' };
    } else {
      return { sourceHandle: 'left', targetHandle: 'right' };
    }
  } else {
    if (dy > 0) {
      return { sourceHandle: 'bottom', targetHandle: 'top' };
    } else {
      return { sourceHandle: 'top', targetHandle: 'bottom' };
    }
  }
}

/**
 * Normalizes legacy handle IDs (e.g. "source-top", "target-left") to 4 cardinal directions ("top", "right", "bottom", "left").
 */
export function normalizeHandleId(handleId?: string): string | undefined {
  if (!handleId) return undefined;
  const clean = handleId.replace(/^(source-|target-)/, '');
  if (['top', 'right', 'bottom', 'left'].includes(clean)) {
    return clean;
  }
  return handleId;
}

/**
 * Recalculates link handle connections recursively for all automatic links (where isManualSource / isManualTarget is false).
 */
export function recalculateAutoHandles(
  nodes: Array<{ id: string; position: { x: number; y: number } }>,
  links: NoCLinkData[]
): NoCLinkData[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n.position]));

  return links.map((link) => {
    const srcPos = nodeMap.get(link.source);
    const dstPos = nodeMap.get(link.target);

    if (!srcPos || !dstPos) return link;

    const { sourceHandle: autoSrc, targetHandle: autoDst } = getOptimalHandleDirections(srcPos, dstPos);

    const normSrc = normalizeHandleId(link.sourceHandle);
    const normDst = normalizeHandleId(link.targetHandle);

    const finalSrc = link.isManualSource ? (normSrc || autoSrc) : autoSrc;
    const finalDst = link.isManualTarget ? (normDst || autoDst) : autoDst;

    if (
      finalSrc !== link.sourceHandle ||
      finalDst !== link.targetHandle ||
      normSrc !== link.sourceHandle ||
      normDst !== link.targetHandle
    ) {
      return {
        ...link,
        sourceHandle: finalSrc,
        targetHandle: finalDst,
      };
    }

    return link;
  });
}
