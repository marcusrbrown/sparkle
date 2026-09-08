#!/usr/bin/env tsx
import {execFile} from 'node:child_process'
import {createHash} from 'node:crypto'
import {
  constants,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import {dirname, join, relative, resolve, sep} from 'node:path'
import process from 'node:process'
import {promisify} from 'node:util'
import {consola} from 'consola'

import {
  acquireMergedPrSnapshot,
  computePrMergeConfidence,
  type PrReferenceInput,
  type RawMergedPr,
} from './bootstrap-graph/pr-source.js'
import {AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001} from './bootstrap-graph/reviewed-mapping.js'
import {
  loadSourceSnapshotProvenance,
  prepareSourceSnapshot,
  resolveStagedArtifactPath,
  SourceSnapshotError,
} from './bootstrap-graph/snapshot.js'
import {
  applyReviewedMapping,
  extractSourceEvidence,
  validateReviewedGraph,
  type EdgeProvenance,
  type ExtractedEdge,
  type ExtractedNode,
  type GroundedNodeType,
  type SourceDocumentInput,
  type SourceEvidenceRange,
} from './bootstrap-graph/source-evidence.js'

/**
 * Sparkle decision-graph bootstrap.
 *
 * Builds a staged Deciduous record set from the Lane 5 `.ai/` triage report,
 * `git log`, and merged PR bodies, validates it, and (as an explicit separate
 * step) promotes it into the repo's committed `.deciduous/sync/` store and
 * `docs/public/{graph-data.json,git-history.json}` exports.
 *
 * See docs/plans/2026-05-24-001-feat-sparkle-decision-graph-plan.md, Unit 4.
 */

/**
 * A known-secret detection rule. The pattern is matched against raw text; a
 * match's *value* is never surfaced anywhere in this module's outputs — only
 * the rule name and, for payload scans, a field path.
 */
export interface SecretScanRule {
  readonly name: string
  readonly pattern: RegExp
}

/** A single secret-scan hit. Never carries the matched value. */
export interface SecretScanMatch {
  readonly path: string
  readonly rule: string
}

/**
 * Default fail-closed secret patterns: tokens, passwords, API keys,
 * bearer/auth headers, credentialed URLs, AWS-style access keys.
 *
 * Deliberately conservative (prefers false positives over false negatives)
 * per the plan's fail-closed requirement — a match blocks promotion pending
 * explicit human review, it does not redact-and-continue.
 */
const DEFAULT_SECRET_SCAN_RULES: readonly SecretScanRule[] = [
  {name: 'github-token', pattern: /gh[pousr]_[A-Za-z0-9]{36,}/},
  {name: 'aws-access-key', pattern: /AKIA[0-9A-Z]{16}/},
  {name: 'credentialed-url', pattern: /[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s:@]+@[^\s"']+/i},
  {name: 'bearer-token', pattern: /\b(?:Authorization:\s*)?Bearer\s+[\w.-]{16,}/i},
  {name: 'generic-api-key', pattern: /\b(?:api[_-]?key|secret|password)\s*[:=]\s*["']?[\w/+-]{12,}["']?/i},
]

/**
 * Scans free-form text for known-secret patterns. Returns which rule(s)
 * matched — never the matched substring — so callers can report a violation
 * without leaking the secret into logs or error output.
 */
export function scanTextForSecrets(
  text: string,
  rules: readonly SecretScanRule[] = DEFAULT_SECRET_SCAN_RULES,
): SecretScanMatch[] {
  const matches: SecretScanMatch[] = []
  for (const rule of rules) {
    if (rule.pattern.test(text)) {
      matches.push({path: '', rule: rule.name})
    }
  }
  return matches
}

/**
 * Recursively scans every string field of a JSON-like payload (objects,
 * arrays, nested combinations) for known-secret patterns, reporting the
 * dotted/bracketed field path of each hit alongside the matched rule name.
 *
 * Used for the fail-closed full-payload secret-scrub: normalized inputs
 * before any `deciduous add`/`doc attach` call, and the fully staged output
 * (records + both exports) before Stage 3 review.
 */
export function scanPayloadForSecrets(
  payload: unknown,
  rules: readonly SecretScanRule[] = DEFAULT_SECRET_SCAN_RULES,
  path = '',
): SecretScanMatch[] {
  if (typeof payload === 'string') {
    return scanTextForSecrets(payload, rules).map(match => ({...match, path}))
  }

  if (Array.isArray(payload)) {
    return payload.flatMap((item, index) => scanPayloadForSecrets(item, rules, `${path}[${index}]`))
  }

  if (payload !== null && typeof payload === 'object') {
    return Object.entries(payload as Record<string, unknown>).flatMap(([key, value]) =>
      scanPayloadForSecrets(value, rules, path === '' ? key : `${path}.${key}`),
    )
  }

  return []
}

/** A single ARCHIVE-classified artifact parsed out of the Lane 5 triage report. */
export interface TriageArtifact {
  readonly path: string
  readonly disposition: string
  /** True if the artifact also carries a PROMOTE annotation in the report. */
  readonly promoted: boolean
  /**
   * True if the artifact is gitignored in a fresh clone (per the report's
   * "Resolves" column) and therefore requires `--source-root` pointed at a
   * real local checkout to read, rather than the staged snapshot alone.
   */
  readonly requiresSourceRoot: boolean
}

const BACKTICKED_PATH = /`([^`]+)`/

/**
 * Parses one `| # | \`path\` | disposition | resolves |` markdown table row.
 * Splits on `|` and trims each cell rather than using a single regex with
 * adjacent `\s*`/`.+?` groups, which the repo's regexp lint rules flag as a
 * super-linear-backtracking risk for attacker-controlled input.
 */
function parseArchiveTableRow(line: string): {path: string; disposition: string; resolves: string} | undefined {
  if (!line.startsWith('|')) {
    return undefined
  }

  const cells = line.split('|').map(cell => cell.trim())
  if (cells.length < 5 || !/^\d+$/.test(cells[1] ?? '')) {
    return undefined
  }

  const pathMatch = BACKTICKED_PATH.exec(cells[2] ?? '')
  if (!pathMatch?.[1]) {
    return undefined
  }

  return {path: pathMatch[1], disposition: cells[3] ?? '', resolves: cells[4] ?? ''}
}

/**
 * Parses the Lane 5 `.ai/` triage report markdown into the set of
 * ARCHIVE-classified artifacts the bootstrap must ingest. DELETE-classified
 * and KEEP-AS-IS entries are intentionally excluded — only ARCHIVE rows (some
 * of which additionally carry a PROMOTE annotation) become graph nodes.
 */
export function parseTriageReport(markdown: string): TriageArtifact[] {
  const lines = markdown.split('\n')

  const promotedPaths = new Set<string>()
  let inPromoteSection = false
  let inArchiveSection = false
  const archiveRows: {path: string; disposition: string; resolves: string}[] = []

  for (const line of lines) {
    if (line.startsWith('## ')) {
      const heading = line.slice(3).trim()
      inPromoteSection = heading.startsWith('PROMOTE')
      inArchiveSection = heading.startsWith('ARCHIVE')
      continue
    }

    if (inPromoteSection) {
      if (/^\d+\.\s/.test(line)) {
        const pathMatch = BACKTICKED_PATH.exec(line)
        if (pathMatch?.[1] !== undefined) {
          promotedPaths.add(pathMatch[1])
        }
      }
      continue
    }

    if (inArchiveSection) {
      const row = parseArchiveTableRow(line)
      if (row) {
        archiveRows.push(row)
      }
    }
  }

  return archiveRows.map(row => ({
    path: row.path,
    disposition: row.disposition,
    promoted: promotedPaths.has(row.path),
    requiresSourceRoot: !row.resolves.startsWith('Revision clone.'),
  }))
}

/** Raw input for a single commit from `git log`. */
export interface CommitInput {
  readonly sha: string
  readonly message: string
  readonly date: string
  /** True for a PR-merge commit (confidence 80); false for direct-to-main (confidence 60). */
  readonly isPrMerge: boolean
}

/** A commit classified for the "action" node the git-log pass adds. */
export interface ClassifiedCommit {
  readonly sha: string
  readonly date: string
  readonly summary: string
  readonly confidence: number
  readonly isDepsChore: boolean
}

const DEPS_CHORE_PREFIX = /^chore\(deps\):/i

/**
 * Classifies a single commit for the git-log pass. Confidence uses the SAME
 * approved two-tier scheme as `computePrMergeConfidence` (80 verified / 60
 * otherwise): 80 only when this commit's sha is in `verifiedMergeShas` — the
 * set of merge-commit SHAs from a real, gh-confirmed merged-PR snapshot.
 * `commit.isPrMerge` (parent-count > 1) is retained on the input/metadata
 * but is deliberately never used as PR proof here — a real repo has
 * squash-merge and branch-sync commits that are two-parent without being a
 * GitHub PR merge. `chore(deps)` commits are flagged for run-window
 * batching rather than individual nodes.
 */
export function classifyCommit(commit: CommitInput, verifiedMergeShas: ReadonlySet<string>): ClassifiedCommit {
  return {
    sha: commit.sha,
    date: commit.date,
    summary: commit.message,
    confidence: computePrMergeConfidence({mergeCommitSha: commit.sha}, verifiedMergeShas),
    isDepsChore: DEPS_CHORE_PREFIX.test(commit.message),
  }
}

/** The single batched `observation` node produced for a run window's `chore(deps)` commits. */
export interface DepsBatch {
  readonly runWindowId: string
  readonly commits: ClassifiedCommit[]
  readonly summary: string
}

/**
 * Batches every `chore(deps)` commit in a git-log pass into one `observation`
 * node per bootstrap run-window (not per calendar period — 51.5% of recent
 * commits are `chore(deps)` with no clean weekly/daily cadence, so run-window
 * batching is the deterministic, evidence-grounded choice per the plan).
 *
 * Returns `undefined` when there are no deps commits to batch, so callers
 * don't add an empty observation node.
 */
export function batchDepsCommits(commits: ClassifiedCommit[], runWindowId: string): DepsBatch | undefined {
  const depsCommits = commits.filter(commit => commit.isDepsChore)
  if (depsCommits.length === 0) {
    return undefined
  }

  return {
    runWindowId,
    commits: depsCommits,
    summary: `${depsCommits.length} dependency-bump commit(s) batched for run window ${runWindowId}`,
  }
}

/** Raw input for a single merged PR, as fetched from `gh`. */
export interface PrInput {
  readonly number: number
  readonly title: string
  readonly body: string
  /** ISO merge timestamp, or `undefined` for an unmerged PR (always excluded). */
  readonly mergedAt: string | undefined
  readonly files: readonly string[]
  readonly mergeCommitSha: string
  /** True when `files` is known-incomplete (the files-overflow pagination follow-up never completed). Optional for backward call-site compatibility with fixture-based callers that never set it. */
  readonly filesTruncated?: boolean
}

/** A PR normalized into the `-d`/`--description` shape the PR-body pass writes; never carries the raw body. */
export interface NormalizedPr {
  readonly number: number
  readonly title: string
  readonly summary: string
  readonly files: readonly string[]
  readonly mergeCommitSha: string
  readonly confidence: number
}

/**
 * Normalizes a PR's raw body into the description text the PR-body pass
 * passes to `-d`/`--description`. The raw body is only ever read in memory to
 * produce this summary — it is never itself passed to `deciduous add`.
 *
 * Any known-secret pattern found in the body is scrubbed out of the summary;
 * a caught secret in the pre-add scan (see `scanTextForSecrets`) still fails
 * the run closed — normalization alone is not a substitute for that scan.
 */
export function normalizePrBody(
  pr: Pick<PrInput, 'number' | 'title' | 'body' | 'files' | 'mergeCommitSha'>,
): NormalizedPr {
  let summary = pr.body.trim()
  for (const rule of [/gh[pousr]_[A-Za-z0-9]{36,}/g, /AKIA[0-9A-Z]{16}/g]) {
    summary = summary.replace(rule, '[redacted]')
  }

  return {
    number: pr.number,
    title: pr.title,
    summary,
    files: pr.files,
    mergeCommitSha: pr.mergeCommitSha,
    confidence: 75,
  }
}

/**
 * Selects the eligible PR set for the PR-body pass: merged PRs within the 12
 * calendar months ending at (and including) the build's captured snapshot
 * timestamp — cutoff date inclusive, snapshot timestamp inclusive as the
 * upper bound — unioned with any older merged PR explicitly referenced by a
 * selected in-scope `.ai/` artifact, de-duplicated by PR number. Unmerged PRs
 * are always excluded, even if explicitly referenced.
 */
export function selectEligiblePrs(
  prs: readonly PrInput[],
  snapshotTimestamp: string,
  explicitlyReferencedPrNumbers: readonly number[],
): PrInput[] {
  const snapshot = new Date(snapshotTimestamp)
  const cutoff = new Date(snapshot)
  cutoff.setUTCMonth(cutoff.getUTCMonth() - 12)

  const referenced = new Set(explicitlyReferencedPrNumbers)
  const seen = new Set<number>()
  const eligible: PrInput[] = []

  for (const pr of prs) {
    if (pr.mergedAt === undefined || seen.has(pr.number)) {
      continue
    }

    const mergedAt = new Date(pr.mergedAt)
    const inWindow = mergedAt.getTime() >= cutoff.getTime() && mergedAt.getTime() <= snapshot.getTime()
    const isExplicitReference = referenced.has(pr.number)

    if (inWindow || isExplicitReference) {
      eligible.push(pr)
      seen.add(pr.number)
    }
  }

  return eligible
}

/** Result of the all-inputs preflight, run before any `deciduous add` call. */
export interface PreflightResult {
  readonly ok: boolean
  readonly missing: string[]
}

/**
 * Verifies every required triage artifact is readable from the working
 * checkout or an explicit `--source-root`. Any missing required artifact
 * fails the whole run before any node is added — there is no warn-and-skip
 * path for a missing required artifact (unlike an unresolved cross-reference
 * link, which is a separate, lower-severity case handled during the triage
 * pass itself).
 */
export function checkArtifactPreflight(
  artifacts: readonly {path: string; requiresSourceRoot: boolean}[],
  availablePaths: ReadonlySet<string>,
): PreflightResult {
  const missing = artifacts.filter(artifact => !availablePaths.has(artifact.path)).map(artifact => artifact.path)
  return {ok: missing.length === 0, missing}
}

/** The Lane 5 triage report's canonical shape, verified against the actual pinned document: 16 unique ARCHIVE artifacts, 4 of which carry a PROMOTE annotation. */
export const CANONICAL_ARCHIVE_COUNT = 16
export const CANONICAL_PROMOTE_COUNT = 4

/**
 * Verifies a parsed triage report matches the canonical Lane 5 shape rather
 * than trusting whatever a caller's `--triage` file happens to contain. The
 * public `build` command refuses to run against a report with the wrong
 * artifact count, duplicate paths, or the wrong PROMOTE-annotation count —
 * a 1-artifact (or 0-artifact) triage file is a test fixture shortcut, never
 * a legitimate production input, and must not silently "succeed" through
 * this command.
 */
export function validateCanonicalTriageShape(artifacts: readonly TriageArtifact[]): string[] {
  const errors: string[] = []
  const uniquePaths = new Set(artifacts.map(artifact => artifact.path))
  if (uniquePaths.size !== artifacts.length) {
    errors.push(
      `triage report contains duplicate ARCHIVE paths (${artifacts.length} row(s), ${uniquePaths.size} unique)`,
    )
  }
  if (artifacts.length !== CANONICAL_ARCHIVE_COUNT) {
    errors.push(
      `triage report must classify exactly ${CANONICAL_ARCHIVE_COUNT} unique ARCHIVE artifacts; found ${artifacts.length}`,
    )
  }
  const promotedCount = artifacts.filter(artifact => artifact.promoted).length
  if (promotedCount !== CANONICAL_PROMOTE_COUNT) {
    errors.push(
      `triage report must mark exactly ${CANONICAL_PROMOTE_COUNT} ARCHIVE artifacts with a PROMOTE annotation; found ${promotedCount}`,
    )
  }
  return errors
}

/** The destination repo's current state, as observed before promotion. */
export interface DestinationState {
  /** Number of records already present in the destination `.deciduous/sync/` store. */
  readonly syncRecordCount: number
  /** Relative path -> observed content hash + a basic integrity check (e.g. valid JSON), for existing destination files. */
  readonly files: Record<string, {hash: string; integrityValid: boolean}>
}

/** The reviewed staged output's file inventory, captured at the end of Stage 2. */
export interface StagedInventory {
  /** Relative path -> content hash, for every staged file. */
  readonly files: Record<string, string>
}

export type FreshPromotePlan =
  | {readonly kind: 'proceed'; readonly filesToCopy: string[]}
  | {readonly kind: 'refuse'; readonly reason: string; readonly present: string[]}

/**
 * (a) Fresh promote: proceeds only when the destination `.deciduous/sync/`
 * has zero records AND no export file already exists — an existing export
 * file is protected, not silently overwritten. Either failing condition
 * refuses with a clear error naming what's already present.
 */
export function planFreshPromote(destination: DestinationState, staged: StagedInventory): FreshPromotePlan {
  const present = Object.keys(destination.files)
  if (destination.syncRecordCount > 0) {
    return {
      kind: 'refuse',
      reason: `destination .deciduous/sync/ already has ${destination.syncRecordCount} records`,
      present,
    }
  }
  if (present.length > 0) {
    return {kind: 'refuse', reason: 'destination export file(s) already exist', present}
  }
  return {kind: 'proceed', filesToCopy: Object.keys(staged.files)}
}

export type RecoveryPromoteStep =
  {readonly kind: 'skip-identical'; readonly path: string} | {readonly kind: 'copy-missing'; readonly path: string}

export type RecoveryPromotePlan =
  | {readonly kind: 'proceed'; readonly steps: RecoveryPromoteStep[]}
  | {
      readonly kind: 'abort'
      readonly reason: 'unexpected-destination-file' | 'changed-bytes' | 'torn-write'
      readonly path: string
    }

/**
 * (b) Recovery promote: retries the *same* reviewed staged output after an
 * earlier promotion attempt was interrupted. Does not pass through the
 * fresh-promote empty-destination gate. Accepts only the destination-file
 * subset that is byte-identical to the reviewed staged inventory, copies the
 * remaining staged files not yet present, and aborts — naming the specific
 * file, no destructive overwrite — on an unexpected destination file, a
 * changed-bytes mismatch, or a failed basic integrity check (torn write).
 */
export function planRecoveryPromote(destination: DestinationState, staged: StagedInventory): RecoveryPromotePlan {
  for (const path of Object.keys(destination.files)) {
    if (!(path in staged.files)) {
      return {kind: 'abort', reason: 'unexpected-destination-file', path}
    }
  }

  const steps: RecoveryPromoteStep[] = []
  for (const [path, stagedHash] of Object.entries(staged.files)) {
    const destinationFile = destination.files[path]
    if (destinationFile === undefined) {
      steps.push({kind: 'copy-missing', path})
      continue
    }
    if (!destinationFile.integrityValid) {
      return {kind: 'abort', reason: 'torn-write', path}
    }
    if (destinationFile.hash !== stagedHash) {
      return {kind: 'abort', reason: 'changed-bytes', path}
    }
    steps.push({kind: 'skip-identical', path})
  }

  return {kind: 'proceed', steps}
}

// ---------------------------------------------------------------------------
// CLI subprocess primitives
// ---------------------------------------------------------------------------

/** The exact pinned `deciduous` binary version this script requires. */
/**
 * The two real, already-public-tracked source documents the ONE approved
 * `ReviewedAssociationMapping` (AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001) reads.
 * Threaded through the SAME `prepareSourceSnapshot` required-artifact
 * mechanism as the triage report's 16 inputs (pinned-SHA resolution,
 * staging isolation, byte hashing) — never a bespoke second loading path or
 * a new CLI flag. Kept structurally separate from `triageArtifacts` so the
 * production triage input count is never weakened by this addition.
 */
export const SOURCE_EVIDENCE_ARTIFACT_PATHS = [
  '.ai/plan/refactor-audit-improvements-1.md',
  '.ai/audit/audit-final-report.md',
] as const

/** Maps a source-evidence relation kind to the pinned `deciduous link --edge-type` vocabulary. */
function deciduousEdgeTypeFor(relationKind: string | undefined): string {
  return relationKind === 'rejected-option' ? 'rejected' : 'leads_to'
}

export const PINNED_DECIDUOUS_VERSION = '0.17.1'

/** The four record kinds Deciduous's committed `.deciduous/sync/` record store is organized into. */
const SYNC_RECORD_SUBDIRS = ['nodes', 'edges', 'themes', 'tags'] as const

/**
 * Refuses to build against a `--repo` whose OWN `.deciduous/sync/` already
 * has real, non-empty graph records — regardless of staging-directory
 * isolation. `.deciduous/config.toml` and `.deciduous/sync/README.md` (both
 * legitimately present after a plain `deciduous init`) are ignored; only
 * actual `nodes/edges/themes/tags/*.json` record files count. This protects
 * the source side of the caller-supplied checkout/destination distinction:
 * `--repo` must be a source to read from, never an already-seeded real graph
 * a build could get confused with.
 */
export function checkRepoGraphNotAlreadySeeded(repoRoot: string): string | undefined {
  for (const subdir of SYNC_RECORD_SUBDIRS) {
    const dirPath = join(repoRoot, '.deciduous', 'sync', subdir)
    if (!existsSync(dirPath)) {
      continue
    }
    const recordFiles = readdirSync(dirPath, {withFileTypes: true}).filter(
      entry => entry.isFile() && entry.name.endsWith('.json'),
    )
    if (recordFiles.length > 0) {
      return `--repo's own .deciduous/sync/${subdir}/ already has ${recordFiles.length} real graph record(s) — refusing to build against an already-seeded source repository`
    }
  }
  return undefined
}
/** The two exact publication targets `deciduous sync --output` writes; the only non-record-store files this script ever promotes. */
const EXPORT_RELATIVE_PATHS = ['docs/public/graph-data.json', 'docs/public/git-history.json'] as const

/** Matches a single node/edge/theme/tag JSON record's relative path under `.deciduous/sync/`. Moved here (rather than beside `scopeInventoryToManagedPaths`, further down) so `verifyStagedInventoryUnchanged` — which runs earlier in file order — can reference it without a use-before-define ordering problem. */
const MANAGED_RECORD_PATH = /^\.deciduous\/sync\/(?:nodes|edges|themes|tags)\/[^/]+\.json$/

/** This bootstrap script's own private input-set record (see `writeSnapshotProvenance`/`loadSnapshotProvenance`). Moved here (rather than beside those functions, further down) so both `acceptReviewedStage` and `scopeInventoryToBoundValidationPaths` — which run earlier in file order — can reference it without a use-before-define ordering problem. */
const PROVENANCE_RELATIVE_PATH = 'provenance.json'

const COMMAND_TIMEOUT_MS = 15_000
const COMMAND_MAX_BUFFER_BYTES = 2_000_000

const GITHUB_REMOTE_PATTERN = /github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/

/**
 * Resolves the `owner/repo` to use for real merged-PR acquisition: an
 * explicit `--github-repo owner/repo` flag wins; otherwise falls back to
 * parsing the frozen snapshot's sanitized `origin` remote URL (HTTPS or SSH
 * form). Returns `undefined` (never a guess) when neither resolves —
 * callers must then either fail closed or require an explicit fixture.
 */
export function resolveGithubOwnerRepo(
  explicit: string | undefined,
  sourceRemoteUrl: string | undefined,
): {owner: string; repo: string} | undefined {
  if (explicit !== undefined) {
    const [owner, repo] = explicit.split('/')
    if (owner !== undefined && repo !== undefined && owner.length > 0 && repo.length > 0) {
      return {owner, repo}
    }
    return undefined
  }
  if (sourceRemoteUrl === undefined) {
    return undefined
  }
  const match = GITHUB_REMOTE_PATTERN.exec(sourceRemoteUrl)
  const owner = match?.[1]
  const repo = match?.[2]
  return owner === undefined || repo === undefined ? undefined : {owner, repo}
}

/**
 * Creates the default, production `gh` command runner used for real
 * merged-PR acquisition: argv array, `shell: false`, bounded timeout and
 * output — the same safety posture as `createDeciduousRunner`. `gh api`/
 * `gh pr view` calls are repo-scoped via their own `--repo`/embedded query
 * arguments, so this runner does not need (and does not set) a source-repo
 * `cwd` — unlike `deciduous`/`git` commands, which do need a specific
 * working directory (the isolated staging checkout) to avoid ancestor-walk
 * or wrong-repo side effects.
 */
function createGhRunner(): (argv: readonly string[]) => Promise<CommandResult> {
  return async argv =>
    new Promise<CommandResult>(resolvePromise => {
      execFile(
        'gh',
        [...argv],
        {shell: false, timeout: COMMAND_TIMEOUT_MS, maxBuffer: COMMAND_MAX_BUFFER_BYTES},
        (error, stdout, stderr) => {
          if (error !== null && typeof error.code !== 'number') {
            resolvePromise({exitCode: -1, stdout: '', stderr: error.message})
            return
          }
          resolvePromise({exitCode: error === null ? 0 : (error.code as number), stdout, stderr})
        },
      )
    })
}

/** Result of a single bounded subprocess invocation. Never resolves via shell string interpolation. */
export interface CommandResult {
  readonly exitCode: number
  readonly stdout: string
  readonly stderr: string
}

/** A callable command runner: argv array in, bounded result out. Never shells out via string interpolation. */
export type CommandRunner = (argv: readonly string[], cwd: string) => Promise<CommandResult>

/**
 * Creates a real `deciduous` command runner. Every invocation passes an
 * argv array with `shell: false` — commit summaries, PR titles, and PR
 * bodies are external content this script does not otherwise control, so
 * they are never string-interpolated into a shell command. Output and wall
 * time are bounded so a hung or runaway subprocess cannot stall the build.
 */
/**
 * Environment variable names that are safe (and, for several, necessary) to
 * pass through to the `deciduous` subprocess: PATH resolution, `git` author
 * identity fallback, and home-directory-relative config lookups. Everything
 * else from `process.env` is deliberately dropped — this is a passthrough
 * allowlist, not a blocklist, so an unexpected ambient secret in the parent
 * environment is never implicitly forwarded to a subprocess whose stdout we
 * echo back to the caller.
 */
const SAFE_ENV_PASSTHROUGH = [
  'PATH',
  'HOME',
  'USER',
  'USERPROFILE',
  'SHELL',
  'LANG',
  'LC_ALL',
  'TZ',
  'TMPDIR',
  'TEMP',
  'TMP',
] as const

function buildIsolatedEnv(cwd: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}
  for (const name of SAFE_ENV_PASSTHROUGH) {
    const value = process.env[name]
    if (value !== undefined) {
      env[name] = value
    }
  }
  // Defense in depth alongside the local-config assertion below: pin the SQLite
  // cache path explicitly inside cwd so nothing can resolve it elsewhere even
  // if a future deciduous version changes its own path-resolution behavior.
  env.DECIDUOUS_DB_PATH = join(cwd, '.deciduous', 'deciduous.db')
  return env
}

/**
 * Creates a real `deciduous` command runner. Every invocation passes an
 * argv array with `shell: false` — commit summaries, PR titles, and PR
 * bodies are external content this script does not otherwise control, so
 * they are never string-interpolated into a shell command. Output and wall
 * time are bounded so a hung or runaway subprocess cannot stall the build.
 *
 * SAFETY: `deciduous`, like `git`, resolves its working state by walking
 * up* from `cwd` to the nearest ancestor directory containing `.deciduous/`
 * — confirmed against the real pinned binary. If `cwd` has no local
 * `.deciduous/config.toml` of its own, an ancestor's real graph (e.g. a
 * source checkout's committed `.deciduous/sync/`) can silently receive
 * writes instead. Every call therefore requires `cwd` to already have its
 * own `.deciduous/config.toml` — callers must run `ensureIsolatedStagingDeciduous`
 * (or otherwise provision it) first; this runner never creates it implicitly,
 * so a caller can't accidentally rely on this function's own fallback
 * behavior to paper over a missing isolation step.
 */
export function createDeciduousRunner(binaryPath = 'deciduous'): CommandRunner {
  return async (argv, cwd) => {
    const localConfigPath = join(cwd, '.deciduous', 'config.toml')
    if (!existsSync(localConfigPath)) {
      throw new Error(
        `refusing to run \`deciduous ${argv[0] ?? ''}\` with cwd=${cwd}: no local .deciduous/config.toml. ` +
          "Running deciduous without a local config lets it ancestor-walk to and mutate a parent directory's " +
          'real graph. Call ensureIsolatedStagingDeciduous(cwd) first.',
      )
    }

    return new Promise<CommandResult>(resolvePromise => {
      execFile(
        binaryPath,
        [...argv],
        {
          cwd,
          shell: false,
          timeout: COMMAND_TIMEOUT_MS,
          maxBuffer: COMMAND_MAX_BUFFER_BYTES,
          env: buildIsolatedEnv(cwd),
        },
        (error, stdout, stderr) => {
          if (error !== null && typeof error.code !== 'number') {
            // Spawn-level failure (binary missing, permission denied, etc.) — never thrown, always
            // surfaced as a bounded result so callers can report a clear, non-crashing error.
            resolvePromise({exitCode: -1, stdout: '', stderr: error.message})
            return
          }
          resolvePromise({exitCode: error === null ? 0 : (error.code as number), stdout, stderr})
        },
      )
    })
  }
}

/**
 * Creates the staging directory's own isolated `.deciduous/config.toml` +
 * `sync/{nodes,edges,themes,tags}` if not already present. Idempotent. Must
 * run before the first `createDeciduousRunner` call against a given cwd —
 * see that function's SAFETY note.
 */
export function ensureIsolatedStagingDeciduous(stagingDir: string): void {
  mkdirSync(stagingDir, {recursive: true})
  for (const subdir of SYNC_RECORD_SUBDIRS) {
    mkdirSync(join(stagingDir, '.deciduous', 'sync', subdir), {recursive: true})
  }
  const configPath = join(stagingDir, '.deciduous', 'config.toml')
  if (!existsSync(configPath)) {
    writeFileSync(configPath, '')
  }
}

/** Result of `assertStagingIsolation`'s overlap/containment check. */
export interface StagingIsolationResult {
  readonly ok: boolean
  readonly reason?: string
}

function realOrAbsolute(path: string): string {
  return existsSync(path) ? realpathSync(path) : resolve(path)
}

function pathsOverlap(a: string, b: string): boolean {
  return a === b || a.startsWith(b + sep) || b.startsWith(a + sep)
}

/**
 * Refuses a staging directory that is nested inside, identical to, or
 * contains the source repo or (when provided) the promote destination —
 * including via a symlink, since both sides are resolved with `realpathSync`
 * first. This is the check `runCli`'s `build` command runs before anything
 * else, closing the ancestor-walk hole at the boundary a caller actually
 * controls (their own `--staging-dir`/`--repo`/`--destination` choices).
 */
export function assertStagingIsolation(input: {
  stagingDir: string
  sourceRepo: string
  destination?: string
}): StagingIsolationResult {
  const staging = realOrAbsolute(input.stagingDir)
  const source = realOrAbsolute(input.sourceRepo)

  if (pathsOverlap(staging, source)) {
    return {ok: false, reason: `staging directory (${input.stagingDir}) overlaps the source repo (${input.sourceRepo})`}
  }

  if (input.destination !== undefined) {
    const destination = realOrAbsolute(input.destination)
    if (pathsOverlap(staging, destination)) {
      return {
        ok: false,
        reason: `staging directory (${input.stagingDir}) overlaps the promote destination (${input.destination})`,
      }
    }
  }

  return {ok: true}
}

/**
 * Verifies the runner's `deciduous --version` output matches the exact
 * pinned version this script requires, failing closed on any mismatch
 * (including "binary not found" and "wrong version").
 */
export async function checkDeciduousVersion(
  runner: CommandRunner,
  cwd: string,
  expectedVersion = PINNED_DECIDUOUS_VERSION,
): Promise<{ok: boolean; actual?: string}> {
  const result = await runner(['--version'], cwd)
  const actual = result.stdout.trim()
  return {ok: result.exitCode === 0 && actual === `deciduous ${expectedVersion}`, actual}
}

const CREATED_NODE_LINE = /^Created node (\d+)/m

/** Parses the local node id out of `deciduous add`'s "Created node N (...)" stdout line. */
export function parseCreatedNodeLocalId(stdout: string): number | undefined {
  const match = CREATED_NODE_LINE.exec(stdout)
  const id = match?.[1]
  return id === undefined ? undefined : Number(id)
}

/**
 * Resolves a node's durable `change_id` by its local id via `deciduous show
 * --json` — collision-safe identity capture. Titles are legitimately
 * non-unique (Deciduous allows duplicate titles), so a node's identity is
 * never inferred from its title; only the local id assigned at creation
 * time, immediately queried back, is trusted.
 */
export async function getNodeChangeId(runner: CommandRunner, cwd: string, localId: number): Promise<string> {
  const result = await runner(['show', String(localId), '--json'], cwd)
  if (result.exitCode !== 0) {
    throw new Error(`deciduous show ${localId} --json failed (exit ${result.exitCode})`)
  }
  const parsed: unknown = JSON.parse(result.stdout)
  const changeId = (parsed as {change_id?: unknown}).change_id
  if (typeof changeId !== 'string') {
    throw new TypeError(`deciduous show ${localId} --json did not return a change_id`)
  }
  return changeId
}

// ---------------------------------------------------------------------------
// Filesystem safety: path containment and attachment byte validation
// ---------------------------------------------------------------------------

/**
 * Resolves `relativePath` against `root` and throws if the result would
 * escape `root` — via a `../` traversal or a symlink inside `root` that
 * points outside it. Used for every fixture/staging/destination path this
 * script touches, so a crafted input path or a symlink cannot cause a write
 * outside the intended sandbox.
 */
export function resolveWithinRoot(root: string, relativePath: string): string {
  const realRoot = realpathSync(root)
  const candidate = resolve(realRoot, relativePath)

  // Resolve symlinks along the candidate's existing ancestor chain (the
  // candidate itself may not exist yet, e.g. a promotion destination file).
  let real = candidate
  let probe = candidate
  while (!existsSync(probe)) {
    const parent = dirname(probe)
    if (parent === probe) {
      break
    }
    probe = parent
  }
  if (existsSync(probe)) {
    const realProbe = realpathSync(probe)
    real = probe === candidate ? realProbe : realProbe + candidate.slice(probe.length)
  }

  if (real !== realRoot && !real.startsWith(realRoot + sep)) {
    throw new Error(`path escapes root: ${relativePath}`)
  }
  return real
}

/** Result of validating an attachment's raw bytes before `doc attach` is invoked. */
export interface AttachmentValidationResult {
  readonly ok: boolean
  readonly reason?: string
}

const DEFAULT_MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024

/**
 * Validates an attachment's own bytes before `deciduous doc attach` is
 * invoked: existence, non-empty, size budget, valid UTF-8 decoding (required
 * artifacts are markdown — no MIME-sniffing library needed for that), and a
 * full secret scan over the raw decoded content. A clean scrubbed summary is
 * not a substitute for checking the original bytes Deciduous is about to
 * copy unchanged into `.deciduous/documents/`. Fails closed on every check:
 * a caught secret never surfaces the matched value, only the rule name.
 */
export function validateAttachmentBytes(
  filePath: string,
  options: {maxBytes?: number} = {},
): AttachmentValidationResult {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_ATTACHMENT_BYTES

  if (!existsSync(filePath)) {
    return {ok: false, reason: 'file not found'}
  }

  const stats = statSync(filePath)
  if (!stats.isFile()) {
    return {ok: false, reason: 'not a regular file'}
  }
  if (stats.size === 0) {
    return {ok: false, reason: 'file is empty'}
  }
  if (stats.size > maxBytes) {
    return {ok: false, reason: `file size ${stats.size} exceeds the ${maxBytes}-byte budget`}
  }

  const raw = readFileSync(filePath)

  let decoded: string
  try {
    decoded = new TextDecoder('utf-8', {fatal: true}).decode(raw)
  } catch {
    return {ok: false, reason: 'invalid UTF-8 encoding'}
  }

  const secretMatches = scanTextForSecrets(decoded)
  if (secretMatches.length > 0) {
    return {ok: false, reason: `matched secret rule "${secretMatches[0]?.rule}"`}
  }

  return {ok: true}
}

// ---------------------------------------------------------------------------
// Git-log source pass: full history via the real `git` CLI
// ---------------------------------------------------------------------------

const GIT_LOG_FIELD_SEPARATOR = '\u001F'

/**
 * Builds the argv array for the full-history `git log` invocation the
 * git-log pass runs, one field-delimited line per commit so subjects
 * containing arbitrary characters (including pipes) parse unambiguously.
 *
 * Walks history from a single resolved `ref` (a SHA or any git revision
 * expression) rather than `--all`. The production `build` path always
 * passes the snapshot's own resolved pinned SHA here, never a live branch
 * name — `--all` would follow every ref in the repo (including branches
 * that moved after the snapshot was taken), defeating the point of pinning.
 * The default of `'HEAD'` exists only for direct unit-testing convenience.
 */
export function buildGitLogArgv(ref = 'HEAD'): string[] {
  return [
    'log',
    ref,
    '--date=iso-strict',
    `--pretty=format:%H${GIT_LOG_FIELD_SEPARATOR}%P${GIT_LOG_FIELD_SEPARATOR}%an${GIT_LOG_FIELD_SEPARATOR}%ad${GIT_LOG_FIELD_SEPARATOR}%s`,
  ]
}

/**
 * Parses `git log`'s field-delimited output into `CommitInput[]`. A commit
 * is classified as a PR-merge (`isPrMerge: true`) when it has more than one
 * parent hash — the standard signature of a merge commit — rather than by
 * pattern-matching the commit message.
 */
export function parseGitLogOutput(stdout: string): CommitInput[] {
  return stdout
    .split('\n')
    .filter(line => line.length > 0)
    .map(line => {
      const [sha, parents, , date, message] = line.split(GIT_LOG_FIELD_SEPARATOR)
      const parentCount = (parents ?? '').trim().split(/\s+/).filter(Boolean).length
      return {sha: sha ?? '', message: message ?? '', date: date ?? '', isPrMerge: parentCount > 1}
    })
}

const execFileAsync = promisify(execFile)

/**
 * Runs the real, full-history `git log` against `repoDir` (argv array,
 * `shell: false`, bounded output) and parses it into `CommitInput[]`. Full
 * history is retained deliberately — `chore(deps)` batching (see
 * `batchDepsCommits`) is a content decision, not a coverage cut.
 *
 * `ref` should be the snapshot's resolved pinned SHA in production, so
 * history is read from the frozen checkout at a fixed point rather than
 * whatever a live branch currently points at.
 */
export async function collectCommitsFromGitLog(repoDir: string, ref = 'HEAD'): Promise<CommitInput[]> {
  const {stdout} = await execFileAsync('git', buildGitLogArgv(ref), {
    cwd: repoDir,
    timeout: COMMAND_TIMEOUT_MS,
    maxBuffer: COMMAND_MAX_BUFFER_BYTES,
  })
  return parseGitLogOutput(stdout)
}

// ---------------------------------------------------------------------------
// PR-body source pass: fixture-based (no real `gh` API calls in this unit)
// ---------------------------------------------------------------------------

/**
 * Builds the argv array a real `gh pr list` invocation would use to fetch
 * the fields the PR-body normalizer needs. This unit only exercises it as a
 * pure characterization test — no real `gh` call is made; `loadPrFixture`
 * reads a local fixture body file standing in for `gh`'s JSON output.
 */
export function buildGhPrListArgv(limit = 200): string[] {
  return [
    'pr',
    'list',
    '--state',
    'merged',
    '--limit',
    String(limit),
    '--json',
    'number,title,body,mergedAt,files,mergeCommit',
  ]
}

/**
 * Parses a `gh pr list --json ...`-shaped JSON body (real or fixture) into
 * `PrInput[]`, validating each entry's shape and throwing on malformed
 * input rather than silently dropping or coercing bad records.
 */
export function parsePrFixture(json: string): PrInput[] {
  const parsed: unknown = JSON.parse(json)
  if (!Array.isArray(parsed)) {
    throw new TypeError('PR fixture body must be a JSON array')
  }

  return parsed.map((entry, index) => {
    if (typeof entry !== 'object' || entry === null) {
      throw new TypeError(`PR fixture entry ${index} is not an object`)
    }
    const record = entry as Record<string, unknown>
    const {number, title, body} = record
    if (typeof number !== 'number' || typeof title !== 'string' || typeof body !== 'string') {
      throw new TypeError(`PR fixture entry ${index} is missing a required number/title/body field`)
    }

    const mergedAt = typeof record.mergedAt === 'string' ? record.mergedAt : undefined
    const files = Array.isArray(record.files)
      ? record.files.map(file =>
          typeof file === 'object' && file !== null ? String((file as {path?: unknown}).path ?? '') : String(file),
        )
      : []
    const mergeCommit = record.mergeCommit
    const mergeCommitSha =
      typeof mergeCommit === 'object' && mergeCommit !== null ? String((mergeCommit as {oid?: unknown}).oid ?? '') : ''

    return {number, title, body, mergedAt, files, mergeCommitSha}
  })
}

/** Reads a local PR-list fixture file (never a real `gh` API call) and parses it. */
export function loadPrFixture(filePath: string): PrInput[] {
  return parsePrFixture(readFileSync(filePath, 'utf8'))
}

// ---------------------------------------------------------------------------
// Schema validation: committed record JSON, graph-data.json, git-history.json
// ---------------------------------------------------------------------------

/** Result of validating a payload against one of this module's pinned schemas. */
export interface SchemaValidationResult {
  readonly ok: boolean
  readonly errors: string[]
}

function requireFields(record: Record<string, unknown>, fields: readonly string[], label: string): string[] {
  return fields
    .filter(field => !(field in record) || record[field] === undefined)
    .map(field => `${label} missing required field: ${field}`)
}

/** Validates a single committed `.deciduous/sync/nodes/*.json` record against its real captured shape. */
export function validateNodeRecordSchema(record: unknown): SchemaValidationResult {
  if (typeof record !== 'object' || record === null) {
    return {ok: false, errors: ['node record is not an object']}
  }
  const errors = requireFields(
    record as Record<string, unknown>,
    ['author', 'change_id', 'created_at', 'node_type', 'status', 'title', 'updated_at'],
    'node record',
  )
  return {ok: errors.length === 0, errors}
}

/** Validates a single committed `.deciduous/sync/edges/*.json` record against its real captured shape. */
export function validateEdgeRecordSchema(record: unknown): SchemaValidationResult {
  if (typeof record !== 'object' || record === null) {
    return {ok: false, errors: ['edge record is not an object']}
  }
  const errors = requireFields(
    record as Record<string, unknown>,
    ['author', 'created_at', 'edge_id', 'edge_type', 'from_change_id', 'to_change_id', 'weight'],
    'edge record',
  )
  return {ok: errors.length === 0, errors}
}

/**
 * Validates `docs/public/graph-data.json` against its real captured shape.
 * Note this export's node/edge shape intentionally omits the `author` field
 * present on committed records — that is expected, not a validation defect.
 */
export function validateGraphExportSchema(payload: unknown): SchemaValidationResult {
  if (typeof payload !== 'object' || payload === null) {
    return {ok: false, errors: ['graph export is not an object']}
  }
  const {nodes, edges} = payload as Record<string, unknown>
  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    return {ok: false, errors: ['graph export must have array "nodes" and "edges" fields']}
  }

  const errors: string[] = []
  const nodeFields = [
    'id',
    'change_id',
    'node_type',
    'title',
    'status',
    'created_at',
    'updated_at',
    'metadata_json',
  ] as const
  const edgeFields = [
    'id',
    'from_node_id',
    'to_node_id',
    'from_change_id',
    'to_change_id',
    'edge_type',
    'weight',
    'created_at',
  ] as const

  nodes.forEach((node, index) => {
    if (typeof node !== 'object' || node === null) {
      errors.push(`graph export node ${index} is not an object`)
      return
    }
    errors.push(...requireFields(node as Record<string, unknown>, nodeFields, `graph export node ${index}`))
  })
  edges.forEach((edge, index) => {
    if (typeof edge !== 'object' || edge === null) {
      errors.push(`graph export edge ${index} is not an object`)
      return
    }
    errors.push(...requireFields(edge as Record<string, unknown>, edgeFields, `graph export edge ${index}`))
  })

  return {ok: errors.length === 0, errors}
}

/**
 * Validates `docs/public/git-history.json` against its real captured shape.
 * This is a distinct schema from `graph-data.json`'s node/edge allowlist —
 * they are different export shapes, validated independently.
 */
export function validateGitHistoryExportSchema(payload: unknown): SchemaValidationResult {
  if (!Array.isArray(payload)) {
    return {ok: false, errors: ['git-history export must be a JSON array']}
  }

  const errors: string[] = []
  const fields = ['hash', 'short_hash', 'author', 'date', 'message', 'files_changed'] as const
  payload.forEach((entry, index) => {
    if (typeof entry !== 'object' || entry === null) {
      errors.push(`git-history entry ${index} is not an object`)
      return
    }
    errors.push(...requireFields(entry as Record<string, unknown>, fields, `git-history entry ${index}`))
  })

  return {ok: errors.length === 0, errors}
}

/** Validates a single committed `.deciduous/sync/themes/*.json` record against its real captured shape. */
export function validateThemeRecordSchema(record: unknown): SchemaValidationResult {
  if (typeof record !== 'object' || record === null) {
    return {ok: false, errors: ['theme record is not an object']}
  }
  const errors = requireFields(
    record as Record<string, unknown>,
    ['author', 'change_id', 'color', 'created_at', 'name', 'updated_at'],
    'theme record',
  )
  return {ok: errors.length === 0, errors}
}

/** Validates a single committed `.deciduous/sync/tags/*.json` record against its real captured shape. */
export function validateTagRecordSchema(record: unknown): SchemaValidationResult {
  if (typeof record !== 'object' || record === null) {
    return {ok: false, errors: ['tag record is not an object']}
  }
  const errors = requireFields(
    record as Record<string, unknown>,
    ['author', 'created_at', 'node_change_id', 'source', 'theme_change_id'],
    'tag record',
  )
  return {ok: errors.length === 0, errors}
}

// ---------------------------------------------------------------------------
// Staged-content immutability: content-hash capture and re-verification
// ---------------------------------------------------------------------------

function listFilesRecursively(root: string, currentDir: string): string[] {
  const entries = readdirSync(currentDir, {withFileTypes: true})
  return entries.flatMap(entry => {
    const absolute = resolveWithinRoot(root, relative(root, join(currentDir, entry.name)))
    if (entry.isDirectory()) {
      return listFilesRecursively(root, absolute)
    }
    return entry.isFile() ? [absolute] : []
  })
}

function sha256File(filePath: string): string {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex')
}

/**
 * Captures a content hash for every file in the staging directory, at the
 * end of Stage 2 (validate) before Stage 3 (human review) begins. Paths are
 * resolved through `resolveWithinRoot` so a symlink inside the staging
 * directory cannot smuggle an outside file into the captured inventory.
 */
export function captureStagedInventory(stagingDir: string): StagedInventory {
  const root = realpathSync(stagingDir)
  const files: Record<string, string> = {}
  for (const absolutePath of listFilesRecursively(root, root)) {
    const relativePath = relative(root, absolutePath).split(sep).join('/')
    files[relativePath] = sha256File(absolutePath)
  }
  return {files}
}

/**
 * Re-verifies the staging directory's current content hashes against a
 * previously captured inventory. Promotion (Stage 4) calls this before
 * touching the destination at all — reviewed bytes cannot silently change
 * between review and a later promotion attempt.
 */
export function verifyStagedInventoryUnchanged(
  stagingDir: string,
  captured: StagedInventory,
): {ok: boolean; changedPaths: string[]} {
  const current = captureStagedInventory(stagingDir)
  const changedPaths = new Set<string>()
  for (const [relativePath, hash] of Object.entries(captured.files)) {
    if (current.files[relativePath] !== hash) {
      changedPaths.add(relativePath)
    }
  }
  for (const relativePath of Object.keys(current.files)) {
    if (MANAGED_RECORD_PATH.test(relativePath) && !(relativePath in captured.files)) {
      changedPaths.add(relativePath)
    }
  }
  return {ok: changedPaths.size === 0, changedPaths: [...changedPaths].sort()}
}

// ---------------------------------------------------------------------------
// Review binding: an explicit, persisted "this is what was reviewed and
// accepted" record that promote loads and independently re-verifies,
// instead of trusting a freshly recaptured (and therefore still-mutable)
// snapshot of the staging directory as if it were already-reviewed.
// ---------------------------------------------------------------------------

const ACCEPTED_INVENTORY_RELATIVE_PATH = 'accepted-inventory.json'
/** Bound-scope companion to `ACCEPTED_INVENTORY_RELATIVE_PATH` — used only for pre-promote drift re-verification, never for the actual copy plan. See `scopeInventoryToBoundValidationPaths`. */
const ACCEPTED_BOUND_INVENTORY_RELATIVE_PATH = 'accepted-bound-inventory.json'

/** A short, stable, human-comparable digest over a managed-scope inventory's paths+hashes — not a security boundary itself (the real boundary is the byte re-verification), just a legible "is this the same reviewed set" marker for CLI output. */
export function computeInventoryDigest(inventory: StagedInventory): string {
  const sortedEntries = Object.entries(inventory.files).sort(([a], [b]) => a.localeCompare(b))
  return createHash('sha256').update(JSON.stringify(sortedEntries)).digest('hex').slice(0, 16)
}

/**
 * Runs the validate stage and, only if it passes, captures the current
 * managed-scope staged inventory and persists it as the accepted review
 * record. This is the one place an "accepted-inventory.json" is ever
 * written — there is no path that lets `executeFreshPromote`/
 * `executeRecoveryPromote` run against unreviewed or unvalidated bytes.
 * A real human review of the Stage 3 output (record JSON, both exports, the
 * validation report) is expected to happen before this is called; this
 * function's own role is binding *that* review to an exact, later-verifiable
 * byte inventory — it does not itself constitute the review.
 */
export function acceptReviewedStage(stagingDir: string): {ok: boolean; errors: string[]} {
  const validation = runValidateStage(stagingDir)
  if (!validation.ok) {
    return {ok: false, errors: validation.errors}
  }
  // Guaranteed resolvable at this point (runValidateStage's own bound-path resolution check
  // already passed) — re-checked defensively rather than assumed, since acceptReviewedStage is
  // itself an independently callable, exported function.
  const boundOnlyResult = resolveBoundOnlyPaths(stagingDir)
  if ('error' in boundOnlyResult) {
    return {ok: false, errors: [boundOnlyResult.error]}
  }
  const fullInventory = captureStagedInventory(stagingDir)
  // Two DELIBERATELY separate persisted inventories, from the same capture:
  // - accepted-inventory.json (copy/publication scope): unchanged shape/meaning, RETAINED AS A
  //   READ-ONLY REVIEW ARTIFACT ONLY — promote no longer trusts this file's own paths/hashes as
  //   authoritative; see the B1.4 fix in runCliInner's promote branch below.
  // - accepted-bound-inventory.json (validation-input scope, superset): also binds the private
  //   provenance.json + the frozen source-evidence documents at their actual resolved staged
  //   locations, used for promote's pre-write drift check AND as the sole source promote derives
  //   its verified copy set from — never copied anywhere itself.
  const copyScoped = scopeInventoryToManagedPaths(fullInventory, EXPORT_RELATIVE_PATHS)
  const boundScoped = scopeInventoryToBoundValidationPaths(fullInventory, EXPORT_RELATIVE_PATHS, boundOnlyResult.paths)
  writeFileSync(join(stagingDir, ACCEPTED_INVENTORY_RELATIVE_PATH), JSON.stringify(copyScoped, null, 2))
  writeFileSync(join(stagingDir, ACCEPTED_BOUND_INVENTORY_RELATIVE_PATH), JSON.stringify(boundScoped, null, 2))
  return {ok: true, errors: []}
}

function loadInventoryFile(absolutePath: string): StagedInventory | undefined {
  if (!existsSync(absolutePath)) {
    return undefined
  }
  try {
    const parsed: unknown = JSON.parse(readFileSync(absolutePath, 'utf8'))
    if (typeof parsed !== 'object' || parsed === null) {
      return undefined
    }
    const files = (parsed as {files?: unknown}).files
    if (typeof files !== 'object' || files === null || Array.isArray(files)) {
      return undefined
    }
    return {files: files as Record<string, string>}
  } catch {
    return undefined
  }
}

/** Loads the persisted accepted-inventory.json (copy/publication scope), or `undefined` if missing/malformed. */
export function loadAcceptedInventory(stagingDir: string): StagedInventory | undefined {
  return loadInventoryFile(join(stagingDir, ACCEPTED_INVENTORY_RELATIVE_PATH))
}

/** Loads the persisted accepted-bound-inventory.json (validation-input scope, superset of the copy scope), or `undefined` if missing/malformed. */
export function loadAcceptedBoundInventory(stagingDir: string): StagedInventory | undefined {
  return loadInventoryFile(join(stagingDir, ACCEPTED_BOUND_INVENTORY_RELATIVE_PATH))
}

// ---------------------------------------------------------------------------
// Promote execution: real filesystem operations wired to the plan* functions
// ---------------------------------------------------------------------------

/**
 * Filters a full staged-directory inventory (e.g. from `captureStagedInventory`,
 * which hashes everything under the staging root) down to exactly the paths
 * this script ever promotes: the node/edge/theme/tag JSON records and the two
 * exact export targets. `readDestinationState` reads the same scope on the
 * destination side, so `planFreshPromote`/`planRecoveryPromote` compare like
 * with like — neither side ever treats `.deciduous/config.toml`, the sync
 * store's own README, or any other staged-but-unmanaged file as something to
 * promote, refuse over, or flag as an unexpected destination file.
 */
export function scopeInventoryToManagedPaths(
  inventory: StagedInventory,
  exportFiles: readonly string[],
): StagedInventory {
  const exportSet = new Set(exportFiles)
  const files: Record<string, string> = {}
  for (const [path, hash] of Object.entries(inventory.files)) {
    if (MANAGED_RECORD_PATH.test(path) || exportSet.has(path)) {
      files[path] = hash
    }
  }
  return {files}
}

/** `snapshot.ts`'s own frozen-snapshot provenance file, relative to a staging root. */
const SNAPSHOT_PROVENANCE_RELATIVE_PATH = join('.bootstrap', 'provenance.json')

/**
 * Resolves each `SOURCE_EVIDENCE_ARTIFACT_PATHS` entry to its ACTUAL staged location, using the
 * same tracked-vs-`source-inputs/`-fallback logic `resolveStagedArtifactPath` already owns —
 * rather than assuming every source-evidence document lives directly under the staging root. A
 * staging directory with a real `.bootstrap/provenance.json` (i.e. built via `prepareSourceSnapshot`)
 * that does NOT list one of these two required paths as a frozen artifact is a genuine
 * inconsistency (the build stage's own snapshot preflight requires both unconditionally — see the
 * `build` command below) and fails closed here rather than guessing a location that might not
 * hold the actual frozen bytes. Staging directories with no `.bootstrap/provenance.json` at all
 * (never built via `prepareSourceSnapshot` — e.g. a directly-constructed fixture) fall back to the
 * pre-snapshot assumption that these documents live directly under the staging root, preserving
 * compatibility with staging directories built without a real source snapshot.
 */
function resolveSourceEvidenceBoundPaths(stagingDir: string): {paths: string[]} | {error: string} {
  const snapshotProvenance = loadSourceSnapshotProvenance(stagingDir)
  if (snapshotProvenance === undefined) {
    return {paths: [...SOURCE_EVIDENCE_ARTIFACT_PATHS]}
  }
  const root = realpathSync(stagingDir)
  const paths: string[] = []
  for (const relativePath of SOURCE_EVIDENCE_ARTIFACT_PATHS) {
    const artifact = snapshotProvenance.requiredArtifacts.find(a => a.relativePath === relativePath)
    if (artifact === undefined) {
      return {
        error: `snapshot provenance (.bootstrap/provenance.json) does not list required source-evidence document "${relativePath}" as a frozen artifact — refusing to guess its staged location rather than treating an unlisted required input as safely absent`,
      }
    }
    const absolutePath = resolveStagedArtifactPath(root, artifact)
    paths.push(relative(root, absolutePath).split(sep).join('/'))
  }
  return {paths}
}

/**
 * Combines `provenance.json`, `snapshot.ts`'s own `.bootstrap/provenance.json`, and the two
 * source-evidence documents' ACTUAL resolved staged locations into the full bound-only path list —
 * the single entry point every `scopeInventoryToBoundValidationPaths` call site should use, so the
 * fail-closed behavior in `resolveSourceEvidenceBoundPaths` is never bypassed by a call site
 * re-deriving its own (potentially stale/hardcoded) path list.
 */
export function resolveBoundOnlyPaths(stagingDir: string): {paths: string[]} | {error: string} {
  const sourceEvidenceResult = resolveSourceEvidenceBoundPaths(stagingDir)
  if ('error' in sourceEvidenceResult) {
    return sourceEvidenceResult
  }
  return {paths: [PROVENANCE_RELATIVE_PATH, SNAPSHOT_PROVENANCE_RELATIVE_PATH, ...sourceEvidenceResult.paths]}
}

/**
 * The superset of `scopeInventoryToManagedPaths` used to bind `accept`'s digest and `promote`'s
 * pre-write reverification: every validation INPUT (private `provenance.json` + the frozen source
 * snapshot's own provenance + the two source-evidence documents, at their ACTUAL resolved staged
 * locations — see `resolveSourceEvidenceBoundPaths`/`resolveBoundOnlyPaths`), not merely the
 * managed records/exports this script actually copies to the destination. This is a strictly
 * separate set from the copy/publication list — `planFreshPromote`/`planRecoveryPromote`/
 * `executeFreshPromote`/`executeRecoveryPromote` continue to operate ONLY on
 * `scopeInventoryToManagedPaths`'s output, so none of these bound-only paths are ever copied into
 * the destination or a public export.
 */
export function scopeInventoryToBoundValidationPaths(
  inventory: StagedInventory,
  exportFiles: readonly string[],
  boundOnlyPaths: readonly string[],
): StagedInventory {
  const managed = scopeInventoryToManagedPaths(inventory, exportFiles)
  const files: Record<string, string> = {...managed.files}
  for (const relativePath of boundOnlyPaths) {
    const hash = inventory.files[relativePath]
    if (hash !== undefined) {
      files[relativePath] = hash
    }
  }
  return {files}
}

/**
 * Reads a destination repo's real, current promote-relevant state, scoped
 * strictly to the paths this script ever writes to: the node/edge/theme/tag
 * JSON records directly inside `.deciduous/sync/<kind>/` (one level, not
 * recursive) and the two exact export files. This is deliberately NOT a
 * recursive whole-repo scan — a real destination repo legitimately has a
 * README, `package.json`, `.git/`, `node_modules/`, `.deciduous/config.toml`,
 * `.deciduous/sync/README.md`, and other tracked content this script must
 * never read, hash, refuse promotion over, or treat as "managed". Every path
 * is resolved through `resolveWithinRoot`, so a symlink anywhere in the
 * destination — managed or not — cannot cause a read/write outside the
 * destination root.
 */
export function readDestinationState(destinationRoot: string, exportFiles: readonly string[]): DestinationState {
  if (!existsSync(destinationRoot)) {
    return {syncRecordCount: 0, files: {}}
  }
  const root = realpathSync(destinationRoot)

  let syncRecordCount = 0
  const relevantPaths = new Set<string>(exportFiles)
  for (const subdir of SYNC_RECORD_SUBDIRS) {
    const dirPath = join(root, '.deciduous', 'sync', subdir)
    if (!existsSync(dirPath)) {
      continue
    }
    const recordFiles = readdirSync(dirPath, {withFileTypes: true}).filter(
      entry => entry.isFile() && entry.name.endsWith('.json'),
    )
    syncRecordCount += recordFiles.length
    for (const entry of recordFiles) {
      relevantPaths.add(`.deciduous/sync/${subdir}/${entry.name}`)
    }
  }

  const files: Record<string, {hash: string; integrityValid: boolean}> = {}
  for (const relativePath of relevantPaths) {
    const absolutePath = resolveWithinRoot(root, relativePath)
    if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
      continue
    }
    const raw = readFileSync(absolutePath)
    let integrityValid = true
    if (relativePath.endsWith('.json')) {
      try {
        JSON.parse(raw.toString('utf8'))
      } catch {
        integrityValid = false
      }
    }
    files[relativePath] = {hash: createHash('sha256').update(raw).digest('hex'), integrityValid}
  }

  return {syncRecordCount, files}
}

/**
 * Executes a `planFreshPromote` "proceed" plan: copies every staged file
 * into the destination. Every destination write is both path-contained
 * (via `resolveWithinRoot`) and exclusive (`fs.constants.COPYFILE_EXCL`) —
 * if a file unexpectedly already exists at the destination (a race the
 * planner didn't see), the copy throws rather than silently overwriting it.
 */
/**
 * Defense in depth (B1.4): every path this script ever actually copies to a destination must be
 * either a managed `.deciduous/sync/**` record or one of the two exact export files — asserted
 * here, at the point of the real filesystem write, so a future caller (or a future refactor of the
 * plan-construction call sites) cannot smuggle a private/bound-only path (e.g. `provenance.json`)
 * into a real copy just by constructing a plan object with that path in it.
 */
function assertManagedCopyPath(relativePath: string): void {
  if (!MANAGED_RECORD_PATH.test(relativePath) && !(EXPORT_RELATIVE_PATHS as readonly string[]).includes(relativePath)) {
    throw new Error(
      `refusing to copy "${relativePath}" to the destination — not a managed .deciduous/sync/** record or a recognized export file`,
    )
  }
}

export function executeFreshPromote(destinationRoot: string, stagingRoot: string, plan: FreshPromotePlan): void {
  if (plan.kind !== 'proceed') {
    throw new Error(`cannot execute a refused fresh-promote plan: ${plan.reason}`)
  }
  mkdirSync(destinationRoot, {recursive: true})
  for (const relativePath of plan.filesToCopy) {
    assertManagedCopyPath(relativePath)
    const sourcePath = resolveWithinRoot(stagingRoot, relativePath)
    const destinationPath = resolveWithinRoot(destinationRoot, relativePath)
    mkdirSync(dirname(destinationPath), {recursive: true})
    copyFileSync(sourcePath, destinationPath, constants.COPYFILE_EXCL)
  }
}

/**
 * Executes a `planRecoveryPromote` "proceed" plan: copies only the
 * `copy-missing` staged files (exclusive write, path-contained); the
 * `skip-identical` steps are no-ops by design — that subset is already
 * byte-identical at the destination.
 */
export function executeRecoveryPromote(destinationRoot: string, stagingRoot: string, plan: RecoveryPromotePlan): void {
  if (plan.kind !== 'proceed') {
    throw new Error(`cannot execute an aborted recovery-promote plan: ${plan.reason} (${plan.path})`)
  }
  mkdirSync(destinationRoot, {recursive: true})
  for (const step of plan.steps) {
    if (step.kind !== 'copy-missing') {
      continue
    }
    assertManagedCopyPath(step.path)
    const sourcePath = resolveWithinRoot(stagingRoot, step.path)
    const destinationPath = resolveWithinRoot(destinationRoot, step.path)
    mkdirSync(dirname(destinationPath), {recursive: true})
    copyFileSync(sourcePath, destinationPath, constants.COPYFILE_EXCL)
  }
}

// ---------------------------------------------------------------------------
// Build-stage orchestration: wires the triage / git-log / PR-body passes
// together against a real `deciduous` runner in a staging directory.
// ---------------------------------------------------------------------------

const TRIAGE_NODE_TYPE_FOR = {default: 'observation', promoted: 'decision'} as const

export interface BuildStageInput {
  readonly runner: CommandRunner
  readonly stagingDir: string
  readonly triageArtifacts: readonly TriageArtifact[]
  /** Artifact path -> real filesystem location to read + attach (working checkout or --source-root). */
  readonly triageArtifactSourcePaths: Readonly<Record<string, string>>
  readonly commits: readonly CommitInput[]
  readonly runWindowId: string
  readonly prs: readonly PrInput[]
  /** The source snapshot's resolved pinned commit SHA, when the build ran against a frozen snapshot rather than a caller-assembled input set. Recorded into provenance.json alongside requiredArtifactPaths. */
  readonly commitSha?: string
  /** The source snapshot's capture timestamp (ISO 8601), recorded into provenance.json alongside requiredArtifactPaths. */
  readonly capturedAt?: string
  /**
   * The two frozen SOURCE_EVIDENCE_ARTIFACT_PATHS documents' real contents,
   * when the caller wants the source-evidence pass to run. Optional and
   * additive — omitting it (as every pre-existing caller does) skips the
   * pass entirely, unchanged from prior behavior.
   */
  readonly sourceEvidenceDocuments?: readonly SourceDocumentInput[]
}

export interface BuildStageResult {
  readonly triageNodeChangeIds: Record<string, string>
  readonly actionNodeChangeIds: Record<string, string>
  readonly depsBatchChangeId: string | undefined
  readonly decisionNodeChangeIds: Record<string, string>
  readonly warnings: string[]
  /** Present only when `sourceEvidenceDocuments` was supplied. */
  readonly sourceEvidence?: SourceEvidenceProvenance
}

export interface SourceEvidencePassResult {
  readonly provenance: SourceEvidenceProvenance
  readonly warnings: readonly string[]
}

/**
 * Extracts goal/decision/option/action/outcome nodes from the two frozen
 * source-evidence documents (SOURCE_EVIDENCE_ARTIFACT_PATHS), applies the
 * ONE approved reviewed-association mapping
 * (`AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001` — never an arbitrary or
 * caller-supplied mapping), and materializes the result as real `deciduous`
 * nodes/edges via `runner`, capturing each planning key's real change_id.
 *
 * Never throws on a drifted or non-applied mapping —
 * `extractSourceEvidence`/`applyReviewedMapping` already fail closed with
 * warnings, and the *absence* of a reviewed-association edge is what makes
 * `validateReviewedGraph` (run later, against the actual staged record) fail
 * — not a build-time throw. This function does throw on unexpected
 * `deciduous` subprocess failures, consistent with the other build passes.
 */
export async function runSourceEvidencePass(
  runner: CommandRunner,
  stagingDir: string,
  documents: readonly SourceDocumentInput[],
): Promise<SourceEvidencePassResult> {
  const extracted = extractSourceEvidence(documents)
  const mapped = applyReviewedMapping(extracted, documents, AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001)

  const preAddSecrets = scanPayloadForSecrets({
    nodeText: mapped.nodes.map(n => `${n.title}\n${n.description}`),
    edgeRationale: mapped.edges.map(e => e.rationale),
  })
  if (preAddSecrets.length > 0) {
    throw new Error(
      `secret-scrub blocked the source-evidence pass: matched rule "${preAddSecrets[0]?.rule}" at ${preAddSecrets[0]?.path}`,
    )
  }

  const changeIdByKey: Record<string, string> = {}
  const nodeProvenance: Record<string, SourceEvidenceNodeProvenance> = {}
  for (const node of mapped.nodes) {
    const added = await runner(['add', node.type, node.title, '-d', node.description], stagingDir)
    const localId = parseCreatedNodeLocalId(added.stdout)
    if (localId === undefined) {
      throw new Error(
        `deciduous add did not report a created node id for source-evidence node "${node.key}": ${added.stderr}`,
      )
    }
    const changeId = await getNodeChangeId(runner, stagingDir, localId)
    changeIdByKey[node.key] = changeId
    nodeProvenance[changeId] = {type: node.type, evidence: node.evidence}
  }

  const edgeProvenance: SourceEvidenceEdgeProvenance[] = []
  for (const edge of mapped.edges) {
    const fromChangeId = changeIdByKey[edge.fromKey]
    const toChangeId = changeIdByKey[edge.toKey]
    if (fromChangeId === undefined || toChangeId === undefined) {
      // Unreachable in practice: mapped.edges only ever reference mapped.nodes' own keys.
      throw new Error(`source-evidence edge references an unresolved node key: ${edge.fromKey} -> ${edge.toKey}`)
    }
    const relationKind = edge.provenance?.relationKind
    const linkResult = await runner(
      ['link', fromChangeId, toChangeId, '-r', edge.rationale, '-t', deciduousEdgeTypeFor(relationKind)],
      stagingDir,
    )
    if (linkResult.exitCode !== 0) {
      throw new Error(
        `deciduous link failed for source-evidence edge ${edge.fromKey} -> ${edge.toKey}: ${linkResult.stderr}`,
      )
    }
    if (edge.provenance === undefined) {
      throw new Error(
        `source-evidence edge ${edge.fromKey} -> ${edge.toKey} is missing provenance; refusing to persist an unqualified edge`,
      )
    }
    edgeProvenance.push({
      fromChangeId,
      toChangeId,
      rationale: edge.rationale,
      evidence: edge.evidence,
      provenance: edge.provenance,
    })
  }

  const reviewedApplied = mapped.edges.some(e => e.provenance?.relationKind === 'reviewed-association')

  return {
    provenance: {
      mappingId: AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001.id,
      reviewedApplied,
      nodes: nodeProvenance,
      edges: edgeProvenance,
      warnings: mapped.warnings,
    },
    warnings: mapped.warnings,
  }
}

/**
 * Runs the three build-stage passes (triage, git-log, PR-body), in order, so
 * later passes can link to nodes earlier passes created. Every text field
 * handed to `deciduous add`/`doc attach` is secret-scanned first (fail
 * closed) and no raw PR body is ever passed as `-d`. All node identity is
 * captured via `getNodeChangeId` (local id -> `show --json`), never by title.
 */
export async function runBuildStage(input: BuildStageInput): Promise<BuildStageResult> {
  const {runner, stagingDir} = input
  const warnings: string[] = []

  // Pre-add secret scan over every normalized text field this pass is about to write.
  const preAddPayload = {
    triage: input.triageArtifacts.map(a => a.disposition),
    commits: input.commits.map(c => c.message),
    prs: input.prs.map(pr => normalizePrBody(pr).summary),
  }
  const preAddSecrets = scanPayloadForSecrets(preAddPayload)
  if (preAddSecrets.length > 0) {
    throw new Error(
      `secret-scrub blocked the build: matched rule "${preAddSecrets[0]?.rule}" at ${preAddSecrets[0]?.path}`,
    )
  }

  // --- Triage pass ---
  const triageNodeChangeIds: Record<string, string> = {}
  for (const artifact of input.triageArtifacts) {
    const sourcePath = input.triageArtifactSourcePaths[artifact.path]
    if (sourcePath === undefined) {
      throw new Error(`no resolved source path for required artifact: ${artifact.path}`)
    }
    const attachmentCheck = validateAttachmentBytes(sourcePath)
    if (!attachmentCheck.ok) {
      throw new Error(`attachment byte validation failed for ${artifact.path}: ${attachmentCheck.reason}`)
    }

    const nodeType = artifact.promoted ? TRIAGE_NODE_TYPE_FOR.promoted : TRIAGE_NODE_TYPE_FOR.default
    const added = await runner(['add', nodeType, artifact.path, '-d', artifact.disposition], stagingDir)
    const localId = parseCreatedNodeLocalId(added.stdout)
    if (localId === undefined) {
      throw new Error(
        `deciduous add did not report a created node id for triage artifact ${artifact.path}: ${added.stderr}`,
      )
    }

    const attached = await runner(
      ['doc', 'attach', String(localId), sourcePath, '-d', artifact.disposition],
      stagingDir,
    )
    if (attached.exitCode !== 0) {
      throw new Error(`deciduous doc attach failed for ${artifact.path}: ${attached.stderr}`)
    }

    triageNodeChangeIds[artifact.path] = await getNodeChangeId(runner, stagingDir, localId)
  }

  // --- Git-log pass ---
  // The verified-merge-SHA set comes from input.prs — a real, gh-confirmed merged-PR snapshot
  // (acquireMergedPrSnapshot), never from parent-count alone.
  const verifiedMergeShas = new Set(input.prs.map(pr => pr.mergeCommitSha))
  const classified = input.commits.map(commit => classifyCommit(commit, verifiedMergeShas))
  const depsBatch = batchDepsCommits(classified, input.runWindowId)
  const nonDepsCommits = classified.filter(commit => !commit.isDepsChore)

  const actionNodeChangeIds: Record<string, string> = {}
  for (const commit of nonDepsCommits) {
    const added = await runner(
      ['add', 'action', commit.summary, '--commit', commit.sha, '-c', String(commit.confidence), '--date', commit.date],
      stagingDir,
    )
    const localId = parseCreatedNodeLocalId(added.stdout)
    if (localId === undefined) {
      throw new Error(`deciduous add did not report a created node id for commit ${commit.sha}: ${added.stderr}`)
    }
    actionNodeChangeIds[commit.sha] = await getNodeChangeId(runner, stagingDir, localId)
  }

  let depsBatchChangeId: string | undefined
  if (depsBatch !== undefined) {
    const added = await runner(['add', 'observation', depsBatch.summary, '-c', '60'], stagingDir)
    const localId = parseCreatedNodeLocalId(added.stdout)
    if (localId === undefined) {
      throw new Error(`deciduous add did not report a created node id for the deps batch: ${added.stderr}`)
    }
    depsBatchChangeId = await getNodeChangeId(runner, stagingDir, localId)
  }

  // --- PR-body pass ---
  const decisionNodeChangeIds: Record<string, string> = {}
  for (const pr of input.prs) {
    const normalized = normalizePrBody(pr)
    const linkedActionChangeId = actionNodeChangeIds[pr.mergeCommitSha]
    const confidence = linkedActionChangeId === undefined ? 70 : 75
    if (linkedActionChangeId === undefined) {
      warnings.push(
        `PR #${pr.number}: no action node found for merge commit ${pr.mergeCommitSha}; confidence dropped to 70`,
      )
    }
    if (pr.filesTruncated === true) {
      warnings.push(
        `PR #${pr.number}: file list is incomplete (files-overflow pagination follow-up did not complete) — attached/recorded files may be a partial subset of what actually changed`,
      )
    }

    const added = await runner(
      [
        'add',
        'decision',
        normalized.title,
        '-d',
        normalized.summary,
        '--files',
        normalized.files.join(','),
        '--commit',
        pr.mergeCommitSha,
        '-c',
        String(confidence),
      ],
      stagingDir,
    )
    const localId = parseCreatedNodeLocalId(added.stdout)
    if (localId === undefined) {
      throw new Error(`deciduous add did not report a created node id for PR #${pr.number}: ${added.stderr}`)
    }
    const changeId = await getNodeChangeId(runner, stagingDir, localId)
    decisionNodeChangeIds[String(pr.number)] = changeId

    if (linkedActionChangeId !== undefined) {
      const linkResult = await runner(
        ['link', linkedActionChangeId, changeId, '-r', 'PR merges the linked commit'],
        stagingDir,
      )
      if (linkResult.exitCode !== 0) {
        // The decision node was already created at confidence 75 (the "link exists" claim) before
        // this call — the pinned deciduous CLI has no node-metadata-edit subcommand (verified via
        // `deciduous --help`/subcommand help: add/link/unlink/delete/status/prompt are the only
        // node-mutating commands, none can revise a node's stored confidence after creation), so a
        // failed link can never be corrected back down to 70. Rather than publish that false
        // metadata, the whole build fails here — the staging directory is left in place (never
        // deleted) so it can be inspected, but nothing in it can reach accept/promote, since no
        // further build step (sync, provenance write) ever runs.
        throw new Error(
          `deciduous link failed for PR #${pr.number} -> action node ${linkedActionChangeId}: ${sanitizeCliOutput(linkResult.stderr)}. Refusing to continue: the decision node was already created claiming this link, and this pinned deciduous CLI has no way to revise a node's confidence after creation, so a partial/false claim can never be safely corrected in place.`,
        )
      }
    }
  }

  // --- Source-evidence pass (goal/decision/option/action/outcome from the two frozen
  //     SOURCE_EVIDENCE_ARTIFACT_PATHS documents, gated on the ONE approved reviewed mapping) ---
  let sourceEvidence: SourceEvidenceProvenance | undefined
  if (input.sourceEvidenceDocuments !== undefined) {
    const sourceEvidenceResult = await runSourceEvidencePass(runner, stagingDir, input.sourceEvidenceDocuments)
    sourceEvidence = sourceEvidenceResult.provenance
    warnings.push(...sourceEvidenceResult.warnings)
  }

  // Persist the run's own input-set record so the validate stage can require it rather than
  // trusting a caller-supplied (and therefore trivially bypassable) required-artifact list.
  // commitSha/capturedAt are additive: when the build ran against a real source snapshot
  // (scripts/bootstrap-graph/snapshot.ts), its resolved SHA and capture time are threaded through
  // here so provenance.json records real values instead of leaving those optional fields empty.
  // capturedAt is recorded under the existing prListFetchedAt field (reused, not a new field) since
  // it is the same snapshot timestamp that also gates PR eligibility in selectEligiblePrs.
  // requiredArtifactPaths keeps its existing meaning and is never displaced by this.
  writeSnapshotProvenance(stagingDir, {
    requiredArtifactPaths: input.triageArtifacts.map(artifact => artifact.path),
    promotedArtifactPaths: input.triageArtifacts.filter(artifact => artifact.promoted).map(artifact => artifact.path),
    commitSha: input.commitSha,
    prListFetchedAt: input.capturedAt,
    sourceEvidence,
  })

  return {triageNodeChangeIds, actionNodeChangeIds, depsBatchChangeId, decisionNodeChangeIds, warnings, sourceEvidence}
}

// ---------------------------------------------------------------------------
// Validate stage: schema + secret-scrub + grounded-chain check over staged output
// ---------------------------------------------------------------------------

/** A single materialized source-evidence node's real `deciduous` identity + the exact evidence that justified it, keyed by change_id in `SourceEvidenceProvenance.nodes`. */
export interface SourceEvidenceNodeProvenance {
  readonly type: GroundedNodeType
  readonly evidence: SourceEvidenceRange
}

/** A single materialized source-evidence edge, identified by its real endpoints' change_ids (never by title). */
export interface SourceEvidenceEdgeProvenance {
  readonly fromChangeId: string
  readonly toChangeId: string
  readonly rationale: string
  readonly evidence: SourceEvidenceRange
  readonly provenance: EdgeProvenance
}

/**
 * The minimal record needed to (a) bind the approved `ReviewedAssociationMapping`'s
 * application to this specific staged build, and (b) let `runValidateStage`
 * cross-check the ACTUAL staged `docs/public/graph-data.json` export against
 * what was declared here — by change_id, never by fragile title matching.
 */
export interface SourceEvidenceProvenance {
  readonly mappingId: string
  /** True only if AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001's goal->decision reviewed-association edge was actually created (i.e. neither snippet had drifted). */
  readonly reviewedApplied: boolean
  readonly nodes: Record<string, SourceEvidenceNodeProvenance>
  readonly edges: readonly SourceEvidenceEdgeProvenance[]
  readonly warnings: readonly string[]
}

export interface SnapshotProvenance {
  readonly requiredArtifactPaths: readonly string[]
  /** The subset of `requiredArtifactPaths` that carry the Lane 5 triage report's PROMOTE annotation. Optional at the type level (like `sourceEvidence`) for backward call-site compatibility, but `runValidateStage` treats its absence as a hard error — see that function's canonical-shape checks. */
  readonly promotedArtifactPaths?: readonly string[]
  readonly commitSha?: string
  readonly prListFetchedAt?: string
  readonly sourceEvidence?: SourceEvidenceProvenance
  /** Sanitized `runBuildStage` warnings (unresolved links, lowered confidence, incomplete file lists) persisted for later inspection — additive, optional, never gates validate/accept/promote on its own. */
  readonly buildWarnings?: readonly string[]
}

export function writeSnapshotProvenance(stagingDir: string, provenance: SnapshotProvenance): void {
  mkdirSync(stagingDir, {recursive: true})
  writeFileSync(join(stagingDir, PROVENANCE_RELATIVE_PATH), JSON.stringify(provenance, null, 2))
}

export function loadSnapshotProvenance(stagingDir: string): SnapshotProvenance | undefined {
  const provenancePath = join(stagingDir, PROVENANCE_RELATIVE_PATH)
  if (!existsSync(provenancePath)) {
    return undefined
  }
  try {
    const parsed: unknown = JSON.parse(readFileSync(provenancePath, 'utf8'))
    if (typeof parsed !== 'object' || parsed === null) {
      return undefined
    }
    const record = parsed as Record<string, unknown>
    const requiredArtifactPaths = record.requiredArtifactPaths
    if (!Array.isArray(requiredArtifactPaths) || !requiredArtifactPaths.every(path => typeof path === 'string')) {
      return undefined
    }
    let promotedArtifactPaths: readonly string[] | undefined
    if (record.promotedArtifactPaths !== undefined) {
      // Present-but-malformed is corrupted provenance, not "absent" — same discipline as
      // sourceEvidence below: silently dropping a bad value would let a truncated/tampered
      // promoted-subset declaration pass through as if it had simply never been recorded.
      if (
        !Array.isArray(record.promotedArtifactPaths) ||
        !record.promotedArtifactPaths.every(path => typeof path === 'string')
      ) {
        return undefined
      }
      promotedArtifactPaths = record.promotedArtifactPaths
    }
    let sourceEvidence: SourceEvidenceProvenance | undefined
    if (record.sourceEvidence !== undefined) {
      const parsed = parseSourceEvidenceProvenance(record.sourceEvidence)
      // Present-but-malformed is treated as corrupted provenance, not "absent" —
      // silently dropping it would let an altered/truncated sourceEvidence block
      // pass validate as if the source-evidence pass had never run.
      if (parsed === undefined) {
        return undefined
      }
      sourceEvidence = parsed
    }

    return {
      requiredArtifactPaths,
      promotedArtifactPaths,
      commitSha: typeof record.commitSha === 'string' ? record.commitSha : undefined,
      prListFetchedAt: typeof record.prListFetchedAt === 'string' ? record.prListFetchedAt : undefined,
      sourceEvidence,
    }
  } catch {
    return undefined
  }
}

/**
 * Re-derives and enforces the canonical Lane 5 triage shape (see
 * `validateCanonicalTriageShape`, the `build`-time equivalent) directly from
 * a LOADED, already-persisted `SnapshotProvenance` — the gate `runValidateStage`
 * (and therefore `accept`/`promote`, which both call it) actually runs. This
 * closes the gap `build`'s own check does not: `provenance.json` is a plain
 * file on disk between `build` and a later `validate`/`accept`/`promote`
 * invocation, so trusting it without re-deriving the canonical shape here
 * would let a shrunk (e.g. 1-path) or padded (16 duplicate-path) provenance
 * silently satisfy every later stage.
 */
export function validateCanonicalProvenanceShape(provenance: SnapshotProvenance): string[] {
  const errors: string[] = []

  const uniqueRequiredPaths = new Set(provenance.requiredArtifactPaths)
  if (uniqueRequiredPaths.size !== provenance.requiredArtifactPaths.length) {
    errors.push(
      `provenance.json's requiredArtifactPaths contains duplicate paths (${provenance.requiredArtifactPaths.length} entries, ${uniqueRequiredPaths.size} unique) — refusing to let a padded/duplicated count satisfy the canonical requirement`,
    )
  } else if (uniqueRequiredPaths.size !== CANONICAL_ARCHIVE_COUNT) {
    errors.push(
      `provenance.json's requiredArtifactPaths must contain exactly ${CANONICAL_ARCHIVE_COUNT} unique paths (the canonical Lane 5 triage report's ARCHIVE set); found ${uniqueRequiredPaths.size}`,
    )
  }

  if (provenance.promotedArtifactPaths === undefined) {
    errors.push(
      'provenance.json is missing promotedArtifactPaths — validate requires the canonical PROMOTE-annotated subset to be explicitly recorded, not silently omitted',
    )
  } else {
    const uniquePromotedPaths = new Set(provenance.promotedArtifactPaths)
    if (uniquePromotedPaths.size !== provenance.promotedArtifactPaths.length) {
      errors.push(
        `provenance.json's promotedArtifactPaths contains duplicate paths (${provenance.promotedArtifactPaths.length} entries, ${uniquePromotedPaths.size} unique)`,
      )
    } else if (uniquePromotedPaths.size !== CANONICAL_PROMOTE_COUNT) {
      errors.push(
        `provenance.json's promotedArtifactPaths must contain exactly ${CANONICAL_PROMOTE_COUNT} unique paths (the canonical Lane 5 triage report's PROMOTE-annotated subset); found ${uniquePromotedPaths.size}`,
      )
    }
    const foreignPromotedPaths = [...uniquePromotedPaths].filter(path => !uniqueRequiredPaths.has(path))
    if (foreignPromotedPaths.length > 0) {
      errors.push(
        `provenance.json's promotedArtifactPaths contains path(s) not present in requiredArtifactPaths: ${foreignPromotedPaths.join(', ')}`,
      )
    }
  }

  return errors
}

const GROUNDED_NODE_TYPES = new Set<string>(['goal', 'option', 'decision', 'action', 'outcome'])

function parseSourceEvidenceRange(value: unknown): SourceEvidenceRange | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const r = value as Record<string, unknown>
  if (typeof r.path !== 'string' || typeof r.startLine !== 'number' || typeof r.endLine !== 'number') return undefined
  return {path: r.path, startLine: r.startLine, endLine: r.endLine}
}

function parseEdgeProvenance(value: unknown): EdgeProvenance | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const r = value as Record<string, unknown>
  if (typeof r.relationKind !== 'string') return undefined
  return r as unknown as EdgeProvenance
}

/** Non-throwing, minimally-strict structural parse of a persisted `SourceEvidenceProvenance` block. */
function parseSourceEvidenceProvenance(value: unknown): SourceEvidenceProvenance | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const r = value as Record<string, unknown>
  if (typeof r.mappingId !== 'string' || typeof r.reviewedApplied !== 'boolean') return undefined
  if (typeof r.nodes !== 'object' || r.nodes === null || Array.isArray(r.nodes)) return undefined
  if (!Array.isArray(r.edges) || !Array.isArray(r.warnings)) return undefined

  const nodes: Record<string, SourceEvidenceNodeProvenance> = {}
  for (const [changeId, rawNode] of Object.entries(r.nodes as Record<string, unknown>)) {
    if (typeof rawNode !== 'object' || rawNode === null) return undefined
    const n = rawNode as Record<string, unknown>
    if (typeof n.type !== 'string' || !GROUNDED_NODE_TYPES.has(n.type)) return undefined
    const evidence = parseSourceEvidenceRange(n.evidence)
    if (evidence === undefined) return undefined
    nodes[changeId] = {type: n.type as GroundedNodeType, evidence}
  }

  const edges: SourceEvidenceEdgeProvenance[] = []
  for (const rawEdge of r.edges) {
    if (typeof rawEdge !== 'object' || rawEdge === null) return undefined
    const e = rawEdge as Record<string, unknown>
    if (typeof e.fromChangeId !== 'string' || typeof e.toChangeId !== 'string' || typeof e.rationale !== 'string')
      return undefined
    const evidence = parseSourceEvidenceRange(e.evidence)
    const provenance = parseEdgeProvenance(e.provenance)
    if (evidence === undefined || provenance === undefined) return undefined
    edges.push({fromChangeId: e.fromChangeId, toChangeId: e.toChangeId, rationale: e.rationale, evidence, provenance})
  }

  if (!r.warnings.every(w => typeof w === 'string')) return undefined

  return {mappingId: r.mappingId, reviewedApplied: r.reviewedApplied, nodes, edges, warnings: r.warnings as string[]}
}

function validateRecordCollection(
  root: string,
  subdir: (typeof SYNC_RECORD_SUBDIRS)[number],
  validator: (record: unknown) => SchemaValidationResult,
): string[] {
  const errors: string[] = []
  const dirPath = join(root, '.deciduous', 'sync', subdir)
  if (!existsSync(dirPath)) {
    return errors
  }
  const files = readdirSync(dirPath, {withFileTypes: true}).filter(
    entry => entry.isFile() && entry.name.endsWith('.json'),
  )
  for (const entry of files) {
    const relativePath = `.deciduous/sync/${subdir}/${entry.name}`
    const absolutePath = resolveWithinRoot(root, relativePath)
    let parsed: unknown
    try {
      parsed = JSON.parse(readFileSync(absolutePath, 'utf8'))
    } catch {
      errors.push(`malformed JSON at ${relativePath}`)
      continue
    }
    errors.push(...validator(parsed).errors.map(message => `${relativePath}: ${message}`))
    for (const match of scanPayloadForSecrets(parsed)) {
      errors.push(`secret-scrub matched rule "${match.rule}" at ${relativePath}#${match.path}`)
    }
  }
  return errors
}

const RECORD_VALIDATORS: Record<(typeof SYNC_RECORD_SUBDIRS)[number], (record: unknown) => SchemaValidationResult> = {
  nodes: validateNodeRecordSchema,
  edges: validateEdgeRecordSchema,
  themes: validateThemeRecordSchema,
  tags: validateTagRecordSchema,
}

export interface ValidateStageResult {
  readonly ok: boolean
  readonly errors: string[]
}

/**
 * Stage 2 (validate): checks the staged record JSON, `graph-data.json`, and
 * `git-history.json` against their own pinned schemas; runs the full-payload
 * secret-scrub over all three; and confirms every required triage artifact
 * is represented by at least one node (the grounded-chain check's "every
 * required artifact represented" clause — the full goal->outcome chain
 * assertion is exercised at the call site via the real node/edge data this
 * unit's end-to-end test produces, not invented here).
 */
export function runValidateStage(stagingDir: string): ValidateStageResult {
  const errors: string[] = []
  const root = realpathSync(stagingDir)

  const provenance = loadSnapshotProvenance(root)
  if (provenance === undefined) {
    errors.push(
      "missing or unreadable provenance.json — validate refuses to report success without the build stage's own input-set record",
    )
  } else {
    if (provenance.requiredArtifactPaths.length === 0) {
      errors.push(
        'provenance.json has an empty requiredArtifactPaths — validate requires a non-empty, meaningful input set',
      )
    }
    errors.push(...validateCanonicalProvenanceShape(provenance))
    if (provenance.sourceEvidence === undefined) {
      errors.push(
        'provenance.json is missing sourceEvidence — validate requires the source-evidence/reviewed-mapping pass to have run and recorded its result; an absent block is treated as a failed gate, not a skipped one',
      )
    }
  }

  // S4 fix: fails closed when a real source snapshot (.bootstrap/provenance.json) exists but does
  // not list one of the two required source-evidence documents as a frozen artifact — this staging
  // directory's digest/accept/promote binding cannot be trusted to actually cover that document's
  // real bytes (see resolveSourceEvidenceBoundPaths for why guessing its location is unsafe).
  const boundOnlyResult = resolveBoundOnlyPaths(stagingDir)
  if ('error' in boundOnlyResult) {
    errors.push(boundOnlyResult.error)
  }

  for (const subdir of SYNC_RECORD_SUBDIRS) {
    errors.push(...validateRecordCollection(root, subdir, RECORD_VALIDATORS[subdir]))
  }

  const graphExportPath = resolveWithinRoot(root, 'docs/public/graph-data.json')
  const gitHistoryPath = resolveWithinRoot(root, 'docs/public/git-history.json')

  // Short-circuits ONLY when the export files themselves are physically missing (JSON.parse below
  // has nothing to read) — NOT merely because canonical-shape/sourceEvidence/record-collection
  // errors have already accumulated above. Errors from every check are meant to accumulate and all
  // surface together; a caller fixing one issue at a time should see every remaining problem, not
  // just whichever check happened to run first.
  const graphExportExists = existsSync(graphExportPath)
  const gitHistoryExportExists = existsSync(gitHistoryPath)
  if (!graphExportExists) {
    errors.push('missing docs/public/graph-data.json')
  }
  if (!gitHistoryExportExists) {
    errors.push('missing docs/public/git-history.json')
  }
  if (!graphExportExists || !gitHistoryExportExists) {
    return {ok: false, errors}
  }

  let graphExport: unknown
  let gitHistoryExport: unknown
  try {
    graphExport = JSON.parse(readFileSync(graphExportPath, 'utf8'))
  } catch {
    return {ok: false, errors: [...errors, 'malformed JSON at docs/public/graph-data.json']}
  }
  try {
    gitHistoryExport = JSON.parse(readFileSync(gitHistoryPath, 'utf8'))
  } catch {
    return {ok: false, errors: [...errors, 'malformed JSON at docs/public/git-history.json']}
  }

  errors.push(...validateGraphExportSchema(graphExport).errors)
  errors.push(...validateGitHistoryExportSchema(gitHistoryExport).errors)

  const secretMatches = [...scanPayloadForSecrets(graphExport), ...scanPayloadForSecrets(gitHistoryExport)]
  for (const match of secretMatches) {
    errors.push(`secret-scrub matched rule "${match.rule}" at ${match.path}`)
  }

  if (provenance !== undefined && provenance.requiredArtifactPaths.length > 0) {
    const graphNodes = (graphExport as {nodes?: {title?: unknown}[]}).nodes ?? []
    const representedTitles = new Set(graphNodes.map(node => (typeof node.title === 'string' ? node.title : '')))
    for (const requiredPath of provenance.requiredArtifactPaths) {
      if (!representedTitles.has(requiredPath)) {
        errors.push(`required triage artifact not represented by any node: ${requiredPath}`)
      }
    }
  }

  if (provenance?.sourceEvidence !== undefined) {
    errors.push(...validateSourceEvidenceAgainstExport(provenance.sourceEvidence, graphExport))
  }

  return {ok: errors.length === 0, errors}
}

/**
 * Cross-checks the build stage's `SourceEvidenceProvenance` record against
 * the ACTUAL staged `docs/public/graph-data.json` export — by change_id,
 * never by title — then runs the public `validateReviewedGraph` strict gate
 * over the reconstructed structure. This deliberately does not re-run
 * `extractSourceEvidence` against the original documents (that would
 * validate the *desired* extractor output while silently ignoring whatever
 * the CLI actually wrote); every node/edge it feeds to `validateReviewedGraph`
 * must first be proven present in the real export.
 */
function validateSourceEvidenceAgainstExport(sourceEvidence: SourceEvidenceProvenance, graphExport: unknown): string[] {
  const errors: string[] = []

  if (!sourceEvidence.reviewedApplied) {
    errors.push(
      'source-evidence provenance records the approved reviewed mapping as NOT applied (missing/drifted goal or decision snippet) — validate refuses to pass without the exact approved reviewed-association.',
    )
  }

  const exportNodes = (graphExport as {nodes?: {change_id?: unknown}[]}).nodes ?? []
  const exportEdges = (graphExport as {edges?: {from_change_id?: unknown; to_change_id?: unknown}[]}).edges ?? []
  const exportChangeIds = new Set(
    exportNodes
      .map(n => (typeof n.change_id === 'string' ? n.change_id : undefined))
      .filter((v): v is string => v !== undefined),
  )
  const exportEdgeKeys = new Set(
    exportEdges
      .filter(e => typeof e.from_change_id === 'string' && typeof e.to_change_id === 'string')
      .map(e => `${e.from_change_id as string}=>${e.to_change_id as string}`),
  )

  const reconstructedNodes: ExtractedNode[] = []
  for (const [changeId, nodeProv] of Object.entries(sourceEvidence.nodes)) {
    if (!exportChangeIds.has(changeId)) {
      errors.push(
        `source-evidence node with change_id ${changeId} (type "${nodeProv.type}") is recorded in provenance but missing from the actual staged graph export.`,
      )
      continue
    }
    reconstructedNodes.push({
      key: changeId,
      type: nodeProv.type,
      title: changeId,
      description: '',
      evidence: nodeProv.evidence,
    })
  }

  const reconstructedEdges: ExtractedEdge[] = []
  for (const edgeProv of sourceEvidence.edges) {
    const key = `${edgeProv.fromChangeId}=>${edgeProv.toChangeId}`
    if (!exportEdgeKeys.has(key)) {
      errors.push(
        `source-evidence edge ${edgeProv.fromChangeId} -> ${edgeProv.toChangeId} (${edgeProv.provenance.relationKind}) is recorded in provenance but missing from the actual staged graph export.`,
      )
      continue
    }
    reconstructedEdges.push({
      fromKey: edgeProv.fromChangeId,
      toKey: edgeProv.toChangeId,
      rationale: edgeProv.rationale,
      evidence: edgeProv.evidence,
      provenance: edgeProv.provenance,
    })
  }

  const reviewed = validateReviewedGraph(reconstructedNodes, reconstructedEdges)
  errors.push(...reviewed.errors)

  return errors
}

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
const MAX_CLI_OUTPUT_LENGTH = 2000

/**
 * Bounds and secret-scrubs any text before it becomes part of a `runCli`
 * result — subprocess stderr, thrown-error messages, and any other
 * externally-influenced content. A matched secret pattern is never echoed:
 * the whole string is replaced with a generic, rule-named redaction notice.
 */
export function sanitizeCliOutput(text: string, maxLength = MAX_CLI_OUTPUT_LENGTH): string {
  const matches = scanTextForSecrets(text)
  if (matches.length > 0) {
    return `[output redacted: matched secret rule "${matches[0]?.rule}"]`
  }
  return text.length > maxLength ? `${text.slice(0, maxLength)}... (truncated)` : text
}

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
    const digest = computeInventoryDigest(
      scopeInventoryToBoundValidationPaths(
        captureStagedInventory(parsed.stagingDir),
        EXPORT_RELATIVE_PATHS,
        boundOnlyResult.paths,
      ),
    )
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
    const currentDigest = computeInventoryDigest(
      scopeInventoryToBoundValidationPaths(
        captureStagedInventory(parsed.stagingDir),
        EXPORT_RELATIVE_PATHS,
        boundOnlyResult.paths,
      ),
    )
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
  // etc) is surfaced in the successful CLI output — never silently discarded — and also persisted
  // into provenance.json below, both sanitized (never raw stderr/secret values). No arbitrary
  // warning-count threshold gates success; warnings are informational, not a failure signal (a
  // failure signal is a nonzero exit, as S3's link-failure hard-fail now does separately).
  const warningsSection =
    buildResult.warnings.length === 0
      ? ''
      : `\n\nWarnings:\n${buildResult.warnings.map(w => `- ${sanitizeCliOutput(w)}`).join('\n')}`

  writeSnapshotProvenance(parsed.stagingDir, {
    ...(loadSnapshotProvenance(parsed.stagingDir) ?? {requiredArtifactPaths: triageArtifacts.map(a => a.path)}),
    buildWarnings: buildResult.warnings.map(w => sanitizeCliOutput(w)),
  })

  return {
    exitCode: 0,
    output: `build: pinned ${pinnedRef} at ${snapshot.provenance.resolvedSha}, staged ${Object.keys(buildResult.triageNodeChangeIds).length} triage node(s), ${Object.keys(buildResult.actionNodeChangeIds).length} action node(s), ${Object.keys(buildResult.decisionNodeChangeIds).length} decision node(s)${sourceEvidenceSummary}. Staging directory: ${parsed.stagingDir}${warningsSection}`,
  }
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
