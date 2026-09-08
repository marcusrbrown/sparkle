/**
 * PR-body source pass: normalization of a merged PR's raw body into the
 * `deciduous add -d` description text, eligible-PR windowing, artifact
 * preflight, and fixture-based `gh pr list` loading (no real `gh` calls
 * live in this module — see pr-source.ts for the real acquisition path).
 */
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'

import {scanTextForSecrets} from './secrets.js'

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
  /**
   * Secret-scan rule names matched against the UNTOUCHED raw body but not
   * present in the retained/bounded `summary` — i.e. found solely in
   * deterministically-omitted source content (collapsed release notes,
   * sponsors blocks, template boilerplate) or in text clipped away by the
   * description budget. This is a redacted-source WARNING signal only —
   * never a substitute for the hard-fail pre-add scan callers run against
   * `summary` itself; a match retained in `summary` still hard-fails there.
   */
  readonly redactedSourceSecretRules: readonly string[]
  /** sha256 hex digest of the untouched raw PR body — recorded (never the raw body itself) so a redacted-source warning is traceable/reproducible without persisting raw content anywhere new. */
  readonly rawBodyHash: string
  /** True when `summary` was truncated to fit the description budget. */
  readonly clipped: boolean
  /** True when no usable bounded content remained after deterministic omission and `summary` fell back to a bare "PR #N: title" label. */
  readonly usedTitleFallback: boolean
}

/** Maximum retained description length, in Unicode code points (not UTF-16 code units), including any appended clip notice. */
const MAX_DESCRIPTION_CODEPOINTS = 2000

const CLIP_NOTICE = ' [description truncated to fit budget]'

/** Matches either a `<details ...>` opening tag (with or without attributes) or a `</details>` closing tag — used by `removeBalancedDetailsBlocks` for depth-aware, nesting-safe removal. */
const DETAILS_TAG_PATTERN = /<details\b[^>]*>|<\/details>/gi

/**
 * Removes every collapsed release-notes block (Renovate wraps each
 * dependency's changelog in a `<details>...</details>` block, sometimes
 * with attributes like `<details open>`, and occasionally nested one level
 * deep) as a single balanced OUTERMOST range per block — a depth-aware scan
 * over tag positions, not a naive non-greedy regex (which cannot correctly
 * handle nesting: it would stop at the first inner `</details>`, leaving an
 * orphaned outer closing tag and partially-retained outer content).
 *
 * An unmatched opening tag (no closing tag anywhere after it) is left in
 * place untouched — nothing is guessed or swallowed past it. An unmatched
 * closing tag (no open tag before it, at depth 0) is likewise left in
 * place and never consumes any preceding content.
 */
function removeBalancedDetailsBlocks(text: string): string {
  const ranges: {start: number; end: number}[] = []
  let depth = 0
  let openRangeStart = -1

  for (const match of text.matchAll(DETAILS_TAG_PATTERN)) {
    const isOpeningTag = match[0].toLowerCase().startsWith('<details')
    if (isOpeningTag) {
      if (depth === 0) {
        openRangeStart = match.index
      }
      depth += 1
      continue
    }

    // Closing tag: an unmatched closing tag at depth 0 is left in place (ignored) rather than
    // treated as closing something that was never opened.
    if (depth === 0) {
      continue
    }
    depth -= 1
    if (depth === 0) {
      ranges.push({start: openRangeStart, end: match.index + match[0].length})
      openRangeStart = -1
    }
  }
  // depth > 0 here means an opening tag never found its closing tag — openRangeStart's range is
  // deliberately never pushed, so that unmatched block is left untouched.

  if (ranges.length === 0) {
    return text
  }

  let result = ''
  let cursor = 0
  for (const range of ranges) {
    result += text.slice(cursor, range.start)
    cursor = range.end
  }
  result += text.slice(cursor)
  return result
}

/** A sponsors block delimited by an HTML comment marker, running to an explicit closing marker or, absent one, to the end of the body (sponsor blocks are conventionally trailing). */
const SPONSORS_BLOCK_PATTERN = /<!--\s*sponsors\s*-->[\s\S]*?(?:<!--\s*\/sponsors\s*-->|$)/gi

/** A markdown badge/shield image link occupying its own line. */
const BADGE_IMAGE_LINE_PATTERN = /^[ \t]*\[!\[[^\n]*?\]\([^\n]*?\)\]\([^\n]*?\)[ \t]*$/gm

/** Renovate's "Configuration" boilerplate footer heading through the rest of the body (schedule/automerge notes, generator credit, debug markers). */
const CONFIGURATION_FOOTER_PATTERN = /^#{1,4}[ \t]*Configuration\b[\s\S]*/im

/**
 * Deterministically selects the content of a PR body worth retaining in the
 * description: ordinary leading summary paragraphs/bullets and recognized
 * Renovate update tables are kept; collapsed release-notes blocks, sponsor
 * blocks, badge images, and the Renovate "Configuration" boilerplate footer
 * are omitted. This is intentionally simple line-oriented text surgery, not
 * a general Markdown parser — the goal is a deterministic, auditable
 * selection, never a model-driven summary.
 *
 * When omission leaves nothing usable, falls back to a bare "PR #N: title"
 * label rather than inventing rationale for an empty PR body.
 */
function selectPrDescriptionContent(
  rawBody: string,
  number: number,
  title: string,
): {text: string; usedTitleFallback: boolean} {
  let text = removeBalancedDetailsBlocks(rawBody)

  text = text.replaceAll(SPONSORS_BLOCK_PATTERN, '')
  text = text.replaceAll(BADGE_IMAGE_LINE_PATTERN, '')
  text = text.replace(CONFIGURATION_FOOTER_PATTERN, '')
  text = text.replaceAll(/\n{3,}/g, '\n\n').trim()

  if (text.length === 0) {
    return {text: `PR #${number}: ${title}`, usedTitleFallback: true}
  }
  return {text, usedTitleFallback: false}
}

/** Finds the last whitespace character's index in `s`, or -1 if none exists. A last-resort boundary when no paragraph or line break is available, so a hard cut never lands mid-word (and, transitively, never mid-token/mid-credential). */
function lastWhitespaceIndex(s: string): number {
  for (let i = s.length - 1; i >= 0; i -= 1) {
    if (/\s/.test(s[i] ?? '')) {
      return i
    }
  }
  return -1
}

/** Absolute last-resort safety clamp for the synthesized title-fallback label only (never for real body content) — guards the pathological case of an extremely long PR title. */
function clampCodepoints(text: string, maxCodepoints: number): string {
  const codepoints = [...text]
  return codepoints.length <= maxCodepoints ? text : codepoints.slice(0, maxCodepoints).join('')
}

/**
 * Clips `text` to `MAX_DESCRIPTION_CODEPOINTS` Unicode code points
 * (surrogate-pair-safe — codepoints are sliced from the string iterator's
 * array, never split), stopping at the last paragraph, then line, then
 * plain whitespace boundary at or before the budget — in that preference
 * order — so a table row, sentence, or word (and therefore a token/
 * credential straddling the cut point) is never split in half.
 *
 * Selection of the cut boundary is entirely independent of any secret scan
 * — the boundary search never looks at what the text contains, only at
 * paragraph/line/whitespace structure, so it cannot be steered into
 * "cleaning up" a match.
 *
 * When NO such boundary exists anywhere before the budget (one long,
 * completely unbroken run of non-whitespace characters), a hard code-point
 * cut is refused outright — it falls back to the bare "PR #N: title" label
 * instead. A hard cut could otherwise slice a straddling secret/token in
 * half, leaving a still-sensitive partial fragment in the retained output
 * while the raw-vs-retained comparison reports it as "safely omitted"
 * (the truncated fragment no longer matches the full pattern) — a false
 * sense of safety this refusal closes. The clip notice itself is counted
 * toward the budget, so the total result never exceeds it.
 */
function clipToDescriptionBudget(
  text: string,
  number: number,
  title: string,
): {result: string; clipped: boolean; usedTitleFallback: boolean} {
  const codepoints = [...text]
  if (codepoints.length <= MAX_DESCRIPTION_CODEPOINTS) {
    return {result: text, clipped: false, usedTitleFallback: false}
  }

  const noticeLength = [...CLIP_NOTICE].length
  const available = Math.max(0, MAX_DESCRIPTION_CODEPOINTS - noticeLength)
  const candidate = codepoints.slice(0, available).join('')

  const lastParagraphBoundary = candidate.lastIndexOf('\n\n')
  const lastLineBoundary = candidate.lastIndexOf('\n')
  const lastWhitespaceBoundary = lastWhitespaceIndex(candidate)
  const boundary =
    lastParagraphBoundary > 0
      ? lastParagraphBoundary
      : lastLineBoundary > 0
        ? lastLineBoundary
        : lastWhitespaceBoundary > 0
          ? lastWhitespaceBoundary
          : -1

  if (boundary <= 0) {
    return {
      result: clampCodepoints(`PR #${number}: ${title}`, MAX_DESCRIPTION_CODEPOINTS),
      clipped: false,
      usedTitleFallback: true,
    }
  }

  const bounded = candidate.slice(0, boundary)
  return {result: `${bounded.trimEnd()}${CLIP_NOTICE}`, clipped: true, usedTitleFallback: false}
}

/**
 * Normalizes a PR's raw body into the description text the PR-body pass
 * passes to `-d`/`--description`. The raw body is only ever read in memory
 * to produce this summary — it is never itself passed to `deciduous add`,
 * never persisted, and never surfaced in this function's output beyond its
 * sha256 hash.
 *
 * Selection (`selectPrDescriptionContent`) and budget-clipping
 * (`clipToDescriptionBudget`) run independently of secret-scan results —
 * content is never retained or dropped BECAUSE it matched (or didn't match)
 * a secret pattern, and no credential/token value is ever substituted into
 * the retained text to manufacture a scanner pass. A raw secret pattern
 * that ends up retained in `summary` is left exactly as-is for the caller's
 * hard-fail pre-add scan (`scanTextForSecrets`/`scanPayloadForSecrets`) to
 * catch and block — normalization alone is never a substitute for that
 * scan. `redactedSourceSecretRules` is a separate, lower-severity warning
 * signal for rule names that matched the untouched raw body but do NOT
 * appear in the final retained `summary` (because the matching text was
 * deterministically omitted or budget-clipped away) — traceable via
 * `rawBodyHash`, never by exposing the matched value or the raw body.
 */
export function normalizePrBody(
  pr: Pick<PrInput, 'number' | 'title' | 'body' | 'files' | 'mergeCommitSha'>,
): NormalizedPr {
  const rawBody = pr.body
  const rawBodyHash = createHash('sha256').update(rawBody, 'utf8').digest('hex')
  const rawMatchRules = new Set(scanTextForSecrets(rawBody).map(match => match.rule))

  const {text: selectedText, usedTitleFallback: selectionUsedTitleFallback} = selectPrDescriptionContent(
    rawBody,
    pr.number,
    pr.title,
  )
  const {
    result: summary,
    clipped,
    usedTitleFallback: clipUsedTitleFallback,
  } = clipToDescriptionBudget(selectedText, pr.number, pr.title)
  const usedTitleFallback = selectionUsedTitleFallback || clipUsedTitleFallback

  const retainedMatchRules = new Set(scanTextForSecrets(summary).map(match => match.rule))
  const redactedSourceSecretRules = [...rawMatchRules].filter(rule => !retainedMatchRules.has(rule))

  return {
    number: pr.number,
    title: pr.title,
    summary,
    files: pr.files,
    mergeCommitSha: pr.mergeCommitSha,
    confidence: 75,
    redactedSourceSecretRules,
    rawBodyHash,
    clipped,
    usedTitleFallback,
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
