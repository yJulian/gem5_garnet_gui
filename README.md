# gem5 Garnet NoC Visual Designer

An advanced, interactive visual editor and topology generator for **gem5 Garnet 2.0 / 3.0 Network-on-Chip (NoC)** simulations. Built with **React 18**, **TypeScript**, **Vite**, **Tailwind CSS**, and **React Flow (@xyflow/react)**.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.3-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6.svg)
![Vite](https://img.shields.io/badge/Vite-5.4-646cff.svg)
![gem5](https://img.shields.io/badge/gem5-Garnet_NoC-orange.svg)

---

## 🌟 Overview

Designing Network-on-Chip (NoC) topologies for gem5 Garnet simulations manually in Python scripts can be tedious and prone to connection syntax errors. **gem5 Garnet NoC Visual Designer** simplifies this process by offering a high-performance visual canvas to design, arrange, configure, and validate complex NoC architectures.

With real-time graph visualization, automated topology generation, physics-based force layouts, and custom gem5 template support, the application generates clean, fully-executable **gem5 Python configuration scripts** ready for direct execution in the gem5 simulator.

---

## ✨ Key Features

- 🎨 **Interactive Visual Canvas**: Drag-and-drop nodes, connect routers and endpoints, adjust cardinal ports (North, South, East, West, In, Out), and edit properties in real time.
- ⚡ **Parametric Topology Generators**: Instantly generate standard and complex topologies:
  - **Mesh (Grid)** ($N \times M$) with perimeter or aligned endpoint attachments
  - **Torus** ($N \times M$) with wraparound links
  - **Ring** (1D circular topology)
  - **Star** (Central router connected to $N$ satellite endpoints/routers)
  - **Tree / Fat-Tree** (Multi-level hierarchical switching network)
  - **Fully-Connected** (All-to-all interconnection)
- 🌌 **Force-Directed Layout Engine**: Built-in `d3-force` physics engine for automatic graph auto-arrangements and node positioning.
- 🐍 **gem5 Python Script Generator**: Automatically builds Python topology configuration files (`m5.objects` / `BaseTopology`) with:
  - Component factory helpers for scalable instances
  - Inline instantiation for unique components
  - Custom C++/Python class definitions & template injection
  - Configurable Virtual Networks (VNETs), VC buffers, clock domains, routing algorithms (`table`, `xy`, `custom`), and link parameters (bandwidth, latency, weight).
- 🧩 **Rich Component Types**:
  - **Routers**: Custom latencies, router IDs, and virtual channels.
  - **Endpoints**: CPU Timing/O3, Cache (L1I, L1D, L2), Directory, DRAM (DDR3, DDR4, HBM2), DMA, and Custom Accelerators.
  - **Custom Templates**: Define node-level or global custom Python/C++ gem5 objects.
- 💾 **Native `.gnoc` Project Storage**: Save and load complete project states in native JSON (`.gnoc`) format.
- 🔍 **Live Code Preview & Export**: Inspect generated Python configuration code with syntax highlighting, copy to clipboard, or download directly.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yJulian/gem5_garnet_gui.git
   cd gem5_noc
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

---

## 📜 Available NPM Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Vite development server with Hot Module Replacement (HMR). |
| `npm run build` | Compiles TypeScript (`tsc -b`) and bundles application for production using Vite. |
| `npm run lint` | Runs ESLint to check for code quality and TypeScript compliance. |
| `npm run preview` | Serves the production build locally at `http://localhost:4173`. |
| `npm run serve` | Alias for `npm run preview`. |

---

## 📁 Directory Structure

```
gem5_noc/
├── public/                # Static public assets
├── src/
│   ├── components/        # React UI Components
│   │   ├── Canvas.tsx             # React Flow main graph editor canvas
│   │   ├── CustomNode.tsx         # Node renderer for Routers, Endpoints & Templates
│   │   ├── Header.tsx             # Main toolbar, actions, and project title
│   │   ├── SettingsPanel.tsx      # Link, Node & Global Settings Inspector
│   │   ├── GeneratorModal.tsx     # Topology generation wizard (Mesh, Torus, etc.)
│   │   └── CodePreviewModal.tsx   # Live gem5 Python script viewer & exporter
│   ├── types/
│   │   └── noc.ts                 # Data models (NoCProject, NoCNodeData, NoCLinkData)
│   ├── utils/
│   │   ├── pythonGenerator.ts     # gem5 Python script generator logic
│   │   ├── topologyGenerators.ts  # Algorithmic topology builders (Mesh, Ring, Tree, etc.)
│   │   ├── forceLayout.ts         # d3-force graph auto-layout utility
│   │   ├── handleUtils.ts         # Cardinal handle snapping & direction utility
│   │   └── fileSystem.ts          # Native .gnoc JSON & .py file import/export
│   ├── App.tsx            # Main application layout & global state management
│   ├── main.tsx           # Application entry point
│   └── index.css          # Tailwind CSS styles & global theme
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

---

## ⚙️ How to Use with gem5

1. **Design your NoC Topology**:
   - Use the **Generator Wizard** to quickly scaffold a Mesh, Torus, or Fat-Tree topology, or manually place Routers and Endpoints on the canvas.
   - Configure global settings such as VNET count, VC buffer depth, clock domain (e.g. `2GHz`), routing algorithm, and workload binary path.
2. **Export Python Configuration Script**:
   - Click **Generate Script** or **Export Python** in the top navigation bar.
   - Save the script as `garnet_my_topology_config.py`.
3. **Execute in gem5**:
   - Run the generated script with your gem5 executable:
     ```bash
     ./build/NULL/gem5.opt \
       configs/example/garnet_synth_traffic.py \
       --topology=Custom \
       --custom-topology-file=/path/to/garnet_my_topology_config.py \
       --network=garnet \
       --num-cpus=16 \
       --vnet-backpressure
     ```

---

## 🤝 Contributing

Contributions are welcome! If you find a bug or have a feature suggestion for gem5 Garnet topology features, feel free to open an issue or submit a pull request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
