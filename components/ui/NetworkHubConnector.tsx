"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import { SpinneretGlyph } from "./SpinneretGlyph";

interface CollectorCardRef {
  id: string;
  el: HTMLElement;
}

interface NetworkHubConnectorProps {
  collectorIds: string[];
}

/**
 * NetworkHubConnector — portal-rendered SVG layer.
 * Draws thin animated threads from each collector card to a
 * fixed network hub glyph in the bottom-right corner.
 * pointer-events: none — never blocks interaction.
 */
export const NetworkHubConnector: React.FC<NetworkHubConnectorProps> = ({
  collectorIds,
}) => {
  const [mounted, setMounted] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const draw = useCallback(() => {
    if (!svgRef.current) return;
    const svg = svgRef.current;

    // Clear existing threads (keep hub glyph element)
    const lines = svg.querySelectorAll(".hub-thread");
    lines.forEach((l) => l.remove());

    const hx = window.innerWidth - 48;
    const hy = window.innerHeight - 48;

    collectorIds.forEach((id, index) => {
      const card = document.querySelector(`[data-collector-id="${id}"]`) as HTMLElement | null;
      if (!card) return;

      const rect = card.getBoundingClientRect();
      // Only draw if card is in viewport
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;

      const startX = rect.right - 12;
      const startY = rect.top + rect.height / 2;

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.classList.add("hub-thread");
      line.setAttribute("x1", String(startX));
      line.setAttribute("y1", String(startY));
      line.setAttribute("x2", String(hx));
      line.setAttribute("y2", String(hy));

      // Alternate blue/dim-red threads
      const isRed = index % 5 === 0;
      line.setAttribute("stroke", isRed ? "rgba(224,33,47,0.25)" : "rgba(59,111,245,0.2)");
      line.setAttribute("stroke-width", "0.75");
      line.setAttribute("stroke-dasharray", "3 6");
      line.setAttribute("stroke-linecap", "round");

      svg.insertBefore(line, svg.firstChild);
    });

    frameRef.current = requestAnimationFrame(draw);
  }, [collectorIds]);

  useEffect(() => {
    // Small delay to let cards mount and measure
    const timer = setTimeout(() => {
      frameRef.current = requestAnimationFrame(draw);
    }, 400);

    // Pause on reduced motion
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches && frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      // Draw once static
      setTimeout(draw, 600);
    }

    return () => {
      clearTimeout(timer);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [draw]);

  if (!mounted) return null;

  const portalTarget = document.body;

  return ReactDOM.createPortal(
    <svg
      ref={svgRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 10,
        overflow: "visible",
      }}
      aria-hidden="true"
    >
      {/* Hub glyph anchor */}
      <foreignObject
        x={window.innerWidth - 60}
        y={window.innerHeight - 60}
        width="36"
        height="36"
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            background: "rgba(10,13,23,0.85)",
            border: "1px solid rgba(59,111,245,0.3)",
            backdropFilter: "blur(8px)",
          }}
        >
          <SpinneretGlyph size={22} glowing />
        </div>
      </foreignObject>
    </svg>,
    portalTarget
  );
};
