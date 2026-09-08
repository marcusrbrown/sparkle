/**
 * PR-body source pass: normalization of a merged PR's raw body into the
 * `deciduous add -d` description text, eligible-PR windowing, artifact
 * preflight, and fixture-based `gh pr list` loading (no real `gh` calls
 * live in this module — see pr-source.ts for the real acquisition path).
 */
import {readFileSync} from 'node:fs'

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
