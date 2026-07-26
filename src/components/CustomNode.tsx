import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Network, Cpu, Layers, Zap, Code, Database, Radio } from 'lucide-react';
import { NoCNodeData, Gem5ComponentType } from '../types/noc';

const getComponentIcon = (type?: Gem5ComponentType) => {
  switch (type) {
    case 'CPU_Timing':
    case 'CPU_O3':
      return <Cpu className="w-4 h-4 text-emerald-400" />;
    case 'Cache_L1I':
    case 'Cache_L1D':
    case 'Cache_L2':
    case 'Directory':
      return <Layers className="w-4 h-4 text-cyan-400" />;
    case 'DRAM_DDR3':
    case 'DRAM_DDR4':
    case 'DRAM_HBM2':
      return <Database className="w-4 h-4 text-purple-400" />;
    case 'DMA':
      return <Radio className="w-4 h-4 text-amber-400" />;
    case 'Custom_Accelerator':
    default:
      return <Zap className="w-4 h-4 text-pink-400" />;
  }
};

export const CustomNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as NoCNodeData;
  const isRouter = nodeData.type === 'router';
  const isTemplate = nodeData.type === 'template';

  return (
    <div
      className={`px-4 py-3 rounded-xl border transition-all duration-200 min-w-[160px] shadow-lg ${
        selected
          ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900 border-blue-400 shadow-blue-500/20'
          : 'border-slate-700/60 hover:border-slate-500'
      } ${
        isRouter
          ? 'bg-slate-900/90 border-blue-500/40 text-blue-100'
          : isTemplate
          ? 'bg-amber-950/40 border-amber-500/50 text-amber-100'
          : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100'
      }`}
    >
      {/* Handles for interconnect wiring */}
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-blue-400 !border-2 !border-slate-900" />
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-blue-400 !border-2 !border-slate-900" />
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-blue-400 !border-2 !border-slate-900" />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-blue-400 !border-2 !border-slate-900" />

      {/* Header Badge & Title */}
      <div className="flex items-center gap-2 mb-1">
        {isRouter ? (
          <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
            <Network className="w-4 h-4" />
          </div>
        ) : isTemplate ? (
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
            <Code className="w-4 h-4" />
          </div>
        ) : (
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
            {getComponentIcon(nodeData.gem5Component)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate leading-snug">{nodeData.label}</div>
          <div className="text-[10px] text-slate-400 tracking-wide uppercase font-mono">
            {isRouter
              ? `Router ID: ${nodeData.routerId ?? 'N/A'}`
              : isTemplate
              ? 'Template Node'
              : nodeData.gem5Component || 'Endpoint'}
          </div>
        </div>
      </div>

      {/* Latency / VC Metadata Pills */}
      <div className="mt-2 pt-1.5 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-slate-300 font-mono">
        {isRouter ? (
          <>
            <span className="text-slate-400">Lat: {nodeData.latency || 1} cyc</span>
            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">Router</span>
          </>
        ) : isTemplate ? (
          <>
            <span className="text-amber-300 font-mono text-[10px]">Custom Class</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">Template</span>
          </>
        ) : (
          <>
            <span className="text-emerald-300">{nodeData.gem5Component?.split('_')[0] || 'gem5'}</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">Endpoint</span>
          </>
        )}
      </div>
    </div>
  );
});
