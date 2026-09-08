/**
 * Tests for scripts/bootstrap-graph.ts.
 *
 * Test-first per unit's Execution note: parsers/classifier/normalizer/scanner are
 * written RED-first against this file, then given minimal implementations.
 */

import {standardAfterEach, standardBeforeEach} from '@sparkle/test-utils/lifecycle'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'

import {
  batchDepsCommits,
  buildGhPrListArgv,
  buildGitLogArgv,
  checkArtifactPreflight,
  classifyCommit,
  normalizePrBody,
  parseCliArgs,
  parseGitLogOutput,
  parsePrFixture,
  parseTriageReport,
  planFreshPromote,
  planRecoveryPromote,
  runCli,
  sanitizeCliOutput,
  scanPayloadForSecrets,
  scanTextForSecrets,
  selectEligiblePrs,
  validateEdgeRecordSchema,
  validateGitHistoryExportSchema,
  validateGraphExportSchema,
  validateNodeRecordSchema,
  validateTagRecordSchema,
  validateThemeRecordSchema,
} from './bootstrap-graph.js'

const SAMPLE_TRIAGE_MARKDOWN = `# Lane 5 \`.ai/\` Triage Report

## PROMOTE (4 — annotations on ARCHIVE entries below, not separate files)

1. \`.ai/docs/LESSONS_LEARNED.md\` — category **PATTERN**: "..."
2. \`.ai/security/localStorage-security-audit-2025-09-30.md\` — category **CONSTRAINTS**: "..."

## ARCHIVE (3)

| # | Path | Historical disposition | Resolves (2026-09-07) |
| --- | --- | --- | --- |
| 1 | \`.ai/plan/refactor-audit-improvements-1.md\` | Completed Oct 1 2025. | Revision clone. |
| 2 | \`.ai/docs/LESSONS_LEARNED.md\` | Historic writeup; also PROMOTE #1. | Primary checkout only (gitignored — see Availability note). |
| 3 | \`.ai/security/localStorage-security-audit-2025-09-30.md\` | Audit record; also PROMOTE #2. | Revision clone. |

## DELETE (1)

| # | Path | Historical disposition | Resolves (2026-09-07) |
| --- | --- | --- | --- |
| 1 | \`.ai/docs/prompts.md\` | Old Cursor prompt scaffolding. | Primary checkout only (gitignored — see Availability note). |
`

beforeEach(() => {
  standardBeforeEach()
})

afterEach(() => {
  standardAfterEach()
})

describe('scanTextForSecrets', () => {
  it('returns no matches for ordinary text', () => {
    expect(scanTextForSecrets('This commit fixes the theme token transformer.')).toEqual([])
  })

  it('detects a GitHub personal access token pattern without leaking the value', () => {
    const matches = scanTextForSecrets('token: ghp_1234567890abcdef1234567890abcdef1234')
    expect(matches).toHaveLength(1)
    expect(matches[0]?.rule).toBe('github-token')
    expect(JSON.stringify(matches)).not.toContain('ghp_1234567890abcdef1234567890abcdef1234')
  })

  it('detects a credentialed URL', () => {
    const matches = scanTextForSecrets('clone via https://user:hunter2@example.com/repo.git')
    expect(matches.some(m => m.rule === 'credentialed-url')).toBe(true)
  })

  it('detects an AWS-style access key', () => {
    const matches = scanTextForSecrets('AKIAIOSFODNN7EXAMPLE')
    expect(matches.some(m => m.rule === 'aws-access-key')).toBe(true)
  })

  it('detects a bearer/auth header', () => {
    const matches = scanTextForSecrets('Authorization: Bearer sk-abcdefghijklmnopqrstuvwx')
    expect(matches.some(m => m.rule === 'bearer-token')).toBe(true)
  })
})

describe('scanPayloadForSecrets', () => {
  it('scans every field of a nested object, not only top-level strings', () => {
    const payload = {
      description: 'clean text',
      nested: {
        note: 'token ghp_1234567890abcdef1234567890abcdef1234',
      },
    }
    const matches = scanPayloadForSecrets(payload)
    expect(matches).toHaveLength(1)
    expect(matches[0]?.path).toBe('nested.note')
    expect(matches[0]?.rule).toBe('github-token')
  })

  it('scans array entries and reports their index in the path', () => {
    const payload = {items: ['clean', 'AKIAIOSFODNN7EXAMPLE']}
    const matches = scanPayloadForSecrets(payload)
    expect(matches).toHaveLength(1)
    expect(matches[0]?.path).toBe('items[1]')
  })

  it('returns an empty array when nothing matches', () => {
    expect(scanPayloadForSecrets({a: 'b', c: [1, 2, {d: 'e'}]})).toEqual([])
  })
})

describe('parseTriageReport', () => {
  it('extracts every ARCHIVE-classified artifact with its path and disposition', () => {
    const artifacts = parseTriageReport(SAMPLE_TRIAGE_MARKDOWN)
    expect(artifacts).toHaveLength(3)
    expect(artifacts.map(a => a.path)).toEqual([
      '.ai/plan/refactor-audit-improvements-1.md',
      '.ai/docs/LESSONS_LEARNED.md',
      '.ai/security/localStorage-security-audit-2025-09-30.md',
    ])
  })

  it('marks artifacts referenced in the PROMOTE section as promoted', () => {
    const artifacts = parseTriageReport(SAMPLE_TRIAGE_MARKDOWN)
    const promoted = artifacts.filter(a => a.promoted).map(a => a.path)
    expect(promoted).toEqual(['.ai/docs/LESSONS_LEARNED.md', '.ai/security/localStorage-security-audit-2025-09-30.md'])
  })

  it('does not mark a non-PROMOTE artifact as promoted', () => {
    const artifacts = parseTriageReport(SAMPLE_TRIAGE_MARKDOWN)
    const refactorPlan = artifacts.find(a => a.path === '.ai/plan/refactor-audit-improvements-1.md')
    expect(refactorPlan?.promoted).toBe(false)
  })

  it('flags artifacts that only resolve in a primary checkout (gitignored in a fresh clone)', () => {
    const artifacts = parseTriageReport(SAMPLE_TRIAGE_MARKDOWN)
    const lessons = artifacts.find(a => a.path === '.ai/docs/LESSONS_LEARNED.md')
    const refactorPlan = artifacts.find(a => a.path === '.ai/plan/refactor-audit-improvements-1.md')
    expect(lessons?.requiresSourceRoot).toBe(true)
    expect(refactorPlan?.requiresSourceRoot).toBe(false)
  })

  it('does not include DELETE-classified artifacts', () => {
    const artifacts = parseTriageReport(SAMPLE_TRIAGE_MARKDOWN)
    expect(artifacts.some(a => a.path === '.ai/docs/prompts.md')).toBe(false)
  })

  it('carries the disposition text for each artifact', () => {
    const artifacts = parseTriageReport(SAMPLE_TRIAGE_MARKDOWN)
    const refactorPlan = artifacts.find(a => a.path === '.ai/plan/refactor-audit-improvements-1.md')
    expect(refactorPlan?.disposition).toBe('Completed Oct 1 2025.')
  })
})

describe('classifyCommit', () => {
  it('assigns the approved verified-merge confidence (80) only when the commit sha is in the caller-supplied verified-merge-PR set — parent-count alone is never proof', () => {
    const classified = classifyCommit(
      {sha: 'abc123', message: 'feat: add graph bootstrap', date: '2026-05-01T00:00:00Z', isPrMerge: true},
      new Set(['abc123']),
    )
    expect(classified.confidence).toBe(80)
  })

  it('assigns the approved fallback confidence (60) for a two-parent commit whose sha is NOT in the verified-merge set (e.g. a branch-sync merge, not a real gh-confirmed PR)', () => {
    const classified = classifyCommit(
      {sha: 'branch-sync-sha', message: 'merge: sync branches', date: '2026-05-01T00:00:00Z', isPrMerge: true},
      new Set(),
    )
    expect(classified.confidence).toBe(60)
  })

  it('assigns confidence 60 to a direct-to-main commit not in the verified-merge set', () => {
    const classified = classifyCommit(
      {sha: 'def456', message: 'fix: typo', date: '2026-05-01T00:00:00Z', isPrMerge: false},
      new Set(),
    )
    expect(classified.confidence).toBe(60)
  })

  it('flags a chore(deps) commit as a deps chore', () => {
    const classified = classifyCommit(
      {sha: 'ghi789', message: 'chore(deps): bump vitest to 4.1.10', date: '2026-05-01T00:00:00Z', isPrMerge: true},
      new Set(['ghi789']),
    )
    expect(classified.isDepsChore).toBe(true)
  })

  it('does not flag a non-deps commit as a deps chore', () => {
    const classified = classifyCommit(
      {sha: 'jkl012', message: 'feat: add Button variant', date: '2026-05-01T00:00:00Z', isPrMerge: true},
      new Set(['jkl012']),
    )
    expect(classified.isDepsChore).toBe(false)
  })

  it('preserves the sha, date, and message as the summary', () => {
    const classified = classifyCommit(
      {sha: 'mno345', message: 'refactor: simplify parser', date: '2026-05-01T00:00:00Z', isPrMerge: true},
      new Set(['mno345']),
    )
    expect(classified.sha).toBe('mno345')
    expect(classified.date).toBe('2026-05-01T00:00:00Z')
    expect(classified.summary).toBe('refactor: simplify parser')
  })
})

describe('batchDepsCommits', () => {
  it('returns undefined when there are no deps commits', () => {
    const commits = [
      classifyCommit({sha: 'a', message: 'feat: x', date: '2026-05-01T00:00:00Z', isPrMerge: true}, new Set(['a'])),
    ]
    expect(batchDepsCommits(commits, 'run-2026-05-24')).toBeUndefined()
  })

  it('batches every deps commit into a single observation node for the run window', () => {
    const commits = [
      classifyCommit(
        {sha: 'a', message: 'chore(deps): bump eslint', date: '2026-05-01T00:00:00Z', isPrMerge: true},
        new Set(['a']),
      ),
      classifyCommit({sha: 'b', message: 'feat: x', date: '2026-05-02T00:00:00Z', isPrMerge: true}, new Set(['b'])),
      classifyCommit(
        {sha: 'c', message: 'chore(deps): bump vitest', date: '2026-05-03T00:00:00Z', isPrMerge: true},
        new Set(['c']),
      ),
    ]
    const batch = batchDepsCommits(commits, 'run-2026-05-24')
    expect(batch?.runWindowId).toBe('run-2026-05-24')
    expect(batch?.commits.map(c => c.sha)).toEqual(['a', 'c'])
    expect(batch?.summary).toContain('2')
  })
})

describe('normalizePrBody', () => {
  it('produces a summary without the raw body text', () => {
    const pr = {
      number: 100,
      title: 'feat: add graph bootstrap',
      body: 'This PR adds the bootstrap script.\n\nCloses #99.\n\ntoken: ghp_1234567890abcdef1234567890abcdef1234',
      mergedAt: '2026-05-01T00:00:00Z',
      files: ['scripts/bootstrap-graph.ts'],
      mergeCommitSha: 'abc123',
    }
    const normalized = normalizePrBody(pr)
    expect(normalized.summary).not.toContain('ghp_1234567890abcdef1234567890abcdef1234')
    expect(normalized.summary).toContain('This PR adds the bootstrap script.')
  })

  it('defaults confidence to 75', () => {
    const pr = {number: 1, title: 't', body: 'b', mergedAt: '2026-05-01T00:00:00Z', files: [], mergeCommitSha: 'x'}
    expect(normalizePrBody(pr).confidence).toBe(75)
  })

  it('preserves number, title, files, and merge commit sha', () => {
    const pr = {
      number: 42,
      title: 'fix: bug',
      body: 'b',
      mergedAt: '2026-05-01T00:00:00Z',
      files: ['a.ts', 'b.ts'],
      mergeCommitSha: 'sha1',
    }
    const normalized = normalizePrBody(pr)
    expect(normalized.number).toBe(42)
    expect(normalized.title).toBe('fix: bug')
    expect(normalized.files).toEqual(['a.ts', 'b.ts'])
    expect(normalized.mergeCommitSha).toBe('sha1')
  })
})

describe('selectEligiblePrs', () => {
  const snapshot = '2026-05-24T12:00:00Z'
  const makePr = (number: number, mergedAt: string | undefined) => ({
    number,
    title: `pr-${number}`,
    body: 'body',
    mergedAt,
    files: [],
    mergeCommitSha: `sha-${number}`,
  })

  it('excludes a PR merged one day before the 12-calendar-month cutoff with no explicit reference', () => {
    const prs = [makePr(1, '2025-05-23T12:00:00Z')]
    expect(selectEligiblePrs(prs, snapshot, [])).toEqual([])
  })

  it('includes a PR merged exactly at the 12-calendar-month cutoff date (inclusive)', () => {
    const prs = [makePr(2, '2025-05-24T12:00:00Z')]
    expect(selectEligiblePrs(prs, snapshot, []).map(pr => pr.number)).toEqual([2])
  })

  it('excludes a PR merged after the snapshot timestamp', () => {
    const prs = [makePr(3, '2026-05-25T00:00:00Z')]
    expect(selectEligiblePrs(prs, snapshot, [])).toEqual([])
  })

  it('includes a PR merged exactly at the snapshot timestamp (inclusive upper bound)', () => {
    const prs = [makePr(4, snapshot)]
    expect(selectEligiblePrs(prs, snapshot, []).map(pr => pr.number)).toEqual([4])
  })

  it('includes an older merged PR explicitly referenced by an in-scope .ai/ artifact', () => {
    const prs = [makePr(5, '2020-01-01T00:00:00Z')]
    expect(selectEligiblePrs(prs, snapshot, [5]).map(pr => pr.number)).toEqual([5])
  })

  it('processes a PR that is both inside the window and explicitly referenced exactly once', () => {
    const prs = [makePr(6, '2026-01-01T00:00:00Z')]
    expect(selectEligiblePrs(prs, snapshot, [6]).map(pr => pr.number)).toEqual([6])
  })

  it('excludes an unmerged PR even if explicitly referenced', () => {
    const prs = [makePr(7, undefined)]
    expect(selectEligiblePrs(prs, snapshot, [7])).toEqual([])
  })
})

describe('checkArtifactPreflight', () => {
  const artifacts: {path: string; requiresSourceRoot: boolean}[] = [
    {path: '.ai/plan/refactor-audit-improvements-1.md', requiresSourceRoot: false},
    {path: '.ai/docs/LESSONS_LEARNED.md', requiresSourceRoot: true},
    {path: '.ai/docs/IMPLEMENTATION_CHANGELOG.md', requiresSourceRoot: true},
  ]

  it('passes when every artifact is readable from the working checkout or an available source root', () => {
    const available = new Set(artifacts.map(a => a.path))
    const result = checkArtifactPreflight(artifacts, available)
    expect(result.ok).toBe(true)
    expect(result.missing).toEqual([])
  })

  it('fails the whole run and names every missing artifact when one is missing', () => {
    const available = new Set(['.ai/plan/refactor-audit-improvements-1.md', '.ai/docs/LESSONS_LEARNED.md'])
    const result = checkArtifactPreflight(artifacts, available)
    expect(result.ok).toBe(false)
    expect(result.missing).toEqual(['.ai/docs/IMPLEMENTATION_CHANGELOG.md'])
  })

  it('fails naming source-root-required artifacts when --source-root is absent', () => {
    const available = new Set(['.ai/plan/refactor-audit-improvements-1.md'])
    const result = checkArtifactPreflight(artifacts, available)
    expect(result.ok).toBe(false)
    expect(result.missing).toEqual(['.ai/docs/LESSONS_LEARNED.md', '.ai/docs/IMPLEMENTATION_CHANGELOG.md'])
  })
})

describe('planFreshPromote', () => {
  it('proceeds and copies every staged file against an empty destination', () => {
    const plan = planFreshPromote(
      {syncRecordCount: 0, files: {}},
      {files: {'docs/public/graph-data.json': 'hash-a', '.deciduous/sync/nodes/1.json': 'hash-b'}},
    )
    expect(plan.kind).toBe('proceed')
    if (plan.kind === 'proceed') {
      expect(plan.filesToCopy.sort()).toEqual(['.deciduous/sync/nodes/1.json', 'docs/public/graph-data.json'])
    }
  })

  it('refuses when the destination sync store already has records', () => {
    const plan = planFreshPromote({syncRecordCount: 3, files: {}}, {files: {'docs/public/graph-data.json': 'hash-a'}})
    expect(plan.kind).toBe('refuse')
    if (plan.kind === 'refuse') {
      expect(plan.reason).toContain('records')
    }
  })

  it('refuses naming an already-present export file', () => {
    const plan = planFreshPromote(
      {syncRecordCount: 0, files: {'docs/public/graph-data.json': {hash: 'existing-hash', integrityValid: true}}},
      {files: {'docs/public/graph-data.json': 'hash-a'}},
    )
    expect(plan.kind).toBe('refuse')
    if (plan.kind === 'refuse') {
      expect(plan.present).toEqual(['docs/public/graph-data.json'])
    }
  })
})

describe('planRecoveryPromote', () => {
  it('accepts a byte-identical subset and copies only the remaining staged files', () => {
    const plan = planRecoveryPromote(
      {
        syncRecordCount: 1,
        files: {'.deciduous/sync/nodes/1.json': {hash: 'hash-a', integrityValid: true}},
      },
      {files: {'.deciduous/sync/nodes/1.json': 'hash-a', '.deciduous/sync/nodes/2.json': 'hash-b'}},
    )
    expect(plan.kind).toBe('proceed')
    if (plan.kind === 'proceed') {
      expect(plan.steps).toContainEqual({kind: 'skip-identical', path: '.deciduous/sync/nodes/1.json'})
      expect(plan.steps).toContainEqual({kind: 'copy-missing', path: '.deciduous/sync/nodes/2.json'})
    }
  })

  it('aborts on an unexpected destination file not in the staged inventory (new-record race)', () => {
    const plan = planRecoveryPromote(
      {syncRecordCount: 1, files: {'.deciduous/sync/nodes/99.json': {hash: 'hash-z', integrityValid: true}}},
      {files: {'.deciduous/sync/nodes/1.json': 'hash-a'}},
    )
    expect(plan.kind).toBe('abort')
    if (plan.kind === 'abort') {
      expect(plan.reason).toBe('unexpected-destination-file')
      expect(plan.path).toBe('.deciduous/sync/nodes/99.json')
    }
  })

  it('aborts when a destination file differs from the reviewed staged bytes', () => {
    const plan = planRecoveryPromote(
      {syncRecordCount: 1, files: {'.deciduous/sync/nodes/1.json': {hash: 'changed-hash', integrityValid: true}}},
      {files: {'.deciduous/sync/nodes/1.json': 'hash-a'}},
    )
    expect(plan.kind).toBe('abort')
    if (plan.kind === 'abort') {
      expect(plan.reason).toBe('changed-bytes')
      expect(plan.path).toBe('.deciduous/sync/nodes/1.json')
    }
  })

  it('aborts on a torn write (failed integrity check) before comparing hashes', () => {
    const plan = planRecoveryPromote(
      {syncRecordCount: 1, files: {'.deciduous/sync/nodes/1.json': {hash: 'hash-a', integrityValid: false}}},
      {files: {'.deciduous/sync/nodes/1.json': 'hash-a'}},
    )
    expect(plan.kind).toBe('abort')
    if (plan.kind === 'abort') {
      expect(plan.reason).toBe('torn-write')
      expect(plan.path).toBe('.deciduous/sync/nodes/1.json')
    }
  })
})

describe('buildGitLogArgv', () => {
  it('produces an argv array (never a shell string) walking full history from a single resolved ref', () => {
    const argv = buildGitLogArgv()
    expect(Array.isArray(argv)).toBe(true)
    expect(argv[0]).toBe('log')
    // No --all: history is read from one resolved ref (a pinned SHA in production), never every
    // ref in the repo, so a branch that moves after a snapshot is taken cannot change the result.
    expect(argv).not.toContain('--all')
    expect(argv).toContain('HEAD')
  })

  it('walks history from an explicitly provided ref/SHA instead of the default', () => {
    const argv = buildGitLogArgv('abc1234')
    expect(argv).toContain('abc1234')
    expect(argv).not.toContain('HEAD')
  })
})

describe('parseGitLogOutput', () => {
  it('parses a single-parent commit as direct-to-main (not a PR merge)', () => {
    const line = 'aaa111\u001Fbbb222\u001FMarcus\u001F2026-05-01T00:00:00-07:00\u001Ffeat: add thing'
    const commits = parseGitLogOutput(line)
    expect(commits).toHaveLength(1)
    expect(commits[0]).toMatchObject({sha: 'aaa111', message: 'feat: add thing', isPrMerge: false})
  })

  it('parses a two-parent commit as a PR merge', () => {
    const line = 'ccc333\u001Fbbb222 ddd444\u001FMarcus\u001F2026-05-01T00:00:00-07:00\u001FMerge pull request #1'
    const commits = parseGitLogOutput(line)
    expect(commits[0]?.isPrMerge).toBe(true)
  })

  it('parses multiple lines into multiple commits, preserving order', () => {
    const output = [
      'aaa111\u001Fbbb222\u001FMarcus\u001F2026-05-01T00:00:00-07:00\u001Ffirst',
      'ccc333\u001Faaa111\u001FMarcus\u001F2026-05-02T00:00:00-07:00\u001Fsecond',
    ].join('\n')
    const commits = parseGitLogOutput(output)
    expect(commits.map(c => c.sha)).toEqual(['aaa111', 'ccc333'])
  })
})

describe('buildGhPrListArgv', () => {
  it('produces an argv array requesting merged PRs with the fields the normalizer needs', () => {
    const argv = buildGhPrListArgv()
    expect(argv[0]).toBe('pr')
    expect(argv[1]).toBe('list')
    expect(argv).toContain('--json')
    const jsonFieldsIndex = argv.indexOf('--json')
    const fields = argv[jsonFieldsIndex + 1] ?? ''
    for (const field of ['number', 'title', 'body', 'mergedAt', 'files', 'mergeCommit']) {
      expect(fields).toContain(field)
    }
  })
})

describe('parsePrFixture', () => {
  it('parses a well-formed fixture body into PrInput records', () => {
    const fixture = JSON.stringify([
      {
        number: 1,
        title: 't',
        body: 'b',
        mergedAt: '2026-05-01T00:00:00Z',
        files: [{path: 'a.ts'}],
        mergeCommit: {oid: 'sha1'},
      },
    ])
    const prs = parsePrFixture(fixture)
    expect(prs).toEqual([
      {number: 1, title: 't', body: 'b', mergedAt: '2026-05-01T00:00:00Z', files: ['a.ts'], mergeCommitSha: 'sha1'},
    ])
  })

  it('represents an unmerged PR with mergedAt undefined', () => {
    const fixture = JSON.stringify([{number: 2, title: 't', body: 'b', mergedAt: null, files: [], mergeCommit: null}])
    const prs = parsePrFixture(fixture)
    expect(prs[0]?.mergedAt).toBeUndefined()
  })

  it('throws on a malformed fixture body rather than silently returning partial data', () => {
    expect(() => parsePrFixture('not json')).toThrow()
    expect(() => parsePrFixture(JSON.stringify([{number: 'not-a-number'}]))).toThrow()
  })
})

// Real schema samples captured 2026-09-07 against pinned deciduous v0.17.1 (scratch spike run).
const REAL_NODE_RECORD_SAMPLE = {
  author: 'Marcus R. Brown',
  change_id: '664f5f61-c9b9-406a-829f-b4878f65cd83',
  created_at: '2026-09-07T13:18:30.357080-07:00',
  description: 'test description',
  metadata: {branch: 'main'},
  node_type: 'goal',
  status: 'pending',
  title: 'Adopt Deciduous',
  updated_at: '2026-09-07T13:18:30.357080-07:00',
}

const REAL_EDGE_RECORD_SAMPLE = {
  author: 'Marcus R. Brown',
  created_at: '2026-09-07T13:18:30.514155-07:00',
  edge_id: '664b7c703d6e70717907',
  edge_type: 'leads_to',
  from_change_id: '664f5f61-c9b9-406a-829f-b4878f65cd83',
  rationale: 'because',
  to_change_id: '688303ba-fe7b-4df8-9a20-80398e399584',
  weight: 1,
}

const REAL_GRAPH_EXPORT_SAMPLE = {
  nodes: [
    {
      id: 1,
      change_id: '664f5f61-c9b9-406a-829f-b4878f65cd83',
      node_type: 'goal',
      title: 'Adopt Deciduous',
      description: 'test description',
      status: 'pending',
      created_at: '2026-09-07T13:18:30.357080-07:00',
      updated_at: '2026-09-07T13:18:30.357080-07:00',
      metadata_json: '{"branch":"main"}',
    },
  ],
  edges: [
    {
      id: 1,
      from_node_id: 1,
      to_node_id: 2,
      from_change_id: '664f5f61-c9b9-406a-829f-b4878f65cd83',
      to_change_id: '688303ba-fe7b-4df8-9a20-80398e399584',
      edge_type: 'leads_to',
      weight: 1,
      rationale: 'because',
      created_at: '2026-09-07T13:18:30.514155-07:00',
    },
  ],
}

const REAL_GIT_HISTORY_EXPORT_SAMPLE = [
  {
    hash: 'ebedca3a63e39b02b1937ae9b96b88455d48f0b3',
    short_hash: 'ebedca3',
    author: 't',
    date: '2026-09-07T13:18:30-07:00',
    message: 'initial commit',
    files_changed: 0,
  },
]

describe('validateNodeRecordSchema', () => {
  it('accepts a real captured node record', () => {
    expect(validateNodeRecordSchema(REAL_NODE_RECORD_SAMPLE).ok).toBe(true)
  })

  it('rejects a record missing change_id', () => {
    const {change_id: _drop, ...rest} = REAL_NODE_RECORD_SAMPLE
    const result = validateNodeRecordSchema(rest)
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain('change_id')
  })
})

describe('validateEdgeRecordSchema', () => {
  it('accepts a real captured edge record', () => {
    expect(validateEdgeRecordSchema(REAL_EDGE_RECORD_SAMPLE).ok).toBe(true)
  })

  it('rejects a record missing from_change_id', () => {
    const {from_change_id: _drop, ...rest} = REAL_EDGE_RECORD_SAMPLE
    expect(validateEdgeRecordSchema(rest).ok).toBe(false)
  })
})

describe('validateGraphExportSchema', () => {
  it('accepts a real captured graph-data.json export', () => {
    expect(validateGraphExportSchema(REAL_GRAPH_EXPORT_SAMPLE).ok).toBe(true)
  })

  it('rejects an export whose node is missing metadata_json', () => {
    const broken = {nodes: [{...REAL_GRAPH_EXPORT_SAMPLE.nodes[0], metadata_json: undefined}], edges: []}
    expect(validateGraphExportSchema(broken).ok).toBe(false)
  })
})

describe('validateGitHistoryExportSchema', () => {
  it('accepts a real captured git-history.json export', () => {
    expect(validateGitHistoryExportSchema(REAL_GIT_HISTORY_EXPORT_SAMPLE).ok).toBe(true)
  })

  it('rejects an entry missing files_changed', () => {
    const {files_changed: _drop, ...rest} = REAL_GIT_HISTORY_EXPORT_SAMPLE[0] ?? {}
    expect(validateGitHistoryExportSchema([rest]).ok).toBe(false)
  })
})

describe('parseCliArgs', () => {
  it('parses --help into a help request regardless of position', () => {
    expect(parseCliArgs(['--help']).kind).toBe('help')
    expect(parseCliArgs(['build', '--help']).kind).toBe('help')
    expect(parseCliArgs(['-h']).kind).toBe('help')
  })

  it('treats no arguments as an error requesting help, not a silent no-op', () => {
    const parsed = parseCliArgs([])
    expect(parsed.kind).toBe('error')
  })

  it('rejects an unknown command by name', () => {
    const parsed = parseCliArgs(['bogus-command'])
    expect(parsed.kind).toBe('error')
    if (parsed.kind === 'error') {
      expect(parsed.message).toContain('bogus-command')
    }
  })

  it('parses a well-formed build command with its required flags', () => {
    const parsed = parseCliArgs([
      'build',
      '--staging-dir',
      '/tmp/stage',
      '--repo',
      '/tmp/repo',
      '--triage',
      '/tmp/triage.md',
      '--pr-fixture',
      '/tmp/prs.json',
      '--snapshot',
      '2026-05-24T00:00:00Z',
      '--run-window',
      'w1',
    ])
    expect(parsed.kind).toBe('build')
    if (parsed.kind === 'build') {
      expect(parsed.stagingDir).toBe('/tmp/stage')
      expect(parsed.repo).toBe('/tmp/repo')
      expect(parsed.runWindowId).toBe('w1')
    }
  })

  it('rejects a build command missing a required flag, naming it', () => {
    const parsed = parseCliArgs(['build', '--staging-dir', '/tmp/stage'])
    expect(parsed.kind).toBe('error')
    if (parsed.kind === 'error') {
      expect(parsed.message).toContain('--repo')
    }
  })

  it('parses promote fresh and promote recovery with their required flags', () => {
    const fresh = parseCliArgs(['promote', 'fresh', '--staging-dir', '/tmp/stage', '--destination', '/tmp/dest'])
    expect(fresh.kind).toBe('promote-fresh')
    const recovery = parseCliArgs(['promote', 'recovery', '--staging-dir', '/tmp/stage', '--destination', '/tmp/dest'])
    expect(recovery.kind).toBe('promote-recovery')
  })

  it('rejects an unknown promote subcommand', () => {
    const parsed = parseCliArgs(['promote', 'bogus'])
    expect(parsed.kind).toBe('error')
  })
})

describe('SAFETY (D): sanitizeCliOutput never leaks a matched secret, and bounds output length', () => {
  it('passes clean, short text through unchanged', () => {
    expect(sanitizeCliOutput('build: staged 3 nodes')).toBe('build: staged 3 nodes')
  })

  it('redacts text containing a matched secret pattern rather than echoing it', () => {
    const output = sanitizeCliOutput('deciduous sync failed: token ghp_1234567890abcdef1234567890abcdef1234 rejected')
    expect(output).not.toContain('ghp_1234567890abcdef1234567890abcdef1234')
    expect(output).toContain('redacted')
  })

  it('truncates output past the bound rather than echoing an unbounded raw stack/stderr', () => {
    const output = sanitizeCliOutput('x'.repeat(5000), 100)
    expect(output.length).toBeLessThanOrEqual(120)
  })
})

describe('SAFETY (D): runCli never leaks a raw thrown error message unsanitized', () => {
  it('returns a bounded, non-throwing result (never propagates an uncaught error) for a missing --triage file', async () => {
    const result = await runCli([
      'build',
      '--staging-dir',
      '/tmp/does-not-need-to-exist-for-this-test',
      '--repo',
      '/tmp/does-not-need-to-exist-either',
      '--triage',
      '/tmp/definitely-does-not-exist-triage.md',
      '--pr-fixture',
      '/tmp/definitely-does-not-exist-prs.json',
      '--snapshot',
      '2026-05-24T00:00:00Z',
      '--run-window',
      'sanitize-test',
    ])
    expect(result.exitCode).toBe(1)
    expect(result.output).not.toContain('at runBuildStage') // no raw JS stack frame text
    expect(result.output.length).toBeLessThan(3000)
  })
})

// Real theme/tag record samples captured 2026-09-07 against pinned deciduous v0.17.1.
const REAL_THEME_RECORD_SAMPLE = {
  author: 'Marcus R. Brown',
  change_id: 'a41ef9a8-1d62-4773-96d5-5fbed03c00fd',
  color: '#ff0000',
  created_at: '2026-09-07T13:54:58.686196-07:00',
  name: 'risk',
  updated_at: '2026-09-07T13:54:58.686196-07:00',
}

const REAL_TAG_RECORD_SAMPLE = {
  author: 'Marcus R. Brown',
  created_at: '2026-09-07T13:55:09.684553-07:00',
  node_change_id: '2f180c4c-4e7a-4d4e-bf6f-1503b05b9f37',
  source: 'manual',
  theme_change_id: 'b718ee21-03ec-401d-8458-1c56771d11e8',
}

describe('validateThemeRecordSchema', () => {
  it('accepts a real captured theme record', () => {
    expect(validateThemeRecordSchema(REAL_THEME_RECORD_SAMPLE).ok).toBe(true)
  })

  it('rejects a record missing name', () => {
    const {name: _drop, ...rest} = REAL_THEME_RECORD_SAMPLE
    expect(validateThemeRecordSchema(rest).ok).toBe(false)
  })
})

describe('validateTagRecordSchema', () => {
  it('accepts a real captured tag record', () => {
    expect(validateTagRecordSchema(REAL_TAG_RECORD_SAMPLE).ok).toBe(true)
  })

  it('rejects a record missing theme_change_id', () => {
    const {theme_change_id: _drop, ...rest} = REAL_TAG_RECORD_SAMPLE
    expect(validateTagRecordSchema(rest).ok).toBe(false)
  })
})
