# Architecture — SelfHeal

---

## 1. Architectural Overview

Three-layer architecture, established in the strategy discussion, chosen specifically because it makes the self-healing loop provable and inspectable rather than implicit:

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 1 — DATA ACQUISITION (Bright Data Scraper Studio) │
│  • One or more collectors (c_xxx), built for a specific   │
│    target site / field set, created via CLI or AI Agent  │
│  • Exposes heal capability via AI Flow API                │
└─────────────────────────────────────────────────────────┘
                          │  raw JSON, per run
                          ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 2 — VALIDATION & HEALING ORCHESTRATOR (own code)  │
│  • Schema validation on every scrape result                │
│  • Drift detection → automatic heal trigger on failure     │
│  • Event history: run_id, status, healed?, diff applied    │
└─────────────────────────────────────────────────────────┘
                          │  validated structured data
                          ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 3 — PRODUCT (dashboard)                            │
│  • Collector status, run history, drift/heal timeline      │
│  • Approval UI for AI-proposed fixes                        │
└─────────────────────────────────────────────────────────┘
```

Rationale: Layer 2 is the differentiator identified in the RCAFT research — existing monitoring tools (ScrapeOps, Spidermon) stop at detection/alerting; Scraper Studio's heal capability exists but requires manual triggering. Layer 2 is what closes the loop, so it must be the most carefully built and most clearly documented part of the codebase for judging criteria "technical excellence" and "reliability and self-healing."

## 2. Components

### Layer 1 — Bright Data Scraper Studio
- **Target Website (Decided):** A self-hosted clone of `books.toscrape.com` (free, legal scraping sandbox site; fictional bookstore with fields: `title`, `price`, `availability`, `rating`, `upc`). We host our own copy (Vercel/GitHub Pages/self-hosted test route) rather than relying on third-party live servers.
  - *Rationale:* Gives the team 100% edit control over the DOM. We can deliberately alter class names or DOM hierarchies right before the demo to trigger genuine, repeatable drift events without external rate limits or downtime risks, while fully adhering to the hackathon's "publicly available web data" rule.
- **Collector(s):** custom scrapers built via Scraper Studio (CLI, AI Agent, or IDE — all three produce the same collector type and are interoperable). Rule 5 requires this to be a custom collector, not a Bright Data Scrapers Library preset.
- **Collection API:** `/dca/trigger` — queues a run against a collector, returns a snapshot ID; used to run collectors and retrieve JSON results.
- **AI Flow API:** `/dca/collectors/{id}/refactor_template` — triggers the AI self-healing flow against a specific collector, given a plain-language field description and target URL. Healing is human-in-the-loop by default (proposes a diff; does not auto-apply).
- Bright Data's infrastructure handles proxy rotation, retries, CAPTCHA/anti-bot bypass, and JS rendering — none of this is the responsibility of SelfHeal's own code.

### Layer 2 — Orchestrator (own code)
- **Scheduler/trigger:** invokes collector runs (interval-based cron or manual trigger — exact mechanism TBD, see Section 6).
- **Validation module:** checks returned JSON fields against an expected schema (type, non-null, plausible format). Recommended: Zod (TypeScript) or Pydantic (Python), per the tech-stack decision below.
- **Drift detector:** flags a run as drifted when validation fails; writes a drift event record.
- **Heal trigger:** on drift, automatically calls the AI Flow heal endpoint with the relevant field description and target URL.
- **Event store:** persists run history — run_id, collector_id, timestamp, status (healthy/drifted/healing/resolved), and the diff proposed by the heal call.
- **Approval handler:** exposes the pending diff to Layer 3 for human review, and applies the approved state (re-run + re-validate) on approval.

### Layer 3 — Product (dashboard)
- Collector list with current status.
- Per-collector run history / timeline of drift and heal events.
- Diff viewer + approve/reject action for pending AI-proposed fixes.
- Example structured output display (satisfies rule 9's "example structured output" submission requirement directly from the live product).

## 3. Data Flow

1. Orchestrator triggers a collector run → Layer 1.
2. Layer 1 returns raw JSON to the orchestrator.
3. Orchestrator validates the JSON against the expected schema.
4. **Valid:** result stored, dashboard updated, event marked healthy.
5. **Invalid:** drift event stored, heal call made to Layer 1's AI Flow API, proposed diff stored as "pending approval," dashboard surfaces it.
6. User approves/rejects via dashboard.
7. On approval: orchestrator re-triggers the (now healed) collector, re-validates, updates event to "resolved," dashboard reflects the recovered data.

## 4. Technology Stack

Per the tech-stack decision made in this chat (Path A, chosen over Path B/Python because the product idea is not RAG/embedding-heavy):

| Layer | Technology | Rationale |
|---|---|---|
| Data acquisition | Bright Data Scraper Studio (CLI + AI Agent + Collection/AI Flow APIs) | Mandatory per hackathon rule 3 |
| Orchestration/backend | Node.js / TypeScript | One language across orchestration, API, and frontend — faster for a small team in a 7-day sprint |
| Schema validation | Zod | Maps directly onto "did the scraped JSON match what we expect" |
| Frontend/dashboard | Next.js | Enables a polished, deployed, demoable product quickly; supports the "Best UI" track |
| Database | PostgreSQL or SQLite (exact choice TBD, either is acceptable at this scale) | Lightweight persistence for drift-event history; no high-scale requirement at hackathon scope |
| Deployment | Vercel (leaning choice; not finalized) | Fast deploy path for a Next.js app; alternative not yet evaluated |
| Boilerplate starting point | Bright Data's official `bright-data-scraper-studio-nodejs-project` starter (trigger + poll wrapper) | Legitimate to fork per rule 8 — infrastructure/plumbing, not the custom scraper itself |

**Explicit exception:** if the eventual chosen idea leans toward the "Documentation to RAG" category instead of the scraper-reliability-monitor concept, Path B (Python, FastAPI, a vector store such as Chroma or pgvector) was identified as the better-fit stack for that specific direction. This document assumes the reliability-monitor direction (Option A from the strategy discussion) is the one being built.

## 5. APIs (external)

- Bright Data Collection API — `/dca/trigger` (run a collector, get a snapshot ID) and the corresponding result-retrieval/polling call.
- Bright Data AI Flow API — `/dca/collectors/{id}/refactor_template` (trigger self-heal).
- Bright Data CLI — used for collector creation (`scraper create`) and manual healing (`scraper heal`) during development; not necessarily used at runtime in the deployed product, which should call the underlying APIs directly.

No other external APIs are established in this chat. Any additional integration (alerting via Slack/email, auth provider, etc.) is stretch scope and **TBD**.

## 6. Deployment

- Target: a single deployed web app (dashboard + backend API) reachable via a public URL for judging, per the stated preference that a deployed link beats "clone and run npm install" during judging.
- Scheduling mechanism for periodic collector runs: **TBD** — options discussed only at a conceptual level (a cron job or scheduled function); exact implementation (Vercel Cron, a separate worker, etc.) not decided.
- Environment/secrets handling (Bright Data API tokens, DB connection string): standard practice implied, exact setup **TBD**.
- CI/CD: not discussed — **TBD**.

## 7. Non-Functional Notes

- The system must remain understandable end-to-end by the team, since rule 11 requires participants to explain the scraper, architecture, and technical decisions — this rules out opaque, heavily-forked, or not-understood components anywhere in Layer 2 (the core differentiator).
- Healing must stay human-in-the-loop (approval-gated), matching both Bright Data's own default behavior and the product's core value proposition (auditability) established in the RCAFT analysis.
