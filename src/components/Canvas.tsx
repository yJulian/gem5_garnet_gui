import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  ControlButton,
  MiniMap,
  Node,
  Edge,
  Connection,
  BackgroundVariant,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  OnConnectStart,
  OnConnectEnd,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CustomNode } from './CustomNode';
import { CustomEdge } from './CustomEdge';
import { NoCProject, NoCLinkData, NoCNodeData } from '../types/noc';
import { Zap, Magnet, Eye, EyeOff, Unlock } from 'lucide-react';
import { recalculateAutoHandles, normalizeHandleId } from '../utils/handleUtils';
import { validateProjectSanity } from '../utils/validationUtils';
import { InteractiveForceEngine } from '../utils/interactiveForceEngine';

interface CanvasProps {
  project: NoCProject;
  onProjectChange: (updatedProject: NoCProject) => void;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  shakingNodeId?: string | null;
  blockingNodeIds?: string[];
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
  shakingNodeId,
  blockingNodeIds,
  onSelectNode,
  onSelectEdge,
  onRunForceLayout,
  theme = 'dark',
}) => {
  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);
  const edgeTypes = useMemo(() => ({ custom: CustomEdge }), []);
  const [gravityMode, setGravityMode] = useState<boolean>(true);
  const [hideEndpoints, setHideEndpoints] = useState<boolean>(false);

  // Connection handle drag state for dynamic invalid node dimming & valid target glowing
  const [connectingSourceNodeId, setConnectingSourceNodeId] = useState<string | null>(null);

  const handleConnectStart: OnConnectStart = useCallback((_, { nodeId }) => {
    if (nodeId) {
      setConnectingSourceNodeId(nodeId);
    }
  }, []);

  const handleConnectEnd: OnConnectEnd = useCallback(() => {
    setConnectingSourceNodeId(null);
  }, []);

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

  // Compute real-time project sanity issues
  const sanityIssues = useMemo(() => validateProjectSanity(project), [project]);

  // Construct initial nodes array with dynamic connection dimming & target leuchten
  const initialNodes: Node[] = useMemo(() => {
    const sourceNode = project.nodes.find((pn) => pn.id === connectingSourceNodeId);
    const isDraggingConnection = !!connectingSourceNodeId;
    const isSourceRouter = sourceNode?.data.type === 'router';

    return project.nodes.map((n) => {
      const attachment = routerAttachmentMap.get(n.id);

      const isSelf = n.id === connectingSourceNodeId;
      const isTargetRouter = n.data.type === 'router';
      const isValidTarget = isDraggingConnection && !isSelf && (isSourceRouter || isTargetRouter);
      const isDimmed = isDraggingConnection && !isValidTarget;
      const isShaking = n.id === shakingNodeId;
      const isBlocking = blockingNodeIds?.includes(n.id);

      const nodeIssues = sanityIssues.filter((i) => i.nodeId === n.id);
      const hasSanityError = nodeIssues.some((i) => i.type === 'error');
      const hasSanityWarning = nodeIssues.some((i) => i.type === 'warning');
      const sanityIssueTooltip = nodeIssues.map((i) => `${i.type.toUpperCase()}: ${i.title} - ${i.message}`).join('\n');

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
          isDimmed,
          isValidTarget,
          isShaking,
          isBlocking,
          hasSanityError,
          hasSanityWarning,
          sanityIssueTooltip,
        } as unknown as Record<string, unknown>,
        selected: n.id === selectedNodeId,
      };
    });
  }, [project.nodes, selectedNodeId, onSelectNode, routerAttachmentMap, connectingSourceNodeId, shakingNodeId, blockingNodeIds, sanityIssues]);

  // Construct initial edges array using CustomEdge renderer
  const initialEdges: Edge[] = useMemo(() => {
    // Ensure all automatic link handles are pre-calculated to cardinal positions
    const autoSnappedLinks = recalculateAutoHandles(project.nodes, project.links);

    return autoSnappedLinks.map((l) => {
      const isSelected = l.id === selectedEdgeId;
      const isLight = theme === 'light';

      return {
        id: l.id,
        type: 'custom',
        source: l.source,
        target: l.target,
        sourceHandle: normalizeHandleId(l.sourceHandle),
        targetHandle: normalizeHandleId(l.targetHandle),
        label: `${l.bandwidth}b/c, ${l.latency}cyc`,
        animated: l.direction === 'bi',
        selected: isSelected,
        interactionWidth: 32,
        data: {
          onSelectEdge,
          onSelectNode,
          theme,
          bandwidth: l.bandwidth,
          latency: l.latency,
          direction: l.direction,
        },
        style: isSelected
          ? { stroke: '#3B82F6', strokeWidth: 5, filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.95))', cursor: 'pointer' }
          : {
              stroke: isLight ? (l.direction === 'bi' ? '#2563EB' : '#64748B') : (l.direction === 'bi' ? '#3B82F6' : '#64748B'),
              strokeWidth: 2.5,
              cursor: 'pointer',
            },
      };
    });
  }, [project.nodes, project.links, selectedEdgeId, theme, onSelectEdge, onSelectNode]);

  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const forceEngineRef = useRef<InteractiveForceEngine | null>(null);

  // Initialize Interactive Force Engine and attach physics tick callback
  useEffect(() => {
    const engine = new InteractiveForceEngine((positions) => {
      setNodes((currentNodes) => {
        const updatedNodes = currentNodes.map((cn) => {
          const p = positions.get(cn.id);
          return p ? { ...cn, position: p } : cn;
        });

        const autoLinks = recalculateAutoHandles(
          updatedNodes.map((n) => ({ id: n.id, position: n.position })),
          project.links
        );

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

        return updatedNodes;
      });
    });

    forceEngineRef.current = engine;

    return () => {
      engine.stop();
    };
  }, [project.links]);

  // Synchronize nodes & links with physics simulation engine
  useEffect(() => {
    if (gravityMode && forceEngineRef.current) {
      forceEngineRef.current.syncNodes(project.nodes);
      forceEngineRef.current.setLinks(project.links);
    } else if (!gravityMode && forceEngineRef.current) {
      forceEngineRef.current.stop();
    }
  }, [project.nodes, project.links, gravityMode]);

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

  // Drag Start: Start dragging node in physics engine
  const handleNodeDragStart = useCallback(
    (_: unknown, node: Node) => {
      if (gravityMode && forceEngineRef.current) {
        forceEngineRef.current.startDrag(node.id);
      }
    },
    [gravityMode]
  );

  // Drag Move: Update active drag position in real time
  const handleNodeDrag = useCallback(
    (_: unknown, draggedNode: Node) => {
      if (gravityMode && forceEngineRef.current) {
        forceEngineRef.current.updateDragPos(draggedNode.id, draggedNode.position.x, draggedNode.position.y);
      } else {
        setNodes((currentNodes) =>
          currentNodes.map((cn) => (cn.id === draggedNode.id ? { ...cn, position: draggedNode.position } : cn))
        );
      }
    },
    [gravityMode]
  );

  // Drag Stop: Store drop coordinates as Soft Target Anchor (anchorX, anchorY) and commit
  const handleNodeDragStop = useCallback(
    (_: unknown, node: Node) => {
      if (gravityMode && forceEngineRef.current) {
        forceEngineRef.current.endDrag(node.id);
      }

      const updatedProjectNodes = project.nodes.map((pn) => {
        const currentLocalNode = nodes.find((n) => n.id === pn.id);
        if (pn.id === node.id) {
          return {
            ...pn,
            position: node.position,
            data: { ...pn.data, anchorX: node.position.x, anchorY: node.position.y },
          };
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
    [gravityMode, nodes, project, onProjectChange]
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
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onConnectStart={handleConnectStart}
        onConnectEnd={handleConnectEnd}
        isValidConnection={isValidConnection}
        onNodeDragStart={handleNodeDragStart}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onNodeDoubleClick={(event, node) => {
          event.stopPropagation();
          if (forceEngineRef.current) {
            forceEngineRef.current.clearAnchor(node.id);
          }
          const updatedProjectNodes = project.nodes.map((pn) =>
            pn.id === node.id ? { ...pn, data: { ...pn.data, anchorX: undefined, anchorY: undefined } } : pn
          );
          onProjectChange({ ...project, nodes: updatedProjectNodes });
        }}
        onNodeClick={(event, node) => {
          event.stopPropagation();
          onSelectNode(node.id);
          onSelectEdge(null);
        }}
        onEdgeClick={(event, edge) => {
          event.stopPropagation();
          onSelectEdge(edge.id);
        }}
        onPaneClick={(event) => {
          const target = event?.target as HTMLElement | SVGElement | null;
          if (
            target &&
            (target.closest('.react-flow__edge') ||
              target.closest('.react-flow__edgelabel-renderer') ||
              target.closest('.react-flow__node') ||
              target.closest('.nodrag'))
          ) {
            return;
          }
          onSelectNode(null);
          onSelectEdge(null);
        }}
        elementsSelectable={true}
        nodesConnectable={true}
        nodesDraggable={true}
        edgesFocusable={true}
        edgesReconnectable={false}
        snapToGrid={false}
        fitView
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color={isLight ? '#CBD5E1' : '#1E293B'}
        />
        <Controls position="bottom-left" className="react-flow__controls-grid">
          <ControlButton
            onClick={onRunForceLayout}
            title="Force Auto-Layout"
            aria-label="Force Auto-Layout"
          >
            <Zap className="w-3.5 h-3.5 text-blue-500 fill-blue-500/20" />
          </ControlButton>

          <ControlButton
            onClick={() => setGravityMode((prev) => !prev)}
            title={`Push Physics: ${gravityMode ? 'ON' : 'OFF'}`}
            aria-label="Toggle Push Physics"
            className={gravityMode ? '!bg-amber-500/20' : ''}
          >
            <Magnet className={`w-3.5 h-3.5 ${gravityMode ? 'text-amber-500 fill-amber-500/20' : 'text-slate-400'}`} />
          </ControlButton>

          <ControlButton
            onClick={() => {
              if (forceEngineRef.current) {
                forceEngineRef.current.clearAllAnchors();
              }
              const updatedProjectNodes = project.nodes.map((pn) => ({
                ...pn,
                data: { ...pn.data, anchorX: undefined, anchorY: undefined },
              }));
              onProjectChange({ ...project, nodes: updatedProjectNodes });
            }}
            title="Release All Anchors"
            aria-label="Release All Anchors"
          >
            <Unlock className="w-3.5 h-3.5 text-rose-500" />
          </ControlButton>

          <ControlButton
            onClick={() => setHideEndpoints((prev) => !prev)}
            title={`Router Only View: ${hideEndpoints ? 'ON' : 'OFF'}`}
            aria-label="Toggle Router Only View"
            className={hideEndpoints ? '!bg-purple-500/20' : ''}
          >
            {hideEndpoints ? (
              <EyeOff className="w-3.5 h-3.5 text-purple-500" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-slate-400" />
            )}
          </ControlButton>
        </Controls>

        <MiniMap
          nodeColor={(node) => {
            const data = node.data as unknown as NoCNodeData;
            if (data.type === 'router') return '#3B82F6';
            if (data.type === 'template') return '#F59E0B';
            return '#10B981';
          }}
          maskColor={isLight ? 'rgba(241, 245, 249, 0.7)' : 'rgba(15, 23, 42, 0.7)'}
        />
      </ReactFlow>
    </div>
  );
};
