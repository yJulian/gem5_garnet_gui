export type NodeType = 'router' | 'endpoint' | 'template';

export type Gem5ComponentType =
  | 'CPU_Timing'
  | 'CPU_O3'
  | 'Cache_L1I'
  | 'Cache_L1D'
  | 'Cache_L2'
  | 'Directory'
  | 'DRAM_DDR3'
  | 'DRAM_DDR4'
  | 'DRAM_HBM2'
  | 'DMA'
  | 'Synthetic_Traffic'
  | 'Custom_Accelerator';

export interface NoCNodeData {
  label: string;
  type: NodeType;
  routerId?: number; // Unique router id (0, 1, 2...)
  latency?: number;  // Router processing latency in cycles
  gem5Component?: Gem5ComponentType;
  
  // Template Node specifics (Custom Types)
  templateName?: string;
  templateClassCode?: string; // Python definition placed at top of python config script
  templateInstantiationCode?: string; // Python instantiation code block
  
  // Memory Mapped Address Region
  addrRangeStart?: string; // e.g. "0x80000000"
  addrRangeSize?: string;  // e.g. "512MB", "1GB", "2GB"

  // Component Specific Customizations
  clock?: string;          // e.g. "2.5GHz", "3GHz" (Overrides global clockDomain if set)
  workloadCmd?: string;    // Custom per-node binary execution command/path

  // Cache & Controller Configurations
  cacheSize?: string;      // e.g. "32kB", "64kB", "256kB", "1MB", "2MB"
  cacheAssoc?: number;     // e.g. 2, 4, 8, 16
  l1iSize?: string;
  l1iAssoc?: number;
  l1dSize?: string;
  l1dAssoc?: number;

  // Synthetic Traffic Generator Specifics
  injectionRate?: number;  // Injection rate in packets/cycle (e.g. 0.1)
  trafficPattern?: 'uniform_random' | 'bit_complement' | 'tornado' | 'transpose';
  simCycles?: number;      // Number of simulation cycles (e.g. 1000000)

  // Attached endpoint metadata for Router nodes
  attachedEndpointCount?: number;
  attachedEndpointNames?: string[];
  
  // Interactive Force Graph Physics Metadata
  isPinned?: boolean;
  anchorX?: number;
  anchorY?: number;

  // Custom metadata
  notes?: string;
  [key: string]: unknown;
}

export interface CanvasCustomNodeData extends NoCNodeData {
  nodeId: string;
  isDimmed?: boolean;
  isValidTarget?: boolean;
  isShaking?: boolean;
  isBlocking?: boolean;
  hasSanityError?: boolean;
  hasSanityWarning?: boolean;
  hasIslandWarning?: boolean;
  sanityIssueTooltip?: string;
}

export interface CanvasCustomEdgeData {
  bandwidth: number;
  latency: number;
  direction: 'bi' | 'uni';
  theme?: 'dark' | 'light';
}


export interface NoCLinkData {
  id: string;
  source: string;
  target: string;
  latency: number;     // Link latency in cycles (default 1)
  bandwidth: number;   // Bandwidth in bits/cycle (default 128)
  weight: number;      // Routing weight (default 1)
  vcs: number;         // Virtual channels per vnet (default 4)
  direction: 'bi' | 'uni'; // Bidirectional vs Unidirectional
  srcPort?: string;    // e.g. "East", "West", "North", "South", "In", "Out"
  dstPort?: string;
  sourceHandle?: string; // ReactFlow handle ID (e.g. "top", "right", "bottom", "left")
  targetHandle?: string; // ReactFlow handle ID (e.g. "top", "right", "bottom", "left")
  isManualSource?: boolean;
  isManualTarget?: boolean;
  [key: string]: unknown;
}

export interface NoCProjectSettings {
  vnets: number;              // Number of virtual networks (default 3)
  buffersPerVC: number;       // Buffers per virtual channel (default 4)
  niSingleVnetBuffer: boolean;
  routingAlgorithm: 'table' | 'xy' | 'custom';
  clockDomain: string;        // e.g., "2GHz"
  binaryPath?: string;        // Global workload executable binary path
}

export interface GlobalTemplateDef {
  id: string;
  name: string;
  code: string;               // Top level Python helper code
  enabled: boolean;
}

export interface NoCProject {
  id: string;
  name: string;
  description: string;
  created: string;
  modified: string;
  nodes: Array<{
    id: string;
    position: { x: number; y: number };
    data: NoCNodeData;
  }>;
  links: NoCLinkData[];
  settings: NoCProjectSettings;
  globalTemplates: GlobalTemplateDef[];
}
