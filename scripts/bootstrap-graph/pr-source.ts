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
// Calendar-window search: a cheap COUNT-ONLY query decides whether a window
// needs splitting BEFORE any rich data (bodies/files) is ever fetched, then
// an under-cap window's PRs are fetched one bounded page at a time (never a
// single aggregate `--paginate --slurp` gh process) — see
// `fetchMergedPrsInWindow`'s doc comment for why.
// ---------------------------------------------------------------------------

/** Deliberately requests only `issueCount`, no `nodes` — the cheapest possible GraphQL shape for deciding whether a window needs splitting, before any PR body/file data is fetched. `first: 1` is a required-but-unused connection argument; nothing under `nodes` is ever selected. */
const SEARCH_COUNT_QUERY = `query($searchQuery: String!) {
  search(query: $searchQuery, type: ISSUE, first: 1) {
    issueCount
  }
}`

/** Fetches exactly ONE page (never `--paginate`) of real PR data for an already-confirmed-under-cap window; the caller drives pagination itself, one bounded `gh` call per page. */
const SEARCH_PAGE_QUERY = `query($searchQuery: String!, $endCursor: String) {
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

function buildSearchQueryString(input: {owner: string; repo: string; start: string; end: string}): string {
  return `repo:${input.owner}/${input.repo} is:pr is:merged merged:${input.start}..${input.end}`
}

/**
 * Builds the argv for the cheap count-only query for `[start, end]` (both
 * inclusive) — no `--paginate`/`--slurp`, no PR bodies/files requested. This
 * is always the FIRST call made for any window, so a window that would hit
 * GitHub search's 1000-result cap is detected and split before any rich
 * data fetch is even attempted (the actual root cause of the real timeout
 * this replaces: the old bulk `--paginate --slurp` fetch downloaded the
 * whole 12-month window's bodies/files before ever checking the count).
 */
export function buildSearchCountArgv(input: {owner: string; repo: string; start: string; end: string}): string[] {
  return ['api', 'graphql', '-f', `query=${SEARCH_COUNT_QUERY}`, '-f', `searchQuery=${buildSearchQueryString(input)}`]
}

/**
 * Parses a single (non-`--slurp`) `gh api graphql` count-query response.
 * Throws — never silently returns 0 — on malformed JSON, a GraphQL-level
 * `errors` array (which `gh` can still return with a real command
 * `exitCode: 0`), or a missing/non-numeric `issueCount`. "Zero PRs" must
 * only ever mean GitHub actually reported zero, never a swallowed parse
 * failure.
 */
export function parseSearchCountOutput(stdout: string): number {
  const parsed: unknown = JSON.parse(stdout)
  if (typeof parsed !== 'object' || parsed === null) {
    throw new TypeError('expected gh api graphql count-query output to be a JSON object')
  }
  const errors = (parsed as {errors?: unknown}).errors
  if (Array.isArray(errors) && errors.length > 0) {
    throw new Error(`gh api graphql count query returned GraphQL error(s): ${JSON.stringify(errors)}`)
  }
  const issueCount = (parsed as {data?: {search?: {issueCount?: unknown}}}).data?.search?.issueCount
  if (typeof issueCount !== 'number') {
    throw new TypeError('gh api graphql count-query output did not include a numeric data.search.issueCount')
  }
  return issueCount
}

/**
 * Builds the argv for fetching exactly one page of real PR data (never
 * `--paginate`) for a window already confirmed under the cap. Passing
 * `afterCursor` as a bound `-f endCursor=` field drives pagination
 * explicitly, one bounded `gh` call per page — never a single aggregate
 * process that could itself exceed the 15s/2MB production runner bounds on
 * a large, rich-data window.
 */
export function buildSearchPageArgv(input: {
  owner: string
  repo: string
  start: string
  end: string
  afterCursor?: string
}): string[] {
  const argv = [
    'api',
    'graphql',
    '-f',
    `query=${SEARCH_PAGE_QUERY}`,
    '-f',
    `searchQuery=${buildSearchQueryString(input)}`,
  ]
  if (input.afterCursor !== undefined) {
    argv.push('-f', `endCursor=${input.afterCursor}`)
  }
  return argv
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

function toRawMergedPr(node: GraphqlPrNode): RawMergedPr {
  return {
    number: node.number,
    title: node.title,
    body: node.body,
    mergedAt: node.mergedAt,
    url: node.url,
    mergeCommitSha: node.mergeCommit?.oid ?? '',
    files: (node.files?.nodes ?? []).map(fileNode => fileNode.path ?? ''),
    filesTruncated: node.files?.pageInfo?.hasNextPage ?? false,
    filesEndCursor: node.files?.pageInfo?.endCursor ?? undefined,
  }
}

/**
 * Parses a single (non-`--slurp`) `gh api graphql` page-query response into
 * this page's PRs plus the real pagination signal (`hasNextPage`/
 * `endCursor`) the caller needs to decide whether — and how — to fetch the
 * next page. Throws on malformed JSON or a GraphQL-level `errors` array
 * (even with `exitCode: 0`) rather than returning a page that looks
 * complete but isn't.
 */
export function parseSearchPageOutput(stdout: string): {
  prs: RawMergedPr[]
  hasNextPage: boolean
  endCursor?: string
} {
  const parsed: unknown = JSON.parse(stdout)
  if (typeof parsed !== 'object' || parsed === null) {
    throw new TypeError('expected gh api graphql page-query output to be a JSON object')
  }
  const errors = (parsed as {errors?: unknown}).errors
  if (Array.isArray(errors) && errors.length > 0) {
    throw new Error(`gh api graphql page query returned GraphQL error(s): ${JSON.stringify(errors)}`)
  }
  const search = (
    parsed as {data?: {search?: {nodes?: GraphqlPrNode[]; pageInfo?: {hasNextPage?: unknown; endCursor?: unknown}}}}
  ).data?.search
  if (search === undefined) {
    throw new TypeError('gh api graphql page-query output did not include data.search')
  }
  const prs = (search.nodes ?? []).map(node => toRawMergedPr(node))
  const hasNextPage = search.pageInfo?.hasNextPage === true
  const endCursor = typeof search.pageInfo?.endCursor === 'string' ? search.pageInfo.endCursor : undefined
  return {prs, hasNextPage, endCursor}
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
 * Computes the whole-second midpoint of `[start, end]` for a search-window
 * bisection, matching GitHub search's supported date precision (`YYYY-MM-DD`
 * or `YYYY-MM-DDTHH:MM:SS(+00:00|Z)` — no fractional seconds; see GitHub's
 * "Understanding the search syntax" docs). Returns `undefined` when the
 * window cannot be meaningfully narrowed further — either it's already at
 * (or below) 1-second precision, or rounding to whole seconds would produce
 * a midpoint equal to one of the existing bounds. This is the single
 * unsplittable-window signal `fetchMergedPrsInWindow` uses to stop
 * recursing and fail clearly instead of looping.
 */
function computeWindowMidpoint(start: string, end: string): string | undefined {
  const startMs = new Date(start).getTime()
  const endMs = new Date(end).getTime()
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs - startMs < 2000) {
    return undefined
  }
  const midMs = startMs + Math.floor((endMs - startMs) / 2)
  const mid = new Date(midMs).toISOString().replace(/\.\d{3}Z$/, 'Z')
  return mid === start || mid === end ? undefined : mid
}

/**
 * Fetches every real PR page for an already-confirmed-under-cap window, one
 * bounded `gh` call per page (never `--paginate`/`--slurp` aggregating an
 * entire window's rich data into a single subprocess). Rejects a response
 * that reports `hasNextPage: true` but no `endCursor` (would loop forever)
 * and a repeated/non-advancing cursor (a malformed or stuck pagination
 * signal) — both abort the ENTIRE acquisition rather than silently
 * returning whatever pages happened to succeed so far.
 */
async function fetchAllPagesInWindow(
  owner: string,
  repo: string,
  start: string,
  end: string,
  runCommand: CommandRunner,
): Promise<RawMergedPr[]> {
  const collected: RawMergedPr[] = []
  const seenCursors = new Set<string>()
  let cursor: string | undefined
  let hasNextPage = true

  while (hasNextPage) {
    const pageResult = await runCommand(buildSearchPageArgv({owner, repo, start, end, afterCursor: cursor}))
    if (pageResult.exitCode !== 0) {
      throw redactedGhFailure('api graphql (merged-PR page fetch)')
    }
    const page = parseSearchPageOutput(pageResult.stdout)
    collected.push(...page.prs)

    if (page.hasNextPage) {
      if (page.endCursor === undefined) {
        throw new Error(
          `merged-PR page fetch for ${owner}/${repo} window ${start}..${end}: response reported hasNextPage=true but returned no endCursor — aborting rather than looping indefinitely with no way to request the next page.`,
        )
      }
      if (page.endCursor === cursor || seenCursors.has(page.endCursor)) {
        throw new Error(
          `merged-PR page fetch for ${owner}/${repo} window ${start}..${end}: pagination cursor did not advance (repeated cursor) — aborting rather than looping indefinitely.`,
        )
      }
      seenCursors.add(page.endCursor)
      cursor = page.endCursor
    }
    hasNextPage = page.hasNextPage
  }

  return collected
}

/**
 * Fetches every merged PR in `[start, end]` (both inclusive) using a
 * count-first strategy: a cheap `issueCount`-only query (no bodies/files,
 * single request) decides whether the window needs splitting BEFORE any
 * rich data is ever fetched. This is the actual fix for the real production
 * timeout the prior version hit — that version fetched the ENTIRE window's
 * bodies/files via `--paginate --slurp` first and only checked the count
 * afterward, so a large real window (~1114 PRs, ~5.5MB, ~69s) blew past the
 * production runner's 15s/2MB bounds before the cap logic ever ran. Here,
 * the count check is always the first (and only) call for an over-cap
 * window — rich data is fetched, one bounded page at a time, only once a
 * leaf window is already confirmed under the cap.
 *
 * Recursion is strictly sequential (never `Promise.all`): the first half is
 * fully resolved (including any of its own further splits) before the
 * second half is even requested, keeping subprocess fan-out bounded and
 * predictable. A window that still hits the cap at 1-second precision (the
 * smallest interval GitHub search dates support) cannot be narrowed further
 * and fails loudly rather than recursing forever or silently accepting a
 * truncated leaf. Any `gh` failure at any depth — count query, page fetch,
 * or a count/page mismatch once a leaf is fully paginated — aborts the
 * whole fetch immediately; a partially successful sibling window or leaf is
 * never returned as if it were the complete result.
 */
async function fetchMergedPrsInWindow(
  owner: string,
  repo: string,
  start: string,
  end: string,
  runCommand: CommandRunner,
): Promise<RawMergedPr[]> {
  const countResult = await runCommand(buildSearchCountArgv({owner, repo, start, end}))
  if (countResult.exitCode !== 0) {
    throw redactedGhFailure('api graphql (merged-PR count)')
  }
  const count = parseSearchCountOutput(countResult.stdout)

  if (count === 0) {
    return []
  }

  if (count < GITHUB_SEARCH_RESULT_CAP) {
    const prs = await fetchAllPagesInWindow(owner, repo, start, end, runCommand)
    const uniqueCount = new Set(prs.map(pr => pr.number)).size
    if (uniqueCount !== count) {
      // A leaf window's own count-query result must reconcile with what its own page-by-page
      // fetch actually returned. A mismatch here means the PR set changed between the count call
      // and the page-fetch calls (a real, if rare, live-data race) or a page was silently
      // incomplete — either way, this is never treated as a complete result.
      throw new Error(
        `merged-PR fetch for ${owner}/${repo} window ${start}..${end}: the count query reported ${count} PR(s) but page-by-page fetch returned ${uniqueCount} unique PR(s) — refusing to claim a complete result rather than inventing agreement between the two.`,
      )
    }
    return prs
  }

  // At or above the cap: GitHub's search API caps total results at 1000 regardless of
  // pagination, so the true result set for this window may be larger than what was actually
  // returned. Bisect by timestamp and recurse — BEFORE fetching any rich data — rather than
  // trust (or even attempt) a possibly-truncated bulk fetch.
  const mid = computeWindowMidpoint(start, end)
  if (mid === undefined) {
    throw new Error(
      `merged-PR search window ${start}..${end} for ${owner}/${repo} reports ${count} result(s) — at or above GitHub search's ${GITHUB_SEARCH_RESULT_CAP}-result cap — and cannot be split further (already at 1-second precision, the smallest interval GitHub search dates support). Too many PRs were merged within this single window to enumerate completely via search; a truncated result is never accepted.`,
    )
  }

  const firstHalf = await fetchMergedPrsInWindow(owner, repo, start, mid, runCommand)
  const secondHalf = await fetchMergedPrsInWindow(owner, repo, mid, end, runCommand)
  return [...firstHalf, ...secondHalf]
}

/**
 * Acquires the merged-PR snapshot for the PR-body pass: the calendar-window
 * search (count-first, then bounded page-by-page real `gh api graphql`
 * calls — see `fetchMergedPrsInWindow`'s doc comment) unioned with any
 * older merged PR explicitly referenced by an in-scope markdown source or
 * PR number, de-duplicated by PR number. Unmerged and after-`capturedAt`
 * PRs are always excluded, for both the window and explicit-reference
 * paths.
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

  const windowPrsRaw = await fetchMergedPrsInWindow(options.owner, options.repo, cutoff, options.capturedAt, runCommand)

  // Adjacent sub-windows use an inclusive..inclusive boundary on both sides (matching GitHub's
  // range syntax), so a PR merged exactly at a split point can legitimately appear in both
  // halves' results — deduplicate by PR number before doing any further (costly) per-PR work like
  // the files-overflow follow-up below.
  const windowPrsByNumber = new Map<number, RawMergedPr>()
  for (const pr of windowPrsRaw) {
    windowPrsByNumber.set(pr.number, pr)
  }
  const windowPrs = [...windowPrsByNumber.values()]

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
