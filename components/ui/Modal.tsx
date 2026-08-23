"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  maxWidth?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  maxWidth = "620px",
  children,
  footer,
  closeOnBackdropClick = true,
  closeOnEscape = true,
}) => {
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const modalPanelRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Handle body scroll locking and modal-open class
  useEffect(() => {
    if (!isOpen) return;

    // Save previous active element to restore focus on close
    previousActiveElement.current = document.activeElement as HTMLElement;

    document.body.classList.add("modal-open");
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus first interactive element inside modal
    const timer = setTimeout(() => {
      if (modalPanelRef.current) {
        const focusable = modalPanelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 1) {
          // If the first is the close button, focus the second if available (e.g. input)
          const firstInput = modalPanelRef.current.querySelector<HTMLElement>("input, textarea");
          if (firstInput) {
            firstInput.focus();
          } else {
            focusable[0].focus();
          }
        } else if (focusable.length > 0) {
          focusable[0].focus();
        }
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      document.body.classList.remove("modal-open");
      document.body.style.overflow = originalOverflow;
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen]);

  // Handle Escape key listener
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab" && modalPanelRef.current) {
        // Focus trap
        const focusable = modalPanelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "clamp(0.75rem, 3vw, 1.5rem)",
            overflow: "hidden",
          }}
        >
          {/* Backdrop */}
          <motion.div
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={closeOnBackdropClick ? onClose : undefined}
            style={{
              position: "fixed",
              inset: 0,
              width: "100vw",
              height: "100vh",
              backgroundColor: "rgba(3, 5, 10, 0.88)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              zIndex: -1,
            }}
          />

          {/* Modal Panel */}
          <motion.div
            ref={modalPanelRef}
            initial={
              reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.95, y: 12 }
            }
            animate={
              reducedMotion
                ? { opacity: 1 }
                : { opacity: 1, scale: 1, y: 0 }
            }
            exit={
              reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.95, y: 12 }
            }
            transition={{
              type: "spring",
              stiffness: 450,
              damping: 32,
              mass: 0.7,
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth,
              width: "min(92vw, 640px)",
              maxHeight: "min(85vh, 760px)",
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#070b14",
              border: "1px solid rgba(59, 111, 245, 0.28)",
              borderRadius: "16px",
              boxShadow:
                "0 30px 70px -15px rgba(0, 0, 0, 0.95), 0 0 32px rgba(59, 111, 245, 0.12), inset 0 0 0 1px rgba(255, 255, 255, 0.04)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Header (Sticky / Fixed at top) */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                padding: "clamp(1rem, 3vw, 1.5rem) clamp(1rem, 3vw, 1.5rem) 0.875rem",
                borderBottom: "1px solid var(--border-subtle)",
                flexShrink: 0,
                backgroundColor: "rgba(7, 11, 20, 0.95)",
                backdropFilter: "blur(8px)",
                gap: "1rem",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3
                  style={{
                    fontSize: "clamp(1.125rem, 2.5vw, 1.25rem)",
                    fontWeight: 700,
                    color: "#f5f7fb",
                    letterSpacing: "-0.02em",
                    lineHeight: 1.2,
                  }}
                >
                  {title}
                </h3>
                {subtitle && (
                  <p
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--text-muted)",
                      marginTop: "0.25rem",
                      lineHeight: 1.4,
                    }}
                  >
                    {subtitle}
                  </p>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                aria-label="Close modal"
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid var(--border-subtle)",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontSize: "1rem",
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.15)";
                  e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.4)";
                  e.currentTarget.style.color = "#fca5a5";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.04)";
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                  e.currentTarget.style.color = "#94a3b8";
                }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body Content */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "clamp(1rem, 3vw, 1.5rem)",
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              {children}
            </div>

            {/* Sticky / Fixed Footer (if provided) */}
            {footer && (
              <div
                style={{
                  padding: "0.875rem clamp(1rem, 3vw, 1.5rem)",
                  borderTop: "1px solid var(--border-subtle)",
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: "0.75rem",
                  backgroundColor: "rgba(5, 8, 16, 0.98)",
                  flexShrink: 0,
                }}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
