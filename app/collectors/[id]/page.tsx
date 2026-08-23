"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { JsonViewer } from "@/components/ui/JsonViewer";
import { PipelineStepper, StepperState } from "@/components/ui/PipelineStepper";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { CollectorModel, CollectorSchemaDefinition, RunModel } from "@/types";
import { PipelineStage } from "@/lib/orchestrator/pipeline";

export default function CollectorDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { toast } = useToast();

  const [collector, setCollector] = useState<CollectorModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [selectedRun, setSelectedRun] = useState<RunModel | null>(null);
  const [stepperState, setStepperState] = useState<StepperState | null>(null);

  const fetchCollector = async () => {
    try {
      const res = await fetch(`/api/collectors/${id}`);
      const json = await res.json();
      if (json.success && json.data?.collector) {
        setCollector(json.data.collector);
        if (json.data.collector.runs && json.data.collector.runs.length > 0) {
          setSelectedRun(json.data.collector.runs[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load collector:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchCollector();
  }, [id]);

  const handleTrigger = async (simulateDrift: boolean) => {
    setTriggering(true);
    setStepperState({
      currentStage: "triggering",
      message: "Starting collector execution pipeline...",
      isDrifted: false,
    });

    try {
      const res = await fetch(`/api/collectors/${id}/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulateDrift }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let hasDrift = false;
      let finalResult: any = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const evt of events) {
          if (!evt.trim()) continue;
          const lines = evt.split("\n");
          let eventType = "message";
          let eventData = "";

          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              eventData = line.slice(5).trim();
            }
          }

          if (eventData) {
            try {
              const parsed = JSON.parse(eventData);

              if (eventType === "stage") {
                if (parsed.stage === "healing" || (parsed.extra && parsed.extra.status === "drifted")) {
                  hasDrift = true;
                }

                setStepperState({
                  currentStage: parsed.stage as PipelineStage,
                  message: parsed.message || `Stage: ${parsed.stage}`,
                  isDrifted: hasDrift,
                  extra: parsed.extra,
                });
              } else if (eventType === "result") {
                finalResult = parsed.result;
              } else if (eventType === "error") {
                throw new Error(parsed.error || "Execution failed");
              }
            } catch (e: any) {
              if (eventType === "error") throw e;
            }
          }
        }
      }

      await fetchCollector();

      if (finalResult) {
        if (finalResult.status === "healthy") {
          toast.healthy(
            "Scrape Completed Healthy",
            `Collector "${collector?.name || id}" verified all fields with 0 drift issues.`,
            {
              details: [
                `Duration: ${finalResult.run?.durationMs || 0}ms`,
                `Snapshot: ${finalResult.run?.snapshotId || "N/A"}`,
              ],
            }
          );
        } else {
          const firstEventId = finalResult.driftEvents?.[0]?.id;
          toast.drift(
            "Schema Drift Detected",
            `Collector "${collector?.name || id}" detected drift on field "${finalResult.driftSummary?.driftedFields?.[0]}". AI Flow repair proposal initiated.`,
            {
              action: firstEventId
                ? {
                    label: "Review AI Proposal",
                    href: `/diff/${firstEventId}`,
                  }
                : undefined,
              details: [
                `Field: ${finalResult.driftSummary?.driftedFields?.join(", ")}`,
                `Failure: ${finalResult.validation?.issues?.[0]?.message || "Constraint failure"}`,
              ],
            }
          );
        }
      }
    } catch (err: any) {
      console.error("Trigger error:", err);
      setStepperState({
        currentStage: "error",
        message: `Execution failed: ${err.message}`,
        isDrifted: true,
      });
      toast.error("Execution Error", err.message || "Failed to trigger collector.");
    } finally {
      setTriggering(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <Skeleton width="260px" height="2rem" />
            <Skeleton width="400px" height="1rem" />
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <Skeleton width="110px" height="2rem" borderRadius="8px" />
            <Skeleton width="130px" height="2rem" borderRadius="8px" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem" }}>
          <Card><Skeleton width="100%" height="200px" /></Card>
          <Card><Skeleton width="100%" height="200px" /></Card>
        </div>
      </div>
    );
  }

  if (!collector) {
    return (
      <Card style={{ padding: "3rem", textAlign: "center" }}>
        <h3>Collector Not Found</h3>
        <Link href="/" className="btn btn-secondary" style={{ marginTop: "1rem" }}>
          ← Back to Dashboard
        </Link>
      </Card>
    );
  }

  let schemaDef: CollectorSchemaDefinition = { fields: [] };
  try {
    schemaDef = JSON.parse(collector.fieldSchema);
  } catch {}

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Navigation Breadcrumb & Header */}
      <div>
        <Link href="/" style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
          ← Back to Collectors
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
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800 }}>{collector.name}</h1>
            <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              Collector ID: <code style={{ color: "#a5b4fc" }}>{collector.collectorId}</code> • Target:{" "}
              <a href={collector.targetUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent-primary)", textDecoration: "underline" }}>
                {collector.targetUrl}
              </a>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Badge status={collector.status} />
            <Button
              variant="secondary"
              size="sm"
              isLoading={triggering}
              loadingText="Scraping…"
              successText="Complete!"
              errorText="Failed"
              onClick={() => handleTrigger(false)}
            >
              ▶ Run Scrape
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={triggering}
              loadingText="Drifting…"
              successText="Heal Flow Initiated"
              errorText="Failed"
              onClick={() => handleTrigger(true)}
            >
              ⚡ Break &amp; Heal
            </Button>
          </div>
        </div>
      </div>

      {/* Real-time Multi-stage Stepper */}
      {stepperState && (
        <PipelineStepper
          state={stepperState}
          isVisible={Boolean(stepperState)}
          onDismiss={() => setStepperState(null)}
        />
      )}

      {/* Grid: Schema Definition & Current Extractor */}
      <div className="responsive-2col-grid">
        {/* Schema Definition Card */}
        <Card>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "1rem" }}>
            Expected Schema (Zod Validation Rules)
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {schemaDef.fields.map((field) => (
              <div
                key={field.name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.5rem 0.75rem",
                  background: "rgba(255, 255, 255, 0.03)",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#38bdf8" }}>
                    {field.name}
                  </div>
                  {field.description && (
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {field.description}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span
                    style={{
                      fontSize: "0.6875rem",
                      fontWeight: 600,
                      padding: "0.125rem 0.375rem",
                      borderRadius: "4px",
                      background: "rgba(99, 102, 241, 0.2)",
                      color: "#a5b4fc",
                    }}
                  >
                    {field.type}
                  </span>
                  <span
                    style={{
                      fontSize: "0.6875rem",
                      fontWeight: 600,
                      padding: "0.125rem 0.375rem",
                      borderRadius: "4px",
                      background: field.required
                        ? "rgba(244, 63, 94, 0.2)"
                        : "rgba(100, 116, 139, 0.2)",
                      color: field.required ? "#fda4af" : "#94a3b8",
                    }}
                  >
                    {field.required ? "Required" : "Optional"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Current Extractor Template Card */}
        <Card>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "1rem" }}>
            Active Extractor Template
          </h3>
          <pre
            style={{
              background: "#080b11",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              padding: "1rem",
              fontSize: "0.8125rem",
              color: "#a5b4fc",
              overflow: "auto",
              maxHeight: "320px",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            {collector.currentTemplate || "// No custom template configured."}
          </pre>
        </Card>
      </div>

      {/* Run History & Output Inspector */}
      <div>
        <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem" }}>
          Run History &amp; Extraction Inspector
        </h3>
        
        <div className="responsive-split-grid">
          {/* Runs Table */}
          <Card style={{ padding: "1rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {collector.runs && collector.runs.length > 0 ? (
                collector.runs.map((run) => {
                  const isSelected = selectedRun?.id === run.id;
                  const dateStr = new Date(run.createdAt).toLocaleTimeString();

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
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                          Run {run.id.slice(-6)}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {dateStr} • {run.durationMs || 0}ms
                        </div>
                      </div>
                      <Badge status={run.status} />
                    </div>
                  );
                })
              ) : (
                <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem" }}>
                  No runs executed yet.
                </div>
              )}
            </div>
          </Card>

          {/* Selected Run Output Details */}
          <Card>
            {selectedRun ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4 style={{ fontSize: "1rem", fontWeight: 700 }}>
                    Run Payload (Snapshot: {selectedRun.snapshotId || "N/A"})
                  </h4>
                  <Badge status={selectedRun.status} />
                </div>

                {selectedRun.validationErrors && (
                  <div>
                    <div style={{ fontSize: "0.8125rem", color: "var(--status-drifted)", fontWeight: 600, marginBottom: "0.25rem" }}>
                      Validation Issues Detected:
                    </div>
                    <JsonViewer data={selectedRun.validationErrors} maxHeight="160px" />
                  </div>
                )}

                <div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "0.25rem" }}>
                    {selectedRun.status === "healthy" ? "Validated Structured Output:" : "Raw Scraped Payload:"}
                  </div>
                  <JsonViewer
                    data={selectedRun.validatedData || selectedRun.rawData || {}}
                    maxHeight="240px"
                  />
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                Select a run on the left to inspect structured payload.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
