/**
 * Tests for scripts/bootstrap-graph/snapshot.ts.
 *
 * All git fixtures are real, local, throwaway git repositories created under
 * a per-test temp directory (never inside this project's own working tree)
 * and removed in `afterEach`. No network, no `deciduous` binary, no graph
 * mutation — this file only exercises source-snapshot preparation.
 */

import {execFileSync} from 'node:child_process'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, sep} from 'node:path'
import process from 'node:process'
import {standardAfterEach, standardBeforeEach} from '@sparkle/test-utils/lifecycle'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'

import {
  assertStagingIsolation,
  loadSourceSnapshotProvenance,
  preflightRequiredArtifacts,
  prepareSourceSnapshot,
  SourceSnapshotError,
} from './snapshot.js'

const TEST_GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Snapshot Test',
  GIT_AUTHOR_EMAIL: 'snapshot-test@example.invalid',
  GIT_COMMITTER_NAME: 'Snapshot Test',
  GIT_COMMITTER_EMAIL: 'snapshot-test@example.invalid',
  GIT_TERMINAL_PROMPT: '0',
}

let testRootDir: string

/**
 * Test isolation guard: every fixture git repo in this file lives under
 * `os.tmpdir()` (via `mkdtempSync(join(tmpdir(), ...))`), never inside this
 * project's own working tree. This is a defense-in-depth check — not a
 * substitute for that construction — so a future edit can never point a
 * fixture git command at a real repository by accident.
 */
function assertFixtureRepoDir(cwd: string): void {
  const real = realpathSync(cwd)
  const tmpRoot = realpathSync(tmpdir())
  if (!real.startsWith(tmpRoot + sep) && real !== tmpRoot) {
    throw new Error(`refusing to run a fixture git command outside of os.tmpdir(): ${cwd}`)
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

/**
 * Disables GPG commit signing (`-c commit.gpgSign=false`) for `commit`
 * subcommands only, so these disposable throwaway repos never depend on
 * the host's real `commit.gpgsign`/`user.signingkey` configuration (test
 * isolation defect: a host with signing enabled but no corresponding
 * secret key available would otherwise fail every fixture commit).
 */
function git(cwd: string, ...args: string[]): string {
  assertFixtureRepoDir(cwd)
  const finalArgs = findGitSubcommand(args) === 'commit' ? ['-c', 'commit.gpgSign=false', ...args] : args
  return execFileSync('git', finalArgs, {cwd, env: TEST_GIT_ENV, encoding: 'utf8'})
}

/** Creates a real local git repo with a single commit containing `files`. Returns its absolute path. */
function createSourceRepo(files: Record<string, string>): string {
  const repoRoot = mkdtempSync(join(testRootDir, 'source-repo-'))
  git(repoRoot, 'init', '--initial-branch=main', '--quiet')
  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = join(repoRoot, relativePath)
    mkdirSync(join(absolutePath, '..'), {recursive: true})
    writeFileSync(absolutePath, content)
  }
  git(repoRoot, 'add', '-A')
  git(repoRoot, 'commit', '--quiet', '-m', 'initial commit')
  return repoRoot
}

function newStagingPath(): string {
  return join(testRootDir, `staging-${Math.random().toString(36).slice(2)}`)
}

beforeEach(() => {
  standardBeforeEach()
  testRootDir = mkdtempSync(join(tmpdir(), 'bootstrap-snapshot-test-'))
})

afterEach(() => {
  rmSync(testRootDir, {recursive: true, force: true})
  standardAfterEach()
})

describe('assertStagingIsolation', () => {
  it('rejects a stagingRoot nested inside repoRoot', () => {
    const repoRoot = createSourceRepo({'a.md': 'a'})
    expect(() => assertStagingIsolation({repoRoot, stagingRoot: join(repoRoot, 'nested-staging')})).toThrow(
      SourceSnapshotError,
    )
  })

  it('rejects a stagingRoot that is an ancestor of repoRoot', () => {
    const repoRoot = createSourceRepo({'a.md': 'a'})
    const ancestor = join(repoRoot, '..')
    expect(() => assertStagingIsolation({repoRoot, stagingRoot: ancestor})).toThrow(SourceSnapshotError)
  })

  it('rejects a stagingRoot nested inside sourceRoot', () => {
    const repoRoot = createSourceRepo({'a.md': 'a'})
    const sourceRoot = mkdtempSync(join(testRootDir, 'source-root-'))
    expect(() => assertStagingIsolation({repoRoot, stagingRoot: join(sourceRoot, 'nested'), sourceRoot})).toThrow(
      SourceSnapshotError,
    )
  })

  it('rejects a stagingRoot that already exists and is non-empty', () => {
    const repoRoot = createSourceRepo({'a.md': 'a'})
    const stagingRoot = newStagingPath()
    mkdirSync(stagingRoot, {recursive: true})
    writeFileSync(join(stagingRoot, 'leftover.txt'), 'pre-existing content')
    expect(() => assertStagingIsolation({repoRoot, stagingRoot})).toThrow(SourceSnapshotError)
  })

  it('accepts a stagingRoot that already exists but is empty (e.g. mkdtemp() then populate)', () => {
    const repoRoot = createSourceRepo({'a.md': 'a'})
    const stagingRoot = newStagingPath()
    mkdirSync(stagingRoot, {recursive: true})
    expect(() => assertStagingIsolation({repoRoot, stagingRoot})).not.toThrow()
  })

  it('rejects a stagingRoot path that is itself a symlink', () => {
    const repoRoot = createSourceRepo({'a.md': 'a'})
    const realDir = mkdtempSync(join(testRootDir, 'real-'))
    const symlinkPath = join(testRootDir, 'staging-symlink')
    symlinkSync(realDir, symlinkPath)
    expect(() => assertStagingIsolation({repoRoot, stagingRoot: symlinkPath})).toThrow(SourceSnapshotError)
  })

  it('accepts a genuinely new, non-overlapping stagingRoot', () => {
    const repoRoot = createSourceRepo({'a.md': 'a'})
    expect(() => assertStagingIsolation({repoRoot, stagingRoot: newStagingPath()})).not.toThrow()
  })
})

describe('preflightRequiredArtifacts', () => {
  it('resolves an artifact tracked at the pinned SHA without touching sourceRoot', async () => {
    const repoRoot = createSourceRepo({'.ai/plan/x.md': 'tracked content'})
    const sha = git(repoRoot, 'rev-parse', 'HEAD').trim()
    const result = await preflightRequiredArtifacts({
      repoRoot,
      pinnedSha: sha,
      requiredArtifactPaths: ['.ai/plan/x.md'],
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.resolutions).toEqual([{relativePath: '.ai/plan/x.md', origin: 'tracked'}])
    }
  })

  it('falls back to sourceRoot for a gitignored required artifact', async () => {
    const repoRoot = createSourceRepo({'.gitignore': '.ai/docs/\n'})
    const sourceRoot = mkdtempSync(join(testRootDir, 'source-root-'))
    mkdirSync(join(sourceRoot, '.ai', 'docs'), {recursive: true})
    writeFileSync(join(sourceRoot, '.ai', 'docs', 'LESSONS_LEARNED.md'), 'lessons')
    const sha = git(repoRoot, 'rev-parse', 'HEAD').trim()
    const result = await preflightRequiredArtifacts({
      repoRoot,
      pinnedSha: sha,
      sourceRoot,
      requiredArtifactPaths: ['.ai/docs/LESSONS_LEARNED.md'],
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.resolutions).toEqual([{relativePath: '.ai/docs/LESSONS_LEARNED.md', origin: 'source-root'}])
    }
  })

  it('reports every missing artifact together, not just the first', async () => {
    const repoRoot = createSourceRepo({'.ai/plan/x.md': 'tracked'})
    const sha = git(repoRoot, 'rev-parse', 'HEAD').trim()
    const result = await preflightRequiredArtifacts({
      repoRoot,
      pinnedSha: sha,
      requiredArtifactPaths: ['.ai/docs/LESSONS_LEARNED.md', '.ai/docs/IMPLEMENTATION_CHANGELOG.md'],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.missing).toEqual(['.ai/docs/LESSONS_LEARNED.md', '.ai/docs/IMPLEMENTATION_CHANGELOG.md'])
    }
  })

  it('rejects a path-traversal attempt against sourceRoot as missing, not as a resolved escape', async () => {
    const repoRoot = createSourceRepo({'a.md': 'a'})
    const sourceRoot = mkdtempSync(join(testRootDir, 'source-root-'))
    const sha = git(repoRoot, 'rev-parse', 'HEAD').trim()
    const result = await preflightRequiredArtifacts({
      repoRoot,
      pinnedSha: sha,
      sourceRoot,
      requiredArtifactPaths: ['../outside.md'],
    })
    expect(result.ok).toBe(false)
  })
})

describe('prepareSourceSnapshot', () => {
  it('pins the SHA at capture time — a later move of the branch does not affect an already-prepared snapshot', async () => {
    const repoRoot = createSourceRepo({'.ai/plan/x.md': 'v1'})
    const firstSha = git(repoRoot, 'rev-parse', 'HEAD').trim()
    const stagingRoot = newStagingPath()

    const result = await prepareSourceSnapshot({
      repoRoot,
      stagingRoot,
      pinnedRef: 'main',
      requiredArtifactPaths: ['.ai/plan/x.md'],
      capturedAt: '2026-09-07T00:00:00.000Z',
    })

    // Advance the source branch after the snapshot was prepared.
    writeFileSync(join(repoRoot, '.ai', 'plan', 'x.md'), 'v2')
    git(repoRoot, 'add', '-A')
    git(repoRoot, 'commit', '--quiet', '-m', 'advance main')

    expect(result.provenance.resolvedSha).toBe(firstSha)
    expect(readFileSync(join(result.stagedCheckoutRoot, '.ai', 'plan', 'x.md'), 'utf8')).toBe('v1')
    expect(git(result.stagedCheckoutRoot, 'rev-parse', 'HEAD').trim()).toBe(firstSha)
  })

  it('uses the pinned committed blob, not a dirty uncommitted working-tree edit', async () => {
    const repoRoot = createSourceRepo({'.ai/plan/x.md': 'committed content'})
    const stagingRoot = newStagingPath()

    // Dirty the working tree without committing.
    writeFileSync(join(repoRoot, '.ai', 'plan', 'x.md'), 'DIRTY UNCOMMITTED CONTENT')

    const result = await prepareSourceSnapshot({
      repoRoot,
      stagingRoot,
      requiredArtifactPaths: ['.ai/plan/x.md'],
      capturedAt: '2026-09-07T00:00:00.000Z',
    })

    expect(readFileSync(join(result.stagedCheckoutRoot, '.ai', 'plan', 'x.md'), 'utf8')).toBe('committed content')
    expect(result.provenance.requiredArtifacts[0]?.sha256).not.toBe(undefined)
  })

  it('does not create the staging directory when a required artifact is missing entirely', async () => {
    const repoRoot = createSourceRepo({'.ai/plan/x.md': 'present'})
    const stagingRoot = newStagingPath()

    await expect(
      prepareSourceSnapshot({
        repoRoot,
        stagingRoot,
        requiredArtifactPaths: ['.ai/plan/x.md', '.ai/docs/LESSONS_LEARNED.md'],
        capturedAt: '2026-09-07T00:00:00.000Z',
      }),
    ).rejects.toThrow(SourceSnapshotError)

    expect(existsSync(stagingRoot)).toBe(false)
  })

  it('freezes a gitignored artifact from sourceRoot and hashes its bytes', async () => {
    const repoRoot = createSourceRepo({'.gitignore': '.ai/docs/\n'})
    const sourceRoot = mkdtempSync(join(testRootDir, 'source-root-'))
    mkdirSync(join(sourceRoot, '.ai', 'docs'), {recursive: true})
    writeFileSync(join(sourceRoot, '.ai', 'docs', 'LESSONS_LEARNED.md'), 'lessons content')
    const stagingRoot = newStagingPath()

    const result = await prepareSourceSnapshot({
      repoRoot,
      stagingRoot,
      sourceRoot,
      requiredArtifactPaths: ['.ai/docs/LESSONS_LEARNED.md'],
      capturedAt: '2026-09-07T00:00:00.000Z',
    })

    const stagedCopy = join(stagingRoot, 'source-inputs', '.ai', 'docs', 'LESSONS_LEARNED.md')
    expect(readFileSync(stagedCopy, 'utf8')).toBe('lessons content')
    expect(result.provenance.requiredArtifacts).toEqual([
      {
        relativePath: '.ai/docs/LESSONS_LEARNED.md',
        sha256: expect.any(String),
        origin: 'source-root',
      },
    ])
    // The provenance file records only the repo-relative path, never the local sourceRoot machine path.
    expect(JSON.stringify(result.provenance)).not.toContain(sourceRoot)
  })

  it('persists provenance.json under stagingRoot/.bootstrap and it round-trips via loadSourceSnapshotProvenance', async () => {
    const repoRoot = createSourceRepo({'.ai/plan/x.md': 'v1'})
    const stagingRoot = newStagingPath()

    const result = await prepareSourceSnapshot({
      repoRoot,
      stagingRoot,
      requiredArtifactPaths: ['.ai/plan/x.md'],
      capturedAt: '2026-09-07T12:34:56.000Z',
    })

    expect(result.provenancePath).toBe(join(stagingRoot, '.bootstrap', 'provenance.json'))
    expect(existsSync(result.provenancePath)).toBe(true)
    expect(loadSourceSnapshotProvenance(stagingRoot)).toEqual(result.provenance)
    expect(result.provenance.capturedAt).toBe('2026-09-07T12:34:56.000Z')
    expect(result.provenance.pinnedRef).toBe('main')
  })

  it('records a sanitized origin remote URL with credentials stripped, when a remote is configured', async () => {
    const repoRoot = createSourceRepo({'.ai/plan/x.md': 'v1'})
    git(repoRoot, 'remote', 'add', 'origin', 'https://user:secret-token@example.invalid/org/repo.git')
    const stagingRoot = newStagingPath()

    const result = await prepareSourceSnapshot({
      repoRoot,
      stagingRoot,
      requiredArtifactPaths: ['.ai/plan/x.md'],
      capturedAt: '2026-09-07T00:00:00.000Z',
    })

    expect(result.provenance.sourceRemoteUrl).toBe('https://example.invalid/org/repo.git')
    expect(result.provenance.sourceRemoteUrl).not.toContain('secret-token')
  })

  it('leaves repoRoot completely unmodified — no writes, no new git status entries', async () => {
    const repoRoot = createSourceRepo({'.ai/plan/x.md': 'v1'})
    const statusBefore = git(repoRoot, 'status', '--porcelain')
    const stagingRoot = newStagingPath()

    await prepareSourceSnapshot({
      repoRoot,
      stagingRoot,
      requiredArtifactPaths: ['.ai/plan/x.md'],
      capturedAt: '2026-09-07T00:00:00.000Z',
    })

    const statusAfter = git(repoRoot, 'status', '--porcelain')
    expect(statusAfter).toBe(statusBefore)
    expect(statusAfter.trim()).toBe('')
  })

  it('rejects repoRoot that is not a git repository top-level directory', async () => {
    const notARepo = mkdtempSync(join(testRootDir, 'not-a-repo-'))
    await expect(
      prepareSourceSnapshot({
        repoRoot: notARepo,
        stagingRoot: newStagingPath(),
        requiredArtifactPaths: ['a.md'],
        capturedAt: '2026-09-07T00:00:00.000Z',
      }),
    ).rejects.toThrow(SourceSnapshotError)
  })

  it('produces a checkout whose staging root is a genuinely separate directory tree (no symlink/overlap)', async () => {
    const repoRoot = createSourceRepo({'.ai/plan/x.md': 'v1'})
    const stagingRoot = newStagingPath()

    const result = await prepareSourceSnapshot({
      repoRoot,
      stagingRoot,
      requiredArtifactPaths: ['.ai/plan/x.md'],
      capturedAt: '2026-09-07T00:00:00.000Z',
    })

    expect(lstatSync(stagingRoot).isSymbolicLink()).toBe(false)
    expect(result.stagedCheckoutRoot.startsWith(stagingRoot)).toBe(true)
  })
})
