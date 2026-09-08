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
  buildSearchMergedPrsGraphqlArgv,
  computePrMergeConfidence,
  extractPrReferenceCandidatesFromMarkdown,
  parseSearchGraphqlSlurpOutput,
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

describe('buildSearchMergedPrsGraphqlArgv', () => {
  it('builds a real gh api graphql --paginate --slurp argv array (never a shell string)', () => {
    const argv = buildSearchMergedPrsGraphqlArgv({
      owner: 'marcusrbrown',
      repo: 'sparkle',
      start: '2025-05-24',
      end: '2026-05-24',
    })
    expect(argv[0]).toBe('api')
    expect(argv[1]).toBe('graphql')
    expect(argv).toContain('--paginate')
    expect(argv).toContain('--slurp')
  })

  it('embeds the calendar-window search query as a bound field, not string-interpolated into the query text', () => {
    const argv = buildSearchMergedPrsGraphqlArgv({
      owner: 'marcusrbrown',
      repo: 'sparkle',
      start: '2025-05-24',
      end: '2026-05-24',
    })
    const searchFieldIndex = argv.indexOf('-f')
    expect(searchFieldIndex).toBeGreaterThanOrEqual(0)
    const searchFieldValues = argv.filter(token => token.startsWith('searchQuery='))
    expect(searchFieldValues).toHaveLength(1)
    expect(searchFieldValues[0]).toContain('repo:marcusrbrown/sparkle')
    expect(searchFieldValues[0]).toContain('is:pr')
    expect(searchFieldValues[0]).toContain('is:merged')
    expect(searchFieldValues[0]).toContain('merged:2025-05-24..2026-05-24')
  })

  it('the query field requests pageInfo and PullRequest fields needed downstream', () => {
    const argv = buildSearchMergedPrsGraphqlArgv({owner: 'a', repo: 'b', start: '2025-01-01', end: '2026-01-01'})
    const queryField = argv.find(token => token.startsWith('query='))
    expect(queryField).toBeDefined()
    expect(queryField).toContain('pageInfo')
    expect(queryField).toContain('hasNextPage')
    expect(queryField).toContain('endCursor')
    expect(queryField).toContain('mergedAt')
    expect(queryField).toContain('mergeCommit')
  })
})

describe('parseSearchGraphqlSlurpOutput', () => {
  const twoPageSlurp = JSON.stringify([
    {
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
    },
    {
      data: {
        search: {
          pageInfo: {hasNextPage: false, endCursor: null},
          nodes: [
            {
              number: 2,
              title: 'fix: second',
              body: 'body two',
              mergedAt: '2025-07-01T00:00:00Z',
              url: 'https://github.com/o/r/pull/2',
              mergeCommit: {oid: 'sha2'},
              files: {nodes: [{path: 'b.ts'}, {path: 'c.ts'}], pageInfo: {hasNextPage: false, endCursor: null}},
            },
          ],
        },
      },
    },
  ])

  it('flattens all slurped pages into a single PR list', () => {
    const parsed = parseSearchGraphqlSlurpOutput(twoPageSlurp)
    expect(parsed.map(pr => pr.number)).toEqual([1, 2])
  })

  it('extracts files, mergeCommit sha, and flags PRs whose files list is incomplete', () => {
    const parsed = parseSearchGraphqlSlurpOutput(twoPageSlurp)
    expect(parsed[0]?.files).toEqual(['a.ts'])
    expect(parsed[0]?.mergeCommitSha).toBe('sha1')
    expect(parsed[0]?.filesTruncated).toBe(false)
    expect(parsed[1]?.files).toEqual(['b.ts', 'c.ts'])
  })

  it('flags a PR whose files sub-list reports hasNextPage as truncated, for follow-up pagination', () => {
    const withOverflow = JSON.stringify([
      {
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
      },
    ])
    const parsed = parseSearchGraphqlSlurpOutput(withOverflow)
    expect(parsed[0]?.filesTruncated).toBe(true)
    expect(parsed[0]?.filesEndCursor).toBe('FILE_CURSOR')
  })

  it('throws on malformed JSON rather than silently returning a partial/empty result', () => {
    expect(() => parseSearchGraphqlSlurpOutput('not json')).toThrow()
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

describe('acquireMergedPrSnapshot', () => {
  const owner = 'marcusrbrown'
  const repo = 'sparkle'
  const capturedAt = '2026-05-24T12:00:00Z'

  it('acquires the calendar-window PRs via real gh argv, applying the inclusive cutoff and excluding after-capturedAt/open PRs', async () => {
    const searchOutput = JSON.stringify([
      {
        data: {
          search: {
            pageInfo: {hasNextPage: false, endCursor: null},
            nodes: [
              {
                number: 10,
                title: 'in window',
                body: 'b',
                mergedAt: '2026-01-01T00:00:00Z',
                url: `https://github.com/${owner}/${repo}/pull/10`,
                mergeCommit: {oid: 'sha10'},
                files: {nodes: [{path: 'x.ts'}], pageInfo: {hasNextPage: false, endCursor: null}},
              },
            ],
          },
        },
      },
    ])

    const runCommand = makeRunner(argv => {
      expect(argv[0]).toBe('api')
      return ok(searchOutput)
    })

    const snapshot = await acquireMergedPrSnapshot({owner, repo, capturedAt}, runCommand)
    expect(snapshot.prs.map(pr => pr.number)).toEqual([10])
    expect(snapshot.provenance.owner).toBe(owner)
    expect(snapshot.provenance.repo).toBe(repo)
    expect(snapshot.provenance.capturedAt).toBe(capturedAt)
  })

  it('resolves an explicit owner/repo pull URL reference from a provided markdown source without a separate gh call', async () => {
    const emptySearch = JSON.stringify([{data: {search: {pageInfo: {hasNextPage: false, endCursor: null}, nodes: []}}}])
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

    const runCommand = makeRunner(argv => (argv[0] === 'api' ? ok(emptySearch) : ok(prViewOutput)))

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
    const emptySearch = JSON.stringify([{data: {search: {pageInfo: {hasNextPage: false, endCursor: null}, nodes: []}}}])
    const runCommand = makeRunner(argv =>
      argv[0] === 'api'
        ? ok(emptySearch)
        : {exitCode: 1, stdout: '', stderr: 'GraphQL: Could not resolve to a PullRequest'},
    )

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
    const searchOutput = JSON.stringify([
      {
        data: {
          search: {
            pageInfo: {hasNextPage: false, endCursor: null},
            nodes: [
              {
                number: 10,
                title: 'in window',
                body: 'b',
                mergedAt: '2026-01-01T00:00:00Z',
                url: `https://github.com/${owner}/${repo}/pull/10`,
                mergeCommit: {oid: 'sha10'},
                files: {nodes: [{path: 'x.ts'}], pageInfo: {hasNextPage: false, endCursor: null}},
              },
            ],
          },
        },
      },
    ])
    const runCommand = makeRunner(() => ok(searchOutput))

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

  it("fails clearly rather than silently truncating when the calendar-window search hits GitHub search's 1000-result cap", async () => {
    const capacityPage = {
      data: {
        search: {
          pageInfo: {hasNextPage: false, endCursor: null},
          nodes: Array.from({length: 1000}, (_, index) => ({
            number: index + 1,
            title: 't',
            body: 'b',
            mergedAt: '2026-01-01T00:00:00Z',
            url: `https://github.com/${owner}/${repo}/pull/${index + 1}`,
            mergeCommit: {oid: `sha${index + 1}`},
            files: {nodes: [], pageInfo: {hasNextPage: false, endCursor: null}},
          })),
        },
      },
    }
    const runCommand = makeRunner(() => ok(JSON.stringify([capacityPage])))

    await expect(acquireMergedPrSnapshot({owner, repo, capturedAt}, runCommand)).rejects.toThrow(/1000|cap|window/i)
  })

  it('follows a real multi-page files-overflow response for a PR with more than 100 changed files', async () => {
    const searchOutput = JSON.stringify([
      {
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
      },
    ])
    const overflowPage = JSON.stringify({
      data: {
        repository: {pullRequest: {files: {nodes: [{path: 'b.ts'}], pageInfo: {hasNextPage: false, endCursor: null}}}},
      },
    })

    const runCommand = makeRunner(argv => {
      if (argv[0] === 'api' && argv.some(token => token.startsWith('searchQuery='))) {
        return ok(searchOutput)
      }
      return ok(overflowPage)
    })

    const snapshot = await acquireMergedPrSnapshot({owner, repo, capturedAt}, runCommand)
    expect(snapshot.prs[0]?.files).toEqual(['a.ts', 'b.ts'])
    expect(snapshot.prs[0]?.filesTruncated).toBe(false)
  })

  it('exposes filesTruncated=true on the returned PR when the files-overflow follow-up page itself fails, so a caller never publishes a falsely-complete file list', async () => {
    const searchOutputTruncated = JSON.stringify([
      {
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
      },
    ])
    const runCommand = makeRunner(argv => {
      if (argv[0] === 'api' && argv.some(token => token.startsWith('searchQuery='))) {
        return ok(searchOutputTruncated)
      }
      return {exitCode: 1, stdout: '', stderr: 'simulated follow-up page failure'}
    })

    const snapshot = await acquireMergedPrSnapshot({owner, repo, capturedAt}, runCommand)
    expect(snapshot.prs[0]?.filesTruncated).toBe(true)
  })

  it('returns a bounded, redacted error when gh reports an auth/rate-limit failure, never echoing raw stderr', async () => {
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
})
