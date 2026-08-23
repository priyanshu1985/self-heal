"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DiffViewer } from "@/components/ui/DiffViewer";
import { DriftEventModel } from "@/types";

export default function DiffApprovalPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [event, setEvent] = useState<DriftEventModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const fetchEvent = async () => {
    try {
      const res = await fetch("/api/drift-events");
      const json = await res.json();
      if (json.success && json.data?.driftEvents) {
        const found = json.data.driftEvents.find((e: DriftEventModel) => e.id === id);
        setEvent(found || null);
      }
    } catch (err) {
      console.error("Failed to load drift event:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchEvent();
  }, [id]);

  const handleApprove = async () => {
    setProcessing(true);
    setResultMessage(null);
    try {
      const res = await fetch(`/api/drift-events/${id}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setResultMessage(
          "✅ Fix approved! Collector template updated and re-verified successfully."
        );
        await fetchEvent();
        setTimeout(() => {
          router.push(`/collectors/${event?.collectorId}`);
        }, 1500);
      } else {
        setResultMessage(`❌ Approval failed: ${data.error}`);
      }
    } catch (err: any) {
      setResultMessage(`❌ Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    setProcessing(true);
    setResultMessage(null);
    try {
      const res = await fetch(`/api/drift-events/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Rejected by operator" }),
      });
      const data = await res.json();
      if (data.success) {
        setResultMessage("Proposed diff rejected.");
        await fetchEvent();
      } else {
        setResultMessage(`❌ Rejection failed: ${data.error}`);
      }
    } catch (err: any) {
      setResultMessage(`❌ Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <Card style={{ padding: "3rem", textAlign: "center" }}>Loading AI proposal...</Card>;
  }

  if (!event) {
    return (
      <Card style={{ padding: "3rem", textAlign: "center" }}>
        <h3>Drift Event Not Found</h3>
        <Link href="/timeline" className="btn btn-secondary" style={{ marginTop: "1rem" }}>
          ← Back to Timeline
        </Link>
      </Card>
    );
  }

  const isPending = event.status === "pending_approval";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", maxWidth: "960px", margin: "0 auto" }}>
      {/* Header */}
      <div>
        <Link href="/timeline" style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
          ← Back to Drift Timeline
        </Link>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            marginTop: "0.5rem",
          }}
        >
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800 }}>
              AI Self-Healing Review Gate
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
              Event ID: <code>{event.id}</code> • Field:{" "}
              <strong style={{ color: "#38bdf8" }}>{event.fieldName}</strong>
            </p>
          </div>
          <Badge status={event.status} />
        </div>
      </div>

      {resultMessage && (
        <div
          style={{
            padding: "1rem",
            borderRadius: "8px",
            backgroundColor: "rgba(99, 102, 241, 0.15)",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            fontSize: "0.875rem",
            color: "#c7d2fe",
          }}
        >
          {resultMessage}
        </div>
      )}

      {/* Incident Summary Card */}
      <Card>
        <h3 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "0.75rem" }}>
          Incident Diagnosis & AI Repair Intent
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.875rem" }}>
          <div>
            <span style={{ color: "var(--text-muted)" }}>Failure Reason: </span>
            <span style={{ color: "var(--status-drifted)", fontWeight: 600 }}>{event.errorMessage}</span>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)" }}>Target Field: </span>
            <span style={{ color: "#38bdf8" }}>{event.fieldName} (Expected: {event.expectedType})</span>
          </div>
          {event.healPrompt && (
            <div>
              <span style={{ color: "var(--text-muted)" }}>Prompt sent to Bright Data AI Flow:</span>
              <pre
                style={{
                  background: "#080b11",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  color: "#a5b4fc",
                  marginTop: "0.25rem",
                  whiteSpace: "pre-wrap",
                }}
              >
                {event.healPrompt}
              </pre>
            </div>
          )}
        </div>
      </Card>

      {/* Proposed Diff Viewer */}
      <Card>
        {event.proposedDiff ? (
          <DiffViewer diffText={event.proposedDiff} title="Proposed Code Refactor (AI Flow)" />
        ) : (
          <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem" }}>
            No diff attached to this event.
          </div>
        )}

        {/* Action Gate */}
        {isPending && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: "1rem",
              marginTop: "1.5rem",
              paddingTop: "1.25rem",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <Button
              variant="secondary"
              onClick={handleReject}
              disabled={processing}
            >
              Reject Fix
            </Button>
            <Button
              variant="success"
              isLoading={processing}
              onClick={handleApprove}
            >
              ✓ Approve & Re-Run Collector
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
