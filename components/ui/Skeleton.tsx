"use client";

import React from "react";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = "1rem",
  borderRadius = "6px",
  className = "",
  style,
}) => {
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
};

export const CollectorCardSkeleton: React.FC = () => {
  return (
    <div
      className="card skeleton-card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
        padding: "1.5rem",
        borderLeft: "2px solid rgba(59, 111, 245, 0.2)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1, maxWidth: "320px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Skeleton width="180px" height="1.25rem" />
            <Skeleton width="80px" height="1.25rem" borderRadius="9999px" />
          </div>
          <Skeleton width="220px" height="0.875rem" />
        </div>
        <Skeleton width="120px" height="2rem" borderRadius="8px" />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.75rem",
          borderRadius: "8px",
          backgroundColor: "rgba(255, 255, 255, 0.015)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <Skeleton width="70px" height="1rem" />
        <Skeleton width="100%" height="2rem" borderRadius="6px" style={{ flex: 1 }} />
        <Skeleton width="110px" height="2rem" borderRadius="6px" />
        <Skeleton width="140px" height="2rem" borderRadius="6px" />
      </div>
    </div>
  );
};

export const VitalsStripSkeleton: React.FC = () => {
  return (
    <div className="vitals-strip" style={{ padding: "0.25rem" }}>
      <div className="vitals-row">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="vitals-cell" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <Skeleton width="100px" height="0.75rem" />
            <Skeleton width="60px" height="2.25rem" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const TimelineItemSkeleton: React.FC = () => {
  return (
    <div style={{ display: "flex", gap: "1.25rem", position: "relative", paddingBottom: "1.75rem" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "24px", flexShrink: 0 }}>
        <div
          className="skeleton-shimmer"
          style={{ width: "14px", height: "14px", borderRadius: "50%", marginTop: "5px" }}
        />
        <div style={{ width: "2px", flex: 1, backgroundColor: "rgba(255,255,255,0.05)", marginTop: "4px" }} />
      </div>

      <div className="card skeleton-card" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Skeleton width="220px" height="1.125rem" />
          <Skeleton width="90px" height="1.25rem" borderRadius="9999px" />
        </div>
        <Skeleton width="85%" height="0.875rem" />
      </div>
    </div>
  );
};

export const DiffViewerSkeleton: React.FC = () => {
  return (
    <div className="card skeleton-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Skeleton width="240px" height="1.25rem" />
        <Skeleton width="100px" height="1.5rem" borderRadius="6px" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", padding: "1rem", backgroundColor: "#04060b", borderRadius: "8px" }}>
        <Skeleton width="60%" height="0.875rem" />
        <Skeleton width="90%" height="0.875rem" />
        <Skeleton width="75%" height="0.875rem" />
        <Skeleton width="80%" height="0.875rem" />
        <Skeleton width="65%" height="0.875rem" />
      </div>
    </div>
  );
};
