"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/* ─── Cursor state singleton ─────────────────────────────────────────── */
// Module-level so WebShootButton can also signal the cursor
let _setMode: ((mode: CursorMode) => void) | null = null;

export type CursorMode = "default" | "hover" | "shoot";

export function setCursorMode(mode: CursorMode) {
  _setMode?.(mode);
}

/* ─── Component ──────────────────────────────────────────────────────── */

export const CustomCursor: React.FC = () => {
  const [mode, setMode] = useState<CursorMode>("default");
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Register the setter globally
  useEffect(() => {
    _setMode = setMode;
    return () => { _setMode = null; };
  }, []);

  // Detect modal-open class on body
  useEffect(() => {
    const checkModal = () => {
      setIsModalOpen(document.body.classList.contains("modal-open"));
    };
    checkModal();
    const obs = new MutationObserver(checkModal);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // Detect touch / reduced motion on mount
  useEffect(() => {
    const rmq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const tmq = window.matchMedia("(hover: none)");
    setReducedMotion(rmq.matches);
    setIsTouch(tmq.matches);

    const onRM = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    rmq.addEventListener("change", onRM);
    return () => rmq.removeEventListener("change", onRM);
  }, []);

  // Raw mouse position
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Dot: snappy (tracks almost exactly)
  const dotX = useSpring(mouseX, { stiffness: 600, damping: 38, mass: 0.4 });
  const dotY = useSpring(mouseY, { stiffness: 600, damping: 38, mass: 0.4 });

  // Ring: laggy (spring follows with delay)
  const ringX = useSpring(mouseX, { stiffness: 110, damping: 18, mass: 0.6 });
  const ringY = useSpring(mouseY, { stiffness: 110, damping: 18, mass: 0.6 });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseX.set(e.clientX);
    mouseY.set(e.clientY);
    if (!visible) setVisible(true);
  }, [mouseX, mouseY, visible]);

  const handleMouseLeave = useCallback(() => setVisible(false), []);

  // Hover detection — attach to all interactive elements
  useEffect(() => {
    const selectors = "a, button, [role='button'], input, textarea, select, label[for]";

    const onEnter = () => setMode("hover");
    const onLeave = () => setMode("default");

    const attach = () => {
      document.querySelectorAll(selectors).forEach((el) => {
        el.addEventListener("mouseenter", onEnter);
        el.addEventListener("mouseleave", onLeave);
      });
    };

    // Attach immediately + re-attach on DOM mutations (new buttons added async)
    attach();
    const obs = new MutationObserver(attach);
    obs.observe(document.body, { childList: true, subtree: true });

    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.querySelectorAll(selectors).forEach((el) => {
        el.removeEventListener("mouseenter", onEnter);
        el.removeEventListener("mouseleave", onLeave);
      });
      obs.disconnect();
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [handleMouseMove, handleMouseLeave]);

  // Don't render on touch, reduced motion, or when a modal is active
  if (reducedMotion || isTouch || isModalOpen) return null;

  /* ─── Mode-derived styles ─── */

  // Dot
  const dotSize   = mode === "hover" ? 5  : mode === "shoot" ? 3  : 7;
  const dotColor  = mode === "hover" ? "var(--accent-primary)" : mode === "shoot" ? "var(--accent-primary)" : "rgba(245,247,251,0.95)";
  const dotShadow = mode === "hover" ? "0 0 8px var(--accent-primary)" : "none";

  // Ring
  const ringSize   = mode === "hover" ? 44 : mode === "shoot" ? 20 : 28;
  const ringBorder = mode === "hover"
    ? "2px solid var(--accent-primary)"
    : mode === "shoot"
    ? "1.5px solid rgba(224,33,47,0.7)"
    : "1.5px solid rgba(245,247,251,0.45)";
  const ringScaleX = mode === "shoot" ? 3.2 : 1;
  const ringScaleY = mode === "shoot" ? 0.35 : 1;
  const ringBg     = mode === "hover" ? "rgba(224,33,47,0.08)" : "transparent";
  const ringBlur   = mode === "hover" ? "0 0 16px rgba(224,33,47,0.3)" : "none";

  const baseTransition = { type: "spring" as const, stiffness: 400, damping: 30 };
  const shootTransition = { type: "spring" as const, stiffness: 500, damping: 25 };

  return (
    <>
      {/* ── Dot ── */}
      <motion.div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          x: dotX,
          y: dotY,
          translateX: "-50%",
          translateY: "-50%",
          zIndex: 9999,
          pointerEvents: "none",
          width: dotSize,
          height: dotSize,
          borderRadius: "50%",
          backgroundColor: dotColor,
          boxShadow: dotShadow,
          opacity: visible ? 1 : 0,
        }}
        animate={{
          width: dotSize,
          height: dotSize,
          backgroundColor: dotColor,
          boxShadow: dotShadow,
        }}
        transition={baseTransition}
      />

      {/* ── Ring ── */}
      <motion.div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          x: ringX,
          y: ringY,
          translateX: "-50%",
          translateY: "-50%",
          zIndex: 9998,
          pointerEvents: "none",
          width: ringSize,
          height: ringSize,
          borderRadius: mode === "shoot" ? "4px" : "50%",
          border: ringBorder,
          background: ringBg,
          boxShadow: ringBlur,
          scaleX: ringScaleX,
          scaleY: ringScaleY,
          opacity: visible ? 1 : 0,
        }}
        animate={{
          width: ringSize,
          height: ringSize,
          borderRadius: mode === "shoot" ? "4px" : "50%",
          border: ringBorder,
          background: ringBg,
          boxShadow: ringBlur,
          scaleX: ringScaleX,
          scaleY: ringScaleY,
        }}
        transition={mode === "shoot" ? shootTransition : baseTransition}
      />
    </>
  );
};
