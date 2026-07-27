# GEMINI.md - Agent Context & Guidelines

This document provides architectural context, development guidelines, and structural reference for AI coding agents working on the **gem5 Garnet NoC Visual Designer** repository.

---

## 📌 Project Overview

**gem5 Garnet NoC Visual Designer** is a modern React/TypeScript web application for visually constructing, parameterizing, and auto-generating Python configuration scripts for **gem5 Garnet 2.0 / 3.0 Network-on-Chip (NoC)** simulations.

- **Repository**: `gem5_noc` / `gem5_garnet_gui`
- **Primary Tech Stack**: React 18, TypeScript 5.6, Vite 5.4, Tailwind CSS 3.4
- **Key Libraries**: `@xyflow/react` (React Flow v12), `d3-force`, `lucide-react`

---

## 🏗️ Architecture & Project Structure

```
gem5_noc/
├── src/
│   ├── types/
│   │   └── noc.ts                  # Core domain model & TypeScript interfaces
│   ├── components/
│   │   ├── Canvas.tsx              # React Flow main graph view & interaction canvas
│   │   ├── CustomNode.tsx          # Custom node component rendering Routers, Endpoints, Templates
│   │   ├── Header.tsx              # Top navigation, toolbar actions, import/export controls
│   │   ├── SettingsPanel.tsx       # Inspector panel for node, link, and global project settings
│   │   ├── GeneratorModal.tsx      # Modal wizard for generating Mesh, Torus, Ring, Tree topologies
│   │   └── CodePreviewModal.tsx    # Live syntax-highlighted gem5 Python script viewer
│   ├── utils/
│   │   ├── pythonGenerator.ts      # Core engine for compiling NoCProject into gem5 Python code
│   │   ├── topologyGenerators.ts   # Algorithmic topology generation functions
│   │   ├── forceLayout.ts          # d3-force physics simulation for auto-arranging graph nodes
│   │   ├── handleUtils.ts          # Cardinal handle direction calculation & connection snapping
│   │   └── fileSystem.ts           # Native (.gnoc) JSON & (.py) file read/write operations
│   ├── App.tsx                     # Main layout shell & root state management
│   ├── main.tsx                    # React entry point
│   └── index.css                   # Global styles & Tailwind CSS configuration
├── package.json                    # Dependencies & build scripts
├── tsconfig.json                   # TypeScript configuration
└── vite.config.ts                  # Vite build configuration
```

---

## 🔑 Core Data Model (`src/types/noc.ts`)

- **`NoCProject`**: Complete representation of an NoC design (nodes, links, global settings, custom templates).
- **`NoCNodeData`**: Properties for an individual node:
  - `type`: `'router' | 'endpoint' | 'template'`
  - `gem5Component`: `'CPU_Timing' | 'CPU_O3' | 'Cache_L1I' | 'Cache_L1D' | 'Cache_L2' | 'Directory' | 'DRAM_DDR3' | 'DRAM_DDR4' | 'DRAM_HBM2' | 'DMA' | 'Custom_Accelerator'`
  - Custom template code snippets (`templateClassCode`, `templateInstantiationCode`).
- **`NoCLinkData`**: Link connection parameters:
  - `latency` (cycles), `bandwidth` (bits/cycle), `weight`, `vcs` (virtual channels), `direction` (`'bi' | 'uni'`).
  - Cardinal port handles (`sourceHandle`, `targetHandle`).
- **`NoCProjectSettings`**:
  - `vnets`, `buffersPerVC`, `routingAlgorithm` (`'table' | 'xy' | 'custom'`), `clockDomain`, `binaryPath`.

---

## ⚙️ Key Generators & Logic

### 1. gem5 Python Script Generator (`src/utils/pythonGenerator.ts`)
Generates valid Python configuration scripts for gem5. Key compilation phases:
1. **Header & Imports**: Imports `m5`, `m5.objects`, `BaseTopology`.
2. **Custom Templates**: Injects global and node-level custom Python/C++ gem5 object class definitions.
3. **Factory Helpers**: Generates reusable factory methods for component types instantiated multiple times.
4. **Topology Class Definition**: Subclasses `BaseTopology`, creates routers, internal links (`IntLink`), and external links (`ExtLink`).
5. **System & Execution Context**: Instantiates `System`, `RubySystem`, clock domains, workload executables, and `m5.instantiate()`.

### 2. Topology Generators (`src/utils/topologyGenerators.ts`)
Algorithms for constructing structured graph topologies:
- `generateMeshTopology`: Grid placement ($N \times M$) with automatic perimeter or 45-degree endpoint offsets.
- `generateTorusTopology`: Grid with wraparound links.
- `generateRingTopology`: Circular layout with angular positioning.
- `generateStarTopology`: Hub-and-spoke layout around central router.
- `generateTreeTopology`: Hierarchical switching tree layout.
- `generateFullyConnectedTopology`: Complete graph mesh.

### 3. Force-Directed Layout (`src/utils/forceLayout.ts`)
Uses `d3-force` (`forceSimulation`, `forceLink`, `forceManyBody`, `forceCenter`, `forceCollide`) to arrange unorganized or custom graphs dynamically.

---

## 🛠️ Instructions for AI Agents Working on This Repository

1. **Verification Requirement**:
   - Always run `npm run build` after modifying TypeScript files or React components to ensure there are no compilation or type errors.

2. **Preserve Native Schema Compatibility**:
   - Do not make breaking alterations to the `NoCProject` interface in `src/types/noc.ts` without ensuring backwards compatibility for `.gnoc` JSON file loading in `src/utils/fileSystem.ts`.

3. **Keep UI and Domain Model Synchronized**:
   - `App.tsx` maintains the source of truth for `project`. Changes made to nodes/edges via React Flow visual canvas MUST reflect in `project.nodes` and `project.links`.

4. **Python Script Output Quality**:
   - Ensure any changes to `pythonGenerator.ts` produce syntactically valid Python code compatible with gem5's `m5` module semantics.

---

## 🧪 Build & Lint Commands

```bash
# Run local development server
npm run dev

# Compile TypeScript & Build Production Bundle
npm run build

# Run ESLint check
npm run lint
```
