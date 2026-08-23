# Memory — SelfHeal (Context for Future AI Agents)

Read this first before touching any other file in this project. It's a compressed record of what's been decided, why, and what's still open.

---

## What this project is

**SelfHeal** — a reliability layer built on top of Bright Data Scraper Studio collectors. It detects when a scraper's extraction has drifted (missing/malformed fields), automatically triggers Bright Data's AI-powered self-heal API, and surfaces the proposed fix for human approval before treating it as resolved. Being built for the "Into the Scrape-Verse" hackathon (Bright Data × WeMakeDevs), Aug 17–23, 2026.

## Why this exact scope (don't re-litigate this without reason)

An earlier, broader version of the pitch ("a monitoring dashboard for self-healing scrapers") was checked against existing tools during research. **ScrapeOps and Spidermon already do real-time scraper monitoring and data-quality/drift detection with alerting.** That part is not novel. The defensible, narrower gap — confirmed via research, not assumed — is that nothing closes the loop from detection straight into an **AI-proposed, human-approved repair** wired specifically to Bright Data Scraper Studio's heal endpoint. The project is scoped around that narrower claim deliberately. Do not revert to the broader "nothing like this exists" framing — it's inaccurate and was explicitly corrected.

## Hard constraints (from hackathon rules — non-negotiable)

- Must build a **custom** Scraper Studio collector — cannot ship using only a pre-built Bright Data Scrapers Library scraper (disqualifying if violated).
- Must use only publicly available web data — no login-gated/paywalled/private content (disqualifying if violated).
- Main coding/design work starts only after the hackathon officially opens (Aug 17); pre-kickoff work is limited to planning/notes/diagrams.
- Submission must include: public repo, README, example structured output, demo video, explanation of Scraper Studio usage, and disclosure of any AI coding assistant use.
- Team must be able to explain the scraper, architecture, and every technical decision — do not let unexplainable AI-generated code into the core loop.

## Architecture in one paragraph

Three layers: **Layer 1** is Bright Data Scraper Studio itself (collectors + Collection API `/dca/trigger` + AI Flow API `/dca/collectors/{id}/refactor_template` for healing). **Layer 2** is the project's own orchestrator — schema validation (Zod) on every run, drift detection on validation failure, automatic heal trigger, and an event store logging run history. **Layer 2 is the actual differentiator** and the part that must be built cleanly and explainably. **Layer 3** is the Next.js dashboard: collector list, run history/timeline, a diff viewer with an approve/reject action (healing is human-in-the-loop by design, not just because Bright Data defaults to it), and an example-structured-output view.

## Tech stack decided

TypeScript/Node.js + Next.js + Zod + Postgres-or-SQLite (not finalized), deployed likely on Vercel. Chosen over a Python/FastAPI stack because the product direction (reliability monitor, not RAG/embeddings) doesn't need Python's ML ecosystem, and one language across the stack is faster for a small team in 7 days. If the idea ever pivots toward the "Documentation to RAG" category instead, Python/FastAPI + a vector store was identified as the better fit — but that is not the current direction.

## The single highest-leverage tactic (don't lose this)

Most competing teams will claim self-healing but never prove it. The plan is to **deliberately break a target page's structure on camera** (a self-controlled test target or an editable local copy) and show the full cycle live: normal run → structural change → validation failure → drift logged → heal triggered → diff shown → approved → data flowing correctly again. This must be built and rehearsed **before** UI polish, not left until the end — flagged twice already as the step teams forget.

## Sequencing logic (see phases.md for full detail)

Working pipeline first (scrape → validate → store), then the full detect → heal → approve loop, then the break-and-heal demo fixture, then UI polish, then record, then submit with a buffer day. Do not build UI polish or stretch features before the core loop (Layer 2) is proven end-to-end.

## Positioning for judges / pitch material

Lead with the refined problem statement (see `prd.md` Section 1), not the original broad one. Explicitly name ScrapeOps/Spidermon as prior art and explain the narrower gap this fills — this reads as credible research rather than a weakness. Be cautious quoting market-size numbers: research turned up wildly inconsistent figures ($875M–$14.95B for the same year across different reports) — if a number is needed, Mordor Intelligence's ~$1.03B (2025) figure is the most credibly sourced one found, and it should be cited as one estimate, not a settled fact.

## Target website decided

A **self-hosted clone of `books.toscrape.com`** (a free, legal scraping-practice sandbox site — fictional bookstore with static HTML; fields: `title`, `price`, `availability`, `rating`, `upc`). We host our own copy (e.g. via Vercel / GitHub Pages / internal test route) instead of scraping live `toscrape.com`. Chosen specifically to give 100% edit control over page HTML structure, allowing us to deliberately alter class names or DOM hierarchies right before the demo to trigger genuine, repeatable drift events on camera without relying on third-party uptime/rate limits, while fully satisfying the hackathon's "publicly available web data" rule.

## Known open decisions — TBD across all docs

- Exact database choice (Postgres vs SQLite — SQLite default implemented for local dev).
- Scheduling mechanism for periodic runs (cron service vs. manual trigger for demo).
- Team size and role split.
- Hosting provider final confirmation (Vercel is the leaning choice, not locked in).
- Secrets management approach beyond "don't commit tokens, use env vars."

## Documents in this set

`prd.md` (requirements/scope), `architecture.md` (system design), `rules.md` (external competition rules + internal technical/design/security rules), `phases.md` (7-day execution plan with dependencies), `design.md` (UX structure), and this file. Keep all six consistent — if a decision changes in one, update it everywhere it's referenced, especially here and in `architecture.md`.
