/**
 * Real merged-PR acquisition for the decision-graph bootstrap's PR-body pass.
 *
 * Standalone module: no runtime dependency on `../bootstrap-graph.ts` (only
 * structural type compatibility with its `PrInput` shape, documented below,
 * so the parent integrator can adopt this without a circular import). Every
 * `gh` invocation is a real, production argv array passed through an
 * injected `CommandRunner` — `shell: false` always, no string-interpolated
 * shell commands, no network calls made from this module directly. Tests
 * inject a fake runner; nothing here calls `gh` during development/CI.
 *
 * Output shape (`number`, `title`, `body`, `mergedAt`, `files`,
 * `mergeCommitSha`) matches `bootstrap-graph.ts`'s `PrInput` field-for-field
 * so the integrator can adopt this as a drop-in replacement for today's
 * mandatory `--pr-fixture` path, with the fixture becoming an optional
 * override rather than the only path.
 *
 * Known integration note (flagged, not silently duplicated): the 12-calendar-
 * month cutoff computation here (`computeCutoff`) intentionally mirrors
 * `selectEligiblePrs`'s existing cutoff policy in `bootstrap-graph.ts`
 * (`setUTCMonth(-12)`, inclusive both ends). The two are not the same
 * function — reconciling them (or having one delegate to the other) is an
 * integration-time decision for whoever wires this module in, not decided
 * here.
 */

/** Result of a single bounded subprocess invocation. */
export interface CommandResult {
  readonly exitCode: number
  readonly stdout: string
  readonly stderr: string
}

/** Injectable command runner: real argv array in, bounded result out. Never shells out via string interpolation. */
export type CommandRunner = (argv: readonly string[]) => Promise<CommandResult>

/** A merged PR as acquired from `gh`, before being narrowed to the `PrInput`-compatible output shape. */
export interface RawMergedPr {
  readonly number: number
  readonly title: string
  readonly body: string
  readonly mergedAt: string
  readonly url: string
  readonly mergeCommitSha: string
  files: string[]
  filesTruncated: boolean
  filesEndCursor?: string
}

/** Output shape compatible with `bootstrap-graph.ts`'s `PrInput` (see module doc). */
export interface MinimalPrInput {
  readonly number: number
  readonly title: string
  readonly body: string
  readonly mergedAt: string | undefined
  readonly files: readonly string[]
  readonly mergeCommitSha: string
  /** True when the files-overflow follow-up pagination never completed (this PR touched >100 files and the follow-up request(s) failed) — `files` may be an incomplete list. Never silently dropped so callers can warn rather than publish a falsely-complete file list. */
  readonly filesTruncated: boolean
}

// ---------------------------------------------------------------------------
// Calendar-window search: gh api graphql --paginate --slurp (real pagination,
// not a single-page --limit truncation)
// ---------------------------------------------------------------------------

const SEARCH_MERGED_PRS_QUERY = `query($searchQuery: String!, $endCursor: String) {
  search(query: $searchQuery, type: ISSUE, first: 50, after: $endCursor) {
    pageInfo { hasNextPage endCursor }
    nodes {
      ... on PullRequest {
        number
        title
        body
        mergedAt
        url
        mergeCommit { oid }
        files(first: 100) {
          nodes { path }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  }
}`

/**
 * Builds the real `gh api graphql --paginate --slurp` argv for fetching
 * every merged PR in `[start, end]` (both inclusive, caller-computed). Uses
 * GitHub's cursor-based GraphQL pagination via `--paginate` — which keeps
 * requesting pages until the search is exhausted — rather than a single
 * `--limit N` call that could silently truncate once a repo has more merged
 * PRs than N. The search query string is passed as a bound `-f` field
 * (`searchQuery=...`), never concatenated into the query text itself.
 */
export function buildSearchMergedPrsGraphqlArgv(input: {
  owner: string
  repo: string
  start: string
  end: string
}): string[] {
  const searchQuery = `repo:${input.owner}/${input.repo} is:pr is:merged merged:${input.start}..${input.end}`
  return [
    'api',
    'graphql',
    '--paginate',
    '--slurp',
    '-f',
    `query=${SEARCH_MERGED_PRS_QUERY}`,
    '-f',
    `searchQuery=${searchQuery}`,
  ]
}

interface GraphqlPrNode {
  readonly number: number
  readonly title: string
  readonly body: string
  readonly mergedAt: string
  readonly url: string
  readonly mergeCommit?: {readonly oid?: string} | null
  readonly files?: {
    readonly nodes?: readonly {readonly path?: string}[]
    readonly pageInfo?: {readonly hasNextPage?: boolean; readonly endCursor?: string | null}
  }
}

/**
 * Parses `gh api graphql --paginate --slurp`'s stdout (a JSON array of one
 * object per fetched page) into a flat `RawMergedPr[]`. Throws on malformed
 * JSON rather than returning a silently partial/empty result — a caller
 * needs to know acquisition failed, not treat "zero PRs" as a valid outcome
 * of a parse failure.
 */
export function parseSearchGraphqlSlurpOutput(stdout: string): RawMergedPr[] {
  const pages: unknown = JSON.parse(stdout)
  if (!Array.isArray(pages)) {
    throw new TypeError('expected gh api --paginate --slurp output to be a JSON array of pages')
  }

  const results: RawMergedPr[] = []
  for (const page of pages) {
    const nodes = (page as {data?: {search?: {nodes?: GraphqlPrNode[]}}}).data?.search?.nodes ?? []
    for (const node of nodes) {
      results.push({
        number: node.number,
        title: node.title,
        body: node.body,
        mergedAt: node.mergedAt,
        url: node.url,
        mergeCommitSha: node.mergeCommit?.oid ?? '',
        files: (node.files?.nodes ?? []).map(fileNode => fileNode.path ?? ''),
        filesTruncated: node.files?.pageInfo?.hasNextPage ?? false,
        filesEndCursor: node.files?.pageInfo?.endCursor ?? undefined,
      })
    }
  }
  return results
}

// ---------------------------------------------------------------------------
// Per-PR file-list overflow pagination (a PR with >100 changed files)
// ---------------------------------------------------------------------------

const FILES_OVERFLOW_QUERY = `query($owner: String!, $repo: String!, $number: Int!, $endCursor: String) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $number) {
      files(first: 100, after: $endCursor) {
        nodes { path }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
}`

/** Builds the follow-up argv for a single PR's next page of changed files, when the initial 100-file page wasn't enough. */
export function buildPrFilesPaginationArgv(input: {
  owner: string
  repo: string
  number: number
  afterCursor: string
}): string[] {
  return [
    'api',
    'graphql',
    '-f',
    `query=${FILES_OVERFLOW_QUERY}`,
    '-f',
    `owner=${input.owner}`,
    '-f',
    `repo=${input.repo}`,
    '-F',
    `number=${input.number}`,
    '-f',
    `endCursor=${input.afterCursor}`,
  ]
}

function parseFilesOverflowPage(stdout: string): {files: string[]; hasNextPage: boolean; endCursor?: string} {
  const parsed: unknown = JSON.parse(stdout)
  const filesNode = (
    parsed as {
      data?: {
        repository?: {
          pullRequest?: {
            files?: {nodes?: {path?: string}[]; pageInfo?: {hasNextPage?: boolean; endCursor?: string | null}}
          }
        }
      }
    }
  ).data?.repository?.pullRequest?.files
  return {
    files: (filesNode?.nodes ?? []).map(node => node.path ?? ''),
    hasNextPage: filesNode?.pageInfo?.hasNextPage ?? false,
    endCursor: filesNode?.pageInfo?.endCursor ?? undefined,
  }
}

// ---------------------------------------------------------------------------
// Explicit reference extraction from markdown source text
// ---------------------------------------------------------------------------

export type PrReferenceCandidate =
  | {readonly kind: 'pull-url'; readonly owner: string; readonly repo: string; readonly number: number}
  | {readonly kind: 'bare-number'; readonly number: number}

const PULL_URL_PATTERN = /https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)/g
const BARE_NUMBER_PATTERN = /(?<![\w/])#(\d+)\b/g

/**
 * Extracts explicit PR reference candidates from a markdown source's raw
 * text: confirmed `owner/repo/pull/N` URLs, and bare `#N` subject-style
 * mentions that still need resolution (a bare `#N` could be an issue, not a
 * PR — see `buildResolvePrCandidateArgv`). `.../issues/N` URLs are never
 * extracted as PR candidates. Deterministic pattern matching only — no
 * inference from vague prose, and results are de-duplicated.
 */
export function extractPrReferenceCandidatesFromMarkdown(text: string): PrReferenceCandidate[] {
  const seen = new Set<string>()
  const candidates: PrReferenceCandidate[] = []

  for (const match of text.matchAll(PULL_URL_PATTERN)) {
    const [, owner, repo, numberText] = match
    if (owner === undefined || repo === undefined || numberText === undefined) {
      continue
    }
    const key = `pull-url:${owner}/${repo}#${numberText}`
    if (!seen.has(key)) {
      seen.add(key)
      candidates.push({kind: 'pull-url', owner, repo, number: Number(numberText)})
    }
  }

  for (const match of text.matchAll(BARE_NUMBER_PATTERN)) {
    const numberText = match[1]
    if (numberText === undefined) {
      continue
    }
    const key = `bare:${numberText}`
    if (!seen.has(key)) {
      seen.add(key)
      candidates.push({kind: 'bare-number', number: Number(numberText)})
    }
  }

  return candidates
}

/**
 * Builds the real `gh pr view` argv used to resolve a candidate number to a
 * confirmed PR (and its merged state) — needed because a bare `#N` mention,
 * and in principle any candidate, might actually name an issue rather than
 * a PR. A non-zero exit (not found / wrong kind) means the caller excludes
 * the candidate rather than falsely including it.
 */
export function buildResolvePrCandidateArgv(input: {owner: string; repo: string; number: number}): string[] {
  return [
    'pr',
    'view',
    String(input.number),
    '--repo',
    `${input.owner}/${input.repo}`,
    '--json',
    'number,state,mergedAt,title,body,url,mergeCommit,files',
  ]
}

interface PrViewJson {
  readonly number?: unknown
  readonly state?: unknown
  readonly mergedAt?: unknown
  readonly title?: unknown
  readonly body?: unknown
  readonly url?: unknown
  readonly mergeCommit?: {readonly oid?: unknown} | null
  readonly files?: readonly (string | {readonly path?: unknown})[]
}

function parsePrViewOutput(parsed: unknown): RawMergedPr | undefined {
  if (typeof parsed !== 'object' || parsed === null) {
    return undefined
  }
  const record = parsed as PrViewJson
  if (record.state !== 'MERGED') {
    return undefined
  }
  if (
    typeof record.number !== 'number' ||
    typeof record.title !== 'string' ||
    typeof record.body !== 'string' ||
    typeof record.mergedAt !== 'string' ||
    typeof record.url !== 'string'
  ) {
    return undefined
  }
  const mergeCommitSha =
    record.mergeCommit != null && typeof record.mergeCommit.oid === 'string' ? record.mergeCommit.oid : ''
  const files = Array.isArray(record.files)
    ? record.files.map(file => (typeof file === 'object' && file !== null ? String(file.path ?? '') : String(file)))
    : []
  return {
    number: record.number,
    title: record.title,
    body: record.body,
    mergedAt: record.mergedAt,
    url: record.url,
    mergeCommitSha,
    files,
    filesTruncated: false,
  }
}

// ---------------------------------------------------------------------------
// Merge-confidence signal
// ---------------------------------------------------------------------------

/**
 * Assigns a PR-merge confidence signal, matching the plan's approved
 * two-tier scheme (the same 80/60 split `classifyCommit` uses for the
 * git-log pass): 80 when the PR's merge SHA is present in the caller's set
 * of independently confirmed commit hashes (e.g. from the git-log pass);
 * 60 otherwise. Parent-count-alone is deliberately never accepted as PR
 * proof — a real repo has squash-merge and branch-sync commits that are
 * two-parent without being a GitHub PR merge. There is no intermediate
 * subject-suffix tier here — an earlier draft introduced unapproved 65/50
 * tiers; this function now has exactly the two approved confidence values.
 */
export function computePrMergeConfidence(
  input: {mergeCommitSha: string},
  verifiedMergeShas: ReadonlySet<string>,
): number {
  return verifiedMergeShas.has(input.mergeCommitSha) ? 80 : 60
}

/** GitHub's search API returns at most this many total results for a single query, regardless of pagination. */
export const GITHUB_SEARCH_RESULT_CAP = 1000

// ---------------------------------------------------------------------------
// Top-level acquisition
// ---------------------------------------------------------------------------

export type PrReferenceInput =
  | {readonly kind: 'markdown-source'; readonly path: string; readonly text: string}
  | {readonly kind: 'pr-number'; readonly number: number}

export interface AcquireMergedPrSnapshotOptions {
  readonly owner: string
  readonly repo: string
  /** ISO timestamp: the snapshot's upper bound. PRs merged after this are always excluded. */
  readonly capturedAt: string
  /** In-scope markdown sources (already selected by the caller) and/or explicit PR-number candidates to union in. */
  readonly referenceCandidates?: readonly PrReferenceInput[]
  /**
   * Optional test/dev override: when provided, `gh` is never invoked and
   * this list is used as-is (still passed through the same output mapping).
   * Not mandatory — the default, production path calls `gh` for real.
   */
  readonly fixtureOverride?: readonly RawMergedPr[]
}

export interface AcquiredPrSnapshot {
  readonly prs: MinimalPrInput[]
  readonly provenance: {
    readonly owner: string
    readonly repo: string
    readonly capturedAt: string
    readonly cutoff: string
  }
}

function computeCutoff(capturedAt: string): string {
  const cutoff = new Date(capturedAt)
  cutoff.setUTCMonth(cutoff.getUTCMonth() - 12)
  return cutoff.toISOString()
}

function toMinimalPrInput(pr: RawMergedPr): MinimalPrInput {
  return {
    number: pr.number,
    title: pr.title,
    body: pr.body,
    mergedAt: pr.mergedAt,
    files: pr.files,
    mergeCommitSha: pr.mergeCommitSha,
    filesTruncated: pr.filesTruncated,
  }
}

function redactedGhFailure(context: string): Error {
  // Never include stderr here — it may carry credentials, tokens, or other
  // sensitive detail from a failed `gh` auth/rate-limit response.
  return new Error(
    `gh ${context} failed. Run \`gh auth status\` and check rate limits; see local gh CLI output for detail (not echoed here for safety).`,
  )
}

/**
 * Acquires the merged-PR snapshot for the PR-body pass: the calendar-window
 * search (real `gh api graphql --paginate --slurp`) unioned with any older
 * merged PR explicitly referenced by an in-scope markdown source or PR
 * number, de-duplicated by PR number. Unmerged and after-`capturedAt` PRs
 * are always excluded, for both the window and explicit-reference paths.
 */
export async function acquireMergedPrSnapshot(
  options: AcquireMergedPrSnapshotOptions,
  runCommand: CommandRunner,
): Promise<AcquiredPrSnapshot> {
  const cutoff = computeCutoff(options.capturedAt)

  if (options.fixtureOverride !== undefined) {
    return {
      prs: options.fixtureOverride.map(pr => toMinimalPrInput(pr)),
      provenance: {owner: options.owner, repo: options.repo, capturedAt: options.capturedAt, cutoff},
    }
  }

  const searchResult = await runCommand(
    buildSearchMergedPrsGraphqlArgv({owner: options.owner, repo: options.repo, start: cutoff, end: options.capturedAt}),
  )
  if (searchResult.exitCode !== 0) {
    throw redactedGhFailure('api graphql (merged-PR search)')
  }
  const windowPrs = parseSearchGraphqlSlurpOutput(searchResult.stdout)

  // GitHub's search API caps total results at 1000 regardless of pagination — hitting that cap
  // means the true result set may be larger than what was actually returned. Fail clearly rather
  // than silently accepting a truncated window; splitting into narrower date sub-windows is a
  // caller-side follow-up once this is reported, not something guessed at here.
  if (windowPrs.length >= GITHUB_SEARCH_RESULT_CAP) {
    throw new Error(
      `merged-PR calendar-window search for ${options.owner}/${options.repo} returned ${windowPrs.length} results, at or above GitHub search's ${GITHUB_SEARCH_RESULT_CAP}-result cap — the true window may be larger than what was returned. Split the window (${cutoff}..${options.capturedAt}) into narrower sub-windows and retry rather than trust this truncated result.`,
    )
  }

  for (const pr of windowPrs) {
    // Best-effort file-overflow follow-up: never fails the whole snapshot over one PR's file list.
    while (pr.filesTruncated && pr.filesEndCursor !== undefined) {
      const followUp = await runCommand(
        buildPrFilesPaginationArgv({
          owner: options.owner,
          repo: options.repo,
          number: pr.number,
          afterCursor: pr.filesEndCursor,
        }),
      )
      if (followUp.exitCode !== 0) {
        break
      }
      const page = parseFilesOverflowPage(followUp.stdout)
      pr.files.push(...page.files)
      pr.filesTruncated = page.hasNextPage
      pr.filesEndCursor = page.endCursor
    }
  }

  const byNumber = new Map<number, RawMergedPr>()
  for (const pr of windowPrs) {
    byNumber.set(pr.number, pr)
  }

  const candidates: PrReferenceCandidate[] = []
  for (const input of options.referenceCandidates ?? []) {
    if (input.kind === 'markdown-source') {
      candidates.push(...extractPrReferenceCandidatesFromMarkdown(input.text))
    } else {
      candidates.push({kind: 'bare-number', number: input.number})
    }
  }

  const capturedAtMs = new Date(options.capturedAt).getTime()

  for (const candidate of candidates) {
    if (candidate.kind === 'pull-url' && (candidate.owner !== options.owner || candidate.repo !== options.repo)) {
      continue // a reference to a different repo's PR is out of scope for this snapshot
    }
    if (byNumber.has(candidate.number)) {
      continue // already covered by the calendar-window search — dedup, no extra gh call
    }

    const resolveResult = await runCommand(
      buildResolvePrCandidateArgv({owner: options.owner, repo: options.repo, number: candidate.number}),
    )
    if (resolveResult.exitCode !== 0) {
      continue // not resolvable as this repo's PR (e.g. it's an issue, or doesn't exist) — exclude, never falsely include
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(resolveResult.stdout)
    } catch {
      continue
    }
    const rawPr = parsePrViewOutput(parsed)
    if (rawPr === undefined) {
      continue
    }

    const mergedAtMs = new Date(rawPr.mergedAt).getTime()
    if (Number.isNaN(mergedAtMs) || mergedAtMs > capturedAtMs) {
      continue // unmerged or merged after the snapshot bound
    }

    byNumber.set(candidate.number, rawPr)
  }

  return {
    prs: [...byNumber.values()].map(pr => toMinimalPrInput(pr)),
    provenance: {owner: options.owner, repo: options.repo, capturedAt: options.capturedAt, cutoff},
  }
}
