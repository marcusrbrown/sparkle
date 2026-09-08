/**
 * Real-git regression tests for the `.deciduous/sync/**` merge driver wiring
 * documented in readme.md's "Decision graph" section.
 *
 * `.gitattributes` tags `.deciduous/sync/**` with `merge=deciduous`, but Git
 * only consults a `merge.deciduous.driver` command when one is registered
 * locally (`git config merge.deciduous.name`/`merge.deciduous.driver`). This
 * file proves two distinct real-git behaviors with disposable fixture repos
 * (never sparkle's own working tree, never a mocked git):
 *
 * 1. Unregistered driver: Git silently ignores the `merge=deciduous`
 *    attribute and falls back to its standard 3-way text merge, leaving
 *    conflict markers and unmerged index stages on a genuine conflict.
 * 2. Registered driver whose binary is absent from the merge subprocess's
 *    PATH: Git must fail the merge explicitly (nonzero exit, unmerged index,
 *    stderr naming the missing command) rather than silently succeeding
 *    with a one-sided result. This is the failure mode a reviewer flagged as
 *    a risk: a machine with the driver registered (e.g. via a synced
 *    `.git/config` or `include`) but without `deciduous` on `PATH`.
 *
 * The PATH used to force absence is scoped to each merge subprocess call via
 * `execFileAsync(..., {env: {PATH: ...}})` — never `process.env.PATH` — and
 * points only at a symlink to the real, absolute `git` binary. No global
 * PATH, git config, or real repository is touched.
 */

import {execFile} from 'node:child_process'
import {mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, sep} from 'node:path'
import process from 'node:process'
import {promisify} from 'node:util'
import {standardAfterEach, standardBeforeEach} from '@sparkle/test-utils/lifecycle'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'

const execFileAsync = promisify(execFile)

/**
 * `child_process.execFile`'s promisified result type depends on whether an
 * `encoding` option was supplied — with none, Node's typings report
 * `stdout`/`stderr` as `string | Buffer`. Every subprocess call in this file
 * passes `encoding: 'utf8'` explicitly (never a cast) so TypeScript narrows
 * to this concrete, always-string result via the real Node API's own
 * overload resolution.
 */
interface Utf8ExecResult {
  readonly stdout: string
  readonly stderr: string
}

/** Explicit UTF-8 subprocess call shared by every fixture command in this file. */
function execUtf8(
  file: string,
  args: readonly string[],
  options: {cwd?: string; env?: NodeJS.ProcessEnv} = {},
): Promise<Utf8ExecResult> {
  return execFileAsync(file, args, {...options, encoding: 'utf8'})
}

beforeEach(() => {
  standardBeforeEach()
})

afterEach(() => {
  standardAfterEach()
})

/**
 * Test isolation guard: every fixture git repo in this file lives under
 * `os.tmpdir()` (via `mkdtempSync(join(tmpdir(), ...))`), never inside this
 * project's own working tree. Defense-in-depth, not a substitute for that
 * construction.
 */
function assertFixtureRepoDir(repoDir: string): void {
  const real = realpathSync(repoDir)
  const tmpRoot = realpathSync(tmpdir())
  if (!real.startsWith(tmpRoot + sep) && real !== tmpRoot) {
    throw new Error(`refusing to run a fixture git command outside of os.tmpdir(): ${repoDir}`)
  }
}

/** Git subcommands used here that can create a commit object and are subject to `commit.gpgsign`. */
const GPG_SIGNED_COMMIT_SUBCOMMANDS = new Set(['commit', 'merge'])

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
 * Fixture-scoped `git` runner. Disables GPG commit signing
 * (`-c commit.gpgSign=false`) for commit-creating subcommands only, so these
 * disposable repos never depend on the host's real signing configuration.
 * Never touches real repository config; `assertFixtureRepoDir` guards the
 * target path. `env` lets individual calls (the missing-binary case)
 * override the subprocess's PATH without touching `process.env`.
 */
function createFixtureGitRunner(getRepoDir: () => string) {
  return (args: string[], env?: Record<string, string>): Promise<Utf8ExecResult> => {
    const repoDir = getRepoDir()
    assertFixtureRepoDir(repoDir)
    const subcommand = findGitSubcommand(args)
    const finalArgs =
      subcommand !== undefined && GPG_SIGNED_COMMIT_SUBCOMMANDS.has(subcommand)
        ? ['-c', 'commit.gpgSign=false', ...args]
        : args
    return execUtf8('git', finalArgs, {cwd: repoDir, env: env ?? process.env})
  }
}

/** Real, absolute path to the host's git binary (resolved once, not via a mocked PATH lookup). */
async function resolveGitBinary(): Promise<string> {
  const {stdout} = await execUtf8('which', ['git'])
  return stdout.trim()
}

async function writeDivergingConflictFixture(
  run: (args: string[], env?: Record<string, string>) => Promise<Utf8ExecResult>,
  repoDir: string,
): Promise<void> {
  await run(['init', '-q', '-b', 'main'])
  writeFileSync(join(repoDir, '.gitattributes'), '.deciduous/sync/** merge=deciduous\n')
  const recordDir = join(repoDir, '.deciduous', 'sync', 'nodes')
  await execUtf8('mkdir', ['-p', recordDir])
  writeFileSync(join(recordDir, '1.json'), '{"change_id":"1","title":"orig","tags":[]}\n')
  await run(['add', '-A'])
  await run(['-c', 'user.email=t@t.com', '-c', 'user.name=t', 'commit', '-q', '-m', 'base'])

  await run(['checkout', '-q', '-b', 'branchA'])
  writeFileSync(join(recordDir, '1.json'), '{"change_id":"1","title":"orig from A","tags":[]}\n')
  await run(['-c', 'user.email=t@t.com', '-c', 'user.name=t', 'commit', '-q', '-am', 'a'])

  await run(['checkout', '-q', 'main'])
  await run(['checkout', '-q', '-b', 'branchB'])
  writeFileSync(join(recordDir, '1.json'), '{"change_id":"1","title":"orig","tags":["b"]}\n')
  await run(['-c', 'user.email=t@t.com', '-c', 'user.name=t', 'commit', '-q', '-am', 'b'])
}

describe('real-fixture: .deciduous/sync merge driver (readme.md Decision graph section)', () => {
  let repoDir: string
  let run: (args: string[], env?: Record<string, string>) => Promise<Utf8ExecResult>

  beforeEach(() => {
    repoDir = mkdtempSync(join(tmpdir(), 'merge-driver-'))
    run = createFixtureGitRunner(() => repoDir)
  })

  afterEach(() => {
    rmSync(repoDir, {recursive: true, force: true})
  })

  it('falls back to a standard git text conflict when no merge driver is registered locally', async () => {
    await writeDivergingConflictFixture(run, repoDir)

    await expect(run(['merge', '--no-ff', 'branchA', '--no-edit'])).rejects.toMatchObject({code: 1})

    const {stdout: lsFilesOutput} = await run(['ls-files', '-u'])
    const unmergedStages = new Set(
      lsFilesOutput
        .trim()
        .split('\n')
        .filter(line => line.length > 0)
        .map(line => line.split(/\s+/u)[2]),
    )
    expect(unmergedStages).toEqual(new Set(['1', '2', '3']))

    const {stdout: fileContent} = await execUtf8('cat', [join(repoDir, '.deciduous', 'sync', 'nodes', '1.json')])
    expect(fileContent).toContain('<<<<<<<')
    expect(fileContent).toContain('=======')
    expect(fileContent).toContain('>>>>>>>')
  })

  it('fails the merge explicitly, without a silent one-sided result, when the registered driver binary is missing from PATH', async () => {
    await writeDivergingConflictFixture(run, repoDir)
    await run(['config', 'merge.deciduous.name', 'deciduous decision graph record'])
    await run(['config', 'merge.deciduous.driver', 'deciduous merge-record %O %A %B'])

    const gitBinary = await resolveGitBinary()
    const minimalPathDir = mkdtempSync(join(tmpdir(), 'merge-driver-minpath-'))
    symlinkSync(gitBinary, join(minimalPathDir, 'git'))
    const restrictedEnv = {PATH: minimalPathDir, HOME: process.env.HOME ?? ''}

    try {
      await expect(run(['merge', '--no-ff', 'branchA', '--no-edit'], restrictedEnv)).rejects.toMatchObject({
        code: expect.any(Number),
        stderr: expect.stringContaining('deciduous'),
      })

      const {stdout: lsFilesOutput} = await run(['ls-files', '-u'])
      const unmergedStages = new Set(
        lsFilesOutput
          .trim()
          .split('\n')
          .filter(line => line.length > 0)
          .map(line => line.split(/\s+/u)[2]),
      )
      expect(unmergedStages.size).toBeGreaterThan(0)

      // Silent-success guard: the driver never ran, so the working file must
      // still be exactly "ours" (branchB's committed content) — not a
      // fabricated merge result, and not committed as a clean merge.
      const fileContent = (await execUtf8('cat', [join(repoDir, '.deciduous', 'sync', 'nodes', '1.json')], {})).stdout
      expect(fileContent).toBe('{"change_id":"1","title":"orig","tags":["b"]}\n')

      const headMessage = (await run(['log', '-1', '--pretty=%s'])).stdout.trim()
      expect(headMessage).not.toMatch(/^merge/iu)
    } finally {
      rmSync(minimalPathDir, {recursive: true, force: true})
    }
  })

  it('succeeds via a field-level merge when the registered driver binary IS on PATH (positive control)', async () => {
    let deciduousAvailable = true
    try {
      const {stdout} = await execUtf8('deciduous', ['--version'])
      deciduousAvailable = stdout.trim().startsWith('deciduous ')
    } catch {
      deciduousAvailable = false
    }
    if (!deciduousAvailable) {
      console.warn('SKIP: deciduous not on PATH — skipping merge-driver positive control')
      return
    }

    await writeDivergingConflictFixture(run, repoDir)
    await run(['config', 'merge.deciduous.name', 'deciduous decision graph record'])
    await run(['config', 'merge.deciduous.driver', 'deciduous merge-record %O %A %B'])

    const {code} = await run(['merge', '--no-ff', 'branchA', '--no-edit']).then(
      () => ({code: 0}),
      (error: {code?: number}) => ({code: error.code ?? 1}),
    )
    expect(code).toBe(0)

    const {stdout: lsFilesOutput} = await run(['ls-files', '-u'])
    expect(lsFilesOutput.trim()).toBe('')

    const fileContent = (await execUtf8('cat', [join(repoDir, '.deciduous', 'sync', 'nodes', '1.json')])).stdout
    expect(fileContent).toContain('"title": "orig from A"')
    expect(fileContent).toContain('"b"')
  })
})
