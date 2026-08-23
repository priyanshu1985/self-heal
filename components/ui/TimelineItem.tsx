import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { WebShootButton } from "@/components/ui/WebShootButton";
import { DriftEventModel } from "@/types";

interface TimelineItemProps {
  event: DriftEventModel;
}

// Maps status to the brand color tokens for the connector dot/thread
function getStatusColor(status: string): string {
  switch (status) {
    case "resolved":      return "var(--status-resolved)";
    case "pending_approval": return "var(--status-pending)";
    case "healing":       return "var(--status-healing)";
    case "healthy":       return "var(--status-healthy)";
    default:              return "var(--status-drifted)";
  }
}

export const TimelineItem: React.FC<TimelineItemProps> = ({ event }) => {
  const formattedDate = new Date(event.createdAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const statusColor = getStatusColor(event.status);

  return (
    <div
      style={{
        display: "flex",
        gap: "1.25rem",
        position: "relative",
        paddingBottom: "1.75rem",
      }}
    >
      {/* ─── Left connector: glowing dot + colored thread segment ─── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "24px",
          flexShrink: 0,
          position: "relative",
          zIndex: 1, // above the ::before thread line
        }}
      >
        {/* Status dot — larger, brighter, status-colored */}
        <div
          style={{
            width: "14px",
            height: "14px",
            borderRadius: "50%",
            backgroundColor: statusColor,
            boxShadow: `0 0 12px ${statusColor}, 0 0 4px ${statusColor}`,
            marginTop: "5px",
            border: "2px solid rgba(5,7,13,0.8)",
            flexShrink: 0,
            position: "relative",
          }}
        />
        {/* Colored thread segment below dot (overlaps the global ::before thread) */}
        <div
          style={{
            width: "2px",
            flex: 1,
            background: `linear-gradient(to bottom, ${statusColor}80, transparent)`,
            marginTop: "4px",
          }}
        />
      </div>

      {/* ─── Main event card content ─── */}
      <div
        className="card"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          borderLeft: `2px solid ${statusColor}30`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.875rem",
                color: "var(--text-muted)",
                marginBottom: "0.25rem",
              }}
            >
              {formattedDate} •{" "}
              <Link
                href={`/collectors/${event.collectorId}`}
                style={{ color: statusColor, textDecoration: "underline", opacity: 0.9 }}
              >
                {event.collector?.name || event.collectorId}
              </Link>
            </div>
            <h4 style={{ fontSize: "1rem", fontWeight: 600 }}>
              Field Drift: <code style={{ color: "#38bdf8" }}>{event.fieldName}</code>
            </h4>
          </div>
          <Badge status={event.status} />
        </div>

        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
          {event.errorMessage}
        </p>

        {event.status === "pending_approval" && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem",
              marginTop: "0.5rem",
              paddingTop: "0.75rem",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)", flex: "1 1 200px" }}>
              AI has proposed an extraction selector fix. Human approval required.
            </span>
            {/* WebShootButton: "catch the fix" interaction */}
            <WebShootButton
              className="btn btn-primary btn-sm"
              onClick={() => {
                window.location.href = `/diff/${event.id}`;
              }}
            >
              Review AI Diff →
            </WebShootButton>
          </div>
        )}
      </div>
    </div>
  );
};
