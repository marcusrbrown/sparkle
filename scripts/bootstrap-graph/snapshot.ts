/**
 * Source snapshot preparation for the decision-graph bootstrap.
 *
 * `prepareSourceSnapshot()` freezes a specific, pinned point in the source
 * repository's history into an isolated, persistent staging checkout, so the
 * rest of the bootstrap (triage/git-log/PR-body passes, validate, promote —
 * all owned by sibling modules) always operates against fixed bytes instead
 * of a live, potentially-dirty working tree.
 *
 * This module is intentionally self-contained: it does not import runtime
 * values from `../bootstrap-graph.ts` (the pre-existing monolithic script) to
 * avoid coupling to a file under concurrent edit by a parallel lane and to
 * avoid any accidental side effects from that module's top-level code. Only
 * plain data types are defined here, for the eventual integrating caller to
 * import via `import type`.
 */

import type {Buffer} from 'node:buffer'
import {execFile} from 'node:child_process'
import {createHash} from 'node:crypto'
import {
  accessSync,
  existsSync,
  constants as fsConstants,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import {basename, dirname, isAbsolute, join, relative, resolve, sep} from 'node:path'
import process from 'node:process'
import {promisify} from 'node:util'

const execFileAsync = promisify(execFile)

/**
 * A single artifact path the caller requires to be present in the snapshot,
 * expressed relative to `repoRoot`. The bootstrap's triage parser is the
 * intended source of this list in production — this module does not
 * hardcode or assume any particular count or set of paths.
 */
export type RequiredArtifactPath = string

export interface SourceSnapshotOptions {
  /** Absolute path to the source repository's working directory. Read-only — never written to. */
  repoRoot: string
  /**
   * Absolute path to a NEW, persistent staging directory. Must not already
   * exist, must not be a symlink, and must not overlap `repoRoot` or
   * `sourceRoot` (in either direction).
   */
  stagingRoot: string
  /**
   * Git ref to pin the snapshot to (branch name, tag, or SHA). Resolved to a
   * concrete commit SHA before anything is written, so a later move of the
   * named ref in `repoRoot` cannot affect an already-prepared snapshot.
   * Defaults to `'main'`.
   */
  pinnedRef?: string
  /**
   * Absolute path to an existing checkout where gitignored required
   * artifacts are present on disk (e.g. a real local clone), used only as a
   * fallback for artifacts not resolvable from the pinned commit's tree.
   */
  sourceRoot?: string
  /**
   * Repo-relative paths the caller requires to be frozen into the snapshot.
   * May be empty (e.g. a build ingesting only commits/PRs with no triage
   * artifacts yet) — an empty list is a legitimate input, not an error.
   */
  requiredArtifactPaths: readonly RequiredArtifactPath[]
  /** ISO 8601 timestamp recorded as the snapshot's capture time. */
  capturedAt: string
}

export type ArtifactOrigin = 'tracked' | 'source-root'

export interface ResolvedArtifactProvenance {
  relativePath: string
  sha256: string
  origin: ArtifactOrigin
}

export interface SourceSnapshotProvenance {
  pinnedRef: string
  resolvedSha: string
  capturedAt: string
  /** Sanitized (credential-stripped) `origin` remote URL of `repoRoot`, if one is configured. */
  sourceRemoteUrl: string | undefined
  requiredArtifacts: ResolvedArtifactProvenance[]
}

export interface SourceSnapshotResult {
  /**
   * Absolute path to the isolated, pinned-SHA git checkout — this IS `stagingRoot` itself (the
   * clone is written directly into it, not a nested subdirectory), so a caller running further
   * commands against this same directory gets both a real `.git` and a single, consistent cwd.
   */
  stagedCheckoutRoot: string
  /** Absolute path to the persisted provenance JSON file. */
  provenancePath: string
  provenance: SourceSnapshotProvenance
}

/**
 * Raised for any validation failure that must block `prepareSourceSnapshot`
 * before it writes anything. A dedicated `Error` subclass (not a plain
 * `Error`) so callers can distinguish snapshot-precondition failures from
 * unexpected I/O/git errors without string-matching messages.
 * eslint-disable-next-line no-restricted-syntax -- Error subclass, not a namespace/utility-bag; a factory function could not extend the built-in Error prototype chain as cleanly for `instanceof` checks.
 */
export class SourceSnapshotError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SourceSnapshotError'
  }
}

const PROVENANCE_RELATIVE_PATH = join('.bootstrap', 'provenance.json')
const SOURCE_INPUTS_DIRECTORY_NAME = 'source-inputs'
const GIT_COMMAND_TIMEOUT_MS = 30_000
const GIT_COMMAND_MAX_BUFFER_BYTES = 4_000_000

interface ArtifactResolution {
  relativePath: string
  origin: ArtifactOrigin
}

/**
 * Restricted, non-interactive environment for git invocations. Deliberately
 * does not set `GIT_AUTHOR_NAME`/`GIT_AUTHOR_EMAIL`/`user.name`/`user.email`
 * — no commits are ever made by this module, and any already-configured
 * identity is used as-is rather than invented.
 */
function buildIsolatedGitEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    GIT_TERMINAL_PROMPT: '0',
    GIT_PAGER: 'cat',
    GIT_ASKPASS: 'true',
  }
}

async function runGit(argv: readonly string[], cwd: string): Promise<{stdout: string; stderr: string}> {
  try {
    const {stdout, stderr} = await execFileAsync('git', [...argv], {
      cwd,
      env: buildIsolatedGitEnv(),
      timeout: GIT_COMMAND_TIMEOUT_MS,
      maxBuffer: GIT_COMMAND_MAX_BUFFER_BYTES,
      shell: false,
      windowsHide: true,
    })
    return {stdout, stderr}
  } catch (error) {
    const execError = error as {stdout?: string; stderr?: string; message: string}
    throw new SourceSnapshotError(
      `git ${argv.join(' ')} (cwd=${cwd}) failed: ${execError.stderr?.trim() ?? execError.message}`,
    )
  }
}

function sha256OfBuffer(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex')
}

function sha256OfFile(absolutePath: string): string {
  return sha256OfBuffer(readFileSync(absolutePath))
}

/** True if `child` is `parent` or nested inside it, comparing resolved (symlink-free where possible) paths. */
function isPathWithinOrEqual(parent: string, child: string): boolean {
  const relativePath = relative(parent, child)
  return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath))
}

/**
 * Resolves a path for containment comparison, realpath-resolving symlinks in
 * the nearest EXISTING ancestor and reappending any not-yet-created suffix
 * segments unchanged. Plain `realpathSync`/`resolve()` alone would compare
 * inconsistently whenever one side of a comparison exists (e.g. a tmpdir
 * whose OS-level path is itself a symlink, such as macOS's `/tmp` ->
 * `/private/tmp`) and the other does not yet exist.
 */
function resolveForComparison(path: string): string {
  const suffixParts: string[] = []
  let current = resolve(path)
  while (!existsSync(current)) {
    const parent = dirname(current)
    if (parent === current) break
    suffixParts.unshift(basename(current))
    current = parent
  }
  const resolvedBase = existsSync(current) ? realpathSync(current) : current
  return suffixParts.length > 0 ? join(resolvedBase, ...suffixParts) : resolvedBase
}

function assertNotSymlink(path: string, label: string): void {
  if (existsSync(path) && lstatSync(path).isSymbolicLink()) {
    throw new SourceSnapshotError(`${label} must not be a symlink: ${path}`)
  }
}

/**
 * Validates that `stagingRoot` is a genuinely new, non-overlapping directory
 * relative to `repoRoot` and (if provided) `sourceRoot`. Throws before any
 * write occurs.
 */
export function assertStagingIsolation(input: {repoRoot: string; stagingRoot: string; sourceRoot?: string}): void {
  const {repoRoot, stagingRoot, sourceRoot} = input

  if (!isAbsolute(repoRoot)) throw new SourceSnapshotError(`repoRoot must be an absolute path: ${repoRoot}`)
  if (!isAbsolute(stagingRoot)) throw new SourceSnapshotError(`stagingRoot must be an absolute path: ${stagingRoot}`)
  if (sourceRoot !== undefined && !isAbsolute(sourceRoot))
    throw new SourceSnapshotError(`sourceRoot must be an absolute path: ${sourceRoot}`)

  assertNotSymlink(stagingRoot, 'stagingRoot')

  const repoRootResolved = resolveForComparison(repoRoot)
  const sourceRootResolved = sourceRoot === undefined ? undefined : resolveForComparison(sourceRoot)
  // stagingRoot does not exist yet — resolveForComparison walks up to its nearest existing
  // ancestor, realpath-resolves that, and reappends the not-yet-created suffix, so this stays
  // consistent with the (already-existing) repoRoot/sourceRoot resolutions above.
  const stagingRootResolved = resolveForComparison(stagingRoot)

  if (
    isPathWithinOrEqual(repoRootResolved, stagingRootResolved) ||
    isPathWithinOrEqual(stagingRootResolved, repoRootResolved)
  ) {
    throw new SourceSnapshotError(
      `staging isolation violation: stagingRoot must not be inside, equal to, or an ancestor of repoRoot (repoRoot=${repoRoot}, stagingRoot=${stagingRoot})`,
    )
  }

  if (
    sourceRootResolved !== undefined &&
    (isPathWithinOrEqual(sourceRootResolved, stagingRootResolved) ||
      isPathWithinOrEqual(stagingRootResolved, sourceRootResolved))
  ) {
    throw new SourceSnapshotError(
      `staging isolation violation: stagingRoot must not be inside, equal to, or an ancestor of sourceRoot (sourceRoot=${sourceRoot}, stagingRoot=${stagingRoot})`,
    )
  }

  // Checked last: an isolation (overlap/containment) violation is the more specific,
  // security-relevant reason and must be reported even when the path also happens to already
  // exist (e.g. a caller pre-created a nested directory for its own unrelated purposes). An
  // EXISTING-but-EMPTY directory is accepted (common caller pattern: `mkdtemp()` then populate),
  // but any pre-existing content refuses — there is genuinely a tree there that must not be
  // silently reused/overwritten.
  if (existsSync(stagingRoot)) {
    if (!statSync(stagingRoot).isDirectory()) {
      throw new SourceSnapshotError(`stagingRoot exists and is not a directory: ${stagingRoot}`)
    }
    if (readdirSync(stagingRoot).length > 0) {
      throw new SourceSnapshotError(
        `stagingRoot already exists and is non-empty — must not be reused/overwritten: ${stagingRoot}`,
      )
    }
  }
}

/** Confirms `repoRoot` is itself a git repository's top-level working directory. */
async function assertGitRoot(repoRoot: string): Promise<void> {
  const {stdout} = await runGit(['rev-parse', '--show-toplevel'], repoRoot)
  const reportedRoot = resolveForComparison(stdout.trim())
  const expectedRoot = resolveForComparison(repoRoot)
  if (reportedRoot !== expectedRoot) {
    throw new SourceSnapshotError(
      `repoRoot is not a git repository top-level directory (repoRoot=${repoRoot}, git top-level=${stdout.trim()})`,
    )
  }
}

/**
 * Resolves `pinnedRef` to a concrete commit SHA in `repoRoot`, without
 * touching the working tree. Throws an actionable error naming shallow-clone
 * as a likely cause when the ref cannot be resolved to a commit.
 */
async function resolvePinnedSha(repoRoot: string, pinnedRef: string): Promise<string> {
  try {
    const {stdout} = await runGit(['rev-parse', '--verify', `${pinnedRef}^{commit}`], repoRoot)
    return stdout.trim()
  } catch (error) {
    let shallowHint = ''
    try {
      const {stdout: shallowStdout} = await runGit(['rev-parse', '--is-shallow-repository'], repoRoot)
      if (shallowStdout.trim() === 'true') {
        shallowHint =
          ' repoRoot is a shallow clone — unshallow it (e.g. `git fetch --unshallow`) or fetch full history before snapshotting; this module performs no network operations itself.'
      }
    } catch {
      // Best-effort hint only; ignore failures probing shallow status.
    }
    throw new SourceSnapshotError(
      `pinnedRef "${pinnedRef}" could not be resolved to a commit in ${repoRoot}: ${
        (error as Error).message
      }.${shallowHint}`,
    )
  }
}

/** Returns the sanitized (credential-stripped) `origin` remote URL, or `undefined` if none is configured. */
async function getSanitizedOriginUrl(repoRoot: string): Promise<string | undefined> {
  try {
    const {stdout} = await runGit(['remote', 'get-url', 'origin'], repoRoot)
    const url = stdout.trim()
    return url.replaceAll(/(\w+:\/\/)[^/@\s]+@/g, '$1')
  } catch {
    return undefined
  }
}

/** True if `relativePath` exists in the tree of commit `sha` within `repoRoot`. */
async function isTrackedAtSha(repoRoot: string, sha: string, relativePath: string): Promise<boolean> {
  try {
    await runGit(['cat-file', '-e', `${sha}:${relativePath}`], repoRoot)
    return true
  } catch {
    return false
  }
}

function assertSafeRelativeArtifactPath(relativePath: string): void {
  if (isAbsolute(relativePath) || relativePath.split(/[/\\]/).includes('..')) {
    throw new SourceSnapshotError(`required artifact path must be a safe repo-relative path: ${relativePath}`)
  }
}

/**
 * Resolves a source-root-relative artifact path, enforcing containment
 * (no `..` escape, no symlink) before any read. Returns the absolute path
 * once validated.
 */
function resolveSourceRootArtifact(sourceRoot: string, relativePath: string): string {
  const resolved = resolve(sourceRoot, relativePath)
  const resolvedForComparison = resolveForComparison(resolved)
  const sourceRootResolved = resolveForComparison(sourceRoot)
  if (!resolvedForComparison.startsWith(sourceRootResolved + sep) && resolvedForComparison !== sourceRootResolved) {
    throw new SourceSnapshotError(
      `required artifact path escapes sourceRoot (sourceRoot=${sourceRoot}, relativePath=${relativePath})`,
    )
  }
  assertNotSymlink(resolved, `sourceRoot artifact "${relativePath}"`)
  if (!existsSync(resolved) || !statSync(resolved).isFile()) {
    throw new SourceSnapshotError(`required artifact not found under sourceRoot: ${relativePath}`)
  }
  try {
    accessSync(resolved, fsConstants.R_OK)
  } catch {
    throw new SourceSnapshotError(`required artifact is not readable under sourceRoot: ${relativePath}`)
  }
  return resolved
}

/**
 * Validates, without writing anything, that every required artifact is
 * resolvable either from the pinned commit's tree or from `sourceRoot`.
 * Exported standalone so a caller (or the build stage) can preflight input
 * availability before deciding to invoke `prepareSourceSnapshot` at all.
 */
export async function preflightRequiredArtifacts(input: {
  repoRoot: string
  pinnedSha: string
  sourceRoot?: string
  requiredArtifactPaths: readonly RequiredArtifactPath[]
}): Promise<{ok: true; resolutions: ArtifactResolution[]} | {ok: false; missing: string[]}> {
  const {repoRoot, pinnedSha, sourceRoot, requiredArtifactPaths} = input
  const resolutions: ArtifactResolution[] = []
  const missing: string[] = []

  for (const relativePath of requiredArtifactPaths) {
    try {
      assertSafeRelativeArtifactPath(relativePath)
    } catch {
      missing.push(relativePath)
      continue
    }

    const tracked = await isTrackedAtSha(repoRoot, pinnedSha, relativePath)
    if (tracked) {
      resolutions.push({relativePath, origin: 'tracked'})
      continue
    }

    if (sourceRoot !== undefined) {
      try {
        resolveSourceRootArtifact(sourceRoot, relativePath)
        resolutions.push({relativePath, origin: 'source-root'})
        continue
      } catch {
        // Falls through to "missing" below.
      }
    }

    missing.push(relativePath)
  }

  if (missing.length > 0) {
    return {ok: false, missing}
  }
  return {ok: true, resolutions}
}

async function cloneAndCheckout(repoRoot: string, checkoutDir: string, sha: string): Promise<void> {
  // Clones directly INTO stagingRoot (not a `checkout/` sibling subdirectory): callers that also
  // run `deciduous` commands against this same directory (e.g. the bootstrap's build stage) need
  // a single cwd that has both a real `.git` (so `deciduous sync`'s git-history export reflects
  // real commit data — confirmed empirically: it reads `git log` at its own cwd, not node
  // metadata) and its own `.deciduous/config.toml`. `git clone` accepts an existing, empty target
  // directory, which is exactly what `assertStagingIsolation` guarantees stagingRoot already is.
  await runGit(['clone', '--local', '--no-hardlinks', '--', repoRoot, checkoutDir], dirname(checkoutDir))
  await runGit(['checkout', '--detach', sha], checkoutDir)
}

function readTrackedArtifactBytes(checkoutDir: string, relativePath: string): Buffer {
  assertSafeRelativeArtifactPath(relativePath)
  const absolutePath = resolve(checkoutDir, relativePath)
  const absolutePathResolved = resolveForComparison(absolutePath)
  const checkoutDirResolved = resolveForComparison(checkoutDir)
  if (!absolutePathResolved.startsWith(checkoutDirResolved + sep) && absolutePathResolved !== checkoutDirResolved) {
    throw new SourceSnapshotError(`required artifact path escapes stagedCheckoutRoot: ${relativePath}`)
  }
  return readFileSync(absolutePath)
}

function copySourceRootArtifactIntoStaging(sourceRoot: string, relativePath: string, stagingRoot: string): Buffer {
  const sourceAbsolutePath = resolveSourceRootArtifact(sourceRoot, relativePath)
  const destinationPath = join(stagingRoot, SOURCE_INPUTS_DIRECTORY_NAME, relativePath)
  mkdirSync(dirname(destinationPath), {recursive: true})
  const bytes = readFileSync(sourceAbsolutePath)
  writeFileSync(destinationPath, bytes)
  return bytes
}

function writeProvenance(stagingRoot: string, provenance: SourceSnapshotProvenance): string {
  const provenancePath = join(stagingRoot, PROVENANCE_RELATIVE_PATH)
  if (existsSync(provenancePath)) {
    throw new SourceSnapshotError(`refusing to overwrite existing provenance file: ${provenancePath}`)
  }
  mkdirSync(dirname(provenancePath), {recursive: true})
  writeFileSync(provenancePath, `${JSON.stringify(provenance, undefined, 2)}\n`)
  return provenancePath
}

/**
 * Freezes a pinned point in `repoRoot`'s history, plus every required
 * artifact's bytes, into a new, isolated, persistent staging checkout.
 *
 * Validation (git-root check, ref resolution, staging isolation, and
 * required-artifact resolvability) happens entirely before any filesystem
 * write. On any validation failure, `stagingRoot` is never created.
 */
export async function prepareSourceSnapshot(options: SourceSnapshotOptions): Promise<SourceSnapshotResult> {
  const {repoRoot, stagingRoot, sourceRoot, requiredArtifactPaths, capturedAt} = options
  const pinnedRef = options.pinnedRef ?? 'main'

  // --- Validate (read-only; no writes below this block may happen until every check passes) ---
  // Isolation is checked first, unconditionally — a caller error like pointing --staging-dir
  // inside --repo must be caught even when requiredArtifactPaths is empty (a legitimate case: a
  // repo with no ARCHIVE-classified triage artifacts yet, ingesting only commits/PRs).
  assertStagingIsolation({repoRoot, stagingRoot, sourceRoot})
  await assertGitRoot(repoRoot)
  const resolvedSha = await resolvePinnedSha(repoRoot, pinnedRef)

  const preflight = await preflightRequiredArtifacts({
    repoRoot,
    pinnedSha: resolvedSha,
    sourceRoot,
    requiredArtifactPaths,
  })
  if (!preflight.ok) {
    throw new SourceSnapshotError(
      `required artifact(s) not resolvable from the pinned commit or sourceRoot: ${preflight.missing.join(', ')}`,
    )
  }

  const sourceRemoteUrl = await getSanitizedOriginUrl(repoRoot)

  // --- Write (validation above has already passed for every required artifact) ---
  // stagingRoot itself becomes the pinned checkout (see cloneAndCheckout's comment) — not a
  // `checkout/` subdirectory — so a single cwd serves both git and Deciduous.
  mkdirSync(stagingRoot, {recursive: true})
  const checkoutDir = stagingRoot
  await cloneAndCheckout(repoRoot, checkoutDir, resolvedSha)

  const requiredArtifacts: ResolvedArtifactProvenance[] = preflight.resolutions.map(resolution => {
    const bytes =
      resolution.origin === 'tracked'
        ? readTrackedArtifactBytes(checkoutDir, resolution.relativePath)
        : copySourceRootArtifactIntoStaging(sourceRoot as string, resolution.relativePath, stagingRoot)
    return {
      relativePath: resolution.relativePath,
      sha256: sha256OfBuffer(bytes),
      origin: resolution.origin,
    }
  })

  const provenance: SourceSnapshotProvenance = {
    pinnedRef,
    resolvedSha,
    capturedAt,
    sourceRemoteUrl,
    requiredArtifacts,
  }
  const provenancePath = writeProvenance(stagingRoot, provenance)

  return {stagedCheckoutRoot: checkoutDir, provenancePath, provenance}
}

/** Reads back a previously written snapshot provenance file, or `undefined` if none exists. */
export function loadSourceSnapshotProvenance(stagingRoot: string): SourceSnapshotProvenance | undefined {
  const provenancePath = join(stagingRoot, PROVENANCE_RELATIVE_PATH)
  if (!existsSync(provenancePath)) return undefined
  return JSON.parse(readFileSync(provenancePath, 'utf8')) as SourceSnapshotProvenance
}

/**
 * Resolves the absolute path a required artifact was frozen to under
 * `stagingRoot`, for callers that need to read a specific artifact's staged
 * bytes (e.g. to pass to `deciduous doc attach`). Keeps the `checkout/` vs
 * `source-inputs/` layout as an implementation detail owned by this module
 * rather than something every caller has to re-derive.
 */
export function resolveStagedArtifactPath(
  stagingRoot: string,
  artifact: Pick<ResolvedArtifactProvenance, 'relativePath' | 'origin'>,
): string {
  // Tracked artifacts live directly under stagingRoot (which IS the pinned checkout); only the
  // --source-root fallback copies get their own subdirectory, since they aren't part of the git
  // clone's tree at all.
  return artifact.origin === 'tracked'
    ? join(stagingRoot, artifact.relativePath)
    : join(stagingRoot, SOURCE_INPUTS_DIRECTORY_NAME, artifact.relativePath)
}

export {sha256OfFile}
