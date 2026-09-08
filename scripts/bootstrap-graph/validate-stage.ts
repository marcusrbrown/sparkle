import type {ExtractedEdge, ExtractedNode} from './source-evidence.js'
/**
 * Validate stage: schema + secret-scrub + grounded-chain check over the
 * staged output (record JSON, both exports, and the source-evidence
 * provenance cross-check against the actual staged graph export).
 */
import {existsSync, readdirSync, readFileSync, realpathSync} from 'node:fs'
import {join} from 'node:path'

import {resolveWithinRoot} from './fs-safety.js'
import {EXPORT_RELATIVE_PATHS, resolveBoundOnlyPaths} from './inventory.js'
import {loadSnapshotProvenance, validateCanonicalProvenanceShape, type SourceEvidenceProvenance} from './provenance.js'
import {SYNC_RECORD_SUBDIRS} from './runners.js'
import {
  validateEdgeRecordSchema,
  validateGitHistoryExportSchema,
  validateGraphExportSchema,
  validateNodeRecordSchema,
  validateTagRecordSchema,
  validateThemeRecordSchema,
  type SchemaValidationResult,
} from './schema.js'
import {scanPayloadForSecrets} from './secrets.js'
import {validateReviewedGraph} from './source-evidence.js'

function validateRecordCollection(
  root: string,
  subdir: (typeof SYNC_RECORD_SUBDIRS)[number],
  validator: (record: unknown) => SchemaValidationResult,
): string[] {
  const errors: string[] = []
  const dirPath = join(root, '.deciduous', 'sync', subdir)
  if (!existsSync(dirPath)) {
    return errors
  }
  const files = readdirSync(dirPath, {withFileTypes: true}).filter(
    entry => entry.isFile() && entry.name.endsWith('.json'),
  )
  for (const entry of files) {
    const relativePath = `.deciduous/sync/${subdir}/${entry.name}`
    const absolutePath = resolveWithinRoot(root, relativePath)
    let parsed: unknown
    try {
      parsed = JSON.parse(readFileSync(absolutePath, 'utf8'))
    } catch {
      errors.push(`malformed JSON at ${relativePath}`)
      continue
    }
    errors.push(...validator(parsed).errors.map(message => `${relativePath}: ${message}`))
    for (const match of scanPayloadForSecrets(parsed)) {
      errors.push(`secret-scrub matched rule "${match.rule}" at ${relativePath}#${match.path}`)
    }
  }
  return errors
}

const RECORD_VALIDATORS: Record<(typeof SYNC_RECORD_SUBDIRS)[number], (record: unknown) => SchemaValidationResult> = {
  nodes: validateNodeRecordSchema,
  edges: validateEdgeRecordSchema,
  themes: validateThemeRecordSchema,
  tags: validateTagRecordSchema,
}

export interface ValidateStageResult {
  readonly ok: boolean
  readonly errors: string[]
}

/**
 * Cross-checks the build stage's `SourceEvidenceProvenance` record against
 * the ACTUAL staged `docs/public/graph-data.json` export — by change_id,
 * never by title — then runs the public `validateReviewedGraph` strict gate
 * over the reconstructed structure. This deliberately does not re-run
 * `extractSourceEvidence` against the original documents (that would
 * validate the *desired* extractor output while silently ignoring whatever
 * the CLI actually wrote); every node/edge it feeds to `validateReviewedGraph`
 * must first be proven present in the real export.
 */
function validateSourceEvidenceAgainstExport(sourceEvidence: SourceEvidenceProvenance, graphExport: unknown): string[] {
  const errors: string[] = []

  if (!sourceEvidence.reviewedApplied) {
    errors.push(
      'source-evidence provenance records the approved reviewed mapping as NOT applied (missing/drifted goal or decision snippet) — validate refuses to pass without the exact approved reviewed-association.',
    )
  }

  const exportNodes = (graphExport as {nodes?: {change_id?: unknown}[]}).nodes ?? []
  const exportEdges = (graphExport as {edges?: {from_change_id?: unknown; to_change_id?: unknown}[]}).edges ?? []
  const exportChangeIds = new Set(
    exportNodes
      .map(n => (typeof n.change_id === 'string' ? n.change_id : undefined))
      .filter((v): v is string => v !== undefined),
  )
  const exportEdgeKeys = new Set(
    exportEdges
      .filter(e => typeof e.from_change_id === 'string' && typeof e.to_change_id === 'string')
      .map(e => `${e.from_change_id as string}=>${e.to_change_id as string}`),
  )

  const reconstructedNodes: ExtractedNode[] = []
  for (const [changeId, nodeProv] of Object.entries(sourceEvidence.nodes)) {
    if (!exportChangeIds.has(changeId)) {
      errors.push(
        `source-evidence node with change_id ${changeId} (type "${nodeProv.type}") is recorded in provenance but missing from the actual staged graph export.`,
      )
      continue
    }
    reconstructedNodes.push({
      key: changeId,
      type: nodeProv.type,
      title: changeId,
      description: '',
      evidence: nodeProv.evidence,
    })
  }

  const reconstructedEdges: ExtractedEdge[] = []
  for (const edgeProv of sourceEvidence.edges) {
    const key = `${edgeProv.fromChangeId}=>${edgeProv.toChangeId}`
    if (!exportEdgeKeys.has(key)) {
      errors.push(
        `source-evidence edge ${edgeProv.fromChangeId} -> ${edgeProv.toChangeId} (${edgeProv.provenance.relationKind}) is recorded in provenance but missing from the actual staged graph export.`,
      )
      continue
    }
    reconstructedEdges.push({
      fromKey: edgeProv.fromChangeId,
      toKey: edgeProv.toChangeId,
      rationale: edgeProv.rationale,
      evidence: edgeProv.evidence,
      provenance: edgeProv.provenance,
    })
  }

  const reviewed = validateReviewedGraph(reconstructedNodes, reconstructedEdges)
  errors.push(...reviewed.errors)

  return errors
}

/**
 * Stage 2 (validate): checks the staged record JSON, `graph-data.json`, and
 * `git-history.json` against their own pinned schemas; runs the full-payload
 * secret-scrub over all three; and confirms every required triage artifact
 * is represented by at least one node (the grounded-chain check's "every
 * required artifact represented" clause — the full goal->outcome chain
 * assertion is exercised at the call site via the real node/edge data this
 * unit's end-to-end test produces, not invented here).
 */
export function runValidateStage(stagingDir: string): ValidateStageResult {
  const errors: string[] = []
  const root = realpathSync(stagingDir)

  const provenance = loadSnapshotProvenance(root)
  if (provenance === undefined) {
    errors.push(
      "missing or unreadable provenance.json — validate refuses to report success without the build stage's own input-set record",
    )
  } else {
    if (provenance.requiredArtifactPaths.length === 0) {
      errors.push(
        'provenance.json has an empty requiredArtifactPaths — validate requires a non-empty, meaningful input set',
      )
    }
    errors.push(...validateCanonicalProvenanceShape(provenance))
    if (provenance.sourceEvidence === undefined) {
      errors.push(
        'provenance.json is missing sourceEvidence — validate requires the source-evidence/reviewed-mapping pass to have run and recorded its result; an absent block is treated as a failed gate, not a skipped one',
      )
    }
  }

  // S4 fix: fails closed when a real source snapshot (.bootstrap/provenance.json) exists but does
  // not list one of the two required source-evidence documents as a frozen artifact — this staging
  // directory's digest/accept/promote binding cannot be trusted to actually cover that document's
  // real bytes (see resolveSourceEvidenceBoundPaths for why guessing its location is unsafe).
  const boundOnlyResult = resolveBoundOnlyPaths(stagingDir)
  if ('error' in boundOnlyResult) {
    errors.push(boundOnlyResult.error)
  }

  for (const subdir of SYNC_RECORD_SUBDIRS) {
    errors.push(...validateRecordCollection(root, subdir, RECORD_VALIDATORS[subdir]))
  }

  const graphExportPath = resolveWithinRoot(root, EXPORT_RELATIVE_PATHS[0])
  const gitHistoryPath = resolveWithinRoot(root, EXPORT_RELATIVE_PATHS[1])

  // Short-circuits ONLY when the export files themselves are physically missing (JSON.parse below
  // has nothing to read) — NOT merely because canonical-shape/sourceEvidence/record-collection
  // errors have already accumulated above. Errors from every check are meant to accumulate and all
  // surface together; a caller fixing one issue at a time should see every remaining problem, not
  // just whichever check happened to run first.
  const graphExportExists = existsSync(graphExportPath)
  const gitHistoryExportExists = existsSync(gitHistoryPath)
  if (!graphExportExists) {
    errors.push('missing docs/public/graph-data.json')
  }
  if (!gitHistoryExportExists) {
    errors.push('missing docs/public/git-history.json')
  }
  if (!graphExportExists || !gitHistoryExportExists) {
    return {ok: false, errors}
  }

  let graphExport: unknown
  let gitHistoryExport: unknown
  try {
    graphExport = JSON.parse(readFileSync(graphExportPath, 'utf8'))
  } catch {
    return {ok: false, errors: [...errors, 'malformed JSON at docs/public/graph-data.json']}
  }
  try {
    gitHistoryExport = JSON.parse(readFileSync(gitHistoryPath, 'utf8'))
  } catch {
    return {ok: false, errors: [...errors, 'malformed JSON at docs/public/git-history.json']}
  }

  errors.push(...validateGraphExportSchema(graphExport).errors)
  errors.push(...validateGitHistoryExportSchema(gitHistoryExport).errors)

  const secretMatches = [...scanPayloadForSecrets(graphExport), ...scanPayloadForSecrets(gitHistoryExport)]
  for (const match of secretMatches) {
    errors.push(`secret-scrub matched rule "${match.rule}" at ${match.path}`)
  }

  if (provenance !== undefined && provenance.requiredArtifactPaths.length > 0) {
    const graphNodes = (graphExport as {nodes?: {title?: unknown}[]}).nodes ?? []
    const representedTitles = new Set(graphNodes.map(node => (typeof node.title === 'string' ? node.title : '')))
    for (const requiredPath of provenance.requiredArtifactPaths) {
      if (!representedTitles.has(requiredPath)) {
        errors.push(`required triage artifact not represented by any node: ${requiredPath}`)
      }
    }
  }

  if (provenance?.sourceEvidence !== undefined) {
    errors.push(...validateSourceEvidenceAgainstExport(provenance.sourceEvidence, graphExport))
  }

  return {ok: errors.length === 0, errors}
}
