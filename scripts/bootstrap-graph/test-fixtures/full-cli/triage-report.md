# Lane 5 `.ai/` Triage Report (fixture, full-cli lane)

Fixture triage report shaped like the real Unit 2 `.ai/_archive/triage-2026-05-24.md` report: 16 unique ARCHIVE-classified paths, 4 of which also carry a PROMOTE annotation. 2 of the 16 are gitignored in a fresh clone and resolve only via `--source-root`.

## PROMOTE (4 — annotations on ARCHIVE entries below, not separate files)

1. `.ai/docs/LESSONS_LEARNED.md` — category **PATTERN**
2. `.ai/security/localStorage-security-audit-2025-09-30.md` — category **CONSTRAINTS**
3. `.ai/notes/radix-form-architecture-decisions.md` — category **DECISION**
4. `.ai/audit/audit-final-report.md` — category **ENVIRONMENT**

## ARCHIVE (16)

| # | Path | Historical disposition | Resolves |
| --- | --- | --- | --- |
| 1 | `.ai/plan/refactor-audit-improvements-1.md` | Completed Oct 1 2025; all 25 tasks shipped. | Revision clone. |
| 2 | `.ai/plan/feature-accessible-form-component-1.md` | Completed; shipped Form component. | Revision clone. |
| 3 | `.ai/plan/feature-theme-management-package-1.md` | Completed; shipped theme package. | Revision clone. |
| 4 | `.ai/plan/feature-moo-dang-shell-1.md` | Completed; shipped app. | Revision clone. |
| 5 | `.ai/plan/infrastructure-build-pipeline-1.md` | Completed; tsdown/project-refs/Turborepo work landed. | Revision clone. |
| 6 | `.ai/plan/infrastructure-testing-framework-1.md` | ARCHIVE per linked TASK brief. | Revision clone. |
| 7 | `.ai/audit/audit-final-report.md` | Historical snapshot; also PROMOTE #4. | Revision clone. |
| 8 | `.ai/audit/audit-phase1-baseline.md` | Completed audit artifact. | Revision clone. |
| 9 | `.ai/audit/audit-phase2-analysis.md` | Completed audit artifact. | Revision clone. |
| 10 | `.ai/audit/audit-phase3-identification.md` | Completed audit artifact. | Revision clone. |
| 11 | `.ai/audit/typescript-project-references-audit.md` | TASK-001 deliverable, Sept 2025. | Revision clone. |
| 12 | `.ai/analysis/task-008-turborepo-analysis.md` | TASK-008 complete. | Revision clone. |
| 13 | `.ai/docs/LESSONS_LEARNED.md` | Historic writeup; also PROMOTE #1. | Primary checkout only (gitignored). |
| 14 | `.ai/docs/IMPLEMENTATION_CHANGELOG.md` | 25-task provenance record. | Primary checkout only (gitignored). |
| 15 | `.ai/notes/radix-form-architecture-decisions.md` | Completed Form research; also PROMOTE #3. | Revision clone. |
| 16 | `.ai/security/localStorage-security-audit-2025-09-30.md` | Audit record; also PROMOTE #2. | Revision clone. |
