# SelfHeal ⚡

> **Real-Time Reliability Monitor & Human-in-the-Loop Self-Healing for Web Scrapers**  
> Built for the **"Into the Scrape-Verse"** Hackathon (Bright Data × WeMakeDevs).

---

## 🎯 The Problem & The SelfHeal Solution

Existing scraper monitoring tools (ScrapeOps, Spidermon) detect and alert on drift, but require humans to write code fixes. Bright Data Scraper Studio provides an AI-powered template refactor / self-healing flow, but it currently requires manual noticing and manual triggering.

**SelfHeal closes this loop**:
1. **Scrape & Validate**: Runs custom Bright Data Scraper Studio collectors and runs runtime **Zod schema validation** on every single field.
2. **Detect Drift**: Flags field-level missingness, type mismatches, or malformed data instantly.
3. **Automated AI Healing**: Automatically calls the Bright Data AI Flow endpoint (`/dca/collectors/{id}/refactor_template`) with target DOM context and field specifications.
4. **Human-in-the-Loop Review Gate**: Displays the AI-proposed diff on the dashboard for 1-click human approval or rejection.
5. **Re-run & Resolve**: Re-executes the healed collector, verifies extraction against the schema, and logs the complete audit trail in the event timeline.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│  LAYER 1 — DATA ACQUISITION (Bright Data Scraper Studio)  │
│  • Custom Collector(s) triggered via Collection API      │
│  • AI Flow API (/dca/collectors/{id}/refactor_template)  │
└──────────────────────────────────────────────────────────┘
                           │ raw JSON
                           ▼
┌──────────────────────────────────────────────────────────┐
│  LAYER 2 — VALIDATION & HEAL ORCHESTRATOR (Core Logic)   │
│  • Zod schema validation on every scrape run             │
│  • Drift detection & prompt generation                   │
│  • Automated AI Flow heal trigger                        │
│  • Event store & human-in-the-loop approval state engine │
└──────────────────────────────────────────────────────────┘
                           │ validated data & diffs
                           ▼
┌──────────────────────────────────────────────────────────┐
│  LAYER 3 — PRODUCT DASHBOARD (Next.js App Router)        │
│  • Collector Health & Run History                        │
│  • Drift/Heal Audit Timeline                             │
│  • Visual Diff Viewer & 1-Click Approve/Reject Gate      │
│  • Example Structured Output (Hackathon Rule 9)          │
└──────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v18+ or v20+)
- npm / pnpm / yarn

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file (copied from `.env.example`):
```env
DATABASE_URL="file:./dev.db"
BRIGHT_DATA_API_KEY=""
BRIGHT_DATA_CUSTOMER_ID=""
BRIGHT_DATA_ZONE=""
BRIGHT_DATA_MOCK="true"
PORT=3000
```
> **Note on Mock Simulation**: With `BRIGHT_DATA_MOCK="true"`, SelfHeal works locally out-of-the-box, allowing you to test normal runs, simulated DOM drift, AI healing diffs, and approval flows without needing live API tokens.

### 4. Database Setup
SelfHeal uses SQLite via Prisma locally (zero-installation required):
```bash
# Push schema to SQLite local database file
npx prisma db push

# (Optional) Seed demo collectors and baseline data
npm run db:seed
```

### 5. Run the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗄️ SQL Schema Reference (For Manual Database Setup)

If you prefer to set up your database manually (PostgreSQL or SQLite), here are the exact DDL statements:

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

### PostgreSQL DDL
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

## 🛠️ Key Commands

- `npm run dev`: Starts the Next.js development server on port 3000.
- `npm run build`: Compiles and builds the production bundle.
- `npm run db:push`: Pushes schema changes directly to the database.
- `npm run db:seed`: Seeds sample collectors and baseline runs.
- `npm run db:studio`: Launches Prisma Studio GUI for exploring database tables.

---

## 👥 Hackathon Disclosure
Developed using AI pair programming assistance in compliance with Hackathon Rule 10.
