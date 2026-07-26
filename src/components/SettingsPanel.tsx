import React from 'react';
import { NoCProject, Gem5ComponentType, NoCNodeData, NoCLinkData, GlobalTemplateDef } from '../types/noc';
import { Settings, Cpu, Network, Code, Trash2, Plus, ArrowLeftRight } from 'lucide-react';

interface SettingsPanelProps {
  project: NoCProject;
  onProjectChange: (updated: NoCProject) => void;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onSelectNode: (id: string | null) => void;
  onSelectEdge: (id: string | null) => void;
  onAddNode: (type: 'router' | 'endpoint' | 'template') => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  project,
  onProjectChange,
  selectedNodeId,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge,
  onAddNode,
}) => {
  const selectedNode = project.nodes.find((n) => n.id === selectedNodeId);
  const selectedEdge = project.links.find((l) => l.id === selectedEdgeId);

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
    const updatedNodes = project.nodes.filter((n) => n.id !== selectedNodeId);
    const updatedLinks = project.links.filter((l) => l.source !== selectedNodeId && l.target !== selectedNodeId);
    onProjectChange({ ...project, nodes: updatedNodes, links: updatedLinks });
    onSelectNode(null);
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
    const updatedLinks = project.links.filter((l) => l.id !== selectedEdgeId);
    onProjectChange({ ...project, links: updatedLinks });
    onSelectEdge(null);
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
    <div className="w-80 border-l border-slate-800 bg-slate-900/90 glass-panel flex flex-col h-full overflow-y-auto">
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-200 font-semibold">
          <Settings className="w-4 h-4 text-blue-400" />
          <span>Properties & Settings</span>
        </div>
      </div>

      <div className="p-4 space-y-6 flex-1">
        {/* Quick Add Node Palette */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quick Add Component</div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onAddNode('router')}
              className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 text-blue-300 text-xs font-medium flex flex-col items-center gap-1 transition-all"
            >
              <Network className="w-4 h-4 text-blue-400" />
              + Router
            </button>
            <button
              onClick={() => onAddNode('endpoint')}
              className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-300 text-xs font-medium flex flex-col items-center gap-1 transition-all"
            >
              <Cpu className="w-4 h-4 text-emerald-400" />
              + Endpoint
            </button>
            <button
              onClick={() => onAddNode('template')}
              className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 text-xs font-medium flex flex-col items-center gap-1 transition-all"
            >
              <Code className="w-4 h-4 text-amber-400" />
              + Template
            </button>
          </div>
        </div>

        <hr className="border-slate-800" />

        {/* 1. NODE INSPECTOR */}
        {selectedNode ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Node Inspector</span>
              <button
                onClick={handleDeleteNode}
                className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors"
                title="Delete Node"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Label Input */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block font-medium">Node Label</label>
              <input
                type="text"
                value={selectedNode.data.label}
                onChange={(e) => handleUpdateNode('label', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Node Type Selector */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block font-medium">Node Type</label>
              <select
                value={selectedNode.data.type}
                onChange={(e) => handleUpdateNode('type', e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="router">Router (NoC Switch)</option>
                <option value="endpoint">gem5 Built-in Endpoint (CPU/Cache/DRAM)</option>
                <option value="template">Template Node (Custom C++/Python Class)</option>
              </select>
            </div>

            {/* Router Specific Settings */}
            {selectedNode.data.type === 'router' && (
              <div className="space-y-3 p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block font-medium">Router ID</label>
                  <input
                    type="number"
                    value={selectedNode.data.routerId ?? 0}
                    onChange={(e) => handleUpdateNode('routerId', parseInt(e.target.value, 10))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block font-medium">Router Switch Latency (Cycles)</label>
                  <input
                    type="number"
                    value={selectedNode.data.latency ?? 1}
                    onChange={(e) => handleUpdateNode('latency', parseInt(e.target.value, 10))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-sm text-slate-100"
                  />
                </div>
              </div>
            )}

            {/* Endpoint Specific Settings */}
            {selectedNode.data.type === 'endpoint' && (
              <div className="space-y-3 p-3 bg-emerald-950/20 rounded-lg border border-emerald-500/20">
                <div>
                  <label className="text-xs text-emerald-300 mb-1 block font-medium">gem5 Component Type</label>
                  <select
                    value={selectedNode.data.gem5Component || 'CPU_Timing'}
                    onChange={(e) => handleUpdateNode('gem5Component', e.target.value as Gem5ComponentType)}
                    className="w-full bg-slate-950 border border-emerald-500/40 rounded px-2.5 py-1.5 text-sm text-emerald-100 focus:outline-none"
                  >
                    <option value="CPU_Timing">TimingSimpleCPU (Timing Core)</option>
                    <option value="CPU_O3">DerivO3CPU (Out-of-Order Core)</option>
                    <option value="Cache_L1I">L1 Instruction Cache</option>
                    <option value="Cache_L1D">L1 Data Cache</option>
                    <option value="Cache_L2">L2 Unified Cache</option>
                    <option value="Directory">L3 Directory Controller</option>
                    <option value="DRAM_DDR3">DRAM Controller (DDR3_1600_8x8)</option>
                    <option value="DRAM_DDR4">DRAM Controller (SingleChannelDDR4_2400)</option>
                    <option value="DRAM_HBM2">HBM2 Memory Controller (HBM2_2000_4H_1x64)</option>
                    <option value="DMA">DMA Engine Controller</option>
                    <option value="Custom_Accelerator">Custom Accelerator Endpoint</option>
                  </select>
                </div>
              </div>
            )}

            {/* Template Specific Settings (Top Level Class Definition Generator) */}
            {selectedNode.data.type === 'template' && (
              <div className="space-y-3 p-3 bg-amber-950/20 rounded-lg border border-amber-500/30">
                <div className="flex items-center gap-1.5 text-amber-300 text-xs font-semibold">
                  <Code className="w-3.5 h-3.5" />
                  Custom Template Node Code
                </div>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  This code will be generated at the top of the gem5 python script under <code className="text-amber-300 font-mono"># --- CUSTOM TEMPLATE DEFINITIONS ---</code>.
                </p>

                <div>
                  <label className="text-xs text-amber-300/90 mb-1 block font-medium">Python Class Code Block</label>
                  <textarea
                    rows={4}
                    value={selectedNode.data.templateClassCode || ''}
                    placeholder={`class ${selectedNode.data.label.replace(/\s+/g, '')}(ClockedObject):\n    type = '${selectedNode.data.label.replace(/\s+/g, '')}'`}
                    onChange={(e) => handleUpdateNode('templateClassCode', e.target.value)}
                    className="w-full bg-slate-950 border border-amber-500/40 rounded p-2 text-xs font-mono text-amber-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-amber-300/90 mb-1 block font-medium">Instantiation Snippet</label>
                  <textarea
                    rows={2}
                    value={selectedNode.data.templateInstantiationCode || ''}
                    placeholder={`custom_node = ${selectedNode.data.label.replace(/\s+/g, '')}()`}
                    onChange={(e) => handleUpdateNode('templateInstantiationCode', e.target.value)}
                    className="w-full bg-slate-950 border border-amber-500/40 rounded p-2 text-xs font-mono text-amber-100 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        ) : selectedEdge ? (
          /* 2. LINK INSPECTOR */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Link Inspector</span>
              <button
                onClick={handleDeleteEdge}
                className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors"
                title="Delete Link"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 flex items-center justify-between">
              <span>{selectedEdge.source}</span>
              <ArrowLeftRight className="w-3.5 h-3.5 text-blue-400" />
              <span>{selectedEdge.target}</span>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block font-medium">Bandwidth (bits / cycle)</label>
              <input
                type="number"
                value={selectedEdge.bandwidth}
                onChange={(e) => handleUpdateEdge('bandwidth', parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block font-medium">Link Latency (Cycles)</label>
              <input
                type="number"
                value={selectedEdge.latency}
                onChange={(e) => handleUpdateEdge('latency', parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block font-medium">Routing Weight</label>
              <input
                type="number"
                value={selectedEdge.weight}
                onChange={(e) => handleUpdateEdge('weight', parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block font-medium">Link Directionality</label>
              <select
                value={selectedEdge.direction}
                onChange={(e) => handleUpdateEdge('direction', e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100"
              >
                <option value="bi">Bidirectional (Full-Duplex Dual Links)</option>
                <option value="uni">Unidirectional (Single Direction Link)</option>
              </select>
            </div>
          </div>
        ) : (
          /* 3. GLOBAL NOC CONFIG & TEMPLATES MANAGER */
          <div className="space-y-6">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">NoC Global Settings</div>
              <div className="space-y-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block font-medium">Virtual Channels / VNet</label>
                  <input
                    type="number"
                    value={project.settings.buffersPerVC}
                    onChange={(e) =>
                      onProjectChange({
                        ...project,
                        settings: { ...project.settings, buffersPerVC: parseInt(e.target.value, 10) },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-sm text-slate-100"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block font-medium">Routing Algorithm</label>
                  <select
                    value={project.settings.routingAlgorithm}
                    onChange={(e) =>
                      onProjectChange({
                        ...project,
                        settings: { ...project.settings, routingAlgorithm: e.target.value as any },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-sm text-slate-100"
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
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5" />
                  Top Custom Templates
                </div>
                <button
                  onClick={handleAddGlobalTemplate}
                  className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-1 transition-all"
                >
                  <Plus className="w-3 h-3" /> Add Template
                </button>
              </div>

              {project.globalTemplates.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-3 bg-slate-950/40 rounded border border-slate-800">
                  No top-level custom python templates created yet. Added templates appear at the top of generated Python configs.
                </p>
              ) : (
                <div className="space-y-3">
                  {project.globalTemplates.map((t) => (
                    <div key={t.id} className="p-3 bg-amber-950/20 rounded border border-amber-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={t.name}
                          onChange={(e) => handleUpdateGlobalTemplate(t.id, 'name', e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-amber-200 font-semibold"
                        />
                        <button
                          onClick={() => handleRemoveGlobalTemplate(t.id)}
                          className="text-rose-400 hover:text-rose-300 text-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <textarea
                        rows={3}
                        value={t.code}
                        onChange={(e) => handleUpdateGlobalTemplate(t.id, 'code', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono text-amber-100 focus:outline-none"
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
