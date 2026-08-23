"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CollectorModel } from "@/types";

export default function DashboardPage() {
  const [collectors, setCollectors] = useState<CollectorModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchCollectors = async () => {
    try {
      const res = await fetch("/api/collectors");
      const json = await res.json();
      if (json.success && json.data?.collectors) {
        setCollectors(json.data.collectors);
      }
    } catch (err) {
      console.error("Failed to load collectors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollectors();
  }, []);

  const handleTriggerRun = async (id: string, simulateDrift: boolean = false) => {
    setTriggeringId(id);
    setStatusMessage(
      simulateDrift
        ? "Simulating broken DOM & running drift detection pipeline..."
        : "Executing collector run & schema validation..."
    );

    try {
      const res = await fetch(`/api/collectors/${id}/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulateDrift }),
      });

      const json = await res.json();
      if (json.success) {
        const result = json.data?.result;
        if (result?.status === "healthy") {
          setStatusMessage("✅ Scrape run passed schema validation with 0 issues.");
        } else {
          setStatusMessage(
            "⚠️ Drift detected! AI Flow self-healing initiated. Check Pending Approvals."
          );
        }
        await fetchCollectors();
      } else {
        setStatusMessage(`❌ Trigger failed: ${json.error || "Unknown error"}`);
      }
    } catch (err: any) {
      setStatusMessage(`❌ Error: ${err.message}`);
    } finally {
      setTriggeringId(null);
    }
  };

  const pendingApprovalsCount = collectors.filter(
    (c) => c.status === "pending_approval"
  ).length;
  const driftedCount = collectors.filter(
    (c) => c.status === "drifted" || c.status === "pending_approval"
  ).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Top Banner / Metrics Overview */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1.5rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.875rem",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              marginBottom: "0.5rem",
            }}
          >
            Collector Reliability & Self-Healing Monitor
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
            Real-time schema validation and human-approved self-healing for Bright Data Scraper Studio collectors.
          </p>
        </div>

        {pendingApprovalsCount > 0 && (
          <Link
            href="/timeline"
            className="btn btn-primary"
            style={{
              boxShadow: "0 0 20px rgba(245, 158, 11, 0.4)",
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
            }}
          >
            ⚠️ {pendingApprovalsCount} AI Fix Pending Approval
          </Link>
        )}
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
        }}
      >
        <Card>
          <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 600 }}>
            TRACKED COLLECTORS
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, marginTop: "0.25rem" }}>
            {collectors.length}
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 600 }}>
            HEALTHY STATE
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--status-healthy)", marginTop: "0.25rem" }}>
            {collectors.filter((c) => c.status === "healthy" || c.status === "resolved").length}
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 600 }}>
            DRIFT EVENTS DETECTED
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--status-drifted)", marginTop: "0.25rem" }}>
            {driftedCount}
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 600 }}>
            AI HEAL PROPOSALS
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--status-pending)", marginTop: "0.25rem" }}>
            {pendingApprovalsCount}
          </div>
        </Card>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          style={{
            padding: "0.875rem 1.25rem",
            borderRadius: "8px",
            backgroundColor: "rgba(99, 102, 241, 0.15)",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            fontSize: "0.875rem",
            color: "#c7d2fe",
          }}
        >
          {statusMessage}
        </div>
      )}

      {/* Collector List */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
            Active Collectors
          </h2>
          <Button variant="secondary" size="sm" onClick={fetchCollectors}>
            ↻ Refresh
          </Button>
        </div>

        {loading ? (
          <Card style={{ textAlign: "center", padding: "3rem" }}>
            <p style={{ color: "var(--text-muted)" }}>Loading collectors...</p>
          </Card>
        ) : collectors.length === 0 ? (
          <Card style={{ textAlign: "center", padding: "3rem" }}>
            <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>
              No collectors found. Run the seed script or create one.
            </p>
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {collectors.map((collector) => {
              const isTriggering = triggeringId === collector.id;

              return (
                <Card key={collector.id} interactive>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: "1rem",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: "280px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          marginBottom: "0.375rem",
                        }}
                      >
                        <Link
                          href={`/collectors/${collector.id}`}
                          style={{
                            fontSize: "1.125rem",
                            fontWeight: 700,
                            color: "var(--text-primary)",
                          }}
                        >
                          {collector.name}
                        </Link>
                        <Badge status={collector.status} />
                      </div>

                      <div
                        style={{
                          fontSize: "0.8125rem",
                          color: "var(--text-muted)",
                          display: "flex",
                          gap: "1rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <span>ID: <code style={{ color: "#a5b4fc" }}>{collector.collectorId}</code></span>
                        <span>•</span>
                        <span>Target: <span style={{ color: "#94a3b8" }}>{collector.targetUrl}</span></span>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <Button
                        variant="secondary"
                        size="sm"
                        isLoading={isTriggering}
                        onClick={() => handleTriggerRun(collector.id, false)}
                      >
                        ▶ Normal Run
                      </Button>

                      <Button
                        variant="danger"
                        size="sm"
                        isLoading={isTriggering}
                        onClick={() => handleTriggerRun(collector.id, true)}
                        title="Simulates DOM change to trigger drift and AI heal flow"
                      >
                        ⚡ Break & Heal Demo
                      </Button>

                      <Link
                        href={`/collectors/${collector.id}`}
                        className="btn btn-secondary btn-sm"
                      >
                        Details →
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
