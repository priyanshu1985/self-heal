"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { animate, useMotionValue } from "framer-motion";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { WebShootButton } from "@/components/ui/WebShootButton";
import { Modal } from "@/components/ui/Modal";
import { NetworkHubConnector } from "@/components/ui/NetworkHubConnector";
import { PipelineStepper, StepperState } from "@/components/ui/PipelineStepper";
import { CollectorCardSkeleton, VitalsStripSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { CollectorModel } from "@/types";
import { PipelineStage } from "@/lib/orchestrator/pipeline";

// Dynamically import backgrounds to avoid SSR hydration mismatch
import dynamic from "next/dynamic";
const SpiderWebBackground = dynamic(
  () => import("@/components/effects/SpiderWebBackground").then((m) => m.SpiderWebBackground),
  { ssr: false }
);

const SCHEMA_PRESETS = {
  instagram: {
    label: "📸 Instagram / Social Profile",
    name: "Instagram Profiles Scraper",
    schema: {
      fields: [
        { name: "account", type: "string", required: true, description: "Instagram username handle" },
        { name: "followers", type: "number", required: false, description: "Total follower count" },
        { name: "posts_count", type: "number", required: false, description: "Number of published posts" },
        { name: "biography", type: "string", required: false, description: "Profile bio text" }
      ]
    }
  },
  ecommerce: {
    label: "🛒 E-Commerce Product",
    name: "E-Commerce Catalog Scraper",
    schema: {
      fields: [
        { name: "title", type: "string", required: true, description: "Product display title" },
        { name: "price", type: "number", required: true, description: "Product price in local currency" },
        { name: "rating", type: "number", required: false, description: "Product review score (1.0 - 5.0)" },
        { name: "inStock", type: "boolean", required: true, description: "Availability flag" },
        { name: "sku", type: "string", required: false, description: "SKU or product identifier" }
      ]
    }
  },
  saas: {
    label: "💼 SaaS Pricing Tier",
    name: "SaaS Pricing Matrix Scraper",
    schema: {
      fields: [
        { name: "planName", type: "string", required: true, description: "Tier plan name" },
        { name: "monthlyPrice", type: "number", required: true, description: "Monthly recurring price" },
        { name: "isPopular", type: "boolean", required: true, description: "Featured plan badge" },
        { name: "features", type: "array", required: true, description: "List of plan features" }
      ]
    }
  },
  article: {
    label: "📰 News & Blog Article",
    name: "Article Extractor",
    schema: {
      fields: [
        { name: "headline", type: "string", required: true, description: "Article headline" },
        { name: "author", type: "string", required: false, description: "Author name" },
        { name: "publishedDate", type: "string", required: false, description: "Date of publication" },
        { name: "content", type: "string", required: true, description: "Main body text" }
      ]
    }
  }
};

export default function DashboardPage() {
  const [collectors, setCollectors] = useState<CollectorModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Custom dynamic URL per collector
  const [customUrls, setCustomUrls] = useState<Record<string, string>>({});

  // Register New Collector Form Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [curlInput, setCurlInput] = useState("");
  const [newName, setNewName] = useState("");
  const [newCollectorId, setNewCollectorId] = useState("");
  const [newTargetUrl, setNewTargetUrl] = useState("");
  const [newFieldsJson, setNewFieldsJson] = useState(
    JSON.stringify(SCHEMA_PRESETS.instagram.schema, null, 2)
  );
  const [creating, setCreating] = useState(false);

  const { toast } = useToast();

  // Stagger mount animation state
  const [mounted, setMounted] = useState(false);

  // Stepper state per collector
  const [stepperStates, setStepperStates] = useState<Record<string, StepperState>>({});

  // Run result popup (optional secondary overview)
  const [runResult, setRunResult] = useState<{
    type: "healthy" | "drifted" | "error";
    collectorName: string;
    message: string;
  } | null>(null);

  const fetchCollectors = async () => {
    try {
      const res = await fetch("/api/collectors");
      const json = await res.json();
      if (json.success && json.data?.collectors) {
        setCollectors(json.data.collectors);
        const urls: Record<string, string> = {};
        json.data.collectors.forEach((c: CollectorModel) => {
          urls[c.id] = c.targetUrl;
        });
        setCustomUrls((prev) => ({ ...urls, ...prev }));
      }
    } catch (err) {
      console.error("Failed to load collectors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollectors();
    // Trigger stagger animation after mount
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Smart cURL & URL Parser
  const handleParseCurl = (text: string) => {
    setCurlInput(text);
    if (!text || text.trim().length < 3) return;

    let detectedId = "";
    let detectedUrl = "";

    const datasetMatch = text.match(/[?&]dataset_id=([a-zA-Z0-9_-]+)/i);
    const collectorMatch = text.match(/[?&]collector=([a-zA-Z0-9_-]+)/i);
    const directIdMatch = text.match(/\b(gd_[a-zA-Z0-9_]+|c_[a-zA-Z0-9_]+)\b/);

    if (datasetMatch) detectedId = datasetMatch[1];
    else if (collectorMatch) detectedId = collectorMatch[1];
    else if (directIdMatch) detectedId = directIdMatch[1];

    const jsonUrlMatch = text.match(/"url"\s*:\s*"([^"]+)"/i);
    const rawUrlMatch = text.match(/https?:\/\/(?!api\.brightdata\.com)[^\s"'\\]+/i);

    if (jsonUrlMatch) detectedUrl = jsonUrlMatch[1];
    else if (rawUrlMatch) detectedUrl = rawUrlMatch[0];

    if (detectedId) setNewCollectorId(detectedId);
    if (detectedUrl) setNewTargetUrl(detectedUrl);

    const lowerText = text.toLowerCase();
    if (detectedId === "gd_l1vikfch901nx3by4" || lowerText.includes("instagram")) {
      setNewName("Instagram Profile Scraper");
      setNewFieldsJson(JSON.stringify(SCHEMA_PRESETS.instagram.schema, null, 2));
    } else if (lowerText.includes("amazon") || lowerText.includes("books") || lowerText.includes("product") || lowerText.includes("ecommerce")) {
      setNewName("E-Commerce Product Scraper");
      setNewFieldsJson(JSON.stringify(SCHEMA_PRESETS.ecommerce.schema, null, 2));
    } else if (lowerText.includes("pricing") || lowerText.includes("saas") || lowerText.includes("plan")) {
      setNewName("SaaS Pricing Matrix Scraper");
      setNewFieldsJson(JSON.stringify(SCHEMA_PRESETS.saas.schema, null, 2));
    } else if (lowerText.includes("article") || lowerText.includes("blog") || lowerText.includes("news")) {
      setNewName("Article Extractor");
      setNewFieldsJson(JSON.stringify(SCHEMA_PRESETS.article.schema, null, 2));
    } else {
      setNewName(`Scraper (${detectedId || "Custom"})`);
      setNewFieldsJson(JSON.stringify({
        fields: [
          { name: "title", type: "string", required: true, description: "Primary title or name" },
          { name: "value", type: "number", required: false, description: "Numeric metric" },
          { name: "status", type: "string", required: false, description: "Status or category" }
        ]
      }, null, 2));
    }
  };

  const applyPreset = (key: keyof typeof SCHEMA_PRESETS) => {
    const preset = SCHEMA_PRESETS[key];
    if (!newName || Object.values(SCHEMA_PRESETS).some(p => p.name === newName)) {
      setNewName(preset.name);
    }
    setNewFieldsJson(JSON.stringify(preset.schema, null, 2));
  };

  const handleTriggerRun = async (id: string, simulateDrift: boolean = false) => {
    setTriggeringId(id);
    const targetUrl = customUrls[id];
    const collector = collectors.find((c) => c.id === id);
    const collectorName = collector?.name || id;

    // Initialize Stepper
    setStepperStates((prev) => ({
      ...prev,
      [id]: {
        currentStage: "triggering",
        message: "Initiating Bright Data collector trigger...",
        isDrifted: false,
      },
    }));

    try {
      const res = await fetch(`/api/collectors/${id}/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulateDrift, targetUrl: targetUrl || undefined }),
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

                setStepperStates((prev) => ({
                  ...prev,
                  [id]: {
                    currentStage: parsed.stage as PipelineStage,
                    message: parsed.message || `Stage: ${parsed.stage}`,
                    isDrifted: hasDrift,
                    extra: parsed.extra,
                  },
                }));
              } else if (eventType === "result") {
                finalResult = parsed.result;
              } else if (eventType === "error") {
                throw new Error(parsed.error || "Pipeline execution failed");
              }
            } catch (e: any) {
              if (eventType === "error") throw e;
            }
          }
        }
      }

      // Final outcomes & Toasts
      await fetchCollectors();

      if (finalResult) {
        if (finalResult.status === "healthy") {
          toast.healthy(
            "Scrape Validated Successfully",
            `Collector "${collectorName}" completed. All expected schema fields validated with 0 drift issues.`,
            {
              details: [
                `Target: ${targetUrl || collector?.targetUrl || "Default URL"}`,
                `Duration: ${finalResult.run?.durationMs || 0}ms`,
              ],
            }
          );
        } else {
          const failedField = finalResult.driftSummary?.driftedFields?.[0] || "payload";
          const firstEventId = finalResult.driftEvents?.[0]?.id;

          toast.drift(
            "Schema Drift Detected",
            `Collector "${collectorName}" encountered schema drift on field "${failedField}". AI Flow self-healing initiated.`,
            {
              action: firstEventId
                ? {
                    label: "Review AI Proposal",
                    href: `/diff/${firstEventId}`,
                  }
                : undefined,
              details: [
                `Affected: ${finalResult.driftSummary?.driftedFields?.join(", ") || failedField}`,
                `Failure: ${finalResult.validation?.issues?.[0]?.message || "Schema constraint violation"}`,
              ],
            }
          );
        }
      }
    } catch (err: any) {
      console.error("Pipeline trigger error:", err);
      setStepperStates((prev) => ({
        ...prev,
        [id]: {
          currentStage: "error",
          message: `Execution failed: ${err.message}`,
          isDrifted: true,
        },
      }));

      toast.error(
        "Collector Execution Failed",
        `Failed to run collector "${collectorName}": ${err.message}`,
        {
          details: ["Check network connectivity or Bright Data API credentials."],
        }
      );
    } finally {
      setTriggeringId(null);
    }
  };

  const handleCreateCollector = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      let parsedSchema = {};
      try {
        parsedSchema = JSON.parse(newFieldsJson);
      } catch {
        toast.error("Invalid Schema JSON", "Please verify that the field schema is valid JSON format.");
        setCreating(false);
        return;
      }

      const res = await fetch("/api/collectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          collectorId: newCollectorId,
          targetUrl: newTargetUrl,
          fieldSchema: parsedSchema,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowCreateModal(false);
        setCurlInput("");
        setNewName("");
        setNewCollectorId("");
        setNewTargetUrl("");
        toast.info(
          "Scraper Registered",
          `Collector "${newName}" successfully registered and added to active monitor.`,
          {
            details: [
              `Scraper ID: ${newCollectorId}`,
              `Target: ${newTargetUrl}`,
            ],
          }
        );
        await fetchCollectors();
      } else {
        toast.error(
          "Registration Failed",
          json.error || "Failed to register new collector."
        );
      }
    } catch (err: any) {
      toast.error("Registration Error", err.message || "Failed to create collector.");
    } finally {
      setCreating(false);
    }
  };

  const pendingApprovalsCount = collectors.filter((c) => c.status === "pending_approval").length;
  const driftedCount = collectors.filter((c) => c.status === "drifted" || c.status === "pending_approval").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", position: "relative" }}>

      {/* ─── Classic Radial Orb-Web Background with Crawling Spider ─── */}
      <SpiderWebBackground />

      {/* ─── Hero Section ─── */}
      <div
        className="hero-section"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1.5rem",
          paddingTop: "1.5rem",
          paddingBottom: "1rem",
          minHeight: "180px",
        }}
      >
        <div className="hero-section-content">
          <h1
            style={{
              fontSize: "clamp(2.25rem, 5vw, 4rem)",
              fontWeight: 900,
              letterSpacing: "-0.045em",
              marginBottom: "0.75rem",
              lineHeight: 1.05,
              color: "#f5f7fb",
            }}
          >
            Your Scraper Network,
            <br />
            {/* “Always On.” gets the glitch — implies live monitoring energy */}
            <span className="hero-glitch-text">Always On.</span>
          </h1>
          <p style={{
            color: "var(--text-secondary)",
            fontSize: "0.9375rem",
            maxWidth: "480px",
            lineHeight: 1.6,
          }}>
            Every collector is a live node — SelfHeal watches the threads,
            catches schema drift, and fires AI self-healing the moment a
            connection breaks.
          </p>
        </div>

        {/* Global Action */}
        <div style={{ display: "flex", gap: "0.75rem", paddingTop: "0.5rem" }}>
          <WebShootButton
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            + Register New Scraper
          </WebShootButton>
        </div>
      </div>

      {/* ─── Vitals Strip ─── */}
      {loading ? (
        <VitalsStripSkeleton />
      ) : (
        <VitalsStrip
          totalCount={collectors.length}
          healthyCount={collectors.filter((c) => c.status === "healthy").length}
          driftedCount={driftedCount}
          pendingCount={pendingApprovalsCount}
          mounted={mounted}
        />
      )}

      {/* ─── Status Alert Banner ─── */}
      {statusMessage && (
        <div
          style={{
            padding: "0.875rem 1.25rem",
            borderRadius: "8px",
            backgroundColor: "rgba(59, 111, 245, 0.12)",
            border: "1px solid rgba(59, 111, 245, 0.28)",
            fontSize: "0.875rem",
            color: "#93c5fd",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <span style={{ fontSize: "1rem" }}>◈</span>
          {statusMessage}
        </div>
      )}

      {/* ─── Modal: Run Result Alert ─── */}
      <Modal
        isOpen={Boolean(runResult)}
        onClose={() => setRunResult(null)}
        title={
          runResult?.type === "healthy"
            ? "Run Complete"
            : runResult?.type === "drifted"
            ? "Drift Detected"
            : "Run Failed"
        }
        subtitle={runResult?.collectorName}
        maxWidth="440px"
        footer={
          <button
            autoFocus
            onClick={() => setRunResult(null)}
            className="btn btn-primary"
            style={{
              width: "100%",
              background:
                runResult?.type === "healthy"
                  ? "var(--accent-secondary)"
                  : "var(--accent-primary)",
              boxShadow:
                runResult?.type === "healthy"
                  ? "0 0 20px rgba(59,111,245,0.4)"
                  : "0 0 20px rgba(224,33,47,0.4)",
            }}
          >
            OK
          </button>
        }
      >
        {runResult && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: "1rem",
              padding: "0.5rem 0",
            }}
          >
            {/* Status icon */}
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
                backgroundColor:
                  runResult.type === "healthy"
                    ? "rgba(59,130,246,0.15)"
                    : "rgba(239,68,68,0.15)",
                border: `2px solid ${
                  runResult.type === "healthy"
                    ? "rgba(59,130,246,0.4)"
                    : "rgba(239,68,68,0.4)"
                }`,
              }}
            >
              {runResult.type === "healthy" ? "✓" : runResult.type === "drifted" ? "⚡" : "✕"}
            </div>

            <p
              style={{
                fontSize: "0.9375rem",
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                maxWidth: "340px",
              }}
            >
              {runResult.message}
            </p>
          </div>
        )}
      </Modal>

      {/* ─── Modal: Register New Collector ─── */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Register Bright Data Scraper"
        subtitle="Paste a cURL snippet from Bright Data or fill in the details below."
        maxWidth="640px"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <WebShootButton
              type="submit"
              form="register-collector-form"
              className="btn btn-primary btn-sm"
              isLoading={creating}
              loadingText="Saving…"
              successText="Registered!"
              errorText="Failed"
              disabled={creating}
            >
              Save &amp; Register Scraper
            </WebShootButton>
          </>
        }
      >
        {/* Quick cURL Auto-Parser */}
        <div
          style={{
            padding: "0.875rem 1rem",
            borderRadius: "10px",
            backgroundColor: "rgba(59, 111, 245, 0.07)",
            border: "1px dashed rgba(59, 111, 245, 0.35)",
            display: "flex",
            flexDirection: "column",
            gap: "0.375rem",
          }}
        >
          <label
            style={{
              display: "block",
              fontSize: "0.8125rem",
              fontWeight: 700,
              color: "#7eb3ff",
            }}
          >
            ⚡ Quick Import: Paste Bright Data cURL command
          </label>
          <input
            type="text"
            placeholder='Paste curl -H "Authorization: Bearer..." "https://api.brightdata.com/datasets/v3/scrape?dataset_id=..."'
            value={curlInput}
            onChange={(e) => handleParseCurl(e.target.value)}
            style={{
              width: "100%",
              padding: "0.55rem 0.75rem",
              borderRadius: "6px",
              backgroundColor: "#05070a",
              border: "1px solid var(--border-subtle)",
              color: "#38bdf8",
              fontSize: "0.75rem",
              fontFamily: "ui-monospace, monospace",
            }}
          />
          <span
            style={{
              fontSize: "0.6875rem",
              color: "var(--text-muted)",
              display: "block",
            }}
          >
            Automatically extracts Scraper ID, Target URL, and selects matching schema.
          </span>
        </div>

        <form
          id="register-collector-form"
          onSubmit={handleCreateCollector}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
              gap: "1rem",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: "0.375rem",
                }}
              >
                Display Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Instagram Profiles"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.75rem",
                  borderRadius: "6px",
                  backgroundColor: "#05070a",
                  border: "1px solid var(--border-subtle)",
                  color: "#fff",
                  fontSize: "0.8125rem",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: "0.375rem",
                }}
              >
                Scraper ID / Dataset ID
              </label>
              <input
                type="text"
                required
                placeholder="e.g. gd_l1vikfch901nx3by4"
                value={newCollectorId}
                onChange={(e) => setNewCollectorId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.75rem",
                  borderRadius: "6px",
                  backgroundColor: "#05070a",
                  border: "1px solid var(--border-subtle)",
                  color: "#a5b4fc",
                  fontSize: "0.8125rem",
                  fontFamily: "ui-monospace, monospace",
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
                marginBottom: "0.375rem",
              }}
            >
              Target Website URL
            </label>
            <input
              type="url"
              required
              placeholder="https://www.instagram.com/cats_of_world_/"
              value={newTargetUrl}
              onChange={(e) => setNewTargetUrl(e.target.value)}
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                borderRadius: "6px",
                backgroundColor: "#05070a",
                border: "1px solid var(--border-subtle)",
                color: "#fff",
                fontSize: "0.8125rem",
              }}
            />
          </div>

          {/* Schema Presets */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
                marginBottom: "0.375rem",
              }}
            >
              Schema Template Presets (1-Click)
            </label>
            <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
              {Object.entries(SCHEMA_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key as keyof typeof SCHEMA_PRESETS)}
                  style={{
                    padding: "0.375rem 0.65rem",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid var(--border-subtle)",
                    color: "#cbd5e1",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(59, 111, 245, 0.15)";
                    e.currentTarget.style.borderColor = "rgba(59, 111, 245, 0.4)";
                    e.currentTarget.style.color = "#ffffff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
                    e.currentTarget.style.borderColor = "var(--border-subtle)";
                    e.currentTarget.style.color = "#cbd5e1";
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
                marginBottom: "0.375rem",
              }}
            >
              Expected Field Schema (Zod Contract JSON)
            </label>
            <textarea
              rows={6}
              value={newFieldsJson}
              onChange={(e) => setNewFieldsJson(e.target.value)}
              style={{
                width: "100%",
                padding: "0.65rem 0.75rem",
                borderRadius: "6px",
                backgroundColor: "#05070a",
                border: "1px solid var(--border-subtle)",
                color: "#38bdf8",
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.75rem",
                lineHeight: 1.45,
                resize: "vertical",
                minHeight: "110px",
                maxHeight: "220px",
              }}
            />
          </div>
        </form>
      </Modal>

      {/* ─── Collector List ─── */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h2 style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
          }}>
            <span style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "var(--accent-secondary)",
              boxShadow: "0 0 8px var(--accent-secondary)",
              display: "inline-block",
            }} />
            Active Collectors
          </h2>
          <Button variant="secondary" size="sm" onClick={fetchCollectors}>
            ↻ Refresh
          </Button>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <CollectorCardSkeleton />
            <CollectorCardSkeleton />
            <CollectorCardSkeleton />
          </div>
        ) : collectors.length === 0 ? (
          <Card style={{ textAlign: "center", padding: "3rem" }}>
            <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>
              No collectors found. Click "+ Register New Scraper" above to add one.
            </p>
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* NetworkHubConnector: thin SVG threads from each card to the hub */}
            <NetworkHubConnector collectorIds={collectors.map((c) => c.id)} />

            {collectors.map((collector, idx) => {
              const isTriggering = triggeringId === collector.id;
              const currentUrl = customUrls[collector.id] ?? collector.targetUrl;
              const collectorStepper = stepperStates[collector.id];

              return (
                <Card
                  key={collector.id}
                  interactive
                  data-collector-id={collector.id}
                  className="node-card"
                  style={{
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? "translateY(0)" : "translateY(10px)",
                    transition: `opacity 0.3s ease ${(idx + 4) * 0.05}s, transform 0.3s ease ${(idx + 4) * 0.05}s`,
                    borderLeft: "2px solid transparent",
                    borderImage: collector.status === "drifted" || collector.status === "pending_approval"
                      ? "linear-gradient(to bottom, var(--status-drifted), transparent) 1"
                      : collector.status === "healthy"
                      ? "linear-gradient(to bottom, var(--status-healthy), transparent) 1"
                      : "linear-gradient(to bottom, var(--status-healing), transparent) 1",
                    "--node-glow": collector.status === "drifted" || collector.status === "pending_approval"
                      ? "rgba(239,68,68,0.28)"
                      : collector.status === "healthy"
                      ? "rgba(59,130,246,0.25)"
                      : "rgba(177,59,245,0.25)",
                  } as React.CSSProperties}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {/* Header Row */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: "1rem",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.375rem" }}>
                          <Link
                            href={`/collectors/${collector.id}`}
                            style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}
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
                          <span>Scraper ID: <code style={{ color: "#a5b4fc" }}>{collector.collectorId}</code></span>
                          <span>•</span>
                          <span>Last Run: {collector.lastRunAt ? new Date(collector.lastRunAt).toLocaleTimeString() : "Never"}</span>
                        </div>
                      </div>

                      <Link href={`/collectors/${collector.id}`} className="btn btn-secondary btn-sm">
                        Schema & Runs →
                      </Link>
                    </div>

                    {/* Interactive Target URL Input & Action Controls */}
                    <div className="collector-controls-row">
                      <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        Target URL:
                      </span>
                      <input
                        type="url"
                        value={currentUrl}
                        onChange={(e) =>
                          setCustomUrls((prev) => ({ ...prev, [collector.id]: e.target.value }))
                        }
                        placeholder="https://target-website.com/data"
                        style={{
                          flex: 1,
                          minWidth: "min(100%, 200px)",
                          padding: "0.4rem 0.75rem",
                          borderRadius: "6px",
                          backgroundColor: "#05070a",
                          border: "1px solid var(--border-subtle)",
                          color: "#38bdf8",
                          fontSize: "0.8125rem",
                        }}
                      />

                      <div className="collector-buttons-group">
                        {/* Run Scraper — stateful web-shoot CTA */}
                        <WebShootButton
                          className="btn btn-primary btn-sm"
                          isLoading={isTriggering}
                          loadingText="Running…"
                          successText="Complete!"
                          errorText="Failed"
                          onClick={() => handleTriggerRun(collector.id, false)}
                        >
                          ▶ Run Scraper
                        </WebShootButton>

                        {/* Test Drift — stateful web-shoot CTA */}
                        <WebShootButton
                          className="btn btn-danger btn-sm"
                          isLoading={isTriggering}
                          loadingText="Drifting…"
                          successText="Heal Triggered"
                          errorText="Failed"
                          onClick={() => handleTriggerRun(collector.id, true)}
                          title="Simulates DOM drift to test AI self-healing"
                        >
                          ⚡ Test Drift &amp; Heal
                        </WebShootButton>
                      </div>
                    </div>

                    {/* Multi-stage Progress Stepper */}
                    <PipelineStepper
                      state={
                        collectorStepper || {
                          currentStage: "idle",
                          message: "",
                        }
                      }
                      isVisible={Boolean(collectorStepper)}
                      onDismiss={() => {
                        setStepperStates((prev) => {
                          const next = { ...prev };
                          delete next[collector.id];
                          return next;
                        });
                      }}
                    />
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

/* ─── VitalsStrip ─────────────────────────────────────────────────────────── */

interface VitalsStripProps {
  totalCount: number;
  healthyCount: number;
  driftedCount: number;
  pendingCount: number;
  mounted: boolean;
}

function useCountUp(target: number, enabled: boolean) {
  const val = useMotionValue(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setDisplay(target);
      return;
    }
    const unsubscribe = val.on("change", (v) => setDisplay(Math.round(v)));
    const ctrl = animate(val, target, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
      delay: 0.1,
    });
    return () => {
      ctrl.stop();
      unsubscribe();
    };
  }, [target, enabled, val]);

  return display;
}

const VitalsStrip: React.FC<VitalsStripProps> = ({
  totalCount,
  healthyCount,
  driftedCount,
  pendingCount,
  mounted,
}) => {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const doAnimate = mounted && !reducedMotion;

  const total   = useCountUp(totalCount,   doAnimate);
  const healthy = useCountUp(healthyCount, doAnimate);
  const drifted = useCountUp(driftedCount, doAnimate);
  const pending = useCountUp(pendingCount, doAnimate);

  const cells = [
    { label: "Total Monitored",    value: total,   color: "var(--text-primary)",   drifted: false },
    { label: "Healthy Collectors", value: healthy,  color: "var(--status-healthy)", drifted: false },
    { label: "Drifted / Healing",  value: drifted,  color: "var(--status-drifted)", drifted: driftedCount > 0 },
    { label: "AI Heal Proposals",  value: pending,  color: "var(--status-pending)", drifted: false },
  ];

  return (
    <div
      className="vitals-strip"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(10px)",
        transition: "opacity 0.4s ease 0.05s, transform 0.4s ease 0.05s",
      }}
    >
      <div className="vitals-row">
        {cells.map((cell) => (
          <div
            key={cell.label}
            className={`vitals-cell${cell.drifted ? " vitals-cell--drifted" : ""}`}
          >
            <div className="vitals-label">{cell.label}</div>
            <div className="vitals-number" style={{ color: cell.color }}>
              {cell.value}
            </div>
          </div>
        ))}
      </div>

      {/* Thread that draws left-to-right on mount — connecting all four vitals */}
      <svg
        className="vitals-thread-svg"
        viewBox="0 0 1000 3"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="vt-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="rgba(59,111,245,0.7)" />
            <stop offset="35%"  stopColor="rgba(59,130,246,0.5)" />
            <stop offset="60%"  stopColor="rgba(239,68,68,0.6)" />
            <stop offset="100%" stopColor="rgba(245,165,36,0.5)" />
          </linearGradient>
        </defs>
        <line
          x1="0" y1="1.5" x2="1000" y2="1.5"
          stroke="url(#vt-grad)"
          strokeWidth="2"
          className="vitals-thread-line"
        />
      </svg>
    </div>
  );
};
