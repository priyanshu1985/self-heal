import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { DriftEventModel } from "@/types";

interface TimelineItemProps {
  event: DriftEventModel & {
    collector?: { id: string; name: string; collectorId: string };
  };
}

export const TimelineItem: React.FC<TimelineItemProps> = ({ event }) => {
  const formattedDate = new Date(event.createdAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div
      style={{
        display: "flex",
        gap: "1.25rem",
        position: "relative",
        paddingBottom: "1.75rem",
      }}
    >
      {/* Left connector dot and line */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "24px",
        }}
      >
        <div
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor:
              event.status === "resolved"
                ? "var(--status-resolved)"
                : event.status === "pending_approval"
                ? "var(--status-pending)"
                : "var(--status-drifted)",
            boxShadow: `0 0 10px ${
              event.status === "resolved"
                ? "var(--status-resolved)"
                : "var(--status-pending)"
            }`,
            marginTop: "6px",
          }}
        />
        <div
          style={{
            width: "2px",
            flex: 1,
            backgroundColor: "var(--border-subtle)",
            marginTop: "6px",
          }}
        />
      </div>

      {/* Main event card content */}
      <div
        className="card"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
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
                style={{
                  color: "var(--accent-primary)",
                  textDecoration: "underline",
                }}
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
              marginTop: "0.5rem",
              paddingTop: "0.75rem",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
              AI has proposed an extraction selector fix. Human approval required.
            </span>
            <Link href={`/diff/${event.id}`} className="btn btn-primary btn-sm">
              Review AI Diff →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
