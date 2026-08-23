"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { JsonViewer } from "@/components/ui/JsonViewer";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { RunModel } from "@/types";

export default function StructuredOutputPage() {
  const [runs, setRuns] = useState<RunModel[]>([]);
  const [selectedRun, setSelectedRun] = useState<RunModel | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRuns = async () => {
    try {
      const res = await fetch("/api/runs");
      const json = await res.json();
      if (json.success && json.data?.runs && json.data.runs.length > 0) {
        const healthyRuns = json.data.runs.filter((r: RunModel) => r.status === "healthy");
        setRuns(healthyRuns.length > 0 ? healthyRuns : json.data.runs);
        setSelectedRun(healthyRuns[0] || json.data.runs[0]);
      }
    } catch (err) {
      console.error("Failed to load runs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const copyToClipboard = () => {
    if (selectedRun?.validatedData) {
      navigator.clipboard.writeText(
        JSON.stringify(JSON.parse(selectedRun.validatedData), null, 2)
      );
      toast.info("Structured JSON Copied", "Formatted dataset copied to clipboard.");
    }
  };

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
            Example Structured Output (Rule 9)
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", marginTop: "0.25rem" }}>
            Verified structured JSON datasets extracted and validated by SelfHeal.
          </p>
        </div>

        {selectedRun && (
          <Button
            variant="secondary"
            size="sm"
            successText="Copied!"
            onClick={copyToClipboard}
          >
            📋 Copy JSON
          </Button>
        )}
      </div>

      {loading ? (
        <div className="responsive-output-grid">
          <Card style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <Skeleton width="140px" height="1.25rem" />
            <Skeleton width="100%" height="50px" borderRadius="8px" />
            <Skeleton width="100%" height="50px" borderRadius="8px" />
            <Skeleton width="100%" height="50px" borderRadius="8px" />
          </Card>
          <Card style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <Skeleton width="200px" height="1.5rem" />
            <Skeleton width="100%" height="320px" borderRadius="8px" />
          </Card>
        </div>
      ) : !selectedRun ? (
        <Card style={{ padding: "3rem", textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)" }}>
            No collector runs found. Execute a run from the dashboard or run the database seed script.
          </p>
        </Card>
      ) : (
        <div className="responsive-output-grid">
          {/* List of Verified Runs */}
          <Card style={{ padding: "1rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}>
              Select Validated Run
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {runs.map((run) => {
                const isSelected = selectedRun?.id === run.id;
                const timeStr = new Date(run.createdAt).toLocaleTimeString();

                return (
                  <div
                    key={run.id}
                    onClick={() => setSelectedRun(run)}
                    style={{
                      padding: "0.75rem",
                      borderRadius: "8px",
                      border: isSelected
                        ? "1px solid var(--accent-primary)"
                        : "1px solid var(--border-subtle)",
                      background: isSelected
                        ? "rgba(99, 102, 241, 0.12)"
                        : "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                      {run.collector?.name || `Collector ${run.collectorId}`}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.125rem" }}>
                      Run ID: {run.id.slice(-6)} • {timeStr}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Formatted JSON Output Display */}
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 700 }}>
                  Structured Dataset Output
                </h3>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Snapshot: {selectedRun.snapshotId || "N/A"} • Format: JSON
                </span>
              </div>
            </div>

            <JsonViewer
              data={selectedRun.validatedData || selectedRun.rawData || {}}
              maxHeight="500px"
            />
          </Card>
        </div>
      )}
    </div>
  );
}
