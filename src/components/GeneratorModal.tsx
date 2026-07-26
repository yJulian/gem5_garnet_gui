import React, { useState } from 'react';
import { Gem5ComponentType } from '../types/noc';
import { Grid, Disc, X, Zap } from 'lucide-react';

interface GeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (type: 'mesh' | 'torus' | 'ring', options: { cols: number; rows: number; count: number; endpointType: Gem5ComponentType; attachEndpoints: boolean }) => void;
}

export const GeneratorModal: React.FC<GeneratorModalProps> = ({ isOpen, onClose, onGenerate }) => {
  const [topologyType, setTopologyType] = useState<'mesh' | 'torus' | 'ring'>('mesh');
  const [cols, setCols] = useState(4);
  const [rows, setRows] = useState(4);
  const [ringCount, setRingCount] = useState(8);
  const [attachEndpoints, setAttachEndpoints] = useState(true);
  const [endpointType, setEndpointType] = useState<Gem5ComponentType>('CPU_Timing');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(topologyType, {
      cols,
      rows,
      count: ringCount,
      endpointType,
      attachEndpoints,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-lg rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-100 text-lg">
            <Zap className="w-5 h-5 text-blue-400" />
            <span>Generate Topology Preset</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Topology Architecture Type */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
              Topology Architecture
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setTopologyType('mesh')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1.5 transition-all ${
                  topologyType === 'mesh'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-200 ring-1 ring-blue-500'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Grid className="w-5 h-5 text-blue-400" />
                <span className="font-semibold text-sm text-slate-200">Mesh (Grid)</span>
                <span className="text-[10px] text-slate-400">2D N x M Grid Layout</span>
              </button>

              <button
                type="button"
                onClick={() => setTopologyType('torus')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1.5 transition-all ${
                  topologyType === 'torus'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-200 ring-1 ring-blue-500'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Disc className="w-5 h-5 text-purple-400" />
                <span className="font-semibold text-sm text-slate-200">Torus</span>
                <span className="text-[10px] text-slate-400">N x M Wraparound Grid</span>
              </button>

              <button
                type="button"
                onClick={() => setTopologyType('ring')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1.5 transition-all ${
                  topologyType === 'ring'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-200 ring-1 ring-blue-500'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Disc className="w-5 h-5 text-emerald-400" />
                <span className="font-semibold text-sm text-slate-200">Ring</span>
                <span className="text-[10px] text-slate-400">Circular Ring Architecture</span>
              </button>
            </div>
          </div>

          {/* Dynamic Grid Parameters */}
          {topologyType === 'ring' ? (
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Number of Nodes (N)</label>
              <input
                type="number"
                min={3}
                max={64}
                value={ringCount}
                onChange={(e) => setRingCount(parseInt(e.target.value, 10))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Columns (N)</label>
                <input
                  type="number"
                  min={1}
                  max={16}
                  value={cols}
                  onChange={(e) => setCols(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Rows (M)</label>
                <input
                  type="number"
                  min={1}
                  max={16}
                  value={rows}
                  onChange={(e) => setRows(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                />
              </div>
            </div>
          )}

          {/* Attached gem5 Components */}
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Attach gem5 Endpoints to Routers</span>
              <input
                type="checkbox"
                checked={attachEndpoints}
                onChange={(e) => setAttachEndpoints(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-950"
              />
            </div>

            {attachEndpoints && (
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block font-medium">Default gem5 Component Type</label>
                <select
                  value={endpointType}
                  onChange={(e) => setEndpointType(e.target.value as Gem5ComponentType)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                >
                  <option value="CPU_Timing">TimingSimpleCPU (CPU Core)</option>
                  <option value="CPU_O3">DerivO3CPU (Out-of-Order Core)</option>
                  <option value="Cache_L1I">L1 Instruction Cache</option>
                  <option value="Cache_L1D">L1 Data Cache</option>
                  <option value="Cache_L2">L2 Unified Cache</option>
                  <option value="Directory">L3 Directory Controller</option>
                  <option value="DRAM_DDR3">DRAM Controller (DDR3_1600_8x8)</option>
                  <option value="DRAM_DDR4">DRAM Controller (SingleChannelDDR4_2400)</option>
                  <option value="DRAM_HBM2">HBM2 Memory Controller</option>
                </select>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium shadow-lg shadow-blue-500/20"
            >
              Generate Topology
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
