"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { CrawlingSpider, WebGeometry, WebNode } from "./CrawlingSpider";
import { WeaverSpider } from "./WeaverSpider";

export const SpiderWebBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 750 });
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [windTime, setWindTime] = useState(0);

  // Viewport resize & motion preferences
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
        const h = Math.max(400, rect.height || 750);
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

  // Ambient wind/breeze oscillation loop
  useEffect(() => {
    if (reducedMotion) return;

    let animId: number;
    let start = performance.now();

    const loop = (now: number) => {
      setWindTime((now - start) * 0.001);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [reducedMotion]);

  // Compute Base Radial Geometry
  const baseGeometry = useMemo(() => {
    const { width, height } = dimensions;
    const cx = width / 2;
    // Upper-biased origin to match hero composition
    const cy = height * 0.38;

    const isMobile = width < 640;
    const numSpokes = isMobile ? 12 : 16;
    const numRings = isMobile ? 6 : 8;
    const maxRadius = Math.hypot(width, height) * 0.65;

    const spokeAngles: number[] = [];
    for (let i = 0; i < numSpokes; i++) {
      spokeAngles.push((i * (2 * Math.PI)) / numSpokes - Math.PI / 2);
    }

    const ringRadii: number[] = [0];
    for (let r = 1; r <= numRings; r++) {
      const t = r / numRings;
      ringRadii.push(maxRadius * Math.pow(t, 0.84));
    }

    const baseNodes: WebNode[][] = [];
    baseNodes.push(
      spokeAngles.map((_, spoke) => ({
        ring: 0,
        spoke,
        x: cx,
        y: cy,
      }))
    );

    for (let r = 1; r <= numRings; r++) {
      const radius = ringRadii[r];
      const ringNodes: WebNode[] = [];
      for (let s = 0; s < numSpokes; s++) {
        const angle = spokeAngles[s];
        ringNodes.push({
          ring: r,
          spoke: s,
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
        });
      }
      baseNodes.push(ringNodes);
    }

    return {
      cx,
      cy,
      numSpokes,
      numRings,
      ringRadii,
      baseNodes,
    };
  }, [dimensions]);

  // Dynamic Breeze-Displaced Web Geometry
  const dynamicGeometry: WebGeometry = useMemo(() => {
    const { cx, cy, numSpokes, numRings, ringRadii, baseNodes } = baseGeometry;

    // Displace each node subtly according to wind harmonic waves
    const nodes: WebNode[][] = baseNodes.map((ringNodes, r) => {
      if (r === 0 || reducedMotion) return ringNodes;

      const amp = (r / numRings) * 4.5; // Outer threads sway up to 4.5px in gentle breeze
      const t = windTime;

      return ringNodes.map((node, s) => {
        // Multi-frequency organic wind drift
        const dx =
          Math.sin(t * 1.15 + r * 0.65 + s * 0.85) * amp +
          Math.cos(t * 0.45 + s * 1.3) * (amp * 0.35);
        const dy =
          Math.cos(t * 0.95 + r * 0.75 + s * 0.6) * amp +
          Math.sin(t * 0.55 + r * 1.15) * (amp * 0.35);

        return {
          ring: r,
          spoke: s,
          x: node.x + dx,
          y: node.y + dy,
        };
      });
    });

    // Helper for wind-breathing bowed catenary control point
    const getArcControlPoint = (ring: number, spoke1: number, spoke2: number) => {
      const p1 = nodes[ring]?.[spoke1] || { x: cx, y: cy };
      const p2 = nodes[ring]?.[spoke2] || { x: cx, y: cy };

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      // Gentle wind flutter in the catenary sag
      const t = windTime;
      const sagFlutter = Math.sin(t * 1.25 + ring * 0.6 + spoke1 * 0.8) * 0.022;
      const sag = Math.max(0.08, Math.min(0.18, 0.12 + sagFlutter));

      const qx = midX * (1 - sag) + cx * sag;
      const qy = midY * (1 - sag) + cy * sag;

      return { x: qx, y: qy };
    };

    return {
      cx,
      cy,
      numSpokes,
      numRings,
      ringRadii,
      nodes,
      getArcControlPoint,
    };
  }, [baseGeometry, windTime, reducedMotion]);

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

  const { cx, cy, numSpokes, numRings, nodes, getArcControlPoint } = dynamicGeometry;

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
        minHeight: "500px",
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
        maskImage:
          "radial-gradient(ellipse at 50% 40%, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.78) 50%, rgba(0,0,0,0.98) 100%)",
        WebkitMaskImage:
          "radial-gradient(ellipse at 50% 40%, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.78) 50%, rgba(0,0,0,0.98) 100%)",
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
          {/* Ambient red center glow */}
          <radialGradient id="radial-web-ambient" cx="50%" cy="38%" r="62%">
            <stop offset="0%" stopColor="#e0212f" stopOpacity="0.16" />
            <stop offset="35%" stopColor="#ef4444" stopOpacity="0.07" />
            <stop offset="70%" stopColor="#05070d" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          {/* SVG Glow Filter for Primary Spokes */}
          <filter id="web-spoke-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* SVG Glow Filter for Arcs */}
          <filter id="web-arc-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Central Hub Node Filter */}
          <filter id="web-hub-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient Radial Fill */}
        <rect width="100%" height="100%" fill="url(#radial-web-ambient)" />

        {/* ─── Radiating Spoke Lines with Breeze Sway ─── */}
        <g filter="url(#web-spoke-glow)">
          {Array.from({ length: numSpokes }).map((_, s) => {
            const outerNode = nodes[numRings]?.[s];
            if (!outerNode) return null;
            const isPrimary = s % 2 === 0;
            return (
              <line
                key={`spoke-${s}`}
                x1={cx}
                y1={cy}
                x2={outerNode.x}
                y2={outerNode.y}
                stroke="#ef4444"
                strokeWidth={isPrimary ? 1.3 : 0.85}
                strokeOpacity={isPrimary ? 0.45 : 0.28}
                strokeLinecap="round"
              />
            );
          })}
        </g>

        {/* ─── Concentric Bowed Ring Arcs with Wind Flutter ─── */}
        <g filter="url(#web-arc-glow)">
          {Array.from({ length: numRings }).map((_, rIdx) => {
            const ring = rIdx + 1;
            const ringOpacity = 0.48 - (ring / (numRings + 1)) * 0.2;
            const ringWidth = ring <= 3 ? 1.1 : 0.75;

            return (
              <g key={`ring-group-${ring}`}>
                {Array.from({ length: numSpokes }).map((_, s) => {
                  const nextS = (s + 1) % numSpokes;
                  const p1 = nodes[ring]?.[s];
                  const p2 = nodes[ring]?.[nextS];
                  if (!p1 || !p2) return null;

                  const q = getArcControlPoint(ring, s, nextS);
                  const pathData = `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} Q ${q.x.toFixed(1)} ${q.y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;

                  return (
                    <path
                      key={`arc-${ring}-${s}`}
                      d={pathData}
                      stroke="#ef4444"
                      strokeWidth={ringWidth}
                      strokeOpacity={ringOpacity}
                      fill="none"
                      strokeLinecap="round"
                    />
                  );
                })}
              </g>
            );
          })}
        </g>

        {/* ─── Auxiliary Spiral Micro-Weave Lines ─── */}
        <g opacity="0.32">
          {Array.from({ length: Math.max(1, numRings - 2) }).map((_, rIdx) => {
            const ring = rIdx + 2;
            return Array.from({ length: Math.floor(numSpokes / 2) }).map((_, sIdx) => {
              const s = sIdx * 2;
              const nextS = (s + 1) % numSpokes;
              const p1 = nodes[ring]?.[s];
              const p2 = nodes[ring + 1]?.[nextS];
              if (!p1 || !p2) return null;

              return (
                <line
                  key={`micro-spiral-${ring}-${s}`}
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="#ff5566"
                  strokeWidth="0.65"
                  strokeOpacity="0.3"
                  strokeDasharray="2 2"
                />
              );
            });
          })}
        </g>

        {/* ─── Spoke / Ring Intersection Node Dots ─── */}
        <g>
          {nodes.slice(1).map((ringNodes, r) =>
            ringNodes.map((node, s) => (
              <circle
                key={`node-${r + 1}-${s}`}
                cx={node.x}
                cy={node.y}
                r={1.7}
                fill="#ff4d5a"
                fillOpacity={0.65}
              />
            ))
          )}
        </g>

        {/* ─── Center Hub Glowing Core ─── */}
        <g filter="url(#web-hub-glow)">
          <circle cx={cx} cy={cy} r={5.5} fill="#ef4444" fillOpacity={0.85} />
          <circle cx={cx} cy={cy} r={2.6} fill="#ffffff" />
        </g>

        {/* ─── Spider 1: Patrolling Scout Spider ─── */}
        <CrawlingSpider geometry={dynamicGeometry} reducedMotion={reducedMotion} />

        {/* ─── Spider 2: The Silk-Weaver Spider (Extending Web Connections) ─── */}
        <WeaverSpider geometry={dynamicGeometry} reducedMotion={reducedMotion} />
      </svg>
    </div>
  );
};
