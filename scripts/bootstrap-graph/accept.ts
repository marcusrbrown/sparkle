/**
 * Explicit human-review-binding step: runs validate and, only if it passes,
 * captures and persists the accepted (copy + bound-validation-scope)
 * inventories that `promote` later independently re-verifies.
 */
import {writeFileSync} from 'node:fs'
import {join} from 'node:path'

import {
  ACCEPTED_BOUND_INVENTORY_RELATIVE_PATH,
  ACCEPTED_INVENTORY_RELATIVE_PATH,
  captureStagedInventory,
  EXPORT_RELATIVE_PATHS,
  resolveBoundOnlyPaths,
  scopeInventoryToBoundValidationPaths,
  scopeInventoryToManagedPaths,
} from './inventory.js'
import {runValidateStage} from './validate-stage.js'

/**
 * Runs the validate stage and, only if it passes, captures the current
 * managed-scope staged inventory and persists it as the accepted review
 * record. This is the one place an "accepted-inventory.json" is ever
 * written — there is no path that lets `executeFreshPromote`/
 * `executeRecoveryPromote` run against unreviewed or unvalidated bytes.
 * A real human review of the Stage 3 output (record JSON, both exports, the
 * validation report) is expected to happen before this is called; this
 * function's own role is binding *that* review to an exact, later-verifiable
 * byte inventory — it does not itself constitute the review.
 */
export function acceptReviewedStage(stagingDir: string): {ok: boolean; errors: string[]} {
  const validation = runValidateStage(stagingDir)
  if (!validation.ok) {
    return {ok: false, errors: validation.errors}
  }
  // Guaranteed resolvable at this point (runValidateStage's own bound-path resolution check
  // already passed) — re-checked defensively rather than assumed, since acceptReviewedStage is
  // itself an independently callable, exported function.
  const boundOnlyResult = resolveBoundOnlyPaths(stagingDir)
  if ('error' in boundOnlyResult) {
    return {ok: false, errors: [boundOnlyResult.error]}
  }
  const fullInventory = captureStagedInventory(stagingDir)
  // Two DELIBERATELY separate persisted inventories, from the same capture:
  // - accepted-inventory.json (copy/publication scope): unchanged shape/meaning, RETAINED AS A
  //   READ-ONLY REVIEW ARTIFACT ONLY — promote no longer trusts this file's own paths/hashes as
  //   authoritative; see the B1.4 fix in runCliInner's promote branch below.
  // - accepted-bound-inventory.json (validation-input scope, superset): also binds the private
  //   provenance.json + the frozen source-evidence documents at their actual resolved staged
  //   locations, used for promote's pre-write drift check AND as the sole source promote derives
  //   its verified copy set from — never copied anywhere itself.
  const copyScoped = scopeInventoryToManagedPaths(fullInventory, EXPORT_RELATIVE_PATHS)
  const boundScoped = scopeInventoryToBoundValidationPaths(fullInventory, EXPORT_RELATIVE_PATHS, boundOnlyResult.paths)
  writeFileSync(join(stagingDir, ACCEPTED_INVENTORY_RELATIVE_PATH), JSON.stringify(copyScoped, null, 2))
  writeFileSync(join(stagingDir, ACCEPTED_BOUND_INVENTORY_RELATIVE_PATH), JSON.stringify(boundScoped, null, 2))
  return {ok: true, errors: []}
}
