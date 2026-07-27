import React from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer, BaseEdge } from '@xyflow/react';

export const CustomEdge: React.FC<EdgeProps> = ({
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

  const edgeData = data as {
    onSelectEdge?: (id: string) => void;
    onSelectNode?: (id: string | null) => void;
    theme?: 'dark' | 'light';
  };

  const isLight = edgeData?.theme === 'light';

  const handleEdgeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.nativeEvent) {
      e.nativeEvent.stopImmediatePropagation();
      e.nativeEvent.stopPropagation();
    }
    if (edgeData?.onSelectEdge) {
      edgeData.onSelectEdge(id);
    }
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
          filter: selected
            ? 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.95))'
            : isLight
            ? 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))'
            : undefined,
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
