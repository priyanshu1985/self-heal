"use client";

import React, { useRef, useCallback, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { setCursorMode } from "@/components/ui/CustomCursor";

export type ButtonStatus = "idle" | "loading" | "success" | "error";

interface WebShootButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<any>;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  title?: string;
  isLoading?: boolean;
  status?: ButtonStatus;
  successText?: string;
  errorText?: string;
  loadingText?: string;
  /** Position of the SpinneretGlyph anchor (default: button's own center) */
  anchorRef?: React.RefObject<HTMLElement | null>;
}

/**
 * WebShootButton — wraps any trigger/CTA with stateful feedback and the web-shoot effect.
 * Three visual states directly inside the button:
 * 1. idle: normal label
 * 2. loading: spinner + pulse + disabled
 * 3. result: checkmark + success tint (green/blue) or X + red tint before reverting
 */
export const WebShootButton: React.FC<WebShootButtonProps> = ({
  children,
  onClick,
  className = "",
  style,
  disabled,
  type = "button",
  title,
  isLoading = false,
  status: controlledStatus,
  successText = "Success!",
  errorText = "Failed",
  loadingText,
}) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const lineRef = useRef<SVGLineElement | null>(null);
  const animationRef = useRef<number | null>(null);

  const [internalStatus, setInternalStatus] = useState<ButtonStatus>("idle");

  const currentStatus: ButtonStatus = controlledStatus !== undefined
    ? controlledStatus
    : isLoading
    ? "loading"
    : internalStatus;

  const isExecuting = currentStatus === "loading";
  const isSuccess = currentStatus === "success";
  const isError = currentStatus === "error";

  const fireWebShoot = useCallback((rect: DOMRect) => {
    setCursorMode("shoot");

    const existing = document.getElementById("web-shoot-overlay");
    if (existing) existing.remove();
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;

    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
    const dist = 140 + Math.random() * 120;
    const endX = startX + Math.cos(angle) * dist;
    const endY = startY + Math.sin(angle) * dist;

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

    const duration = 260;
    const fadeStart = duration + 80;
    const fadeDuration = 200;
    const total = fadeStart + fadeDuration;

    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;

      if (elapsed <= duration) {
        const progress = elapsed / duration;
        const eased = 1 - Math.pow(1 - progress, 3);
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
        setCursorMode("default");
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, []);

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || isExecuting || isSuccess || isError) return;

      const prefersReduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!prefersReduced && btnRef.current) {
        fireWebShoot(btnRef.current.getBoundingClientRect());
      }

      if (onClick) {
        const result = onClick(e) as unknown;
        if (result && typeof (result as Promise<any>).then === "function") {
          setInternalStatus("loading");
          try {
            await (result as Promise<any>);
            setInternalStatus("success");
            setTimeout(() => {
              setInternalStatus("idle");
            }, 1100);
          } catch {
            setInternalStatus("error");
            setTimeout(() => {
              setInternalStatus("idle");
            }, 1200);
          }
        }
      }
    },
    [disabled, isExecuting, isSuccess, isError, fireWebShoot, onClick]
  );

  let statusBg = "";
  let statusBorder = "";
  let statusColor = "";
  let statusShadow = "";

  if (isSuccess) {
    statusBg = "rgba(34, 197, 94, 0.22)";
    statusBorder = "1px solid rgba(34, 197, 94, 0.6)";
    statusColor = "#86efac";
    statusShadow = "0 0 16px rgba(34, 197, 94, 0.35)";
  } else if (isError) {
    statusBg = "rgba(239, 68, 68, 0.25)";
    statusBorder = "1px solid rgba(239, 68, 68, 0.6)";
    statusColor = "#fca5a5";
    statusShadow = "0 0 16px rgba(239, 68, 68, 0.35)";
  }

  return (
    <button
      ref={btnRef}
      type={type}
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        ...(isSuccess || isError
          ? {
              backgroundColor: statusBg,
              border: statusBorder,
              color: statusColor,
              boxShadow: statusShadow,
            }
          : {}),
        ...style,
      }}
      disabled={disabled || isExecuting || isSuccess || isError}
      title={title}
      onClick={handleClick}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isExecuting ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
          >
            <span
              style={{
                display: "inline-block",
                width: "12px",
                height: "12px",
                border: "2px solid currentColor",
                borderRightColor: "transparent",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
              }}
            />
            <span>{loadingText || "Executing…"}</span>
          </motion.span>
        ) : isSuccess ? (
          <motion.span
            key="success"
            initial={{ opacity: 0, scale: 0.8, y: 3 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.18, type: "spring", stiffness: 500 }}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem" }}
          >
            <span style={{ fontWeight: 900 }}>✓</span>
            <span>{successText}</span>
          </motion.span>
        ) : isError ? (
          <motion.span
            key="error"
            initial={{ opacity: 0, scale: 0.8, y: 3 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.18, type: "spring", stiffness: 500 }}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem" }}
          >
            <span style={{ fontWeight: 900 }}>✕</span>
            <span>{errorText}</span>
          </motion.span>
        ) : (
          <motion.span
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
};
