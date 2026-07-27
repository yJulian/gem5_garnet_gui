import React, { useCallback, useMemo, useState, useEffect } from 'react';
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
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CustomNode } from './CustomNode';
import { NoCProject, NoCLinkData, NoCNodeData } from '../types/noc';
import { Zap, Magnet, Eye, EyeOff } from 'lucide-react';
import { computeGentleGravityDrag } from '../utils/forceLayout';
import { recalculateAutoHandles, normalizeHandleId } from '../utils/handleUtils';

interface CanvasProps {
  project: NoCProject;
  onProjectChange: (updatedProject: NoCProject) => void;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onSelectEdge: (edgeId: string | null) => void;
  onRunForceLayout: () => void;
  theme?: 'dark' | 'light';
}

export const Canvas: React.FC<CanvasProps> = ({
  project,
  onProjectChange,
  selectedNodeId,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge,
  onRunForceLayout,
  theme = 'dark',
}) => {
  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);
  const [gravityMode, setGravityMode] = useState<boolean>(true);
  const [hideEndpoints, setHideEndpoints] = useState<boolean>(false);

  // Calculate attached endpoints and endpoint names for each Router node
  const routerAttachmentMap = useMemo(() => {
    const map = new Map<string, { count: number; names: string[] }>();

    project.nodes.forEach((n) => {
      if (n.data.type === 'router') {
        const connectedLinks = project.links.filter((l) => l.source === n.id || l.target === n.id);
        const endpointNames: string[] = [];

        connectedLinks.forEach((l) => {
          const otherId = l.source === n.id ? l.target : l.source;
          const otherNode = project.nodes.find((other) => other.id === otherId);
          if (otherNode && otherNode.data.type !== 'router') {
            endpointNames.push(otherNode.data.label || otherNode.id);
          }
        });

        map.set(n.id, { count: endpointNames.length, names: endpointNames });
      }
    });

    return map;
  }, [project.nodes, project.links]);

  // Construct initial nodes array from project props
  const initialNodes: Node[] = useMemo(() => {
    return project.nodes.map((n) => {
      const attachment = routerAttachmentMap.get(n.id);
      return {
        id: n.id,
        type: 'custom',
        position: n.position,
        data: {
          ...n.data,
          attachedEndpointCount: attachment?.count || 0,
          attachedEndpointNames: attachment?.names || [],
          nodeId: n.id,
          onSelectNode,
        } as unknown as Record<string, unknown>,
        selected: n.id === selectedNodeId,
      };
    });
  }, [project.nodes, selectedNodeId, onSelectNode, routerAttachmentMap]);

  // Construct initial edges array from project props
  const initialEdges: Edge[] = useMemo(() => {
    // Ensure all automatic link handles are pre-calculated to cardinal positions
    const autoSnappedLinks = recalculateAutoHandles(project.nodes, project.links);

    return autoSnappedLinks.map((l) => {
      const isSelected = l.id === selectedEdgeId;
      const isLight = theme === 'light';

      return {
        id: l.id,
        source: l.source,
        target: l.target,
        sourceHandle: normalizeHandleId(l.sourceHandle),
        targetHandle: normalizeHandleId(l.targetHandle),
        label: `${l.bandwidth}b/c, ${l.latency}cyc`,
        animated: l.direction === 'bi',
        selected: isSelected,
        interactionWidth: 25,
        style: isSelected
          ? { stroke: '#3B82F6', strokeWidth: 4.5, filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.8))' }
          : {
              stroke: isLight ? (l.direction === 'bi' ? '#2563EB' : '#64748B') : (l.direction === 'bi' ? '#3B82F6' : '#64748B'),
              strokeWidth: 2.5,
            },
        labelStyle: {
          fill: isLight ? '#334155' : '#94A3B8',
          fontSize: 10,
          fontWeight: 600,
          fontFamily: 'monospace',
        },
        labelBgStyle: {
          fill: isLight ? '#FFFFFF' : '#0F172A',
          fillOpacity: 0.95,
          rx: 6,
          ry: 6,
          stroke: isSelected ? '#3B82F6' : isLight ? '#CBD5E1' : '#334155',
          strokeWidth: isSelected ? 1.5 : 1,
        },
      };
    });
  }, [project.nodes, project.links, selectedEdgeId, theme]);

  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  // Sync state when project or selection changes externally
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges]);

  // Handle all ReactFlow node changes
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    []
  );

  // Handle Home Assistant style spring trailing & physical collision pushing during active node drag
  const handleNodeDrag = useCallback(
    (_: unknown, draggedNode: Node) => {
      setNodes((currentNodes) => {
        const livePosArray = currentNodes.map((cn) => ({
          id: cn.id,
          position: cn.id === draggedNode.id ? draggedNode.position : cn.position,
        }));

        let updatedPositionsMap: Map<string, { x: number; y: number }>;

        if (gravityMode) {
          updatedPositionsMap = computeGentleGravityDrag(draggedNode.id, draggedNode.position, livePosArray, project.links);
        } else {
          updatedPositionsMap = new Map();
          livePosArray.forEach((n) => updatedPositionsMap.set(n.id, n.position));
        }

        const newNodesPosArray = currentNodes.map((cn) => ({
          id: cn.id,
          position: updatedPositionsMap.get(cn.id) || cn.position,
        }));

        // Recalculate automatic connection handles dynamically during drag
        const autoLinks = recalculateAutoHandles(newNodesPosArray, project.links);

        setEdges((currentEdges) =>
          currentEdges.map((e) => {
            const matchLink = autoLinks.find((l) => l.id === e.id);
            if (!matchLink) return e;
            return {
              ...e,
              sourceHandle: normalizeHandleId(matchLink.sourceHandle),
              targetHandle: normalizeHandleId(matchLink.targetHandle),
            };
          })
        );

        return currentNodes.map((cn) => {
          const newPos = updatedPositionsMap.get(cn.id);
          return newPos ? { ...cn, position: newPos } : cn;
        });
      });
    },
    [gravityMode, project.links]
  );

  // Commit final node positions & auto handles to project state when dragging stops
  const handleNodeDragStop = useCallback(
    (_: unknown, node: Node) => {
      const updatedProjectNodes = project.nodes.map((pn) => {
        const currentLocalNode = nodes.find((n) => n.id === pn.id);
        if (pn.id === node.id) {
          return { ...pn, position: node.position };
        } else if (currentLocalNode) {
          return { ...pn, position: currentLocalNode.position };
        }
        return pn;
      });

      const updatedProjectLinks = recalculateAutoHandles(updatedProjectNodes, project.links);

      onProjectChange({
        ...project,
        nodes: updatedProjectNodes,
        links: updatedProjectLinks,
      });
    },
    [nodes, project, onProjectChange]
  );

  // Handle all ReactFlow edge changes
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    []
  );

  // Enforce Garnet NoC connection rules: At least one node MUST be a Router!
  const isValidConnection = useCallback(
    (edgeOrConnection: Edge | Connection) => {
      if (!edgeOrConnection.source || !edgeOrConnection.target) return false;
      if (edgeOrConnection.source === edgeOrConnection.target) return false;

      const srcNode = project.nodes.find((n) => n.id === edgeOrConnection.source);
      const dstNode = project.nodes.find((n) => n.id === edgeOrConnection.target);

      if (!srcNode || !dstNode) return false;

      // Direct Endpoint-to-Endpoint or Template-to-Endpoint connections are invalid in gem5 Garnet NoC.
      const isSrcRouter = srcNode.data.type === 'router';
      const isDstRouter = dstNode.data.type === 'router';

      return isSrcRouter || isDstRouter;
    },
    [project.nodes]
  );

  // Filter visible nodes and edges based on hideEndpoints toggle
  const visibleNodes = useMemo(() => {
    if (!hideEndpoints) return nodes;
    const routerIds = new Set(project.nodes.filter((pn) => pn.data.type === 'router').map((pn) => pn.id));
    return nodes.filter((n) => routerIds.has(n.id));
  }, [nodes, hideEndpoints, project.nodes]);

  // Filter visible edges based on hideEndpoints toggle
  const visibleEdges = useMemo(() => {
    if (!hideEndpoints) return edges;
    const routerIds = new Set(project.nodes.filter((pn) => pn.data.type === 'router').map((pn) => pn.id));
    return edges.filter((e) => routerIds.has(e.source) && routerIds.has(e.target));
  }, [edges, hideEndpoints, project.nodes]);

  // Handle new connection creation preserving selected port handle IDs
  const handleConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;
      if (!isValidConnection(params)) return;

      const normSrc = normalizeHandleId(params.sourceHandle || undefined);
      const normDst = normalizeHandleId(params.targetHandle || undefined);

      const newLink: NoCLinkData = {
        id: `link_${params.source}_${params.target}_${Date.now()}`,
        source: params.source,
        target: params.target,
        sourceHandle: normSrc,
        targetHandle: normDst,
        isManualSource: !!normSrc,
        isManualTarget: !!normDst,
        latency: 1,
        bandwidth: 128,
        weight: 1,
        vcs: 4,
        direction: 'bi',
      };

      const updatedLinks = recalculateAutoHandles(project.nodes, [...project.links, newLink]);

      onProjectChange({
        ...project,
        links: updatedLinks,
      });
    },
    [project, onProjectChange, isValidConnection]
  );

  const isLight = theme === 'light';

  return (
    <div className={`w-full h-full relative ${isLight ? 'bg-slate-100' : 'bg-dark-950'}`}>
      <ReactFlow
        nodes={visibleNodes}
        edges={visibleEdges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        isValidConnection={isValidConnection}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onNodeClick={(event, node) => {
          event.stopPropagation();
          onSelectNode(node.id);
          onSelectEdge(null);
        }}
        onEdgeClick={(event, edge) => {
          event.stopPropagation();
          onSelectEdge(edge.id);
          onSelectNode(null);
        }}
        onPaneClick={() => {
          onSelectNode(null);
          onSelectEdge(null);
        }}
        elementsSelectable={true}
        nodesConnectable={true}
        nodesDraggable={true}
        snapToGrid={false}
        fitView
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color={isLight ? '#CBD5E1' : '#1E293B'}
        />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as unknown as NoCNodeData;
            if (data.type === 'router') return '#3B82F6';
            if (data.type === 'template') return '#F59E0B';
            return '#10B981';
          }}
          maskColor={isLight ? 'rgba(241, 245, 249, 0.7)' : 'rgba(15, 23, 42, 0.7)'}
        />

        {/* Force & Gravity Control Floating Panel */}
        <Panel position="top-left" className="m-4">
          <div className={`rounded-xl p-2.5 flex items-center gap-2 shadow-2xl border ${
            isLight
              ? 'bg-white/80 backdrop-blur-md border-slate-200 text-slate-800'
              : 'glass-panel border-slate-800 text-slate-100'
          }`}>
            <button
              onClick={onRunForceLayout}
              className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-600 dark:text-blue-300 font-medium text-xs flex items-center gap-1.5 border border-blue-500/30 transition-all"
              title="Apply D3 Force-Directed Layout algorithm to arrange graph nodes"
            >
              <Zap className="w-3.5 h-3.5 text-blue-500 fill-blue-500/20" />
              Force Auto-Layout
            </button>

            <button
              onClick={() => setGravityMode((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg border font-medium text-xs flex items-center gap-1.5 transition-all ${
                gravityMode
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40'
                  : isLight
                  ? 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Toggle continuous physical collision pushing during node dragging"
            >
              <Magnet className={`w-3.5 h-3.5 ${gravityMode ? 'text-amber-500 fill-amber-500/20' : 'text-slate-400'}`} />
              Push Physics: {gravityMode ? 'ON' : 'OFF'}
            </button>

            <button
              onClick={() => setHideEndpoints((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg border font-medium text-xs flex items-center gap-1.5 transition-all ${
                hideEndpoints
                  ? 'bg-purple-600/20 text-purple-600 dark:text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/20'
                  : isLight
                  ? 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Hide all Endpoints and Templates to inspect only the pure Router network topology layout"
            >
              {hideEndpoints ? (
                <EyeOff className="w-3.5 h-3.5 text-purple-500" />
              ) : (
                <Eye className="w-3.5 h-3.5 text-slate-400" />
              )}
              Router Only: {hideEndpoints ? 'ON' : 'OFF'}
            </button>

            <div className={`h-4 w-px ${isLight ? 'bg-slate-300' : 'bg-slate-800'}`} />
            <span className={`text-[11px] font-mono px-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Nodes: {project.nodes.length} | Links: {project.links.length}
            </span>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};
