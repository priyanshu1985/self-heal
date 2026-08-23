import React from "react";
import { CollectorStatus, DriftStatus } from "@/types";

interface BadgeProps {
  status: CollectorStatus | DriftStatus | string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className = "" }) => {
  const normalizedStatus = status.toLowerCase();
  
  const labels: Record<string, string> = {
    healthy: "Healthy",
    drifted: "Drift Detected",
    healing: "Healing via AI",
    pending_approval: "Pending Approval",
    resolved: "Resolved & Healed",
    rejected: "Rejected",
    failed: "Failed",
  };

  const label = labels[normalizedStatus] || status;

  return (
    <span className={`badge badge-${normalizedStatus} ${className}`}>
      <span className="badge-dot" />
      {label}
    </span>
  );
};
