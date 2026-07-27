import { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { Canvas } from './components/Canvas';
import { SettingsPanel } from './components/SettingsPanel';
import { GeneratorModal } from './components/GeneratorModal';
import { CodePreviewModal } from './components/CodePreviewModal';
import { NoCProject, NodeType, Gem5ComponentType, NoCLinkData, NoCNodeData } from './types/noc';
import { generateMeshTopology, generateTorusTopology, generateRingTopology } from './utils/topologyGenerators';
import { computeForceLayout } from './utils/forceLayout';
import { recalculateAutoHandles } from './utils/handleUtils';

// Default initial 4x4 Mesh Project
const createInitialProject = (): NoCProject => {
  const mesh = generateMeshTopology({
    cols: 4,
    rows: 4,
    attachEndpoints: true,
    endpointType: 'CPU_Timing',
  });

  return {
    id: `project_${Date.now()}`,
    name: 'Garnet_4x4_Mesh_System',
    description: '4x4 Mesh NoC topology generated for gem5 Garnet simulation',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    nodes: mesh.nodes,
    links: mesh.links,
    settings: {
      vnets: 3,
      buffersPerVC: 4,
      niSingleVnetBuffer: false,
      routingAlgorithm: 'table',
      clockDomain: '2GHz',
    },
    globalTemplates: [],
  };
};

// Load saved project from localStorage or create default 4x4 Mesh
const loadInitialProject = (): NoCProject => {
  try {
    const saved = localStorage.getItem('garnet_saved_project');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.links)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load project from localStorage:', e);
  }
  return createInitialProject();
};

export function App() {
  const [project, setProject] = useState<NoCProject>(loadInitialProject);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [shakingNodeId, setShakingNodeId] = useState<string | null>(null);
  const [blockingNodeIds, setBlockingNodeIds] = useState<string[]>([]);

  // Auto-save project state to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem('garnet_saved_project', JSON.stringify(project));
    } catch (e) {
      console.error('Failed to save project to localStorage:', e);
    }
  }, [project]);

  // Handle Chrome / MS Edge PWA LaunchQueue File Handler (.gnoc file association)
  useEffect(() => {
    const win = window as unknown as { launchQueue?: { setConsumer: (cb: (params: { files?: FileSystemFileHandle[] }) => void) => void }; LaunchParams?: { prototype: { files?: unknown } } };
    if ('launchQueue' in window && win.LaunchParams && 'files' in win.LaunchParams.prototype) {
      win.launchQueue?.setConsumer(async (launchParams) => {
        if (!launchParams.files || !launchParams.files.length) return;

        for (const fileHandle of launchParams.files) {
          try {
            const file = await fileHandle.getFile();
            const text = await file.text();
            const parsed = JSON.parse(text);

            if (parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.links)) {
              setProject(parsed);
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
            }
          } catch (err) {
            console.error('Failed to open .gnoc file from launchQueue:', err);
          }
        }
      });
    }
  }, []);

  // Theme State ('dark' | 'light')
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('garnet_theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('garnet_theme', next);
      return next;
    });
  };

  // Modals
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isCodePreviewOpen, setIsCodePreviewOpen] = useState(false);

  // Trigger D3 Force Auto-Layout physics simulation
  const handleRunForceLayout = useCallback(() => {
    const updatedPositions = computeForceLayout(project.nodes, project.links, 1000, 700);

    const updatedNodes = project.nodes.map((node) => {
      const pos = updatedPositions.get(node.id);
      return pos ? { ...node, position: pos } : node;
    });

    setProject((prev) => ({ ...prev, nodes: updatedNodes }));
  }, [project]);

  // Handle Quick Add Node
  const handleAddNode = (type: NodeType) => {
    const nextIndex = project.nodes.length + 1;
    const nodeId = `node_${Date.now()}`;
    const posX = 200 + Math.random() * 300;
    const posY = 150 + Math.random() * 250;

    const nodeData: NoCNodeData = {
      label: type === 'router' ? `Router ${nextIndex}` : type === 'template' ? `Custom Template ${nextIndex}` : `Endpoint ${nextIndex}`,
      type,
    };

    if (type === 'router') {
      const highestRouterId = Math.max(
        -1,
        ...project.nodes.filter((n) => n.data.type === 'router').map((n) => n.data.routerId ?? -1)
      );
      nodeData.routerId = highestRouterId + 1;
      nodeData.latency = 1;
    } else if (type === 'endpoint') {
      nodeData.gem5Component = 'CPU_Timing';
    } else if (type === 'template') {
      nodeData.templateClassCode = `class CustomNode_${nextIndex}(ClockedObject):\n    type = 'CustomNode_${nextIndex}'\n    processing_latency = Param.Cycles(2, "Latency")`;
      nodeData.templateInstantiationCode = `custom_inst_${nextIndex} = CustomNode_${nextIndex}()`;
    }

    const newNode = {
      id: nodeId,
      position: { x: posX, y: posY },
      data: nodeData,
    };

    setProject((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }));

    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
  };

  // Generate Topology Preset
  const handleGenerateTopology = (
    type: 'mesh' | 'torus' | 'ring',
    options: { cols: number; rows: number; count: number; endpointType: Gem5ComponentType; attachEndpoints: boolean }
  ) => {
    let result;
    if (type === 'mesh') {
      result = generateMeshTopology({
        cols: options.cols,
        rows: options.rows,
        attachEndpoints: options.attachEndpoints,
        endpointType: options.endpointType,
      });
    } else if (type === 'torus') {
      result = generateTorusTopology({
        cols: options.cols,
        rows: options.rows,
        attachEndpoints: options.attachEndpoints,
        endpointType: options.endpointType,
      });
    } else {
      result = generateRingTopology({
        nodeCount: options.count,
        attachEndpoints: options.attachEndpoints,
        endpointType: options.endpointType,
      });
    }

    setProject((prev) => ({
      ...prev,
      name: `Garnet_${type.toUpperCase()}_System`,
      nodes: result.nodes,
      links: result.links,
    }));

    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  };

  // Reset to empty canvas
  const handleNewProject = () => {
    if (window.confirm('Create a new blank canvas? Unsaved changes will be lost.')) {
      setProject({
        id: `project_${Date.now()}`,
        name: 'New_Garnet_NoC',
        description: 'Custom gem5 Garnet Network-on-Chip topology',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        nodes: [],
        links: [],
        settings: {
          vnets: 3,
          buffersPerVC: 4,
          niSingleVnetBuffer: false,
          routingAlgorithm: 'table',
          clockDomain: '2GHz',
        },
        globalTemplates: [],
      });
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
    }
  };

  // Smart Delete Node (Blocked + Shake Router & attached endpoints if attached; Full Mesh re-stitching if empty Router)
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const targetNode = project.nodes.find((n) => n.id === nodeId);
      if (!targetNode) return;

      if (targetNode.data.type === 'router') {
        const connectedLinks = project.links.filter((l) => l.source === nodeId || l.target === nodeId);
        const attachedEndpoints = connectedLinks.filter((l) => {
          const otherId = l.source === nodeId ? l.target : l.source;
          const otherNode = project.nodes.find((n) => n.id === otherId);
          return otherNode && otherNode.data.type !== 'router';
        });

        if (attachedEndpoints.length > 0) {
          // Block deletion: Router wiggles red (shakingNodeId), attached endpoints glow orange (blockingNodeIds)
          const attachedNodeIds = attachedEndpoints.map((l) => (l.source === nodeId ? l.target : l.source));
          setShakingNodeId(nodeId);
          setBlockingNodeIds(attachedNodeIds);
          setTimeout(() => {
            setShakingNodeId(null);
            setBlockingNodeIds([]);
          }, 600);
          return;
        }

        // Full Mesh re-stitching of neighboring routers
        const neighborRouters = connectedLinks
          .map((l) => (l.source === nodeId ? l.target : l.source))
          .filter((otherId) => {
            const otherNode = project.nodes.find((n) => n.id === otherId);
            return otherNode && otherNode.data.type === 'router';
          });

        const newMeshLinks: NoCLinkData[] = [];
        for (let i = 0; i < neighborRouters.length; i++) {
          for (let j = i + 1; j < neighborRouters.length; j++) {
            const r1 = neighborRouters[i];
            const r2 = neighborRouters[j];
            const exists = project.links.some(
              (l) => (l.source === r1 && l.target === r2) || (l.source === r2 && l.target === r1)
            );
            if (!exists) {
              newMeshLinks.push({
                id: `link_${r1}_${r2}_${Date.now()}_${i}_${j}`,
                source: r1,
                target: r2,
                latency: 1,
                bandwidth: 128,
                weight: 1,
                vcs: 4,
                direction: 'bi',
              });
            }
          }
        }

        const updatedNodes = project.nodes.filter((n) => n.id !== nodeId);
        const remainingLinks = project.links.filter((l) => l.source !== nodeId && l.target !== nodeId);
        const finalLinks = recalculateAutoHandles(updatedNodes, [...remainingLinks, ...newMeshLinks]);

        setProject((prev) => ({ ...prev, nodes: updatedNodes, links: finalLinks }));
        setSelectedNodeId(null);
      } else {
        // Endpoint or Template node -> simple delete node and connected links
        const updatedNodes = project.nodes.filter((n) => n.id !== nodeId);
        const remainingLinks = project.links.filter((l) => l.source !== nodeId && l.target !== nodeId);
        setProject((prev) => ({ ...prev, nodes: updatedNodes, links: remainingLinks }));
        setSelectedNodeId(null);
      }
    },
    [project]
  );

  // Delete Link
  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      const remainingLinks = project.links.filter((l) => l.id !== edgeId);
      setProject((prev) => ({ ...prev, links: remainingLinks }));
      setSelectedEdgeId(null);
    },
    [project]
  );

  // Global Keyboard Shortcut Listener for Entf / Delete / Backspace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) {
          e.preventDefault();
          handleDeleteNode(selectedNodeId);
        } else if (selectedEdgeId) {
          e.preventDefault();
          handleDeleteEdge(selectedEdgeId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedEdgeId, handleDeleteNode, handleDeleteEdge]);

  // Flow Animation Preference ('true' | 'false')
  const [animateFlow, setAnimateFlow] = useState<boolean>(() => {
    return localStorage.getItem('garnet_animate_flow') === 'true';
  });

  const handleToggleAnimateFlow = () => {
    setAnimateFlow((prev) => {
      const next = !prev;
      localStorage.setItem('garnet_animate_flow', String(next));
      return next;
    });
  };

  const isLight = theme === 'light';

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${isLight ? 'bg-slate-50 text-slate-900' : 'bg-dark-950 text-slate-100'}`}>
      {/* Top Header Toolbar */}
      <Header
        project={project}
        onProjectChange={setProject}
        onOpenGenerator={() => setIsGeneratorOpen(true)}
        onOpenCodePreview={() => setIsCodePreviewOpen(true)}
        onNewProject={handleNewProject}
        onSelectNode={setSelectedNodeId}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        animateFlow={animateFlow}
        onToggleAnimateFlow={handleToggleAnimateFlow}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Interactive Canvas */}
        <div className="flex-1 h-full">
          <Canvas
            project={project}
            onProjectChange={setProject}
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId}
            shakingNodeId={shakingNodeId}
            blockingNodeIds={blockingNodeIds}
            onSelectNode={(id) => {
              setSelectedNodeId(id);
              setSelectedEdgeId(null);
            }}
            onSelectEdge={(id) => {
              setSelectedEdgeId(id);
              setSelectedNodeId(null);
            }}
            onRunForceLayout={handleRunForceLayout}
            theme={theme}
            animateFlow={animateFlow}
          />
        </div>

        {/* Right Settings Inspector Panel */}
        <SettingsPanel
          project={project}
          onProjectChange={setProject}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          onSelectNode={setSelectedNodeId}
          onSelectEdge={setSelectedEdgeId}
          onAddNode={handleAddNode}
          onDeleteNode={handleDeleteNode}
          onDeleteEdge={handleDeleteEdge}
        />
      </div>

      {/* Modals */}
      <GeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        onGenerate={handleGenerateTopology}
      />

      <CodePreviewModal
        isOpen={isCodePreviewOpen}
        onClose={() => setIsCodePreviewOpen(false)}
        project={project}
      />
    </div>
  );
}

export default App;
