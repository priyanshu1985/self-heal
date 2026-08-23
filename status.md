# Project Status — SelfHeal ⚡

> **SelfHeal:** Real-Time Reliability Monitor & Human-in-the-Loop Self-Healing for Bright Data Scraper Studio Collectors  
> **Hackathon:** "Into the Scrape-Verse" (Bright Data × WeMakeDevs) | Aug 17–23, 2026  
> **Status Date:** August 23, 2026

---

## 1. Executive Status Overview

| Component | Status | Details |
|---|---|---|
| **Build & Typecheck** | 🟢 **Passing (0 Errors)** | TypeScript compilation (`tsc --noEmit`) passes cleanly with zero errors. |
| **Development Server** | 🟢 **Active** | Next.js 15 App Router running on `http://localhost:3000`. |
| **Database & ORM** | 🟢 **Initialized & Seeded** | SQLite database (`prisma/dev.db`) initialized with `Collector`, `Run`, and `DriftEvent` models. Seeded with default `c_books_toscrape` data. |
| **Styling & Design System** | 🟢 **Complete** | Modern dark mode design tokens, glassmorphism, responsive grid, and Tailwind CSS configured. |
| **Layer 1 (Data Acquisition)** | 🟢 **Configured** | Bright Data API client configured with live API key + offline mock simulation switch (`BRIGHT_DATA_MOCK`). |
| **Layer 2 (Orchestrator)** | 🟢 **Complete** | Runtime Zod schema validator, drift detector, AI prompt builder, and human approval handler implemented. |
| **Layer 3 (Dashboard UI)** | 🟢 **Complete** | All 5 primary screens built and connected to API routes. |
| **Target Website** | 🟢 **Decided** | Self-hosted clone of `books.toscrape.com` (full DOM edit control for reliable break-and-heal demo). |

---

## 2. Architectural Blueprint

```
┌──────────────────────────────────────────────────────────┐
│  LAYER 1 — DATA ACQUISITION (Bright Data Scraper Studio)  │
│  • Custom Collector (c_books_toscrape)                   │
│  • Collection API (/dca/trigger & /dca/get_result)       │
│  • AI Flow API (/dca/collectors/{id}/refactor_template)  │
└──────────────────────────────────────────────────────────┘
                           │ raw JSON per run
                           ▼
┌──────────────────────────────────────────────────────────┐
│  LAYER 2 — VALIDATION & HEAL ORCHESTRATOR (Core Engine)  │
│  • Dynamic Zod runtime schema validation on every run    │
│  • Field-level drift detection & classification          │
│  • Automatic AI Flow heal request dispatch               │
│  • Event store & human approval state machine            │
└──────────────────────────────────────────────────────────┘
                           │ validated data & diffs
                           ▼
┌──────────────────────────────────────────────────────────┐
│  LAYER 3 — PRODUCT DASHBOARD (Next.js App Router)        │
│  • Collector Health & Run History                        │
│  • Chronological Drift & Heal Audit Timeline             │
│  • Visual Diff Viewer & 1-Click Approval Gate            │
│  • Example Structured Output (Hackathon Rule 9)          │
└──────────────────────────────────────────────────────────┘
```

---

## 3. How Bright Data Scraper Studio Is Used

1. **Collector Creation (Build Time)**: Custom collectors created via Scraper Studio CLI (`scraper create`) or Web IDE defining the initial JavaScript extraction template.
2. **Collection API (`/dca/trigger`)**: SelfHeal triggers collector runs via API; Bright Data handles proxy rotation, anti-bot bypass, and JS rendering.
3. **AI Flow Healing API (`/dca/collectors/{id}/refactor_template`)**: When schema drift is detected by Zod, SelfHeal automatically invokes AI Flow with target DOM context, expected field specifications, and error reasons to generate a refactored template and code diff.
4. **Human-in-the-Loop Review Gate**: SelfHeal presents the proposed diff on the UI. Upon operator approval, the updated template is applied, and an automated verification run is triggered.

---

## 4. Decided Target Website & Field Schema

* **Target Site:** A self-hosted clone of `books.toscrape.com` (fictional bookstore with static HTML).
* **Rationale:** Gives 100% edit control over page HTML structure to intentionally modify selectors and trigger real, repeatable drift events on camera without third-party rate limits or uptime risks, while fully complying with Hackathon Rule 6 (public data).
* **Schema Fields:**
  * `upc` (`string`, required) — Unique product code identifier
  * `title` (`string`, required) — Book display title
  * `price` (`number`, required) — Book unit price in GBP (£)
  * `rating` (`number`, optional) — Star rating (1.0 to 5.0)
  * `availability` (`string`, required) — Stock availability status

---

## 5. Completed Application Views & Endpoints

### 🖥️ Frontend Dashboard Views
* `/` (`app/page.tsx`) — **Collector Dashboard**: Overview metrics (Healthy, Drifted, Pending Approvals), collector list, and instant **"Normal Run"** vs **"⚡ Break & Heal Demo"** triggers.
* `/collectors/[id]` (`app/collectors/[id]/page.tsx`) — **Collector Detail**: Schema rules inspector, active extraction template, and raw vs validated payload inspector.
* `/timeline` (`app/timeline/page.tsx`) — **Drift & Heal Timeline**: Chronological audit trail of all drift incidents, AI proposals, and resolutions.
* `/diff/[id]` (`app/diff/[id]/page.tsx`) — **AI Diff Review Gate**: Side-by-side / unified diff viewer with 1-click **"Approve & Re-Run"** and **"Reject"** actions.
* `/output` (`app/output/page.tsx`) — **Example Structured Output**: Live formatted JSON viewer satisfying Hackathon Rule 9.

### 🔌 Backend API Endpoints
* `GET /api/collectors` & `POST /api/collectors` — List and create collectors.
* `GET /api/collectors/[id]` & `DELETE /api/collectors/[id]` — Fetch details or delete collectors.
* `POST /api/collectors/[id]/trigger` — Trigger scrape run $\to$ validate $\to$ detect drift $\to$ heal.
* `GET /api/runs` — Fetch execution history.
* `GET /api/drift-events` — Fetch drift timeline records.
* `POST /api/drift-events/[id]/approve` — Human approval gate $\to$ applies template $\to$ re-verifies.
* `POST /api/drift-events/[id]/reject` — Reject proposed AI template diff.
* `GET /api/test-target` — Mock endpoint serving original vs broken DOM for Phase 3 testing.

---

## 6. Environment & Configuration State

Configured in `.env`:
* `DATABASE_URL="file:./dev.db"` (Local SQLite database)
* `BRIGHT_DATA_API_KEY` (Configured and secured server-side)
* `BRIGHT_DATA_MOCK="false"` (Ready for live API execution; set to `"true"` for offline simulation)
* `PORT=3000`

---

## 7. Next Action Items (Per `phases.md`)

1. **Deploy Hosted Target**: Host the static `books.toscrape.com` HTML clone to a public URL (e.g. Vercel or GitHub Pages).
2. **Link Live Collector**: Point the Bright Data Scraper Studio collector at the public URL.
3. **Execute Break-and-Heal Rehearsal**: Edit the hosted DOM, trigger drift, approve the AI diff, and confirm resolution on camera.
4. **Record Submission Video**: Demonstrate the live break-and-heal flow covering all 6 hackathon judging criteria.
5. **Finalize README & Submit**: Export sample structured output from `/output`, include Scraper Studio documentation, and submit before the deadline.
