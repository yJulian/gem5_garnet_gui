import React from 'react';
import { NoCProject, NodeType, Gem5ComponentType, NoCNodeData, NoCLinkData, GlobalTemplateDef } from '../types/noc';
import { Settings, Cpu, Network, Code, Trash2, Plus, ArrowLeftRight, AlertTriangle, Wand2 } from 'lucide-react';
import { recalculateAutoHandles, normalizeHandleId } from '../utils/handleUtils';
import { validateProjectSanity, findNextFreeMemoryAddress, parseSizeBytes } from '../utils/validationUtils';

interface SettingsPanelProps {
  project: NoCProject;
  onProjectChange: (updated: NoCProject) => void;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onSelectNode: (id: string | null) => void;
  onSelectEdge: (id: string | null) => void;
  onAddNode: (type: 'router' | 'endpoint' | 'template') => void;
  onDeleteNode?: (id: string) => void;
  onDeleteEdge?: (id: string) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  project,
  onProjectChange,
  selectedNodeId,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge,
  onAddNode,
  onDeleteNode,
  onDeleteEdge,
}) => {
  const selectedNode = project.nodes.find((n) => n.id === selectedNodeId);
  const selectedEdge = project.links.find((l) => l.id === selectedEdgeId);

  const sanityIssues = validateProjectSanity(project);
  const selectedNodeIssues = selectedNodeId ? sanityIssues.filter((i) => i.nodeId === selectedNodeId) : [];

  // Update selected Node fields
  const handleUpdateNode = (field: keyof NoCNodeData, value: any) => {
    if (!selectedNodeId) return;
    const updatedNodes = project.nodes.map((node) => {
      if (node.id === selectedNodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            [field]: value,
          },
        };
      }
      return node;
    });
    onProjectChange({ ...project, nodes: updatedNodes });
  };

  // Delete Node
  const handleDeleteNode = () => {
    if (!selectedNodeId) return;
    if (onDeleteNode) {
      onDeleteNode(selectedNodeId);
    } else {
      const updatedNodes = project.nodes.filter((n) => n.id !== selectedNodeId);
      const updatedLinks = project.links.filter((l) => l.source !== selectedNodeId && l.target !== selectedNodeId);
      onProjectChange({ ...project, nodes: updatedNodes, links: updatedLinks });
      onSelectNode(null);
    }
  };

  // Update selected Edge fields
  const handleUpdateEdge = (field: keyof NoCLinkData, value: any) => {
    if (!selectedEdgeId) return;
    const updatedLinks = project.links.map((link) => {
      if (link.id === selectedEdgeId) {
        return { ...link, [field]: value };
      }
      return link;
    });
    onProjectChange({ ...project, links: updatedLinks });
  };

  // Delete Edge
  const handleDeleteEdge = () => {
    if (!selectedEdgeId) return;
    if (onDeleteEdge) {
      onDeleteEdge(selectedEdgeId);
    } else {
      const updatedLinks = project.links.filter((l) => l.id !== selectedEdgeId);
      onProjectChange({ ...project, links: updatedLinks });
      onSelectEdge(null);
    }
  };

  // Add Global Template
  const handleAddGlobalTemplate = () => {
    const newTemplate: GlobalTemplateDef = {
      id: `template_${Date.now()}`,
      name: `CustomClass_${project.globalTemplates.length + 1}`,
      code: `# Custom Python gem5 Class Definition\nclass CustomMemoryController(ClockedObject):\n    type = 'CustomMemoryController'\n    cxx_header = "mem/ruby/structures/CustomMemoryController.hh"\n    cxx_class = "gem5::ruby::CustomMemoryController"`,
      enabled: true,
    };
    onProjectChange({
      ...project,
      globalTemplates: [...project.globalTemplates, newTemplate],
    });
  };

  // Update Global Template
  const handleUpdateGlobalTemplate = (id: string, field: keyof GlobalTemplateDef, value: any) => {
    const updatedTemplates = project.globalTemplates.map((t) => (t.id === id ? { ...t, [field]: value } : t));
    onProjectChange({ ...project, globalTemplates: updatedTemplates });
  };

  // Remove Global Template
  const handleRemoveGlobalTemplate = (id: string) => {
    const updatedTemplates = project.globalTemplates.filter((t) => t.id !== id);
    onProjectChange({ ...project, globalTemplates: updatedTemplates });
  };

  return (
    <div className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 glass-panel flex flex-col h-full overflow-y-auto shadow-lg">
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
          <Settings className="w-4 h-4 text-blue-500 dark:text-blue-400" />
          <span>Properties & Settings</span>
        </div>
      </div>

      <div className="p-4 space-y-6 flex-1">
        {/* Quick Add Node Palette */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Quick Add Component</div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onAddNode('router')}
              className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-semibold flex flex-col items-center gap-1 transition-all"
            >
              <Network className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              + Router
            </button>
            <button
              onClick={() => onAddNode('endpoint')}
              className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex flex-col items-center gap-1 transition-all"
            >
              <Cpu className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              + Endpoint
            </button>
            <button
              onClick={() => onAddNode('template')}
              className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold flex flex-col items-center gap-1 transition-all"
            >
              <Code className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              + Template
            </button>
          </div>
        </div>

        <hr className="border-slate-200 dark:border-slate-800" />

        {/* 1. NODE INSPECTOR */}
        {selectedNode ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Node Inspector</span>
              <button
                onClick={handleDeleteNode}
                className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:text-rose-700 transition-colors"
                title="Delete Node"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Active Sanity Check Warnings for this Node */}
            {selectedNodeIssues.length > 0 && (
              <div className="space-y-2">
                {selectedNodeIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 shadow-sm ${
                      issue.type === 'error'
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-200'
                        : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-200'
                    }`}
                  >
                    <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${issue.type === 'error' ? 'text-rose-500' : 'text-amber-500'}`} />
                    <div>
                      <div className="font-semibold">{issue.title}</div>
                      <div className="text-[11px] opacity-90 leading-tight mt-0.5">{issue.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Label Input */}
            <div>
              <label className="text-xs text-slate-700 dark:text-slate-400 mb-1 block font-medium">Node Label</label>
              <input
                type="text"
                value={selectedNode.data.label}
                onChange={(e) => handleUpdateNode('label', e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Node Type Selector */}
            <div>
              <label className="text-xs text-slate-700 dark:text-slate-400 mb-1 block font-medium">Node Type</label>
              <select
                value={selectedNode.data.type}
                onChange={(e) => handleUpdateNode('type', e.target.value as NodeType)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="router">Router (NoC Switch)</option>
                <option value="endpoint">gem5 Built-in Endpoint (CPU/Cache/DRAM)</option>
                <option value="template">Template Node (Custom C++/Python Class)</option>
              </select>
            </div>

            {/* Router Specific Settings */}
            {selectedNode.data.type === 'router' && (
              <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="text-xs text-slate-700 dark:text-slate-400 mb-1 block font-medium">Router ID</label>
                  <input
                    type="number"
                    value={selectedNode.data.routerId ?? 0}
                    onChange={(e) => handleUpdateNode('routerId', parseInt(e.target.value, 10))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-700 dark:text-slate-400 mb-1 block font-medium">Router Switch Latency (Cycles)</label>
                  <input
                    type="number"
                    value={selectedNode.data.latency ?? 1}
                    onChange={(e) => handleUpdateNode('latency', parseInt(e.target.value, 10))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            )}

            {/* Endpoint Specific Settings */}
            {selectedNode.data.type === 'endpoint' && (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-500/20 space-y-3">
                  <div>
                    <label className="text-xs text-emerald-800 dark:text-emerald-300 mb-1 block font-medium">gem5 Component Type</label>
                    <select
                      value={selectedNode.data.gem5Component || 'CPU_Timing'}
                      onChange={(e) => handleUpdateNode('gem5Component', e.target.value as Gem5ComponentType)}
                      className="w-full bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-500/40 rounded px-2.5 py-1.5 text-sm text-emerald-900 dark:text-emerald-100 focus:outline-none"
                    >
                      <option value="CPU_Timing">Compute Tile (Timing CPU + L1 Cache + Sequencer)</option>
                      <option value="CPU_O3">Compute Tile (O3 CPU + L1 Cache + Sequencer)</option>
                      <option value="Cache_L1I">L1 Instruction Cache Tile Controller</option>
                      <option value="Cache_L1D">L1 Data Cache Tile Controller</option>
                      <option value="Cache_L2">Shared L2 Cache Bank Tile Controller</option>
                      <option value="Directory">Directory Controller Tile</option>
                      <option value="DRAM_DDR3">Directory & DRAM Tile (DDR3_1600_8x8)</option>
                      <option value="DRAM_DDR4">Directory & DRAM Tile (SingleChannelDDR4_2400)</option>
                      <option value="DRAM_HBM2">Directory & DRAM Tile (HBM2_2000_4H_1x64)</option>
                      <option value="DMA">DMA Controller Tile</option>
                      <option value="Synthetic_Traffic">Synthetic Traffic Benchmarking Generator Tile</option>
                      <option value="Custom_Accelerator">Custom Accelerator Tile</option>
                    </select>
                  </div>
                </div>

                {/* MEMORY MAPPING REGION CONTROLS (DRAM, Directory, Cache, DMA) */}
                {['DRAM_DDR3', 'DRAM_DDR4', 'DRAM_HBM2', 'Directory', 'DMA', 'Cache_L2'].includes(selectedNode.data.gem5Component || '') && (
                  <div className="p-3 bg-purple-50/80 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-500/30 space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-purple-900 dark:text-purple-300">
                      <span>Memory Region Mapping</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                        AddrRange
                      </span>
                    </div>

                    {/* Start Address */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-purple-950 dark:text-purple-200 font-medium">Start Base Address (Hex / Dec)</label>
                        <button
                          type="button"
                          onClick={() => {
                            const sizeBytes = parseSizeBytes(selectedNode.data.addrRangeSize || '512MB') || 536870912n;
                            const freeAddr = findNextFreeMemoryAddress(project, selectedNode.id, sizeBytes);
                            handleUpdateNode('addrRangeStart', freeAddr);
                            if (!selectedNode.data.addrRangeSize) {
                              handleUpdateNode('addrRangeSize', '512MB');
                            }
                          }}
                          className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30 hover:bg-purple-500/20 text-[10px] font-mono font-medium flex items-center gap-1 transition-all shadow-xs"
                          title="Automatically find and assign next free non-overlapping memory base address"
                        >
                          <Wand2 className="w-3 h-3 text-purple-500" />
                          Assign
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. 0x80000000"
                        value={selectedNode.data.addrRangeStart || ''}
                        onChange={(e) => handleUpdateNode('addrRangeStart', e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-purple-300 dark:border-purple-500/40 rounded px-2.5 py-1 text-xs font-mono text-slate-900 dark:text-purple-100 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    {/* Size */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-purple-950 dark:text-purple-200 font-medium">Memory Region Size</label>
                        {selectedNode.data.addrRangeStart && selectedNode.data.addrRangeSize && (
                          <span className="text-[10px] font-mono text-purple-600 dark:text-purple-300">
                            {selectedNode.data.addrRangeSize}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. 512MB, 1GB, 2GB"
                        value={selectedNode.data.addrRangeSize || ''}
                        onChange={(e) => handleUpdateNode('addrRangeSize', e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-purple-300 dark:border-purple-500/40 rounded px-2.5 py-1 text-xs font-mono text-slate-900 dark:text-purple-100 focus:outline-none focus:border-purple-500 mb-1.5"
                      />

                      {/* Presets */}
                      <div className="grid grid-cols-5 gap-1">
                        {['256MB', '512MB', '1GB', '2GB', '4GB'].map((preset) => (
                          <button
                            key={preset}
                            onClick={() => {
                              handleUpdateNode('addrRangeSize', preset);
                              if (!selectedNode.data.addrRangeStart) {
                                handleUpdateNode('addrRangeStart', '0x80000000');
                              }
                            }}
                            className={`py-0.5 rounded text-[10px] font-mono font-semibold border transition-all ${
                              selectedNode.data.addrRangeSize === preset
                                ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                : 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900 hover:border-purple-400'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* CPU SPECIFIC CONTROLS */}
                {['CPU_Timing', 'CPU_O3'].includes(selectedNode.data.gem5Component || '') && (
                  <div className="p-3 bg-blue-50/80 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-500/30 space-y-3">
                    <div className="text-xs font-semibold text-blue-900 dark:text-blue-300">CPU & Cache Configurations</div>

                    <div>
                      <label className="text-xs text-blue-950 dark:text-blue-200 mb-1 block font-medium">Clock Domain Override</label>
                      <input
                        type="text"
                        placeholder="Inherit global (e.g. 2.5GHz)"
                        value={selectedNode.data.clock || ''}
                        onChange={(e) => handleUpdateNode('clock', e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-blue-300 dark:border-blue-500/40 rounded px-2.5 py-1 text-xs font-mono text-slate-900 dark:text-blue-100"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-blue-900 dark:text-blue-300 mb-0.5 block font-medium">L1-I Cache</label>
                        <input
                          type="text"
                          placeholder="32kB"
                          value={selectedNode.data.l1iSize || ''}
                          onChange={(e) => handleUpdateNode('l1iSize', e.target.value)}
                          className="w-full bg-white dark:bg-slate-950 border border-blue-300 dark:border-blue-500/40 rounded px-2 py-1 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-blue-900 dark:text-blue-300 mb-0.5 block font-medium">L1-D Cache</label>
                        <input
                          type="text"
                          placeholder="64kB"
                          value={selectedNode.data.l1dSize || ''}
                          onChange={(e) => handleUpdateNode('l1dSize', e.target.value)}
                          className="w-full bg-white dark:bg-slate-950 border border-blue-300 dark:border-blue-500/40 rounded px-2 py-1 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-blue-950 dark:text-blue-200 mb-1 block font-medium">Custom Workload Executable Path</label>
                      <input
                        type="text"
                        placeholder="Overriding binary path..."
                        value={selectedNode.data.workloadCmd || ''}
                        onChange={(e) => handleUpdateNode('workloadCmd', e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-blue-300 dark:border-blue-500/40 rounded px-2.5 py-1 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* SYNTHETIC TRAFFIC GENERATOR CONTROLS */}
                {selectedNode.data.gem5Component === 'Synthetic_Traffic' && (
                  <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/20 rounded-lg border border-indigo-200 dark:border-indigo-500/30 space-y-3">
                    <div className="text-xs font-semibold text-indigo-900 dark:text-indigo-300">Synthetic Benchmarking Params</div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-indigo-950 dark:text-indigo-200 font-medium">Injection Rate (pkts / cycle)</label>
                        <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-300">
                          {selectedNode.data.injectionRate ?? 0.1}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.01"
                        max="1.0"
                        step="0.01"
                        value={selectedNode.data.injectionRate ?? 0.1}
                        onChange={(e) => handleUpdateNode('injectionRate', parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-indigo-200 dark:bg-indigo-900 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-indigo-950 dark:text-indigo-200 mb-1 block font-medium">Simulation Cycles</label>
                      <input
                        type="number"
                        value={selectedNode.data.simCycles ?? 1000000}
                        onChange={(e) => handleUpdateNode('simCycles', parseInt(e.target.value, 10))}
                        className="w-full bg-white dark:bg-slate-950 border border-indigo-300 dark:border-indigo-500/40 rounded px-2.5 py-1 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Template Specific Settings (Top Level Class Definition Generator) */}
            {selectedNode.data.type === 'template' && (
              <div className="space-y-3 p-3 bg-amber-50/80 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-500/30">
                <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                  <Code className="w-3.5 h-3.5" />
                  Custom Template Node Code
                </div>
                <p className="text-[11px] text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
                  This code will be generated at the top of the gem5 python script under <code className="text-amber-800 dark:text-amber-300 font-mono font-semibold"># --- CUSTOM TEMPLATE DEFINITIONS ---</code>.
                </p>

                <div>
                  <label className="text-xs text-amber-900 dark:text-amber-300/90 mb-1 block font-medium">Python Class Code Block</label>
                  <textarea
                    rows={4}
                    value={selectedNode.data.templateClassCode || ''}
                    placeholder={`class ${selectedNode.data.label.replace(/\s+/g, '')}(ClockedObject):\n    type = '${selectedNode.data.label.replace(/\s+/g, '')}'`}
                    onChange={(e) => handleUpdateNode('templateClassCode', e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-amber-300 dark:border-amber-500/40 rounded p-2 text-xs font-mono text-amber-950 dark:text-amber-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-amber-900 dark:text-amber-300/90 mb-1 block font-medium">Instantiation Snippet</label>
                  <textarea
                    rows={2}
                    value={selectedNode.data.templateInstantiationCode || ''}
                    placeholder={`custom_node = ${selectedNode.data.label.replace(/\s+/g, '')}()`}
                    onChange={(e) => handleUpdateNode('templateInstantiationCode', e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-amber-300 dark:border-amber-500/40 rounded p-2 text-xs font-mono text-amber-950 dark:text-amber-100 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        ) : selectedEdge ? (
          /* 2. LINK INSPECTOR */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-500 dark:text-blue-400 uppercase tracking-wider">Link Inspector</span>
              <button
                onClick={handleDeleteEdge}
                className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 hover:text-rose-400 transition-colors"
                title="Delete Link"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Connection Endpoints Badge */}
            <div className="p-2.5 rounded bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-300 flex items-center justify-between shadow-sm">
              <span>{selectedEdge.source}</span>
              <ArrowLeftRight className="w-3.5 h-3.5 text-blue-500" />
              <span>{selectedEdge.target}</span>
            </div>

            {/* Bandwidth */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">Bandwidth (bits / cycle)</label>
                <span className="text-[10px] font-mono font-semibold text-blue-600 dark:text-blue-400">{selectedEdge.bandwidth} b/c</span>
              </div>
              <input
                type="number"
                value={selectedEdge.bandwidth}
                onChange={(e) => handleUpdateEdge('bandwidth', parseInt(e.target.value, 10) || 128)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 mb-1.5"
              />
              <div className="grid grid-cols-4 gap-1.5">
                {[64, 128, 256, 512].map((bw) => (
                  <button
                    key={bw}
                    onClick={() => handleUpdateEdge('bandwidth', bw)}
                    className={`py-1 rounded text-[10px] font-mono font-semibold border transition-all ${
                      selectedEdge.bandwidth === bw
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:border-blue-400'
                    }`}
                  >
                    {bw} b/c
                  </button>
                ))}
              </div>
            </div>

            {/* Latency */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">Link Latency (Cycles)</label>
                <span className="text-[10px] font-mono font-semibold text-blue-600 dark:text-blue-400">{selectedEdge.latency} cyc</span>
              </div>
              <input
                type="number"
                value={selectedEdge.latency}
                onChange={(e) => handleUpdateEdge('latency', parseInt(e.target.value, 10) || 1)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 mb-1.5"
              />
              <div className="grid grid-cols-3 gap-1.5">
                {[1, 2, 4].map((lat) => (
                  <button
                    key={lat}
                    onClick={() => handleUpdateEdge('latency', lat)}
                    className={`py-1 rounded text-[10px] font-mono font-semibold border transition-all ${
                      selectedEdge.latency === lat
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:border-blue-400'
                    }`}
                  >
                    {lat} cyc
                  </button>
                ))}
              </div>
            </div>

            {/* Routing Weight */}
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block font-medium">Routing Weight</label>
              <input
                type="number"
                value={selectedEdge.weight}
                onChange={(e) => handleUpdateEdge('weight', parseInt(e.target.value, 10) || 1)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Virtual Channels */}
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block font-medium">Virtual Channels (VCs / VNet)</label>
              <input
                type="number"
                value={selectedEdge.vcs || 4}
                onChange={(e) => handleUpdateEdge('vcs', parseInt(e.target.value, 10) || 4)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Link Directionality */}
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block font-medium">Link Directionality</label>
              <select
                value={selectedEdge.direction}
                onChange={(e) => handleUpdateEdge('direction', e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="bi">Bidirectional (Full-Duplex Dual Links)</option>
                <option value="uni">Unidirectional (Single Direction Link)</option>
              </select>
            </div>

            {/* Handle Connection Points (Auto Snapping vs Manual) */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-blue-500 dark:text-blue-400">Connection Handles (Snapping)</div>

              {/* Source Handle */}
              <div className="p-2.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                  <span>Source ({selectedEdge.source})</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    selectedEdge.isManualSource
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20'
                  }`}>
                    {selectedEdge.isManualSource ? 'Manual' : 'Auto'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={normalizeHandleId(selectedEdge.sourceHandle) || 'right'}
                    onChange={(e) => {
                      const updatedLinks = project.links.map((l) =>
                        l.id === selectedEdgeId ? { ...l, sourceHandle: e.target.value, isManualSource: true } : l
                      );
                      onProjectChange({ ...project, links: updatedLinks });
                    }}
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-800 dark:text-slate-200"
                  >
                    <option value="top">Top Handle</option>
                    <option value="right">Right Handle</option>
                    <option value="bottom">Bottom Handle</option>
                    <option value="left">Left Handle</option>
                  </select>

                  {selectedEdge.isManualSource && (
                    <button
                      onClick={() => {
                        const updatedLinks = project.links.map((l) =>
                          l.id === selectedEdgeId ? { ...l, isManualSource: false } : l
                        );
                        onProjectChange({ ...project, links: recalculateAutoHandles(project.nodes, updatedLinks) });
                      }}
                      className="px-2 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-300 hover:bg-blue-500/20 border border-blue-500/30 text-[11px] font-medium"
                      title="Reset Source handle to Auto-Snapping mode"
                    >
                      Reset Auto
                    </button>
                  )}
                </div>
              </div>

              {/* Target Handle */}
              <div className="p-2.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                  <span>Target ({selectedEdge.target})</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    selectedEdge.isManualTarget
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20'
                  }`}>
                    {selectedEdge.isManualTarget ? 'Manual' : 'Auto'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={normalizeHandleId(selectedEdge.targetHandle) || 'left'}
                    onChange={(e) => {
                      const updatedLinks = project.links.map((l) =>
                        l.id === selectedEdgeId ? { ...l, targetHandle: e.target.value, isManualTarget: true } : l
                      );
                      onProjectChange({ ...project, links: updatedLinks });
                    }}
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-800 dark:text-slate-200"
                  >
                    <option value="top">Top Handle</option>
                    <option value="right">Right Handle</option>
                    <option value="bottom">Bottom Handle</option>
                    <option value="left">Left Handle</option>
                  </select>

                  {selectedEdge.isManualTarget && (
                    <button
                      onClick={() => {
                        const updatedLinks = project.links.map((l) =>
                          l.id === selectedEdgeId ? { ...l, isManualTarget: false } : l
                        );
                        onProjectChange({ ...project, links: recalculateAutoHandles(project.nodes, updatedLinks) });
                      }}
                      className="px-2 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-300 hover:bg-blue-500/20 border border-blue-500/30 text-[11px] font-medium"
                      title="Reset Target handle to Auto-Snapping mode"
                    >
                      Reset Auto
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* 3. GLOBAL NOC CONFIG & TEMPLATES MANAGER */
          <div className="space-y-6">
            <div>
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">NoC Global Settings</div>
              <div className="space-y-3 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="text-xs text-slate-700 dark:text-slate-400 mb-1 block font-medium">Workload Binary Path</label>
                  <input
                    type="text"
                    placeholder="/path/to/executable_binary"
                    value={project.settings.binaryPath || ''}
                    onChange={(e) =>
                      onProjectChange({
                        ...project,
                        settings: { ...project.settings, binaryPath: e.target.value },
                      })
                    }
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-700 dark:text-slate-400 mb-1 block font-medium">Virtual Channels / VNet</label>
                  <input
                    type="number"
                    value={project.settings.buffersPerVC}
                    onChange={(e) =>
                      onProjectChange({
                        ...project,
                        settings: { ...project.settings, buffersPerVC: parseInt(e.target.value, 10) },
                      })
                    }
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-700 dark:text-slate-400 mb-1 block font-medium">Routing Algorithm</label>
                  <select
                    value={project.settings.routingAlgorithm}
                    onChange={(e) =>
                      onProjectChange({
                        ...project,
                        settings: { ...project.settings, routingAlgorithm: e.target.value as any },
                      })
                    }
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-sm text-slate-900 dark:text-slate-100"
                  >
                    <option value="table">Table-based Shortest Path Routing (0)</option>
                    <option value="xy">XY Dimension Order Routing (1)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Global Custom Python Templates */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5" />
                  Top Custom Templates
                </div>
                <button
                  onClick={handleAddGlobalTemplate}
                  className="px-2 py-1 rounded bg-amber-500/10 dark:bg-amber-500/20 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-medium flex items-center gap-1 transition-all"
                >
                  <Plus className="w-3 h-3" /> Add Template
                </button>
              </div>

              {project.globalTemplates.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-3 bg-slate-50 dark:bg-slate-950/40 rounded border border-slate-200 dark:border-slate-800">
                  No top-level custom python templates created yet. Added templates appear at the top of generated Python configs.
                </p>
              ) : (
                <div className="space-y-3">
                  {project.globalTemplates.map((t) => (
                    <div key={t.id} className="p-3 bg-amber-50/80 dark:bg-amber-950/20 rounded border border-amber-200 dark:border-amber-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={t.name}
                          onChange={(e) => handleUpdateGlobalTemplate(t.id, 'name', e.target.value)}
                          className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-0.5 text-xs text-amber-900 dark:text-amber-200 font-semibold"
                        />
                        <button
                          onClick={() => handleRemoveGlobalTemplate(t.id)}
                          className="text-rose-500 hover:text-rose-600 dark:text-rose-400 text-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <textarea
                        rows={3}
                        value={t.code}
                        onChange={(e) => handleUpdateGlobalTemplate(t.id, 'code', e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-amber-300 dark:border-slate-800 rounded p-2 text-xs font-mono text-amber-950 dark:text-amber-100 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
