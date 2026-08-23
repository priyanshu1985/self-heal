# Design — SelfHeal

This document covers only the UX/UI elements established in this chat, derived from the architecture's Layer 3 (Product/dashboard) description and the design rules. Detailed visual design (colors, typography, spacing system, component library specifics) was not discussed — marked **TBD** throughout.

---

## 1. Design Principles (established)

- The dashboard's core job is to make the self-healing loop **visible and provable**, not just to display scraped data. Every screen should trace back to demonstrating detection → heal → approval → resolution.
- Prioritize a deployed, polished, working product over a large unfinished feature set — this directly targets the "Best UI" judging track.
- Favor simplicity and legibility over feature density — the product must remain something the team can explain clearly on camera within the demo, per rule 11 and judging criterion 6 (presentation).

## 2. Core Screens (derived from architecture Layer 3)

### 2.1 Collector List / Home
- Shows all tracked collectors and their current status.
- Purpose: at a glance, answer "which collectors are healthy, which are drifted, which are mid-heal."
- Exact status states: healthy / drifted / healing / pending approval / resolved (derived from the event lifecycle defined in `architecture.md` Section 3).

### 2.2 Collector Detail / Run History
- Shows a single collector's most recent run result and a timeline of past runs.
- Timeline entries include: timestamp, status, and (if applicable) a link to the associated drift/heal event.
- Purpose: this is the screen that proves reliability over time, not just in the moment — directly supports judging criterion 5.

### 2.3 Drift / Heal Event Timeline
- Chronological log of drift events across all collectors: when drift was detected, when heal was triggered, what was proposed, and current resolution status.
- This is the single most important screen for the demo, since it's the visible record of the entire value proposition established in the PRD and RCAFT analysis.

### 2.4 Diff Viewer / Approval Screen
- Displays the AI-proposed fix (the diff returned by the heal API call) for a specific drift event.
- Provides an approve/reject action — approval must be an explicit user action (human-in-the-loop, per the rules document); there is no auto-apply path.
- On approval, triggers the re-run + re-validation flow defined in `architecture.md`.

### 2.5 Example Structured Output View
- A view (or exportable section) showing real structured data pulled from a live collector run.
- Purpose: doubles as the "example structured output" required by hackathon rule 9, sourced directly from the live product rather than a separately maintained sample file.

## 3. Primary User Flow (mirrors PRD Section 6)

1. User lands on Collector List → sees overall health at a glance.
2. User opens a specific collector → sees its run history.
3. If a drift event is present → user is directed (or navigates) to the Diff Viewer.
4. User reviews the proposed fix and approves or rejects.
5. On approval, user returns to the Collector Detail screen and sees the run resolved, with fresh valid data.
6. User can view the Drift/Heal Timeline at any point to see the full audit history across all collectors.

## 4. Components Implied by the Above (not exhaustively specified)

- Status badge/indicator component (healthy / drifted / healing / pending approval / resolved).
- Timeline/list component for run history and drift events.
- Diff display component (before/after or unified diff view of the proposed extraction fix).
- Approve/Reject action component tied to a specific pending event.
- Structured-data table/JSON viewer for example output.

Exact component library, styling approach, and visual language (design tokens, color palette, typography, spacing, iconography) were **not discussed in this chat — TBD**. The tech stack in `architecture.md` names Next.js for the frontend; a specific UI/component library (e.g. a Tailwind-based kit) was referenced only generally in earlier strategy discussion as an example, not committed to — **TBD**.

## 5. Explicitly Out of Scope for Design (per phases.md / rules.md scope rules)

- Multi-user account screens or auth flows.
- Alerting/notification configuration screens (Slack/email).
- Multi-collector "fleet" visualizations beyond the basic list/timeline described above.

These may be considered only as stretch scope after the MVP loop (Phases 1–3 in `phases.md`) is proven, and no design work has been done for them.

## 6. Accessibility, Responsiveness, Branding

Not discussed in this chat — **TBD**. No accessibility requirements, responsive-breakpoint decisions, or branding/visual-identity decisions have been established.
