# SelfHeal ⚡

> **Real-Time Reliability Monitor & Human-in-the-Loop Self-Healing for Web Scrapers**  
> Built for the **"Into the Scrape-Verse"** Hackathon (Bright Data × WeMakeDevs).

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-Kinetic-FF0055?style=flat&logo=framer)](https://www.framer.com/motion/)
[![Bright Data](https://img.shields.io/badge/Bright_Data-Scraper_Studio-0052FF?style=flat)](https://brightdata.com/)

---

## 🎯 The Problem & The SelfHeal Solution

Existing web scraper monitoring tools (e.g. ScrapeOps, Spidermon) detect and alert on data anomalies, but still require human engineers to manually debug HTML DOM breakages and write code patches. Bright Data Scraper Studio provides an AI-powered template refactor flow, but currently relies on manual intervention to notice failures and trigger repairs.

**SelfHeal closes this automated loop**:
1. **Acquire & Validate**: Executes Bright Data Scraper Studio collectors and performs strict runtime **Zod schema validation** on every extracted field.
2. **Detect Drift in Real-Time**: Instantly isolates field-level missingness, selector shifts, type mismatches, or malformed data.
3. **Automated AI Self-Healing**: Automatically constructs structured context and triggers the Bright Data AI Flow endpoint (`/dca/collectors/{id}/refactor_template`).
4. **Human-in-the-Loop Action Gate**: Visualizes the AI-proposed code diff on the dashboard for 1-click human approval or rejection.
5. **Re-Run & Verify**: Re-executes the healed collector with the patched extractor, validates extraction against the contract schema, and logs a full audit trail.

---

## ⚡ Key Highlights & Visual Experience

* **Real-Time SSE Execution Pipeline**: Live Server-Sent Events (`text/event-stream`) stream multi-stage pipeline progress (`Triggering` → `Scraping` → `Validating` → `Checking Drift` → `AI Healing` → `Complete`).
* **Signature Radial Orb-Web Background with Dual Spiders**:
  * 16 radiating spokes and 8 concentric catenary-bowed rings rendered in pure vector SVG with ambient crimson glow.
  * **Organic Harmonic Breeze Motion**: Web threads gently sway with multi-frequency wind physics.
  * **Dual Spider System**:
    * **Scout Spider**: Patrols radial spokes and ring arcs with smooth path-following and intersection pauses.
    * **Silk Weaver Spider**: Traverses diagonal cross-braces, actively spinning, stretching, and anchoring new glowing silk threads in real time.
* **Stateful Action Controls (`WebShootButton`)**:
  * Action buttons morph dynamically between `idle`, `loading` (spinner), `success` (checkmark + green tint), and `error` states.
  * Includes signature web-shoot particle physics on approval and scrape actions.
* **Universal Accessible Modal System**: Fixed header/footer, smooth internal form scrolling, full-screen uniform backdrop dimming, focus-trapping, and Escape/click-outside triggers.
* **Position-Anchored Toast Stack**: Real-time notifications for healthy runs, drift detections, AI healing dispatches, and resolution events.
* **End-to-End Responsive UI/UX**: Fluid adaptation across mobile (320px+), tablet, laptop, and ultrawide monitors.

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│  LAYER 1 — DATA ACQUISITION (Bright Data Scraper Studio)  │
│  • Custom Collector(s) triggered via Collection API      │
│  • AI Flow API (/dca/collectors/{id}/refactor_template)  │
│  • Real-time SSE stage progress streaming                │
└──────────────────────────────────────────────────────────┘
                           │ raw JSON & DOM context
                           ▼
┌──────────────────────────────────────────────────────────┐
│  LAYER 2 — VALIDATION & HEAL ORCHESTRATOR (Core Engine)  │
│  • Zod schema contract validation on every run           │
│  • Field drift detection & prompt synthesis              │
│  • Automated AI Flow heal dispatch                       │
│  • Event store & human-in-the-loop state engine          │
└──────────────────────────────────────────────────────────┘
                           │ validated payloads & diffs
                           ▼
┌──────────────────────────────────────────────────────────┐
│  LAYER 3 — PRODUCT DASHBOARD (Next.js App Router)        │
│  • Collector Health Matrix & Vitals Strip                │
│  • Real-Time Stepper & Live Toast Stack                  │
│  • Drift/Heal Audit Timeline                             │
│  • Visual Diff Viewer & 1-Click Approval Gate            │
│  • Verified JSON Output Inspector                        │
└──────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18+ or v20+
- **npm** / **pnpm** / **yarn**

### 2. Installation
```bash
git clone https://github.com/priyanshu1985/self-heal.git
cd self-heal
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory (or copy from `.env.example`):
```env
# Local SQLite (or PostgreSQL / Neon Database URL)
DATABASE_URL="file:./dev.db"

# Bright Data API Credentials
BRIGHT_DATA_API_KEY=""
BRIGHT_DATA_CUSTOMER_ID=""
BRIGHT_DATA_ZONE=""

# Mock Simulation Mode (Set to "true" for offline testing / demos)
BRIGHT_DATA_MOCK="true"

PORT=3000
```

> **💡 Offline Simulation Mode**: When `BRIGHT_DATA_MOCK="true"`, SelfHeal runs a complete local simulation of normal scrapes, simulated DOM drift, AI code refactoring, diff generation, and verified re-runs without requiring live API keys.

### 4. Database Setup
SelfHeal uses Prisma ORM with SQLite for zero-config local setup:
```bash
# Push database schema
npx prisma db push

# (Optional) Seed demo collectors and baseline historical data
npm run db:seed
```

### 5. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Interactive Demo Walkthrough

1. **Dashboard Overview**:
   * Inspect the animated radial web with wind breeze physics and dual spiders.
   * View live health vitals (Total Collectors, Active & Healthy, Drift Detected, Pending Approvals).
2. **Execute a Healthy Scrape**:
   * Click **▶ Run Scraper** on any collector.
   * Watch the real-time Server-Sent Events (SSE) stepper advance through `Triggering` → `Scraping` → `Validating` → `Complete`.
3. **Simulate DOM Drift & AI Self-Healing**:
   * Click **⚡ Test Drift & Heal**.
   * Observe the pipeline detect schema drift on a field (e.g. missing `price` or selector shift), trigger the AI refactor flow, and generate a proposed JavaScript extractor patch.
4. **Human-in-the-Loop Review Gate**:
   * Click **Review AI Diff →** or navigate to the **Drift Timeline** / `/diff/[id]` page.
   * Inspect the color-coded code diff viewer showing the exact selector and extraction improvements.
   * Click **✓ Approve & Re-Run Collector** to apply the fix and verify extraction against the schema contract.
5. **Inspect Structured Output**:
   * Navigate to the **Structured Output** page (`/output`) to inspect validated JSON payloads.

---

## 🗄️ Database Schema Reference

### SQLite DDL
```sql
CREATE TABLE IF NOT EXISTS "Collector" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "collectorId" TEXT UNIQUE NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "fieldSchema" TEXT NOT NULL,
    "currentTemplate" TEXT,
    "status" TEXT NOT NULL DEFAULT 'healthy',
    "lastRunAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Run" (
    "id" TEXT PRIMARY KEY,
    "collectorId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "snapshotId" TEXT,
    "rawData" TEXT,
    "validatedData" TEXT,
    "validationErrors" TEXT,
    "durationMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("collectorId") REFERENCES "Collector"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "DriftEvent" (
    "id" TEXT PRIMARY KEY,
    "collectorId" TEXT NOT NULL,
    "runId" TEXT,
    "fieldName" TEXT NOT NULL,
    "expectedType" TEXT NOT NULL,
    "receivedValue" TEXT,
    "errorMessage" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'detected',
    "proposedDiff" TEXT,
    "proposedTemplate" TEXT,
    "healPrompt" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("collectorId") REFERENCES "Collector"("id") ON DELETE CASCADE,
    FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE SET NULL
);
```

### PostgreSQL / Neon DDL
```sql
CREATE TABLE "Collector" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "collectorId" TEXT UNIQUE NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "fieldSchema" TEXT NOT NULL,
    "currentTemplate" TEXT,
    "status" TEXT NOT NULL DEFAULT 'healthy',
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Run" (
    "id" TEXT PRIMARY KEY,
    "collectorId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "snapshotId" TEXT,
    "rawData" TEXT,
    "validatedData" TEXT,
    "validationErrors" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Run_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "Collector"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "DriftEvent" (
    "id" TEXT PRIMARY KEY,
    "collectorId" TEXT NOT NULL,
    "runId" TEXT,
    "fieldName" TEXT NOT NULL,
    "expectedType" TEXT NOT NULL,
    "receivedValue" TEXT,
    "errorMessage" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'detected',
    "proposedDiff" TEXT,
    "proposedTemplate" TEXT,
    "healPrompt" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DriftEvent_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "Collector"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DriftEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
```

---

## 🛠️ Key CLI Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server on port 3000 |
| `npm run build` | Compiles the production build |
| `npm run start` | Runs the production Next.js server |
| `npm run db:push` | Pushes Prisma schema updates directly to the database |
| `npm run db:seed` | Populates database with sample collectors and baseline runs |
| `npm run db:studio` | Launches Prisma Studio web GUI to browse database tables |

---

## 👥 Hackathon Disclosure
Developed for the **"Into the Scrape-Verse"** Hackathon by Bright Data & WeMakeDevs using AI pair programming assistance in compliance with Hackathon Rule 10. All visual assets and spider silhouettes are original mathematical vector designs.
