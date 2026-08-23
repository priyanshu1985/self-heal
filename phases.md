# Phases — SelfHeal

Seven-day build plan, matching the hackathon schedule (Aug 17–23, 2026). Priorities and sequencing are based on the principle established in this chat: a boring working pipeline on day 1 beats a beautiful UI with no data on day 5, and the break-and-heal demo fixture must be built early, not left until the end.

---

## Phase 0 — Pre-Kickoff (before Aug 17)

**Allowed under rule 7:** planning, notes, architecture diagrams. **Not allowed:** actual coding or design work.

- Finalize idea direction (this document assumes Option A — the self-healing reliability monitor).
- Review this documentation set (`prd.md`, `architecture.md`, `rules.md`, `design.md`).
- Register for the hackathon; sign up for Bright Data and claim the $50 credit (code `wemakedevs`, lowercase).
- Target website selected: self-hosted clone of `books.toscrape.com` (gives 100% edit control over page HTML structure to ensure reliable, repeatable break-and-heal demo without external rate limits/downtime).
- Pre-select which starter boilerplate to fork (e.g. Bright Data's Node.js Scraper Studio starter) — decide, but do not clone/commit yet.

## Phase 1 — Day 1 (Kickoff): Core Pipeline

**Goal:** one working, ungated pipeline: scrape → validate → store. No UI polish yet.

- Build the first custom collector via Bright Data CLI/AI Agent against the self-hosted `books.toscrape.com` clone.
- Fork/adapt the chosen boilerplate for the trigger/poll wrapper.
- Implement the schema validation module (Zod) against the collector's expected fields.
- Confirm one full successful run produces valid, stored structured JSON.

**Milestone:** a real collector runs and returns validated data, end-to-end, even if ugly.

## Phase 2 — Day 2–3: Validation, Drift Detection, and Heal Loop

**Goal:** Layer 2 (the differentiator) works completely, even without a UI.

- Implement drift detection: flag a run when validation fails.
- Implement the automatic heal trigger against the AI Flow API (`refactor_template`) on drift.
- Implement the event store (run_id, collector_id, status, diff).
- Implement the approval handler (can be a simple script/CLI step at this stage — UI comes in Phase 3).
- Build Layer 3 skeleton in parallel if team size allows: basic API/routes for the dashboard to consume.

**Milestone:** the full detect → heal → approve → resolve loop works manually, at least once, end-to-end.

**Dependency:** Phase 2 depends on Phase 1's validation module and collector being functional.

## Phase 3 — Day 4: Break-and-Heal Demo Fixture

**Goal:** a reproducible way to intentionally break the target page's structure, ready before polish begins.

- Set up a self-controlled test target or an editable local copy of the target site's structure.
- Verify: normal run succeeds → structural change is introduced → run fails validation → drift is logged → heal is triggered → diff appears → approval resolves it → data flows correctly again.
- This is flagged in the original strategy discussion as the step most teams forget and then panic about near the deadline — do not defer this further.

**Milestone:** the break-and-heal cycle can be reliably triggered on demand, repeatably, for the demo recording.

**Dependency:** requires Phase 2's full loop to be working.

## Phase 4 — Day 5: UI Polish and Documentation

**Goal:** make the product presentable and satisfy submission requirements.

- Build/polish the dashboard: collector status, run history, drift/heal timeline, diff viewer with approve/reject action.
- Write the README: problem, architecture, and — explicitly — how Scraper Studio is used (required for judging criterion 4 and rule 9).
- Capture example structured output from a real run for the repo (rule 9 requirement).
- Disclose AI coding assistant usage in the README (rule 10 requirement).

**Milestone:** the product is deployed to a public URL and looks finished, not just functional.

## Phase 5 — Day 6: Demo Recording

**Goal:** produce the submission video.

- Script the video explicitly around the six judging criteria: problem, creativity, technical walkthrough, Scraper Studio usage, and — critically — the live break-and-heal cycle from Phase 3.
- Record a clean take; record a backup take in case the live API call behaves unpredictably during recording.

**Milestone:** demo video complete and reviewed against the judging criteria checklist.

## Phase 6 — Day 7: Buffer and Submission

**Goal:** submit early, not at the deadline.

- Fix anything that broke in the video or deployment.
- Finalize the repository (clean structure, clear README, example output present).
- Submit via the hackathon's submission form once it goes live on the event page.
- Do not wait until the final hour.

---

## Dependency Summary

- Phase 2 depends on Phase 1 (needs a working validated pipeline before drift detection makes sense).
- Phase 3 depends on Phase 2 (needs the full loop working before it can be deliberately triggered and demoed).
- Phase 4 depends on Phase 2/3 being stable (no point polishing UI around a broken loop).
- Phase 5 depends on Phase 3 and Phase 4 both being complete (needs both the reproducible break fixture and the polished product to record a good demo).

## Explicit Non-Milestones (deliberately deferred, per scope rules)

- Auto-scheduling beyond a basic interval, Slack/email alerting, multi-user accounts, multi-collector fleet views — only attempted if time remains after Phase 6, and never before the core loop (Phase 2–3) is proven.
