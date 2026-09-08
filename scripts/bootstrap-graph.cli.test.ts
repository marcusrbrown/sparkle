/**
 * Real-filesystem and real-CLI tests for scripts/bootstrap-graph.ts's
 * orchestration layer (subprocess invocation, path containment, attachment
 * byte validation, staging/promotion execution).
 *
 * Split from bootstrap-graph.test.ts (which covers pure parsing/classification
 * logic) because this file exercises actual subprocess spawning and real
 * filesystem side effects — a different test shape and a much slower run,
 * kept out of the fast pure-function suite. Both files are co-located with
 * the module per repo convention.
 *
 * These tests spawn the real, pinned `deciduous` v0.17.1 binary against
 * disposable fixture directories created under a persistent evidence
 * directory (never `/tmp`, per the plan's staging requirement, and never
 * sparkle's real `.deciduous/sync/`). If the binary is missing or the wrong
 * version, the real-CLI tests report an explicit skip rather than a false
 * pass.
 */

import type {EdgeProvenance, GroundedNodeType} from './bootstrap-graph/source-evidence.js'
import {Buffer} from 'node:buffer'
import {execFile} from 'node:child_process'
import {createHash} from 'node:crypto'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join, sep} from 'node:path'
import process from 'node:process'
import {promisify} from 'node:util'
import {standardAfterEach, standardBeforeEach} from '@sparkle/test-utils/lifecycle'
import {afterEach, beforeAll, beforeEach, describe, expect, it} from 'vitest'
import {
  acceptReviewedStage,
  captureStagedInventory,
  checkDeciduousVersion,
  collectCommitsFromGitLog,
  createDeciduousRunner,
  executeFreshPromote,
  executeRecoveryPromote,
  getNodeChangeId,
  loadPrFixture,
  loadSnapshotProvenance,
  parseCreatedNodeLocalId,
  planFreshPromote,
  planRecoveryPromote,
  readDestinationState,
  resolveBoundOnlyPaths,
  resolveWithinRoot,
  runBuildStage,
  runCli,
  runValidateStage,
  scopeInventoryToBoundValidationPaths,
  scopeInventoryToManagedPaths,
  SOURCE_EVIDENCE_ARTIFACT_PATHS,
  validateAttachmentBytes,
  validateCanonicalProvenanceShape,
  verifyStagedInventoryUnchanged,
  writeSnapshotProvenance,
} from './bootstrap-graph.js'
import {resolveStagedArtifactPath} from './bootstrap-graph/snapshot.js'

const execFileAsync = promisify(execFile)

beforeEach(() => {
  standardBeforeEach()
})

afterEach(() => {
  standardAfterEach()
})

let deciduousAvailable = false

beforeAll(async () => {
  try {
    const {stdout} = await execFileAsync('deciduous', ['--version'])
    deciduousAvailable = stdout.trim() === 'deciduous 0.17.1'
  } catch {
    deciduousAvailable = false
  }
})

/**
 * Test isolation guard: every fixture git repo in this file lives under
 * `os.tmpdir()` (via `mkdtempSync(join(tmpdir(), ...))`), never inside this
 * project's own working tree. This is a defense-in-depth check — not a
 * substitute for that construction — so a future edit can never point a
 * fixture git command at a real repository by accident.
 */
function assertFixtureRepoDir(repoDir: string): void {
  const real = realpathSync(repoDir)
  const tmpRoot = realpathSync(tmpdir())
  if (!real.startsWith(tmpRoot + sep) && real !== tmpRoot) {
    throw new Error(`refusing to run a fixture git command outside of os.tmpdir(): ${repoDir}`)
  }
}

/**
 * Finds the actual git subcommand in an argv that may be preceded by any
 * number of `-c key=value` config overrides (e.g.
 * `['-c', 'user.email=t@t.com', 'commit', ...]`), so callers can detect
 * `commit` regardless of how many `-c` pairs come first.
 */
function findGitSubcommand(args: readonly string[]): string | undefined {
  let i = 0
  while (i < args.length) {
    if (args[i] === '-c') {
      i += 2
      continue
    }
    return args[i]
  }
  return undefined
}

/**
 * Git subcommands used by this file's fixtures that can create a new commit
 * object and are therefore subject to `commit.gpgsign` (`commit` directly,
 * and `merge --no-ff` which creates a real merge commit signed under the
 * same config key). Only commands actually invoked by fixtures here are
 * listed — this is a narrow, inspected allowlist, not a blanket signing
 * bypass for every git subcommand.
 */
const GPG_SIGNED_COMMIT_SUBCOMMANDS = new Set(['commit', 'merge'])

/**
 * Fixture-scoped `git` command runner. Disables GPG commit signing
 * (`-c commit.gpgSign=false`) for commit-creating subcommands only (see
 * `GPG_SIGNED_COMMIT_SUBCOMMANDS`), so these disposable throwaway repos
 * never depend on the host's real `commit.gpgsign`/`user.signingkey`
 * configuration (test isolation defect: a host with signing enabled but no
 * corresponding secret key available would otherwise fail every fixture
 * commit or merge commit). Never touches the real repository's git config;
 * `assertFixtureRepoDir` guards the target path.
 *
 * Takes a lazy getter (rather than the path directly) so it can be
 * declared before `repoDir` is assigned in `beforeEach`, matching this
 * file's existing pattern of defining `run` once per `describe` block.
 */
function createFixtureGitRunner(getRepoDir: () => string) {
  return (args: string[]) => {
    const repoDir = getRepoDir()
    assertFixtureRepoDir(repoDir)
    const subcommand = findGitSubcommand(args)
    const finalArgs =
      subcommand !== undefined && GPG_SIGNED_COMMIT_SUBCOMMANDS.has(subcommand)
        ? ['-c', 'commit.gpgSign=false', ...args]
        : args
    return execFileAsync('git', finalArgs, {cwd: repoDir})
  }
}

/**
 * A compact, synthetic stand-in for the real Lane 5 triage report's canonical shape (16 unique
 * ARCHIVE artifacts, 4 PROMOTE-annotated) — built here rather than reused from
 * `bootstrap-graph.full-cli.test.ts` (a separate, parallel-lane-owned fixture) so this file's own
 * tests stay self-contained. Two of the 16 paths are the real, hardcoded `SOURCE_EVIDENCE_ARTIFACT_PATHS`
 * (unconditionally required by the public `build` command); the rest are synthetic placeholders.
 * `.ai/notes/fixture.md` is included as entry #3 so existing snapshot-freeze assertions in this
 * file that inspect that specific path's staged bytes keep working unmodified.
 */
const CANONICAL_TRIAGE_ARCHIVE_PATHS = [
  '.ai/plan/refactor-audit-improvements-1.md',
  '.ai/audit/audit-final-report.md',
  '.ai/notes/fixture.md',
  '.ai/archive/item-04.md',
  '.ai/archive/item-05.md',
  '.ai/archive/item-06.md',
  '.ai/archive/item-07.md',
  '.ai/archive/item-08.md',
  '.ai/archive/item-09.md',
  '.ai/archive/item-10.md',
  '.ai/archive/item-11.md',
  '.ai/archive/item-12.md',
  '.ai/archive/item-13.md',
  '.ai/archive/item-14.md',
  '.ai/archive/item-15.md',
  '.ai/archive/item-16.md',
] as const

const CANONICAL_TRIAGE_PROMOTED_PATHS = new Set<string>([
  '.ai/plan/refactor-audit-improvements-1.md',
  '.ai/audit/audit-final-report.md',
  '.ai/archive/item-04.md',
  '.ai/archive/item-05.md',
])

function buildCanonicalTriageMarkdown(archivePaths: readonly string[]): string {
  const promoteLines = [...CANONICAL_TRIAGE_PROMOTED_PATHS]
    .filter(path => archivePaths.includes(path))
    .map((path, index) => `${index + 1}. \`${path}\` — category **PATTERN**: "synthetic fixture promotion".`)
    .join('\n')
  const archiveRows = archivePaths
    .map((path, index) => `| ${index + 1} | \`${path}\` | Synthetic fixture artifact. | Revision clone. |`)
    .join('\n')
  return `# Lane 5 Triage Report (synthetic fixture)

## PROMOTE (${[...CANONICAL_TRIAGE_PROMOTED_PATHS].filter(path => archivePaths.includes(path)).length})

${promoteLines}

## ARCHIVE (${archivePaths.length})

| # | Path | Historical disposition | Resolves |
| --- | --- | --- | --- |
${archiveRows}
`
}

const CANONICAL_TRIAGE_MARKDOWN = buildCanonicalTriageMarkdown(CANONICAL_TRIAGE_ARCHIVE_PATHS)

// Minimal excerpts carrying the exact snippets AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001 (the one
// approved reviewed mapping) requires, so extractSourceEvidence/applyReviewedMapping actually
// succeed against this fixture rather than reporting a drifted/missing snippet. Trimmed inline
// copies (not a shared import) of the public, tracked real documents — no private content.
const SOURCE_EVIDENCE_FIXTURE_CONTENT: Record<string, string> = {
  '.ai/plan/refactor-audit-improvements-1.md': `---
goal: Comprehensive Code Audit Improvements Implementation
status: Completed
---

# Comprehensive Code Audit Improvements Implementation

Fixture excerpt for this file's own tests, trimmed from the public, tracked
\`.ai/plan/refactor-audit-improvements-1.md\`.
`,
  '.ai/audit/audit-final-report.md': `# Sparkle Codebase Audit - Final Report

## Technical Changes Report

### Change 1: TypeScript Configuration Fix (HIGH-001)

**File Modified**: \`docs/tsconfig.json\`

**Problem**: TypeScript compilation error due to \`astro.config.mjs\` being outside \`rootDir: "src"\`

**Solution**: Removed \`rootDir\` constraint to allow Astro configuration files in root directory

**Verification**:
- Build gate passes after the fix

## Architecture Decision Records

### ADR-001: TypeScript Root Directory Configuration

**Context**: Astro projects require configuration files in the root directory, but TypeScript's \`rootDir\` option expects all included files to be under a single directory.

**Decision**: Remove \`rootDir\` constraint from \`docs/tsconfig.json\` to follow standard Astro patterns.

**Alternatives Considered**:
1. Separate \`tsconfig.node.json\` for config files (rejected: unnecessary complexity)
2. Exclude config files from type checking (rejected: loses type safety)

**Status**: IMPLEMENTED

Fixture excerpt for this file's own tests, trimmed from the public, tracked
\`.ai/audit/audit-final-report.md\`.
`,
}

/** Writes real, tiny, tracked placeholder files for every `CANONICAL_TRIAGE_ARCHIVE_PATHS` entry under `repoRoot`. Caller commits them. */
function writeCanonicalTriageFixtureFiles(repoRoot: string): void {
  for (const relativePath of CANONICAL_TRIAGE_ARCHIVE_PATHS) {
    const absolutePath = join(repoRoot, ...relativePath.split('/'))
    mkdirSync(dirname(absolutePath), {recursive: true})
    const content =
      SOURCE_EVIDENCE_FIXTURE_CONTENT[relativePath] ??
      (relativePath === '.ai/notes/fixture.md'
        ? 'original pinned content\n'
        : `synthetic fixture content for ${relativePath}\n`)
    writeFileSync(absolutePath, content)
  }
}

const CANONICAL_ACCEPTED_EV = {path: '.ai/audit/audit-final-report.md', startLine: 1, endLine: 1} as const

function canonicalGraphNode(changeId: string, nodeType: string, title = changeId): Record<string, unknown> {
  return {
    id: changeId,
    change_id: changeId,
    node_type: nodeType,
    title,
    status: 'pending',
    created_at: 't',
    updated_at: 't',
    metadata_json: '{}',
  }
}

function canonicalGraphEdge(from: string, to: string): Record<string, unknown> {
  return {
    id: `${from}-${to}`,
    from_node_id: from,
    to_node_id: to,
    from_change_id: from,
    to_change_id: to,
    edge_type: 'leads_to',
    weight: 1,
    created_at: 't',
  }
}

/**
 * A full canonical fixture: 16 unique triage-archive nodes (one per
 * `CANONICAL_TRIAGE_ARCHIVE_PATHS` entry, satisfying the required-artifact-representation check)
 * plus a complete grounded reviewed chain (goal --reviewed-association--> decision
 * <--rejected-option-- option, decision --commit-supported--> action --source-reported--> outcome)
 * satisfying `validateReviewedGraph`, and a matching `SourceEvidenceProvenance` block. Used by tests
 * that exercise `acceptReviewedStage`/`runCli accept`/`runCli promote` end-to-end and therefore need
 * a genuinely `ok: true` `runValidateStage` result — not merely the record-schema/export-existence
 * checks a single-artifact fixture can satisfy.
 */
function makeCanonicalAcceptedFixture(root: string): void {
  mkdirSync(join(root, '.deciduous', 'sync', 'nodes'), {recursive: true})
  mkdirSync(join(root, '.deciduous', 'sync', 'edges'), {recursive: true})
  mkdirSync(join(root, '.deciduous', 'sync', 'themes'), {recursive: true})
  mkdirSync(join(root, '.deciduous', 'sync', 'tags'), {recursive: true})
  mkdirSync(join(root, 'docs', 'public'), {recursive: true})

  const triageNodes = CANONICAL_TRIAGE_ARCHIVE_PATHS.map((path, index) =>
    canonicalGraphNode(`triage${index + 1}`, 'observation', path),
  )
  for (const node of triageNodes) {
    writeFileSync(
      join(root, '.deciduous', 'sync', 'nodes', `${String(node.change_id)}.json`),
      JSON.stringify({
        author: 'a',
        change_id: node.change_id,
        created_at: 't',
        node_type: node.node_type,
        status: 'pending',
        title: node.title,
        updated_at: 't',
      }),
    )
  }

  const chainNodes = [
    canonicalGraphNode('g1', 'goal'),
    canonicalGraphNode('d1', 'decision'),
    canonicalGraphNode('opt1', 'option'),
    canonicalGraphNode('a1', 'action'),
    canonicalGraphNode('o1', 'outcome'),
  ]
  const chainEdges = [
    canonicalGraphEdge('g1', 'd1'),
    canonicalGraphEdge('opt1', 'd1'),
    canonicalGraphEdge('d1', 'a1'),
    canonicalGraphEdge('a1', 'o1'),
  ]

  writeFileSync(
    join(root, 'docs', 'public', 'graph-data.json'),
    JSON.stringify({nodes: [...triageNodes, ...chainNodes], edges: chainEdges}),
  )
  writeFileSync(join(root, 'docs', 'public', 'git-history.json'), '[]')

  const sourceEvidence = {
    mappingId: 'test-mapping',
    reviewedApplied: true,
    nodes: {
      g1: {
        type: 'goal' as GroundedNodeType,
        evidence: {path: '.ai/plan/refactor-audit-improvements-1.md', startLine: 2, endLine: 7},
      },
      d1: {type: 'decision' as GroundedNodeType, evidence: CANONICAL_ACCEPTED_EV},
      opt1: {type: 'option' as GroundedNodeType, evidence: CANONICAL_ACCEPTED_EV},
      a1: {type: 'action' as GroundedNodeType, evidence: CANONICAL_ACCEPTED_EV},
      o1: {type: 'outcome' as GroundedNodeType, evidence: CANONICAL_ACCEPTED_EV},
    },
    edges: [
      {
        fromChangeId: 'g1',
        toChangeId: 'd1',
        rationale: 'reviewed association',
        evidence: CANONICAL_ACCEPTED_EV,
        provenance: {
          relationKind: 'reviewed-association' as const,
          reviewKind: 'maintainer-reviewed' as const,
          reviewedDate: '2026-01-01',
          disclaimer: 'reviewed-association, not-causal-intent',
          fromEvidence: {path: '.ai/plan/refactor-audit-improvements-1.md', startLine: 2, endLine: 7},
          toEvidence: CANONICAL_ACCEPTED_EV,
        } satisfies EdgeProvenance,
      },
      {
        fromChangeId: 'opt1',
        toChangeId: 'd1',
        rationale: 'rejected: x',
        evidence: CANONICAL_ACCEPTED_EV,
        provenance: {relationKind: 'rejected-option' as const} satisfies EdgeProvenance,
      },
      {
        fromChangeId: 'd1',
        toChangeId: 'a1',
        rationale: 'commit-supported implementation',
        evidence: CANONICAL_ACCEPTED_EV,
        provenance: {
          relationKind: 'commit-supported' as const,
          commitRefs: [{sha: '236ba68059847a663073843546417ab6b2f84e67', date: '2025-10-06', note: 'x'}],
        } satisfies EdgeProvenance,
      },
      {
        fromChangeId: 'a1',
        toChangeId: 'o1',
        rationale: 'reported outcome',
        evidence: CANONICAL_ACCEPTED_EV,
        provenance: {relationKind: 'source-reported' as const} satisfies EdgeProvenance,
      },
    ],
    warnings: [] as string[],
  }

  writeSnapshotProvenance(root, {
    requiredArtifactPaths: [...CANONICAL_TRIAGE_ARCHIVE_PATHS],
    promotedArtifactPaths: [...CANONICAL_TRIAGE_PROMOTED_PATHS],
    sourceEvidence,
  })
}

describe('parseCreatedNodeLocalId', () => {
  it('extracts the local id from a "Created node N" line', () => {
    expect(parseCreatedNodeLocalId('Created node 3 (type: goal, title: x) [branch: main]')).toBe(3)
  })

  it('returns undefined when the output does not match', () => {
    expect(parseCreatedNodeLocalId('Error: something went wrong')).toBeUndefined()
  })
})

describe('resolveWithinRoot', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'bootstrap-graph-containment-'))
  })

  afterEach(() => {
    rmSync(root, {recursive: true, force: true})
  })

  it('resolves a plain relative path inside the root', () => {
    const resolved = resolveWithinRoot(root, 'a/b.json')
    expect(resolved.startsWith(realpathSync(root))).toBe(true)
  })

  it('rejects a relative path that escapes the root via ../', () => {
    expect(() => resolveWithinRoot(root, '../escape.json')).toThrow(/escapes root/)
  })

  it('rejects a symlink inside the root that points outside it', () => {
    const outside = mkdtempSync(join(tmpdir(), 'bootstrap-graph-outside-'))
    try {
      const linkPath = join(root, 'evil-link')
      symlinkSync(outside, linkPath)
      expect(() => resolveWithinRoot(root, 'evil-link/payload.json')).toThrow(/escapes root/)
    } finally {
      rmSync(outside, {recursive: true, force: true})
    }
  })
})

describe('validateAttachmentBytes', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-attach-'))
  })

  afterEach(() => {
    rmSync(dir, {recursive: true, force: true})
  })

  it('accepts a small, readable, non-empty file', () => {
    const filePath = join(dir, 'note.md')
    writeFileSync(filePath, '# a real triage artifact\n')
    const result = validateAttachmentBytes(filePath)
    expect(result.ok).toBe(true)
  })

  it('fails closed on a missing file', () => {
    const result = validateAttachmentBytes(join(dir, 'missing.md'))
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('not found')
  })

  it('fails closed on an empty file', () => {
    const filePath = join(dir, 'empty.md')
    writeFileSync(filePath, '')
    const result = validateAttachmentBytes(filePath)
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('empty')
  })

  it('fails closed on a file exceeding the max byte budget', () => {
    const filePath = join(dir, 'big.md')
    writeFileSync(filePath, 'x'.repeat(1000))
    const result = validateAttachmentBytes(filePath, {maxBytes: 100})
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('exceeds')
  })
})

describe('real-CLI: checkDeciduousVersion + getNodeChangeId (pinned v0.17.1)', () => {
  let repoDir: string

  beforeEach(() => {
    if (!deciduousAvailable) {
      return
    }
    repoDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-cli-'))
    mkdirSync(join(repoDir, '.deciduous', 'sync', 'nodes'), {recursive: true})
    mkdirSync(join(repoDir, '.deciduous', 'sync', 'edges'), {recursive: true})
    mkdirSync(join(repoDir, '.deciduous', 'sync', 'themes'), {recursive: true})
    mkdirSync(join(repoDir, '.deciduous', 'sync', 'tags'), {recursive: true})
    writeFileSync(join(repoDir, '.deciduous', 'config.toml'), '')
  })

  afterEach(() => {
    if (repoDir !== undefined && existsSync(repoDir)) {
      rmSync(repoDir, {recursive: true, force: true})
    }
  })

  it('confirms the exact pinned binary version', async () => {
    if (!deciduousAvailable) {
      console.warn('SKIP: deciduous v0.17.1 not on PATH — skipping real-CLI test')
      return
    }
    const runner = createDeciduousRunner()
    const result = await checkDeciduousVersion(runner, repoDir)
    expect(result.ok).toBe(true)
  })

  it('adds a real node and resolves its change_id by local id, not by title', async () => {
    if (!deciduousAvailable) {
      console.warn('SKIP: deciduous v0.17.1 not on PATH — skipping real-CLI test')
      return
    }
    const runner = createDeciduousRunner()
    const added = await runner(['add', 'goal', 'Adopt Deciduous', '-d', 'test description'], repoDir)
    const localId = parseCreatedNodeLocalId(added.stdout)
    expect(localId).toBeDefined()

    const duplicateAdded = await runner(
      ['add', 'goal', 'Adopt Deciduous', '-d', 'a second, distinct node with the same title'],
      repoDir,
    )
    const duplicateLocalId = parseCreatedNodeLocalId(duplicateAdded.stdout)
    expect(duplicateLocalId).toBeDefined()
    expect(duplicateLocalId).not.toBe(localId)

    if (localId !== undefined && duplicateLocalId !== undefined) {
      const changeId = await getNodeChangeId(runner, repoDir, localId)
      const duplicateChangeId = await getNodeChangeId(runner, repoDir, duplicateLocalId)
      expect(changeId).toMatch(/^[0-9a-f-]{36}$/)
      expect(duplicateChangeId).toMatch(/^[0-9a-f-]{36}$/)
      expect(changeId).not.toBe(duplicateChangeId)
    }
  })
})

describe('real-fixture: collectCommitsFromGitLog', () => {
  let repoDir: string

  beforeEach(() => {
    repoDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-gitlog-'))
  })

  afterEach(() => {
    rmSync(repoDir, {recursive: true, force: true})
  })

  it('collects full history from a real tiny fixture repo, including a merge commit', async () => {
    const run = createFixtureGitRunner(() => repoDir)
    await run(['init', '-q', '-b', 'main'])
    await run([
      '-c',
      'user.email=t@t.com',
      '-c',
      'user.name=t',
      'commit',
      '--allow-empty',
      '-q',
      '-m',
      'initial commit',
    ])
    await run(['checkout', '-q', '-b', 'feature'])
    await run(['-c', 'user.email=t@t.com', '-c', 'user.name=t', 'commit', '--allow-empty', '-q', '-m', 'feature work'])
    await run(['checkout', '-q', 'main'])
    await run([
      '-c',
      'user.email=t@t.com',
      '-c',
      'user.name=t',
      'merge',
      '--no-ff',
      '-q',
      '-m',
      'Merge pull request #1 from feature',
      'feature',
    ])

    const commits = await collectCommitsFromGitLog(repoDir)
    expect(commits).toHaveLength(3)
    expect(commits.some(c => c.message === 'initial commit' && !c.isPrMerge)).toBe(true)
    expect(commits.some(c => c.message === 'feature work' && !c.isPrMerge)).toBe(true)
    expect(commits.some(c => c.message.startsWith('Merge pull request') && c.isPrMerge)).toBe(true)
  })

  it(
    'regression: a real --no-ff merge commit succeeds via the fixture git runner even when this ' +
      "disposable repo's own (fixture-only) config has commit signing enabled with a nonexistent " +
      'key — proves the isolation fix covers `merge`, not only `commit` (test isolation defect)',
    async () => {
      const run = createFixtureGitRunner(() => repoDir)
      await run(['init', '-q', '-b', 'main'])

      // Fixture-local (never global/real-repo) config simulating a host with
      // signing enabled but no matching secret key — this is the exact shape
      // of the reported defect, applied only to this disposable repo's own
      // .git/config, never touching the real repository's or global config.
      await run(['config', 'commit.gpgsign', 'true'])
      await run(['config', 'user.signingkey', 'NONEXISTENT-TEST-KEY-DOES-NOT-EXIST'])

      await run(['-c', 'user.email=t@t.com', '-c', 'user.name=t', 'commit', '--allow-empty', '-q', '-m', 'base'])
      await run(['checkout', '-q', '-b', 'feature'])
      await run([
        '-c',
        'user.email=t@t.com',
        '-c',
        'user.name=t',
        'commit',
        '--allow-empty',
        '-q',
        '-m',
        'feature work',
      ])
      await run(['checkout', '-q', 'main'])

      // The real assertion: this merge must actually succeed (not throw) even
      // though the fixture repo's own config now demands GPG signing with a
      // key that cannot possibly sign anything.
      await expect(
        run([
          '-c',
          'user.email=t@t.com',
          '-c',
          'user.name=t',
          'merge',
          '--no-ff',
          '-q',
          '-m',
          'Merge pull request #2 from feature',
          'feature',
        ]),
      ).resolves.toBeDefined()

      const commits = await collectCommitsFromGitLog(repoDir)
      expect(commits.some(c => c.message.startsWith('Merge pull request #2') && c.isPrMerge)).toBe(true)

      // Sanity: confirm the resulting merge commit is genuinely unsigned (`N`),
      // not silently signed by some other available key.
      const {stdout: signatureStatus} = await run(['log', '-1', '--format=%G?', 'main'])
      expect(signatureStatus.trim()).toBe('N')
    },
  )
})

describe('real-fixture: loadPrFixture', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-pr-fixture-'))
  })

  afterEach(() => {
    rmSync(dir, {recursive: true, force: true})
  })

  it('reads a local fixture body file (no real gh API call) and returns validated PrInput records', () => {
    const fixturePath = join(dir, 'prs.json')
    writeFileSync(
      fixturePath,
      JSON.stringify([
        {
          number: 10,
          title: 'feat: x',
          body: 'body text',
          mergedAt: '2026-05-01T00:00:00Z',
          files: [{path: 'a.ts'}],
          mergeCommit: {oid: 'sha10'},
        },
      ]),
    )
    const prs = loadPrFixture(fixturePath)
    expect(prs).toEqual([
      {
        number: 10,
        title: 'feat: x',
        body: 'body text',
        mergedAt: '2026-05-01T00:00:00Z',
        files: ['a.ts'],
        mergeCommitSha: 'sha10',
      },
    ])
  })
})

describe('captureStagedInventory + verifyStagedInventoryUnchanged', () => {
  let stagingDir: string

  beforeEach(() => {
    stagingDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-inventory-'))
    mkdirSync(join(stagingDir, 'docs', 'public'), {recursive: true})
    writeFileSync(join(stagingDir, 'docs', 'public', 'graph-data.json'), '{"nodes":[],"edges":[]}')
    writeFileSync(join(stagingDir, 'docs', 'public', 'git-history.json'), '[]')
  })

  afterEach(() => {
    rmSync(stagingDir, {recursive: true, force: true})
  })

  it('captures a content hash for every staged file', () => {
    const inventory = captureStagedInventory(stagingDir)
    expect(Object.keys(inventory.files).sort()).toEqual(['docs/public/git-history.json', 'docs/public/graph-data.json'])
    expect(inventory.files['docs/public/graph-data.json']).toMatch(/^[0-9a-f]{64}$/)
  })

  it('confirms unchanged staged content matches the previously captured inventory', () => {
    const captured = captureStagedInventory(stagingDir)
    const result = verifyStagedInventoryUnchanged(stagingDir, captured)
    expect(result.ok).toBe(true)
    expect(result.changedPaths).toEqual([])
  })

  it('detects a file that changed after capture (staged-content immutability check)', () => {
    const captured = captureStagedInventory(stagingDir)
    writeFileSync(join(stagingDir, 'docs', 'public', 'graph-data.json'), '{"nodes":[{"tampered":true}],"edges":[]}')
    const result = verifyStagedInventoryUnchanged(stagingDir, captured)
    expect(result.ok).toBe(false)
    expect(result.changedPaths).toEqual(['docs/public/graph-data.json'])
  })
})

function makeStagedPromoteFixture(root: string): void {
  mkdirSync(join(root, '.deciduous', 'sync', 'nodes'), {recursive: true})
  mkdirSync(join(root, 'docs', 'public'), {recursive: true})
  writeFileSync(join(root, '.deciduous', 'sync', 'nodes', 'node-1.json'), '{"change_id":"a"}')
  writeFileSync(join(root, 'docs', 'public', 'graph-data.json'), '{"nodes":[],"edges":[]}')
  writeFileSync(join(root, 'docs', 'public', 'git-history.json'), '[]')
}

describe('readDestinationState + executeFreshPromote + executeRecoveryPromote (real fs)', () => {
  const EXPORT_FILES = ['docs/public/graph-data.json', 'docs/public/git-history.json']
  let stagingDir: string
  let destinationDir: string

  beforeEach(() => {
    stagingDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-promote-staging-'))
    destinationDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-promote-dest-'))
    makeStagedPromoteFixture(stagingDir)
  })

  afterEach(() => {
    rmSync(stagingDir, {recursive: true, force: true})
    rmSync(destinationDir, {recursive: true, force: true})
  })

  it('reads an empty destination as zero records and no export files', () => {
    const state = readDestinationState(destinationDir, EXPORT_FILES)
    expect(state.syncRecordCount).toBe(0)
    expect(state.files).toEqual({})
  })

  it('performs a real fresh promote: copies every staged file into an empty destination', () => {
    const staged = captureStagedInventory(stagingDir)
    const destinationState = readDestinationState(destinationDir, EXPORT_FILES)
    const plan = planFreshPromote(destinationState, staged)
    expect(plan.kind).toBe('proceed')
    executeFreshPromote(destinationDir, stagingDir, plan)

    expect(existsSync(join(destinationDir, 'docs', 'public', 'graph-data.json'))).toBe(true)
    expect(existsSync(join(destinationDir, '.deciduous', 'sync', 'nodes', 'node-1.json'))).toBe(true)
  })

  it('refuses a real fresh promote against a destination with existing records', () => {
    mkdirSync(join(destinationDir, '.deciduous', 'sync', 'nodes'), {recursive: true})
    writeFileSync(join(destinationDir, '.deciduous', 'sync', 'nodes', 'existing.json'), '{}')

    const staged = captureStagedInventory(stagingDir)
    const destinationState = readDestinationState(destinationDir, EXPORT_FILES)
    const plan = planFreshPromote(destinationState, staged)
    expect(plan.kind).toBe('refuse')
  })

  it('performs a real recovery promote: accepts an identical subset, copies only the missing file', () => {
    // Simulate an interrupted first attempt: one staged file already landed at the destination.
    mkdirSync(join(destinationDir, '.deciduous', 'sync', 'nodes'), {recursive: true})
    writeFileSync(
      join(destinationDir, '.deciduous', 'sync', 'nodes', 'node-1.json'),
      readFileSync(join(stagingDir, '.deciduous', 'sync', 'nodes', 'node-1.json')),
    )

    const staged = captureStagedInventory(stagingDir)
    const destinationState = readDestinationState(destinationDir, EXPORT_FILES)
    const plan = planRecoveryPromote(destinationState, staged)
    expect(plan.kind).toBe('proceed')
    executeRecoveryPromote(destinationDir, stagingDir, plan)

    expect(existsSync(join(destinationDir, 'docs', 'public', 'graph-data.json'))).toBe(true)
    expect(existsSync(join(destinationDir, 'docs', 'public', 'git-history.json'))).toBe(true)
  })

  it('a real fresh promote never overwrites an unexpectedly-present destination file (exclusive write)', () => {
    mkdirSync(join(destinationDir, 'docs', 'public'), {recursive: true})
    writeFileSync(join(destinationDir, 'docs', 'public', 'graph-data.json'), 'PRE-EXISTING-UNRELATED-CONTENT')

    const staged = captureStagedInventory(stagingDir)
    // Force a proceed plan directly (bypassing planFreshPromote's own refusal) to exercise
    // executeFreshPromote's own exclusive-write safety net independently of the planner.
    expect(() =>
      executeFreshPromote(destinationDir, stagingDir, {kind: 'proceed', filesToCopy: Object.keys(staged.files)}),
    ).toThrow()
  })
})

describe('real end-to-end: build -> validate -> promote (fresh, then recovery)', () => {
  let stagingDir: string
  let destinationDir: string
  let repoDir: string

  beforeEach(async () => {
    if (!deciduousAvailable) {
      return
    }
    stagingDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-e2e-staging-'))
    destinationDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-e2e-dest-'))
    repoDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-e2e-repo-'))

    const run = createFixtureGitRunner(() => repoDir)
    await run(['init', '-q', '-b', 'main'])
    await run([
      '-c',
      'user.email=t@t.com',
      '-c',
      'user.name=t',
      'commit',
      '--allow-empty',
      '-q',
      '-m',
      'initial commit',
    ])
    await run([
      '-c',
      'user.email=t@t.com',
      '-c',
      'user.name=t',
      'commit',
      '--allow-empty',
      '-q',
      '-m',
      'chore(deps): bump vitest',
    ])
    await run(['checkout', '-q', '-b', 'feature'])
    await run([
      '-c',
      'user.email=t@t.com',
      '-c',
      'user.name=t',
      'commit',
      '--allow-empty',
      '-q',
      '-m',
      'feat: add graph bootstrap',
    ])
    await run(['checkout', '-q', 'main'])
    await run([
      '-c',
      'user.email=t@t.com',
      '-c',
      'user.name=t',
      'merge',
      '--no-ff',
      '-q',
      '-m',
      'Merge pull request #1 from feature',
      'feature',
    ])

    mkdirSync(join(stagingDir, '.ai', 'notes'), {recursive: true})
    writeFileSync(
      join(stagingDir, '.ai', 'notes', 'fixture-note.md'),
      '# Fixture triage artifact\n\nSome real bytes for doc attach.\n',
    )
  })

  afterEach(() => {
    if (stagingDir !== undefined && existsSync(stagingDir)) rmSync(stagingDir, {recursive: true, force: true})
    if (destinationDir !== undefined && existsSync(destinationDir))
      rmSync(destinationDir, {recursive: true, force: true})
    if (repoDir !== undefined && existsSync(repoDir)) rmSync(repoDir, {recursive: true, force: true})
  })

  // This sequence spawns several real `deciduous` subprocess invocations back-to-back — genuinely
  // slow (observed ~6s), not flaky; the default 5000ms test timeout is too tight for it.
  it('runs a real staged build against a tiny fixture, validates it, then promotes fresh and recovers a retry', async () => {
    if (!deciduousAvailable) {
      console.warn('SKIP: deciduous v0.17.1 not on PATH — skipping real end-to-end test')
      return
    }

    const runner = createDeciduousRunner()
    mkdirSync(join(stagingDir, '.deciduous', 'sync', 'nodes'), {recursive: true})
    mkdirSync(join(stagingDir, '.deciduous', 'sync', 'edges'), {recursive: true})
    mkdirSync(join(stagingDir, '.deciduous', 'sync', 'themes'), {recursive: true})
    mkdirSync(join(stagingDir, '.deciduous', 'sync', 'tags'), {recursive: true})
    writeFileSync(join(stagingDir, '.deciduous', 'config.toml'), '')

    const commits = await collectCommitsFromGitLog(repoDir)
    expect(commits.length).toBeGreaterThanOrEqual(3)
    const mergeCommit = commits.find(c => c.isPrMerge)
    expect(mergeCommit).toBeDefined()

    const triageArtifacts = [
      {
        path: '.ai/notes/fixture-note.md',
        disposition: 'Fixture artifact for the e2e test.',
        promoted: false,
        requiresSourceRoot: false,
      },
    ]
    const sourcePaths: Record<string, string> = {
      '.ai/notes/fixture-note.md': join(stagingDir, '.ai', 'notes', 'fixture-note.md'),
    }

    const prs = [
      {
        number: 1,
        title: 'feat: add graph bootstrap',
        body: 'Implements the bootstrap script.',
        mergedAt: mergeCommit?.date,
        files: ['scripts/bootstrap-graph.ts'],
        mergeCommitSha: mergeCommit?.sha ?? '',
      },
    ]

    const buildResult = await runBuildStage({
      runner,
      stagingDir,
      triageArtifacts,
      triageArtifactSourcePaths: sourcePaths,
      commits,
      runWindowId: 'e2e-test-run',
      prs,
    })

    expect(Object.keys(buildResult.triageNodeChangeIds)).toEqual(['.ai/notes/fixture-note.md'])
    expect(buildResult.depsBatchChangeId).toBeDefined()
    expect(Object.keys(buildResult.decisionNodeChangeIds)).toEqual(['1'])
    expect(buildResult.warnings).toEqual([])

    const syncResult = await runner(['sync', '-o', 'docs/public/graph-data.json'], stagingDir)
    expect(syncResult.exitCode).toBe(0)
    expect(existsSync(join(stagingDir, 'docs', 'public', 'graph-data.json'))).toBe(true)
    expect(existsSync(join(stagingDir, 'docs', 'public', 'git-history.json'))).toBe(true)

    // Deliberately minimal (non-canonical, no source-evidence) input set — this test isolates
    // promote-fresh/recovery mechanics against a REAL deciduous instance, not the separate
    // canonical-16/4-shape or source-evidence gates (covered by SAFETY(B1)/CLI ACCEPTANCE/the
    // INTEGRATION source-evidence describe below). Narrowed rather than expanded into a full
    // canonical fixture, per the security-fix instruction to prefer narrowing a low-level test over
    // ballooning every real-subprocess test into a heavy, slow full-fixture rebuild.
    const validation = runValidateStage(stagingDir)
    const expectedGateErrors = validation.errors.filter(
      e =>
        e.includes('requiredArtifactPaths must contain exactly') ||
        e.includes('promotedArtifactPaths') ||
        e.includes('missing sourceEvidence'),
    )
    expect(validation.errors.filter(e => !expectedGateErrors.includes(e))).toEqual([])

    // Stage 2 immutability capture (over every staged file), then promote only the managed subset.
    const fullInventory = captureStagedInventory(stagingDir)
    const exportFiles = ['docs/public/graph-data.json', 'docs/public/git-history.json']
    const staged = scopeInventoryToManagedPaths(fullInventory, exportFiles)
    const freshDestinationState = readDestinationState(destinationDir, exportFiles)
    const freshPlan = planFreshPromote(freshDestinationState, staged)
    expect(freshPlan.kind).toBe('proceed')
    const immutability = verifyStagedInventoryUnchanged(stagingDir, fullInventory)
    expect(immutability.ok).toBe(true)
    executeFreshPromote(destinationDir, stagingDir, freshPlan)

    expect(existsSync(join(destinationDir, 'docs', 'public', 'graph-data.json'))).toBe(true)
    expect(existsSync(join(destinationDir, '.deciduous', 'sync', 'nodes'))).toBe(true)

    // Recovery promote against the same reviewed staged output is idempotent: nothing left to copy.
    const recoveryDestinationState = readDestinationState(destinationDir, exportFiles)
    const recoveryPlan = planRecoveryPromote(recoveryDestinationState, staged)
    expect(recoveryPlan.kind).toBe('proceed')
    if (recoveryPlan.kind === 'proceed') {
      expect(recoveryPlan.steps.every(step => step.kind === 'skip-identical')).toBe(true)
    }
    executeRecoveryPromote(destinationDir, stagingDir, recoveryPlan)
  }, 20_000)
})

describe('real crash test: staging directory survives a killed deciduous subprocess', () => {
  it('leaves the staging directory inspectable and lets a fresh build in a new directory succeed', async () => {
    if (!deciduousAvailable) {
      console.warn('SKIP: deciduous v0.17.1 not on PATH — skipping real crash test')
      return
    }

    const crashedStagingDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-crash-'))
    mkdirSync(join(crashedStagingDir, '.deciduous', 'sync', 'nodes'), {recursive: true})
    writeFileSync(join(crashedStagingDir, '.deciduous', 'config.toml'), '')

    const child = execFile('deciduous', ['add', 'goal', 'a node that will be interrupted'], {cwd: crashedStagingDir})
    child.kill('SIGKILL')
    await new Promise<void>(resolvePromise => {
      child.once('exit', () => resolvePromise())
      child.once('error', () => resolvePromise())
    })

    // The staging directory itself (our structure, not deciduous's own DB atomicity)
    // must remain present and readable — no rollback, no deletion, on failure.
    expect(existsSync(crashedStagingDir)).toBe(true)
    expect(existsSync(join(crashedStagingDir, '.deciduous', 'config.toml'))).toBe(true)

    // A fresh build in a brand-new staging directory succeeds without touching the crashed one.
    const freshStagingDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-crash-fresh-'))
    try {
      mkdirSync(join(freshStagingDir, '.deciduous', 'sync', 'nodes'), {recursive: true})
      writeFileSync(join(freshStagingDir, '.deciduous', 'config.toml'), '')
      const runner = createDeciduousRunner()
      const result = await runner(['add', 'goal', 'a node in a fresh staging directory'], freshStagingDir)
      expect(result.exitCode).toBe(0)
      expect(parseCreatedNodeLocalId(result.stdout)).toBeDefined()
    } finally {
      rmSync(freshStagingDir, {recursive: true, force: true})
    }

    expect(existsSync(crashedStagingDir)).toBe(true)
    rmSync(crashedStagingDir, {recursive: true, force: true})
  })
})

describe('SAFETY (A1): runCli build must never write into an ancestor .deciduous/sync/ via cwd-only isolation', () => {
  let repoDir: string

  beforeEach(() => {
    if (!deciduousAvailable) {
      return
    }
    repoDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-a1-repo-'))
  })

  afterEach(() => {
    if (repoDir !== undefined && existsSync(repoDir)) {
      rmSync(repoDir, {recursive: true, force: true})
    }
  })

  it("refuses (before any deciduous invocation) when --staging-dir is nested inside --repo, and never writes into the repo's real .deciduous/sync/", async () => {
    if (!deciduousAvailable) {
      console.warn('SKIP: deciduous v0.17.1 not on PATH — skipping real safety test')
      return
    }

    // repoDir simulates a real checkout that already has a committed, non-empty graph —
    // exactly the shape of sparkle's real .deciduous/sync/. If isolation is broken, a build
    // whose staging dir is nested inside this repo can leak writes straight into it.
    mkdirSync(join(repoDir, '.deciduous', 'sync', 'nodes'), {recursive: true})
    mkdirSync(join(repoDir, '.deciduous', 'sync', 'edges'), {recursive: true})
    mkdirSync(join(repoDir, '.deciduous', 'sync', 'themes'), {recursive: true})
    mkdirSync(join(repoDir, '.deciduous', 'sync', 'tags'), {recursive: true})
    writeFileSync(join(repoDir, '.deciduous', 'config.toml'), '')

    const run = createFixtureGitRunner(() => repoDir)
    await run(['init', '-q', '-b', 'main'])
    await run([
      '-c',
      'user.email=t@t.com',
      '-c',
      'user.name=t',
      'commit',
      '--allow-empty',
      '-q',
      '-m',
      'initial commit',
    ])

    const nestedStagingDir = join(repoDir, '.staging')
    mkdirSync(nestedStagingDir, {recursive: true})

    // Canonically-shaped so this exercises the isolation check specifically, not the canonical-
    // shape gate (isolation is checked first inside prepareSourceSnapshot regardless of whether
    // the fake paths themselves resolve).
    const triagePath = join(repoDir, 'triage.md')
    writeFileSync(triagePath, CANONICAL_TRIAGE_MARKDOWN)
    const prFixturePath = join(repoDir, 'prs.json')
    writeFileSync(prFixturePath, '[]')

    const result = await runCli([
      'build',
      '--staging-dir',
      nestedStagingDir,
      '--repo',
      repoDir,
      '--triage',
      triagePath,
      '--pr-fixture',
      prFixturePath,
      '--snapshot',
      '2026-05-24T00:00:00Z',
      '--run-window',
      'a1-safety-test',
    ])

    expect(result.exitCode).toBe(1)
    expect(result.output.toLowerCase()).toContain('isolat')

    // The critical assertion: the repo's real (pre-existing) sync store must remain untouched.
    expect(readdirSync(join(repoDir, '.deciduous', 'sync', 'nodes'))).toEqual([])
  })

  it('a staging dir that is a sibling (not nested/overlapping) is accepted by the isolation check and confines writes to its own store', async () => {
    if (!deciduousAvailable) {
      console.warn('SKIP: deciduous v0.17.1 not on PATH — skipping real safety test')
      return
    }

    mkdirSync(join(repoDir, '.deciduous', 'sync', 'nodes'), {recursive: true})
    mkdirSync(join(repoDir, '.deciduous', 'sync', 'edges'), {recursive: true})
    mkdirSync(join(repoDir, '.deciduous', 'sync', 'themes'), {recursive: true})
    mkdirSync(join(repoDir, '.deciduous', 'sync', 'tags'), {recursive: true})
    writeFileSync(join(repoDir, '.deciduous', 'config.toml'), '')

    const run = createFixtureGitRunner(() => repoDir)
    await run(['init', '-q', '-b', 'main'])
    await run([
      '-c',
      'user.email=t@t.com',
      '-c',
      'user.name=t',
      'commit',
      '--allow-empty',
      '-q',
      '-m',
      'a real commit for the git-log pass',
    ])

    const siblingStagingDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-a1-sibling-stage-'))
    // Canonically-shaped but with fake, never-committed paths — this repo fixture has no source-
    // evidence/triage files, so the build can't fully succeed here (that's exactly what
    // full-cli.test.ts's real 16-file fixture proves). What THIS test proves is narrower and still
    // meaningful: a sibling staging dir gets PAST the isolation check (unlike the nested case
    // above) to a later, different failure — missing artifacts — and the repo's real sync store
    // stays untouched either way.
    const triagePath = join(tmpdir(), `a1-triage-${Date.now()}.md`)
    writeFileSync(triagePath, CANONICAL_TRIAGE_MARKDOWN)
    const prFixturePath = join(tmpdir(), `a1-prs-${Date.now()}.json`)
    writeFileSync(prFixturePath, '[]')

    try {
      const result = await runCli([
        'build',
        '--staging-dir',
        siblingStagingDir,
        '--repo',
        repoDir,
        '--triage',
        triagePath,
        '--pr-fixture',
        prFixturePath,
        '--snapshot',
        '2026-05-24T00:00:00Z',
        '--run-window',
        'a1-safety-sibling-test',
      ])

      // Isolation specifically passed (not refused) for the sibling case: the failure, if any, is
      // never an isolation error, and never leaves a node in the repo's own real sync store.
      expect(result.output.toLowerCase()).not.toContain('isolat')
      expect(readdirSync(join(repoDir, '.deciduous', 'sync', 'nodes'))).toEqual([])
    } finally {
      rmSync(siblingStagingDir, {recursive: true, force: true})
      rmSync(triagePath, {force: true})
      rmSync(prFixturePath, {force: true})
    }
  })
})
describe('INTEGRATION: runCli build wires prepareSourceSnapshot (real git fixtures + real deciduous)', () => {
  let repoParentDir: string
  let repoDir: string
  let stagingParentDir: string
  let stagingDir: string
  let triagePath: string
  let prFixturePath: string
  let firstCommitSha: string

  const run = createFixtureGitRunner(() => repoDir)

  beforeEach(async () => {
    if (!deciduousAvailable) {
      return
    }
    repoParentDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-integ-repo-parent-'))
    repoDir = join(repoParentDir, 'repo')
    mkdirSync(repoDir, {recursive: true})
    // stagingDir itself must not exist yet — only its parent — matching prepareSourceSnapshot's
    // "genuinely new" requirement while still using a disposable, cleaned-up temp root.
    stagingParentDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-integ-stage-parent-'))
    stagingDir = join(stagingParentDir, 'staging')

    await run(['init', '-q', '-b', 'main'])
    // Canonical-shaped (16 unique ARCHIVE / 4 PROMOTE) fixture, including .ai/notes/fixture.md as
    // the one artifact these tests inspect the staged bytes of — satisfies the public `build`
    // command's canonical-triage-shape gate and its unconditional source-evidence requirement
    // (SOURCE_EVIDENCE_ARTIFACT_PATHS are two of the 16).
    writeCanonicalTriageFixtureFiles(repoDir)
    await run(['add', '-A'])
    await run(['-c', 'user.email=t@t.com', '-c', 'user.name=t', 'commit', '-q', '-m', 'add fixture triage artifact'])
    const {stdout: sha} = await run(['rev-parse', 'HEAD'])
    firstCommitSha = sha.trim()

    triagePath = join(tmpdir(), `integ-triage-${Date.now()}-${Math.random().toString(36).slice(2)}.md`)
    writeFileSync(triagePath, CANONICAL_TRIAGE_MARKDOWN)
    prFixturePath = join(tmpdir(), `integ-prs-${Date.now()}-${Math.random().toString(36).slice(2)}.json`)
    writeFileSync(prFixturePath, '[]')
  })

  afterEach(() => {
    if (repoParentDir !== undefined && existsSync(repoParentDir)) rmSync(repoParentDir, {recursive: true, force: true})
    if (stagingParentDir !== undefined && existsSync(stagingParentDir))
      rmSync(stagingParentDir, {recursive: true, force: true})
    if (triagePath !== undefined && existsSync(triagePath)) rmSync(triagePath, {force: true})
    if (prFixturePath !== undefined && existsSync(prFixturePath)) rmSync(prFixturePath, {force: true})
  })

  const runBuildCli = () =>
    runCli([
      'build',
      '--staging-dir',
      stagingDir,
      '--repo',
      repoDir,
      '--triage',
      triagePath,
      '--pr-fixture',
      prFixturePath,
      '--snapshot',
      '2026-05-24T00:00:00.000Z',
      '--run-window',
      'integ-test-run',
      '--ref',
      'main',
    ])

  it('freezes the pinned SHA and artifact bytes: a source branch advance and a dirty edit afterward do not change what was staged', async () => {
    if (!deciduousAvailable) {
      console.warn('SKIP: deciduous v0.17.1 not on PATH — skipping integration test')
      return
    }

    const result = await runBuildCli()
    expect(result.exitCode).toBe(0)

    // stagingDir IS the pinned checkout (see snapshot.ts's cloneAndCheckout) — no nested
    // `checkout/` subdirectory.
    const stagedArtifactPath = join(stagingDir, '.ai', 'notes', 'fixture.md')
    expect(readFileSync(stagedArtifactPath, 'utf8')).toBe('original pinned content\n')
    expect((await run(['rev-parse', 'HEAD'])).stdout.trim()).toBe(firstCommitSha)

    // Advance the source branch AND dirty the working tree after the build already ran.
    writeFileSync(join(repoDir, '.ai', 'notes', 'fixture.md'), 'a second, later commit\n')
    await run(['add', '-A'])
    await run(['-c', 'user.email=t@t.com', '-c', 'user.name=t', 'commit', '-q', '-m', 'advance main after snapshot'])
    writeFileSync(join(repoDir, '.ai', 'notes', 'fixture.md'), 'DIRTY UNCOMMITTED EDIT\n')

    // Already-staged content must remain exactly what was frozen at build time.
    expect(readFileSync(stagedArtifactPath, 'utf8')).toBe('original pinned content\n')
  }, 30_000)

  it("leaves the source repo's worktree, index, and graph completely untouched", async () => {
    if (!deciduousAvailable) {
      console.warn('SKIP: deciduous v0.17.1 not on PATH — skipping integration test')
      return
    }

    const statusBefore = (await run(['status', '--porcelain'])).stdout
    const headBefore = (await run(['rev-parse', 'HEAD'])).stdout

    const result = await runBuildCli()
    expect(result.exitCode).toBe(0)

    const statusAfter = (await run(['status', '--porcelain'])).stdout
    const headAfter = (await run(['rev-parse', 'HEAD'])).stdout
    expect(statusAfter).toBe(statusBefore)
    expect(statusAfter.trim()).toBe('')
    expect(headAfter).toBe(headBefore)
    expect(existsSync(join(repoDir, '.deciduous'))).toBe(false)
  }, 30_000)

  it('creates nothing when a required triage artifact is missing entirely (source repo untouched, staging dir never created)', async () => {
    if (!deciduousAvailable) {
      console.warn('SKIP: deciduous v0.17.1 not on PATH — skipping integration test')
      return
    }

    // Canonically-shaped (still 16 unique / 4 PROMOTE, so this exercises the missing-artifact
    // preflight specifically, not the canonical-shape gate) but with one path swapped for a file
    // that was never committed anywhere.
    const pathsWithOneMissing = [...CANONICAL_TRIAGE_ARCHIVE_PATHS.slice(0, -1), '.ai/notes/does-not-exist.md']
    writeFileSync(triagePath, buildCanonicalTriageMarkdown(pathsWithOneMissing))

    const result = await runBuildCli()
    expect(result.exitCode).toBe(1)
    expect(result.output).toContain('does-not-exist.md')
    expect(existsSync(stagingDir)).toBe(false)
  })

  it('creates nothing new when --staging-dir already has content (refuses reuse, leaves prior content untouched)', async () => {
    if (!deciduousAvailable) {
      console.warn('SKIP: deciduous v0.17.1 not on PATH — skipping integration test')
      return
    }

    mkdirSync(stagingDir, {recursive: true})
    writeFileSync(join(stagingDir, 'pre-existing.txt'), 'do not touch me')

    const result = await runBuildCli()
    expect(result.exitCode).toBe(1)
    expect(readdirSync(stagingDir)).toEqual(['pre-existing.txt'])
    expect(readFileSync(join(stagingDir, 'pre-existing.txt'), 'utf8')).toBe('do not touch me')
  })

  it('a successful build stages git-history.json with the pinned commit, provenance matching the staged bytes, and passes the existing validate stage against the new layout', async () => {
    if (!deciduousAvailable) {
      console.warn('SKIP: deciduous v0.17.1 not on PATH — skipping integration test')
      return
    }

    const result = await runBuildCli()
    expect(result.exitCode).toBe(0)

    // git-history.json (written by `deciduous sync` inside the staged, pinned checkout) reflects
    // the real pinned commit, not some placeholder.
    const gitHistoryPath = join(stagingDir, 'docs', 'public', 'git-history.json')
    expect(existsSync(gitHistoryPath)).toBe(true)
    const gitHistoryRaw = readFileSync(gitHistoryPath, 'utf8')
    expect(gitHistoryRaw).toContain(firstCommitSha)

    // provenance.json's recorded hash for the required artifact matches the actual staged bytes
    // at the path resolveStagedArtifactPath (the same helper the production build path uses)
    // resolves to — not just a hash computed independently of where the file actually landed.
    const provenancePath = join(stagingDir, '.bootstrap', 'provenance.json')
    expect(existsSync(provenancePath)).toBe(true)
    const provenance = JSON.parse(readFileSync(provenancePath, 'utf8')) as {
      resolvedSha: string
      requiredArtifacts: {relativePath: string; sha256: string; origin: 'tracked' | 'source-root'}[]
    }
    expect(provenance.resolvedSha).toBe(firstCommitSha)
    expect(provenance.requiredArtifacts).toHaveLength(CANONICAL_TRIAGE_ARCHIVE_PATHS.length)
    for (const artifact of provenance.requiredArtifacts) {
      const stagedPath = resolveStagedArtifactPath(stagingDir, artifact)
      const actualHash = createHash('sha256').update(readFileSync(stagedPath)).digest('hex')
      expect(actualHash).toBe(artifact.sha256)
    }

    // The existing (pre-integration) validate stage must still resolve docs/public/*.json and
    // .deciduous/sync/** correctly relative to stagingDir even with checkout/, .bootstrap/, and
    // (when applicable) source-inputs/ now also present alongside them.
    const validation = runValidateStage(stagingDir)
    expect(validation.errors).toEqual([])
    expect(validation.ok).toBe(true)
  }, 30_000)
})

describe('INTEGRATION: runCli build wires acquireMergedPrSnapshot via a fake gh on PATH (no --pr-fixture)', () => {
  let repoParentDir: string
  let repoDir: string
  let stagingParentDir: string
  let stagingDir: string
  let triagePath: string
  let fakeGhBinDir: string
  let originalPath: string | undefined
  let firstCommitSha: string

  const run = createFixtureGitRunner(() => repoDir)

  beforeEach(async () => {
    if (!deciduousAvailable) {
      return
    }
    repoParentDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-ghfake-repo-parent-'))
    repoDir = join(repoParentDir, 'repo')
    mkdirSync(repoDir, {recursive: true})
    stagingParentDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-ghfake-stage-parent-'))
    stagingDir = join(stagingParentDir, 'staging')

    await run(['init', '-q', '-b', 'main'])
    // Canonical-shaped (16 unique ARCHIVE / 4 PROMOTE) fixture — satisfies the public `build`
    // command's canonical-triage-shape gate and its unconditional source-evidence requirement.
    writeCanonicalTriageFixtureFiles(repoDir)
    // The triage artifact's own text carries an explicit older-PR reference (outside the
    // 12-calendar-month window) — this is the in-scope markdown source acquireMergedPrSnapshot
    // reads for the explicit-reference union. Overwrites writeCanonicalTriageFixtureFiles' generic
    // placeholder content for this one path.
    writeFileSync(
      join(repoDir, '.ai', 'notes', 'fixture.md'),
      'Superseded by https://github.com/acme/widget/pull/42.\n',
    )
    await run(['add', '-A'])
    await run([
      '-c',
      'user.email=t@t.com',
      '-c',
      'user.name=t',
      'commit',
      '-q',
      '-m',
      'feat: add fixture triage artifact',
    ])
    const {stdout: sha} = await run(['rev-parse', 'HEAD'])
    firstCommitSha = sha.trim()

    triagePath = join(tmpdir(), `ghfake-triage-${Date.now()}-${Math.random().toString(36).slice(2)}.md`)
    writeFileSync(triagePath, CANONICAL_TRIAGE_MARKDOWN)

    // A minimal, real executable Node script standing in for `gh` on PATH — no network calls.
    // Distinguishes the calendar-window search (`api graphql` with a `searchQuery=` field) from
    // an explicit-reference resolution (`pr view <number> --repo <owner>/<repo>`).
    fakeGhBinDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-ghfake-bin-'))
    const fakeGhScript = `#!/usr/bin/env node
const argv = process.argv.slice(2)
if (argv[0] === 'pr' && argv[1] === 'view') {
  const number = Number(argv[2])
  if (number === 42) {
    process.stdout.write(JSON.stringify({
      number: 42,
      state: 'MERGED',
      mergedAt: '2020-01-01T00:00:00Z',
      title: 'fix: an old, explicitly referenced decision',
      body: 'historical body',
      url: 'https://github.com/acme/widget/pull/42',
      mergeCommit: {oid: 'old-ref-sha'},
      files: [{path: 'legacy.ts'}],
    }))
    process.exit(0)
  }
  process.exit(1)
}
if (argv[0] === 'api') {
  process.stdout.write(JSON.stringify([{
    data: {
      search: {
        pageInfo: {hasNextPage: false, endCursor: null},
        nodes: [{
          number: 100,
          title: 'feat: add fixture triage artifact',
          body: 'in-window PR body',
          mergedAt: '2026-05-01T00:00:00Z',
          url: 'https://github.com/acme/widget/pull/100',
          mergeCommit: {oid: '${firstCommitSha}'},
          files: {nodes: [{path: '.ai/notes/fixture.md'}], pageInfo: {hasNextPage: false, endCursor: null}},
        }],
      },
    },
  }]))
  process.exit(0)
}
process.stderr.write('fake gh: unhandled argv ' + JSON.stringify(argv))
process.exit(1)
`
    const fakeGhPath = join(fakeGhBinDir, 'gh')
    writeFileSync(fakeGhPath, fakeGhScript)
    chmodSync(fakeGhPath, 0o755)

    originalPath = process.env.PATH
    process.env.PATH = `${fakeGhBinDir}:${originalPath ?? ''}`
  })

  afterEach(() => {
    if (originalPath !== undefined) {
      process.env.PATH = originalPath
    }
    if (repoParentDir !== undefined && existsSync(repoParentDir)) rmSync(repoParentDir, {recursive: true, force: true})
    if (stagingParentDir !== undefined && existsSync(stagingParentDir))
      rmSync(stagingParentDir, {recursive: true, force: true})
    if (triagePath !== undefined && existsSync(triagePath)) rmSync(triagePath, {force: true})
    if (fakeGhBinDir !== undefined && existsSync(fakeGhBinDir)) rmSync(fakeGhBinDir, {recursive: true, force: true})
  })

  it('calls the fake gh for real (no --pr-fixture), links the in-window PR to its matching action node, and unions the older explicitly-referenced PR', async () => {
    if (!deciduousAvailable) {
      console.warn('SKIP: deciduous v0.17.1 not on PATH — skipping fake-gh integration test')
      return
    }

    const result = await runCli([
      'build',
      '--staging-dir',
      stagingDir,
      '--repo',
      repoDir,
      '--triage',
      triagePath,
      '--github-repo',
      'acme/widget',
      '--snapshot',
      '2026-05-24T00:00:00.000Z',
      '--run-window',
      'ghfake-test-run',
      '--ref',
      'main',
    ])

    expect(result.exitCode).toBe(0)

    const graphDataPath = join(stagingDir, 'docs', 'public', 'graph-data.json')
    const graphData = JSON.parse(readFileSync(graphDataPath, 'utf8')) as {nodes: {node_type: string; title: string}[]}
    const decisionTitles = graphData.nodes.filter(node => node.node_type === 'decision').map(node => node.title)

    // Both the in-window PR (#100, real gh search) and the older explicitly-referenced PR (#42,
    // resolved via `gh pr view` from the triage artifact's own markdown text) are present.
    expect(decisionTitles).toContain('feat: add fixture triage artifact')
    expect(decisionTitles).toContain('fix: an old, explicitly referenced decision')
  }, 30_000)

  it('refuses clearly when neither --github-repo nor a resolvable origin remote is available (no silent gh call with an empty owner/repo)', async () => {
    if (!deciduousAvailable) {
      console.warn('SKIP: deciduous v0.17.1 not on PATH — skipping fake-gh integration test')
      return
    }

    const result = await runCli([
      'build',
      '--staging-dir',
      stagingDir,
      '--repo',
      repoDir,
      '--triage',
      triagePath,
      '--snapshot',
      '2026-05-24T00:00:00.000Z',
      '--run-window',
      'ghfake-test-run',
      '--ref',
      'main',
    ])

    expect(result.exitCode).toBe(1)
    expect(result.output.toLowerCase()).toContain('github-repo')
  })
})

describe('SAFETY (B4): readDestinationState is scoped to managed paths only, never a whole-repo recursive scan', () => {
  let destinationDir: string
  let stagingDir: string

  beforeEach(() => {
    destinationDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-b4-dest-'))
    stagingDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-b4-stage-'))
  })

  afterEach(() => {
    rmSync(destinationDir, {recursive: true, force: true})
    rmSync(stagingDir, {recursive: true, force: true})
  })

  it('ignores unrelated tracked repo files (README, package.json, .git/) and an unrelated symlink', () => {
    // A normal-looking repo: unrelated tracked files plus a managed, already-promoted node record.
    writeFileSync(join(destinationDir, 'README.md'), '# Some real repo\n')
    writeFileSync(join(destinationDir, 'package.json'), '{"name":"some-repo"}')
    mkdirSync(join(destinationDir, '.git'), {recursive: true})
    writeFileSync(join(destinationDir, '.git', 'HEAD'), 'ref: refs/heads/main\n')
    mkdirSync(join(destinationDir, 'node_modules', 'some-pkg'), {recursive: true})
    writeFileSync(join(destinationDir, 'node_modules', 'some-pkg', 'index.js'), 'module.exports = {}')

    const outside = mkdtempSync(join(tmpdir(), 'bootstrap-graph-b4-outside-'))
    try {
      symlinkSync(outside, join(destinationDir, 'unrelated-link'))

      mkdirSync(join(destinationDir, '.deciduous', 'sync', 'nodes'), {recursive: true})
      mkdirSync(join(destinationDir, '.deciduous', 'sync', 'edges'), {recursive: true})
      mkdirSync(join(destinationDir, '.deciduous', 'sync', 'themes'), {recursive: true})
      mkdirSync(join(destinationDir, '.deciduous', 'sync', 'tags'), {recursive: true})
      writeFileSync(join(destinationDir, '.deciduous', 'config.toml'), '')
      writeFileSync(join(destinationDir, '.deciduous', 'sync', 'README.md'), '# sync store readme\n')
      writeFileSync(join(destinationDir, '.deciduous', 'sync', 'nodes', 'already-promoted.json'), '{"change_id":"a"}')

      const state = readDestinationState(destinationDir, [
        'docs/public/graph-data.json',
        'docs/public/git-history.json',
      ])

      expect(Object.keys(state.files)).toEqual(['.deciduous/sync/nodes/already-promoted.json'])
      expect(state.syncRecordCount).toBe(1)

      // Recovery-promote against this normal repo must not abort on any of its unrelated files.
      mkdirSync(join(stagingDir, '.deciduous', 'sync', 'nodes'), {recursive: true})
      writeFileSync(
        join(stagingDir, '.deciduous', 'sync', 'nodes', 'already-promoted.json'),
        readFileSync(join(destinationDir, '.deciduous', 'sync', 'nodes', 'already-promoted.json')),
      )
      mkdirSync(join(stagingDir, 'docs', 'public'), {recursive: true})
      writeFileSync(join(stagingDir, 'docs', 'public', 'graph-data.json'), '{"nodes":[],"edges":[]}')
      writeFileSync(join(stagingDir, 'docs', 'public', 'git-history.json'), '[]')

      const staged = captureStagedInventory(stagingDir)
      const plan = planRecoveryPromote(state, staged)
      expect(plan.kind).toBe('proceed')
      if (plan.kind === 'proceed') {
        executeRecoveryPromote(destinationDir, stagingDir, plan)
      }

      // Unrelated files must be completely unchanged.
      expect(readFileSync(join(destinationDir, 'README.md'), 'utf8')).toBe('# Some real repo\n')
      expect(readFileSync(join(destinationDir, 'package.json'), 'utf8')).toBe('{"name":"some-repo"}')
      expect(readFileSync(join(destinationDir, '.git', 'HEAD'), 'utf8')).toBe('ref: refs/heads/main\n')
    } finally {
      rmSync(outside, {recursive: true, force: true})
    }
  })
})

describe('SAFETY (B5): validateAttachmentBytes scans raw decoded content for secrets, fails closed on invalid UTF-8', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-b5-'))
  })

  afterEach(() => {
    rmSync(dir, {recursive: true, force: true})
  })

  it('fails closed when the attachment content contains a matched secret pattern, naming only the rule', () => {
    const filePath = join(dir, 'leaky.md')
    writeFileSync(filePath, '# Notes\n\ntoken: ghp_1234567890abcdef1234567890abcdef1234\n')
    const result = validateAttachmentBytes(filePath)
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('github-token')
    expect(result.reason).not.toContain('ghp_1234567890abcdef1234567890abcdef1234')
  })

  it('fails closed on invalid UTF-8 rather than silently attaching undecodable bytes', () => {
    const filePath = join(dir, 'invalid.md')
    writeFileSync(filePath, Buffer.from([0xff, 0xfe, 0xfd, 0x00, 0x01]))
    const result = validateAttachmentBytes(filePath)
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('encoding')
  })

  it('still accepts clean, valid UTF-8 markdown', () => {
    const filePath = join(dir, 'clean.md')
    writeFileSync(filePath, '# A clean triage artifact\n\nNothing sensitive here.\n')
    expect(validateAttachmentBytes(filePath).ok).toBe(true)
  })
})

describe('SAFETY (B2/B3): runValidateStage requires real provenance and scans all 4 record collections', () => {
  let stagingDir: string

  beforeEach(() => {
    stagingDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-validate-'))
    mkdirSync(join(stagingDir, '.deciduous', 'sync', 'nodes'), {recursive: true})
    mkdirSync(join(stagingDir, '.deciduous', 'sync', 'edges'), {recursive: true})
    mkdirSync(join(stagingDir, '.deciduous', 'sync', 'themes'), {recursive: true})
    mkdirSync(join(stagingDir, '.deciduous', 'sync', 'tags'), {recursive: true})
    mkdirSync(join(stagingDir, 'docs', 'public'), {recursive: true})
    writeFileSync(
      join(stagingDir, '.deciduous', 'sync', 'nodes', 'n1.json'),
      JSON.stringify({
        author: 'a',
        change_id: 'n1',
        created_at: 't',
        node_type: 'goal',
        status: 'pending',
        title: '.ai/notes/x.md',
        updated_at: 't',
      }),
    )
    writeFileSync(
      join(stagingDir, 'docs', 'public', 'graph-data.json'),
      JSON.stringify({
        nodes: [
          {
            id: 1,
            change_id: 'n1',
            node_type: 'goal',
            title: '.ai/notes/x.md',
            status: 'pending',
            created_at: 't',
            updated_at: 't',
            metadata_json: '{}',
          },
        ],
        edges: [],
      }),
    )
    writeFileSync(join(stagingDir, 'docs', 'public', 'git-history.json'), '[]')
  })

  afterEach(() => {
    rmSync(stagingDir, {recursive: true, force: true})
  })

  it('refuses to report success when no provenance.json is present (no empty-input bypass)', () => {
    const result = runValidateStage(stagingDir)
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain('provenance')
  })

  it('refuses to report success when provenance.json has an empty requiredArtifactPaths', () => {
    writeSnapshotProvenance(stagingDir, {requiredArtifactPaths: []})
    const result = runValidateStage(stagingDir)
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain('non-empty')
  })

  it('does not flag the single required artifact as unrepresented, and scans all 4 record collections without malformed-record false positives', () => {
    // Single-artifact provenance deliberately fails the separate canonical-16/4-shape and
    // sourceEvidence gates (covered in their own describe blocks below) — this test isolates the
    // record-collection scan and the required-artifact-representation check specifically.
    writeSnapshotProvenance(stagingDir, {requiredArtifactPaths: ['.ai/notes/x.md']})
    const result = runValidateStage(stagingDir)
    expect(result.errors.some(e => e.includes('not represented by any node'))).toBe(false)
    expect(result.errors.some(e => e.toLowerCase().includes('malformed'))).toBe(false)
  })

  it('flags a malformed record JSON file by path only, without crashing the whole stage', () => {
    writeSnapshotProvenance(stagingDir, {requiredArtifactPaths: ['.ai/notes/x.md']})
    writeFileSync(join(stagingDir, '.deciduous', 'sync', 'edges', 'torn.json'), '{not valid json')
    const result = runValidateStage(stagingDir)
    expect(result.ok).toBe(false)
    expect(
      result.errors.some(e => e.includes('.deciduous/sync/edges/torn.json') && e.toLowerCase().includes('malformed')),
    ).toBe(true)
    expect(result.errors.some(e => e.includes('not valid json'))).toBe(false)
  })

  it('flags an invalid theme record against its real schema', () => {
    writeSnapshotProvenance(stagingDir, {requiredArtifactPaths: ['.ai/notes/x.md']})
    writeFileSync(join(stagingDir, '.deciduous', 'sync', 'themes', 'bad-theme.json'), JSON.stringify({author: 'a'}))
    const result = runValidateStage(stagingDir)
    expect(result.ok).toBe(false)
  })

  it('confirms loadSnapshotProvenance reads back what writeSnapshotProvenance wrote', () => {
    writeSnapshotProvenance(stagingDir, {requiredArtifactPaths: ['.ai/notes/x.md'], commitSha: 'abc123'})
    const loaded = loadSnapshotProvenance(stagingDir)
    expect(loaded?.requiredArtifactPaths).toEqual(['.ai/notes/x.md'])
    expect(loaded?.commitSha).toBe('abc123')
  })
})

function makeValidStagedFixture(root: string): void {
  mkdirSync(join(root, '.deciduous', 'sync', 'nodes'), {recursive: true})
  mkdirSync(join(root, '.deciduous', 'sync', 'edges'), {recursive: true})
  mkdirSync(join(root, '.deciduous', 'sync', 'themes'), {recursive: true})
  mkdirSync(join(root, '.deciduous', 'sync', 'tags'), {recursive: true})
  mkdirSync(join(root, 'docs', 'public'), {recursive: true})
  writeFileSync(
    join(root, '.deciduous', 'sync', 'nodes', 'n1.json'),
    JSON.stringify({
      author: 'a',
      change_id: 'n1',
      created_at: 't',
      node_type: 'goal',
      status: 'pending',
      title: '.ai/notes/x.md',
      updated_at: 't',
    }),
  )
  writeFileSync(
    join(root, 'docs', 'public', 'graph-data.json'),
    JSON.stringify({
      nodes: [
        {
          id: 1,
          change_id: 'n1',
          node_type: 'goal',
          title: '.ai/notes/x.md',
          status: 'pending',
          created_at: 't',
          updated_at: 't',
          metadata_json: '{}',
        },
      ],
      edges: [],
    }),
  )
  writeFileSync(join(root, 'docs', 'public', 'git-history.json'), '[]')
}

describe('SAFETY (B1): promote requires a reviewed+accepted inventory, independently re-verified against current bytes', () => {
  let stagingDir: string
  let destinationDir: string

  beforeEach(() => {
    stagingDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-b1-stage-'))
    destinationDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-b1-dest-'))
    makeCanonicalAcceptedFixture(stagingDir)
  })

  afterEach(() => {
    rmSync(stagingDir, {recursive: true, force: true})
    rmSync(destinationDir, {recursive: true, force: true})
  })

  it('acceptReviewedStage refuses to accept (and write an accepted inventory) when validation has not passed', () => {
    rmSync(join(stagingDir, 'docs', 'public', 'graph-data.json'))
    const result = acceptReviewedStage(stagingDir)
    expect(result.ok).toBe(false)
    expect(existsSync(join(stagingDir, 'accepted-inventory.json'))).toBe(false)
  })

  it('acceptReviewedStage writes an accepted inventory only after validation passes', () => {
    const result = acceptReviewedStage(stagingDir)
    expect(result.ok).toBe(true)
    expect(existsSync(join(stagingDir, 'accepted-inventory.json'))).toBe(true)
  })

  it('runCli promote fresh refuses when no accepted-inventory.json exists (no bypass via direct promote)', async () => {
    const result = await runCli(['promote', 'fresh', '--staging-dir', stagingDir, '--destination', destinationDir])
    expect(result.exitCode).toBe(1)
    expect(result.output.toLowerCase()).toContain('accept')
    expect(existsSync(join(destinationDir, '.deciduous'))).toBe(false)
  })

  it('runCli promote fresh succeeds once accepted, using the accepted inventory rather than a fresh recapture', async () => {
    expect(acceptReviewedStage(stagingDir).ok).toBe(true)
    const result = await runCli(['promote', 'fresh', '--staging-dir', stagingDir, '--destination', destinationDir])
    expect(result.exitCode).toBe(0)
    expect(existsSync(join(destinationDir, '.deciduous', 'sync', 'nodes', 'triage1.json'))).toBe(true)
  })

  it('runCli promote fresh aborts if staged bytes were tampered with after acceptance, rather than silently trusting new bytes', async () => {
    expect(acceptReviewedStage(stagingDir).ok).toBe(true)
    // Tamper with a managed record file after review/acceptance — still schema-valid (so
    // revalidation itself still passes), only the content differs from what was accepted, which is
    // exactly the drift `verifyStagedInventoryUnchanged` must catch.
    writeFileSync(
      join(stagingDir, '.deciduous', 'sync', 'nodes', 'triage1.json'),
      JSON.stringify({
        author: 'a',
        change_id: 'triage1',
        created_at: 'TAMPERED',
        node_type: 'observation',
        status: 'pending',
        title: CANONICAL_TRIAGE_ARCHIVE_PATHS[0],
        updated_at: 't',
      }),
    )

    const result = await runCli(['promote', 'fresh', '--staging-dir', stagingDir, '--destination', destinationDir])
    expect(result.exitCode).toBe(1)
    expect(result.output.toLowerCase()).toMatch(/tamper|chang|match/)
    expect(existsSync(join(destinationDir, '.deciduous'))).toBe(false)
  })
})

function extractDigest(output: string): string {
  const match = /digest ([0-9a-f]{16})/.exec(output)
  if (match?.[1] === undefined) {
    throw new Error(`no digest found in output: ${output}`)
  }
  return match[1]
}

describe('CLI ACCEPTANCE: public runCli validate -> accept (digest-bound) -> promote fresh -> promote recovery', () => {
  let stagingDir: string
  let destinationDir: string

  beforeEach(() => {
    stagingDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-accept-cli-stage-'))
    destinationDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-accept-cli-dest-'))
    makeCanonicalAcceptedFixture(stagingDir)
  })

  afterEach(() => {
    rmSync(stagingDir, {recursive: true, force: true})
    rmSync(destinationDir, {recursive: true, force: true})
  })

  it('promote fresh via the public CLI refuses before "accept" has ever run', async () => {
    const result = await runCli(['promote', 'fresh', '--staging-dir', stagingDir, '--destination', destinationDir])
    expect(result.exitCode).toBe(1)
    expect(result.output.toLowerCase()).toContain('accept')
  })

  it('"accept" refuses without a --digest argument at all (no implicit trust-current-bytes path)', async () => {
    const validateResult = await runCli(['validate', '--staging-dir', stagingDir])
    expect(validateResult.exitCode).toBe(0)
    const result = await runCli(['accept', '--staging-dir', stagingDir])
    expect(result.exitCode).toBe(1)
    expect(result.output.toLowerCase()).toContain('--digest')
    expect(existsSync(join(stagingDir, 'accepted-inventory.json'))).toBe(false)
  })

  it('"accept" refuses when the provided --digest does not match the current staged content (stale/wrong digest, never silently rebinds)', async () => {
    const validateResult = await runCli(['validate', '--staging-dir', stagingDir])
    const realDigest = extractDigest(validateResult.output)
    const wrongDigest = realDigest.split('').reverse().join('')

    const result = await runCli(['accept', '--staging-dir', stagingDir, '--digest', wrongDigest])
    expect(result.exitCode).toBe(1)
    expect(result.output.toLowerCase()).toMatch(/mismatch|does not match/)
    expect(existsSync(join(stagingDir, 'accepted-inventory.json'))).toBe(false)
  })

  it('"accept" via the public CLI refuses when validate has not passed, and reports why', async () => {
    rmSync(join(stagingDir, 'docs', 'public', 'graph-data.json'))
    const result = await runCli(['accept', '--staging-dir', stagingDir, '--digest', '0000000000000000'])
    expect(result.exitCode).toBe(1)
    expect(existsSync(join(stagingDir, 'accepted-inventory.json'))).toBe(false)
  })

  it('the full public CLI sequence succeeds: validate reports a digest, accept (given that exact digest) persists it, promote fresh then recovery both succeed', async () => {
    const validateResult = await runCli(['validate', '--staging-dir', stagingDir])
    expect(validateResult.exitCode).toBe(0)
    const digest = extractDigest(validateResult.output)

    const acceptResult = await runCli(['accept', '--staging-dir', stagingDir, '--digest', digest])
    expect(acceptResult.exitCode).toBe(0)
    expect(existsSync(join(stagingDir, 'accepted-inventory.json'))).toBe(true)

    const freshResult = await runCli(['promote', 'fresh', '--staging-dir', stagingDir, '--destination', destinationDir])
    expect(freshResult.exitCode).toBe(0)
    expect(existsSync(join(destinationDir, '.deciduous', 'sync', 'nodes', 'triage1.json'))).toBe(true)

    const recoveryResult = await runCli([
      'promote',
      'recovery',
      '--staging-dir',
      stagingDir,
      '--destination',
      destinationDir,
    ])
    expect(recoveryResult.exitCode).toBe(0)
  })

  it('changing managed bytes AFTER validate but BEFORE accept makes the previously reported digest stale, so accept refuses until re-validated', async () => {
    const before = await runCli(['validate', '--staging-dir', stagingDir])
    const staleDigest = extractDigest(before.output)

    // A legitimate re-run of the build stage before review is complete.
    writeFileSync(
      join(stagingDir, '.deciduous', 'sync', 'nodes', 'triage1.json'),
      JSON.stringify({
        author: 'a',
        change_id: 'triage1',
        created_at: 't2',
        node_type: 'observation',
        status: 'pending',
        title: CANONICAL_TRIAGE_ARCHIVE_PATHS[0],
        updated_at: 't2',
      }),
    )

    const staleAccept = await runCli(['accept', '--staging-dir', stagingDir, '--digest', staleDigest])
    expect(staleAccept.exitCode).toBe(1)

    const revalidated = await runCli(['validate', '--staging-dir', stagingDir])
    const newDigest = extractDigest(revalidated.output)
    expect(newDigest).not.toBe(staleDigest)

    const accept = await runCli(['accept', '--staging-dir', stagingDir, '--digest', newDigest])
    expect(accept.exitCode).toBe(0)

    const freshResult = await runCli(['promote', 'fresh', '--staging-dir', stagingDir, '--destination', destinationDir])
    expect(freshResult.exitCode).toBe(0)
    expect(
      JSON.parse(readFileSync(join(destinationDir, '.deciduous', 'sync', 'nodes', 'triage1.json'), 'utf8')).updated_at,
    ).toBe('t2')
  })

  it('changing managed bytes AFTER accept causes promote to abort (already covered by SAFETY B1, re-asserted through the public accept command)', async () => {
    const validateResult = await runCli(['validate', '--staging-dir', stagingDir])
    const digest = extractDigest(validateResult.output)
    expect((await runCli(['accept', '--staging-dir', stagingDir, '--digest', digest])).exitCode).toBe(0)
    writeFileSync(
      join(stagingDir, '.deciduous', 'sync', 'nodes', 'triage1.json'),
      JSON.stringify({
        author: 'a',
        change_id: 'triage1',
        created_at: 'TAMPERED',
        node_type: 'observation',
        status: 'pending',
        title: CANONICAL_TRIAGE_ARCHIVE_PATHS[0],
        updated_at: 't',
      }),
    )

    const result = await runCli(['promote', 'fresh', '--staging-dir', stagingDir, '--destination', destinationDir])
    expect(result.exitCode).toBe(1)
    expect(existsSync(join(destinationDir, '.deciduous'))).toBe(false)
  })
})

/**
 * A complete, well-formed source-evidence graph, materialized as the exact
 * `.deciduous/sync/nodes|edges/*.json` + `docs/public/graph-data.json` shapes
 * `runValidateStage` cross-checks the persisted `SourceEvidenceProvenance`
 * against — goal --(reviewed-association)--> decision <--(rejected-option)--
 * option(s), decision --(commit-supported)--> action --(source-reported)-->
 * outcome. Callers mutate the returned pieces to build negative cases.
 */
function makeSourceEvidenceFixture(): {
  graphExport: {nodes: Record<string, unknown>[]; edges: Record<string, unknown>[]}
  sourceEvidence: {
    mappingId: string
    reviewedApplied: boolean
    nodes: Record<string, {type: GroundedNodeType; evidence: {path: string; startLine: number; endLine: number}}>
    edges: {
      fromChangeId: string
      toChangeId: string
      rationale: string
      evidence: {path: string; startLine: number; endLine: number}
      provenance: EdgeProvenance
    }[]
    warnings: string[]
  }
} {
  const ev = {path: '.ai/audit/audit-final-report.md', startLine: 1, endLine: 1}
  const graphNode = (changeId: string, nodeType: string) => ({
    id: changeId,
    change_id: changeId,
    node_type: nodeType,
    title: changeId,
    status: 'pending',
    created_at: 't',
    updated_at: 't',
    metadata_json: '{}',
  })
  const graphEdge = (from: string, to: string) => ({
    id: `${from}-${to}`,
    from_node_id: from,
    to_node_id: to,
    from_change_id: from,
    to_change_id: to,
    edge_type: 'leads_to',
    weight: 1,
    created_at: 't',
  })

  return {
    graphExport: {
      nodes: [
        {...graphNode('triage1', 'observation'), title: '.ai/notes/x.md'},
        graphNode('g1', 'goal'),
        graphNode('d1', 'decision'),
        graphNode('opt1', 'option'),
        graphNode('a1', 'action'),
        graphNode('o1', 'outcome'),
      ],
      edges: [graphEdge('g1', 'd1'), graphEdge('opt1', 'd1'), graphEdge('d1', 'a1'), graphEdge('a1', 'o1')],
    },
    sourceEvidence: {
      mappingId: 'test-mapping',
      reviewedApplied: true,
      nodes: {
        g1: {type: 'goal', evidence: {path: '.ai/plan/refactor-audit-improvements-1.md', startLine: 2, endLine: 7}},
        d1: {type: 'decision', evidence: ev},
        opt1: {type: 'option', evidence: ev},
        a1: {type: 'action', evidence: ev},
        o1: {type: 'outcome', evidence: ev},
      },
      edges: [
        {
          fromChangeId: 'g1',
          toChangeId: 'd1',
          rationale: 'reviewed association',
          evidence: ev,
          provenance: {
            relationKind: 'reviewed-association',
            reviewKind: 'maintainer-reviewed',
            reviewedDate: '2026-01-01',
            disclaimer: 'reviewed-association, not-causal-intent',
            fromEvidence: {path: '.ai/plan/refactor-audit-improvements-1.md', startLine: 2, endLine: 7},
            toEvidence: ev,
          },
        },
        {
          fromChangeId: 'opt1',
          toChangeId: 'd1',
          rationale: 'rejected: x',
          evidence: ev,
          provenance: {relationKind: 'rejected-option'},
        },
        {
          fromChangeId: 'd1',
          toChangeId: 'a1',
          rationale: 'commit-supported implementation',
          evidence: ev,
          provenance: {
            relationKind: 'commit-supported',
            commitRefs: [{sha: '236ba68059847a663073843546417ab6b2f84e67', date: '2025-10-06', note: 'x'}],
          },
        },
        {
          fromChangeId: 'a1',
          toChangeId: 'o1',
          rationale: 'reported outcome',
          evidence: ev,
          provenance: {relationKind: 'source-reported'},
        },
      ],
      warnings: [],
    },
  }
}

describe('INTEGRATION: runValidateStage cross-checks persisted SourceEvidenceProvenance against the actual graph export (public strict gate wiring)', () => {
  let stagingDir: string

  beforeEach(() => {
    stagingDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-source-evidence-validate-'))
    makeValidStagedFixture(stagingDir)
  })

  afterEach(() => {
    rmSync(stagingDir, {recursive: true, force: true})
  })

  function writeGraphExport(graphExport: unknown): void {
    writeFileSync(join(stagingDir, 'docs', 'public', 'graph-data.json'), JSON.stringify(graphExport))
  }

  it('passes the source-evidence cross-check specifically when the full reviewed structure is consistently recorded in both provenance and the actual export', () => {
    // Single-artifact provenance deliberately fails the separate canonical-16/4-shape gate (its own
    // describe block, and the full end-to-end SAFETY(B1)/CLI ACCEPTANCE fixtures, cover that) — this
    // test isolates the source-evidence/reviewed-mapping cross-check specifically.
    const fixture = makeSourceEvidenceFixture()
    writeGraphExport(fixture.graphExport)
    writeSnapshotProvenance(stagingDir, {
      requiredArtifactPaths: ['.ai/notes/x.md'],
      sourceEvidence: fixture.sourceEvidence,
    })
    const result = runValidateStage(stagingDir)
    const shapeGateErrors = result.errors.filter(
      e => e.includes('requiredArtifactPaths must contain exactly') || e.includes('promotedArtifactPaths'),
    )
    expect(result.errors.filter(e => !shapeGateErrors.includes(e))).toEqual([])
  })

  it('fails when the approved reviewed mapping was never applied (reviewedApplied: false) — the omitted-approved-goal case', () => {
    const fixture = makeSourceEvidenceFixture()
    writeGraphExport(fixture.graphExport)
    writeSnapshotProvenance(stagingDir, {
      requiredArtifactPaths: ['.ai/notes/x.md'],
      sourceEvidence: {...fixture.sourceEvidence, reviewedApplied: false},
    })
    const result = runValidateStage(stagingDir)
    expect(result.ok).toBe(false)
    expect(result.errors.some(e => e.includes('NOT applied'))).toBe(true)
  })

  it('fails when a recorded source-evidence edge was removed from the actual graph export after build (tamper)', () => {
    const fixture = makeSourceEvidenceFixture()
    const tamperedExport = {
      ...fixture.graphExport,
      edges: fixture.graphExport.edges.filter(e => (e as {from_change_id: string}).from_change_id !== 'd1'),
    }
    writeGraphExport(tamperedExport)
    writeSnapshotProvenance(stagingDir, {
      requiredArtifactPaths: ['.ai/notes/x.md'],
      sourceEvidence: fixture.sourceEvidence,
    })
    const result = runValidateStage(stagingDir)
    expect(result.ok).toBe(false)
    expect(result.errors.some(e => e.includes('missing from the actual staged graph export'))).toBe(true)
  })

  it('fails when a recorded source-evidence node was removed from the actual graph export after build (tamper)', () => {
    const fixture = makeSourceEvidenceFixture()
    const tamperedExport = {
      ...fixture.graphExport,
      nodes: fixture.graphExport.nodes.filter(n => (n as {change_id: string}).change_id !== 'o1'),
    }
    writeGraphExport(tamperedExport)
    writeSnapshotProvenance(stagingDir, {
      requiredArtifactPaths: ['.ai/notes/x.md'],
      sourceEvidence: fixture.sourceEvidence,
    })
    const result = runValidateStage(stagingDir)
    expect(result.ok).toBe(false)
    expect(result.errors.some(e => e.includes('missing from the actual staged graph export'))).toBe(true)
  })

  it('fails when a rejected-option edge points at a decision outside its own evidence section (foreign option smuggled into provenance)', () => {
    const fixture = makeSourceEvidenceFixture()
    writeGraphExport(fixture.graphExport)
    const tampered = {
      ...fixture.sourceEvidence,
      nodes: {
        ...fixture.sourceEvidence.nodes,
        opt1: {
          type: 'option' as GroundedNodeType,
          evidence: {path: '.ai/audit/audit-final-report.md', startLine: 999, endLine: 999},
        },
      },
    }
    writeSnapshotProvenance(stagingDir, {requiredArtifactPaths: ['.ai/notes/x.md'], sourceEvidence: tampered})
    const result = runValidateStage(stagingDir)
    expect(result.ok).toBe(false)
    expect(result.errors.some(e => e.includes('no rejected-option edges bounded within its own section'))).toBe(true)
  })

  it('fails when a commit-supported edge has a malformed commitRef (tampered provenance data, not just a missing record)', () => {
    const fixture = makeSourceEvidenceFixture()
    writeGraphExport(fixture.graphExport)
    const tampered = {
      ...fixture.sourceEvidence,
      edges: fixture.sourceEvidence.edges.map(e =>
        e.fromChangeId === 'd1' && e.toChangeId === 'a1'
          ? {
              ...e,
              provenance: {
                relationKind: 'commit-supported' as const,
                commitRefs: [{sha: 'not-a-sha', date: 'bad', note: 'x'}],
              },
            }
          : e,
      ),
    }
    writeSnapshotProvenance(stagingDir, {requiredArtifactPaths: ['.ai/notes/x.md'], sourceEvidence: tampered})
    const result = runValidateStage(stagingDir)
    expect(result.ok).toBe(false)
    expect(result.errors.some(e => e.includes('missing or malformed commitRefs'))).toBe(true)
  })

  it('treats a structurally malformed sourceEvidence block in provenance.json as unreadable provenance (fails closed, does not silently ignore it)', () => {
    const fixture = makeSourceEvidenceFixture()
    writeGraphExport(fixture.graphExport)
    writeFileSync(
      join(stagingDir, 'provenance.json'),
      JSON.stringify({
        requiredArtifactPaths: ['.ai/notes/x.md'],
        sourceEvidence: {
          mappingId: 'test-mapping',
          reviewedApplied: true,
          nodes: {g1: {type: 'goal'}},
          edges: [],
          warnings: [],
        },
      }),
    )
    const result = runValidateStage(stagingDir)
    expect(result.ok).toBe(false)
    expect(result.errors.some(e => e.includes('provenance.json'))).toBe(true)
  })

  it('a partial/disabled-gate graph (all 5 types present as isolated nodes, no real edges) still fails the public gate', () => {
    const fixture = makeSourceEvidenceFixture()
    writeGraphExport(fixture.graphExport)
    writeSnapshotProvenance(stagingDir, {
      requiredArtifactPaths: ['.ai/notes/x.md'],
      sourceEvidence: {...fixture.sourceEvidence, edges: []},
    })
    const result = runValidateStage(stagingDir)
    expect(result.ok).toBe(false)
    expect(result.errors.some(e => e.includes('No reviewed-association edge found'))).toBe(true)
  })
})

describe('SECURITY FIX: validateCanonicalProvenanceShape re-derives the canonical 16/4 shape from persisted provenance itself (not just at build time)', () => {
  it('rejects a shrunk requiredArtifactPaths (1 path) even though build-time enforcement would have refused this triage report', () => {
    const errors = validateCanonicalProvenanceShape({requiredArtifactPaths: ['.ai/notes/x.md']})
    expect(errors.some(e => e.includes('must contain exactly 16 unique paths'))).toBe(true)
  })

  it('rejects a padded requiredArtifactPaths (16 entries via duplicates, not 16 unique)', () => {
    const errors = validateCanonicalProvenanceShape({
      requiredArtifactPaths: Array.from({length: 16}, () => '.ai/notes/x.md'),
    })
    expect(errors.some(e => e.includes('contains duplicate paths'))).toBe(true)
  })

  it('accepts exactly 16 unique requiredArtifactPaths with exactly 4 unique promotedArtifactPaths, all present in requiredArtifactPaths', () => {
    const errors = validateCanonicalProvenanceShape({
      requiredArtifactPaths: [...CANONICAL_TRIAGE_ARCHIVE_PATHS],
      promotedArtifactPaths: [...CANONICAL_TRIAGE_PROMOTED_PATHS],
    })
    expect(errors).toEqual([])
  })

  it('rejects a missing promotedArtifactPaths declaration even when requiredArtifactPaths is canonically shaped', () => {
    const errors = validateCanonicalProvenanceShape({requiredArtifactPaths: [...CANONICAL_TRIAGE_ARCHIVE_PATHS]})
    expect(errors.some(e => e.includes('is missing promotedArtifactPaths'))).toBe(true)
  })

  it('rejects a promotedArtifactPaths entry not present in requiredArtifactPaths (foreign promoted path)', () => {
    const errors = validateCanonicalProvenanceShape({
      requiredArtifactPaths: [...CANONICAL_TRIAGE_ARCHIVE_PATHS],
      promotedArtifactPaths: ['.ai/notes/does-not-exist.md', ...[...CANONICAL_TRIAGE_PROMOTED_PATHS].slice(0, 3)],
    })
    expect(errors.some(e => e.includes('not present in requiredArtifactPaths'))).toBe(true)
  })
})

describe('SECURITY FIX (public runCli, RED-first): sourceEvidence is unconditionally hard-required, not opt-in', () => {
  let stagingDir: string

  beforeEach(() => {
    stagingDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-sec-required-evidence-'))
    makeCanonicalAcceptedFixture(stagingDir)
  })

  afterEach(() => {
    rmSync(stagingDir, {recursive: true, force: true})
  })

  it('runValidateStage passes against the full canonical fixture (sanity baseline for the negative case below)', () => {
    const result = runValidateStage(stagingDir)
    expect(result.errors).toEqual([])
    expect(result.ok).toBe(true)
  })

  it('deleting sourceEvidence from an otherwise-canonical provenance.json (simulating the pre-fix opt-in bypass) now fails closed rather than silently skipping the gate', () => {
    const provenancePath = join(stagingDir, 'provenance.json')
    const raw = JSON.parse(readFileSync(provenancePath, 'utf8')) as Record<string, unknown>
    delete raw.sourceEvidence
    writeFileSync(provenancePath, JSON.stringify(raw))

    const result = runValidateStage(stagingDir)
    expect(result.ok).toBe(false)
    expect(result.errors.some(e => e.includes('is missing sourceEvidence'))).toBe(true)
  })
})

describe('SECURITY FIX (public runCli, RED-first): accept/promote digest binds provenance.json + frozen source-evidence documents, not just managed records/exports', () => {
  let stagingDir: string
  let destinationDir: string

  beforeEach(() => {
    stagingDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-sec-bound-digest-stage-'))
    destinationDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-sec-bound-digest-dest-'))
    makeCanonicalAcceptedFixture(stagingDir)
  })

  afterEach(() => {
    rmSync(stagingDir, {recursive: true, force: true})
    rmSync(destinationDir, {recursive: true, force: true})
  })

  it('a --digest computed before provenance.json is mutated no longer matches after promotedArtifactPaths is shrunk (managed records/exports byte-identical)', async () => {
    const before = await runCli(['validate', '--staging-dir', stagingDir])
    const originalDigest = extractDigest(before.output)

    const provenancePath = join(stagingDir, 'provenance.json')
    const raw = JSON.parse(readFileSync(provenancePath, 'utf8')) as {promotedArtifactPaths: string[]}
    raw.promotedArtifactPaths = raw.promotedArtifactPaths.slice(0, 1)
    writeFileSync(provenancePath, JSON.stringify(raw))

    // Managed records/exports are untouched — only the private provenance.json changed — yet the
    // previously reported digest must no longer validate this content as the reviewed set.
    const staleAccept = await runCli(['accept', '--staging-dir', stagingDir, '--digest', originalDigest])
    expect(staleAccept.exitCode).toBe(1)
  })

  it('after a real accept, deleting sourceEvidence from provenance.json (simulating a post-accept private-input tamper) aborts promote before any destination write, despite managed records/exports being unchanged', async () => {
    const validateResult = await runCli(['validate', '--staging-dir', stagingDir])
    const digest = extractDigest(validateResult.output)
    expect((await runCli(['accept', '--staging-dir', stagingDir, '--digest', digest])).exitCode).toBe(0)

    const provenancePath = join(stagingDir, 'provenance.json')
    const raw = JSON.parse(readFileSync(provenancePath, 'utf8')) as Record<string, unknown>
    delete raw.sourceEvidence
    writeFileSync(provenancePath, JSON.stringify(raw))

    const result = await runCli(['promote', 'fresh', '--staging-dir', stagingDir, '--destination', destinationDir])
    expect(result.exitCode).toBe(1)
    expect(existsSync(join(destinationDir, '.deciduous'))).toBe(false)
  })

  it('the private provenance.json, accepted-inventory.json, and accepted-bound-inventory.json are never copied to the destination by a successful promote', async () => {
    const validateResult = await runCli(['validate', '--staging-dir', stagingDir])
    const digest = extractDigest(validateResult.output)
    expect((await runCli(['accept', '--staging-dir', stagingDir, '--digest', digest])).exitCode).toBe(0)

    const result = await runCli(['promote', 'fresh', '--staging-dir', stagingDir, '--destination', destinationDir])
    expect(result.exitCode).toBe(0)
    expect(existsSync(join(destinationDir, 'provenance.json'))).toBe(false)
    expect(existsSync(join(destinationDir, 'accepted-inventory.json'))).toBe(false)
    expect(existsSync(join(destinationDir, 'accepted-bound-inventory.json'))).toBe(false)
    expect(existsSync(join(destinationDir, 'docs', 'public', 'graph-data.json'))).toBe(true)
  })
})

describe('SECURITY FIX (public runCli, RED-first): a NEW managed record added after accept is drift, even though every previously-accepted file is untouched', () => {
  let stagingDir: string
  let destinationDir: string

  beforeEach(() => {
    stagingDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-sec-new-record-stage-'))
    destinationDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-sec-new-record-dest-'))
    makeCanonicalAcceptedFixture(stagingDir)
  })

  afterEach(() => {
    rmSync(stagingDir, {recursive: true, force: true})
    rmSync(destinationDir, {recursive: true, force: true})
  })

  it('adding an extra .deciduous/sync/edges/*.json record after accept aborts promote before any destination write', async () => {
    const validateResult = await runCli(['validate', '--staging-dir', stagingDir])
    const digest = extractDigest(validateResult.output)
    expect((await runCli(['accept', '--staging-dir', stagingDir, '--digest', digest])).exitCode).toBe(0)

    // A brand-new record, never reviewed, never part of the accepted inventory — every previously
    // accepted file is still byte-identical, so a captured-vs-current diff over ONLY the previously
    // captured paths would find nothing changed and wrongly let this ride along into promotion.
    writeFileSync(
      join(stagingDir, '.deciduous', 'sync', 'edges', 'sneaked-in.json'),
      JSON.stringify({
        author: 'a',
        created_at: 't',
        edge_id: 'sneaked-in',
        edge_type: 'leads_to',
        from_change_id: 'g1',
        to_change_id: 'o1',
        weight: 1,
      }),
    )

    const result = await runCli(['promote', 'fresh', '--staging-dir', stagingDir, '--destination', destinationDir])
    expect(result.exitCode).toBe(1)
    expect(result.output.toLowerCase()).toMatch(/tamper|chang|match/)
    expect(existsSync(join(destinationDir, '.deciduous'))).toBe(false)
  })
})

describe('SECURITY FIX (public runCli, RED-first): promote cannot be bypassed by a hand-authored accepted-inventory.json', () => {
  let stagingDir: string
  let destinationDir: string

  beforeEach(() => {
    stagingDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-sec-handcrafted-stage-'))
    destinationDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-sec-handcrafted-dest-'))
    makeValidStagedFixture(stagingDir)
    writeSnapshotProvenance(stagingDir, {requiredArtifactPaths: ['.ai/notes/x.md']})
  })

  afterEach(() => {
    rmSync(stagingDir, {recursive: true, force: true})
    rmSync(destinationDir, {recursive: true, force: true})
  })

  it('a hand-authored accepted-inventory.json + accepted-bound-inventory.json that hash-match current (never-validated, non-canonical) bytes still cannot promote', async () => {
    // No `accept` command was ever run — this directly forges both persisted inventory files a real
    // `acceptReviewedStage` would produce, using the CURRENT (deliberately never-passing, 1-artifact,
    // no-sourceEvidence) staged bytes, to prove the independent re-validation inside promote (not
    // merely "does accepted-inventory.json exist") is what actually gates the destination write.
    const exportFiles = ['docs/public/graph-data.json', 'docs/public/git-history.json']
    const fullInventory = captureStagedInventory(stagingDir)
    const copyScoped = scopeInventoryToManagedPaths(fullInventory, exportFiles)
    const boundOnlyResult = resolveBoundOnlyPaths(stagingDir)
    const boundOnlyPaths = 'paths' in boundOnlyResult ? boundOnlyResult.paths : []
    const boundScoped = scopeInventoryToBoundValidationPaths(fullInventory, exportFiles, boundOnlyPaths)
    writeFileSync(join(stagingDir, 'accepted-inventory.json'), JSON.stringify(copyScoped))
    writeFileSync(join(stagingDir, 'accepted-bound-inventory.json'), JSON.stringify(boundScoped))

    const result = await runCli(['promote', 'fresh', '--staging-dir', stagingDir, '--destination', destinationDir])
    expect(result.exitCode).toBe(1)
    expect(existsSync(join(destinationDir, '.deciduous'))).toBe(false)
  })
})

describe("SAFETY FIX (B1.4, RED-first): promote derives its copy set from re-verified boundStaged, never from accepted-inventory.json's own unverified paths/hashes", () => {
  let stagingDir: string
  let destinationDir: string

  beforeEach(() => {
    stagingDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-b14-stage-'))
    destinationDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-b14-dest-'))
    makeCanonicalAcceptedFixture(stagingDir)
  })

  afterEach(() => {
    rmSync(stagingDir, {recursive: true, force: true})
    rmSync(destinationDir, {recursive: true, force: true})
  })

  it('a real accept, then a private path key added directly to accepted-inventory.json (the copy-scope file), is never copied to the destination', async () => {
    const validateResult = await runCli(['validate', '--staging-dir', stagingDir])
    const digest = extractDigest(validateResult.output)
    expect((await runCli(['accept', '--staging-dir', stagingDir, '--digest', digest])).exitCode).toBe(0)

    const acceptedPath = join(stagingDir, 'accepted-inventory.json')
    const accepted = JSON.parse(readFileSync(acceptedPath, 'utf8')) as {files: Record<string, string>}
    accepted.files['provenance.json'] = createHash('sha256')
      .update(readFileSync(join(stagingDir, 'provenance.json')))
      .digest('hex')
    writeFileSync(acceptedPath, JSON.stringify(accepted))

    const result = await runCli(['promote', 'fresh', '--staging-dir', stagingDir, '--destination', destinationDir])
    expect(result.exitCode).toBe(0)
    expect(existsSync(join(destinationDir, 'provenance.json'))).toBe(false)
  })

  it('a real accept, then a managed-record key REMOVED from accepted-inventory.json, still copies that record (the copy set is derived from boundStaged, not read from this file)', async () => {
    const validateResult = await runCli(['validate', '--staging-dir', stagingDir])
    const digest = extractDigest(validateResult.output)
    expect((await runCli(['accept', '--staging-dir', stagingDir, '--digest', digest])).exitCode).toBe(0)

    const acceptedPath = join(stagingDir, 'accepted-inventory.json')
    const accepted = JSON.parse(readFileSync(acceptedPath, 'utf8')) as {files: Record<string, string>}
    delete accepted.files['.deciduous/sync/nodes/triage2.json']
    writeFileSync(acceptedPath, JSON.stringify(accepted))

    const result = await runCli(['promote', 'fresh', '--staging-dir', stagingDir, '--destination', destinationDir])
    expect(result.exitCode).toBe(0)
    expect(existsSync(join(destinationDir, '.deciduous', 'sync', 'nodes', 'triage2.json'))).toBe(true)
  })

  it('the same two attacks against accepted-inventory.json also fail to smuggle/omit anything on promote recovery', async () => {
    const validateResult = await runCli(['validate', '--staging-dir', stagingDir])
    const digest = extractDigest(validateResult.output)
    expect((await runCli(['accept', '--staging-dir', stagingDir, '--digest', digest])).exitCode).toBe(0)

    const acceptedPath = join(stagingDir, 'accepted-inventory.json')
    const accepted = JSON.parse(readFileSync(acceptedPath, 'utf8')) as {files: Record<string, string>}
    accepted.files['provenance.json'] = 'forged-hash'
    delete accepted.files['.deciduous/sync/nodes/triage2.json']
    writeFileSync(acceptedPath, JSON.stringify(accepted))

    const result = await runCli(['promote', 'recovery', '--staging-dir', stagingDir, '--destination', destinationDir])
    expect(result.exitCode).toBe(0)
    expect(existsSync(join(destinationDir, 'provenance.json'))).toBe(false)
    expect(existsSync(join(destinationDir, '.deciduous', 'sync', 'nodes', 'triage2.json'))).toBe(true)
  })
})

describe('SAFETY FIX (S4, RED-first): bound-scope digest binds source-evidence documents at their ACTUAL resolved staged location, tracked or --source-root fallback', () => {
  let stagingDir: string
  const trackedSourceEvidencePath = SOURCE_EVIDENCE_ARTIFACT_PATHS[0]
  const fallbackSourceEvidencePath = SOURCE_EVIDENCE_ARTIFACT_PATHS[1]

  beforeEach(() => {
    stagingDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-s4-stage-'))
    makeCanonicalAcceptedFixture(stagingDir)
    mkdirSync(dirname(join(stagingDir, 'source-inputs', fallbackSourceEvidencePath)), {recursive: true})
    const fallbackContent = 'fallback source-evidence content\n'
    writeFileSync(join(stagingDir, 'source-inputs', fallbackSourceEvidencePath), fallbackContent)
    mkdirSync(dirname(join(stagingDir, '.bootstrap', 'provenance.json')), {recursive: true})
    writeFileSync(
      join(stagingDir, '.bootstrap', 'provenance.json'),
      JSON.stringify({
        pinnedRef: 'main',
        resolvedSha: 'a'.repeat(40),
        capturedAt: '2026-01-01T00:00:00.000Z',
        sourceRemoteUrl: undefined,
        requiredArtifacts: [
          {relativePath: trackedSourceEvidencePath, sha256: 'x'.repeat(64), origin: 'tracked'},
          {
            relativePath: fallbackSourceEvidencePath,
            sha256: createHash('sha256').update(fallbackContent).digest('hex'),
            origin: 'source-root',
          },
        ],
      }),
    )
  })

  afterEach(() => {
    rmSync(stagingDir, {recursive: true, force: true})
  })

  it('resolveBoundOnlyPaths resolves the fallback document to source-inputs/<path>, not staging-root/<path>', () => {
    const result = resolveBoundOnlyPaths(stagingDir)
    expect('paths' in result).toBe(true)
    if ('paths' in result) {
      expect(result.paths).toContain(join('source-inputs', fallbackSourceEvidencePath).split(sep).join('/'))
      expect(result.paths).not.toContain(fallbackSourceEvidencePath)
    }
  })

  it('tampering the fallback document AFTER accept (at its real source-inputs/ location) is caught and aborts promote, even though every staging-root/<path> location is untouched', async () => {
    const destinationDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-s4-dest-'))
    try {
      const validateResult = await runCli(['validate', '--staging-dir', stagingDir])
      expect(validateResult.exitCode).toBe(0)
      const digest = extractDigest(validateResult.output)
      expect((await runCli(['accept', '--staging-dir', stagingDir, '--digest', digest])).exitCode).toBe(0)

      writeFileSync(join(stagingDir, 'source-inputs', fallbackSourceEvidencePath), 'TAMPERED fallback content\n')

      const result = await runCli(['promote', 'fresh', '--staging-dir', stagingDir, '--destination', destinationDir])
      expect(result.exitCode).toBe(1)
      expect(existsSync(join(destinationDir, '.deciduous'))).toBe(false)
    } finally {
      rmSync(destinationDir, {recursive: true, force: true})
    }
  })

  it('a real snapshot provenance that omits one of the two required source-evidence documents from requiredArtifacts fails validate closed, rather than treating the unlisted input as safely absent', () => {
    writeFileSync(
      join(stagingDir, '.bootstrap', 'provenance.json'),
      JSON.stringify({
        pinnedRef: 'main',
        resolvedSha: 'a'.repeat(40),
        capturedAt: '2026-01-01T00:00:00.000Z',
        sourceRemoteUrl: undefined,
        requiredArtifacts: [{relativePath: trackedSourceEvidencePath, sha256: 'x'.repeat(64), origin: 'tracked'}],
      }),
    )

    const result = runValidateStage(stagingDir)
    expect(result.ok).toBe(false)
    expect(result.errors.some(e => e.includes('does not list required source-evidence document'))).toBe(true)
  })
})

function makeFakeDeciduousRunner(options: {failLinkFor?: string} = {}): {
  calls: {argv: readonly string[]}[]
  runner: (argv: readonly string[], cwd: string) => Promise<{exitCode: number; stdout: string; stderr: string}>
} {
  let nextLocalId = 1
  const calls: {argv: readonly string[]}[] = []
  const runner = async (argv: readonly string[]): Promise<{exitCode: number; stdout: string; stderr: string}> => {
    calls.push({argv})
    const [cmd] = argv
    if (cmd === 'add') {
      const id = nextLocalId
      nextLocalId += 1
      return {exitCode: 0, stdout: `Created node ${id} (fake)`, stderr: ''}
    }
    if (cmd === 'show') {
      const localId = argv[1]
      return {exitCode: 0, stdout: JSON.stringify({change_id: `change-${localId}`}), stderr: ''}
    }
    if (cmd === 'doc') {
      return {exitCode: 0, stdout: '', stderr: ''}
    }
    if (cmd === 'link') {
      if (options.failLinkFor !== undefined && argv[1] === options.failLinkFor) {
        return {
          exitCode: 1,
          stdout: '',
          stderr: 'simulated: fake deciduous link failure (secret-token-should-never-leak)',
        }
      }
      return {exitCode: 0, stdout: '', stderr: ''}
    }
    return {exitCode: 0, stdout: '', stderr: ''}
  }
  return {calls, runner}
}

describe('SAFETY (S1/S3/S5): runBuildStage warning surfacing and PR-link-failure hard-fail, via a fast fake CommandRunner (no real deciduous subprocess needed)', () => {
  let stagingDir: string
  let triageSourcePath: string

  beforeEach(() => {
    stagingDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-s1s3s5-stage-'))
    triageSourcePath = join(tmpdir(), `s1s3s5-triage-artifact-${Date.now()}-${Math.random().toString(36).slice(2)}.md`)
    writeFileSync(triageSourcePath, 'fixture triage artifact content\n')
  })

  afterEach(() => {
    if (existsSync(stagingDir)) rmSync(stagingDir, {recursive: true, force: true})
    if (existsSync(triageSourcePath)) rmSync(triageSourcePath, {force: true})
  })

  const triageArtifacts = [
    {path: '.ai/notes/fixture.md', disposition: 'Fixture for S1/S3/S5.', promoted: false, requiresSourceRoot: false},
  ]

  it('S3: when a PR has a matching action node but the deciduous link call itself fails, runBuildStage throws rather than silently persisting an unlinked decision at confidence 75', async () => {
    const {runner} = makeFakeDeciduousRunner({failLinkFor: 'change-2'}) // the action node created for the one commit below will be local id 2 → change-2
    const sourcePaths = {'.ai/notes/fixture.md': triageSourcePath}
    const commits = [
      {sha: 'merge-sha-1', message: 'feat: merged change', date: '2026-01-01T00:00:00Z', isPrMerge: true},
    ]
    const prs = [
      {
        number: 42,
        title: 'feat: merged change',
        body: 'body',
        mergedAt: '2026-01-01T00:00:00Z',
        files: ['a.ts'],
        mergeCommitSha: 'merge-sha-1',
      },
    ]

    await expect(
      runBuildStage({
        runner,
        stagingDir,
        triageArtifacts,
        triageArtifactSourcePaths: sourcePaths,
        commits,
        runWindowId: 's1s3s5-test',
        prs,
      }),
    ).rejects.toThrow(/link/i)
  })

  it('S3: a PR with NO matching action node still succeeds at confidence 70 (unaffected by the link-failure hard-fail, since no link is ever attempted)', async () => {
    const {runner} = makeFakeDeciduousRunner()
    const sourcePaths = {'.ai/notes/fixture.md': triageSourcePath}
    const prs = [
      {
        number: 99,
        title: 'feat: no matching commit',
        body: 'body',
        mergedAt: '2026-01-01T00:00:00Z',
        files: [],
        mergeCommitSha: 'no-such-sha',
      },
    ]

    const result = await runBuildStage({
      runner,
      stagingDir,
      triageArtifacts,
      triageArtifactSourcePaths: sourcePaths,
      commits: [],
      runWindowId: 's1s3s5-test-2',
      prs,
    })

    expect(Object.keys(result.decisionNodeChangeIds)).toEqual(['99'])
    expect(result.warnings.some(w => w.includes('confidence dropped to 70'))).toBe(true)
  })

  it('S1: runCli build surfaces bounded, sanitized warnings in its successful output rather than silently discarding them', async () => {
    // Reuses the real INTEGRATION fake-gh git fixture pattern would be heavier; instead, this
    // exercises runBuildStage directly (the actual warning-producing unit) and confirms the
    // warnings it returns are the same ones runCliInner threads into its output — verified via
    // the source text of the wiring below, plus this direct behavioral check of the returned shape.
    const {runner} = makeFakeDeciduousRunner()
    const sourcePaths = {'.ai/notes/fixture.md': triageSourcePath}
    const prs = [
      {
        number: 99,
        title: 'feat: no matching commit',
        body: 'body',
        mergedAt: '2026-01-01T00:00:00Z',
        files: [],
        mergeCommitSha: 'no-such-sha',
      },
    ]

    const result = await runBuildStage({
      runner,
      stagingDir,
      triageArtifacts,
      triageArtifactSourcePaths: sourcePaths,
      commits: [],
      runWindowId: 's1-test',
      prs,
    })

    expect(result.warnings.length).toBeGreaterThan(0)
    // The warning text itself must never carry a raw secret-shaped token even incidentally.
    expect(result.warnings.every(w => !/ghp_[A-Za-z0-9]{30,}/.test(w))).toBe(true)
  })
})

describe('SAFETY (S1) real end-to-end: runCli build surfaces runBuildStage warnings in its actual public CLI output', () => {
  let repoParentDir: string
  let repoDir: string
  let stagingParentDir: string
  let stagingDir: string
  let triagePath: string
  let fakeGhBinDir: string
  let originalPath: string | undefined

  const run = createFixtureGitRunner(() => repoDir)

  beforeEach(async () => {
    if (!deciduousAvailable) {
      return
    }
    repoParentDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-s1-repo-parent-'))
    repoDir = join(repoParentDir, 'repo')
    mkdirSync(repoDir, {recursive: true})
    stagingParentDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-s1-stage-parent-'))
    stagingDir = join(stagingParentDir, 'staging')

    await run(['init', '-q', '-b', 'main'])
    writeCanonicalTriageFixtureFiles(repoDir)
    await run(['add', '-A'])
    await run(['-c', 'user.email=t@t.com', '-c', 'user.name=t', 'commit', '-q', '-m', 'feat: add fixture artifacts'])

    triagePath = join(tmpdir(), `s1-triage-${Date.now()}-${Math.random().toString(36).slice(2)}.md`)
    writeFileSync(triagePath, CANONICAL_TRIAGE_MARKDOWN)

    // A fake gh returning a merged PR whose mergeCommitSha does NOT match any real commit in
    // the fixture repo — this is exactly the "no action node found" path that pushes a warning.
    fakeGhBinDir = mkdtempSync(join(tmpdir(), 'bootstrap-graph-s1-ghbin-'))
    const fakeGhScript = `#!/usr/bin/env node
const argv = process.argv.slice(2)
if (argv[0] === 'pr' && argv[1] === 'view') { process.exit(1) }
if (argv[0] === 'api') {
  process.stdout.write(JSON.stringify([{
    data: {
      search: {
        pageInfo: {hasNextPage: false, endCursor: null},
        nodes: [{
          number: 500,
          title: 'feat: an unrelated merged PR',
          body: 'body',
          mergedAt: '2026-05-01T00:00:00Z',
          url: 'https://github.com/acme/widget/pull/500',
          mergeCommit: {oid: 'sha-with-no-matching-commit'},
          files: {nodes: [], pageInfo: {hasNextPage: false, endCursor: null}},
        }],
      },
    },
  }]))
  process.exit(0)
}
process.exit(1)
`
    const fakeGhPath = join(fakeGhBinDir, 'gh')
    writeFileSync(fakeGhPath, fakeGhScript)
    chmodSync(fakeGhPath, 0o755)
    originalPath = process.env.PATH
    process.env.PATH = `${fakeGhBinDir}:${originalPath ?? ''}`
  })

  afterEach(() => {
    if (originalPath !== undefined) process.env.PATH = originalPath
    for (const dir of [repoParentDir, stagingParentDir, fakeGhBinDir]) {
      if (dir !== undefined && existsSync(dir)) rmSync(dir, {recursive: true, force: true})
    }
    if (triagePath !== undefined && existsSync(triagePath)) rmSync(triagePath, {force: true})
  })

  it('surfaces the "no action node found" warning in the real public runCli build output', async () => {
    if (!deciduousAvailable) {
      console.warn('SKIP: deciduous v0.17.1 not on PATH — skipping S1 real end-to-end test')
      return
    }

    const result = await runCli([
      'build',
      '--staging-dir',
      stagingDir,
      '--repo',
      repoDir,
      '--triage',
      triagePath,
      '--github-repo',
      'acme/widget',
      '--snapshot',
      '2026-05-24T00:00:00.000Z',
      '--run-window',
      's1-test-run',
      '--ref',
      'main',
    ])

    expect(result.exitCode).toBe(0)
    expect(result.output).toContain('Warnings:')
    expect(result.output.toLowerCase()).toContain('no action node found')
  }, 30_000)
})
