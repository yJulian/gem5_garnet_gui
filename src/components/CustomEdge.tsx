import React, { memo } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer, BaseEdge } from '@xyflow/react';
import { CanvasCustomEdgeData } from '../types/noc';

const CustomEdgeComponent: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  selected,
  data,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = data as unknown as CanvasCustomEdgeData | undefined;
  const isLight = edgeData?.theme === 'light';

  const handleEdgeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <>
      {/* Invisible wider hit area (32px stroke) for easy clicking */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={32}
        className="cursor-pointer react-flow__edge-interaction"
        onClick={handleEdgeClick}
      />

      {/* Visible Edge Line */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          cursor: 'pointer',
          strokeWidth: selected ? 4.5 : 2.5,
          stroke: selected ? '#3B82F6' : style.stroke || (isLight ? '#2563EB' : '#3B82F6'),
        }}
      />

      {/* Interactive HTML Edge Label Badge */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan z-30"
          >
            <button
              type="button"
              onClick={handleEdgeClick}
              className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold shadow-lg transition-all border select-none cursor-pointer flex items-center gap-1.5 ${
                selected
                  ? 'bg-blue-600 text-white border-blue-400 ring-2 ring-blue-500/60 shadow-blue-500/40 scale-105'
                  : isLight
                  ? 'bg-white text-slate-800 border-slate-300 hover:border-blue-500 hover:text-blue-600 hover:scale-105 shadow-sm'
                  : 'bg-slate-900/95 text-slate-200 border-slate-700/80 hover:border-blue-400 hover:text-white hover:scale-105'
              }`}
            >
              {label}
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

function areEdgePropsEqual(prevProps: EdgeProps, nextProps: EdgeProps): boolean {
  if (
    prevProps.id !== nextProps.id ||
    prevProps.selected !== nextProps.selected ||
    prevProps.animated !== nextProps.animated ||
    prevProps.sourceX !== nextProps.sourceX ||
    prevProps.sourceY !== nextProps.sourceY ||
    prevProps.targetX !== nextProps.targetX ||
    prevProps.targetY !== nextProps.targetY ||
    prevProps.sourcePosition !== nextProps.sourcePosition ||
    prevProps.targetPosition !== nextProps.targetPosition ||
    prevProps.label !== nextProps.label ||
    prevProps.markerEnd !== nextProps.markerEnd
  ) {
    return false;
  }

  const prevData = prevProps.data as unknown as CanvasCustomEdgeData | undefined;
  const nextData = nextProps.data as unknown as CanvasCustomEdgeData | undefined;

  if (!prevData || !nextData) return prevData === nextData;

  return (
    prevData.theme === nextData.theme &&
    prevData.bandwidth === nextData.bandwidth &&
    prevData.latency === nextData.latency &&
    prevData.direction === nextData.direction
  );
}

export const CustomEdge = memo(CustomEdgeComponent, areEdgePropsEqual);

