#!/usr/bin/env tsx
import type {SourceDocumentInput} from './bootstrap-graph/source-evidence.js'
import {readFileSync} from 'node:fs'
import process from 'node:process'

import {consola} from 'consola'
import {acceptReviewedStage} from './bootstrap-graph/accept.js'
import {
  runBuildStage,
  type BuildStageInput,
  type BuildStageResult,
  type SourceEvidencePassResult,
} from './bootstrap-graph/build-stage.js'
import {sanitizeCliOutput} from './bootstrap-graph/cli-output.js'
import {
  batchDepsCommits,
  buildGitLogArgv,
  classifyCommit,
  collectCommitsFromGitLog,
  parseGitLogOutput,
  type ClassifiedCommit,
  type CommitInput,
  type DepsBatch,
} from './bootstrap-graph/commits.js'
import {
  resolveWithinRoot,
  validateAttachmentBytes,
  type AttachmentValidationResult,
  type StagingIsolationResult,
} from './bootstrap-graph/fs-safety.js'
import {
  captureStagedInventory,
  computeInventoryDigest,
  EXPORT_RELATIVE_PATHS,
  loadAcceptedBoundInventory,
  loadAcceptedInventory,
  resolveBoundOnlyPaths,
  scopeInventoryToBoundValidationPaths,
  scopeInventoryToManagedPaths,
  SOURCE_EVIDENCE_ARTIFACT_PATHS,
  verifyStagedInventoryUnchanged,
} from './bootstrap-graph/inventory.js'
import {
  buildGhPrListArgv,
  checkArtifactPreflight,
  loadPrFixture,
  normalizePrBody,
  parsePrFixture,
  selectEligiblePrs,
  type NormalizedPr,
  type PreflightResult,
  type PrInput,
} from './bootstrap-graph/pr-normalize.js'
import {acquireMergedPrSnapshot, type PrReferenceInput, type RawMergedPr} from './bootstrap-graph/pr-source.js'
import {
  executeFreshPromote,
  executeRecoveryPromote,
  planFreshPromote,
  planRecoveryPromote,
  readDestinationState,
  type FreshPromotePlan,
  type RecoveryPromotePlan,
  type RecoveryPromoteStep,
} from './bootstrap-graph/promote.js'
import {
  loadSnapshotProvenance,
  validateCanonicalProvenanceShape,
  writeSnapshotProvenance,
} from './bootstrap-graph/provenance.js'
import {
  checkDeciduousVersion,
  checkRepoGraphNotAlreadySeeded,
  createDeciduousRunner,
  createGhRunner,
  ensureIsolatedStagingDeciduous,
  getNodeChangeId,
  parseCreatedNodeLocalId,
  PINNED_DECIDUOUS_VERSION,
  resolveGithubOwnerRepo,
  type CommandResult,
  type CommandRunner,
} from './bootstrap-graph/runners.js'
import {
  validateEdgeRecordSchema,
  validateGitHistoryExportSchema,
  validateGraphExportSchema,
  validateNodeRecordSchema,
  validateTagRecordSchema,
  validateThemeRecordSchema,
} from './bootstrap-graph/schema.js'
import {
  scanPayloadForSecrets,
  scanTextForSecrets,
  type SecretScanMatch,
  type SecretScanRule,
} from './bootstrap-graph/secrets.js'
import {prepareSourceSnapshot, resolveStagedArtifactPath, SourceSnapshotError} from './bootstrap-graph/snapshot.js'
import {
  CANONICAL_ARCHIVE_COUNT,
  CANONICAL_PROMOTE_COUNT,
  parseTriageReport,
  validateCanonicalTriageShape,
  type TriageArtifact,
} from './bootstrap-graph/triage.js'
import {runValidateStage, type ValidateStageResult} from './bootstrap-graph/validate-stage.js'

export {runSourceEvidencePass} from './bootstrap-graph/build-stage.js'
export {assertStagingIsolation} from './bootstrap-graph/fs-safety.js'
export {computeInventoryDigest} from './bootstrap-graph/inventory.js'

/**
 * Sparkle decision-graph bootstrap.
 *
 * Builds a staged Deciduous record set from the Lane 5 `.ai/` triage report,
 * `git log`, and merged PR bodies, validates it, and (as an explicit separate
 * step) promotes it into the repo's committed `.deciduous/sync/` store and
 * `docs/public/{graph-data.json,git-history.json}` exports.
 *
 * This file is the CLI facade: argv parsing, help text, and command
 * dispatch. Every stage's actual logic lives in `scripts/bootstrap-graph/`,
 * split along the build/validate/promote stage boundaries (plus a handful
 * of small, cycle-free shared modules: secret scanning, schema validation,
 * staged-content inventory/review-binding, and subprocess runners). This
 * facade re-exports every symbol those modules define so existing callers
 * and tests keep importing from `./bootstrap-graph.js` unchanged.
 *
 * See docs/plans/2026-05-24-001-feat-sparkle-decision-graph-plan.md, Unit 4.
 */

// ---------------------------------------------------------------------------
// Re-exports: every symbol this module previously defined directly, now
// implemented in scripts/bootstrap-graph/*.ts. Grouped by originating stage
// module so the boundary is visible here even after re-export.
// ---------------------------------------------------------------------------

export {scanPayloadForSecrets, scanTextForSecrets}
export type {SecretScanMatch, SecretScanRule}

export {CANONICAL_ARCHIVE_COUNT, CANONICAL_PROMOTE_COUNT, parseTriageReport, validateCanonicalTriageShape}
export type {TriageArtifact}

export {batchDepsCommits, buildGitLogArgv, classifyCommit, collectCommitsFromGitLog, parseGitLogOutput}
export type {ClassifiedCommit, CommitInput, DepsBatch}

export {buildGhPrListArgv, checkArtifactPreflight, loadPrFixture, normalizePrBody, parsePrFixture, selectEligiblePrs}
export type {NormalizedPr, PreflightResult, PrInput}

export {
  checkDeciduousVersion,
  checkRepoGraphNotAlreadySeeded,
  createDeciduousRunner,
  ensureIsolatedStagingDeciduous,
  getNodeChangeId,
  parseCreatedNodeLocalId,
  PINNED_DECIDUOUS_VERSION,
  resolveGithubOwnerRepo,
}
export type {CommandResult, CommandRunner}

export {resolveWithinRoot, validateAttachmentBytes}
export type {AttachmentValidationResult, StagingIsolationResult}

export {
  validateEdgeRecordSchema,
  validateGitHistoryExportSchema,
  validateGraphExportSchema,
  validateNodeRecordSchema,
  validateTagRecordSchema,
  validateThemeRecordSchema,
}
export type {StagedInventory} from './bootstrap-graph/inventory.js'

export {
  acceptReviewedStage,
  captureStagedInventory,
  loadAcceptedBoundInventory,
  loadAcceptedInventory,
  resolveBoundOnlyPaths,
  scopeInventoryToBoundValidationPaths,
  scopeInventoryToManagedPaths,
  SOURCE_EVIDENCE_ARTIFACT_PATHS,
  verifyStagedInventoryUnchanged,
}
export type {DestinationState} from './bootstrap-graph/promote.js'
export type {
  SnapshotProvenance,
  SourceEvidenceEdgeProvenance,
  SourceEvidenceNodeProvenance,
  SourceEvidenceProvenance,
} from './bootstrap-graph/provenance.js'

export {executeFreshPromote, executeRecoveryPromote, planFreshPromote, planRecoveryPromote, readDestinationState}
export type {FreshPromotePlan, RecoveryPromotePlan, RecoveryPromoteStep}

export {runBuildStage}
export type {BuildStageInput, BuildStageResult, SourceEvidencePassResult}
export type {SchemaValidationResult} from './bootstrap-graph/schema.js'
export {loadSnapshotProvenance, validateCanonicalProvenanceShape, writeSnapshotProvenance}

export {runValidateStage}
export type {ValidateStageResult}

export {sanitizeCliOutput}

// ---------------------------------------------------------------------------
// CLI entrypoint: argv parsing, help, and command dispatch
// ---------------------------------------------------------------------------

export type ParsedCliArgs =
  | {readonly kind: 'help'}
  | {readonly kind: 'error'; readonly message: string}
  | {
      readonly kind: 'build'
      readonly stagingDir: string
      readonly repo: string
      readonly triagePath: string
      /** Optional test/dev override — see pr-source.ts's `fixtureOverride`. Never mandatory; the default path calls `gh` for real. */
      readonly prFixturePath: string | undefined
      readonly snapshot: string
      readonly runWindowId: string
      readonly sourceRoot: string | undefined
      /** Git ref to pin the source snapshot to. Defaults to 'main' — never silently falls back to a stale local main when a caller asks for a specific ref/SHA. */
      readonly ref: string | undefined
      /** Explicit `owner/repo` for the real `gh` PR-acquisition path, when it can't be resolved from the source repo's `origin` remote. */
      readonly githubRepo: string | undefined
    }
  | {readonly kind: 'validate'; readonly stagingDir: string}
  | {readonly kind: 'accept'; readonly stagingDir: string; readonly expectedDigest: string | undefined}
  | {readonly kind: 'promote-fresh'; readonly stagingDir: string; readonly destination: string}
  | {readonly kind: 'promote-recovery'; readonly stagingDir: string; readonly destination: string}

const HELP_TEXT = `Usage: bootstrap-graph <command> [options]

Commands:
  build      Run the build stage against a staged, isolated checkout
             Required: --staging-dir --repo --triage --snapshot --run-window
             Optional: --source-root --ref --github-repo
                       --pr-fixture (TEST/DEV OVERRIDE ONLY — skips real gh entirely when set;
                       the default production path calls gh for real merged-PR acquisition)
  validate   Run the validate stage against a staged build output
             Required: --staging-dir
  accept     Explicit human-review-binding step: bound to a --digest you cite from a
             prior "validate" run. Re-runs validate, confirms the current staged
             content's digest exactly matches --digest (refuses on any mismatch—
             stale digest, wrong value, or changed bytes—never silently rebinds to
             new content), then persists accepted-inventory.json as the exact bytes
             promote is allowed to use. Never runs implicitly.
             Required: --staging-dir --digest <hash from "validate" output>
  promote fresh      Promote a staged, reviewed output into an empty destination
                      Required: --staging-dir --destination
  promote recovery   Retry promotion of the same reviewed staged output after an interruption
                      Required: --staging-dir --destination

Options:
  -h, --help  Print this help message

This never targets sparkle's real .deciduous/sync/ on its own — --destination
must be explicitly provided for every promote invocation.`

function readFlags(
  args: readonly string[],
  required: readonly string[],
  optional: readonly string[] = [],
): Record<string, string> | string {
  const flags: Record<string, string> = {}
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i]
    if (typeof token === 'string' && token.startsWith('--')) {
      const name = token.slice(2)
      const value = args[i + 1]
      if (value === undefined) {
        return `flag ${token} is missing a value`
      }
      flags[name] = value
      i += 1
    }
  }
  for (const name of required) {
    if (!(name in flags)) {
      return `missing required flag: --${name}`
    }
  }
  for (const name of Object.keys(flags)) {
    if (!required.includes(name) && !optional.includes(name)) {
      return `unknown flag: --${name}`
    }
  }
  return flags
}

/**
 * Parses `bootstrap-graph`'s argv into a validated command, or a `help`/
 * `error` result. No argument at all is treated as an actionable error
 * (with help text), not a silent no-op — the script always reports what it
 * did or why it refused to run.
 */
export function parseCliArgs(argv: readonly string[]): ParsedCliArgs {
  if (argv.includes('-h') || argv.includes('--help')) {
    return {kind: 'help'}
  }
  if (argv.length === 0) {
    return {kind: 'error', message: 'no command given. Run with --help for usage.'}
  }

  const [command, ...rest] = argv

  if (command === 'build') {
    const flags = readFlags(
      rest,
      ['staging-dir', 'repo', 'triage', 'snapshot', 'run-window'],
      ['source-root', 'ref', 'pr-fixture', 'github-repo'],
    )
    if (typeof flags === 'string') {
      return {kind: 'error', message: flags}
    }
    return {
      kind: 'build',
      stagingDir: flags['staging-dir'] ?? '',
      repo: flags.repo ?? '',
      triagePath: flags.triage ?? '',
      prFixturePath: flags['pr-fixture'],
      snapshot: flags.snapshot ?? '',
      runWindowId: flags['run-window'] ?? '',
      sourceRoot: flags['source-root'],
      ref: flags.ref,
      githubRepo: flags['github-repo'],
    }
  }

  if (command === 'validate') {
    const flags = readFlags(rest, ['staging-dir'])
    if (typeof flags === 'string') {
      return {kind: 'error', message: flags}
    }
    return {kind: 'validate', stagingDir: flags['staging-dir'] ?? ''}
  }

  if (command === 'accept') {
    const flags = readFlags(rest, ['staging-dir'], ['digest'])
    if (typeof flags === 'string') {
      return {kind: 'error', message: flags}
    }
    return {kind: 'accept', stagingDir: flags['staging-dir'] ?? '', expectedDigest: flags.digest}
  }

  if (command === 'promote') {
    const [subcommand, ...promoteRest] = rest
    if (subcommand !== 'fresh' && subcommand !== 'recovery') {
      return {
        kind: 'error',
        message: `unknown promote subcommand: ${subcommand ?? '(none)'}. Expected "fresh" or "recovery".`,
      }
    }
    const flags = readFlags(promoteRest, ['staging-dir', 'destination'])
    if (typeof flags === 'string') {
      return {kind: 'error', message: flags}
    }
    return {
      kind: subcommand === 'fresh' ? 'promote-fresh' : 'promote-recovery',
      stagingDir: flags['staging-dir'] ?? '',
      destination: flags.destination ?? '',
    }
  }

  return {kind: 'error', message: `unknown command: ${command}. Run with --help for usage.`}
}

/**
 * The script's CLI entrypoint. Dispatches to the build/validate/promote
 * stages. Never touches sparkle's real `.deciduous/sync/` implicitly —
 * every destination path is an explicit `--destination` argument, and this
 * function itself is not invoked against one anywhere in this unit's tests.
 */
export async function runCli(argv: readonly string[]): Promise<{exitCode: number; output: string}> {
  try {
    return await runCliInner(argv)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {exitCode: 1, output: `Error: ${sanitizeCliOutput(message)}`}
  }
}

async function runCliInner(argv: readonly string[]): Promise<{exitCode: number; output: string}> {
  const parsed = parseCliArgs(argv)

  if (parsed.kind === 'help') {
    return {exitCode: 0, output: HELP_TEXT}
  }
  if (parsed.kind === 'error') {
    return {exitCode: 1, output: `Error: ${parsed.message}\n\n${HELP_TEXT}`}
  }

  if (parsed.kind === 'validate') {
    const result = runValidateStage(parsed.stagingDir)
    if (!result.ok) {
      return {exitCode: 1, output: `validate: FAILED\n${result.errors.join('\n')}`}
    }
    // Guaranteed resolvable here — runValidateStage's own bound-path resolution already passed as
    // part of `result.ok`. Re-checked defensively rather than assumed.
    const boundOnlyResult = resolveBoundOnlyPaths(parsed.stagingDir)
    if ('error' in boundOnlyResult) {
      return {exitCode: 1, output: `validate: FAILED\n${boundOnlyResult.error}`}
    }
    // Digest binds every validation INPUT (private provenance.json + frozen source-evidence
    // documents), not merely the managed records/exports — see scopeInventoryToBoundValidationPaths.
    // A later change to provenance.json (e.g. sourceEvidence deleted, requiredArtifactPaths
    // shrunk) invalidates this digest even if the managed records/exports are byte-identical.
    const digest = computeInventoryDigestFromStaging(parsed.stagingDir, boundOnlyResult.paths)
    return {
      exitCode: 0,
      output: `validate: ok (bound-inventory digest ${digest} — not yet accepted; run "accept" before promoting)`,
    }
  }

  if (parsed.kind === 'accept') {
    if (parsed.expectedDigest === undefined) {
      return {
        exitCode: 1,
        output:
          'Error: accept requires --digest <hash> — the exact digest reported by a prior "validate" run against these bytes. This binds acceptance to a human-reviewed value; it never trusts a freshly recaptured snapshot as if it were already reviewed.',
      }
    }

    const validation = runValidateStage(parsed.stagingDir)
    if (!validation.ok) {
      return {exitCode: 1, output: `accept: refused — validate did not pass\n${validation.errors.join('\n')}`}
    }

    // Same bound scope as "validate"'s reported digest — a --digest computed before provenance.json
    // (or a source-evidence document) was mutated will now correctly mismatch here.
    const boundOnlyResult = resolveBoundOnlyPaths(parsed.stagingDir)
    if ('error' in boundOnlyResult) {
      return {exitCode: 1, output: `Error: ${boundOnlyResult.error}`}
    }
    const currentDigest = computeInventoryDigestFromStaging(parsed.stagingDir, boundOnlyResult.paths)
    if (currentDigest !== parsed.expectedDigest) {
      return {
        exitCode: 1,
        output: `Error: digest mismatch — provided --digest ${parsed.expectedDigest} does not match the current staged content's digest ${currentDigest}. The staged bytes changed since the digest you're citing was reported (e.g. a re-run build, or you're citing a stale "validate" output). Run "validate" again to get the current digest, review the current output, then accept with that exact digest.`,
      }
    }

    const result = acceptReviewedStage(parsed.stagingDir)
    if (!result.ok) {
      return {exitCode: 1, output: `accept: refused — validate did not pass\n${result.errors.join('\n')}`}
    }
    const acceptedBound = loadAcceptedBoundInventory(parsed.stagingDir)
    const digest = acceptedBound === undefined ? '(unavailable)' : computeInventoryDigest(acceptedBound)
    const accepted = loadAcceptedInventory(parsed.stagingDir)
    const provenance = loadSnapshotProvenance(parsed.stagingDir)
    const artifactCount = provenance?.requiredArtifactPaths.length ?? 0
    return {
      exitCode: 0,
      output: `accept: ok — confirmed digest ${digest} matches the cited --digest, accepted-inventory.json written (${Object.keys(accepted?.files ?? {}).length} managed file(s), ${artifactCount} required artifact(s) in provenance). Promote will independently re-verify this digest before writing.`,
    }
  }

  if (parsed.kind === 'promote-fresh' || parsed.kind === 'promote-recovery') {
    // NOTE (B1.4 fix): `loadAcceptedInventory` (accepted-inventory.json) is intentionally NOT read
    // as an authority anywhere below — only its presence is required, as a human-legible artifact
    // that a real `accept` ran. The actual copy set is always DERIVED from `boundStaged` after it
    // has been independently hash-reverified (see below), never from this separate file's own
    // paths/hashes: a copy inventory read directly from accepted-inventory.json could be tampered
    // (an added private-path key, or a dropped managed-record key) without `verifyStagedInventoryUnchanged`
    // ever noticing, since that check only ever ran against `boundStaged`.
    const acceptedReviewArtifact = loadAcceptedInventory(parsed.stagingDir)
    const boundStaged = loadAcceptedBoundInventory(parsed.stagingDir)
    if (acceptedReviewArtifact === undefined || boundStaged === undefined) {
      return {
        exitCode: 1,
        output:
          'Error: no accepted-inventory.json/accepted-bound-inventory.json found for this staging directory. Run acceptReviewedStage after a real human review of the Stage 3 output before promoting.',
      }
    }

    // Independent re-verification: never trust accepted-inventory.json's mere presence as proof
    // that a real `accept` (and therefore a real, passing `runValidateStage`) ever ran against
    // this content — a hand-authored or otherwise bypassed accepted-inventory.json that happens to
    // hash-match the current staged bytes must not be enough to promote content that would
    // actually fail validation.
    const promoteRevalidation = runValidateStage(parsed.stagingDir)
    if (!promoteRevalidation.ok) {
      return {
        exitCode: 1,
        output: `Error: promote refused — the staged content no longer passes validation (accepted-inventory.json alone is not sufficient)\n${promoteRevalidation.errors.join('\n')}`,
      }
    }

    // Re-verified against the BOUND (superset) inventory, not the copy-only inventory — a change to
    // provenance.json (sourceEvidence deleted, requiredArtifactPaths shrunk) or one of the frozen
    // source-evidence documents after acceptance must abort promotion even when every managed
    // record and export is byte-identical to what was reviewed.
    const reverification = verifyStagedInventoryUnchanged(parsed.stagingDir, boundStaged)
    if (!reverification.ok) {
      return {
        exitCode: 1,
        output: `Error: staged content changed since acceptance (tampered or newly written) — aborting before touching the destination. Changed: ${reverification.changedPaths.join(', ')}`,
      }
    }

    // B1.4 fix: the copy inventory is DERIVED from the just-reverified boundStaged, never read from
    // accepted-inventory.json's own (unverified) paths/hashes. scopeInventoryToManagedPaths filters
    // boundStaged back down to exactly the managed-record + export subset, so even if boundStaged
    // itself somehow carried an extra private-path key, that key is dropped here — the copy set is
    // always both hash-verified (via boundStaged's reverification above) and allow-listed (via this
    // filter), never a blind read of a separately-writable JSON file.
    const staged = scopeInventoryToManagedPaths(boundStaged, EXPORT_RELATIVE_PATHS)
    const destinationState = readDestinationState(parsed.destination, EXPORT_RELATIVE_PATHS)
    if (parsed.kind === 'promote-fresh') {
      const plan = planFreshPromote(destinationState, staged)
      if (plan.kind === 'refuse') {
        return {exitCode: 1, output: `promote fresh: refused — ${plan.reason} (present: ${plan.present.join(', ')})`}
      }
      executeFreshPromote(parsed.destination, parsed.stagingDir, plan)
      return {exitCode: 0, output: `promote fresh: copied ${plan.filesToCopy.length} file(s)`}
    }
    const plan = planRecoveryPromote(destinationState, staged)
    if (plan.kind === 'abort') {
      return {
        exitCode: 1,
        output: `promote recovery: aborted — ${plan.reason} (${plan.path}). No files were overwritten.`,
      }
    }
    executeRecoveryPromote(parsed.destination, parsed.stagingDir, plan)
    const copied = plan.steps.filter(step => step.kind === 'copy-missing').length
    return {
      exitCode: 0,
      output: `promote recovery: copied ${copied} missing file(s), skipped ${plan.steps.length - copied} identical file(s)`,
    }
  }

  // build
  const triageArtifacts = parseTriageReport(readFileSync(parsed.triagePath, 'utf8'))

  // Public production gate: the triage report actually used must match the canonical Lane 5
  // shape (16 unique ARCHIVE artifacts, 4 PROMOTE-annotated) — refused before any staging write
  // or Deciduous invocation. A 1-artifact (or empty) triage file is a legitimate input for the
  // generic, lower-level runBuildStage/runValidateStage functions used directly by unit tests, but
  // is never a legitimate `build` command success.
  const canonicalShapeErrors = validateCanonicalTriageShape(triageArtifacts)
  if (canonicalShapeErrors.length > 0) {
    return {
      exitCode: 1,
      output: `Error: triage report does not match the canonical Lane 5 shape\n${canonicalShapeErrors.join('\n')}`,
    }
  }

  // Public production gate: refuse before any staging write when --repo's own .deciduous/sync/
  // already has real graph records — independent of, and checked before, staging-directory
  // isolation (SAFETY (A1) covers the staging-nested-inside-repo case separately).
  const repoAlreadySeededError = checkRepoGraphNotAlreadySeeded(parsed.repo)
  if (repoAlreadySeededError !== undefined) {
    return {exitCode: 1, output: `Error: ${repoAlreadySeededError}`}
  }

  const pinnedRef = parsed.ref ?? 'main'

  // Freezes repoRoot at pinnedRef (resolved to a concrete SHA) into an isolated staged checkout,
  // plus every required triage artifact's bytes (tracked-at-that-SHA or --source-root fallback),
  // before any Deciduous state exists for this run. All of prepareSourceSnapshot's own validation
  // (staging isolation vs repoRoot/sourceRoot, git-root check, ref resolution, required-artifact
  // preflight) runs before it writes anything, and it refuses outright if --staging-dir already
  // exists — so a caller can never point `build` at an already-seeded staging directory.
  let snapshot: Awaited<ReturnType<typeof prepareSourceSnapshot>>
  try {
    snapshot = await prepareSourceSnapshot({
      repoRoot: parsed.repo,
      stagingRoot: parsed.stagingDir,
      pinnedRef,
      sourceRoot: parsed.sourceRoot,
      // Combines the triage report's own required paths with the two fixed
      // SOURCE_EVIDENCE_ARTIFACT_PATHS documents the approved reviewed mapping reads. Both are
      // UNCONDITIONALLY required — not probed for existence first — so the source-evidence pass
      // can never be silently skipped by a repo/fixture missing these two files; a missing one
      // fails preflight here, before any staging write, exactly like every other required
      // artifact. Deduped: both paths are already members of the real canonical 16-artifact triage
      // set, so a real production run never inflates past 16.
      requiredArtifactPaths: [
        ...new Set([...triageArtifacts.map(artifact => artifact.path), ...SOURCE_EVIDENCE_ARTIFACT_PATHS]),
      ],
      // Reuses the CLI's existing --snapshot timestamp rather than a fresh `Date.now()` capture,
      // so the same instant governs both the source freeze and selectEligiblePrs' PR-window cutoff.
      capturedAt: parsed.snapshot,
    })
  } catch (error) {
    if (error instanceof SourceSnapshotError) {
      return {exitCode: 1, output: `Error: ${sanitizeCliOutput(error.message)}`}
    }
    throw error
  }

  ensureIsolatedStagingDeciduous(parsed.stagingDir)

  const runner = createDeciduousRunner()
  // Version-checked against the isolated staging directory, never the source repo — the
  // source repo (e.g. a real sparkle checkout) may itself have a committed .deciduous/config.toml,
  // and running any deciduous command with cwd=repo would operate on that real graph.
  const versionCheck = await checkDeciduousVersion(runner, parsed.stagingDir)
  if (!versionCheck.ok) {
    return {
      exitCode: 1,
      output: `Error: deciduous ${PINNED_DECIDUOUS_VERSION} required on PATH, found: ${versionCheck.actual ?? '(not found)'}`,
    }
  }

  // Every required artifact's real read path now comes from the frozen snapshot (the pinned
  // checkout for tracked artifacts, or the staged source-inputs copy for --source-root fallbacks)
  // — never parsed.repo/parsed.sourceRoot directly — so a dirty working-tree edit or a source
  // branch that moves after this point cannot change what gets attached.
  const sourcePaths: Record<string, string> = {}
  for (const artifact of snapshot.provenance.requiredArtifacts) {
    sourcePaths[artifact.relativePath] = resolveStagedArtifactPath(parsed.stagingDir, artifact)
  }

  // Reads history from the snapshot's own resolved pinned SHA inside the staged checkout, not
  // `--all` against the live --repo — a moving branch or an unrelated ref in the source repo
  // cannot change what this run sees.
  const commits = await collectCommitsFromGitLog(snapshot.stagedCheckoutRoot, snapshot.provenance.resolvedSha)

  const githubRepo = resolveGithubOwnerRepo(parsed.githubRepo, snapshot.provenance.sourceRemoteUrl)

  let fixtureOverride: RawMergedPr[] | undefined
  if (parsed.prFixturePath !== undefined) {
    // Test/dev override only: wraps the existing fixture-file format (already parsed as
    // PrInput[] by loadPrFixture) into pr-source.ts's RawMergedPr shape so it flows through
    // the same acquireMergedPrSnapshot seam as the real gh path, rather than bypassing it.
    fixtureOverride = loadPrFixture(parsed.prFixturePath).map(pr => ({
      number: pr.number,
      title: pr.title,
      body: pr.body,
      mergedAt: pr.mergedAt ?? '',
      url: `https://github.com/${githubRepo?.owner ?? 'local'}/${githubRepo?.repo ?? 'fixture'}/pull/${pr.number}`,
      mergeCommitSha: pr.mergeCommitSha,
      files: [...pr.files],
      filesTruncated: false,
    }))
  } else if (githubRepo === undefined) {
    return {
      exitCode: 1,
      output:
        'Error: cannot determine the GitHub owner/repo for merged-PR acquisition. Provide --github-repo <owner>/<repo>, or ensure the source repository has a resolvable GitHub `origin` remote.',
    }
  }

  // Reads .ai/ triage-artifact contents straight from the frozen snapshot (never live --repo) as
  // in-scope markdown sources for the older-explicit-PR-reference union.
  const referenceCandidates: PrReferenceInput[] = Object.values(sourcePaths).map(path => ({
    kind: 'markdown-source',
    path,
    text: readFileSync(path, 'utf8'),
  }))

  let prSnapshot: Awaited<ReturnType<typeof acquireMergedPrSnapshot>>
  try {
    prSnapshot = await acquireMergedPrSnapshot(
      {
        owner: githubRepo?.owner ?? '',
        repo: githubRepo?.repo ?? '',
        capturedAt: parsed.snapshot,
        referenceCandidates,
        fixtureOverride,
      },
      createGhRunner(),
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {exitCode: 1, output: `Error: ${sanitizeCliOutput(message)}`}
  }

  const eligiblePrs: PrInput[] = prSnapshot.prs.map(pr => ({
    number: pr.number,
    title: pr.title,
    body: pr.body,
    mergedAt: pr.mergedAt,
    files: pr.files,
    mergeCommitSha: pr.mergeCommitSha,
    filesTruncated: pr.filesTruncated,
  }))

  // Reads the two frozen source-evidence documents from the SAME staged snapshot paths as every
  // other required artifact — never parsed.repo/parsed.sourceRoot directly, and never a new CLI
  // flag. Unconditional: SOURCE_EVIDENCE_ARTIFACT_PATHS was already folded into
  // requiredArtifactPaths above and passed prepareSourceSnapshot's preflight, so both paths are
  // guaranteed present in sourcePaths here — the source-evidence pass always runs.
  const sourceEvidenceDocuments: SourceDocumentInput[] = SOURCE_EVIDENCE_ARTIFACT_PATHS.map(path => ({
    path,
    text: readFileSync(sourcePaths[path] ?? '', 'utf8'),
  }))

  const buildResult = await runBuildStage({
    runner,
    stagingDir: parsed.stagingDir,
    triageArtifacts,
    triageArtifactSourcePaths: sourcePaths,
    commits,
    runWindowId: parsed.runWindowId,
    prs: eligiblePrs,
    commitSha: snapshot.provenance.resolvedSha,
    capturedAt: snapshot.provenance.capturedAt,
    sourceEvidenceDocuments,
  })

  const syncResult = await runner(['sync', '-o', 'docs/public/graph-data.json'], parsed.stagingDir)
  if (syncResult.exitCode !== 0) {
    return {exitCode: 1, output: `Error: deciduous sync failed: ${sanitizeCliOutput(syncResult.stderr)}`}
  }

  const sourceEvidenceSummary =
    buildResult.sourceEvidence === undefined
      ? ''
      : `, ${Object.keys(buildResult.sourceEvidence.nodes).length} source-evidence node(s)/${buildResult.sourceEvidence.edges.length} edge(s) (reviewed mapping applied: ${buildResult.sourceEvidence.reviewedApplied})`

  // Every runBuildStage warning (unresolved links, lowered confidence, incomplete file lists,
  // etc) is surfaced in the successful CLI output — never silently discarded. Persistence into
  // provenance.json already happened inside runBuildStage itself (WARNING-PERSISTENCE FIX: the
  // single owner of that write, before this function ever calls `sync` below) — no second write
  // site here, so nothing can clobber or lose it if `sync` fails or times out. No arbitrary
  // warning-count threshold gates success; warnings are informational, not a failure signal (a
  // failure signal is a nonzero exit, as S3's link-failure hard-fail now does separately).
  const warningsSection =
    buildResult.warnings.length === 0
      ? ''
      : `\n\nWarnings:\n${buildResult.warnings.map(w => `- ${sanitizeCliOutput(w)}`).join('\n')}`

  return {
    exitCode: 0,
    output: `build: pinned ${pinnedRef} at ${snapshot.provenance.resolvedSha}, staged ${Object.keys(buildResult.triageNodeChangeIds).length} triage node(s), ${Object.keys(buildResult.actionNodeChangeIds).length} action node(s), ${Object.keys(buildResult.decisionNodeChangeIds).length} decision node(s)${sourceEvidenceSummary}. Staging directory: ${parsed.stagingDir}${warningsSection}`,
  }
}

/**
 * Computes the bound-inventory digest for a staging directory's current
 * content — the exact value `validate`/`accept` report/require. Kept as a
 * tiny local helper (rather than exported from inventory.ts) since it is
 * purely this CLI's own composition of `captureStagedInventory` +
 * `scopeInventoryToBoundValidationPaths` + `computeInventoryDigest`.
 */
function computeInventoryDigestFromStaging(stagingDir: string, boundOnlyPaths: readonly string[]): string {
  return computeInventoryDigest(
    scopeInventoryToBoundValidationPaths(captureStagedInventory(stagingDir), EXPORT_RELATIVE_PATHS, boundOnlyPaths),
  )
}

async function main(): Promise<void> {
  const {exitCode, output} = await runCli(process.argv.slice(2))
  if (exitCode === 0) {
    consola.log(output)
  } else {
    consola.error(output)
  }
  process.exitCode = exitCode
}

const isDirectlyExecuted = (() => {
  const entry = process.argv[1]
  return entry !== undefined && import.meta.url === `file://${entry}`
})()

if (isDirectlyExecuted) {
  main().catch((error: unknown) => {
    // Never log the raw error object (may carry a stack trace referencing subprocess
    // stderr/argv content) — sanitize and bound it first, same as every runCli() result.
    const message = error instanceof Error ? error.message : String(error)
    consola.error(sanitizeCliOutput(message))
    process.exitCode = 1
  })
}
