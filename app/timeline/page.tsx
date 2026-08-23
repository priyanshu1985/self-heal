"use client";

import React, { useEffect, useState } from "react";
import { TimelineItem } from "@/components/ui/TimelineItem";
import { TimelineItemSkeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DriftEventModel } from "@/types";

export default function TimelinePage() {
  const [events, setEvents] = useState<DriftEventModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/drift-events");
      const json = await res.json();
      if (json.success && json.data?.driftEvents) {
        setEvents(json.data.driftEvents);
      }
    } catch (err) {
      console.error("Failed to load timeline events:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.875rem",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              background: "linear-gradient(135deg, #f5f7fb, var(--accent-secondary))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Drift Detection &amp; AI Self-Heal Timeline
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", marginTop: "0.25rem" }}>
            Auditable, end-to-end event log of schema drift, AI Flow heal requests, and human approvals.
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={fetchEvents}>
          ↻ Refresh Timeline
        </Button>
      </div>

      {loading ? (
        <div className="timeline-thread-container" style={{ marginTop: "1rem" }}>
          <TimelineItemSkeleton />
          <TimelineItemSkeleton />
          <TimelineItemSkeleton />
        </div>
      ) : events.length === 0 ? (
        <Card style={{ padding: "3rem", textAlign: "center" }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            No Drift Events Recorded Yet
          </h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Trigger a "Break &amp; Heal Demo" from the dashboard to simulate target site structure
            changes and observe the self-healing workflow in real-time.
          </p>
        </Card>
      ) : (
        /* ─── Glowing vertical thread container ─── */
        <div className="timeline-thread-container" style={{ marginTop: "1rem" }}>
          {events.map((event, idx) => (
            <div
              key={event.id}
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateX(0)" : "translateX(-12px)",
                transition: `opacity 0.35s ease ${idx * 0.06}s, transform 0.35s ease ${idx * 0.06}s`,
              }}
            >
              <TimelineItem event={event as any} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
