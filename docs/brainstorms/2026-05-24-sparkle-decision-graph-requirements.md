---
date: 2026-05-24
topic: sparkle-decision-graph
---

# Sparkle Decision Graph

> **Superseded in part (2026-09-06):** the storage, viewer, and OpenCode/MCP assumptions below describe Deciduous v0.15.0 and were replaced against v0.17.1. See the revision note in `docs/plans/2026-05-24-001-feat-sparkle-decision-graph-plan.md`, which is authoritative where the two disagree.

## Summary

Adopt [Deciduous](https://notactuallytreyanastasio.github.io/deciduous/) to build and publish a living decision graph for `marcusrbrown/sparkle`, seeded from sparkle's git history and the curated `.ai/` planning archive, refreshed weekly, exposed as (a) a published graph viewer at `sparkle.mrbro.dev/graph` and (b) input context for Fro Bot's scheduled maintenance and autoheal runs. PR-time inline citation in reviews is explicitly deferred to a post-v1 iteration.

---

## Problem Frame

Sparkle has 1660+ commits and six months of pure dependency-bump activity since the Oct 2025 audit. The institutional memory that _should_ make this repo navigable — why `@sparkle/theme` uses a `TokenTransformer` instead of Style Dictionary, why `apps/moo-dang` was scoped as a Web Worker shell instead of an iframe sandbox, why the 6-phase audit chose factory mocks over shared instances — lives in scattered surfaces: planning artifacts about to be archived, merged PR bodies, conventional commit messages, and (going forward) Fro Bot's daily reports. None of it is queryable; none of it surfaces when an agent or contributor touches the relevant code.

Manual compound-docs writing is a chore that did not happen during the treadmill year and probably will not happen during the next one. Meanwhile sister repos (`marcusrbrown/marcusrbrown`, `mrbro.dev`) are running agent-native workflows that re-derive the same context from scratch on every run because there is nowhere to retrieve it from. The cost shape is "every agent run pays full archaeology cost forever," and it grows monotonically as the repo accumulates more history.

---

## Actors

- A1. **Marcus** (maintainer): browses the graph to recover context before architectural decisions.
- A2. **Fro Bot** (autoheal + maintenance): consumes the graph as input context in scheduled runs; emits new observation / decision / outcome nodes from autoheal results.
- A3. **OpenCode sessions** (Marcus + future contributors): query the graph via Deciduous's MCP server at the start of a session to load relevant institutional memory.
- A4. **External readers** (open-source visitors to `sparkle.mrbro.dev/graph`): secondary surface; a richer "how did this project evolve" artifact than a CHANGELOG. _Not_ a v1 success criterion; the graph's primary audience is A1–A3.

---

## Key Flows

- F1. **Validation spike** _(must complete before any other flow ships)_
  - **Trigger:** Marcus runs `deciduous init --opencode` locally against a sparkle checkout.
  - **Actors:** A1.
  - **Steps:** (1) Install Deciduous (`cargo install deciduous` or Homebrew). (2) Initialize with `deciduous init --opencode` in a sparkle worktree. (3) Use the OpenCode-integrated skill to seed a handful of `goal` / `decision` / `action` / `outcome` nodes from the last ~10 merged PRs and 1–2 `.ai/plan/*` artifacts (via `deciduous add` + `deciduous link` + `deciduous doc attach`). (4) Run `deciduous serve` and visually inspect the graph. (5) Run `deciduous sync` and confirm the exported `.deciduous/web/graph-data.json` is reasonable.
  - **Outcome:** Either the workflow is confirmed viable for sparkle and the rest of v1 proceeds; or the spike surfaces blockers and the Key Decision changes from "Deciduous is the right tool" to "Deciduous unless proven insufficient" — at which point this brainstorm gets reopened.
  - **Covered by:** R1

- F2. **Bootstrap + weekly refresh**
  - **Trigger:** First scheduled run of the new harvest workflow (or manual `workflow_dispatch`); weekly cron thereafter.
  - **Actors:** A2.
  - **Steps:** (1) `scripts/bootstrap-graph.ts` walks the `.ai/` artifacts identified by the Lane 5 triage report (persisted at `.ai/_archive/triage-2026-05-24.md`) plus merged PR bodies from at least the last 12 months plus the full `git log`, and emits `deciduous add` / `deciduous link` / `deciduous doc attach` invocations to build the initial graph. (2) Run `deciduous sync` to refresh `.deciduous/web/graph-data.json`. (3) Commit the updated `.deciduous/` artifacts. (4) Trigger docs site redeploy when the export changed.
  - **Outcome:** A dense graph covering sparkle's full lifecycle is queryable locally, via MCP, and published.
  - **Covered by:** R2, R3, R4, R5, R6

- F3. **Agent context priming**
  - **Trigger:** Fro Bot scheduled run, or start of an OpenCode session with Deciduous's MCP server loaded.
  - **Actors:** A2 (Fro Bot in CI), A3 (interactive OpenCode sessions).
  - **Steps:** (1) Fro Bot's `MAINTENANCE_PROMPT` and `AUTOHEAL_PROMPT` are extended to call `deciduous graph` (JSON dump) or `deciduous show <id>` against the committed `.deciduous/deciduous.db` as part of preflight context. (2) OpenCode sessions use `deciduous init --opencode`-installed MCP tools to query the graph by topic / file path / commit. (3) Returned node bundles inform agent reasoning for the rest of the run.
  - **Outcome:** Sessions begin with relevant institutional memory loaded. Repeated archaeology is eliminated.
  - **Covered by:** R7, R8

---

## Requirements

**Validation prerequisite**

- R1. The validation spike (F1) must complete with a working local graph and a successful `deciduous serve` review before any subsequent requirement is implemented. If the spike surfaces a blocker (CLI gap, viewer regression, license issue, abandonment signal), the brainstorm is reopened; downstream requirements are paused.

**Bootstrap and refresh**

- R2. A repo-local script `scripts/bootstrap-graph.ts` produces the initial graph by walking three sources and shelling out to the Deciduous CLI:
  - the `.ai/` artifacts identified by the Lane 5 triage report (the file at `.ai/_archive/triage-2026-05-24.md` is the canonical input list);
  - merged PR bodies from at least the last 12 months (capture-window may extend back to any PR explicitly referenced by an in-scope `.ai/` artifact);
  - the full `git log`.
- R3. The Deciduous database (`.deciduous/deciduous.db`) and supporting state (`.deciduous/sync/`, `.deciduous/documents/`, `.deciduous/web/graph-data.json`, `.deciduous/narratives.md`, `.deciduous/config.toml`, `.deciduous/.version`) are committed to the repo. `deciduous sync` is run before every commit that touches the graph.
- R4. A dedicated weekly workflow at `.github/workflows/decision-graph.yaml` re-runs the bootstrap (or an incremental equivalent) against new commits and merged PRs, runs `deciduous sync`, commits any deltas, and triggers a docs-site redeploy when the export changed. The workflow is independent of `fro-bot.yaml` — failures in one must not block the other.

**Publication**

- R5. The graph is published at the URL `sparkle.mrbro.dev/graph` (the published Deciduous viewer reading the exported `.deciduous/web/graph-data.json`). Whether the viewer is linked out as a sibling GitHub Pages site or embedded inside the existing Starlight site is a planning decision; the URL contract is stable either way. The viewer renders without auth.
- R6. The published viewer ships with: a deliberate empty-state explanation when the graph has <50 nodes (to avoid an "abandoned project" feeling during the bootstrap window); a freshness indicator showing last-sync timestamp; and a one-screen legend explaining Deciduous's seven node types (`goal` / `option` / `decision` / `action` / `outcome` / `observation` / `revisit`). No separate documentation page — the viewer is self-explanatory.

**Agent integration**

- R7. Fro Bot's `MAINTENANCE_PROMPT` and `AUTOHEAL_PROMPT` are extended to invoke `deciduous graph` (JSON dump) or `deciduous show <id>` from a bash preflight step before the agent runs. The agent receives the relevant subset of graph context as input. CI does not depend on the MCP server.
- R8. OpenCode sessions use `deciduous init --opencode`'s installed MCP server for interactive graph queries. The MCP integration is opt-in per session, not auto-loaded.

---

## Acceptance Examples

- AE1. **Covers R1.** Given Marcus has run `deciduous init --opencode` in a sparkle worktree and seeded 5–10 nodes from recent PRs and one `.ai/plan/*` artifact, when he runs `deciduous serve --port 3000` and opens the viewer, the graph displays the expected node types with their edges, attached documents are accessible, and the Q&A pane responds to a trivial query.
- AE2. **Covers R2, R3, R4.** Given the weekly workflow runs successfully and N new commits + M merged PRs landed since the previous run, when the workflow completes, the committed `.deciduous/deciduous.db` contains nodes for the new material, `.deciduous/web/graph-data.json` reflects the new state, and the docs site redeploys in the same workflow run.
- AE3. **Covers R5, R6.** Given the published graph at `sparkle.mrbro.dev/graph` is loaded by a first-time visitor, when the page renders, the visitor sees the freshness indicator, the node-type legend, and (if the graph has <50 nodes) an empty-state explanation rather than an apparently-broken viewer.
- AE4. **Covers R7.** Given Fro Bot's autoheal run encounters a failing PR whose root cause overlaps a prior `outcome` node committed in the graph, when the autoheal prompt executes its preflight, the graph query surfaces that prior outcome and the bot's fix narrative references it.

---

## Success Criteria

**Human outcome (Marcus, A1)**

- Marcus can browse sparkle's decision history at `sparkle.mrbro.dev/graph` and answer "why did we do X" in under 60 seconds for any post-Oct 2025 decision without opening `.ai/_archive/` or `git log`.

**Agent compounding (A2, A3)**

- After the bootstrap lands, at least one Fro Bot maintenance or autoheal run per week successfully cites at least one specific graph node (`outcome`, `decision`, or `revisit`) in its perpetual report. This is a _retrieval-events_ metric: it confirms the graph is doing work, not just sitting there.

**Operational**

- The graph is refreshed within 7 days of the most recent merged commit on `main`.
- The bootstrap script is reproducible: running it against a fresh checkout produces a comparable graph (same nodes, same edges, modulo Deciduous-internal IDs).

**Downstream-agent handoff**

- `ce:plan` can pick up this requirements doc and produce an implementation plan without inventing product behavior, scope boundaries, or success criteria. The largest open implementation decision — whether the viewer is embedded in Starlight or linked out as a sibling Pages site — is explicitly the first thing the plan should tackle.

---

## Scope Boundaries

- **PR-time inline citation in Fro Bot reviews is out of scope for v1.** Defer until the F3 agent-context path has demonstrated retrieval value for at least one full quarter. Adding it earlier compounds prompt-engineering complexity with a second-order false-positive risk on review noise.
- **Cross-repo graphs are out of scope for v1.** Sister repos (`marcusrbrown/marcusrbrown`, `mrbro.dev`, `tokentoilet`, `vbs`) are not graphed in v1. If they adopt Deciduous later, each runs its own independent graph; sparkle's pattern is the template.
- **A portfolio-level meta-graph linking decisions across repos is not in scope.** Documented as a future idea; do not design for it.
- **No replacement of `.changeset/` or the existing CHANGELOG flow.** The graph is additive context, not a release-notes mechanism.
- **No retroactive backfill of every historical PR comment thread.** The bootstrap uses PR _bodies_ + commits + `.ai/`; PR-comment archaeology is a stretch optimization for later.
- **No human-curated node-by-node review during bootstrap.** Trust the bootstrap script's output for v1 (correctness target is "good enough to query," not "perfect history"). If R2 produces obviously-wrong nodes, fix the script, not the graph; if it produces _individually_ wrong nodes within an otherwise-sound graph, leave them and let `deciduous archaeology pivot` capture corrections as new graph history.
- **A separate Astro Starlight `/api/graph-architecture/` documentation page is out of scope for v1.** The viewer itself carries the legend and freshness indicator (R6). If a richer docs page proves necessary it can land later.

---

## Key Decisions

- **Use Deciduous as a user _and_ contributor, not just a showcase.** Adopt the published CLI + skill + MCP server unmodified for v1; if Deciduous gaps surface during implementation that block sparkle's adoption, upstream a PR rather than building a local fork or workaround. This is a deliberately less-humble posture than the original brainstorm captured.
- **Bootstrap via a custom script (`scripts/bootstrap-graph.ts`) rather than the OpenCode skill alone.** The script gives the bootstrap deterministic, re-runnable behavior. The OpenCode skill is used by A1/A3 _interactively_; the bootstrap is mechanical and should not require a session.
- **Graph DB + sync artifacts are committed to the repo, not regenerated.** Deciduous is designed for this (the schema is git-mergeable and the event-log sync model supports it); committing them gives every contributor and CI run the same graph state without a separate hosting concern.
- **Fro Bot CI consumes the graph via `deciduous graph` / `deciduous show` shell calls, not via MCP.** MCP is the right surface for interactive OpenCode sessions; the CI surface needs only read-only JSON access and benefits from being shell-callable.
- **The Lane 5 `.ai/` triage report is persisted as `.ai/_archive/triage-2026-05-24.md` as part of the bootstrap.** The bootstrap script reads it directly; session memory is not load-bearing infrastructure.
- **Dedicated weekly workflow rather than a Fro Bot category.** Keeps graph automation independent from Fro Bot's prompt-evolution surface; failures don't cascade between systems; cadence can diverge from Fro Bot's daily schedule.
- **The published viewer is the only docs surface for v1.** Cut the separately-planned `/decisions` or `/graph-architecture` Starlight page; the viewer's empty-state explanation, legend, and freshness indicator carry the entry-level explanation.
- **Cut PR-time inline citation from v1.** See Scope Boundaries — defer to post-v1 with explicit gating.

---

## Dependencies / Assumptions

- **Deciduous as the chosen tool — eyes-open.** Bus factor is 1 (single maintainer, `notactuallytreyanastasio`), project age is ~5.5 months as of May 2026, release cadence is ~2 minor versions per month, latest commit within the last week. Sparkle adopts knowingly; the validation spike (F1) is the local-evidence gate, and the "user + contributor" Key Decision is the escape hatch if upstream stalls.
- **Native OpenCode integration exists.** `deciduous init --opencode` installs MCP server + OpenCode-specific templates. The integration is first-class, not a sparkle-side adapter.
- **No documented prior art for embedding Deciduous's viewer in Astro Starlight.** The viewer is a standalone embedded HTML bundle + `graph-data.json`. The planning step must pick: (a) link out from Starlight to a sibling GitHub Pages site, or (b) iframe / asset-import into a Starlight route. Both are technically feasible.
- **The Lane 5 `.ai/` triage report (currently in this session's history) must be persisted as `.ai/_archive/triage-2026-05-24.md` before or during the bootstrap step.** This is captured as an explicit task in Key Decisions, not an environmental assumption.
- **`deciduous serve` / `deciduous sync` produce a viewer suitable for public display.** Visual fidelity to sparkle's Starlight theme is _not_ a v1 requirement (see Scope Boundaries); the viewer's stock styling is acceptable for v1.

---

## Outstanding Questions

### Resolve Before Planning

- _(none — all major product decisions resolved in brainstorm)_

### Deferred to Planning

- [Affects R5][Technical] Viewer surface: linked-out GitHub Pages sibling site at `sparkle.mrbro.dev/graph` vs iframe / asset-import inside the existing Starlight site. Pick during planning; the published-URL contract is stable either way.
- [Affects R2][Needs research] Bootstrap script implementation language and runner: TypeScript via `tsx` (matching repo convention) vs Bash (matching workflow conventions) vs Deciduous's own narrative-mode automation. Planning step should prototype the lightest viable shape.
- [Affects R2][Needs research] How aggressively the bootstrap script should classify commits into Deciduous's node types vs leaving the long tail as `observation` nodes. Need to inspect real output from the F1 spike before pinning a heuristic.
- [Affects R4][Technical] Concurrency / locking on graph artifact: what happens if a weekly refresh races with a manual `workflow_dispatch`? Probably trivial via GitHub Actions concurrency, but planning should make it explicit.
- [Affects R7][Needs research] Optimal JSON payload size injected into Fro Bot prompts. The full graph may exceed practical prompt-input limits as the graph grows; planning should define a filter / pagination strategy.
- [Affects success criteria][Needs research] Implementation of the "at least one retrieval event per week" metric — does Fro Bot's perpetual report format need to expose graph-node citations as a structured field for counting, or is a free-text grep against the report body sufficient?
