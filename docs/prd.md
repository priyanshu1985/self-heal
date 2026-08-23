# PRD — SelfHeal

**Project:** SelfHeal — Real-Time Reliability Monitor for Self-Healing Web Scrapers
**Context:** Built for the "Into the Scrape-Verse" hackathon (Bright Data × WeMakeDevs), Aug 17–23, 2026.

---

## 1. Problem Statement

Refined problem statement (established in RCAFT analysis, supersedes the original broader claim):

Existing scraper monitoring tools (e.g. ScrapeOps, Spidermon) can detect when a scraper's output silently breaks, but they still hand the fix back to a human. Bright Data Scraper Studio can repair a broken collector automatically via its AI Flow / self-heal API, but that repair has to be manually noticed and manually triggered today. **No single product closes this loop**: automatically detecting drift in a Scraper Studio collector's output, triggering an AI-proposed repair, and surfacing that repair for one-click human approval — with the whole cycle visible as an auditable history.

## 2. Goals

- Prove, live and on camera, that a Scraper Studio collector can detect its own extraction failure and repair itself with human approval, without a human rewriting code.
- Score strongly against all six hackathon judging criteria: potential impact, creativity/innovation, technical excellence, use of Scraper Studio, reliability/self-healing, presentation.
- Ship a complete, working, deployed submission within the 7-day hackathon window that satisfies all rule-9 submission requirements (public repo, README, example structured output, demo video, explanation of Scraper Studio usage).

## 3. Non-Goals (for the hackathon scope)

- Not building a general-purpose, scraper-agnostic monitoring tool (that market is already served by ScrapeOps/Spidermon — see RCAFT analysis). SelfHeal is explicitly scoped to Bright Data Scraper Studio collectors.
- Not building multi-tenant auth, billing, or a commercial SaaS layer. This is a hackathon MVP, not a production launch.
- Not scraping login-gated, paywalled, or private data (hackathon rule 6).
- Not using an existing pre-built Bright Data Scrapers Library scraper as the core deliverable (hackathon rule 5 — disqualifying).

## 4. Users / Personas

- **Primary user (in-product):** a developer or small data team running one or more Scraper Studio collectors who wants visibility into collector health and a fast, safe way to approve AI-proposed repairs instead of manually noticing and fixing broken extraction.
- **Secondary audience (hackathon-specific):** hackathon judges evaluating the project against the six published judging criteria.

Further persona detail (team size, industry, technical sophistication beyond "runs scrapers") is not established in this chat: **TBD**.

## 5. Core Features (MVP scope, per priority established in chat)

1. **Collector trigger** — run one or more Scraper Studio collectors against real public target site(s) via the Collection API (`/dca/trigger`) or CLI.
2. **Validation layer** — check every returned field against an expected schema (type, non-null, plausible format) on every run.
3. **Drift detection** — flag a run as "drifted" the moment a required field comes back missing, null, or malformed, and log it as a drift event.
4. **Heal trigger** — call Scraper Studio's AI Flow heal endpoint (`/dca/collectors/{id}/refactor_template`) when drift is detected, passing the original field description and target URL.
5. **Approval gate** — surface the AI's proposed fix as a diff for human approval before it's treated as resolved (human-in-the-loop, matching Bright Data's own default behavior).
6. **Dashboard** — show collector status, most recent run result, and a timeline of drift/heal events across all tracked collectors.
7. **Live break-and-heal demo path** — a reproducible way to intentionally break a target page's structure (self-controlled test target or edited local copy) to trigger the full loop on camera.

Features beyond this list (auto-scheduling beyond a basic interval, Slack/email alert integrations, multi-user accounts, a multi-collector "fleet" view) are explicitly **stretch scope**, not MVP — build only after the above works end-to-end.

## 6. User Workflow (primary flow)

1. User (or a scheduled job) triggers a tracked collector.
2. System receives JSON result, runs schema validation.
3. If valid → data flows to the dashboard, event logged as healthy.
4. If invalid → drift event logged, heal endpoint is called automatically.
5. System receives AI-proposed fix, displays it as a diff on the dashboard.
6. User reviews and approves (or rejects) the diff.
7. On approval, collector re-runs; validation re-checks; event marked resolved in the timeline.

## 7. Success Criteria

- The full workflow above runs end-to-end against at least one real collector before the demo is recorded.
- The break-and-heal cycle (Section 5, item 7) is demonstrated on camera, not just described.
- Submission includes all items required by hackathon rule 9.
- Any AI coding assistant usage during the build is disclosed per rule 10.

## 8. Constraints (established, non-negotiable)

- Must use Bright Data Scraper Studio to create and run a custom scraper (rule 3).
- Must not rely solely on an existing Bright Data Scrapers Library scraper (rule 5).
- Must use only publicly available web data (rule 6).
- Main coding/design work must start after the hackathon's official start (rule 7); pre-hackathon work is limited to planning, notes, and architecture diagrams.
- Team must be able to explain the scraper, architecture, and technical decisions (rule 11).

## 9. Target Website & Schema (Decided)

- **Scraping Target:** A self-hosted clone of `books.toscrape.com` (a free, legal scraping-practice sandbox site — fictional bookstore with static HTML). We host our own copy (e.g. via Vercel / GitHub Pages / internal endpoint) rather than scraping live `toscrape.com`.
  - **Rationale:** Chosen specifically to give us full edit control over the HTML structure, allowing us to deliberately modify page elements (rename classes, move price containers) right before the live demo to trigger real, repeatable drift on camera without depending on third-party uptime or rate limits, while fully satisfying the hackathon's "publicly available web data" rule.
- **Target Schema & Fields:**
  - `title` (`string`, required) — Book display title
  - `price` (`number`, required) — Book price in GBP/USD
  - `availability` (`string`/`boolean`, required) — In-stock availability status
  - `rating` (`number`, optional) — Star rating (1–5)
  - `upc` (`string`, required) — Unique Product Code identifier

## 10. Open Items — TBD

- Team size and role split: **TBD**.
- Hosting provider decision (Vercel vs. alternative): leaning **Vercel** per architecture discussion, final choice **TBD** at build time.
- Whether scheduling is cron-based or manually triggered for the MVP demo: **TBD** (manual trigger ready for demo).
