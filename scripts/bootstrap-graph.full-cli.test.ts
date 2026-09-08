/**
 * Full 16-artifact lifecycle integration lane, exercised entirely through the
 * PUBLIC `runCli` entrypoint: build -> validate -> accept --digest -> promote
 * fresh -> promote recovery. No library helpers manually construct graph
 * state — every assertion reads back what the real, pinned deciduous v0.17.1
 * binary actually wrote via the real CLI commands.
 *
 * Test-only lane: no production files are modified by this test file. If a
 * step fails because production is incomplete, that failure is the intended,
 * honest output of this lane — assertions are NOT weakened to force a pass.
 *
 * Fixtures live in `scripts/bootstrap-graph/test-fixtures/full-cli/`:
 * - `audit-final-report.md` / `refactor-audit-improvements-1.md`: trimmed
 *   excerpts of the real, public, tracked sparkle files at those paths.
 * - 12 minimal benign markdown files standing in for the remaining ARCHIVE
 *   entries.
 * - `triage-report.md`: a fixture triage report shaped like the real Unit 2
 *   `.ai/_archive/triage-2026-05-24.md` — 16 unique ARCHIVE paths, 4 with a
 *   PROMOTE annotation, 2 requiring `--source-root`.
 *
 * A fake `gh` executable is installed on PATH for the duration of this test
 * (never touching the real network) returning one in-window PR and letting
 * `refactor-audit-improvements-1.md`'s own explicit older-PR-reference text
 * resolve via a fake `gh pr view` call.
 */

import {execFile} from 'node:child_process'
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join, sep} from 'node:path'
import process from 'node:process'
import {fileURLToPath} from 'node:url'
import {promisify} from 'node:util'

import {standardAfterEach, standardBeforeEach} from '@sparkle/test-utils/lifecycle'
import {afterEach, beforeAll, beforeEach, describe, expect, it} from 'vitest'

import {runCli} from './bootstrap-graph.js'
import {AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001} from './bootstrap-graph/reviewed-mapping.js'

const execFileAsync = promisify(execFile)
const FIXTURE_ROOT = join(dirname(fileURLToPath(import.meta.url)), 'bootstrap-graph', 'test-fixtures', 'full-cli')

const TRACKED_ARTIFACTS: {relativePath: string; fixtureFile: string}[] = [
  {relativePath: '.ai/plan/refactor-audit-improvements-1.md', fixtureFile: 'refactor-audit-improvements-1.md'},
  {
    relativePath: '.ai/plan/feature-accessible-form-component-1.md',
    fixtureFile: 'plan/feature-accessible-form-component-1.md',
  },
  {
    relativePath: '.ai/plan/feature-theme-management-package-1.md',
    fixtureFile: 'plan/feature-theme-management-package-1.md',
  },
  {relativePath: '.ai/plan/feature-moo-dang-shell-1.md', fixtureFile: 'plan/feature-moo-dang-shell-1.md'},
  {relativePath: '.ai/plan/infrastructure-build-pipeline-1.md', fixtureFile: 'plan/infrastructure-build-pipeline-1.md'},
  {
    relativePath: '.ai/plan/infrastructure-testing-framework-1.md',
    fixtureFile: 'plan/infrastructure-testing-framework-1.md',
  },
  {relativePath: '.ai/audit/audit-final-report.md', fixtureFile: 'audit-final-report.md'},
  {relativePath: '.ai/audit/audit-phase1-baseline.md', fixtureFile: 'audit/audit-phase1-baseline.md'},
  {relativePath: '.ai/audit/audit-phase2-analysis.md', fixtureFile: 'audit/audit-phase2-analysis.md'},
  {relativePath: '.ai/audit/audit-phase3-identification.md', fixtureFile: 'audit/audit-phase3-identification.md'},
  {
    relativePath: '.ai/audit/typescript-project-references-audit.md',
    fixtureFile: 'audit/typescript-project-references-audit.md',
  },
  {relativePath: '.ai/analysis/task-008-turborepo-analysis.md', fixtureFile: 'analysis/task-008-turborepo-analysis.md'},
  {
    relativePath: '.ai/notes/radix-form-architecture-decisions.md',
    fixtureFile: 'notes/radix-form-architecture-decisions.md',
  },
  {
    relativePath: '.ai/security/localStorage-security-audit-2025-09-30.md',
    fixtureFile: 'security/localStorage-security-audit-2025-09-30.md',
  },
]

const SOURCE_ROOT_ONLY_ARTIFACTS: {relativePath: string; fixtureFile: string}[] = [
  {relativePath: '.ai/docs/LESSONS_LEARNED.md', fixtureFile: 'docs/LESSONS_LEARNED.md'},
  {relativePath: '.ai/docs/IMPLEMENTATION_CHANGELOG.md', fixtureFile: 'docs/IMPLEMENTATION_CHANGELOG.md'},
]

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
 * number of `-c key=value` config overrides, so callers can detect
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

beforeEach(() => {
  standardBeforeEach()
})

afterEach(() => {
  standardAfterEach()
})

describe('FULL 16-ARTIFACT LIFECYCLE (public runCli): build -> validate -> accept --digest -> promote fresh -> promote recovery', () => {
  let sourceRepoDir: string
  let sourceRootDir: string
  let stagingParentDir: string
  let stagingDir: string
  let destRepoDir: string
  let triagePath: string
  let fakeGhBinDir: string
  let originalPath: string | undefined
  let pinnedSha: string

  // Disables GPG commit signing (`-c commit.gpgSign=false`) for `commit`
  // subcommands only, so this disposable throwaway repo never depends on
  // the host's real `commit.gpgsign`/`user.signingkey` configuration (test
  // isolation defect: a host with signing enabled but no corresponding
  // secret key available would otherwise fail every fixture commit).
  const runGit = (args: string[]) => {
    assertFixtureRepoDir(sourceRepoDir)
    const finalArgs = findGitSubcommand(args) === 'commit' ? ['-c', 'commit.gpgSign=false', ...args] : args
    return execFileAsync('git', finalArgs, {cwd: sourceRepoDir})
  }

  beforeEach(async () => {
    if (!deciduousAvailable) {
      return
    }

    // --- Source fixture git repo: 14 tracked artifacts, controlled dated commits ---
    sourceRepoDir = mkdtempSync(join(tmpdir(), 'full-cli-source-'))
    await execFileAsync('git', ['init', '-q', '-b', 'main'], {cwd: sourceRepoDir})

    for (const artifact of TRACKED_ARTIFACTS) {
      const destPath = join(sourceRepoDir, artifact.relativePath)
      mkdirSync(dirname(destPath), {recursive: true})
      cpSync(join(FIXTURE_ROOT, artifact.fixtureFile), destPath)
    }
    await runGit(['add', '-A'])
    const commitEnv = {GIT_AUTHOR_DATE: '2025-10-06T12:00:00Z', GIT_COMMITTER_DATE: '2025-10-06T12:00:00Z'}
    assertFixtureRepoDir(sourceRepoDir)
    await execFileAsync(
      'git',
      [
        '-c',
        'commit.gpgSign=false',
        '-c',
        'user.email=t@t.com',
        '-c',
        'user.name=t',
        'commit',
        '-q',
        '-m',
        'feat: add triage fixture artifacts (#1620)',
      ],
      {
        cwd: sourceRepoDir,
        env: {...process.env, ...commitEnv},
      },
    )
    const {stdout: sha} = await runGit(['rev-parse', 'HEAD'])
    pinnedSha = sha.trim()

    // A later commit, dated AFTER the snapshot bound below — must be excluded from the pinned
    // snapshot's history entirely (this pins --ref explicitly rather than trusting a moving branch).
    writeFileSync(join(sourceRepoDir, 'AFTER-SNAPSHOT.md'), 'must not appear in the pinned snapshot\n')
    await runGit(['add', '-A'])
    assertFixtureRepoDir(sourceRepoDir)
    await execFileAsync(
      'git',
      [
        '-c',
        'commit.gpgSign=false',
        '-c',
        'user.email=t@t.com',
        '-c',
        'user.name=t',
        'commit',
        '-q',
        '-m',
        'chore: this commit is after the snapshot bound',
      ],
      {
        cwd: sourceRepoDir,
        env: {...process.env, GIT_AUTHOR_DATE: '2026-06-01T00:00:00Z', GIT_COMMITTER_DATE: '2026-06-01T00:00:00Z'},
      },
    )

    // --- --source-root fallback for the 2 gitignored-in-a-fresh-clone artifacts ---
    sourceRootDir = mkdtempSync(join(tmpdir(), 'full-cli-source-root-'))
    for (const artifact of SOURCE_ROOT_ONLY_ARTIFACTS) {
      const destPath = join(sourceRootDir, artifact.relativePath)
      mkdirSync(dirname(destPath), {recursive: true})
      cpSync(join(FIXTURE_ROOT, artifact.fixtureFile), destPath)
    }

    // --- Staging: parent exists, staging dir itself must not (matches prepareSourceSnapshot) ---
    stagingParentDir = mkdtempSync(join(tmpdir(), 'full-cli-stage-parent-'))
    stagingDir = join(stagingParentDir, 'staging')

    // --- Destination: a real, non-empty repo with unrelated tracked content ---
    destRepoDir = mkdtempSync(join(tmpdir(), 'full-cli-dest-'))
    writeFileSync(join(destRepoDir, 'README.md'), '# Some real destination repo\n')
    writeFileSync(join(destRepoDir, 'package.json'), '{"name":"dest-repo"}')
    mkdirSync(join(destRepoDir, '.deciduous', 'sync', 'nodes'), {recursive: true})
    mkdirSync(join(destRepoDir, '.deciduous', 'sync', 'edges'), {recursive: true})
    mkdirSync(join(destRepoDir, '.deciduous', 'sync', 'themes'), {recursive: true})
    mkdirSync(join(destRepoDir, '.deciduous', 'sync', 'tags'), {recursive: true})
    writeFileSync(join(destRepoDir, '.deciduous', 'config.toml'), '')
    writeFileSync(join(destRepoDir, '.deciduous', 'sync', 'README.md'), '# sync store readme\n')

    // --- Fixture triage report ---
    triagePath = join(tmpdir(), `full-cli-triage-${Date.now()}-${Math.random().toString(36).slice(2)}.md`)
    cpSync(join(FIXTURE_ROOT, 'triage-report.md'), triagePath)

    // --- Fake gh on PATH: one in-window PR, one older explicit reference (PR #1620, referenced
    // from refactor-audit-improvements-1.md's own fixture text) ---
    fakeGhBinDir = mkdtempSync(join(tmpdir(), 'full-cli-ghbin-'))
    const fakeGhScript = `#!/usr/bin/env node
const argv = process.argv.slice(2)
if (argv[0] === 'pr' && argv[1] === 'view') {
  const number = Number(argv[2])
  if (number === 1620) {
    process.stdout.write(JSON.stringify({
      number: 1620,
      state: 'MERGED',
      mergedAt: '2024-01-01T00:00:00Z',
      title: 'fix: an older explicitly-referenced decision',
      body: 'historical PR body',
      url: 'https://github.com/marcusrbrown/sparkle/pull/1620',
      mergeCommit: {oid: 'old-ref-sha-1620'},
      files: [{path: 'legacy-file.ts'}],
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
          number: 2000,
          title: 'feat: add triage fixture artifacts',
          body: 'in-window PR body for the full-cli fixture',
          mergedAt: '2025-10-06T12:00:00Z',
          url: 'https://github.com/marcusrbrown/sparkle/pull/2000',
          mergeCommit: {oid: '${pinnedSha}'},
          files: {nodes: [{path: '.ai/plan/refactor-audit-improvements-1.md'}], pageInfo: {hasNextPage: false, endCursor: null}},
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
    for (const dir of [sourceRepoDir, sourceRootDir, stagingParentDir, destRepoDir, fakeGhBinDir]) {
      if (dir !== undefined && existsSync(dir)) {
        rmSync(dir, {recursive: true, force: true})
      }
    }
    if (triagePath !== undefined && existsSync(triagePath)) {
      rmSync(triagePath, {force: true})
    }
  })

  it('runs the full public-CLI lifecycle against all 16 fixture artifacts and asserts the reviewed-graph chain, promotion scoping, and tamper/negative safety paths', async () => {
    if (!deciduousAvailable) {
      console.warn('SKIP: deciduous v0.17.1 not on PATH — skipping full-cli lifecycle test')
      return
    }

    const capturedAt = '2026-05-24T00:00:00.000Z'

    // --- BUILD ---
    const buildResult = await runCli([
      'build',
      '--staging-dir',
      stagingDir,
      '--repo',
      sourceRepoDir,
      '--triage',
      triagePath,
      '--source-root',
      sourceRootDir,
      '--github-repo',
      'marcusrbrown/sparkle',
      '--snapshot',
      capturedAt,
      '--run-window',
      'full-cli-lifecycle-test',
      '--ref',
      pinnedSha,
    ])

    // This is the load-bearing integration finding for this lane: report the actual outcome
    // rather than adapt the assertions to whatever currently happens.
    expect(buildResult.exitCode, `build failed:\n${buildResult.output}`).toBe(0)

    // Frozen artifacts: all 16 required paths must be staged with real bytes, not just the
    // 14 tracked ones.
    const provenancePath = join(stagingDir, '.bootstrap', 'provenance.json')
    expect(existsSync(provenancePath)).toBe(true)
    const provenance = JSON.parse(readFileSync(provenancePath, 'utf8')) as {
      resolvedSha: string
      requiredArtifacts: {relativePath: string; sha256: string; origin: 'tracked' | 'source-root'}[]
    }
    expect(provenance.resolvedSha).toBe(pinnedSha)
    expect(provenance.requiredArtifacts).toHaveLength(16)
    const sourceRootOrigins = provenance.requiredArtifacts
      .filter(a => a.origin === 'source-root')
      .map(a => a.relativePath)
    expect(sourceRootOrigins.sort()).toEqual(SOURCE_ROOT_ONLY_ARTIFACTS.map(a => a.relativePath).sort())

    // Own isolated DB / staged git — never the source repo's.
    expect(existsSync(join(stagingDir, '.deciduous', 'config.toml'))).toBe(true)
    expect(existsSync(join(sourceRepoDir, '.deciduous'))).toBe(false)

    // --- Reviewed-graph chain assertion (by change_id, not local id) ---
    const graphDataPath = join(stagingDir, 'docs', 'public', 'graph-data.json')
    expect(existsSync(graphDataPath)).toBe(true)
    const graphData = JSON.parse(readFileSync(graphDataPath, 'utf8')) as {
      nodes: {change_id: string; node_type: string; title: string}[]
      edges: {from_change_id: string; to_change_id: string; edge_type: string}[]
    }

    // Node identity comes from the ONE approved reviewed mapping's own declared titles — never
    // "first node of this type" (the triage/git-log/PR-body passes also emit decision-type nodes).
    const goalNode = graphData.nodes.find(
      n => n.node_type === 'goal' && n.title === AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001.from.nodeTitle,
    )
    const decisionNode = graphData.nodes.find(
      n => n.node_type === 'decision' && n.title === AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001.to.nodeTitle,
    )
    const actionNode = graphData.nodes.find(
      n => n.node_type === 'action' && n.title === AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001.expectedAction?.nodeTitle,
    )
    const outcomeNode = graphData.nodes.find(n => n.node_type === 'outcome' && n.title.includes('Change 1'))
    const optionNodes = graphData.nodes.filter(n => n.node_type === 'option')

    expect(
      goalNode,
      `expected the reviewed-mapping's goal node "${AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001.from.nodeTitle}"`,
    ).toBeDefined()
    expect(
      decisionNode,
      `expected the reviewed-mapping's decision node "${AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001.to.nodeTitle}"`,
    ).toBeDefined()
    expect(
      actionNode,
      `expected the reviewed-mapping's action node "${AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001.expectedAction?.nodeTitle}"`,
    ).toBeDefined()
    expect(outcomeNode, 'expected a "Verification: Change 1..." outcome node from the Change 1 section').toBeDefined()
    expect(
      optionNodes.length,
      'expected option nodes extracted from ADR-001\'s "Alternatives Considered" list',
    ).toBeGreaterThan(0)

    // Rejection is expressed as an edge (deciduousEdgeTypeFor: 'rejected'), never a fabricated
    // node-level status field — real deciduous has no such field on nodes.
    const rejectedOptionEdges = graphData.edges.filter(e => e.edge_type === 'rejected')
    expect(
      rejectedOptionEdges.length,
      'expected at least one rejected-option -> decision edge (edge_type "rejected")',
    ).toBeGreaterThan(0)
    const rejectedOptionChangeIds = new Set(rejectedOptionEdges.map(e => e.from_change_id))
    expect(
      optionNodes.some(option => rejectedOptionChangeIds.has(option.change_id)),
      'expected at least one option node to be the source of a "rejected" edge',
    ).toBe(true)

    if (goalNode !== undefined && decisionNode !== undefined && actionNode !== undefined && outcomeNode !== undefined) {
      const hasEdge = (from: string, to: string) =>
        graphData.edges.some(e => e.from_change_id === from && e.to_change_id === to)
      expect(
        hasEdge(goalNode.change_id, decisionNode.change_id),
        'expected goal -> decision edge (the reviewed-association)',
      ).toBe(true)
      expect(
        rejectedOptionEdges.some(e => e.to_change_id === decisionNode.change_id),
        'expected a rejected-option -> THIS decision edge specifically',
      ).toBe(true)
      expect(
        hasEdge(decisionNode.change_id, actionNode.change_id),
        'expected decision -> action edge (commit-supported upgrade)',
      ).toBe(true)
      expect(
        hasEdge(actionNode.change_id, outcomeNode.change_id),
        'expected action -> outcome edge (reported verification)',
      ).toBe(true)
    }

    // Both the in-window PR (#2000) and the older explicitly-referenced PR (#1620) should be
    // represented as decision nodes.
    const decisionTitles = graphData.nodes.filter(n => n.node_type === 'decision').map(n => n.title)
    expect(decisionTitles).toContain('feat: add triage fixture artifacts')
    expect(decisionTitles).toContain('fix: an older explicitly-referenced decision')

    // The after-snapshot commit must never appear anywhere in the staged git history export.
    const gitHistoryRaw = readFileSync(join(stagingDir, 'docs', 'public', 'git-history.json'), 'utf8')
    expect(gitHistoryRaw).not.toContain('this commit is after the snapshot bound')

    // --- VALIDATE ---
    const validateResult = await runCli(['validate', '--staging-dir', stagingDir])
    expect(validateResult.exitCode, `validate failed:\n${validateResult.output}`).toBe(0)
    const digestMatch = /digest ([0-9a-f]{16})/.exec(validateResult.output)
    expect(digestMatch, `no digest found in validate output: ${validateResult.output}`).not.toBeNull()
    const digest = digestMatch?.[1] ?? ''

    // --- Tamper-before-accept must fail (edge/provenance tamper, not just a record file) ---
    const edgesDir = join(stagingDir, '.deciduous', 'sync', 'edges')
    const edgeFiles = readdirSync(edgesDir)
    if (edgeFiles.length > 0) {
      const tamperedEdgePath = join(edgesDir, edgeFiles[0] ?? '')
      const originalEdgeBytes = readFileSync(tamperedEdgePath)
      writeFileSync(tamperedEdgePath, JSON.stringify({tampered: true}))
      const tamperedAccept = await runCli(['accept', '--staging-dir', stagingDir, '--digest', digest])
      expect(
        tamperedAccept.exitCode,
        'accept must refuse when staged bytes were tampered with after the cited digest was reported',
      ).toBe(1)
      // Restore for the real accept below.
      writeFileSync(tamperedEdgePath, originalEdgeBytes)
    }

    // --- ACCEPT (exact reviewed digest) ---
    const acceptResult = await runCli(['accept', '--staging-dir', stagingDir, '--digest', digest])
    expect(acceptResult.exitCode, `accept failed:\n${acceptResult.output}`).toBe(0)
    expect(existsSync(join(stagingDir, 'accepted-inventory.json'))).toBe(true)

    // --- PROMOTE FRESH: managed record JSON + 2 exports ONLY; unrelated dest files unchanged ---
    const freshResult = await runCli(['promote', 'fresh', '--staging-dir', stagingDir, '--destination', destRepoDir])
    expect(freshResult.exitCode, `promote fresh failed:\n${freshResult.output}`).toBe(0)

    expect(readFileSync(join(destRepoDir, 'README.md'), 'utf8')).toBe('# Some real destination repo\n')
    expect(readFileSync(join(destRepoDir, 'package.json'), 'utf8')).toBe('{"name":"dest-repo"}')
    expect(readFileSync(join(destRepoDir, '.deciduous', 'sync', 'README.md'), 'utf8')).toBe('# sync store readme\n')
    expect(existsSync(join(destRepoDir, 'docs', 'public', 'graph-data.json'))).toBe(true)
    expect(existsSync(join(destRepoDir, 'docs', 'public', 'git-history.json'))).toBe(true)
    expect(existsSync(join(destRepoDir, '.bootstrap'))).toBe(false)
    expect(existsSync(join(destRepoDir, 'accepted-inventory.json'))).toBe(false)

    // --- PROMOTE RECOVERY: identical subset, no overwrite ---
    const recoveryResult = await runCli([
      'promote',
      'recovery',
      '--staging-dir',
      stagingDir,
      '--destination',
      destRepoDir,
    ])
    expect(recoveryResult.exitCode, `promote recovery failed:\n${recoveryResult.output}`).toBe(0)
    expect(readFileSync(join(destRepoDir, 'README.md'), 'utf8')).toBe('# Some real destination repo\n')
  }, 60_000)

  it('build fails preflight (before any deciduous invocation) when the triage report is empty of ARCHIVE entries', async () => {
    if (!deciduousAvailable) {
      console.warn('SKIP: deciduous v0.17.1 not on PATH — skipping negative-capability test')
      return
    }
    writeFileSync(triagePath, '# Empty triage report\n\nNo ARCHIVE section at all.\n')

    const result = await runCli([
      'build',
      '--staging-dir',
      stagingDir,
      '--repo',
      sourceRepoDir,
      '--triage',
      triagePath,
      '--source-root',
      sourceRootDir,
      '--github-repo',
      'marcusrbrown/sparkle',
      '--snapshot',
      '2026-05-24T00:00:00.000Z',
      '--run-window',
      'full-cli-negative-test',
      '--ref',
      pinnedSha,
    ])

    expect(result.exitCode).toBe(1)
    expect(existsSync(stagingDir)).toBe(false)
  }, 30_000)

  it('build fails preflight when --source-root is omitted for the 2 artifacts that require it', async () => {
    if (!deciduousAvailable) {
      console.warn('SKIP: deciduous v0.17.1 not on PATH — skipping negative-capability test')
      return
    }

    const result = await runCli([
      'build',
      '--staging-dir',
      stagingDir,
      '--repo',
      sourceRepoDir,
      '--triage',
      triagePath,
      '--github-repo',
      'marcusrbrown/sparkle',
      '--snapshot',
      '2026-05-24T00:00:00.000Z',
      '--run-window',
      'full-cli-negative-test-2',
      '--ref',
      pinnedSha,
    ])

    expect(result.exitCode).toBe(1)
    expect(existsSync(stagingDir)).toBe(false)
  }, 30_000)
})
