import { NoCLinkData } from '../types/noc';

export interface PhysicsNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isDragging: boolean;
  anchorX: number | null;
  anchorY: number | null;
}

export interface PhysicsConfig {
  kRepulsion: number;     // Coulomb repulsion constant (default 120000)
  kAttraction: number;    // Hooke spring constant along links (default 0.015)
  kAnchor: number;        // Soft target anchor spring constant (default 0.12)
  restLength: number;     // Ideal edge rest length in px (default 180)
  kCenter: number;        // Weak centering force constant (default 0.0003)
  damping: number;        // Friction / Velocity damping (default 0.78)
  sleepThreshold: number; // Energy threshold for sleep mode (default 0.04)
}

export class InteractiveForceEngine {
  private nodes: Map<string, PhysicsNode> = new Map();
  private links: NoCLinkData[] = [];
  private animFrameId: number | null = null;
  private isRunning = false;
  private canvasCenter = { x: 600, y: 400 };

  public config: PhysicsConfig = {
    kRepulsion: 120000,
    kAttraction: 0.015,
    kAnchor: 0.12,
    restLength: 180,
    kCenter: 0.0003,
    damping: 0.78,
    sleepThreshold: 0.04,
  };

  private onTickCallback?: (positions: Map<string, { x: number; y: number }>) => void;

  constructor(onTick?: (positions: Map<string, { x: number; y: number }>) => void) {
    this.onTickCallback = onTick;
  }

  public setOnTick(callback: (positions: Map<string, { x: number; y: number }>) => void) {
    this.onTickCallback = callback;
  }

  public setCanvasCenter(x: number, y: number) {
    this.canvasCenter = { x, y };
  }

  public syncNodes(
    nodeList: Array<{ id: string; position: { x: number; y: number }; data?: { anchorX?: number; anchorY?: number } }>
  ) {
    const activeIds = new Set<string>();

    nodeList.forEach((n) => {
      activeIds.add(n.id);
      const existing = this.nodes.get(n.id);

      if (existing) {
        if (existing.isDragging) {
          existing.x = n.position.x;
          existing.y = n.position.y;
          existing.vx = 0;
          existing.vy = 0;
        }
      } else {
        this.nodes.set(n.id, {
          id: n.id,
          x: n.position.x,
          y: n.position.y,
          vx: 0,
          vy: 0,
          isDragging: false,
          anchorX: n.data?.anchorX ?? null,
          anchorY: n.data?.anchorY ?? null,
        });
      }
    });

    Array.from(this.nodes.keys()).forEach((id) => {
      if (!activeIds.has(id)) {
        this.nodes.delete(id);
      }
    });

    this.wake();
  }

  public setLinks(links: NoCLinkData[]) {
    this.links = links;
    this.wake();
  }

  public startDrag(id: string) {
    const node = this.nodes.get(id);
    if (node) {
      node.isDragging = true;
      node.vx = 0;
      node.vy = 0;
      this.wake();
    }
  }

  public updateDragPos(id: string, x: number, y: number) {
    const node = this.nodes.get(id);
    if (node) {
      node.x = x;
      node.y = y;
      node.vx = 0;
      node.vy = 0;
      this.wake();
    }
  }

  public endDrag(id: string, x: number, y: number) {
    const node = this.nodes.get(id);
    if (node) {
      node.isDragging = false;
      node.x = x;
      node.y = y;
      node.anchorX = x;
      node.anchorY = y;
      node.vx = 0;
      node.vy = 0;
      this.wake();
    }
  }

  public clearAnchor(id: string) {
    const node = this.nodes.get(id);
    if (node) {
      node.anchorX = null;
      node.anchorY = null;
      this.wake();
    }
  }

  public wake() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.loop();
    }
  }

  public stop() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private step(): number {
    const nodeList = Array.from(this.nodes.values());
    const n = nodeList.length;
    if (n === 0) return 0;

    const forcesX = new Map<string, number>();
    const forcesY = new Map<string, number>();

    nodeList.forEach((node) => {
      forcesX.set(node.id, 0);
      forcesY.set(node.id, 0);
    });

    // 1. Repulsion Force (Coulomb repulsion)
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const nodeA = nodeList[i];
        const nodeB = nodeList[j];

        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        let distSq = dx * dx + dy * dy;
        if (distSq < 100) distSq = 100;

        const dist = Math.sqrt(distSq);
        const fRep = this.config.kRepulsion / distSq;
        const fx = (dx / dist) * fRep;
        const fy = (dy / dist) * fRep;

        forcesX.set(nodeA.id, forcesX.get(nodeA.id)! - fx);
        forcesY.set(nodeA.id, forcesY.get(nodeA.id)! - fy);

        forcesX.set(nodeB.id, forcesX.get(nodeB.id)! + fx);
        forcesY.set(nodeB.id, forcesY.get(nodeB.id)! + fy);
      }
    }

    // 2. Link Attraction Force (Hooke's spring along connections)
    this.links.forEach((link) => {
      const nodeA = this.nodes.get(link.source);
      const nodeB = this.nodes.get(link.target);

      if (nodeA && nodeB) {
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) dist = 1;

        const delta = dist - this.config.restLength;
        const fSpring = this.config.kAttraction * delta;
        const fx = (dx / dist) * fSpring;
        const fy = (dy / dist) * fSpring;

        forcesX.set(nodeA.id, forcesX.get(nodeA.id)! + fx);
        forcesY.set(nodeA.id, forcesY.get(nodeA.id)! + fy);

        forcesX.set(nodeB.id, forcesX.get(nodeB.id)! - fx);
        forcesY.set(nodeB.id, forcesY.get(nodeB.id)! - fy);
      }
    });

    // 3. Anchor Spring Force (Soft target anchor)
    nodeList.forEach((node) => {
      if (node.anchorX !== null && node.anchorY !== null) {
        const dx = node.anchorX - node.x;
        const dy = node.anchorY - node.y;

        forcesX.set(node.id, forcesX.get(node.id)! + dx * this.config.kAnchor);
        forcesY.set(node.id, forcesY.get(node.id)! + dy * this.config.kAnchor);
      }
    });

    // 4. Centering Force (Weak pull towards canvas center)
    nodeList.forEach((node) => {
      const dx = this.canvasCenter.x - node.x;
      const dy = this.canvasCenter.y - node.y;

      forcesX.set(node.id, forcesX.get(node.id)! + dx * this.config.kCenter);
      forcesY.set(node.id, forcesY.get(node.id)! + dy * this.config.kCenter);
    });

    // 5. Integration Step
    let totalEnergy = 0;

    nodeList.forEach((node) => {
      if (!node.isDragging) {
        const fx = forcesX.get(node.id) || 0;
        const fy = forcesY.get(node.id) || 0;

        node.vx = (node.vx + fx) * this.config.damping;
        node.vy = (node.vy + fy) * this.config.damping;

        node.x += node.vx;
        node.y += node.vy;

        totalEnergy += node.vx * node.vx + node.vy * node.vy;
      } else {
        node.vx = 0;
        node.vy = 0;
      }
    });

    return totalEnergy;
  }

  private loop = () => {
    if (!this.isRunning) return;

    const energy = this.step();

    if (this.onTickCallback) {
      const posMap = new Map<string, { x: number; y: number }>();
      this.nodes.forEach((node, id) => {
        posMap.set(id, { x: Math.round(node.x), y: Math.round(node.y) });
      });
      this.onTickCallback(posMap);
    }

    if (energy < this.config.sleepThreshold) {
      this.isRunning = false;
      this.animFrameId = null;
      return;
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };
}
