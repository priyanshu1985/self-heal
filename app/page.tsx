"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { WebShootButton } from "@/components/ui/WebShootButton";
import { NetworkHubConnector } from "@/components/ui/NetworkHubConnector";
import { CollectorModel } from "@/types";

// Dynamically import the 3D canvas to avoid SSR issues with Three.js
import dynamic from "next/dynamic";
const ParticleWebCanvas = dynamic(
  () => import("@/components/three/ParticleWebCanvas").then((m) => m.ParticleWebCanvas),
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

  // Stagger mount animation state
  const [mounted, setMounted] = useState(false);

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
    setStatusMessage(
      simulateDrift
        ? "Simulating broken DOM & running drift detection pipeline..."
        : `Executing scraper on: ${targetUrl || "default URL"}...`
    );

    try {
      const res = await fetch(`/api/collectors/${id}/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulateDrift, targetUrl: targetUrl || undefined }),
      });

      const json = await res.json();
      if (json.success) {
        const result = json.data?.result;
        if (result?.status === "healthy") {
          setStatusMessage("✅ Scrape run passed schema validation with 0 issues.");
        } else {
          setStatusMessage("⚠️ Drift detected! AI Flow self-healing initiated. Check Pending Approvals.");
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

  const handleCreateCollector = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      let parsedSchema = {};
      try {
        parsedSchema = JSON.parse(newFieldsJson);
      } catch {
        alert("Invalid JSON in fields schema!");
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
        setStatusMessage(`✅ Collector "${newName}" registered successfully!`);
        await fetchCollectors();
      } else {
        alert(`Failed to create collector: ${json.error || "Unknown error"}`);
      }
    } catch (err: any) {
      alert(`Error creating collector: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const pendingApprovalsCount = collectors.filter((c) => c.status === "pending_approval").length;
  const driftedCount = collectors.filter((c) => c.status === "drifted" || c.status === "pending_approval").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", position: "relative" }}>

      {/* ─── 3D Particle Web Canvas (hero background layer) ─── */}
      <ParticleWebCanvas />

      {/* ─── Hero Section ─── */}
      <div
        className="hero-section"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1.5rem",
          paddingTop: "1rem",
          paddingBottom: "0.5rem",
        }}
      >
        <div className="hero-section-content">
          <h1
            style={{
              fontSize: "2.125rem",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              marginBottom: "0.625rem",
              lineHeight: 1.1,
              background: "linear-gradient(135deg, #f5f7fb 0%, rgba(224,33,47,0.9) 60%, #3b6ff5 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Your Scraper Network,<br />Always On.
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

        {/* Global Action — WebShootButton triggers the web-shoot effect */}
        <div style={{ display: "flex", gap: "0.75rem", paddingTop: "0.5rem" }}>
          <WebShootButton
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            + Register New Scraper
          </WebShootButton>
        </div>
      </div>

      {/* ─── Metrics Row ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
        }}
      >
        {[
          { label: "TOTAL MONITORED", value: collectors.length, color: undefined },
          { label: "HEALTHY COLLECTORS", value: collectors.filter((c) => c.status === "healthy").length, color: "var(--status-healthy)" },
          { label: "DRIFTED / HEALING", value: driftedCount, color: "var(--status-drifted)" },
          { label: "AI HEAL PROPOSALS", value: pendingApprovalsCount, color: "var(--status-pending)" },
        ].map((metric, i) => (
          <Card
            key={metric.label}
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(12px)",
              transition: `opacity 0.35s ease ${i * 0.07}s, transform 0.35s ease ${i * 0.07}s`,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Subtle corner accent */}
            <div style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "3px",
              height: "100%",
              background: metric.color
                ? `linear-gradient(to bottom, transparent, ${metric.color}40, transparent)`
                : "linear-gradient(to bottom, transparent, rgba(59,111,245,0.2), transparent)",
            }} />
            <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.05em" }}>
              {metric.label}
            </div>
            <div style={{ fontSize: "1.875rem", fontWeight: 900, marginTop: "0.25rem", color: metric.color || "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
              {metric.value}
            </div>
          </Card>
        ))}
      </div>

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

      {/* ─── Modal: Register New Collector ─── */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem",
            overflowY: "auto",
          }}
        >
          <Card
            style={{
              maxWidth: "650px",
              width: "100%",
              backgroundColor: "#0a0d17",
              border: "1px solid rgba(59,111,245,0.2)",
              padding: "2rem",
              borderRadius: "14px",
              boxShadow: "0 30px 60px -12px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(59,111,245,0.08)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Register Bright Data Scraper</h3>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  Paste a cURL snippet from Bright Data or fill in the details below.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.25rem" }}
              >
                ✕
              </button>
            </div>

            {/* Quick cURL Auto-Parser */}
            <div
              style={{
                marginBottom: "1.25rem",
                padding: "1rem",
                borderRadius: "8px",
                backgroundColor: "rgba(59, 111, 245, 0.07)",
                border: "1px dashed rgba(59, 111, 245, 0.3)",
              }}
            >
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#7eb3ff", marginBottom: "0.375rem" }}>
                ⚡ Quick Import: Paste Bright Data cURL command
              </label>
              <input
                type="text"
                placeholder='Paste curl -H "Authorization: Bearer..." "https://api.brightdata.com/datasets/v3/scrape?dataset_id=..."'
                value={curlInput}
                onChange={(e) => handleParseCurl(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "6px",
                  backgroundColor: "#05070a",
                  border: "1px solid var(--border-subtle)",
                  color: "#38bdf8",
                  fontSize: "0.75rem",
                  fontFamily: "monospace",
                }}
              />
              <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)", display: "block", marginTop: "0.25rem" }}>
                Automatically extracts Scraper ID, Target URL, and selects matching schema.
              </span>
            </div>

            <form onSubmit={handleCreateCollector} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.375rem" }}>
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
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.375rem" }}>
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
                      fontFamily: "monospace",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.375rem" }}>
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
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.375rem" }}>
                  Schema Template Presets (1-Click)
                </label>
                <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                  {Object.entries(SCHEMA_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => applyPreset(key as keyof typeof SCHEMA_PRESETS)}
                      style={{
                        padding: "0.35rem 0.65rem",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid var(--border-subtle)",
                        color: "#cbd5e1",
                        cursor: "pointer",
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.375rem" }}>
                  Expected Field Schema (Zod Contract JSON)
                </label>
                <textarea
                  rows={5}
                  value={newFieldsJson}
                  onChange={(e) => setNewFieldsJson(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "6px",
                    backgroundColor: "#05070a",
                    border: "1px solid var(--border-subtle)",
                    color: "#38bdf8",
                    fontFamily: "monospace",
                    fontSize: "0.75rem",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.75rem" }}>
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                {/* WebShootButton for the Save action */}
                <WebShootButton
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={creating}
                >
                  {creating ? "Saving…" : "Save & Register Scraper"}
                </WebShootButton>
              </div>
            </form>
          </Card>
        </div>
      )}

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
          <Card style={{ textAlign: "center", padding: "3rem" }}>
            <p style={{ color: "var(--text-muted)" }}>Loading collectors...</p>
          </Card>
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

              return (
                <Card
                  key={collector.id}
                  interactive
                  /* data attribute for NetworkHubConnector to target */
                  data-collector-id={collector.id}
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
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        flexWrap: "wrap",
                        backgroundColor: "rgba(255, 255, 255, 0.025)",
                        padding: "0.75rem",
                        borderRadius: "8px",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
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
                          minWidth: "220px",
                          padding: "0.4rem 0.75rem",
                          borderRadius: "6px",
                          backgroundColor: "#05070a",
                          border: "1px solid var(--border-subtle)",
                          color: "#38bdf8",
                          fontSize: "0.8125rem",
                        }}
                      />

                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        {/* Run Scraper — web-shoot CTA */}
                        <WebShootButton
                          className="btn btn-primary btn-sm"
                          disabled={isTriggering}
                          onClick={() => handleTriggerRun(collector.id, false)}
                        >
                          {isTriggering ? "Running…" : "▶ Run Scraper"}
                        </WebShootButton>

                        {/* Test Drift — web-shoot CTA */}
                        <WebShootButton
                          className="btn btn-danger btn-sm"
                          disabled={isTriggering}
                          onClick={() => handleTriggerRun(collector.id, true)}
                          title="Simulates DOM drift to test AI self-healing"
                        >
                          ⚡ Test Drift & Heal
                        </WebShootButton>
                      </div>
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
