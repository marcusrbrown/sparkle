import {createHash} from 'node:crypto'
/**
 * Promote stage: planning (fresh vs. recovery) and real filesystem
 * execution of a reviewed staged output into a destination repo.
 */
import {
  constants,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
} from 'node:fs'
import {dirname, join} from 'node:path'

import {resolveWithinRoot} from './fs-safety.js'
import {EXPORT_RELATIVE_PATHS, MANAGED_RECORD_PATH, type StagedInventory} from './inventory.js'
import {SYNC_RECORD_SUBDIRS} from './runners.js'

/** The destination repo's current state, as observed before promotion. */
export interface DestinationState {
  /** Number of records already present in the destination `.deciduous/sync/` store. */
  readonly syncRecordCount: number
  /** Relative path -> observed content hash + a basic integrity check (e.g. valid JSON), for existing destination files. */
  readonly files: Record<string, {hash: string; integrityValid: boolean}>
}

export type FreshPromotePlan =
  | {readonly kind: 'proceed'; readonly filesToCopy: string[]}
  | {readonly kind: 'refuse'; readonly reason: string; readonly present: string[]}

/**
 * (a) Fresh promote: proceeds only when the destination `.deciduous/sync/`
 * has zero records AND no export file already exists — an existing export
 * file is protected, not silently overwritten. Either failing condition
 * refuses with a clear error naming what's already present.
 */
export function planFreshPromote(destination: DestinationState, staged: StagedInventory): FreshPromotePlan {
  const present = Object.keys(destination.files)
  if (destination.syncRecordCount > 0) {
    return {
      kind: 'refuse',
      reason: `destination .deciduous/sync/ already has ${destination.syncRecordCount} records`,
      present,
    }
  }
  if (present.length > 0) {
    return {kind: 'refuse', reason: 'destination export file(s) already exist', present}
  }
  return {kind: 'proceed', filesToCopy: Object.keys(staged.files)}
}

export type RecoveryPromoteStep =
  {readonly kind: 'skip-identical'; readonly path: string} | {readonly kind: 'copy-missing'; readonly path: string}

export type RecoveryPromotePlan =
  | {readonly kind: 'proceed'; readonly steps: RecoveryPromoteStep[]}
  | {
      readonly kind: 'abort'
      readonly reason: 'unexpected-destination-file' | 'changed-bytes' | 'torn-write'
      readonly path: string
    }

/**
 * (b) Recovery promote: retries the *same* reviewed staged output after an
 * earlier promotion attempt was interrupted. Does not pass through the
 * fresh-promote empty-destination gate. Accepts only the destination-file
 * subset that is byte-identical to the reviewed staged inventory, copies the
 * remaining staged files not yet present, and aborts — naming the specific
 * file, no destructive overwrite — on an unexpected destination file, a
 * changed-bytes mismatch, or a failed basic integrity check (torn write).
 */
export function planRecoveryPromote(destination: DestinationState, staged: StagedInventory): RecoveryPromotePlan {
  for (const path of Object.keys(destination.files)) {
    if (!(path in staged.files)) {
      return {kind: 'abort', reason: 'unexpected-destination-file', path}
    }
  }

  const steps: RecoveryPromoteStep[] = []
  for (const [path, stagedHash] of Object.entries(staged.files)) {
    const destinationFile = destination.files[path]
    if (destinationFile === undefined) {
      steps.push({kind: 'copy-missing', path})
      continue
    }
    if (!destinationFile.integrityValid) {
      return {kind: 'abort', reason: 'torn-write', path}
    }
    if (destinationFile.hash !== stagedHash) {
      return {kind: 'abort', reason: 'changed-bytes', path}
    }
    steps.push({kind: 'skip-identical', path})
  }

  return {kind: 'proceed', steps}
}

/**
 * Reads a destination repo's real, current promote-relevant state, scoped
 * strictly to the paths this script ever writes to: the node/edge/theme/tag
 * JSON records directly inside `.deciduous/sync/<kind>/` (one level, not
 * recursive) and the two exact export files. This is deliberately NOT a
 * recursive whole-repo scan — a real destination repo legitimately has a
 * README, `package.json`, `.git/`, `node_modules/`, `.deciduous/config.toml`,
 * `.deciduous/sync/README.md`, and other tracked content this script must
 * never read, hash, refuse promotion over, or treat as "managed". Every path
 * is resolved through `resolveWithinRoot`, so a symlink anywhere in the
 * destination — managed or not — cannot cause a read/write outside the
 * destination root.
 */
export function readDestinationState(destinationRoot: string, exportFiles: readonly string[]): DestinationState {
  if (!existsSync(destinationRoot)) {
    return {syncRecordCount: 0, files: {}}
  }
  const root = realpathSync(destinationRoot)

  let syncRecordCount = 0
  const relevantPaths = new Set<string>(exportFiles)
  for (const subdir of SYNC_RECORD_SUBDIRS) {
    const dirPath = join(root, '.deciduous', 'sync', subdir)
    if (!existsSync(dirPath)) {
      continue
    }
    const recordFiles = readdirSync(dirPath, {withFileTypes: true}).filter(
      entry => entry.isFile() && entry.name.endsWith('.json'),
    )
    syncRecordCount += recordFiles.length
    for (const entry of recordFiles) {
      relevantPaths.add(`.deciduous/sync/${subdir}/${entry.name}`)
    }
  }

  const files: Record<string, {hash: string; integrityValid: boolean}> = {}
  for (const relativePath of relevantPaths) {
    const absolutePath = resolveWithinRoot(root, relativePath)
    if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
      continue
    }
    const raw = readFileSync(absolutePath)
    let integrityValid = true
    if (relativePath.endsWith('.json')) {
      try {
        JSON.parse(raw.toString('utf8'))
      } catch {
        integrityValid = false
      }
    }
    files[relativePath] = {hash: createHash('sha256').update(raw).digest('hex'), integrityValid}
  }

  return {syncRecordCount, files}
}

/**
 * Defense in depth (B1.4): every path this script ever actually copies to a destination must be
 * either a managed `.deciduous/sync/**` record or one of the two exact export files — asserted
 * here, at the point of the real filesystem write, so a future caller (or a future refactor of the
 * plan-construction call sites) cannot smuggle a private/bound-only path (e.g. `provenance.json`)
 * into a real copy just by constructing a plan object with that path in it.
 */
function assertManagedCopyPath(relativePath: string): void {
  if (!MANAGED_RECORD_PATH.test(relativePath) && !(EXPORT_RELATIVE_PATHS as readonly string[]).includes(relativePath)) {
    throw new Error(
      `refusing to copy "${relativePath}" to the destination — not a managed .deciduous/sync/** record or a recognized export file`,
    )
  }
}

/**
 * Executes a `planFreshPromote` "proceed" plan: copies every staged file
 * into the destination. Every destination write is both path-contained
 * (via `resolveWithinRoot`) and exclusive (`fs.constants.COPYFILE_EXCL`) —
 * if a file unexpectedly already exists at the destination (a race the
 * planner didn't see), the copy throws rather than silently overwriting it.
 */
export function executeFreshPromote(destinationRoot: string, stagingRoot: string, plan: FreshPromotePlan): void {
  if (plan.kind !== 'proceed') {
    throw new Error(`cannot execute a refused fresh-promote plan: ${plan.reason}`)
  }
  mkdirSync(destinationRoot, {recursive: true})
  for (const relativePath of plan.filesToCopy) {
    assertManagedCopyPath(relativePath)
    const sourcePath = resolveWithinRoot(stagingRoot, relativePath)
    const destinationPath = resolveWithinRoot(destinationRoot, relativePath)
    mkdirSync(dirname(destinationPath), {recursive: true})
    copyFileSync(sourcePath, destinationPath, constants.COPYFILE_EXCL)
  }
}

/**
 * Executes a `planRecoveryPromote` "proceed" plan: copies only the
 * `copy-missing` staged files (exclusive write, path-contained); the
 * `skip-identical` steps are no-ops by design — that subset is already
 * byte-identical at the destination.
 */
export function executeRecoveryPromote(destinationRoot: string, stagingRoot: string, plan: RecoveryPromotePlan): void {
  if (plan.kind !== 'proceed') {
    throw new Error(`cannot execute an aborted recovery-promote plan: ${plan.reason} (${plan.path})`)
  }
  mkdirSync(destinationRoot, {recursive: true})
  for (const step of plan.steps) {
    if (step.kind !== 'copy-missing') {
      continue
    }
    assertManagedCopyPath(step.path)
    const sourcePath = resolveWithinRoot(stagingRoot, step.path)
    const destinationPath = resolveWithinRoot(destinationRoot, step.path)
    mkdirSync(dirname(destinationPath), {recursive: true})
    copyFileSync(sourcePath, destinationPath, constants.COPYFILE_EXCL)
  }
}
