import { NoCLinkData } from '../types/noc';

export interface PhysicsNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isDragging: boolean;
  targetX: number | null;
  targetY: number | null;
  anchorX: number | null;
  anchorY: number | null;
}

export interface PhysicsConfig {
  kRepulsion: number;     // Coulomb repulsion constant (default 120000)
  kAttraction: number;    // Hooke spring constant along links (default 0.015)
  kAnchor: number;        // Soft target anchor spring constant (default 0.12)
  kMouse: number;         // Dynamic mouse drag spring constant (default 0.35)
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
    kMouse: 0.35,
    restLength: 180,
    kCenter: 0.0003,
    damping: 0.78,
    sleepThreshold: 0.04,
  };

  private onTickCallback?: (positions: Map<string, { x: number; y: number }>) => void;

  constructor(onTick?: (positions: Map<string, { x: number; y: number }>) => void) {
    this.onTickCallback = onTick;
  }

  private lastEmittedPositions: Map<string, { x: number; y: number }> = new Map();

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
        if (!existing.isDragging && (existing.anchorX === null || existing.anchorY === null)) {
          existing.x = n.position.x;
          existing.y = n.position.y;
        }
      } else {
        this.nodes.set(n.id, {
          id: n.id,
          x: n.position.x,
          y: n.position.y,
          vx: 0,
          vy: 0,
          isDragging: false,
          targetX: null,
          targetY: null,
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
      this.wake();
    }
  }

  public updateDragPos(id: string, x: number, y: number) {
    const node = this.nodes.get(id);
    if (node) {
      node.isDragging = true;
      node.targetX = x;
      node.targetY = y;
      this.wake();
    }
  }

  public endDrag(id: string) {
    const node = this.nodes.get(id);
    if (node) {
      node.isDragging = false;
      node.targetX = null;
      node.targetY = null;
      node.anchorX = node.x;
      node.anchorY = node.y;
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

  public clearAllAnchors() {
    this.nodes.forEach((node) => {
      node.anchorX = null;
      node.anchorY = null;
      node.targetX = null;
      node.targetY = null;
    });
    this.wake();
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

    // 1. Mouse Drag Spring Force (Pulls actively dragged nodes towards cursor)
    nodeList.forEach((node) => {
      if (node.isDragging && node.targetX !== null && node.targetY !== null) {
        const dx = node.targetX - node.x;
        const dy = node.targetY - node.y;

        forcesX.set(node.id, forcesX.get(node.id)! + dx * this.config.kMouse);
        forcesY.set(node.id, forcesY.get(node.id)! + dy * this.config.kMouse);
      }
    });

    // 2. Repulsion Force (Coulomb repulsion between all node pairs)
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

    // 3. Link Attraction Force (Hooke's spring along connections)
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

    // 4. Anchor Spring Force (Soft target anchor for released nodes)
    nodeList.forEach((node) => {
      if (!node.isDragging && node.anchorX !== null && node.anchorY !== null) {
        const dx = node.anchorX - node.x;
        const dy = node.anchorY - node.y;

        forcesX.set(node.id, forcesX.get(node.id)! + dx * this.config.kAnchor);
        forcesY.set(node.id, forcesY.get(node.id)! + dy * this.config.kAnchor);
      }
    });

    // 5. Centering Force (Weak pull towards canvas center)
    nodeList.forEach((node) => {
      const dx = this.canvasCenter.x - node.x;
      const dy = this.canvasCenter.y - node.y;

      forcesX.set(node.id, forcesX.get(node.id)! + dx * this.config.kCenter);
      forcesY.set(node.id, forcesY.get(node.id)! + dy * this.config.kCenter);
    });

    // 6. Integration Step
    let totalEnergy = 0;

    nodeList.forEach((node) => {
      const fx = forcesX.get(node.id) || 0;
      const fy = forcesY.get(node.id) || 0;

      node.vx = (node.vx + fx) * this.config.damping;
      node.vy = (node.vy + fy) * this.config.damping;

      node.x += node.vx;
      node.y += node.vy;

      totalEnergy += node.vx * node.vx + node.vy * node.vy;
    });

    return totalEnergy;
  }

  private settleFrames = 0;

  private loop = () => {
    if (!this.isRunning) return;

    this.step();

    let maxSpeed = 0;
    this.nodes.forEach((node) => {
      const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
      if (speed > maxSpeed) maxSpeed = speed;
    });

    if (this.onTickCallback) {
      let hasMoved = false;
      const posMap = new Map<string, { x: number; y: number }>();

      this.nodes.forEach((node, id) => {
        const rx = Math.round(node.x);
        const ry = Math.round(node.y);
        posMap.set(id, { x: rx, y: ry });

        const prev = this.lastEmittedPositions.get(id);
        if (!prev || prev.x !== rx || prev.y !== ry) {
          hasMoved = true;
        }
      });

      if (hasMoved) {
        this.lastEmittedPositions = posMap;
        this.onTickCallback(posMap);
      }
    }

    if (maxSpeed < 0.15) {
      this.settleFrames++;
      if (this.settleFrames >= 5) {
        this.nodes.forEach((node) => {
          node.vx = 0;
          node.vy = 0;
        });
        this.isRunning = false;
        this.animFrameId = null;
        this.settleFrames = 0;
        return;
      }
    } else {
      this.settleFrames = 0;
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };
}
