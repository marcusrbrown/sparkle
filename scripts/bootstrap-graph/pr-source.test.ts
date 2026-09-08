/**
 * Tests for scripts/bootstrap-graph/pr-source.ts.
 *
 * All `gh` invocations are mocked via an injected CommandRunner — no real
 * network/API calls happen in this file. Argv shape, pagination handling,
 * reference extraction, and confidence assignment are exercised against
 * fake `gh` output crafted to match the real `gh api graphql --paginate
 * --slurp` and `gh pr view` output shapes.
 */

import {standardAfterEach, standardBeforeEach} from '@sparkle/test-utils/lifecycle'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {
  acquireMergedPrSnapshot,
  buildResolvePrCandidateArgv,
  buildSearchCountArgv,
  buildSearchPageArgv,
  computePrMergeConfidence,
  extractPrReferenceCandidatesFromMarkdown,
  parseSearchCountOutput,
  parseSearchPageOutput,
  type CommandResult,
  type CommandRunner,
} from './pr-source.js'

beforeEach(() => {
  standardBeforeEach()
})

afterEach(() => {
  standardAfterEach()
})

function ok(stdout: string): CommandResult {
  return {exitCode: 0, stdout, stderr: ''}
}

describe('buildSearchCountArgv', () => {
  it('builds a cheap count-only gh api graphql argv (no --paginate/--slurp)', () => {
    const argv = buildSearchCountArgv({owner: 'marcusrbrown', repo: 'sparkle', start: '2025-05-24', end: '2026-05-24'})
    expect(argv[0]).toBe('api')
    expect(argv[1]).toBe('graphql')
    expect(argv).not.toContain('--paginate')
    expect(argv).not.toContain('--slurp')
  })

  it('embeds the calendar-window search query as a bound field, not string-interpolated into the query text', () => {
    const argv = buildSearchCountArgv({owner: 'marcusrbrown', repo: 'sparkle', start: '2025-05-24', end: '2026-05-24'})
    const searchFieldValues = argv.filter(token => token.startsWith('searchQuery='))
    expect(searchFieldValues).toHaveLength(1)
    expect(searchFieldValues[0]).toContain('repo:marcusrbrown/sparkle')
    expect(searchFieldValues[0]).toContain('is:pr')
    expect(searchFieldValues[0]).toContain('is:merged')
    expect(searchFieldValues[0]).toContain('merged:2025-05-24..2026-05-24')
  })

  it('the query field requests only issueCount — no PR body/file fields, no nodes selection', () => {
    const argv = buildSearchCountArgv({owner: 'a', repo: 'b', start: '2025-01-01', end: '2026-01-01'})
    const queryField = argv.find(token => token.startsWith('query='))
    expect(queryField).toBeDefined()
    expect(queryField).toContain('issueCount')
    expect(queryField).not.toContain('body')
    expect(queryField).not.toContain('files')
    expect(queryField).not.toContain('mergeCommit')
  })
})

describe('parseSearchCountOutput', () => {
  it('extracts issueCount from a real (non-slurped) count-query response', () => {
    const stdout = JSON.stringify({data: {search: {issueCount: 1114}}})
    expect(parseSearchCountOutput(stdout)).toBe(1114)
  })

  it('extracts a count of zero as a legitimate result, not a parse failure', () => {
    const stdout = JSON.stringify({data: {search: {issueCount: 0}}})
    expect(parseSearchCountOutput(stdout)).toBe(0)
  })

  it('throws on malformed JSON rather than silently returning 0', () => {
    expect(() => parseSearchCountOutput('not json')).toThrow()
  })

  it('throws on a GraphQL-level errors array, even though gh itself may still report exitCode 0', () => {
    const stdout = JSON.stringify({errors: [{message: 'rate limited'}]})
    expect(() => parseSearchCountOutput(stdout)).toThrow(/error/i)
  })

  it('throws when data.search.issueCount is missing or non-numeric, rather than defaulting to 0', () => {
    expect(() => parseSearchCountOutput(JSON.stringify({data: {search: {}}}))).toThrow()
    expect(() => parseSearchCountOutput(JSON.stringify({data: {search: {issueCount: 'not-a-number'}}}))).toThrow()
  })
})

describe('buildSearchPageArgv', () => {
  it('builds a single-page gh api graphql argv (no --paginate/--slurp) requesting rich PR fields', () => {
    const argv = buildSearchPageArgv({owner: 'marcusrbrown', repo: 'sparkle', start: '2025-05-24', end: '2026-05-24'})
    expect(argv[0]).toBe('api')
    expect(argv[1]).toBe('graphql')
    expect(argv).not.toContain('--paginate')
    expect(argv).not.toContain('--slurp')
    const queryField = argv.find(token => token.startsWith('query='))
    expect(queryField).toContain('pageInfo')
    expect(queryField).toContain('hasNextPage')
    expect(queryField).toContain('endCursor')
    expect(queryField).toContain('mergedAt')
    expect(queryField).toContain('mergeCommit')
  })

  it('omits the endCursor field entirely for the first page (no afterCursor given)', () => {
    const argv = buildSearchPageArgv({owner: 'a', repo: 'b', start: '2025-01-01', end: '2026-01-01'})
    expect(argv.some(token => token.startsWith('endCursor='))).toBe(false)
  })

  it('passes a given afterCursor as a bound field for a follow-up page', () => {
    const argv = buildSearchPageArgv({
      owner: 'a',
      repo: 'b',
      start: '2025-01-01',
      end: '2026-01-01',
      afterCursor: 'CURSOR1',
    })
    expect(argv).toContain('endCursor=CURSOR1')
  })
})

describe('parseSearchPageOutput', () => {
  const onePage = JSON.stringify({
    data: {
      search: {
        pageInfo: {hasNextPage: true, endCursor: 'CURSOR1'},
        nodes: [
          {
            number: 1,
            title: 'feat: first',
            body: 'body one',
            mergedAt: '2025-06-01T00:00:00Z',
            url: 'https://github.com/o/r/pull/1',
            mergeCommit: {oid: 'sha1'},
            files: {nodes: [{path: 'a.ts'}], pageInfo: {hasNextPage: false, endCursor: null}},
          },
        ],
      },
    },
  })

  it('parses a single page (not a slurped array) into its PRs plus real pagination signals', () => {
    const parsed = parseSearchPageOutput(onePage)
    expect(parsed.prs.map(pr => pr.number)).toEqual([1])
    expect(parsed.hasNextPage).toBe(true)
    expect(parsed.endCursor).toBe('CURSOR1')
  })

  it('extracts files, mergeCommit sha, and flags a PR whose files list is incomplete', () => {
    const parsed = parseSearchPageOutput(onePage)
    expect(parsed.prs[0]?.files).toEqual(['a.ts'])
    expect(parsed.prs[0]?.mergeCommitSha).toBe('sha1')
    expect(parsed.prs[0]?.filesTruncated).toBe(false)
  })

  it('flags a PR whose files sub-list reports hasNextPage as truncated, for follow-up pagination', () => {
    const withOverflow = JSON.stringify({
      data: {
        search: {
          pageInfo: {hasNextPage: false, endCursor: null},
          nodes: [
            {
              number: 3,
              title: 't',
              body: 'b',
              mergedAt: '2025-06-01T00:00:00Z',
              url: 'https://github.com/o/r/pull/3',
              mergeCommit: {oid: 'sha3'},
              files: {nodes: [{path: 'a.ts'}], pageInfo: {hasNextPage: true, endCursor: 'FILE_CURSOR'}},
            },
          ],
        },
      },
    })
    const parsed = parseSearchPageOutput(withOverflow)
    expect(parsed.prs[0]?.filesTruncated).toBe(true)
    expect(parsed.prs[0]?.filesEndCursor).toBe('FILE_CURSOR')
  })

  it('reports hasNextPage: false and no endCursor for a final page', () => {
    const finalPage = JSON.stringify({data: {search: {pageInfo: {hasNextPage: false, endCursor: null}, nodes: []}}})
    const parsed = parseSearchPageOutput(finalPage)
    expect(parsed.hasNextPage).toBe(false)
    expect(parsed.endCursor).toBeUndefined()
  })

  it('throws on malformed JSON rather than silently returning an empty/complete-looking page', () => {
    expect(() => parseSearchPageOutput('not json')).toThrow()
  })

  it('throws on a GraphQL-level errors array, even though gh itself may still report exitCode 0', () => {
    const stdout = JSON.stringify({errors: [{message: 'rate limited'}]})
    expect(() => parseSearchPageOutput(stdout)).toThrow(/error/i)
  })

  it('throws when data.search is missing entirely, rather than returning an empty page', () => {
    expect(() => parseSearchPageOutput(JSON.stringify({data: {}}))).toThrow()
  })
})

describe('extractPrReferenceCandidatesFromMarkdown', () => {
  it('extracts an explicit owner/repo pull URL as a confirmed PR reference', () => {
    const candidates = extractPrReferenceCandidatesFromMarkdown(
      'See https://github.com/marcusrbrown/sparkle/pull/1662 for context.',
    )
    expect(candidates).toEqual([{kind: 'pull-url', owner: 'marcusrbrown', repo: 'sparkle', number: 1662}])
  })

  it('extracts a bare #N subject reference as an unresolved candidate needing verification', () => {
    const candidates = extractPrReferenceCandidatesFromMarkdown('Fixes #1006 in the triage report.')
    expect(candidates).toEqual([{kind: 'bare-number', number: 1006}])
  })

  it('does NOT extract an issues/N URL as a PR reference', () => {
    const candidates = extractPrReferenceCandidatesFromMarkdown(
      'See https://github.com/marcusrbrown/sparkle/issues/876 for the tracking issue.',
    )
    expect(candidates).toEqual([])
  })

  it('extracts multiple distinct references from one document, de-duplicated', () => {
    const text = 'PR https://github.com/o/r/pull/5 and again https://github.com/o/r/pull/5, also #7.'
    const candidates = extractPrReferenceCandidatesFromMarkdown(text)
    expect(candidates).toEqual([
      {kind: 'pull-url', owner: 'o', repo: 'r', number: 5},
      {kind: 'bare-number', number: 7},
    ])
  })

  it('returns an empty list for prose with no PR-shaped references', () => {
    expect(extractPrReferenceCandidatesFromMarkdown('Just a normal paragraph with no links at all.')).toEqual([])
  })
})

describe('buildResolvePrCandidateArgv', () => {
  it('builds a real gh pr view argv to resolve a bare candidate number to a confirmed merged PR', () => {
    const argv = buildResolvePrCandidateArgv({owner: 'o', repo: 'r', number: 42})
    expect(argv).toEqual([
      'pr',
      'view',
      '42',
      '--repo',
      'o/r',
      '--json',
      'number,state,mergedAt,title,body,url,mergeCommit,files',
    ])
  })
})

describe('computePrMergeConfidence', () => {
  it('assigns the approved verified-merge confidence (80) when the PR merge SHA matches a verified commit', () => {
    const confidence = computePrMergeConfidence({mergeCommitSha: 'sha-abc'}, new Set(['sha-abc']))
    expect(confidence).toBe(80)
  })

  it('assigns the approved fallback confidence (60) when the merge SHA is not verified — no subject-suffix tier, no parent-count-based inference', () => {
    const confidence = computePrMergeConfidence({mergeCommitSha: 'sha-unverified'}, new Set())
    expect(confidence).toBe(60)
  })
})

function makeRunner(impl: (argv: readonly string[]) => CommandResult): CommandRunner {
  return vi.fn(async (argv: readonly string[]) => impl(argv))
}

/** True for a real search call (count or page) — both, and only these, carry a bound `searchQuery=` field. Distinguishes from `gh pr view` (argv[0]==='pr') and the files-overflow follow-up call (owner=/repo=/number= fields, no searchQuery). */
function isSearchCall(argv: readonly string[]): boolean {
  return argv.some(token => token.startsWith('searchQuery='))
}

/** Among search calls, the count query's `query=` text requests `issueCount`; the page query's requests `pageInfo`/`mergeCommit`/etc. Precise enough given the two queries' real, fixed text (the page query's text also contains "pageInfo", so this checks for "issueCount" specifically, never the reverse). */
function isCountQuery(argv: readonly string[]): boolean {
  const queryField = argv.find(token => token.startsWith('query='))
  return queryField !== undefined && queryField.includes('issueCount')
}

function countResponse(count: number): CommandResult {
  return ok(JSON.stringify({data: {search: {issueCount: count}}}))
}

function pageResponse(
  numbers: number[],
  options: {hasNextPage?: boolean; endCursor?: string | null; owner?: string; repo?: string} = {},
): CommandResult {
  const owner = options.owner ?? 'marcusrbrown'
  const repo = options.repo ?? 'sparkle'
  return ok(
    JSON.stringify({
      data: {
        search: {
          pageInfo: {hasNextPage: options.hasNextPage ?? false, endCursor: options.endCursor ?? null},
          nodes: numbers.map(n => ({
            number: n,
            title: `pr ${n}`,
            body: 'b',
            mergedAt: '2026-01-01T00:00:00Z',
            url: `https://github.com/${owner}/${repo}/pull/${n}`,
            mergeCommit: {oid: `sha${n}`},
            files: {nodes: [], pageInfo: {hasNextPage: false, endCursor: null}},
          })),
        },
      },
    }),
  )
}

describe('acquireMergedPrSnapshot', () => {
  const owner = 'marcusrbrown'
  const repo = 'sparkle'
  const capturedAt = '2026-05-24T12:00:00Z'

  it('acquires the calendar-window PRs via a count-first call then a page call, applying the inclusive cutoff and excluding after-capturedAt/open PRs', async () => {
    const runCommand = makeRunner(argv => {
      expect(argv[0]).toBe('api')
      if (isCountQuery(argv)) return countResponse(1)
      return pageResponse([10])
    })

    const snapshot = await acquireMergedPrSnapshot({owner, repo, capturedAt}, runCommand)
    expect(snapshot.prs.map(pr => pr.number)).toEqual([10])
    expect(snapshot.provenance.owner).toBe(owner)
    expect(snapshot.provenance.repo).toBe(repo)
    expect(snapshot.provenance.capturedAt).toBe(capturedAt)
  })

  it('resolves an explicit owner/repo pull URL reference from a provided markdown source without a separate gh call', async () => {
    const prViewOutput = JSON.stringify({
      number: 999,
      state: 'MERGED',
      mergedAt: '2020-01-01T00:00:00Z',
      title: 'ancient decision',
      body: 'b',
      url: `https://github.com/${owner}/${repo}/pull/999`,
      mergeCommit: {oid: 'sha999'},
      files: [{path: 'z.ts'}],
    })

    const runCommand = makeRunner(argv => {
      if (isSearchCall(argv)) return isCountQuery(argv) ? countResponse(0) : pageResponse([])
      return ok(prViewOutput)
    })

    const snapshot = await acquireMergedPrSnapshot(
      {
        owner,
        repo,
        capturedAt,
        referenceCandidates: [
          {
            kind: 'markdown-source',
            path: 'docs/notes.md',
            text: `See https://github.com/${owner}/${repo}/pull/999 for background.`,
          },
        ],
      },
      runCommand,
    )

    expect(snapshot.prs.map(pr => pr.number)).toEqual([999])
  })

  it('excludes a bare #N reference when gh pr view reports it is not a merged PR (e.g. it is an issue)', async () => {
    const runCommand = makeRunner(argv => {
      if (isSearchCall(argv)) return isCountQuery(argv) ? countResponse(0) : pageResponse([])
      return {exitCode: 1, stdout: '', stderr: 'GraphQL: Could not resolve to a PullRequest'}
    })

    const snapshot = await acquireMergedPrSnapshot(
      {
        owner,
        repo,
        capturedAt,
        referenceCandidates: [{kind: 'markdown-source', path: 'docs/notes.md', text: 'Closed by #1006.'}],
      },
      runCommand,
    )

    expect(snapshot.prs).toEqual([])
  })

  it('dedups a PR that is both in the calendar window and explicitly referenced', async () => {
    const runCommand = makeRunner(argv => {
      if (isCountQuery(argv)) return countResponse(1)
      return pageResponse([10])
    })

    const snapshot = await acquireMergedPrSnapshot(
      {
        owner,
        repo,
        capturedAt,
        referenceCandidates: [
          {kind: 'markdown-source', path: 'docs/notes.md', text: `https://github.com/${owner}/${repo}/pull/10`},
        ],
      },
      runCommand,
    )

    expect(snapshot.prs.map(pr => pr.number)).toEqual([10])
  })

  it('uses the optional fixtureOverride instead of invoking gh at all, for test/dev use — never mandatory', async () => {
    const runCommand = makeRunner(() => {
      throw new Error('gh should not be invoked when fixtureOverride is provided')
    })

    const snapshot = await acquireMergedPrSnapshot(
      {
        owner,
        repo,
        capturedAt,
        fixtureOverride: [
          {
            number: 55,
            title: 't',
            body: 'b',
            mergedAt: '2026-01-01T00:00:00Z',
            url: `https://github.com/${owner}/${repo}/pull/55`,
            mergeCommitSha: 'sha55',
            files: ['f.ts'],
            filesTruncated: false,
          },
        ],
      },
      runCommand,
    )

    expect(snapshot.prs.map(pr => pr.number)).toEqual([55])
  })

  it('follows a real multi-page files-overflow response for a PR with more than 100 changed files', async () => {
    const bigPrPage = ok(
      JSON.stringify({
        data: {
          search: {
            pageInfo: {hasNextPage: false, endCursor: null},
            nodes: [
              {
                number: 20,
                title: 'big PR',
                body: 'b',
                mergedAt: '2026-01-01T00:00:00Z',
                url: `https://github.com/${owner}/${repo}/pull/20`,
                mergeCommit: {oid: 'sha20'},
                files: {nodes: [{path: 'a.ts'}], pageInfo: {hasNextPage: true, endCursor: 'PAGE2'}},
              },
            ],
          },
        },
      }),
    )
    const overflowPage = ok(
      JSON.stringify({
        data: {
          repository: {
            pullRequest: {files: {nodes: [{path: 'b.ts'}], pageInfo: {hasNextPage: false, endCursor: null}}},
          },
        },
      }),
    )

    const runCommand = makeRunner(argv => {
      if (isSearchCall(argv)) return isCountQuery(argv) ? countResponse(1) : bigPrPage
      return overflowPage
    })

    const snapshot = await acquireMergedPrSnapshot({owner, repo, capturedAt}, runCommand)
    expect(snapshot.prs[0]?.files).toEqual(['a.ts', 'b.ts'])
    expect(snapshot.prs[0]?.filesTruncated).toBe(false)
  })

  it('exposes filesTruncated=true on the returned PR when the files-overflow follow-up page itself fails, so a caller never publishes a falsely-complete file list', async () => {
    const bigPrPage = ok(
      JSON.stringify({
        data: {
          search: {
            pageInfo: {hasNextPage: false, endCursor: null},
            nodes: [
              {
                number: 21,
                title: 'another big PR',
                body: 'b',
                mergedAt: '2026-01-01T00:00:00Z',
                url: `https://github.com/${owner}/${repo}/pull/21`,
                mergeCommit: {oid: 'sha21'},
                files: {nodes: [{path: 'a.ts'}], pageInfo: {hasNextPage: true, endCursor: 'PAGE2'}},
              },
            ],
          },
        },
      }),
    )

    const runCommand = makeRunner(argv => {
      if (isSearchCall(argv)) return isCountQuery(argv) ? countResponse(1) : bigPrPage
      return {exitCode: 1, stdout: '', stderr: 'simulated follow-up page failure'}
    })

    const snapshot = await acquireMergedPrSnapshot({owner, repo, capturedAt}, runCommand)
    expect(snapshot.prs[0]?.filesTruncated).toBe(true)
  })

  it('returns a bounded, redacted error when gh reports an auth/rate-limit failure on the count query, never echoing raw stderr', async () => {
    const runCommand = makeRunner(() => ({
      exitCode: 1,
      stdout: '',
      stderr: 'error: authentication token abcd1234efgh5678 rejected, please run gh auth login',
    }))

    await expect(acquireMergedPrSnapshot({owner, repo, capturedAt}, runCommand)).rejects.toThrow(/gh (api|command)/i)
    try {
      await acquireMergedPrSnapshot({owner, repo, capturedAt}, runCommand)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      expect(message).not.toContain('abcd1234efgh5678')
      expect(message).not.toContain('authentication token')
    }
  })

  it('returns a bounded, redacted error when gh reports an auth/rate-limit failure on a page fetch (count succeeded), never echoing raw stderr', async () => {
    const runCommand = makeRunner(argv => {
      if (isCountQuery(argv)) return countResponse(1)
      return {exitCode: 1, stdout: '', stderr: 'error: authentication token abcd1234efgh5678 rejected'}
    })

    await expect(acquireMergedPrSnapshot({owner, repo, capturedAt}, runCommand)).rejects.toThrow(/gh (api|command)/i)
  })

  it('below-cap window spanning multiple real pages: fetches all pages sequentially via the cursor and returns the complete, deduplicated set', async () => {
    const runCommand = makeRunner(argv => {
      if (isCountQuery(argv)) return countResponse(3)
      const cursorField = argv.find(token => token.startsWith('endCursor='))
      if (cursorField === undefined) return pageResponse([1, 2], {hasNextPage: true, endCursor: 'PAGE2'})
      return pageResponse([3], {hasNextPage: false})
    })

    const snapshot = await acquireMergedPrSnapshot({owner, repo, capturedAt}, runCommand)
    expect(snapshot.prs.map(pr => pr.number).sort((a, b) => a - b)).toEqual([1, 2, 3])
  })
})

// ---------------------------------------------------------------------------
// Count-first adaptive date-window partitioning (replaces the prior
// bulk-fetch-then-check-count design, which downloaded an entire window's
// PR bodies/files via `--paginate --slurp` BEFORE ever checking the count —
// the actual cause of a real production timeout/oversized-buffer failure
// against ~1114 real PRs). Here, a cheap count-only query always runs
// first; a window is bisected by timestamp — BEFORE any rich data fetch —
// whenever its count is at/above the 1000-result cap. An under-cap leaf is
// then fetched one bounded page at a time (never an aggregate `--paginate`
// process). Recursion is strictly sequential (never `Promise.all`).
//
// The fake runner below routes each call by its REAL parsed search window
// (`extractWindow`) and real query kind (count vs page), so test setup maps
// exact production-computed window boundaries (via a mirrored, pure
// `computeWindowMidpointForTest`, matching the production bisection
// exactly) to canned responses — this both documents the exact recursion
// shape each test exercises and lets `calls` be asserted on directly rather
// than only inferred from call order.
// ---------------------------------------------------------------------------

function computeCutoffForTest(capturedAt: string): string {
  const cutoff = new Date(capturedAt)
  cutoff.setUTCMonth(cutoff.getUTCMonth() - 12)
  return cutoff.toISOString()
}

function computeWindowMidpointForTest(start: string, end: string): string | undefined {
  const startMs = new Date(start).getTime()
  const endMs = new Date(end).getTime()
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs - startMs < 2000) {
    return undefined
  }
  const midMs = startMs + Math.floor((endMs - startMs) / 2)
  const mid = new Date(midMs).toISOString().replace(/\.\d{3}Z$/, 'Z')
  return mid === start || mid === end ? undefined : mid
}

/** Same as `computeWindowMidpointForTest`, but throws on an unexpectedly-unsplittable window — a test-setup error, not a valid outcome for the fixed windows these tests use — rather than a bare non-null assertion. */
function requireWindowMidpointForTest(start: string, end: string): string {
  const mid = computeWindowMidpointForTest(start, end)
  if (mid === undefined) {
    throw new Error(`test setup error: window ${start}..${end} was expected to be splittable but was not`)
  }
  return mid
}

function extractWindow(argv: readonly string[]): {start: string; end: string} {
  const searchField = argv.find(token => token.startsWith('searchQuery='))
  if (searchField === undefined) {
    throw new Error('test double: expected a search call (count or page) but argv had no searchQuery= field')
  }
  const mergedClause = searchField.split('merged:')[1] ?? ''
  const [start, end] = mergedClause.split('..')
  if (start === undefined || end === undefined) {
    throw new Error(`test double: could not parse a merged:START..END window from searchQuery: ${searchField}`)
  }
  return {start, end}
}

function w(start: string, end: string): string {
  return `${start}..${end}`
}

type CountEntry = number | CommandResult

/** Routes each call by its real parsed search window + real query kind (count vs page), tracking per-window page-call sequence and every call made (for direct `calls` assertions). `defaultCount`, when set, answers any count query for a window not explicitly listed — used only by the unsplittable-dense-window test, where every recursion-depth window along the always-dense branch would otherwise need to be precomputed by hand. */
function makeWindowedRunner(
  counts: Map<string, CountEntry>,
  pages: Map<string, CommandResult[]>,
  options: {defaultCount?: number} = {},
): {runner: CommandRunner; calls: {kind: 'count' | 'page'; start: string; end: string}[]} {
  const pageIndex = new Map<string, number>()
  const calls: {kind: 'count' | 'page'; start: string; end: string}[] = []
  const runner: CommandRunner = vi.fn(async (argv: readonly string[]) => {
    const {start, end} = extractWindow(argv)
    const key = w(start, end)
    if (isCountQuery(argv)) {
      calls.push({kind: 'count', start, end})
      const entry = counts.get(key) ?? options.defaultCount
      if (entry === undefined) {
        throw new Error(`test double: no count configured for window ${key}`)
      }
      return typeof entry === 'number' ? countResponse(entry) : entry
    }
    calls.push({kind: 'page', start, end})
    const pageList = pages.get(key) ?? []
    const idx = pageIndex.get(key) ?? 0
    pageIndex.set(key, idx + 1)
    const page = pageList[idx]
    if (page === undefined) {
      throw new Error(`test double: no page[${idx}] configured for window ${key}`)
    }
    return page
  })
  return {runner, calls}
}

describe('acquireMergedPrSnapshot: count-first adaptive date-window partitioning at the 1000-result cap', () => {
  const owner = 'marcusrbrown'
  const repo = 'sparkle'
  const capturedAt = '2026-05-24T12:00:00Z'
  const cutoff = computeCutoffForTest(capturedAt)

  it('below the cap: one count call then one page call, no split — the full result set is returned', async () => {
    const {runner, calls} = makeWindowedRunner(
      new Map([[w(cutoff, capturedAt), 5]]),
      new Map([[w(cutoff, capturedAt), [pageResponse([1, 2, 3, 4, 5])]]]),
    )
    const snapshot = await acquireMergedPrSnapshot({owner, repo, capturedAt}, runner)
    expect(snapshot.prs.map(pr => pr.number).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5])
    expect(calls).toEqual([
      {kind: 'count', start: cutoff, end: capturedAt},
      {kind: 'page', start: cutoff, end: capturedAt},
    ])
  })

  it('a count of exactly zero returns an empty result immediately — no page call is ever made', async () => {
    const {runner, calls} = makeWindowedRunner(new Map([[w(cutoff, capturedAt), 0]]), new Map())
    const snapshot = await acquireMergedPrSnapshot({owner, repo, capturedAt}, runner)
    expect(snapshot.prs).toEqual([])
    expect(calls).toEqual([{kind: 'count', start: cutoff, end: capturedAt}])
  })

  it('exactly 999 (just under the cap) does not trigger a split — a single page fetch follows the count', async () => {
    const numbers = Array.from({length: 999}, (_, index) => index + 1)
    const {runner, calls} = makeWindowedRunner(
      new Map([[w(cutoff, capturedAt), 999]]),
      new Map([[w(cutoff, capturedAt), [pageResponse(numbers)]]]),
    )
    const snapshot = await acquireMergedPrSnapshot({owner, repo, capturedAt}, runner)
    expect(snapshot.prs).toHaveLength(999)
    expect(calls.filter(c => c.kind === 'page')).toHaveLength(1)
  })

  it('exactly 1000 (at the cap) splits BEFORE any rich fetch — the over-cap window gets only a count call, never a page call', async () => {
    const mid = requireWindowMidpointForTest(cutoff, capturedAt)
    const {runner, calls} = makeWindowedRunner(
      new Map([
        [w(cutoff, capturedAt), 1000],
        [w(cutoff, mid), 2],
        [w(mid, capturedAt), 2],
      ]),
      new Map([
        [w(cutoff, mid), [pageResponse([1, 2])]],
        [w(mid, capturedAt), [pageResponse([3, 4])]],
      ]),
    )
    const snapshot = await acquireMergedPrSnapshot({owner, repo, capturedAt}, runner)
    expect(snapshot.prs.map(pr => pr.number).sort((a, b) => a - b)).toEqual([1, 2, 3, 4])
    const fullWindowCalls = calls.filter(c => c.start === cutoff && c.end === capturedAt)
    expect(fullWindowCalls).toEqual([{kind: 'count', start: cutoff, end: capturedAt}])
  })

  it('an over-cap window (real count 1114) returns the complete, unique union after partitioning into two under-cap leaves', async () => {
    const mid = requireWindowMidpointForTest(cutoff, capturedAt)
    const leftNumbers = Array.from({length: 600}, (_, index) => index + 1) // 1..600
    const rightNumbers = Array.from({length: 514}, (_, index) => index + 601) // 601..1114
    const {runner, calls} = makeWindowedRunner(
      new Map([
        [w(cutoff, capturedAt), 1114],
        [w(cutoff, mid), 600],
        [w(mid, capturedAt), 514],
      ]),
      new Map([
        [w(cutoff, mid), [pageResponse(leftNumbers)]],
        [w(mid, capturedAt), [pageResponse(rightNumbers)]],
      ]),
    )
    const snapshot = await acquireMergedPrSnapshot({owner, repo, capturedAt}, runner)
    expect(snapshot.prs).toHaveLength(1114)
    expect(new Set(snapshot.prs.map(pr => pr.number)).size).toBe(1114)
    expect(calls).toHaveLength(5) // full count, left count, left page, right count, right page
  })

  it('a nested partition (a sub-window that itself hits the cap) recurses a second level and unions all leaves', async () => {
    const mid1 = requireWindowMidpointForTest(cutoff, capturedAt)
    const mid2 = requireWindowMidpointForTest(cutoff, mid1)
    const leftLeft = Array.from({length: 300}, (_, index) => index + 1) // 1..300
    const leftRight = Array.from({length: 250}, (_, index) => index + 301) // 301..550
    const right = Array.from({length: 400}, (_, index) => index + 551) // 551..950
    const {runner, calls} = makeWindowedRunner(
      new Map([
        [w(cutoff, capturedAt), 1000], // full: over cap -> split
        [w(cutoff, mid1), 1000], // left half: ALSO over cap -> split again
        [w(mid1, capturedAt), 400], // right half: under cap
        [w(cutoff, mid2), 300], // left-left
        [w(mid2, mid1), 250], // left-right
      ]),
      new Map([
        [w(mid1, capturedAt), [pageResponse(right)]],
        [w(cutoff, mid2), [pageResponse(leftLeft)]],
        [w(mid2, mid1), [pageResponse(leftRight)]],
      ]),
    )
    const snapshot = await acquireMergedPrSnapshot({owner, repo, capturedAt}, runner)
    expect(snapshot.prs).toHaveLength(950)
    expect(calls.filter(c => c.kind === 'count')).toHaveLength(5)
    expect(calls.filter(c => c.kind === 'page')).toHaveLength(3)
  })

  it('boundary-overlap duplicates (the same PR returned by both adjacent leaves) are deduplicated, not double-counted', async () => {
    const mid = requireWindowMidpointForTest(cutoff, capturedAt)
    const leftNumbers = Array.from({length: 500}, (_, index) => index + 1) // 1..500
    const rightNumbersWithOverlap = Array.from({length: 500}, (_, index) => index + 500) // 500..999 (500 overlaps)
    const {runner} = makeWindowedRunner(
      new Map([
        [w(cutoff, capturedAt), 1000],
        [w(cutoff, mid), 500],
        [w(mid, capturedAt), 500],
      ]),
      new Map([
        [w(cutoff, mid), [pageResponse(leftNumbers)]],
        [w(mid, capturedAt), [pageResponse(rightNumbersWithOverlap)]],
      ]),
    )
    const snapshot = await acquireMergedPrSnapshot({owner, repo, capturedAt}, runner)
    expect(snapshot.prs).toHaveLength(999) // 500 + 500 - 1 duplicate
    expect(snapshot.prs.filter(pr => pr.number === 500)).toHaveLength(1)
  })

  it('an unsplittable, maximally dense window (still at/above cap even at 1-second precision) fails clearly rather than looping or silently narrowing scope', async () => {
    // No explicit per-window counts: every window (regardless of size) reports 1114 via
    // `defaultCount`. Because the recursive walk is depth-first and strictly sequential, the
    // first ("left") branch is always explored fully — and always reports dense — so it bisects
    // all the way down to 1-second precision and fails there; the sibling ("right") branch is
    // never reached, so this terminates in O(log2(window seconds)) calls, not exponential blowup.
    const {runner} = makeWindowedRunner(new Map(), new Map(), {defaultCount: 1114})
    await expect(acquireMergedPrSnapshot({owner, repo, capturedAt}, runner)).rejects.toThrow(
      /cap|window|split|precision/i,
    )
  })

  it('a gh failure on the second half AFTER the first half already succeeded rejects the whole snapshot — never returns a partial result', async () => {
    const mid = requireWindowMidpointForTest(cutoff, capturedAt)
    const {runner} = makeWindowedRunner(
      new Map<string, CountEntry>([
        [w(cutoff, capturedAt), 1000],
        [w(cutoff, mid), 3],
        [w(mid, capturedAt), {exitCode: 1, stdout: '', stderr: 'simulated rate-limit failure on the second half'}],
      ]),
      new Map([[w(cutoff, mid), [pageResponse([1, 2, 3])]]]),
    )
    await expect(acquireMergedPrSnapshot({owner, repo, capturedAt}, runner)).rejects.toThrow(/gh (api|command)/i)
  })

  it('a count-query GraphQL errors array (even with a real exitCode 0) aborts the acquisition rather than silently treating it as zero PRs', async () => {
    const {runner} = makeWindowedRunner(
      new Map([[w(cutoff, capturedAt), ok(JSON.stringify({errors: [{message: 'rate limited'}]}))]]),
      new Map(),
    )
    await expect(acquireMergedPrSnapshot({owner, repo, capturedAt}, runner)).rejects.toThrow()
  })

  it('a leaf whose page-by-page fetch returns fewer unique PRs than its own count query reported fails clearly rather than claiming a complete result', async () => {
    const {runner} = makeWindowedRunner(
      new Map([[w(cutoff, capturedAt), 3]]), // count says 3
      new Map([[w(cutoff, capturedAt), [pageResponse([1, 2])]]]), // but only 2 unique PRs actually come back
    )
    await expect(acquireMergedPrSnapshot({owner, repo, capturedAt}, runner)).rejects.toThrow(/count|mismatch|complete/i)
  })

  it('a page reporting hasNextPage=true but no endCursor aborts rather than looping indefinitely with no way to request the next page', async () => {
    const {runner} = makeWindowedRunner(
      new Map([[w(cutoff, capturedAt), 5]]),
      new Map([[w(cutoff, capturedAt), [pageResponse([1, 2], {hasNextPage: true, endCursor: null})]]]),
    )
    await expect(acquireMergedPrSnapshot({owner, repo, capturedAt}, runner)).rejects.toThrow(/endCursor|next page/i)
  })

  it('a repeated, non-advancing pagination cursor aborts rather than looping indefinitely', async () => {
    const {runner} = makeWindowedRunner(
      new Map([[w(cutoff, capturedAt), 6]]),
      new Map([
        [
          w(cutoff, capturedAt),
          [
            pageResponse([1, 2], {hasNextPage: true, endCursor: 'STUCK'}),
            pageResponse([3, 4], {hasNextPage: true, endCursor: 'STUCK'}), // same cursor again — stuck
          ],
        ],
      ]),
    )
    await expect(acquireMergedPrSnapshot({owner, repo, capturedAt}, runner)).rejects.toThrow(/cursor/i)
  })

  it('every real search-call window (count and page) stays within the global [cutoff, capturedAt] bounds — partitioning never expands the search scope', async () => {
    const mid = requireWindowMidpointForTest(cutoff, capturedAt)
    const {runner, calls} = makeWindowedRunner(
      new Map([
        [w(cutoff, capturedAt), 1000],
        [w(cutoff, mid), 2],
        [w(mid, capturedAt), 2],
      ]),
      new Map([
        [w(cutoff, mid), [pageResponse([1, 2])]],
        [w(mid, capturedAt), [pageResponse([3, 4])]],
      ]),
    )

    await acquireMergedPrSnapshot({owner, repo, capturedAt}, runner)

    const cutoffMs = new Date(cutoff).getTime()
    const capturedAtMs = new Date(capturedAt).getTime()
    for (const call of calls) {
      expect(new Date(call.start).getTime()).toBeGreaterThanOrEqual(cutoffMs)
      expect(new Date(call.end).getTime()).toBeLessThanOrEqual(capturedAtMs)
    }
  })

  it('an older, explicitly referenced PR outside the calendar window is retained; one merged after capturedAt is excluded even if referenced', async () => {
    const staleMergedAt = '2020-01-01T00:00:00Z' // well before cutoff, but explicitly referenced
    const afterCapturedAt = '2027-01-01T00:00:00Z' // after the snapshot bound

    const {runner} = makeWindowedRunner(new Map([[w(cutoff, capturedAt), 0]]), new Map())

    const prViewResponses: Record<number, CommandResult> = {
      900: ok(
        JSON.stringify({
          number: 900,
          state: 'MERGED',
          mergedAt: staleMergedAt,
          title: 'old decision',
          body: 'b',
          url: `https://github.com/${owner}/${repo}/pull/900`,
          mergeCommit: {oid: 'sha900'},
          files: [],
        }),
      ),
      901: ok(
        JSON.stringify({
          number: 901,
          state: 'MERGED',
          mergedAt: afterCapturedAt,
          title: 'too-new decision',
          body: 'b',
          url: `https://github.com/${owner}/${repo}/pull/901`,
          mergeCommit: {oid: 'sha901'},
          files: [],
        }),
      ),
    }

    const combinedRunner: CommandRunner = async argv => {
      if (isSearchCall(argv)) return runner(argv)
      const numberArg = argv[2]
      const response = numberArg === '900' ? prViewResponses[900] : prViewResponses[901]
      if (response === undefined) throw new Error(`unexpected pr view number: ${numberArg}`)
      return response
    }

    const snapshot = await acquireMergedPrSnapshot(
      {
        owner,
        repo,
        capturedAt,
        referenceCandidates: [
          {kind: 'pr-number', number: 900},
          {kind: 'pr-number', number: 901},
        ],
      },
      combinedRunner,
    )

    expect(snapshot.prs.map(pr => pr.number)).toEqual([900])
  })
})
