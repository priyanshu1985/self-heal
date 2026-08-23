"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export type ToastType = "healthy" | "drift" | "healing" | "resolved" | "error" | "info";

export interface ToastAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  details?: string[];
  action?: ToastAction;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id">) => string;
  removeToast: (id: string) => void;
  toast: {
    healthy: (title: string, message: string, opts?: Partial<ToastItem>) => string;
    drift: (title: string, message: string, opts?: Partial<ToastItem>) => string;
    healing: (title: string, message: string, opts?: Partial<ToastItem>) => string;
    resolved: (title: string, message: string, opts?: Partial<ToastItem>) => string;
    error: (title: string, message: string, opts?: Partial<ToastItem>) => string;
    info: (title: string, message: string, opts?: Partial<ToastItem>) => string;
  };
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
};

// Global singleton for calling toast outside React tree if needed
let _globalAddToast: ((toast: Omit<ToastItem, "id">) => string) | null = null;
export const toast = {
  healthy: (title: string, message: string, opts?: Partial<ToastItem>) =>
    _globalAddToast?.({ type: "healthy", title, message, ...opts }) ?? "",
  drift: (title: string, message: string, opts?: Partial<ToastItem>) =>
    _globalAddToast?.({ type: "drift", title, message, ...opts }) ?? "",
  healing: (title: string, message: string, opts?: Partial<ToastItem>) =>
    _globalAddToast?.({ type: "healing", title, message, ...opts }) ?? "",
  resolved: (title: string, message: string, opts?: Partial<ToastItem>) =>
    _globalAddToast?.({ type: "resolved", title, message, ...opts }) ?? "",
  error: (title: string, message: string, opts?: Partial<ToastItem>) =>
    _globalAddToast?.({ type: "error", title, message, ...opts }) ?? "",
  info: (title: string, message: string, opts?: Partial<ToastItem>) =>
    _globalAddToast?.({ type: "info", title, message, ...opts }) ?? "",
};

const TOAST_THEMES: Record<ToastType, {
  accentColor: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
  icon: string;
  badgeText: string;
}> = {
  healthy: {
    accentColor: "var(--status-healthy)",
    bgColor: "rgba(10, 18, 36, 0.95)",
    borderColor: "rgba(59, 130, 246, 0.4)",
    glowColor: "rgba(59, 130, 246, 0.2)",
    icon: "✓",
    badgeText: "SCHEMA HEALTHY",
  },
  drift: {
    accentColor: "var(--status-drifted)",
    bgColor: "rgba(24, 10, 14, 0.95)",
    borderColor: "rgba(239, 68, 68, 0.4)",
    glowColor: "rgba(239, 68, 68, 0.25)",
    icon: "⚡",
    badgeText: "SCHEMA DRIFT",
  },
  healing: {
    accentColor: "var(--status-healing)",
    bgColor: "rgba(20, 10, 30, 0.95)",
    borderColor: "rgba(177, 59, 245, 0.4)",
    glowColor: "rgba(177, 59, 245, 0.25)",
    icon: "✨",
    badgeText: "AI PROPOSAL READY",
  },
  resolved: {
    accentColor: "var(--status-resolved)",
    bgColor: "rgba(8, 20, 26, 0.95)",
    borderColor: "rgba(34, 211, 238, 0.4)",
    glowColor: "rgba(34, 211, 238, 0.2)",
    icon: "★",
    badgeText: "PATCH RESOLVED",
  },
  error: {
    accentColor: "var(--status-drifted)",
    bgColor: "rgba(24, 10, 14, 0.95)",
    borderColor: "rgba(239, 68, 68, 0.4)",
    glowColor: "rgba(239, 68, 68, 0.25)",
    icon: "✕",
    badgeText: "EXECUTION ERROR",
  },
  info: {
    accentColor: "var(--accent-secondary)",
    bgColor: "rgba(10, 13, 23, 0.95)",
    borderColor: "rgba(59, 111, 245, 0.35)",
    glowColor: "rgba(59, 111, 245, 0.15)",
    icon: "◈",
    badgeText: "SYSTEM UPDATE",
  },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((item: Omit<ToastItem, "id">) => {
    const id = "toast_" + Math.random().toString(36).slice(2, 9) + "_" + Date.now();
    const duration = item.duration ?? 5500;

    const newToast: ToastItem = { ...item, id, duration };
    setToasts((prev) => [...prev.slice(-4), newToast]); // Keep up to 5 stacked toasts

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  useEffect(() => {
    _globalAddToast = addToast;
    return () => {
      _globalAddToast = null;
    };
  }, [addToast]);

  const helpers = {
    healthy: (title: string, message: string, opts?: Partial<ToastItem>) =>
      addToast({ type: "healthy", title, message, ...opts }),
    drift: (title: string, message: string, opts?: Partial<ToastItem>) =>
      addToast({ type: "drift", title, message, ...opts }),
    healing: (title: string, message: string, opts?: Partial<ToastItem>) =>
      addToast({ type: "healing", title, message, ...opts }),
    resolved: (title: string, message: string, opts?: Partial<ToastItem>) =>
      addToast({ type: "resolved", title, message, ...opts }),
    error: (title: string, message: string, opts?: Partial<ToastItem>) =>
      addToast({ type: "error", title, message, ...opts }),
    info: (title: string, message: string, opts?: Partial<ToastItem>) =>
      addToast({ type: "info", title, message, ...opts }),
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, toast: helpers }}>
      {children}

      {/* Position-anchored bottom-right stack */}
      <aside
        aria-live="polite"
        aria-label="Notifications"
        style={{
          position: "fixed",
          bottom: "max(1rem, env(safe-area-inset-bottom, 1rem))",
          right: "max(1rem, env(safe-area-inset-right, 1rem))",
          zIndex: 9990,
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          maxWidth: "400px",
          width: "calc(100vw - 2rem)",
          pointerEvents: "none",
        }}
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => {
            const theme = TOAST_THEMES[t.type] || TOAST_THEMES.info;

            return (
              <motion.div
                key={t.id}
                layout={!reducedMotion}
                initial={
                  reducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: 30, scale: 0.92, filter: "blur(4px)" }
                }
                animate={
                  reducedMotion
                    ? { opacity: 1 }
                    : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
                }
                exit={
                  reducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, x: 60, scale: 0.9, transition: { duration: 0.2 } }
                }
                transition={{
                  type: "spring",
                  stiffness: 450,
                  damping: 32,
                  mass: 0.6,
                }}
                style={{
                  pointerEvents: "auto",
                  backgroundColor: theme.bgColor,
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: `1px solid ${theme.borderColor}`,
                  borderRadius: "12px",
                  padding: "1rem 1.125rem",
                  boxShadow: `0 16px 36px -8px rgba(0, 0, 0, 0.8), 0 0 24px ${theme.glowColor}`,
                  display: "flex",
                  gap: "0.875rem",
                  alignItems: "flex-start",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Left vertical accent indicator */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: "3px",
                    backgroundColor: theme.accentColor,
                    boxShadow: `0 0 8px ${theme.accentColor}`,
                  }}
                />

                {/* Icon badge */}
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    backgroundColor: `${theme.accentColor}20`,
                    border: `1px solid ${theme.accentColor}50`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.875rem",
                    fontWeight: 800,
                    color: theme.accentColor,
                    flexShrink: 0,
                    marginTop: "2px",
                  }}
                >
                  {theme.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <span
                      style={{
                        fontSize: "0.625rem",
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        color: theme.accentColor,
                        textTransform: "uppercase",
                      }}
                    >
                      {theme.badgeText}
                    </span>
                  </div>

                  <h4
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      color: "#f5f7fb",
                      lineHeight: 1.3,
                      marginBottom: "0.25rem",
                    }}
                  >
                    {t.title}
                  </h4>

                  <p
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--text-secondary)",
                      lineHeight: 1.5,
                      wordBreak: "break-word",
                    }}
                  >
                    {t.message}
                  </p>

                  {/* Optional field bullet details */}
                  {t.details && t.details.length > 0 && (
                    <div
                      style={{
                        marginTop: "0.5rem",
                        padding: "0.375rem 0.625rem",
                        borderRadius: "6px",
                        backgroundColor: "rgba(255,255,255,0.03)",
                        border: "1px solid var(--border-subtle)",
                        fontSize: "0.75rem",
                        color: "#93c5fd",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.25rem",
                      }}
                    >
                      {t.details.map((detail, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                          <span style={{ color: theme.accentColor }}>•</span>
                          <span>{detail}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Optional Action link / button */}
                  {t.action && (
                    <div style={{ marginTop: "0.625rem" }}>
                      {t.action.href ? (
                        <Link
                          href={t.action.href}
                          onClick={() => removeToast(t.id)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.375rem",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: theme.accentColor,
                            textDecoration: "underline",
                            textUnderlineOffset: "3px",
                          }}
                        >
                          {t.action.label} →
                        </Link>
                      ) : (
                        <button
                          onClick={() => {
                            t.action?.onClick?.();
                            removeToast(t.id);
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: theme.accentColor,
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            padding: 0,
                            textDecoration: "underline",
                          }}
                        >
                          {t.action.label}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Dismiss X button */}
                <button
                  onClick={() => removeToast(t.id)}
                  aria-label="Dismiss notification"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    padding: "0.125rem",
                    lineHeight: 1,
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: 0.7,
                    transition: "opacity 0.15s ease, color 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "1";
                    e.currentTarget.style.color = "#ffffff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "0.7";
                    e.currentTarget.style.color = "var(--text-muted)";
                  }}
                >
                  ✕
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </aside>
    </ToastContext.Provider>
  );
};
