/**
 * Tests for scripts/bootstrap-graph/runners.ts's subprocess timeout scoping
 * and bounded, actionable failure classification (timeout/signal vs missing
 * binary vs real nonzero exit), never leaking raw command/argv/source
 * values via the error path.
 *
 * `node:child_process`'s callback-style `execFile` is mocked directly via
 * `vi.doMock` (not `promisify`) since `createDeciduousRunner`/`createGhRunner`
 * call it callback-style, not through `promisify(execFile)`.
 */
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

import {standardAfterEach, standardBeforeEach} from '@sparkle/test-utils/lifecycle'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

beforeEach(() => {
  standardBeforeEach()
})

afterEach(() => {
  standardAfterEach()
  vi.doUnmock('node:child_process')
  vi.resetModules()
})

/** Installs a fake callback-style `execFile` and returns the captured call options for the FIRST call plus a way to trigger the callback with an arbitrary (error, stdout, stderr) result. */
type FakeSubprocessError = Error & {code?: string | number | null; killed?: boolean; signal?: string | null}

function mockExecFile(): {
  captured: {options?: Record<string, unknown>}
  triggerWith: (error: FakeSubprocessError | null, stdout: string, stderr: string) => void
} {
  const captured: {options?: Record<string, unknown>} = {}
  let capturedCallback: ((error: Error | null, stdout: string, stderr: string) => void) | undefined

  const fakeExecFile = (
    _file: string,
    _args: readonly string[],
    options: Record<string, unknown>,
    callback: (error: Error | null, stdout: string, stderr: string) => void,
  ) => {
    captured.options = options
    capturedCallback = callback
  }

  vi.doMock('node:child_process', () => ({execFile: fakeExecFile}))

  return {
    captured,
    triggerWith: (error, stdout, stderr) => {
      capturedCallback?.(error, stdout, stderr)
    },
  }
}

describe('createDeciduousRunner: named sync-specific 60s timeout, all other commands stay at 15s', () => {
  let stagingDir: string

  beforeEach(() => {
    stagingDir = mkdtempSync(join(tmpdir(), 'runners-timeout-test-'))
    mkdirSync(join(stagingDir, '.deciduous'), {recursive: true})
    writeFileSync(join(stagingDir, '.deciduous', 'config.toml'), '')
  })

  afterEach(() => {
    rmSync(stagingDir, {recursive: true, force: true})
  })

  it('a `sync` invocation is given a 60_000ms timeout — the measured real duration (~21.8s) plus headroom', async () => {
    const {captured, triggerWith} = mockExecFile()
    vi.resetModules()
    const {createDeciduousRunner: isolatedCreateDeciduousRunner} = await import('./runners.js')
    const runner = isolatedCreateDeciduousRunner()

    const resultPromise = runner(['sync', '-o', 'docs/public/graph-data.json'], stagingDir)
    triggerWith(null, '', '')
    await resultPromise

    expect(captured.options?.timeout).toBe(60_000)
  })

  it('a non-sync command (e.g. `add`) keeps the general 15_000ms timeout unchanged', async () => {
    const {captured, triggerWith} = mockExecFile()
    vi.resetModules()
    const {createDeciduousRunner: isolatedCreateDeciduousRunner} = await import('./runners.js')
    const runner = isolatedCreateDeciduousRunner()

    const resultPromise = runner(['add', 'decision', 'title'], stagingDir)
    triggerWith(null, 'Created node 1 (fake)', '')
    await resultPromise

    expect(captured.options?.timeout).toBe(15_000)
  })

  it('a `show` command keeps the general 15_000ms timeout unchanged (only `sync` is scoped up)', async () => {
    const {captured, triggerWith} = mockExecFile()
    vi.resetModules()
    const {createDeciduousRunner: isolatedCreateDeciduousRunner} = await import('./runners.js')
    const runner = isolatedCreateDeciduousRunner()

    const resultPromise = runner(['show', '1', '--json'], stagingDir)
    triggerWith(null, '{}', '')
    await resultPromise

    expect(captured.options?.timeout).toBe(15_000)
  })

  it('the output buffer bound (2_000_000 bytes) is unchanged for `sync` as for every other command', async () => {
    const {captured, triggerWith} = mockExecFile()
    vi.resetModules()
    const {createDeciduousRunner: isolatedCreateDeciduousRunner} = await import('./runners.js')
    const runner = isolatedCreateDeciduousRunner()

    const resultPromise = runner(['sync', '-o', 'docs/public/graph-data.json'], stagingDir)
    triggerWith(null, '', '')
    await resultPromise

    expect(captured.options?.maxBuffer).toBe(2_000_000)
  })
})

describe('createGhRunner: unchanged 15s timeout (not scoped up — sync is a deciduous-only concern)', () => {
  it('every gh call keeps the 15_000ms timeout, unaffected by the sync-specific deciduous scoping', async () => {
    const {captured, triggerWith} = mockExecFile()
    vi.resetModules()
    const {createGhRunner: isolatedCreateGhRunner} = await import('./runners.js')
    const runner = isolatedCreateGhRunner()

    const resultPromise = runner(['api', 'graphql'])
    triggerWith(null, '{}', '')
    await resultPromise

    expect(captured.options?.timeout).toBe(15_000)
    expect(captured.options?.maxBuffer).toBe(2_000_000)
  })
})

describe('createDeciduousRunner: bounded, actionable failure classification (never raw error.message/argv leakage)', () => {
  let stagingDir: string

  beforeEach(() => {
    stagingDir = mkdtempSync(join(tmpdir(), 'runners-failure-test-'))
    mkdirSync(join(stagingDir, '.deciduous'), {recursive: true})
    writeFileSync(join(stagingDir, '.deciduous', 'config.toml'), '')
  })

  afterEach(() => {
    rmSync(stagingDir, {recursive: true, force: true})
  })

  it('a simulated timeout kill (error.code=null, error.killed=true, error.signal=SIGTERM) preserves whatever stdout/stderr execFile had already captured before the kill — never discards it', async () => {
    const {triggerWith} = mockExecFile()
    vi.resetModules()
    const {createDeciduousRunner: isolatedCreateDeciduousRunner} = await import('./runners.js')
    const runner = isolatedCreateDeciduousRunner()

    const resultPromise = runner(['sync', '-o', 'docs/public/graph-data.json'], stagingDir)
    const timeoutError = Object.assign(new Error('Command failed: deciduous sync -o docs/public/graph-data.json'), {
      code: null,
      killed: true,
      signal: 'SIGTERM',
    })
    // Real execFile still hands back whatever partial stdout it captured before the kill.
    triggerWith(timeoutError, 'partial output before kill', '')
    const result = await resultPromise

    expect(result.exitCode).toBe(-1)
    expect(result.stdout).toBe('partial output before kill')
  })

  it('a simulated timeout kill produces a bounded, actionable cause (timeout/signal) in the result — never the raw error.message, which could carry full argv/source text', async () => {
    const {triggerWith} = mockExecFile()
    vi.resetModules()
    const {createDeciduousRunner: isolatedCreateDeciduousRunner} = await import('./runners.js')
    const runner = isolatedCreateDeciduousRunner()

    const resultPromise = runner(
      ['add', 'decision', 'a very long PR title with SENSITIVE-SOURCE-TEXT-MARKER embedded'],
      stagingDir,
    )
    const timeoutError = Object.assign(
      new Error(
        'Command failed: deciduous add decision "a very long PR title with SENSITIVE-SOURCE-TEXT-MARKER embedded"',
      ),
      {code: null, killed: true, signal: 'SIGTERM'},
    )
    triggerWith(timeoutError, '', '')
    const result = await resultPromise

    expect(result.exitCode).toBe(-1)
    expect(result.stderr).not.toContain('SENSITIVE-SOURCE-TEXT-MARKER')
    expect(result.stderr.toLowerCase()).toMatch(/timeout|timed out|signal|sigterm/)
  })

  it('a simulated missing-binary spawn failure (ENOENT, not killed) is distinguished from a timeout in the returned actionable cause', async () => {
    const {triggerWith} = mockExecFile()
    vi.resetModules()
    const {createDeciduousRunner: isolatedCreateDeciduousRunner} = await import('./runners.js')
    const runner = isolatedCreateDeciduousRunner('nonexistent-deciduous-binary')

    const resultPromise = runner(['--version'], stagingDir)
    const spawnError = Object.assign(new Error('spawn nonexistent-deciduous-binary ENOENT'), {
      code: 'ENOENT',
      killed: false,
      signal: null,
    })
    triggerWith(spawnError, '', '')
    const result = await resultPromise

    expect(result.exitCode).toBe(-1)
    expect(result.stderr.toLowerCase()).not.toMatch(/timeout|sigterm/)
    expect(result.stderr.toLowerCase()).toMatch(/spawn|start|enoent|missing|not found/)
  })

  it('a real nonzero exit (not a spawn/timeout failure) is unaffected — exitCode/stdout/stderr pass through as before', async () => {
    const {triggerWith} = mockExecFile()
    vi.resetModules()
    const {createDeciduousRunner: isolatedCreateDeciduousRunner} = await import('./runners.js')
    const runner = isolatedCreateDeciduousRunner()

    const resultPromise = runner(['show', '999', '--json'], stagingDir)
    const exitError = Object.assign(new Error('Command failed'), {code: 1, killed: false, signal: null})
    triggerWith(exitError, '', 'node 999 not found')
    const result = await resultPromise

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toBe('node 999 not found')
  })

  it('a real captured non-empty stderr from a killed/timed-out subprocess is preserved as-is, not overwritten by the synthesized actionable cause', async () => {
    const {triggerWith} = mockExecFile()
    vi.resetModules()
    const {createDeciduousRunner: isolatedCreateDeciduousRunner} = await import('./runners.js')
    const runner = isolatedCreateDeciduousRunner()

    const resultPromise = runner(['sync', '-o', 'docs/public/graph-data.json'], stagingDir)
    const timeoutError = Object.assign(new Error('Command failed'), {code: null, killed: true, signal: 'SIGTERM'})
    triggerWith(timeoutError, '', 'real partial stderr before kill')
    const result = await resultPromise

    expect(result.stderr).toBe('real partial stderr before kill')
  })
})
