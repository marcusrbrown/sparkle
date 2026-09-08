/**
 * The one, exact, user-approved reviewed-association mapping for this
 * bounded lane. See `source-evidence.ts` for the extraction/validation
 * machinery this feeds; see that module's doc comment for why this is kept
 * as an explicit, externally supplied fact rather than something
 * `extractSourceEvidence` infers on its own.
 *
 * Approval record: a maintainer reviewed this specific association and
 * explicitly authorized encoding it as a `reviewed-association` — not as
 * original causal/planned intent. Neither chronological order nor shared
 * keywords between the two source documents prove the plan's goal actually
 * planned the ADR-001 fix; this mapping does not claim that they do. No
 * personal identity is recorded — `reviewKind: 'maintainer-reviewed'` is a
 * role/kind marker only.
 *
 * Source facts backing this mapping (declared, not live-verified via git):
 * - Plan goal: `.ai/plan/refactor-audit-improvements-1.md` — frontmatter
 *   `goal: Comprehensive Code Audit Improvements Implementation`, marked
 *   `status: Completed` as of `last_updated: 2025-10-01`. The plan's own
 *   first commit is dated 2025-09-29.
 * - ADR-001 + the `docs/tsconfig.json` `rootDir` fix it documents:
 *   `.ai/audit/audit-final-report.md` — Change 1 (TypeScript Configuration
 *   Fix, `**Solution**:` line) and ADR-001 (`**Decision**:` line), landed
 *   via commit `236ba68059847a663073843546417ab6b2f84e67`, dated
 *   2025-10-06.
 * - `expectedAction` pins the commit-supported upgrade to exactly the
 *   "Change 1: TypeScript Configuration Fix (HIGH-001)" action node — never
 *   to any other action the generic shared-token heuristic might (or might
 *   not) also find.
 * - The rejected alternatives and the reported verification outcome are
 *   already modeled by `extractSourceEvidence` itself (as `rejected-option`
 *   and `source-reported` edges respectively) and need no additional
 *   mapping here.
 */

import type {ReviewedAssociationMapping} from './source-evidence.js'

export const AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001: ReviewedAssociationMapping = {
  id: 'audit-improvements-plan-goal--adr-001-tsconfig-rootdir',
  from: {
    path: '.ai/plan/refactor-audit-improvements-1.md',
    sourceSnippet: 'goal: Comprehensive Code Audit Improvements Implementation',
    nodeTitle: 'Comprehensive Code Audit Improvements Implementation',
  },
  to: {
    path: '.ai/audit/audit-final-report.md',
    sourceSnippet: '### ADR-001: TypeScript Root Directory Configuration',
    nodeTitle: 'ADR-001: TypeScript Root Directory Configuration',
  },
  rationale:
    'Reviewed association (not causal intent): the audit-improvement initiative goal and ADR-001 are related project artifacts from the same audit effort. Plan marked complete 2025-10-01 (plan first commit 2025-09-29); ADR-001 + the docs/tsconfig.json rootDir fix it documents landed via commit 236ba68059847a663073843546417ab6b2f84e67 dated 2025-10-06. Neither chronological order nor shared keywords alone prove the plan planned this specific fix.',
  disclaimer: 'reviewed-association, not-causal-intent',
  reviewKind: 'maintainer-reviewed',
  reviewedDate: '2026-09-07',
  expectedAction: {
    path: '.ai/audit/audit-final-report.md',
    sourceSnippet: '**Solution**: Removed `rootDir` constraint to allow Astro configuration files in root directory',
    nodeTitle: 'Change 1: TypeScript Configuration Fix (HIGH-001)',
  },
  decisionActionUpgrade: {
    relationKind: 'commit-supported',
    commitRefs: [
      {
        sha: '236ba68059847a663073843546417ab6b2f84e67',
        date: '2025-10-06',
        note: 'ADR-001 report + docs/tsconfig.json rootDir fix commit (declared historical evidence, not a live git call).',
      },
    ],
  },
}
