/**
 * Staged-content immutability and the review-binding scopes derived from it:
 * content-hash capture/re-verification, the managed (copy/publication)
 * scope, and the bound (validation-input superset) scope used to gate
 * `accept`'s digest and `promote`'s pre-write drift check.
 */
import {createHash} from 'node:crypto'
import {existsSync, readdirSync, readFileSync, realpathSync} from 'node:fs'
import {join, relative, sep} from 'node:path'

import {resolveWithinRoot} from './fs-safety.js'
import {PROVENANCE_RELATIVE_PATH} from './provenance.js'
import {loadSourceSnapshotProvenance, resolveStagedArtifactPath} from './snapshot.js'

/** The two real, already-public-tracked source documents the ONE approved `ReviewedAssociationMapping` (AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001) reads. Threaded through the SAME `prepareSourceSnapshot` required-artifact mechanism as the triage report's 16 inputs (pinned-SHA resolution, staging isolation, byte hashing) — never a bespoke second loading path or a new CLI flag. Kept structurally separate from `triageArtifacts` so the production triage input count is never weakened by this addition. */
export const SOURCE_EVIDENCE_ARTIFACT_PATHS = [
  '.ai/plan/refactor-audit-improvements-1.md',
  '.ai/audit/audit-final-report.md',
] as const

/** The two exact publication targets `deciduous sync --output` writes; the only non-record-store files this script ever promotes. */
export const EXPORT_RELATIVE_PATHS = ['docs/public/graph-data.json', 'docs/public/git-history.json'] as const

/** Matches a single node/edge/theme/tag JSON record's relative path under `.deciduous/sync/`. */
export const MANAGED_RECORD_PATH = /^\.deciduous\/sync\/(?:nodes|edges|themes|tags)\/[^/]+\.json$/

/** The reviewed staged output's file inventory, captured at the end of Stage 2. */
export interface StagedInventory {
  /** Relative path -> content hash, for every staged file. */
  readonly files: Record<string, string>
}

function listFilesRecursively(root: string, currentDir: string): string[] {
  const entries = readdirSync(currentDir, {withFileTypes: true})
  return entries.flatMap(entry => {
    const absolute = resolveWithinRoot(root, relative(root, join(currentDir, entry.name)))
    if (entry.isDirectory()) {
      return listFilesRecursively(root, absolute)
    }
    return entry.isFile() ? [absolute] : []
  })
}

function sha256File(filePath: string): string {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex')
}

/**
 * Captures a content hash for every file in the staging directory, at the
 * end of Stage 2 (validate) before Stage 3 (human review) begins. Paths are
 * resolved through `resolveWithinRoot` so a symlink inside the staging
 * directory cannot smuggle an outside file into the captured inventory.
 */
export function captureStagedInventory(stagingDir: string): StagedInventory {
  const root = realpathSync(stagingDir)
  const files: Record<string, string> = {}
  for (const absolutePath of listFilesRecursively(root, root)) {
    const relativePath = relative(root, absolutePath).split(sep).join('/')
    files[relativePath] = sha256File(absolutePath)
  }
  return {files}
}

/**
 * Re-verifies the staging directory's current content hashes against a
 * previously captured inventory. Promotion (Stage 4) calls this before
 * touching the destination at all — reviewed bytes cannot silently change
 * between review and a later promotion attempt.
 */
export function verifyStagedInventoryUnchanged(
  stagingDir: string,
  captured: StagedInventory,
): {ok: boolean; changedPaths: string[]} {
  const current = captureStagedInventory(stagingDir)
  const changedPaths = new Set<string>()
  for (const [relativePath, hash] of Object.entries(captured.files)) {
    if (current.files[relativePath] !== hash) {
      changedPaths.add(relativePath)
    }
  }
  for (const relativePath of Object.keys(current.files)) {
    if (MANAGED_RECORD_PATH.test(relativePath) && !(relativePath in captured.files)) {
      changedPaths.add(relativePath)
    }
  }
  return {ok: changedPaths.size === 0, changedPaths: [...changedPaths].sort()}
}

// ---------------------------------------------------------------------------
// Review binding: an explicit, persisted "this is what was reviewed and
// accepted" record that promote loads and independently re-verifies,
// instead of trusting a freshly recaptured (and therefore still-mutable)
// snapshot of the staging directory as if it were already-reviewed.
// ---------------------------------------------------------------------------

export const ACCEPTED_INVENTORY_RELATIVE_PATH = 'accepted-inventory.json'
/** Bound-scope companion to `ACCEPTED_INVENTORY_RELATIVE_PATH` — used only for pre-promote drift re-verification, never for the actual copy plan. See `scopeInventoryToBoundValidationPaths`. */
export const ACCEPTED_BOUND_INVENTORY_RELATIVE_PATH = 'accepted-bound-inventory.json'

/** A short, stable, human-comparable digest over a managed-scope inventory's paths+hashes — not a security boundary itself (the real boundary is the byte re-verification), just a legible "is this the same reviewed set" marker for CLI output. */
export function computeInventoryDigest(inventory: StagedInventory): string {
  const sortedEntries = Object.entries(inventory.files).sort(([a], [b]) => a.localeCompare(b))
  return createHash('sha256').update(JSON.stringify(sortedEntries)).digest('hex').slice(0, 16)
}

function loadInventoryFile(absolutePath: string): StagedInventory | undefined {
  if (!existsSync(absolutePath)) {
    return undefined
  }
  try {
    const parsed: unknown = JSON.parse(readFileSync(absolutePath, 'utf8'))
    if (typeof parsed !== 'object' || parsed === null) {
      return undefined
    }
    const files = (parsed as {files?: unknown}).files
    if (typeof files !== 'object' || files === null || Array.isArray(files)) {
      return undefined
    }
    return {files: files as Record<string, string>}
  } catch {
    return undefined
  }
}

/** Loads the persisted accepted-inventory.json (copy/publication scope), or `undefined` if missing/malformed. */
export function loadAcceptedInventory(stagingDir: string): StagedInventory | undefined {
  return loadInventoryFile(join(stagingDir, ACCEPTED_INVENTORY_RELATIVE_PATH))
}

/** Loads the persisted accepted-bound-inventory.json (validation-input scope, superset of the copy scope), or `undefined` if missing/malformed. */
export function loadAcceptedBoundInventory(stagingDir: string): StagedInventory | undefined {
  return loadInventoryFile(join(stagingDir, ACCEPTED_BOUND_INVENTORY_RELATIVE_PATH))
}

/**
 * Filters a full staged-directory inventory (e.g. from `captureStagedInventory`,
 * which hashes everything under the staging root) down to exactly the paths
 * this script ever promotes: the node/edge/theme/tag JSON records and the two
 * exact export targets. `readDestinationState` reads the same scope on the
 * destination side, so `planFreshPromote`/`planRecoveryPromote` compare like
 * with like — neither side ever treats `.deciduous/config.toml`, the sync
 * store's own README, or any other staged-but-unmanaged file as something to
 * promote, refuse over, or flag as an unexpected destination file.
 */
export function scopeInventoryToManagedPaths(
  inventory: StagedInventory,
  exportFiles: readonly string[],
): StagedInventory {
  const exportSet = new Set(exportFiles)
  const files: Record<string, string> = {}
  for (const [path, hash] of Object.entries(inventory.files)) {
    if (MANAGED_RECORD_PATH.test(path) || exportSet.has(path)) {
      files[path] = hash
    }
  }
  return {files}
}

/** `snapshot.ts`'s own frozen-snapshot provenance file, relative to a staging root. */
const SNAPSHOT_PROVENANCE_RELATIVE_PATH = join('.bootstrap', 'provenance.json')

/**
 * Resolves each `SOURCE_EVIDENCE_ARTIFACT_PATHS` entry to its ACTUAL staged location, using the
 * same tracked-vs-`source-inputs/`-fallback logic `resolveStagedArtifactPath` already owns —
 * rather than assuming every source-evidence document lives directly under the staging root. A
 * staging directory with a real `.bootstrap/provenance.json` (i.e. built via `prepareSourceSnapshot`)
 * that does NOT list one of these two required paths as a frozen artifact is a genuine
 * inconsistency (the build stage's own snapshot preflight requires both unconditionally — see the
 * `build` command below) and fails closed here rather than guessing a location that might not
 * hold the actual frozen bytes. Staging directories with no `.bootstrap/provenance.json` at all
 * (never built via `prepareSourceSnapshot` — e.g. a directly-constructed fixture) fall back to the
 * pre-snapshot assumption that these documents live directly under the staging root, preserving
 * compatibility with staging directories built without a real source snapshot.
 */
function resolveSourceEvidenceBoundPaths(stagingDir: string): {paths: string[]} | {error: string} {
  const snapshotProvenance = loadSourceSnapshotProvenance(stagingDir)
  if (snapshotProvenance === undefined) {
    return {paths: [...SOURCE_EVIDENCE_ARTIFACT_PATHS]}
  }
  const root = realpathSync(stagingDir)
  const paths: string[] = []
  for (const relativePath of SOURCE_EVIDENCE_ARTIFACT_PATHS) {
    const artifact = snapshotProvenance.requiredArtifacts.find(a => a.relativePath === relativePath)
    if (artifact === undefined) {
      return {
        error: `snapshot provenance (.bootstrap/provenance.json) does not list required source-evidence document "${relativePath}" as a frozen artifact — refusing to guess its staged location rather than treating an unlisted required input as safely absent`,
      }
    }
    const absolutePath = resolveStagedArtifactPath(root, artifact)
    paths.push(relative(root, absolutePath).split(sep).join('/'))
  }
  return {paths}
}

/**
 * Combines `provenance.json`, `snapshot.ts`'s own `.bootstrap/provenance.json`, and the two
 * source-evidence documents' ACTUAL resolved staged locations into the full bound-only path list —
 * the single entry point every `scopeInventoryToBoundValidationPaths` call site should use, so the
 * fail-closed behavior in `resolveSourceEvidenceBoundPaths` is never bypassed by a call site
 * re-deriving its own (potentially stale/hardcoded) path list.
 */
export function resolveBoundOnlyPaths(stagingDir: string): {paths: string[]} | {error: string} {
  const sourceEvidenceResult = resolveSourceEvidenceBoundPaths(stagingDir)
  if ('error' in sourceEvidenceResult) {
    return sourceEvidenceResult
  }
  return {paths: [PROVENANCE_RELATIVE_PATH, SNAPSHOT_PROVENANCE_RELATIVE_PATH, ...sourceEvidenceResult.paths]}
}

/**
 * The superset of `scopeInventoryToManagedPaths` used to bind `accept`'s digest and `promote`'s
 * pre-write reverification: every validation INPUT (private `provenance.json` + the frozen source
 * snapshot's own provenance + the two source-evidence documents, at their ACTUAL resolved staged
 * locations — see `resolveSourceEvidenceBoundPaths`/`resolveBoundOnlyPaths`), not merely the
 * managed records/exports this script actually copies to the destination. This is a strictly
 * separate set from the copy/publication list — `planFreshPromote`/`planRecoveryPromote`/
 * `executeFreshPromote`/`executeRecoveryPromote` continue to operate ONLY on
 * `scopeInventoryToManagedPaths`'s output, so none of these bound-only paths are ever copied into
 * the destination or a public export.
 */
export function scopeInventoryToBoundValidationPaths(
  inventory: StagedInventory,
  exportFiles: readonly string[],
  boundOnlyPaths: readonly string[],
): StagedInventory {
  const managed = scopeInventoryToManagedPaths(inventory, exportFiles)
  const files: Record<string, string> = {...managed.files}
  for (const relativePath of boundOnlyPaths) {
    const hash = inventory.files[relativePath]
    if (hash !== undefined) {
      files[relativePath] = hash
    }
  }
  return {files}
}
