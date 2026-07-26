import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CustomNode } from './CustomNode';
import { NoCProject, NoCLinkData, NoCNodeData } from '../types/noc';
import { Zap } from 'lucide-react';

interface CanvasProps {
  project: NoCProject;
  onProjectChange: (updatedProject: NoCProject) => void;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onSelectEdge: (edgeId: string | null) => void;
  onRunForceLayout: () => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  project,
  onProjectChange,
  selectedNodeId,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge,
  onRunForceLayout,
}) => {
  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  // Convert project.nodes to ReactFlow Node array
  const initialNodes: Node[] = useMemo(() => {
    return project.nodes.map((n) => ({
      id: n.id,
      type: 'custom',
      position: n.position,
      data: n.data as unknown as Record<string, unknown>,
      selected: n.id === selectedNodeId,
    }));
  }, [project.nodes, selectedNodeId]);

  // Convert project.links to ReactFlow Edge array
  const initialEdges: Edge[] = useMemo(() => {
    return project.links.map((l) => ({
      id: l.id,
      source: l.source,
      target: l.target,
      label: `${l.bandwidth}b/c, ${l.latency}cyc`,
      animated: l.direction === 'bi',
      selected: l.id === selectedEdgeId,
      style: { stroke: l.direction === 'bi' ? '#3B82F6' : '#64748B', strokeWidth: 2.5 },
      labelStyle: { fill: '#94A3B8', fontSize: 10, fontWeight: 600 },
      labelBgStyle: { fill: '#0F172A', fillOpacity: 0.8, rx: 4, ry: 4 },
    }));
  }, [project.links, selectedEdgeId]);

  // Sync back node position updates to project state
  const handleNodeDragStop = useCallback(
    (_: any, node: Node) => {
      const updatedNodes = project.nodes.map((n) =>
        n.id === node.id ? { ...n, position: node.position } : n
      );
      onProjectChange({
        ...project,
        nodes: updatedNodes,
      });
    },
    [project, onProjectChange]
  );

  // Handle new connection creation
  const handleConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;

      const newLink: NoCLinkData = {
        id: `link_${params.source}_${params.target}_${Date.now()}`,
        source: params.source,
        target: params.target,
        latency: 1,
        bandwidth: 128,
        weight: 1,
        vcs: 4,
        direction: 'bi',
      };

      onProjectChange({
        ...project,
        links: [...project.links, newLink],
      });
    },
    [project, onProjectChange]
  );

  return (
    <div className="w-full h-full relative bg-dark-950">
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        nodeTypes={nodeTypes}
        onConnect={handleConnect}
        onNodeDragStop={handleNodeDragStop}
        onNodeClick={(_, node) => {
          onSelectNode(node.id);
          onSelectEdge(null);
        }}
        onEdgeClick={(_, edge) => {
          onSelectEdge(edge.id);
          onSelectNode(null);
        }}
        onPaneClick={() => {
          onSelectNode(null);
          onSelectEdge(null);
        }}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="#1E293B" />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as unknown as NoCNodeData;
            if (data.type === 'router') return '#3B82F6';
            if (data.type === 'template') return '#F59E0B';
            return '#10B981';
          }}
          maskColor="rgba(15, 23, 42, 0.7)"
        />

        {/* Force Directed Layout floating control panel */}
        <Panel position="top-left" className="m-4">
          <div className="glass-panel rounded-xl p-2.5 flex items-center gap-2 shadow-2xl border border-slate-800">
            <button
              onClick={onRunForceLayout}
              className="px-3 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 hover:text-white border border-blue-500/40 font-medium text-xs flex items-center gap-1.5 transition-all"
              title="Apply D3 Force-Directed Layout algorithm to arrange graph nodes"
            >
              <Zap className="w-3.5 h-3.5 text-blue-400 fill-blue-400/20" />
              Force Auto-Layout
            </button>
            <div className="h-4 w-px bg-slate-800" />
            <span className="text-[11px] text-slate-400 font-mono px-1">
              Nodes: {project.nodes.length} | Links: {project.links.length}
            </span>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};
