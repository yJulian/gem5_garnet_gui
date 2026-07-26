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
  
  // Custom metadata
  notes?: string;
  [key: string]: any;
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
  [key: string]: any;
}

export interface NoCProjectSettings {
  vnets: number;              // Number of virtual networks (default 3)
  buffersPerVC: number;       // Buffers per virtual channel (default 4)
  niSingleVnetBuffer: boolean;
  routingAlgorithm: 'table' | 'xy' | 'custom';
  clockDomain: string;        // e.g., "2GHz"
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
