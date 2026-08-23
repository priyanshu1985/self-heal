"use client";

import React, { useEffect, useRef, useState } from "react";

export interface WebNode {
  ring: number; // 0 = center, 1..N = concentric rings
  spoke: number; // 0..7 for 8 radial spokes
  x: number;
  y: number;
}

export interface WebGeometry {
  cx: number;
  cy: number;
  numSpokes: number;
  numRings: number;
  ringRadii: number[];
  nodes: WebNode[][]; // nodes[ring][spoke]
  // Returns quadratic Bézier control point for arc between (ring, spoke) and (ring, (spoke+1)%8)
  getArcControlPoint: (ring: number, spoke1: number, spoke2: number) => { x: number; y: number };
}

interface CrawlingSpiderProps {
  geometry: WebGeometry;
  reducedMotion?: boolean;
}

export const CrawlingSpider: React.FC<CrawlingSpiderProps> = ({ geometry, reducedMotion = false }) => {
  const [spiderTransform, setSpiderTransform] = useState({
    x: geometry.cx,
    y: geometry.cy,
    angle: 0,
    legPhase: 0,
  });

  const stateRef = useRef<{
    currentRing: number;
    currentSpoke: number;
    targetRing: number;
    targetSpoke: number;
    moveType: "spoke" | "arc";
    progress: number;
    isPaused: boolean;
    pauseEndTime: number;
    speed: number; // pixels per second
    lastTime: number;
  }>({
    currentRing: 1,
    currentSpoke: 0,
    targetRing: 2,
    targetSpoke: 0,
    moveType: "spoke",
    progress: 0,
    isPaused: false,
    pauseEndTime: 0,
    speed: 65,
    lastTime: 0,
  });

  // Re-center if geometry updates
  useEffect(() => {
    const node = geometry.nodes[1]?.[0] || { x: geometry.cx, y: geometry.cy };
    setSpiderTransform((prev) => ({
      ...prev,
      x: node.x,
      y: node.y,
    }));
  }, [geometry]);

  useEffect(() => {
    if (reducedMotion) return;

    let animId: number;

    const animate = (time: number) => {
      const s = stateRef.current;
      if (s.lastTime === 0) s.lastTime = time;
      const dt = Math.min(0.08, (time - s.lastTime) / 1000);
      s.lastTime = time;

      const numRings = geometry.numRings;
      const numSpokes = geometry.numSpokes;

      // Start node
      const p1 =
        s.currentRing === 0
          ? { x: geometry.cx, y: geometry.cy }
          : geometry.nodes[s.currentRing]?.[s.currentSpoke] || { x: geometry.cx, y: geometry.cy };

      // End node
      const p2 =
        s.targetRing === 0
          ? { x: geometry.cx, y: geometry.cy }
          : geometry.nodes[s.targetRing]?.[s.targetSpoke] || { x: geometry.cx, y: geometry.cy };

      if (s.isPaused) {
        if (time >= s.pauseEndTime) {
          s.isPaused = false;
          s.progress = 0;
          s.currentRing = s.targetRing;
          s.currentSpoke = s.targetSpoke;

          // Pick next move from current node
          const possibleMoves: Array<{ ring: number; spoke: number; type: "spoke" | "arc" }> = [];

          // 1. Move outward along spoke if not at outer ring
          if (s.currentRing < numRings) {
            possibleMoves.push({ ring: s.currentRing + 1, spoke: s.currentSpoke, type: "spoke" });
          }
          // 2. Move inward along spoke if not at center
          if (s.currentRing > 1) {
            possibleMoves.push({ ring: s.currentRing - 1, spoke: s.currentSpoke, type: "spoke" });
          } else if (s.currentRing === 1) {
            possibleMoves.push({ ring: 0, spoke: 0, type: "spoke" });
          } else if (s.currentRing === 0) {
            // From center, can move outward to ring 1 along any spoke
            const nextSpoke = Math.floor(Math.random() * numSpokes);
            possibleMoves.push({ ring: 1, spoke: nextSpoke, type: "spoke" });
          }

          // 3. Move along ring arc (clockwise or counter-clockwise) if ring > 0
          if (s.currentRing > 0) {
            const cwSpoke = (s.currentSpoke + 1) % numSpokes;
            const ccwSpoke = (s.currentSpoke - 1 + numSpokes) % numSpokes;
            possibleMoves.push({ ring: s.currentRing, spoke: cwSpoke, type: "arc" });
            possibleMoves.push({ ring: s.currentRing, spoke: ccwSpoke, type: "arc" });
          }

          if (possibleMoves.length > 0) {
            const next = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
            s.targetRing = next.ring;
            s.targetSpoke = next.spoke;
            s.moveType = next.type;
          }
        }
      } else {
        // Calculate distance
        let dist = 1;
        if (s.moveType === "spoke") {
          dist = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
        } else {
          // Arc distance approx
          const q = geometry.getArcControlPoint(s.currentRing, s.currentSpoke, s.targetSpoke);
          const chord = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          dist = chord * 1.15 || 1;
        }

        const step = (s.speed * dt) / dist;
        s.progress += step;

        if (s.progress >= 1) {
          s.progress = 1;
          s.isPaused = true;
          // 400 - 600ms pause at intersection
          s.pauseEndTime = time + 400 + Math.random() * 200;
        }

        let currX: number, currY: number, tangentX: number, tangentY: number;

        if (s.moveType === "spoke") {
          currX = p1.x + (p2.x - p1.x) * s.progress;
          currY = p1.y + (p2.y - p1.y) * s.progress;
          tangentX = p2.x - p1.x;
          tangentY = p2.y - p1.y;
        } else {
          // Quadratic Bézier curve for bowed arc
          const q = geometry.getArcControlPoint(s.currentRing, s.currentSpoke, s.targetSpoke);
          const t = s.progress;
          const u = 1 - t;

          // B(t) = (1-t)^2 P1 + 2(1-t)t Q + t^2 P2
          currX = u * u * p1.x + 2 * u * t * q.x + t * t * p2.x;
          currY = u * u * p1.y + 2 * u * t * q.y + t * t * p2.y;

          // B'(t) = 2(1-t)(Q - P1) + 2t(P2 - Q)
          tangentX = 2 * u * (q.x - p1.x) + 2 * t * (p2.x - q.x);
          tangentY = 2 * u * (q.y - p1.y) + 2 * t * (p2.y - q.y);
        }

        const angle = (Math.atan2(tangentY, tangentX) * 180) / Math.PI + 90;
        const legPhase = (time * 0.016) % (Math.PI * 2);

        setSpiderTransform({
          x: currX,
          y: currY,
          angle,
          legPhase,
        });
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [geometry, reducedMotion]);

  const { x, y, angle, legPhase } = spiderTransform;

  return (
    <g
      transform={`translate(${x}, ${y}) rotate(${angle})`}
      style={{
        pointerEvents: "none",
        transition: reducedMotion ? "none" : "transform 0.03s linear",
      }}
    >
      {/* Subtle Spider Outer Glow */}
      <circle cx="0" cy="0" r="14" fill="rgba(224, 33, 47, 0.15)" filter="blur(4px)" />

      {/* Spider Silhouette */}
      <g>
        {/* Abdomen (Rear Oval) */}
        <ellipse
          cx="0"
          cy="4"
          rx="4.2"
          ry="5.5"
          fill="#06080d"
          stroke="#ef4444"
          strokeWidth="0.85"
        />

        {/* Abdomen Spider Motif Glow Highlight */}
        <path
          d="M 0,1 L 2,4 L 0,7.5 L -2,4 Z"
          fill="#ef4444"
          fillOpacity="0.8"
        />

        {/* Cephalothorax (Front Head) */}
        <ellipse
          cx="0"
          cy="-3"
          rx="3"
          ry="2.6"
          fill="#0a0e17"
          stroke="#ef4444"
          strokeWidth="0.85"
        />

        {/* Eyes (Glowing Twin Red Points) */}
        <circle cx="-1" cy="-4.2" r="0.55" fill="#ff4d5a" />
        <circle cx="1" cy="-4.2" r="0.55" fill="#ff4d5a" />

        {/* ─── 8 Jointed Legs with Walking Wiggle ─── */}
        {/* Left Side Legs */}
        <path
          d={`M -2.5,-2.5 Q ${-6 + Math.sin(legPhase) * 1.5},-6 ${-9 + Math.sin(legPhase) * 2},-10`}
          stroke="#ef4444"
          strokeWidth="0.9"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M -3,-0.5 Q ${-8 - Math.cos(legPhase) * 1.5},-2.5 ${-11 - Math.cos(legPhase) * 1.8},-4`}
          stroke="#ef4444"
          strokeWidth="0.9"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M -3,2.5 Q ${-8 + Math.sin(legPhase) * 1.5},3.5 ${-11 + Math.sin(legPhase) * 1.8},5`}
          stroke="#ef4444"
          strokeWidth="0.9"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M -2.5,5 Q ${-6 - Math.cos(legPhase) * 1.5},8.5 ${-9 - Math.cos(legPhase) * 2},12`}
          stroke="#ef4444"
          strokeWidth="0.9"
          fill="none"
          strokeLinecap="round"
        />

        {/* Right Side Legs */}
        <path
          d={`M 2.5,-2.5 Q ${6 - Math.sin(legPhase) * 1.5},-6 ${9 - Math.sin(legPhase) * 2},-10`}
          stroke="#ef4444"
          strokeWidth="0.9"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M 3,-0.5 Q ${8 + Math.cos(legPhase) * 1.5},-2.5 ${11 + Math.cos(legPhase) * 1.8},-4`}
          stroke="#ef4444"
          strokeWidth="0.9"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M 3,2.5 Q ${8 - Math.sin(legPhase) * 1.5},3.5 ${11 - Math.sin(legPhase) * 1.8},5`}
          stroke="#ef4444"
          strokeWidth="0.9"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M 2.5,5 Q ${6 + Math.cos(legPhase) * 1.5},8.5 ${9 + Math.cos(legPhase) * 2},12`}
          stroke="#ef4444"
          strokeWidth="0.9"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    </g>
  );
};
