"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DiffViewer } from "@/components/ui/DiffViewer";
import { WebShootButton } from "@/components/ui/WebShootButton";
import { SpinneretGlyph } from "@/components/ui/SpinneretGlyph";
import { DiffViewerSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { DriftEventModel } from "@/types";

export default function DiffApprovalPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { toast } = useToast();

  const [event, setEvent] = useState<DriftEventModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
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
    setApproving(true);
    setResultMessage(null);
    try {
      const res = await fetch(`/api/drift-events/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setResultMessage("✅ Fix approved! Collector template updated and re-verified successfully.");
        toast.resolved(
          "Self-Healing Patch Approved",
          `Extraction template patch for field "${event?.fieldName}" applied to collector. Verified healthy.`,
          {
            details: [
              `Event ID: ${id}`,
              `Collector: ${event?.collectorId}`,
            ],
          }
        );
        await fetchEvent();
        setTimeout(() => {
          router.push(`/collectors/${event?.collectorId}`);
        }, 1200);
      } else {
        setResultMessage(`❌ Approval failed: ${data.error}`);
        toast.error("Approval Failed", data.error || "Failed to apply fix template.");
      }
    } catch (err: any) {
      setResultMessage(`❌ Error: ${err.message}`);
      toast.error("Approval Error", err.message || "An unexpected error occurred.");
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
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
        toast.info(
          "AI Proposal Rejected",
          `The proposed fix for field "${event?.fieldName}" has been discarded.`
        );
        await fetchEvent();
      } else {
        setResultMessage(`❌ Rejection failed: ${data.error}`);
        toast.error("Rejection Failed", data.error || "Could not reject proposal.");
      }
    } catch (err: any) {
      setResultMessage(`❌ Error: ${err.message}`);
      toast.error("Rejection Error", err.message || "An unexpected error occurred.");
    } finally {
      setRejecting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem", maxWidth: "960px", margin: "0 auto" }}>
        <DiffViewerSkeleton />
        <DiffViewerSkeleton />
      </div>
    );
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
  const isProcessing = approving || rejecting;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", maxWidth: "960px", margin: "0 auto" }}>
      {/* ─── Header — calmer chrome, just a spinneret inline marker ─── */}
      <div>
        {/* Back link with tiny spinneret glyph */}
        <Link
          href="/timeline"
          style={{
            color: "var(--text-muted)",
            fontSize: "0.875rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
          }}
        >
          <SpinneretGlyph size={14} />
          Back to Drift Timeline
        </Link>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            marginTop: "0.5rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid rgba(224,33,47,0.12)",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "1.75rem",
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            >
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
            backgroundColor: "rgba(59, 111, 245, 0.12)",
            border: "1px solid rgba(59, 111, 245, 0.3)",
            fontSize: "0.875rem",
            color: "#93c5fd",
          }}
        >
          {resultMessage}
        </div>
      )}

      {/* ─── Incident Summary Card ─── */}
      <Card>
        <h3 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "0.75rem" }}>
          Incident Diagnosis &amp; AI Repair Intent
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
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {event.healPrompt}
              </pre>
            </div>
          )}
        </div>
      </Card>

      {/* ─── Proposed Diff Viewer ─── */}
      <Card
        style={{
          borderTop: "2px solid rgba(224,33,47,0.2)",
        }}
      >
        {event.proposedDiff ? (
          <DiffViewer diffText={event.proposedDiff} title="Proposed Code Refactor (AI Flow)" />
        ) : (
          <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem" }}>
            No diff attached to this event.
          </div>
        )}

        {/* ─── Action Gate ─── */}
        {isPending && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
              marginTop: "1.5rem",
              paddingTop: "1.25rem",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <Button
              variant="secondary"
              isLoading={rejecting}
              loadingText="Rejecting…"
              successText="Rejected"
              errorText="Failed"
              disabled={isProcessing}
              onClick={handleReject}
              style={{ minWidth: "110px" }}
            >
              Reject Fix
            </Button>

            {/* Approve — signature stateful web-shoot */}
            <WebShootButton
              className="btn btn-success"
              isLoading={approving}
              loadingText="Applying Fix…"
              successText="Approved &amp; Verified!"
              errorText="Failed"
              disabled={isProcessing}
              onClick={handleApprove}
              style={{ minWidth: "200px" }}
            >
              ✓ Approve &amp; Re-Run Collector
            </WebShootButton>
          </div>
        )}
      </Card>
    </div>
  );
}
