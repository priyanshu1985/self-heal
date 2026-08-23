"use client";

import React, { useRef, useCallback } from "react";
import ReactDOM from "react-dom";

interface WebShootButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  title?: string;
  /** Position of the SpinneretGlyph anchor (default: button's own center) */
  anchorRef?: React.RefObject<HTMLElement | null>;
}

/**
 * WebShootButton — wraps any trigger/CTA.
 * On click, fires an animated SVG line from the button's center toward
 * a randomly spread target point, then fades. Pure CSS stroke-dashoffset
 * animation. Rendered in a fixed portal overlay so it never clips.
 */
export const WebShootButton: React.FC<WebShootButtonProps> = ({
  children,
  onClick,
  className = "",
  style,
  disabled,
  type = "button",
  title,
}) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const lineRef = useRef<SVGLineElement | null>(null);
  const animationRef = useRef<number | null>(null);

  const fireWebShoot = useCallback((rect: DOMRect) => {
    // Tear down any existing overlay
    const existing = document.getElementById("web-shoot-overlay");
    if (existing) existing.remove();
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;

    // Target: a random point 120–260px away in a forward arc
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
    const dist = 140 + Math.random() * 120;
    const endX = startX + Math.cos(angle) * dist;
    const endY = startY + Math.sin(angle) * dist;

    // Create SVG overlay
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.id = "web-shoot-overlay";
    svg.setAttribute("style", [
      "position:fixed",
      "inset:0",
      "width:100vw",
      "height:100vh",
      "pointer-events:none",
      "z-index:9999",
      "overflow:visible",
    ].join(";"));

    // Main thread line
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(startX));
    line.setAttribute("y1", String(startY));
    line.setAttribute("x2", String(endX));
    line.setAttribute("y2", String(endY));
    line.setAttribute("stroke", "#e0212f");
    line.setAttribute("stroke-width", "1.5");
    line.setAttribute("stroke-linecap", "round");

    const length = Math.hypot(endX - startX, endY - startY);
    line.setAttribute("stroke-dasharray", String(length));
    line.setAttribute("stroke-dashoffset", String(length));

    // A secondary thinner thread with slight offset for web-silk effect
    const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    const off = 2;
    line2.setAttribute("x1", String(startX + off));
    line2.setAttribute("y1", String(startY - off));
    line2.setAttribute("x2", String(endX + off));
    line2.setAttribute("y2", String(endY - off));
    line2.setAttribute("stroke", "#3b6ff5");
    line2.setAttribute("stroke-width", "0.75");
    line2.setAttribute("stroke-linecap", "round");
    line2.setAttribute("stroke-dasharray", String(length));
    line2.setAttribute("stroke-dashoffset", String(length));

    // Terminus dot
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", String(endX));
    dot.setAttribute("cy", String(endY));
    dot.setAttribute("r", "3");
    dot.setAttribute("fill", "#e0212f");
    dot.setAttribute("opacity", "0");

    svg.appendChild(line2);
    svg.appendChild(line);
    svg.appendChild(dot);
    document.body.appendChild(svg);

    svgRef.current = svg;
    lineRef.current = line;

    const duration = 260; // ms — ease-out shoot
    const fadeStart = duration + 80;
    const fadeDuration = 200;
    const total = fadeStart + fadeDuration;

    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;

      if (elapsed <= duration) {
        // Draw phase — ease-out
        const progress = elapsed / duration;
        const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out
        const offset = length * (1 - eased);
        line.setAttribute("stroke-dashoffset", String(offset));
        line2.setAttribute("stroke-dashoffset", String(offset));
        if (eased > 0.85) {
          dot.setAttribute("opacity", String((eased - 0.85) / 0.15));
        }
      } else if (elapsed <= fadeStart) {
        line.setAttribute("stroke-dashoffset", "0");
        line2.setAttribute("stroke-dashoffset", "0");
        dot.setAttribute("opacity", "1");
      } else {
        // Fade phase
        const fadeProgress = (elapsed - fadeStart) / fadeDuration;
        const opacity = 1 - fadeProgress;
        svg.style.opacity = String(Math.max(0, opacity));
        if (opacity <= 0) {
          svg.remove();
          return;
        }
      }

      if (elapsed < total) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        svg.remove();
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      // Check for reduced motion preference
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!prefersReduced && btnRef.current) {
        fireWebShoot(btnRef.current.getBoundingClientRect());
      }
      onClick?.(e);
    },
    [disabled, fireWebShoot, onClick]
  );

  return (
    <button
      ref={btnRef}
      type={type}
      className={className}
      style={style}
      disabled={disabled}
      title={title}
      onClick={handleClick}
    >
      {children}
    </button>
  );
};
