/**
 * CLI subprocess primitives: bounded, argv-array (never shell-interpolated)
 * runners for `gh` and `deciduous`, plus the staging-isolation and
 * node-identity helpers layered on top of them.
 */
import {execFile} from 'node:child_process'
import {existsSync, mkdirSync, readdirSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'
import process from 'node:process'

/** Result of a single bounded subprocess invocation. Never resolves via shell string interpolation. */
export interface CommandResult {
  readonly exitCode: number
  readonly stdout: string
  readonly stderr: string
}

/** A callable command runner: argv array in, bounded result out. Never shells out via string interpolation. */
export type CommandRunner = (argv: readonly string[], cwd: string) => Promise<CommandResult>

const COMMAND_TIMEOUT_MS = 15_000
const COMMAND_MAX_BUFFER_BYTES = 2_000_000

/**
 * Creates the default, production `gh` command runner used for real
 * merged-PR acquisition: argv array, `shell: false`, bounded timeout and
 * output — the same safety posture as `createDeciduousRunner`. `gh api`/
 * `gh pr view` calls are repo-scoped via their own `--repo`/embedded query
 * arguments, so this runner does not need (and does not set) a source-repo
 * `cwd` — unlike `deciduous`/`git` commands, which do need a specific
 * working directory (the isolated staging checkout) to avoid ancestor-walk
 * or wrong-repo side effects.
 */
export function createGhRunner(): (argv: readonly string[]) => Promise<CommandResult> {
  return async argv =>
    new Promise<CommandResult>(resolvePromise => {
      execFile(
        'gh',
        [...argv],
        {shell: false, timeout: COMMAND_TIMEOUT_MS, maxBuffer: COMMAND_MAX_BUFFER_BYTES},
        (error, stdout, stderr) => {
          if (error !== null && typeof error.code !== 'number') {
            resolvePromise({exitCode: -1, stdout: '', stderr: error.message})
            return
          }
          resolvePromise({exitCode: error === null ? 0 : (error.code as number), stdout, stderr})
        },
      )
    })
}

/**
 * Environment variable names that are safe (and, for several, necessary) to
 * pass through to the `deciduous` subprocess: PATH resolution, `git` author
 * identity fallback, and home-directory-relative config lookups. Everything
 * else from `process.env` is deliberately dropped — this is a passthrough
 * allowlist, not a blocklist, so an unexpected ambient secret in the parent
 * environment is never implicitly forwarded to a subprocess whose stdout we
 * echo back to the caller.
 */
const SAFE_ENV_PASSTHROUGH = [
  'PATH',
  'HOME',
  'USER',
  'USERPROFILE',
  'SHELL',
  'LANG',
  'LC_ALL',
  'TZ',
  'TMPDIR',
  'TEMP',
  'TMP',
] as const

function buildIsolatedEnv(cwd: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}
  for (const name of SAFE_ENV_PASSTHROUGH) {
    const value = process.env[name]
    if (value !== undefined) {
      env[name] = value
    }
  }
  // Defense in depth alongside the local-config assertion below: pin the SQLite
  // cache path explicitly inside cwd so nothing can resolve it elsewhere even
  // if a future deciduous version changes its own path-resolution behavior.
  env.DECIDUOUS_DB_PATH = join(cwd, '.deciduous', 'deciduous.db')
  return env
}

/** The exact pinned `deciduous` binary version this script requires. */
export const PINNED_DECIDUOUS_VERSION = '0.17.1'

/** The four record kinds Deciduous's committed `.deciduous/sync/` record store is organized into. */
export const SYNC_RECORD_SUBDIRS = ['nodes', 'edges', 'themes', 'tags'] as const

/**
 * Creates a real `deciduous` command runner. Every invocation passes an
 * argv array with `shell: false` — commit summaries, PR titles, and PR
 * bodies are external content this script does not otherwise control, so
 * they are never string-interpolated into a shell command. Output and wall
 * time are bounded so a hung or runaway subprocess cannot stall the build.
 *
 * SAFETY: `deciduous`, like `git`, resolves its working state by walking
 * up* from `cwd` to the nearest ancestor directory containing `.deciduous/`
 * — confirmed against the real pinned binary. If `cwd` has no local
 * `.deciduous/config.toml` of its own, an ancestor's real graph (e.g. a
 * source checkout's committed `.deciduous/sync/`) can silently receive
 * writes instead. Every call therefore requires `cwd` to already have its
 * own `.deciduous/config.toml` — callers must run `ensureIsolatedStagingDeciduous`
 * (or otherwise provision it) first; this runner never creates it implicitly,
 * so a caller can't accidentally rely on this function's own fallback
 * behavior to paper over a missing isolation step.
 */
export function createDeciduousRunner(binaryPath = 'deciduous'): CommandRunner {
  return async (argv, cwd) => {
    const localConfigPath = join(cwd, '.deciduous', 'config.toml')
    if (!existsSync(localConfigPath)) {
      throw new Error(
        `refusing to run \`deciduous ${argv[0] ?? ''}\` with cwd=${cwd}: no local .deciduous/config.toml. ` +
          "Running deciduous without a local config lets it ancestor-walk to and mutate a parent directory's " +
          'real graph. Call ensureIsolatedStagingDeciduous(cwd) first.',
      )
    }

    return new Promise<CommandResult>(resolvePromise => {
      execFile(
        binaryPath,
        [...argv],
        {
          cwd,
          shell: false,
          timeout: COMMAND_TIMEOUT_MS,
          maxBuffer: COMMAND_MAX_BUFFER_BYTES,
          env: buildIsolatedEnv(cwd),
        },
        (error, stdout, stderr) => {
          if (error !== null && typeof error.code !== 'number') {
            // Spawn-level failure (binary missing, permission denied, etc.) — never thrown, always
            // surfaced as a bounded result so callers can report a clear, non-crashing error.
            resolvePromise({exitCode: -1, stdout: '', stderr: error.message})
            return
          }
          resolvePromise({exitCode: error === null ? 0 : (error.code as number), stdout, stderr})
        },
      )
    })
  }
}

/**
 * Creates the staging directory's own isolated `.deciduous/config.toml` +
 * `sync/{nodes,edges,themes,tags}` if not already present. Idempotent. Must
 * run before the first `createDeciduousRunner` call against a given cwd —
 * see that function's SAFETY note.
 */
export function ensureIsolatedStagingDeciduous(stagingDir: string): void {
  mkdirSync(stagingDir, {recursive: true})
  for (const subdir of SYNC_RECORD_SUBDIRS) {
    mkdirSync(join(stagingDir, '.deciduous', 'sync', subdir), {recursive: true})
  }
  const configPath = join(stagingDir, '.deciduous', 'config.toml')
  if (!existsSync(configPath)) {
    writeFileSync(configPath, '')
  }
}

/**
 * Verifies the runner's `deciduous --version` output matches the exact
 * pinned version this script requires, failing closed on any mismatch
 * (including "binary not found" and "wrong version").
 */
export async function checkDeciduousVersion(
  runner: CommandRunner,
  cwd: string,
  expectedVersion = PINNED_DECIDUOUS_VERSION,
): Promise<{ok: boolean; actual?: string}> {
  const result = await runner(['--version'], cwd)
  const actual = result.stdout.trim()
  return {ok: result.exitCode === 0 && actual === `deciduous ${expectedVersion}`, actual}
}

const CREATED_NODE_LINE = /^Created node (\d+)/m

/** Parses the local node id out of `deciduous add`'s "Created node N (...)" stdout line. */
export function parseCreatedNodeLocalId(stdout: string): number | undefined {
  const match = CREATED_NODE_LINE.exec(stdout)
  const id = match?.[1]
  return id === undefined ? undefined : Number(id)
}

/**
 * Resolves a node's durable `change_id` by its local id via `deciduous show
 * --json` — collision-safe identity capture. Titles are legitimately
 * non-unique (Deciduous allows duplicate titles), so a node's identity is
 * never inferred from its title; only the local id assigned at creation
 * time, immediately queried back, is trusted.
 */
export async function getNodeChangeId(runner: CommandRunner, cwd: string, localId: number): Promise<string> {
  const result = await runner(['show', String(localId), '--json'], cwd)
  if (result.exitCode !== 0) {
    throw new Error(`deciduous show ${localId} --json failed (exit ${result.exitCode})`)
  }
  const parsed: unknown = JSON.parse(result.stdout)
  const changeId = (parsed as {change_id?: unknown}).change_id
  if (typeof changeId !== 'string') {
    throw new TypeError(`deciduous show ${localId} --json did not return a change_id`)
  }
  return changeId
}

const GITHUB_REMOTE_PATTERN = /github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/

/**
 * Resolves the `owner/repo` to use for real merged-PR acquisition: an
 * explicit `--github-repo owner/repo` flag wins; otherwise falls back to
 * parsing the frozen snapshot's sanitized `origin` remote URL (HTTPS or SSH
 * form). Returns `undefined` (never a guess) when neither resolves —
 * callers must then either fail closed or require an explicit fixture.
 */
export function resolveGithubOwnerRepo(
  explicit: string | undefined,
  sourceRemoteUrl: string | undefined,
): {owner: string; repo: string} | undefined {
  if (explicit !== undefined) {
    const [owner, repo] = explicit.split('/')
    if (owner !== undefined && repo !== undefined && owner.length > 0 && repo.length > 0) {
      return {owner, repo}
    }
    return undefined
  }
  if (sourceRemoteUrl === undefined) {
    return undefined
  }
  const match = GITHUB_REMOTE_PATTERN.exec(sourceRemoteUrl)
  const owner = match?.[1]
  const repo = match?.[2]
  return owner === undefined || repo === undefined ? undefined : {owner, repo}
}

/**
 * Refuses to build against a `--repo` whose OWN `.deciduous/sync/` already
 * has real, non-empty graph records — regardless of staging-directory
 * isolation. `.deciduous/config.toml` and `.deciduous/sync/README.md` (both
 * legitimately present after a plain `deciduous init`) are ignored; only
 * actual `nodes/edges/themes/tags/*.json` record files count. This protects
 * the source side of the caller-supplied checkout/destination distinction:
 * `--repo` must be a source to read from, never an already-seeded real graph
 * a build could get confused with.
 */
export function checkRepoGraphNotAlreadySeeded(repoRoot: string): string | undefined {
  for (const subdir of SYNC_RECORD_SUBDIRS) {
    const dirPath = join(repoRoot, '.deciduous', 'sync', subdir)
    if (!existsSync(dirPath)) {
      continue
    }
    const recordFiles = readdirSync(dirPath, {withFileTypes: true}).filter(
      entry => entry.isFile() && entry.name.endsWith('.json'),
    )
    if (recordFiles.length > 0) {
      return `--repo's own .deciduous/sync/${subdir}/ already has ${recordFiles.length} real graph record(s) — refusing to build against an already-seeded source repository`
    }
  }
  return undefined
}
