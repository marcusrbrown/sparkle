/**
 * Filesystem safety primitives: staging-directory isolation, path
 * containment (traversal/symlink-escape refusal), and pre-attach byte
 * validation.
 */
import {existsSync, readFileSync, realpathSync, statSync} from 'node:fs'
import {dirname, resolve, sep} from 'node:path'

import {scanTextForSecrets} from './secrets.js'

/** Result of `assertStagingIsolation`'s overlap/containment check. */
export interface StagingIsolationResult {
  readonly ok: boolean
  readonly reason?: string
}

function realOrAbsolute(path: string): string {
  return existsSync(path) ? realpathSync(path) : resolve(path)
}

function pathsOverlap(a: string, b: string): boolean {
  return a === b || a.startsWith(b + sep) || b.startsWith(a + sep)
}

/**
 * Refuses a staging directory that is nested inside, identical to, or
 * contains the source repo or (when provided) the promote destination —
 * including via a symlink, since both sides are resolved with `realpathSync`
 * first. This is the check `runCli`'s `build` command runs before anything
 * else, closing the ancestor-walk hole at the boundary a caller actually
 * controls (their own `--staging-dir`/`--repo`/`--destination` choices).
 */
export function assertStagingIsolation(input: {
  stagingDir: string
  sourceRepo: string
  destination?: string
}): StagingIsolationResult {
  const staging = realOrAbsolute(input.stagingDir)
  const source = realOrAbsolute(input.sourceRepo)

  if (pathsOverlap(staging, source)) {
    return {ok: false, reason: `staging directory (${input.stagingDir}) overlaps the source repo (${input.sourceRepo})`}
  }

  if (input.destination !== undefined) {
    const destination = realOrAbsolute(input.destination)
    if (pathsOverlap(staging, destination)) {
      return {
        ok: false,
        reason: `staging directory (${input.stagingDir}) overlaps the promote destination (${input.destination})`,
      }
    }
  }

  return {ok: true}
}

/**
 * Resolves `relativePath` against `root` and throws if the result would
 * escape `root` — via a `../` traversal or a symlink inside `root` that
 * points outside it. Used for every fixture/staging/destination path this
 * script touches, so a crafted input path or a symlink cannot cause a write
 * outside the intended sandbox.
 */
export function resolveWithinRoot(root: string, relativePath: string): string {
  const realRoot = realpathSync(root)
  const candidate = resolve(realRoot, relativePath)

  // Resolve symlinks along the candidate's existing ancestor chain (the
  // candidate itself may not exist yet, e.g. a promotion destination file).
  let real = candidate
  let probe = candidate
  while (!existsSync(probe)) {
    const parent = dirname(probe)
    if (parent === probe) {
      break
    }
    probe = parent
  }
  if (existsSync(probe)) {
    const realProbe = realpathSync(probe)
    real = probe === candidate ? realProbe : realProbe + candidate.slice(probe.length)
  }

  if (real !== realRoot && !real.startsWith(realRoot + sep)) {
    throw new Error(`path escapes root: ${relativePath}`)
  }
  return real
}

/** Result of validating an attachment's raw bytes before `doc attach` is invoked. */
export interface AttachmentValidationResult {
  readonly ok: boolean
  readonly reason?: string
}

const DEFAULT_MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024

/**
 * Validates an attachment's own bytes before `deciduous doc attach` is
 * invoked: existence, non-empty, size budget, valid UTF-8 decoding (required
 * artifacts are markdown — no MIME-sniffing library needed for that), and a
 * full secret scan over the raw decoded content. A clean scrubbed summary is
 * not a substitute for checking the original bytes Deciduous is about to
 * copy unchanged into `.deciduous/documents/`. Fails closed on every check:
 * a caught secret never surfaces the matched value, only the rule name.
 */
export function validateAttachmentBytes(
  filePath: string,
  options: {maxBytes?: number} = {},
): AttachmentValidationResult {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_ATTACHMENT_BYTES

  if (!existsSync(filePath)) {
    return {ok: false, reason: 'file not found'}
  }

  const stats = statSync(filePath)
  if (!stats.isFile()) {
    return {ok: false, reason: 'not a regular file'}
  }
  if (stats.size === 0) {
    return {ok: false, reason: 'file is empty'}
  }
  if (stats.size > maxBytes) {
    return {ok: false, reason: `file size ${stats.size} exceeds the ${maxBytes}-byte budget`}
  }

  const raw = readFileSync(filePath)

  let decoded: string
  try {
    decoded = new TextDecoder('utf-8', {fatal: true}).decode(raw)
  } catch {
    return {ok: false, reason: 'invalid UTF-8 encoding'}
  }

  const secretMatches = scanTextForSecrets(decoded)
  if (secretMatches.length > 0) {
    return {ok: false, reason: `matched secret rule "${secretMatches[0]?.rule}"`}
  }

  return {ok: true}
}
