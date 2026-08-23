"use client";

import React, { useEffect, useState } from "react";
import { TimelineItem } from "@/components/ui/TimelineItem";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DriftEventModel } from "@/types";

export default function TimelinePage() {
  const [events, setEvents] = useState<DriftEventModel[]>([]);
  const [loading, setLoading] = useState(true);

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
          <h1 style={{ fontSize: "1.875rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
            Drift Detection & AI Self-Heal Timeline
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
        <Card style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
          Loading event timeline...
        </Card>
      ) : events.length === 0 ? (
        <Card style={{ padding: "3rem", textAlign: "center" }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            No Drift Events Recorded Yet
          </h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Trigger a "Break & Heal Demo" from the dashboard to simulate target site structure changes and observe the self-healing workflow in real-time.
          </p>
        </Card>
      ) : (
        <div style={{ marginTop: "1rem" }}>
          {events.map((event) => (
            <TimelineItem key={event.id} event={event as any} />
          ))}
        </div>
      )}
    </div>
  );
}
