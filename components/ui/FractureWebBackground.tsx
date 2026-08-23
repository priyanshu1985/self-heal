"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";

interface Node {
  id: number;
  x: number;
  y: number;
  radius: number;
  glow: number;
}

interface Edge {
  id: string;
  source: Node;
  target: Node;
  sourceId: number;
  targetId: number;
  opacity: number;
  width: number;
  length: number;
}

// Seeded pseudo-random generator (Mulberry32) for deterministic graph generation
function createPRNG(seed = 42) {
  let a = seed;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Procedural graph generator for fractured crack network
function generateFracturedGraph(width: number, height: number, isMobile: boolean) {
  const rand = createPRNG(Math.round(width * 31 + height * 17));
  const nodeCount = isMobile ? 14 : 24;
  const nodes: Node[] = [];

  // Generate nodes weighted toward edges/corners, fewer in the center
  for (let i = 0; i < nodeCount; i++) {
    let x: number, y: number;
    // 70% chance to place in outer margin, 30% anywhere
    if (rand() < 0.7) {
      const edge = Math.floor(rand() * 4);
      if (edge === 0) {
        // Top
        x = rand() * width;
        y = rand() * (height * 0.35);
      } else if (edge === 1) {
        // Bottom
        x = rand() * width;
        y = height * 0.65 + rand() * (height * 0.35);
      } else if (edge === 2) {
        // Left
        x = rand() * (width * 0.3);
        y = rand() * height;
      } else {
        // Right
        x = width * 0.7 + rand() * (width * 0.3);
        y = rand() * height;
      }
    } else {
      // Inward scatter with slight central avoidance
      x = width * 0.15 + rand() * (width * 0.7);
      y = height * 0.15 + rand() * (height * 0.7);
    }

    nodes.push({
      id: i,
      x: Math.max(20, Math.min(width - 20, x)),
      y: Math.max(20, Math.min(height - 20, y)),
      radius: 1.5 + rand() * 2,
      glow: 0.3 + rand() * 0.5,
    });
  }

  // Connect each node to 2-4 nearest neighbors
  const edgeMap = new Map<string, Edge>();
  const adjacency = new Map<number, number[]>();

  nodes.forEach((node) => {
    adjacency.set(node.id, []);
  });

  nodes.forEach((node) => {
    // Sort other nodes by Euclidean distance
    const others = nodes
      .filter((n) => n.id !== node.id)
      .map((other) => ({
        node: other,
        dist: Math.hypot(other.x - node.x, other.y - node.y),
      }))
      .sort((a, b) => a.dist - b.dist);

    const k = Math.min(others.length, 2 + Math.floor(rand() * 3));
    for (let i = 0; i < k; i++) {
      const neighbor = others[i].node;
      const dist = others[i].dist;
      // Skip if too far across whole screen
      if (dist > Math.max(width, height) * 0.7) continue;

      const key =
        node.id < neighbor.id
          ? `${node.id}-${neighbor.id}`
          : `${neighbor.id}-${node.id}`;

      if (!edgeMap.has(key)) {
        // Primary crack vs fine hairline crack
        const isMainCrack = rand() < 0.25;
        const opacity = isMainCrack
          ? 0.35 + rand() * 0.2
          : 0.12 + rand() * 0.18;
        const thickness = isMainCrack
          ? 1.2 + rand() * 0.6
          : 0.6 + rand() * 0.5;

        edgeMap.set(key, {
          id: key,
          source: node,
          target: neighbor,
          sourceId: node.id,
          targetId: neighbor.id,
          opacity,
          width: thickness,
          length: dist,
        });

        adjacency.get(node.id)?.push(neighbor.id);
        adjacency.get(neighbor.id)?.push(node.id);
      }
    }
  });

  // Ensure fully connected graph so spider never gets permanently trapped in isolated component
  const visited = new Set<number>();
  function dfs(curr: number) {
    visited.add(curr);
    for (const n of adjacency.get(curr) || []) {
      if (!visited.has(n)) dfs(n);
    }
  }
  dfs(0);

  // If any unvisited, connect them to the nearest visited node
  nodes.forEach((node) => {
    if (!visited.has(node.id)) {
      let nearestVisited: Node | null = null;
      let minDist = Infinity;
      visited.forEach((vId) => {
        const vNode = nodes[vId];
        const dist = Math.hypot(vNode.x - node.x, vNode.y - node.y);
        if (dist < minDist) {
          minDist = dist;
          nearestVisited = vNode;
        }
      });
      if (nearestVisited) {
        const neighbor = nearestVisited as Node;
        const key =
          node.id < neighbor.id
            ? `${node.id}-${neighbor.id}`
            : `${neighbor.id}-${node.id}`;
        edgeMap.set(key, {
          id: key,
          source: node,
          target: neighbor,
          sourceId: node.id,
          targetId: neighbor.id,
          opacity: 0.25,
          width: 0.8,
          length: minDist,
        });
        adjacency.get(node.id)?.push(neighbor.id);
        adjacency.get(neighbor.id)?.push(node.id);
        dfs(node.id);
      }
    }
  });

  return {
    nodes,
    edges: Array.from(edgeMap.values()),
    adjacency,
  };
}

export const FractureWebBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 700 });
  const [reducedMotion, setReducedMotion] = useState(false);

  // Spider State
  const [spiderPos, setSpiderPos] = useState({ x: 100, y: 100, angle: 0, legPhase: 0 });
  const graphRef = useRef<ReturnType<typeof generateFracturedGraph> | null>(null);
  const spiderStateRef = useRef<{
    currentNodeId: number;
    targetNodeId: number;
    progress: number;
    isPaused: boolean;
    pauseEndTime: number;
    speed: number; // px per second
    lastTime: number;
    visitedRecent: number[];
  }>({
    currentNodeId: 0,
    targetNodeId: 1,
    progress: 0,
    isPaused: false,
    pauseEndTime: 0,
    speed: 70,
    lastTime: 0,
    visitedRecent: [],
  });

  // Track viewport & motion preference
  useEffect(() => {
    setMounted(true);
    const rmq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(rmq.matches);
    const onRM = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    rmq.addEventListener("change", onRM);

    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const w = Math.max(320, rect.width || window.innerWidth);
        const h = Math.max(360, rect.height || 700);
        setDimensions({ width: w, height: h });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => {
      rmq.removeEventListener("change", onRM);
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);

  // Generate / Regenerate graph when dimensions change
  const graph = useMemo(() => {
    const isMobile = dimensions.width < 768;
    const g = generateFracturedGraph(dimensions.width, dimensions.height, isMobile);
    graphRef.current = g;

    if (g.nodes.length > 1) {
      const startNode = g.nodes[0];
      const neighbors = g.adjacency.get(startNode.id) || [g.nodes[1].id];
      const targetNodeId = neighbors[Math.floor(Math.random() * neighbors.length)];
      const targetNode = g.nodes.find((n) => n.id === targetNodeId) || g.nodes[1];

      const dx = targetNode.x - startNode.x;
      const dy = targetNode.y - startNode.y;
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;

      spiderStateRef.current = {
        currentNodeId: startNode.id,
        targetNodeId: targetNode.id,
        progress: 0,
        isPaused: false,
        pauseEndTime: 0,
        speed: 75,
        lastTime: performance.now(),
        visitedRecent: [startNode.id],
      };

      setSpiderPos({
        x: startNode.x,
        y: startNode.y,
        angle,
        legPhase: 0,
      });
    }

    return g;
  }, [dimensions.width, dimensions.height]);

  // Animation Loop for Spider patrolling the graph
  useEffect(() => {
    if (reducedMotion) return;

    let animId: number;

    const animateSpider = (time: number) => {
      const s = spiderStateRef.current;
      const g = graphRef.current;

      if (!g || g.nodes.length < 2) {
        animId = requestAnimationFrame(animateSpider);
        return;
      }

      if (s.lastTime === 0) s.lastTime = time;
      const dt = Math.min(0.1, (time - s.lastTime) / 1000); // delta in seconds
      s.lastTime = time;

      const sourceNode = g.nodes.find((n) => n.id === s.currentNodeId) || g.nodes[0];
      const targetNode = g.nodes.find((n) => n.id === s.targetNodeId) || g.nodes[1];

      const dist = Math.hypot(targetNode.x - sourceNode.x, targetNode.y - sourceNode.y) || 1;
      const dx = targetNode.x - sourceNode.x;
      const dy = targetNode.y - sourceNode.y;
      const targetAngle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;

      if (s.isPaused) {
        if (time >= s.pauseEndTime) {
          s.isPaused = false;
          // Pick next neighbor
          const neighbors = g.adjacency.get(s.targetNodeId) || [];
          if (neighbors.length > 0) {
            // Avoid immediately going back to the same node unless dead end
            const unvisited = neighbors.filter((nId) => !s.visitedRecent.slice(-3).includes(nId));
            const nextId =
              unvisited.length > 0
                ? unvisited[Math.floor(Math.random() * unvisited.length)]
                : neighbors[Math.floor(Math.random() * neighbors.length)];

            s.currentNodeId = s.targetNodeId;
            s.targetNodeId = nextId;
            s.progress = 0;
            s.visitedRecent.push(s.currentNodeId);
            if (s.visitedRecent.length > 10) s.visitedRecent.shift();
          }
        }
      } else {
        // Move along edge
        const step = (s.speed * dt) / dist;
        s.progress += step;

        if (s.progress >= 1) {
          // Reached node -> pause briefly (300-500ms)
          s.progress = 1;
          s.isPaused = true;
          s.pauseEndTime = time + (320 + Math.random() * 220);
        }

        const currX = sourceNode.x + (targetNode.x - sourceNode.x) * s.progress;
        const currY = sourceNode.y + (targetNode.y - sourceNode.y) * s.progress;
        const legPhase = (time * 0.015) % (Math.PI * 2);

        setSpiderPos({
          x: currX,
          y: currY,
          angle: targetAngle,
          legPhase,
        });
      }

      animId = requestAnimationFrame(animateSpider);
    };

    animId = requestAnimationFrame(animateSpider);
    return () => cancelAnimationFrame(animId);
  }, [reducedMotion]);

  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        minHeight: "480px",
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
        maskImage:
          "radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.85) 55%, rgba(0,0,0,1) 100%)",
        WebkitMaskImage:
          "radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.85) 55%, rgba(0,0,0,1) 100%)",
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
      >
        <defs>
          {/* Subtle outer red glow filter for fracture cracks */}
          <filter id="fracture-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Node intersection intense glow */}
          <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Spider subtle glow */}
          <filter id="spider-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#ef4444" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* ─── Fracture Crack Edges ─── */}
        <g filter="url(#fracture-glow)">
          {graph.edges.map((edge) => (
            <line
              key={edge.id}
              x1={edge.source.x}
              y1={edge.source.y}
              x2={edge.target.x}
              y2={edge.target.y}
              stroke="#ef4444"
              strokeWidth={edge.width}
              strokeOpacity={edge.opacity}
              strokeLinecap="round"
            />
          ))}
        </g>

        {/* ─── Fracture Web Intersection Nodes ─── */}
        <g filter="url(#node-glow)">
          {graph.nodes.map((node) => (
            <circle
              key={node.id}
              cx={node.x}
              cy={node.y}
              r={node.radius}
              fill="#ff4d5a"
              fillOpacity={node.glow}
            />
          ))}
        </g>

        {/* ─── The Crawling Spider ─── */}
        <g
          filter="url(#spider-glow)"
          transform={`translate(${spiderPos.x}, ${spiderPos.y}) rotate(${spiderPos.angle})`}
          style={{ transition: reducedMotion ? "none" : "transform 0.04s linear" }}
        >
          {/* Spider Body - Cephalothorax & Abdomen */}
          <g>
            {/* Posterior Abdomen (large oval) */}
            <ellipse cx="0" cy="3.5" rx="3.5" ry="4.5" fill="#120507" stroke="#e0212f" strokeWidth="0.8" />
            {/* Abdomen highlight mark (geometric spider motif) */}
            <path
              d="M 0,1 L 1.8,3.5 L 0,6 L -1.8,3.5 Z"
              fill="rgba(239, 68, 68, 0.75)"
            />

            {/* Anterior Cephalothorax (small head) */}
            <ellipse cx="0" cy="-2.5" rx="2.5" ry="2.2" fill="#1c070a" stroke="#e0212f" strokeWidth="0.8" />
            {/* Eyes */}
            <circle cx="-0.8" cy="-3.5" r="0.45" fill="#ff6b6b" />
            <circle cx="0.8" cy="-3.5" r="0.45" fill="#ff6b6b" />

            {/* ─── 8 Jointed Legs with Stepping Micro-Motion ─── */}
            {/* Left Legs */}
            {/* Leg 1 (Front Left) */}
            <path
              d={`M -2,-2 Q ${-5 + Math.sin(spiderPos.legPhase) * 1.5},-5 ${-7 + Math.sin(spiderPos.legPhase) * 1.8},-8`}
              stroke="#ef4444"
              strokeWidth="0.75"
              fill="none"
              strokeLinecap="round"
            />
            {/* Leg 2 (Mid-Front Left) */}
            <path
              d={`M -2.2,-0.5 Q ${-6 - Math.cos(spiderPos.legPhase) * 1.5},-2 ${-9 - Math.cos(spiderPos.legPhase) * 1.5},-3`}
              stroke="#ef4444"
              strokeWidth="0.75"
              fill="none"
              strokeLinecap="round"
            />
            {/* Leg 3 (Mid-Rear Left) */}
            <path
              d={`M -2.2,2 Q ${-6 + Math.sin(spiderPos.legPhase) * 1.5},3 ${-9 + Math.sin(spiderPos.legPhase) * 1.5},4`}
              stroke="#ef4444"
              strokeWidth="0.75"
              fill="none"
              strokeLinecap="round"
            />
            {/* Leg 4 (Rear Left) */}
            <path
              d={`M -2,4 Q ${-5 - Math.cos(spiderPos.legPhase) * 1.5},7 ${-7 - Math.cos(spiderPos.legPhase) * 1.8},10`}
              stroke="#ef4444"
              strokeWidth="0.75"
              fill="none"
              strokeLinecap="round"
            />

            {/* Right Legs */}
            {/* Leg 5 (Front Right) */}
            <path
              d={`M 2,-2 Q ${5 - Math.sin(spiderPos.legPhase) * 1.5},-5 ${7 - Math.sin(spiderPos.legPhase) * 1.8},-8`}
              stroke="#ef4444"
              strokeWidth="0.75"
              fill="none"
              strokeLinecap="round"
            />
            {/* Leg 6 (Mid-Front Right) */}
            <path
              d={`M 2.2,-0.5 Q ${6 + Math.cos(spiderPos.legPhase) * 1.5},-2 ${9 + Math.cos(spiderPos.legPhase) * 1.5},-3`}
              stroke="#ef4444"
              strokeWidth="0.75"
              fill="none"
              strokeLinecap="round"
            />
            {/* Leg 7 (Mid-Rear Right) */}
            <path
              d={`M 2.2,2 Q ${6 - Math.sin(spiderPos.legPhase) * 1.5},3 ${9 - Math.sin(spiderPos.legPhase) * 1.5},4`}
              stroke="#ef4444"
              strokeWidth="0.75"
              fill="none"
              strokeLinecap="round"
            />
            {/* Leg 8 (Rear Right) */}
            <path
              d={`M 2,4 Q ${5 + Math.cos(spiderPos.legPhase) * 1.5},7 ${7 + Math.cos(spiderPos.legPhase) * 1.8},10`}
              stroke="#ef4444"
              strokeWidth="0.75"
              fill="none"
              strokeLinecap="round"
            />
          </g>
        </g>
      </svg>
    </div>
  );
};
