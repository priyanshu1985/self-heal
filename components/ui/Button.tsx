"use client";

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type ButtonStatus = "idle" | "loading" | "success" | "error";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "success";
  size?: "sm" | "md";
  isLoading?: boolean;
  status?: ButtonStatus;
  successText?: string;
  errorText?: string;
  loadingText?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  status: controlledStatus,
  successText = "Success!",
  errorText = "Failed",
  loadingText,
  className = "",
  disabled,
  onClick,
  style,
  ...props
}) => {
  const [internalStatus, setInternalStatus] = useState<ButtonStatus>("idle");

  const currentStatus: ButtonStatus = controlledStatus !== undefined
    ? controlledStatus
    : isLoading
    ? "loading"
    : internalStatus;

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || currentStatus === "loading") return;

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
    [disabled, currentStatus, onClick]
  );

  const isExecuting = currentStatus === "loading";
  const isSuccess = currentStatus === "success";
  const isError = currentStatus === "error";

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
      className={`btn btn-${variant} ${size === "sm" ? "btn-sm" : ""} ${className}`}
      disabled={disabled || isExecuting || isSuccess || isError}
      onClick={handleClick}
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
      {...props}
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
            <span>{loadingText || "Processing…"}</span>
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
