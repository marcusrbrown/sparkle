---
date: 2026-05-24
topic: sparkle-2026-direction
focus: open-ended ideation after 6-month dep-bump treadmill — bias toward surprising directions, not obvious next steps
mode: repo-grounded
---

# Ideation: Sparkle 2026 Direction

## Grounding Context

**Project shape:** TypeScript playground monorepo on pnpm + Turborepo. Mature pieces: `@sparkle/ui` (Radix + Tailwind), `@sparkle/theme` (cross-platform token system with `TokenTransformer` for web + RN), `@sparkle/test-utils` (factory-based mocks), `@sparkle/error-testing` (fluent `TestScenarioBuilder`), `@sparkle/storybook` (Playwright visual regression), Astro Starlight docs at <https://sparkle.mrbro.dev> with auto JSDoc extraction, `apps/fro-jive` (Expo), `apps/moo-dang` (WASM web shell — Zig executables, xterm.js, Web Workers, 446+ tests).

**Status (May 2026):** 6 months of pure Renovate / dep-bump commits since the Oct 2025 audit. No feature work. Just added Fro Bot agent workflow (PR review + maintenance + autoheal + live docs validation via `agent-browser`). Sister repos (`marcusrbrown/marcusrbrown`, `mrbro.dev`) are already agent-native. `docs/solutions/` (compound-docs) does NOT exist yet.

**Strong codebase signals:**

- 20/20 most-recent commits are `chore(deps)` / `chore(dev)`
- `packages/ui/src/components/` has only `Button` + `Form` — massive scaffolding-to-payload ratio
- `apps/moo-dang/src/shell/` has 30+ files of production-grade infrastructure trapped inside one app
- `apps/moo-dang/src/wasm/src/shell_api.zig` is an explicit 8-extern-fn host surface (de-facto WASM executable ABI)
- `.github/copilot-instructions.md` documents ~600 lines of conventions with near-zero machine enforcement
- `.ai/`, `.specstory/history/`, and 1660+ PR bodies sit un-harvested
- `scripts/` has 6 imperative TS validators with hand-rolled error formats, chained via `pnpm check`
- Visual regression: 5 files / 714 lines covering 2 components — claims-vs-reality gap

## Ranked Ideas

### 1. `@sparkle/sandbox` — extract moo-dang as a published agent runtime

**Description:** Re-position `moo-dang` from "demo WASM shell" to a published, embeddable, sandboxed Unix-ish execution environment for any web app or AI agent. Stable `shell_api.zig` ABI, virtual FS, Worker isolation, an iframe-embeddable bundle + Cloudflare Worker variant. Optional standardized `.wax` executable format spec on top. **Warrant:** `direct:` `apps/moo-dang/src/shell/` has 30+ files (parser, pipeline, job-controller, completion-engine, history-manager, VFS); `wasm/src/shell_api.zig` is an 8-extern-fn host surface; 446+ tests; Web Worker isolation done. **None of this is exposed as a package.** Sister repos are agent-native and would consume it. **Rationale:** Marcus has accidentally built the only privacy-first, fully-local, Zig-based agent sandbox. Every LLM platform (OpenAI code interpreter, Anthropic computer use) reinvents this badly. Extraction is a small wrapper around mature internals. **Downsides:** Loud public surface; needs a real consumer commitment; protocol/ABI freeze is a maintenance contract you can't easily walk back. **Confidence:** 80% **Complexity:** Medium **Status:** Unexplored

### 2. `@sparkle/observe` — privacy-first telemetry SDK

**Description:** Opt-in, self-hosted-first, cross-platform (web + RN + WASM) structured event emitter on top of `consola`. Ships with privacy-policy template + consent UI + structured export/delete handlers. OpenTelemetry-compatible. Sparkle docs site is the first dogfooder. **Warrant:** `direct:` `AGENTS.md` Telemetry & Data section encodes opt-in / self-hosted / minimum-data / data-export-required as hard requirements. `consola` already a hard dep. `@sparkle/theme` proves cross-platform pattern. No off-the-shelf SDK matches that posture. **Rationale:** Productizes a _principle_ most projects treat as boilerplate. Unique market position (Plausible-of-app-telemetry). Aligns hard with Marcus's privacy + open-source + AI overlap. **Downsides:** Telemetry is a feature people add late; adoption requires building demand. Cross-platform consent UX is non-trivial. **Confidence:** 70% **Complexity:** Medium-High **Status:** Unexplored

### 3. Auto-harvest knowledge graph — bypass manual compound-docs

**Description:** Skip the "create `docs/solutions/`" obvious move. Build a harvester that mines `.ai/` (already 22 artifacts), `.specstory/history/`, merged PR bodies, conventional commits, and Fro Bot autoheal reports into structured compound-docs entries with frontmatter. Surface as a queryable knowledge graph (MCP tool). Each new solved problem auto-indexes. **Warrant:** `direct:` `.ai/audit/`, `.ai/plan/`, `.ai/review/`, `.specstory/history/` all exist with rich content. `docs/solutions/` does NOT exist. `ce:compound` skill assumes manual authorship. 1660+ PRs sitting un-indexed. **Rationale:** Manual compound-docs writing won't happen during a treadmill year. Source material is already in the repo. Compounds with Fro Bot autoheal (which writes new reports daily). Each crawl benefits all future agent queries across sister repos. **Downsides:** Quality vs noise ratio of auto-extraction; needs a curation step. Risk of "garbage indexed = garbage served." **Confidence:** 75% **Complexity:** Medium **Status:** Explored

### 4. `@sparkle/agent-tools` — MCP layer over Sparkle's capabilities

**Description:** Wrap `scripts/health-check.ts`, `validate-*.ts`, `generate-docs.ts`, `TokenTransformer`, `TestScenarioBuilder`, and the visual-regression baselines into an MCP server. Every agent (Fro Bot, Copilot, OpenCode) gets first-class structured tools instead of shelling into `pnpm` and parsing stdout. Includes a perception tool (`vr.diff(component, theme)`) so agents can reason over pixel changes. **Warrant:** `direct:` `scripts/` has 6 imperative TS validators with hand-rolled error formats; `pnpm check` chains 5 of them via `&&`; Fro Bot just landed but only has shell access; `opencode.jsonc` only points at copilot-instructions, no MCP wiring; visual baselines exist and are opaque to agents. **Rationale:** Add one tool → every agent run across every sister repo benefits monotonically. Replaces stdout-reparse-per-invocation with structured contracts. **Downsides:** MCP ecosystem is still young; tool-design choices have long tails. Some overlap with native CLI ergonomics. **Confidence:** 75% **Complexity:** Medium **Status:** Unexplored

### 5. Story-driven contracts — one story emits JSDoc + a11y + VR + docs

**Description:** Author one annotated `Component.stories.tsx` (with `role`, `interactions`, `a11y` intent metadata). Build step derives: `@example` blocks back into component sources, Vitest interaction tests, axe-core a11y assertions, Playwright VR baselines (variant × theme × viewport), docs API page. Today these are written four times by hand. **Warrant:** `direct:` `packages/storybook/test/visual-regression/` has 5 files / 714 lines covering 2 components (Button, Form). `docs/scripts/generate-docs.ts` separately extracts JSDoc. `@storybook/addon-a11y` is configured but runs independently. The matrix promised in `AGENTS.md` ("all themes / all browsers / all viewports") cannot be sustained manually. **Rationale:** Removes a category of drift. Makes coverage a property of the convention, not contributor discipline. The next component pays a much smaller authoring tax. **Downsides:** Codegen-from-stories has historically tripped over edge cases. Initial Story DSL design is high-skill work. **Confidence:** 65% **Complexity:** High **Status:** Unexplored

### 6. Pruning question: retire `fro-jive` and replace "native" with Tauri 2 + SwiftUI

**Description:** `fro-jive` Expo app shows zero recent feature activity; RN ecosystem (Expo SDK, Metro, safe-area-context) is a big share of the dep-bump tax. Either explicitly delete it (admit cross-platform = PWA), or replace with a Tauri 2 desktop shell that runs `@sparkle/ui` natively, plus a thin SwiftUI iOS companion consuming `@sparkle/tokens` (extracted theme). **Warrant:** `direct:` PR #1657 `react-native-safe-area-context 5.8.0` is one of many recent RN bumps; `apps/fro-jive/` has no roadmap entries in `.ai/plan/`; `TokenTransformer.toNative()` is the only fro-jive-load-bearing code path; Marcus's stated interests (embedded, home automation, native) don't map cleanly to RN. **Rationale:** Clears RN treadmill cost. Tauri + SwiftUI is more honest about what Marcus actually ships. Frees attention for the additive ideas above. **Downsides:** Throws away `@sparkle/theme`'s native adapter test surface; cross-platform-via-PWA loses real-mobile fidelity; loud retirement of a publicly "Active" package. **Confidence:** 55% **Complexity:** Low (delete) or High (replace with Tauri+SwiftUI) **Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
| --- | --- | --- |
| 1 | Build a real ambitious component (CommandPalette/DataGrid) | Below ambition floor — implied TODO, doesn't warrant team discussion |
| 2 | Delete `@sparkle/ui` entirely | Subject-replacement — abandons the design system that's still being invested in |
| 3 | Replace changesets with LLM-derived changelog | Too expensive vs value; changesets already works |
| 4 | Changeset-stories tying changesets to live story previews | Interesting but narrow; better as a side experiment |
| 5 | `@sparkle/showroom` Storybook-killer | Too expensive vs adoption; market education burden too high for a playground repo |
| 6 | Token compiler extracted as `@sparkle/tokens` | Well-trodden ground (Style Dictionary, Theo); revisit only if Tauri+SwiftUI lane chosen |
| 7 | Maintenance-as-telemetry dashboard | Better surfaced as Fro Bot maintenance-report enhancement, not standalone |
| 8 | Renovate-patterns library | Better as a side blog post / preset PR than direction-setting |
| 9 | Capture-replay test mocks from runtime traces | Narrow; fits inside the convention-enforcement cluster |
| 10 | Tokens derived from visual baselines (inverse) | Too speculative, hard to ground in a reasonable timeline |
| 11 | Zig-authored shared primitives with JS bindings | Distant payoff; revisit after `@sparkle/sandbox` lands |
| 12 | Convention enforcement (eslint plugin + create-sparkle CLI + declarative spec) | Folded into whichever forward bet is chosen — every survivor benefits from convention enforcement |
| 13 | Sparkle docs as the runtime (live IDE site) | Cross-cutting concern; absorbed into ideas 1, 3, 4 |
| 14 | Story-driven contracts as standalone | Promoted to survivor #5 |
| 15 | Visual regression as agent perception MCP | Absorbed into survivor #4 (`agent-tools` MCP includes `vr.diff` tool) |
