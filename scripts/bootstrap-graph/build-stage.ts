/**
 * Build-stage orchestration: wires the triage / git-log / PR-body /
 * source-evidence passes together against a real `deciduous` runner in a
 * staging directory.
 */
import type {TriageArtifact} from './triage.js'

import {sanitizeCliOutput} from './cli-output.js'
import {batchDepsCommits, classifyCommit, type CommitInput} from './commits.js'
import {validateAttachmentBytes} from './fs-safety.js'
import {normalizePrBody, type PrInput} from './pr-normalize.js'
import {
  writeSnapshotProvenance,
  type SourceEvidenceEdgeProvenance,
  type SourceEvidenceNodeProvenance,
  type SourceEvidenceProvenance,
} from './provenance.js'
import {AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001} from './reviewed-mapping.js'
import {getNodeChangeId, parseCreatedNodeLocalId, type CommandRunner} from './runners.js'
import {scanPayloadForSecrets} from './secrets.js'
import {applyReviewedMapping, extractSourceEvidence, type SourceDocumentInput} from './source-evidence.js'

/** Maps a source-evidence relation kind to the pinned `deciduous link --edge-type` vocabulary. */
function deciduousEdgeTypeFor(relationKind: string | undefined): string {
  return relationKind === 'rejected-option' ? 'rejected' : 'leads_to'
}

const TRIAGE_NODE_TYPE_FOR = {default: 'observation', promoted: 'decision'} as const

export interface BuildStageInput {
  readonly runner: CommandRunner
  readonly stagingDir: string
  readonly triageArtifacts: readonly TriageArtifact[]
  /** Artifact path -> real filesystem location to read + attach (working checkout or --source-root). */
  readonly triageArtifactSourcePaths: Readonly<Record<string, string>>
  readonly commits: readonly CommitInput[]
  readonly runWindowId: string
  readonly prs: readonly PrInput[]
  /** The source snapshot's resolved pinned commit SHA, when the build ran against a frozen snapshot rather than a caller-assembled input set. Recorded into provenance.json alongside requiredArtifactPaths. */
  readonly commitSha?: string
  /** The source snapshot's capture timestamp (ISO 8601), recorded into provenance.json alongside requiredArtifactPaths. */
  readonly capturedAt?: string
  /**
   * The two frozen SOURCE_EVIDENCE_ARTIFACT_PATHS documents' real contents,
   * when the caller wants the source-evidence pass to run. Optional and
   * additive — omitting it (as every pre-existing caller does) skips the
   * pass entirely, unchanged from prior behavior.
   */
  readonly sourceEvidenceDocuments?: readonly SourceDocumentInput[]
}

export interface BuildStageResult {
  readonly triageNodeChangeIds: Record<string, string>
  readonly actionNodeChangeIds: Record<string, string>
  readonly depsBatchChangeId: string | undefined
  readonly decisionNodeChangeIds: Record<string, string>
  readonly warnings: string[]
  /** Present only when `sourceEvidenceDocuments` was supplied. */
  readonly sourceEvidence?: SourceEvidenceProvenance
}

export interface SourceEvidencePassResult {
  readonly provenance: SourceEvidenceProvenance
  readonly warnings: readonly string[]
}

/**
 * Extracts goal/decision/option/action/outcome nodes from the two frozen
 * source-evidence documents (SOURCE_EVIDENCE_ARTIFACT_PATHS), applies the
 * ONE approved reviewed-association mapping
 * (`AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001` — never an arbitrary or
 * caller-supplied mapping), and materializes the result as real `deciduous`
 * nodes/edges via `runner`, capturing each planning key's real change_id.
 *
 * Never throws on a drifted or non-applied mapping —
 * `extractSourceEvidence`/`applyReviewedMapping` already fail closed with
 * warnings, and the *absence* of a reviewed-association edge is what makes
 * `validateReviewedGraph` (run later, against the actual staged record) fail
 * — not a build-time throw. This function does throw on unexpected
 * `deciduous` subprocess failures, consistent with the other build passes.
 */
export async function runSourceEvidencePass(
  runner: CommandRunner,
  stagingDir: string,
  documents: readonly SourceDocumentInput[],
): Promise<SourceEvidencePassResult> {
  const extracted = extractSourceEvidence(documents)
  const mapped = applyReviewedMapping(extracted, documents, AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001)

  const preAddSecrets = scanPayloadForSecrets({
    nodeText: mapped.nodes.map(n => `${n.title}\n${n.description}`),
    edgeRationale: mapped.edges.map(e => e.rationale),
  })
  if (preAddSecrets.length > 0) {
    throw new Error(
      `secret-scrub blocked the source-evidence pass: matched rule "${preAddSecrets[0]?.rule}" at ${preAddSecrets[0]?.path}`,
    )
  }

  const changeIdByKey: Record<string, string> = {}
  const nodeProvenance: Record<string, SourceEvidenceNodeProvenance> = {}
  for (const node of mapped.nodes) {
    const added = await runner(['add', node.type, node.title, '-d', node.description], stagingDir)
    const localId = parseCreatedNodeLocalId(added.stdout)
    if (localId === undefined) {
      throw new Error(
        `deciduous add did not report a created node id for source-evidence node "${node.key}": ${added.stderr}`,
      )
    }
    const changeId = await getNodeChangeId(runner, stagingDir, localId)
    changeIdByKey[node.key] = changeId
    nodeProvenance[changeId] = {type: node.type, evidence: node.evidence}
  }

  const edgeProvenance: SourceEvidenceEdgeProvenance[] = []
  for (const edge of mapped.edges) {
    const fromChangeId = changeIdByKey[edge.fromKey]
    const toChangeId = changeIdByKey[edge.toKey]
    if (fromChangeId === undefined || toChangeId === undefined) {
      // Unreachable in practice: mapped.edges only ever reference mapped.nodes' own keys.
      throw new Error(`source-evidence edge references an unresolved node key: ${edge.fromKey} -> ${edge.toKey}`)
    }
    const relationKind = edge.provenance?.relationKind
    const linkResult = await runner(
      ['link', fromChangeId, toChangeId, '-r', edge.rationale, '-t', deciduousEdgeTypeFor(relationKind)],
      stagingDir,
    )
    if (linkResult.exitCode !== 0) {
      throw new Error(
        `deciduous link failed for source-evidence edge ${edge.fromKey} -> ${edge.toKey}: ${linkResult.stderr}`,
      )
    }
    if (edge.provenance === undefined) {
      throw new Error(
        `source-evidence edge ${edge.fromKey} -> ${edge.toKey} is missing provenance; refusing to persist an unqualified edge`,
      )
    }
    edgeProvenance.push({
      fromChangeId,
      toChangeId,
      rationale: edge.rationale,
      evidence: edge.evidence,
      provenance: edge.provenance,
    })
  }

  const reviewedApplied = mapped.edges.some(e => e.provenance?.relationKind === 'reviewed-association')

  return {
    provenance: {
      mappingId: AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001.id,
      reviewedApplied,
      nodes: nodeProvenance,
      edges: edgeProvenance,
      warnings: mapped.warnings,
    },
    warnings: mapped.warnings,
  }
}

/**
 * Runs the three build-stage passes (triage, git-log, PR-body), in order, so
 * later passes can link to nodes earlier passes created. Every text field
 * handed to `deciduous add`/`doc attach` is secret-scanned first (fail
 * closed) and no raw PR body is ever passed as `-d`. All node identity is
 * captured via `getNodeChangeId` (local id -> `show --json`), never by title.
 */
export async function runBuildStage(input: BuildStageInput): Promise<BuildStageResult> {
  const {runner, stagingDir} = input
  const warnings: string[] = []

  // Pre-add secret scan over every normalized text field this pass is about to write.
  const preAddPayload = {
    triage: input.triageArtifacts.map(a => a.disposition),
    commits: input.commits.map(c => c.message),
    prs: input.prs.map(pr => normalizePrBody(pr).summary),
  }
  const preAddSecrets = scanPayloadForSecrets(preAddPayload)
  if (preAddSecrets.length > 0) {
    throw new Error(
      `secret-scrub blocked the build: matched rule "${preAddSecrets[0]?.rule}" at ${preAddSecrets[0]?.path}`,
    )
  }

  // --- Triage pass ---
  const triageNodeChangeIds: Record<string, string> = {}
  for (const artifact of input.triageArtifacts) {
    const sourcePath = input.triageArtifactSourcePaths[artifact.path]
    if (sourcePath === undefined) {
      throw new Error(`no resolved source path for required artifact: ${artifact.path}`)
    }
    const attachmentCheck = validateAttachmentBytes(sourcePath)
    if (!attachmentCheck.ok) {
      throw new Error(`attachment byte validation failed for ${artifact.path}: ${attachmentCheck.reason}`)
    }

    const nodeType = artifact.promoted ? TRIAGE_NODE_TYPE_FOR.promoted : TRIAGE_NODE_TYPE_FOR.default
    const added = await runner(['add', nodeType, artifact.path, '-d', artifact.disposition], stagingDir)
    const localId = parseCreatedNodeLocalId(added.stdout)
    if (localId === undefined) {
      throw new Error(
        `deciduous add did not report a created node id for triage artifact ${artifact.path}: ${added.stderr}`,
      )
    }

    const attached = await runner(
      ['doc', 'attach', String(localId), sourcePath, '-d', artifact.disposition],
      stagingDir,
    )
    if (attached.exitCode !== 0) {
      throw new Error(`deciduous doc attach failed for ${artifact.path}: ${attached.stderr}`)
    }

    triageNodeChangeIds[artifact.path] = await getNodeChangeId(runner, stagingDir, localId)
  }

  // --- Git-log pass ---
  // The verified-merge-SHA set comes from input.prs — a real, gh-confirmed merged-PR snapshot
  // (acquireMergedPrSnapshot), never from parent-count alone.
  const verifiedMergeShas = new Set(input.prs.map(pr => pr.mergeCommitSha))
  const classified = input.commits.map(commit => classifyCommit(commit, verifiedMergeShas))
  const depsBatch = batchDepsCommits(classified, input.runWindowId)
  const nonDepsCommits = classified.filter(commit => !commit.isDepsChore)

  const actionNodeChangeIds: Record<string, string> = {}
  for (const commit of nonDepsCommits) {
    const added = await runner(
      ['add', 'action', commit.summary, '--commit', commit.sha, '-c', String(commit.confidence), '--date', commit.date],
      stagingDir,
    )
    const localId = parseCreatedNodeLocalId(added.stdout)
    if (localId === undefined) {
      throw new Error(`deciduous add did not report a created node id for commit ${commit.sha}: ${added.stderr}`)
    }
    actionNodeChangeIds[commit.sha] = await getNodeChangeId(runner, stagingDir, localId)
  }

  let depsBatchChangeId: string | undefined
  if (depsBatch !== undefined) {
    const added = await runner(['add', 'observation', depsBatch.summary, '-c', '60'], stagingDir)
    const localId = parseCreatedNodeLocalId(added.stdout)
    if (localId === undefined) {
      throw new Error(`deciduous add did not report a created node id for the deps batch: ${added.stderr}`)
    }
    depsBatchChangeId = await getNodeChangeId(runner, stagingDir, localId)
  }

  // --- PR-body pass ---
  const decisionNodeChangeIds: Record<string, string> = {}
  for (const pr of input.prs) {
    const normalized = normalizePrBody(pr)
    const linkedActionChangeId = actionNodeChangeIds[pr.mergeCommitSha]
    const confidence = linkedActionChangeId === undefined ? 70 : 75
    if (linkedActionChangeId === undefined) {
      warnings.push(
        `PR #${pr.number}: no action node found for merge commit ${pr.mergeCommitSha}; confidence dropped to 70`,
      )
    }
    if (pr.filesTruncated === true) {
      warnings.push(
        `PR #${pr.number}: file list is incomplete (files-overflow pagination follow-up did not complete) — attached/recorded files may be a partial subset of what actually changed`,
      )
    }

    const added = await runner(
      [
        'add',
        'decision',
        normalized.title,
        '-d',
        normalized.summary,
        '--files',
        normalized.files.join(','),
        '--commit',
        pr.mergeCommitSha,
        '-c',
        String(confidence),
      ],
      stagingDir,
    )
    const localId = parseCreatedNodeLocalId(added.stdout)
    if (localId === undefined) {
      throw new Error(`deciduous add did not report a created node id for PR #${pr.number}: ${added.stderr}`)
    }
    const changeId = await getNodeChangeId(runner, stagingDir, localId)
    decisionNodeChangeIds[String(pr.number)] = changeId

    if (linkedActionChangeId !== undefined) {
      const linkResult = await runner(
        ['link', linkedActionChangeId, changeId, '-r', 'PR merges the linked commit'],
        stagingDir,
      )
      if (linkResult.exitCode !== 0) {
        // The decision node was already created at confidence 75 (the "link exists" claim) before
        // this call — the pinned deciduous CLI has no node-metadata-edit subcommand (verified via
        // `deciduous --help`/subcommand help: add/link/unlink/delete/status/prompt are the only
        // node-mutating commands, none can revise a node's stored confidence after creation), so a
        // failed link can never be corrected back down to 70. Rather than publish that false
        // metadata, the whole build fails here — the staging directory is left in place (never
        // deleted) so it can be inspected, but nothing in it can reach accept/promote, since no
        // further build step (sync, provenance write) ever runs.
        throw new Error(
          `deciduous link failed for PR #${pr.number} -> action node ${linkedActionChangeId}: ${sanitizeCliOutput(linkResult.stderr)}. Refusing to continue: the decision node was already created claiming this link, and this pinned deciduous CLI has no way to revise a node's confidence after creation, so a partial/false claim can never be safely corrected in place.`,
        )
      }
    }
  }

  // --- Source-evidence pass (goal/decision/option/action/outcome from the two frozen
  //     SOURCE_EVIDENCE_ARTIFACT_PATHS documents, gated on the ONE approved reviewed mapping) ---
  let sourceEvidence: SourceEvidenceProvenance | undefined
  if (input.sourceEvidenceDocuments !== undefined) {
    const sourceEvidenceResult = await runSourceEvidencePass(runner, stagingDir, input.sourceEvidenceDocuments)
    sourceEvidence = sourceEvidenceResult.provenance
    warnings.push(...sourceEvidenceResult.warnings)
  }

  // Persist the run's own input-set record so the validate stage can require it rather than
  // trusting a caller-supplied (and therefore trivially bypassable) required-artifact list.
  // commitSha/capturedAt are additive: when the build ran against a real source snapshot
  // (scripts/bootstrap-graph/snapshot.ts), its resolved SHA and capture time are threaded through
  // here so provenance.json records real values instead of leaving those optional fields empty.
  // capturedAt is recorded under the existing prListFetchedAt field (reused, not a new field) since
  // it is the same snapshot timestamp that also gates PR eligibility in selectEligiblePrs.
  // requiredArtifactPaths keeps its existing meaning and is never displaced by this.
  writeSnapshotProvenance(stagingDir, {
    requiredArtifactPaths: input.triageArtifacts.map(artifact => artifact.path),
    promotedArtifactPaths: input.triageArtifacts.filter(artifact => artifact.promoted).map(artifact => artifact.path),
    commitSha: input.commitSha,
    prListFetchedAt: input.capturedAt,
    sourceEvidence,
  })

  return {triageNodeChangeIds, actionNodeChangeIds, depsBatchChangeId, decisionNodeChangeIds, warnings, sourceEvidence}
}
