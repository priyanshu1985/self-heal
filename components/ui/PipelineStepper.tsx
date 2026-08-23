"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PipelineStage } from "@/lib/orchestrator/pipeline";

export interface StepperState {
  currentStage: PipelineStage | "idle" | "error";
  message: string;
  isDrifted?: boolean;
  extra?: any;
}

interface PipelineStepperProps {
  state: StepperState;
  isVisible: boolean;
  onDismiss?: () => void;
}

interface StepDefinition {
  id: PipelineStage;
  label: string;
  description: string;
  isConditional?: boolean;
}

const ALL_STEPS: StepDefinition[] = [
  { id: "triggering", label: "Triggering", description: "Dispatching Bright Data scraper" },
  { id: "scraping", label: "Scraping", description: "Extracting live snapshot DOM" },
  { id: "validating", label: "Validating", description: "Evaluating Zod schema rules" },
  { id: "checking_drift", label: "Checking Drift", description: "Analyzing field integrity" },
  { id: "healing", label: "AI Healing", description: "Generating self-healing fix", isConditional: true },
  { id: "done", label: "Complete", description: "Pipeline finished" },
];

const STAGE_ORDER: Record<PipelineStage, number> = {
  triggering: 1,
  scraping: 2,
  validating: 3,
  checking_drift: 4,
  healing: 5,
  done: 6,
};

export const PipelineStepper: React.FC<PipelineStepperProps> = ({
  state,
  isVisible,
  onDismiss,
}) => {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const currentOrder = state.currentStage === "idle"
    ? 0
    : state.currentStage === "error"
    ? -1
    : STAGE_ORDER[state.currentStage] || 0;

  // If drift was detected or healing active, include the healing step; otherwise skip healing in visual line if completed healthy
  const includeHealing = Boolean(state.isDrifted || state.currentStage === "healing");
  const visibleSteps = ALL_STEPS.filter((s) => !s.isConditional || includeHealing);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, height: 0, y: -8 }}
          animate={reducedMotion ? { opacity: 1 } : { opacity: 1, height: "auto", y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, height: 0, y: -8 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          style={{ overflow: "hidden", width: "100%" }}
        >
          <div
            style={{
              marginTop: "0.875rem",
              padding: "1.125rem 1.25rem",
              borderRadius: "10px",
              background: "rgba(5, 8, 16, 0.9)",
              border: "1px solid rgba(59, 111, 245, 0.28)",
              boxShadow: "0 8px 24px -6px rgba(0, 0, 0, 0.6), inset 0 0 16px rgba(59, 111, 245, 0.04)",
              position: "relative",
            }}
          >
            {/* Header / Active Stage Title */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor:
                      state.currentStage === "error"
                        ? "var(--status-drifted)"
                        : state.currentStage === "done"
                        ? (state.isDrifted ? "var(--status-drifted)" : "var(--status-healthy)")
                        : "var(--accent-secondary)",
                    boxShadow: `0 0 10px ${
                      state.currentStage === "error"
                        ? "var(--status-drifted)"
                        : state.currentStage === "done"
                        ? (state.isDrifted ? "var(--status-drifted)" : "var(--status-healthy)")
                        : "var(--accent-secondary)"
                    }`,
                    animation: state.currentStage !== "done" && state.currentStage !== "error" ? "hub-pulse 1.4s infinite" : "none",
                  }}
                />
                <span style={{ fontSize: "0.8125rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "#f5f7fb" }}>
                  Live Orchestration Pipeline
                </span>
              </div>

              {state.currentStage === "done" && onDismiss && (
                <button
                  onClick={onDismiss}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-muted)",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    padding: "0.125rem 0.375rem",
                    borderRadius: "4px",
                  }}
                >
                  ✕ Close
                </button>
              )}
            </div>

            {/* Stepper Horizontal Track */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${visibleSteps.length}, 1fr)`,
                position: "relative",
                gap: "0.25rem",
                alignItems: "flex-start",
              }}
            >
              {visibleSteps.map((step, idx) => {
                const stepOrder = STAGE_ORDER[step.id];
                const isCompleted = state.currentStage === "done" || currentOrder > stepOrder;
                const isCurrent = state.currentStage === step.id;
                const isPending = currentOrder < stepOrder;
                const isFailed = state.currentStage === "error" && isCurrent;

                let dotColor = "var(--border-subtle)";
                let dotBorder = "rgba(255,255,255,0.15)";
                let textColor = "var(--text-muted)";
                let glow = "none";

                if (isCompleted) {
                  dotColor = step.id === "healing" ? "var(--status-healing)" : "var(--status-healthy)";
                  dotBorder = dotColor;
                  textColor = "#e2e8f0";
                  glow = `0 0 10px ${dotColor}60`;
                } else if (isCurrent) {
                  dotColor = step.id === "healing" ? "var(--status-healing)" : "var(--accent-primary)";
                  dotBorder = "#ffffff";
                  textColor = "#ffffff";
                  glow = `0 0 14px ${dotColor}`;
                } else if (isFailed) {
                  dotColor = "var(--status-drifted)";
                  dotBorder = dotColor;
                  textColor = "#fca5a5";
                  glow = "0 0 12px var(--status-drifted)";
                }

                return (
                  <div
                    key={step.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      position: "relative",
                    }}
                  >
                    {/* Connecting track line between nodes */}
                    {idx < visibleSteps.length - 1 && (
                      <div
                        style={{
                          position: "absolute",
                          top: "clamp(9px, 2.5vw, 11px)",
                          left: "50%",
                          width: "100%",
                          height: "2px",
                          background:
                            isCompleted
                              ? "linear-gradient(to right, var(--status-healthy), rgba(59,130,246,0.3))"
                              : "rgba(255,255,255,0.08)",
                          zIndex: 0,
                          transition: "background 0.3s ease",
                        }}
                      />
                    )}

                    {/* Step Node Dot */}
                    <div
                      style={{
                        width: "clamp(18px, 4vw, 22px)",
                        height: "clamp(18px, 4vw, 22px)",
                        borderRadius: "50%",
                        backgroundColor: isCurrent ? dotColor : isCompleted ? `${dotColor}25` : "rgba(10, 13, 23, 0.9)",
                        border: `2px solid ${dotBorder}`,
                        boxShadow: glow,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "clamp(0.5625rem, 1.8vw, 0.6875rem)",
                        fontWeight: 800,
                        color: isCurrent ? "#ffffff" : isCompleted ? dotColor : "var(--text-muted)",
                        zIndex: 1,
                        transition: "all 0.25s ease",
                        marginBottom: "0.25rem",
                      }}
                    >
                      {isCompleted ? (
                        "✓"
                      ) : isFailed ? (
                        "✕"
                      ) : isCurrent ? (
                        <span
                          style={{
                            display: "inline-block",
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            backgroundColor: "#ffffff",
                            animation: "hub-pulse 1.2s infinite",
                          }}
                        />
                      ) : (
                        idx + 1
                      )}
                    </div>

                    {/* Step Name */}
                    <span
                      style={{
                        fontSize: "clamp(0.625rem, 1.6vw, 0.75rem)",
                        fontWeight: isCurrent ? 700 : 600,
                        color: textColor,
                        lineHeight: 1.15,
                        wordBreak: "break-word",
                        transition: "color 0.2s ease",
                        maxWidth: "100%",
                      }}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Current Real-time Log Message */}
            <div
              style={{
                marginTop: "0.875rem",
                padding: "0.5rem 0.75rem",
                borderRadius: "6px",
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--border-subtle)",
                fontSize: "0.75rem",
                fontFamily: "ui-monospace, monospace",
                color:
                  state.currentStage === "error"
                    ? "#fca5a5"
                    : state.currentStage === "done" && state.isDrifted
                    ? "#fca5a5"
                    : state.currentStage === "done"
                    ? "#93c5fd"
                    : "#38bdf8",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span style={{ opacity: 0.7 }}>❯</span>
              <span style={{ flex: 1 }}>{state.message || "Initializing pipeline executor…"}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
