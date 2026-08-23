"use client";

import React, { useEffect, useRef, useState } from "react";
import { WebGeometry } from "./CrawlingSpider";

export interface SpunThread {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  qx?: number;
  qy?: number;
  opacity: number;
  createdAt: number;
}

interface WeaverSpiderProps {
  geometry: WebGeometry;
  reducedMotion?: boolean;
}

export const WeaverSpider: React.FC<WeaverSpiderProps> = ({ geometry, reducedMotion = false }) => {
  const [spiderTransform, setSpiderTransform] = useState({
    x: geometry.cx,
    y: geometry.cy,
    angle: 180,
    legPhase: 0,
  });

  // Active silk line being pulled right now
  const [activeSilk, setActiveSilk] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    isDrawing: boolean;
  }>({
    x1: geometry.cx,
    y1: geometry.cy,
    x2: geometry.cx,
    y2: geometry.cy,
    isDrawing: false,
  });

  // List of dynamically spun threads
  const [spunThreads, setSpunThreads] = useState<SpunThread[]>([]);

  const stateRef = useRef<{
    currentRing: number;
    currentSpoke: number;
    targetRing: number;
    targetSpoke: number;
    moveType: "spoke" | "arc" | "diagonal_weave";
    progress: number;
    isPaused: boolean;
    pauseEndTime: number;
    speed: number;
    lastTime: number;
    anchorPoint: { x: number; y: number };
  }>({
    currentRing: Math.min(3, geometry.numRings),
    currentSpoke: Math.floor(geometry.numSpokes / 2),
    targetRing: Math.min(4, geometry.numRings),
    targetSpoke: (Math.floor(geometry.numSpokes / 2) + 1) % geometry.numSpokes,
    moveType: "diagonal_weave",
    progress: 0,
    isPaused: false,
    pauseEndTime: 0,
    speed: 72,
    lastTime: 0,
    anchorPoint: { x: geometry.cx, y: geometry.cy },
  });

  // Initialize position on opposite side of web from first spider
  useEffect(() => {
    const initialRing = Math.min(3, geometry.numRings);
    const initialSpoke = Math.floor(geometry.numSpokes / 2);
    const node =
      geometry.nodes[initialRing]?.[initialSpoke] || { x: geometry.cx, y: geometry.cy };

    stateRef.current.anchorPoint = { x: node.x, y: node.y };
    setSpiderTransform({
      x: node.x,
      y: node.y,
      angle: 180,
      legPhase: 0,
    });
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

      // Target node
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
          s.anchorPoint = { x: p2.x, y: p2.y };

          // Pick next weaving move to extend new connections
          const possibleMoves: Array<{
            ring: number;
            spoke: number;
            type: "spoke" | "arc" | "diagonal_weave";
          }> = [];

          // 1. Diagonal cross-weave (extending web across rings & spokes)
          if (s.currentRing < numRings) {
            const nextSpoke = (s.currentSpoke + 1) % numSpokes;
            const prevSpoke = (s.currentSpoke - 1 + numSpokes) % numSpokes;
            possibleMoves.push({ ring: s.currentRing + 1, spoke: nextSpoke, type: "diagonal_weave" });
            possibleMoves.push({ ring: s.currentRing + 1, spoke: prevSpoke, type: "diagonal_weave" });
          }
          if (s.currentRing > 1) {
            const nextSpoke = (s.currentSpoke + 1) % numSpokes;
            possibleMoves.push({ ring: s.currentRing - 1, spoke: nextSpoke, type: "diagonal_weave" });
          }

          // 2. Normal ring arc & spoke
          if (s.currentRing < numRings) {
            possibleMoves.push({ ring: s.currentRing + 1, spoke: s.currentSpoke, type: "spoke" });
          }
          if (s.currentRing > 0) {
            const cwSpoke = (s.currentSpoke + 1) % numSpokes;
            possibleMoves.push({ ring: s.currentRing, spoke: cwSpoke, type: "arc" });
          }

          if (possibleMoves.length > 0) {
            const next = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
            s.targetRing = next.ring;
            s.targetSpoke = next.spoke;
            s.moveType = next.type;
          }
        }
      } else {
        // Calculate travel distance
        let dist = 1;
        if (s.moveType === "spoke" || s.moveType === "diagonal_weave") {
          dist = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
        } else {
          const chord = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          dist = chord * 1.15 || 1;
        }

        const step = (s.speed * dt) / dist;
        s.progress += step;

        let currX: number, currY: number, tangentX: number, tangentY: number;

        if (s.moveType === "spoke" || s.moveType === "diagonal_weave") {
          currX = p1.x + (p2.x - p1.x) * s.progress;
          currY = p1.y + (p2.y - p1.y) * s.progress;
          tangentX = p2.x - p1.x;
          tangentY = p2.y - p1.y;
        } else {
          const q = geometry.getArcControlPoint(s.currentRing, s.currentSpoke, s.targetSpoke);
          const t = s.progress;
          const u = 1 - t;
          currX = u * u * p1.x + 2 * u * t * q.x + t * t * p2.x;
          currY = u * u * p1.y + 2 * u * t * q.y + t * t * p2.y;
          tangentX = 2 * u * (q.x - p1.x) + 2 * t * (p2.x - q.x);
          tangentY = 2 * u * (q.y - p1.y) + 2 * t * (p2.y - q.y);
        }

        // Live silk thread being pulled behind the weaver spider
        setActiveSilk({
          x1: s.anchorPoint.x,
          y1: s.anchorPoint.y,
          x2: currX,
          y2: currY,
          isDrawing: true,
        });

        if (s.progress >= 1) {
          s.progress = 1;
          s.isPaused = true;
          s.pauseEndTime = time + 350 + Math.random() * 200;

          // Lock in the newly spun silk connection
          const newThreadId = `spun-${Date.now()}-${Math.random()}`;
          const newThread: SpunThread = {
            id: newThreadId,
            x1: s.anchorPoint.x,
            y1: s.anchorPoint.y,
            x2: p2.x,
            y2: p2.y,
            opacity: 0.65,
            createdAt: time,
          };

          // Maintain up to 18 dynamic persistent woven cross-threads
          setSpunThreads((prev) => [...prev.slice(-17), newThread]);
          setActiveSilk((prev) => ({ ...prev, isDrawing: false }));
        }

        const angle = (Math.atan2(tangentY, tangentX) * 180) / Math.PI + 90;
        const legPhase = (time * 0.018) % (Math.PI * 2);

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
    <>
      {/* ─── Dynamically Spun Persistent Threads ─── */}
      <g>
        {spunThreads.map((thread) => (
          <line
            key={thread.id}
            x1={thread.x1}
            y1={thread.y1}
            x2={thread.x2}
            y2={thread.y2}
            stroke="#ff5c6a"
            strokeWidth="1.2"
            strokeOpacity={thread.opacity}
            strokeDasharray="4 2"
            strokeLinecap="round"
          />
        ))}
      </g>

      {/* ─── Active Silk Line Dragged in Real-Time ─── */}
      {activeSilk.isDrawing && (
        <g>
          {/* Outer glow line */}
          <line
            x1={activeSilk.x1}
            y1={activeSilk.y1}
            x2={activeSilk.x2}
            y2={activeSilk.y2}
            stroke="#ff3344"
            strokeWidth="2.5"
            strokeOpacity="0.4"
            strokeLinecap="round"
          />
          {/* Core silk line */}
          <line
            x1={activeSilk.x1}
            y1={activeSilk.y1}
            x2={activeSilk.x2}
            y2={activeSilk.y2}
            stroke="#ffffff"
            strokeWidth="1.1"
            strokeOpacity="0.85"
            strokeLinecap="round"
          />
        </g>
      )}

      {/* ─── Weaver Spider SVG (The Web-Extender) ─── */}
      <g
        transform={`translate(${x}, ${y}) rotate(${angle})`}
        style={{
          pointerEvents: "none",
          transition: reducedMotion ? "none" : "transform 0.03s linear",
        }}
      >
        {/* Spinneret Silk Glow at the Abdomen Tip */}
        <circle
          cx="0"
          cy="6.5"
          r="4.5"
          fill="#ff2233"
          fillOpacity="0.85"
          filter="blur(2px)"
        />
        <circle cx="0" cy="6.5" r="1.8" fill="#ffffff" />

        {/* Spider Silhouette */}
        <g>
          {/* Abdomen (Rear Oval) */}
          <ellipse
            cx="0"
            cy="3.5"
            rx="3.8"
            ry="5.2"
            fill="#080407"
            stroke="#ff3b4b"
            strokeWidth="0.85"
          />

          {/* Abdomen Weaver Mark (Glowing Crimson Emblem) */}
          <path
            d="M 0,0.5 L 1.8,3.5 L 0,6.5 L -1.8,3.5 Z"
            fill="#ff3b4b"
            fillOpacity="0.9"
          />

          {/* Cephalothorax (Front Head) */}
          <ellipse
            cx="0"
            cy="-2.8"
            rx="2.6"
            ry="2.4"
            fill="#120609"
            stroke="#ff3b4b"
            strokeWidth="0.85"
          />

          {/* Eyes (Glowing Twin Amber/Red Points) */}
          <circle cx="-0.9" cy="-3.8" r="0.5" fill="#ff7070" />
          <circle cx="0.9" cy="-3.8" r="0.5" fill="#ff7070" />

          {/* ─── 8 Jointed Legs with Walking Wiggle ─── */}
          {/* Left Legs */}
          <path
            d={`M -2,-2.2 Q ${-5.5 + Math.sin(legPhase) * 1.5},-5.5 ${-8.5 + Math.sin(legPhase) * 1.8},-9`}
            stroke="#ff4d5a"
            strokeWidth="0.85"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={`M -2.6,-0.5 Q ${-7.5 - Math.cos(legPhase) * 1.5},-2.2 ${-10.5 - Math.cos(legPhase) * 1.8},-3.5`}
            stroke="#ff4d5a"
            strokeWidth="0.85"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={`M -2.6,2.2 Q ${-7.5 + Math.sin(legPhase) * 1.5},3.2 ${-10.5 + Math.sin(legPhase) * 1.8},4.5`}
            stroke="#ff4d5a"
            strokeWidth="0.85"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={`M -2,4.5 Q ${-5.5 - Math.cos(legPhase) * 1.5},8 ${-8.5 - Math.cos(legPhase) * 1.8},11`}
            stroke="#ff4d5a"
            strokeWidth="0.85"
            fill="none"
            strokeLinecap="round"
          />

          {/* Right Legs */}
          <path
            d={`M 2,-2.2 Q ${5.5 - Math.sin(legPhase) * 1.5},-5.5 ${8.5 - Math.sin(legPhase) * 1.8},-9`}
            stroke="#ff4d5a"
            strokeWidth="0.85"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={`M 2.6,-0.5 Q ${7.5 + Math.cos(legPhase) * 1.5},-2.2 ${10.5 + Math.cos(legPhase) * 1.8},-3.5`}
            stroke="#ff4d5a"
            strokeWidth="0.85"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={`M 2.6,2.2 Q ${7.5 - Math.sin(legPhase) * 1.5},3.2 ${10.5 - Math.sin(legPhase) * 1.8},4.5`}
            stroke="#ff4d5a"
            strokeWidth="0.85"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={`M 2,4.5 Q ${5.5 + Math.cos(legPhase) * 1.5},8 ${8.5 + Math.cos(legPhase) * 1.8},11`}
            stroke="#ff4d5a"
            strokeWidth="0.85"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      </g>
    </>
  );
};
