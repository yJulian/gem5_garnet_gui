import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Network, Cpu, Layers, Zap, Code, Database, Radio, Activity, AlertTriangle } from 'lucide-react';
import { NoCNodeData, Gem5ComponentType } from '../types/noc';

const getComponentIcon = (type?: Gem5ComponentType) => {
  switch (type) {
    case 'CPU_Timing':
    case 'CPU_O3':
      return <Cpu className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    case 'Cache_L1I':
    case 'Cache_L1D':
    case 'Cache_L2':
    case 'Directory':
      return <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />;
    case 'DRAM_DDR3':
    case 'DRAM_DDR4':
    case 'DRAM_HBM2':
      return <Database className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    case 'DMA':
      return <Radio className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    case 'Synthetic_Traffic':
      return <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
    case 'Custom_Accelerator':
    default:
      return <Zap className="w-4 h-4 text-pink-600 dark:text-pink-400" />;
  }
};

export const CustomNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as unknown as NoCNodeData & {
    nodeId?: string;
    onSelectNode?: (id: string) => void;
    isDimmed?: boolean;
    isValidTarget?: boolean;
    isShaking?: boolean;
    isBlocking?: boolean;
    hasSanityError?: boolean;
    hasSanityWarning?: boolean;
    hasIslandWarning?: boolean;
    sanityIssueTooltip?: string;
  };
  const isRouter = nodeData.type === 'router';
  const isTemplate = nodeData.type === 'template';
  const isDimmed = nodeData.isDimmed;
  const isValidTarget = nodeData.isValidTarget;
  const isShaking = nodeData.isShaking;
  const isBlocking = nodeData.isBlocking;
  const hasSanityError = nodeData.hasSanityError;
  const hasSanityWarning = nodeData.hasSanityWarning;
  const hasIslandWarning = nodeData.hasIslandWarning;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nodeData.onSelectNode) {
      nodeData.onSelectNode(id || nodeData.nodeId || '');
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`px-4 py-3 rounded-xl border transition-all duration-300 min-w-[160px] shadow-lg relative cursor-pointer select-none ${
        isShaking
          ? 'animate-shake ring-4 ring-rose-500 border-rose-500 shadow-2xl shadow-rose-500/60 z-30'
          : isBlocking
          ? 'ring-4 ring-amber-500 dark:ring-amber-400 border-amber-500 shadow-2xl shadow-amber-500/50 scale-105 animate-pulse z-30'
          : hasSanityError
          ? selected
            ? 'ring-4 ring-rose-500 ring-offset-2 ring-offset-slate-100 dark:ring-offset-slate-900 border-rose-500 shadow-xl shadow-rose-500/50 animate-pulse z-20'
            : 'ring-2 ring-rose-500 border-rose-500 shadow-xl shadow-rose-500/40 animate-pulse z-10'
          : hasSanityWarning
          ? selected
            ? 'ring-4 ring-amber-500 ring-offset-2 ring-offset-slate-100 dark:ring-offset-slate-900 border-amber-500 shadow-xl shadow-amber-500/40 animate-pulse z-20'
            : 'ring-2 ring-amber-500 border-amber-500 shadow-xl shadow-amber-500/30 animate-pulse z-10'
          : isDimmed
          ? 'opacity-30 grayscale blur-[0.3px] pointer-events-none scale-95 border-slate-300 dark:border-slate-800'
          : isValidTarget
          ? 'ring-2 ring-emerald-500 dark:ring-emerald-400 border-emerald-500 dark:border-emerald-400 shadow-xl shadow-emerald-500/30 scale-105 animate-pulse'
          : selected
          ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-100 dark:ring-offset-slate-900 border-blue-500 dark:border-blue-400 shadow-blue-500/30'
          : 'border-slate-300 dark:border-slate-700/60 hover:border-slate-400 dark:hover:border-slate-500'
      } ${
        isRouter
          ? 'bg-white dark:bg-slate-900/90 border-blue-400/60 dark:border-blue-500/40 text-slate-900 dark:text-blue-100'
          : isTemplate
          ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-400/60 dark:border-amber-500/50 text-amber-950 dark:text-amber-100'
          : 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-400/60 dark:border-emerald-500/40 text-emerald-950 dark:text-emerald-100'
      }`}
    >
      {/* Router Attached Endpoint Badge / Dot Indicator */}
      {isRouter && (nodeData.attachedEndpointCount ?? 0) > 0 && (
        <div
          className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/50 text-[10px] font-mono font-semibold flex items-center gap-1 shadow-md backdrop-blur-md z-20"
          title={`Attached Endpoints (${nodeData.attachedEndpointCount}): ${nodeData.attachedEndpointNames?.join(', ') || 'N/A'}`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <span>{nodeData.attachedEndpointCount}</span>
        </div>
      )}

      {/* Sanity Error / Warning Badge */}
      {(hasSanityError || hasSanityWarning) && (
        <div
          className={`absolute -top-2 -left-2 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold flex items-center gap-1 shadow-lg z-20 animate-bounce ${
            hasSanityError
              ? 'bg-rose-500 text-white border border-rose-300'
              : hasIslandWarning
              ? 'bg-purple-600 text-white border border-purple-300'
              : 'bg-amber-500 text-white border border-amber-300'
          }`}
          title={nodeData.sanityIssueTooltip || 'Sanity check alert'}
        >
          <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
          <span>{hasSanityError ? 'ERR' : hasIslandWarning ? 'ISLAND' : 'WARN'}</span>
        </div>
      )}

      {/* TOP HANDLE (Centered) */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ left: '50%' }}
        className="!w-3 !h-3 !bg-blue-600 dark:!bg-blue-400 !border-2 !border-white dark:!border-slate-900 hover:!scale-125 transition-transform z-10"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        style={{ left: '50%' }}
        className="!w-3 !h-3 !bg-blue-600 dark:!bg-blue-400 !border-2 !border-white dark:!border-slate-900 hover:!scale-125 transition-transform z-10"
      />

      {/* BOTTOM HANDLE (Centered) */}
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom"
        style={{ left: '50%' }}
        className="!w-3 !h-3 !bg-blue-600 dark:!bg-blue-400 !border-2 !border-white dark:!border-slate-900 hover:!scale-125 transition-transform z-10"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ left: '50%' }}
        className="!w-3 !h-3 !bg-blue-600 dark:!bg-blue-400 !border-2 !border-white dark:!border-slate-900 hover:!scale-125 transition-transform z-10"
      />

      {/* LEFT HANDLE (Centered) */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ top: '50%' }}
        className="!w-3 !h-3 !bg-blue-600 dark:!bg-blue-400 !border-2 !border-white dark:!border-slate-900 hover:!scale-125 transition-transform z-10"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        style={{ top: '50%' }}
        className="!w-3 !h-3 !bg-blue-600 dark:!bg-blue-400 !border-2 !border-white dark:!border-slate-900 hover:!scale-125 transition-transform z-10"
      />

      {/* RIGHT HANDLE (Centered) */}
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        style={{ top: '50%' }}
        className="!w-3 !h-3 !bg-blue-600 dark:!bg-blue-400 !border-2 !border-white dark:!border-slate-900 hover:!scale-125 transition-transform z-10"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ top: '50%' }}
        className="!w-3 !h-3 !bg-blue-600 dark:!bg-blue-400 !border-2 !border-white dark:!border-slate-900 hover:!scale-125 transition-transform z-10"
      />

      {/* Header Badge & Title */}
      <div className="flex items-center gap-2 mb-1">
        {isRouter ? (
          <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400">
            <Network className="w-4 h-4" />
          </div>
        ) : isTemplate ? (
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <Code className="w-4 h-4" />
          </div>
        ) : (
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            {getComponentIcon(nodeData.gem5Component)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate leading-snug text-slate-900 dark:text-slate-100">{nodeData.label}</div>
          <div className="text-[10px] text-slate-600 dark:text-slate-400 tracking-wide uppercase font-mono font-medium">
            {isRouter
              ? `Router ID: ${nodeData.routerId ?? 'N/A'}`
              : isTemplate
              ? 'Template Node'
              : nodeData.gem5Component || 'Endpoint'}
          </div>
        </div>
      </div>

      {/* Memory Range Pill Badge (if mapped) */}
      {nodeData.addrRangeStart && nodeData.addrRangeSize && (
        <div className="mt-1 px-1.5 py-0.5 rounded bg-purple-500/10 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-[10px] font-mono flex items-center gap-1 justify-between shadow-sm">
          <span>💾 {nodeData.addrRangeStart}</span>
          <span className="font-bold text-[9.5px]">{nodeData.addrRangeSize}</span>
        </div>
      )}

      {/* Latency / VC Metadata Pills */}
      <div className="mt-2 pt-1.5 border-t border-slate-200 dark:border-slate-700/50 flex items-center justify-between text-[11px] font-mono">
        {isRouter ? (
          <>
            <span className="text-slate-600 dark:text-slate-400 font-medium">Lat: {nodeData.latency || 1} cyc</span>
            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 font-semibold">Router</span>
          </>
        ) : isTemplate ? (
          <>
            <span className="text-amber-700 dark:text-amber-300 font-mono text-[10px] font-medium">Custom Class</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-semibold">Template</span>
          </>
        ) : (
          <>
            <span className="text-emerald-700 dark:text-emerald-300 font-medium">{nodeData.gem5Component?.split('_')[0] || 'gem5'}</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-semibold">Endpoint</span>
          </>
        )}
      </div>
    </div>
  );
});
