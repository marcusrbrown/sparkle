import type {EdgeProvenance, GroundedNodeType, SourceEvidenceRange} from './source-evidence.js'
/**
 * The bootstrap run's own private input-set record (`provenance.json`):
 * shape, persistence, loading, and the canonical-shape re-derivation that
 * `runValidateStage` (and therefore `accept`/`promote`) actually gates on.
 */
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'

import {CANONICAL_ARCHIVE_COUNT, CANONICAL_PROMOTE_COUNT} from './triage.js'

/** This bootstrap script's own private input-set record, relative to a staging root. */
export const PROVENANCE_RELATIVE_PATH = 'provenance.json'

/** A single materialized source-evidence node's real `deciduous` identity + the exact evidence that justified it, keyed by change_id in `SourceEvidenceProvenance.nodes`. */
export interface SourceEvidenceNodeProvenance {
  readonly type: GroundedNodeType
  readonly evidence: SourceEvidenceRange
}

/** A single materialized source-evidence edge, identified by its real endpoints' change_ids (never by title). */
export interface SourceEvidenceEdgeProvenance {
  readonly fromChangeId: string
  readonly toChangeId: string
  readonly rationale: string
  readonly evidence: SourceEvidenceRange
  readonly provenance: EdgeProvenance
}

/**
 * The minimal record needed to (a) bind the approved `ReviewedAssociationMapping`'s
 * application to this specific staged build, and (b) let `runValidateStage`
 * cross-check the ACTUAL staged `docs/public/graph-data.json` export against
 * what was declared here — by change_id, never by fragile title matching.
 */
export interface SourceEvidenceProvenance {
  readonly mappingId: string
  /** True only if AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001's goal->decision reviewed-association edge was actually created (i.e. neither snippet had drifted). */
  readonly reviewedApplied: boolean
  readonly nodes: Record<string, SourceEvidenceNodeProvenance>
  readonly edges: readonly SourceEvidenceEdgeProvenance[]
  readonly warnings: readonly string[]
}

export interface SnapshotProvenance {
  readonly requiredArtifactPaths: readonly string[]
  /** The subset of `requiredArtifactPaths` that carry the Lane 5 triage report's PROMOTE annotation. Optional at the type level (like `sourceEvidence`) for backward call-site compatibility, but `runValidateStage` treats its absence as a hard error — see that function's canonical-shape checks. */
  readonly promotedArtifactPaths?: readonly string[]
  readonly commitSha?: string
  readonly prListFetchedAt?: string
  readonly sourceEvidence?: SourceEvidenceProvenance
  /** Sanitized `runBuildStage` warnings (unresolved links, lowered confidence, incomplete file lists) persisted for later inspection — additive, optional, never gates validate/accept/promote on its own. */
  readonly buildWarnings?: readonly string[]
}

export function writeSnapshotProvenance(stagingDir: string, provenance: SnapshotProvenance): void {
  mkdirSync(stagingDir, {recursive: true})
  writeFileSync(join(stagingDir, PROVENANCE_RELATIVE_PATH), JSON.stringify(provenance, null, 2))
}

export function loadSnapshotProvenance(stagingDir: string): SnapshotProvenance | undefined {
  const provenancePath = join(stagingDir, PROVENANCE_RELATIVE_PATH)
  if (!existsSync(provenancePath)) {
    return undefined
  }
  try {
    const parsed: unknown = JSON.parse(readFileSync(provenancePath, 'utf8'))
    if (typeof parsed !== 'object' || parsed === null) {
      return undefined
    }
    const record = parsed as Record<string, unknown>
    const requiredArtifactPaths = record.requiredArtifactPaths
    if (!Array.isArray(requiredArtifactPaths) || !requiredArtifactPaths.every(path => typeof path === 'string')) {
      return undefined
    }
    let promotedArtifactPaths: readonly string[] | undefined
    if (record.promotedArtifactPaths !== undefined) {
      // Present-but-malformed is corrupted provenance, not "absent" — same discipline as
      // sourceEvidence below: silently dropping a bad value would let a truncated/tampered
      // promoted-subset declaration pass through as if it had simply never been recorded.
      if (
        !Array.isArray(record.promotedArtifactPaths) ||
        !record.promotedArtifactPaths.every(path => typeof path === 'string')
      ) {
        return undefined
      }
      promotedArtifactPaths = record.promotedArtifactPaths
    }
    let sourceEvidence: SourceEvidenceProvenance | undefined
    if (record.sourceEvidence !== undefined) {
      const parsed = parseSourceEvidenceProvenance(record.sourceEvidence)
      // Present-but-malformed is treated as corrupted provenance, not "absent" —
      // silently dropping it would let an altered/truncated sourceEvidence block
      // pass validate as if the source-evidence pass had never run.
      if (parsed === undefined) {
        return undefined
      }
      sourceEvidence = parsed
    }

    let buildWarnings: readonly string[] | undefined
    if (record.buildWarnings !== undefined) {
      // Same discipline as promotedArtifactPaths/sourceEvidence above: present-but-malformed is
      // corrupted provenance, not "absent" — silently dropping a bad value here would let a
      // truncated/tampered warnings record pass through as if the build had reported none.
      if (!Array.isArray(record.buildWarnings) || !record.buildWarnings.every(w => typeof w === 'string')) {
        return undefined
      }
      buildWarnings = record.buildWarnings
    }

    return {
      requiredArtifactPaths,
      promotedArtifactPaths,
      commitSha: typeof record.commitSha === 'string' ? record.commitSha : undefined,
      prListFetchedAt: typeof record.prListFetchedAt === 'string' ? record.prListFetchedAt : undefined,
      sourceEvidence,
      buildWarnings,
    }
  } catch {
    return undefined
  }
}

/**
 * Re-derives and enforces the canonical Lane 5 triage shape (see
 * `validateCanonicalTriageShape`, the `build`-time equivalent) directly from
 * a LOADED, already-persisted `SnapshotProvenance` — the gate `runValidateStage`
 * (and therefore `accept`/`promote`, which both call it) actually runs. This
 * closes the gap `build`'s own check does not: `provenance.json` is a plain
 * file on disk between `build` and a later `validate`/`accept`/`promote`
 * invocation, so trusting it without re-deriving the canonical shape here
 * would let a shrunk (e.g. 1-path) or padded (16 duplicate-path) provenance
 * silently satisfy every later stage.
 */
export function validateCanonicalProvenanceShape(provenance: SnapshotProvenance): string[] {
  const errors: string[] = []

  const uniqueRequiredPaths = new Set(provenance.requiredArtifactPaths)
  if (uniqueRequiredPaths.size !== provenance.requiredArtifactPaths.length) {
    errors.push(
      `provenance.json's requiredArtifactPaths contains duplicate paths (${provenance.requiredArtifactPaths.length} entries, ${uniqueRequiredPaths.size} unique) — refusing to let a padded/duplicated count satisfy the canonical requirement`,
    )
  } else if (uniqueRequiredPaths.size !== CANONICAL_ARCHIVE_COUNT) {
    errors.push(
      `provenance.json's requiredArtifactPaths must contain exactly ${CANONICAL_ARCHIVE_COUNT} unique paths (the canonical Lane 5 triage report's ARCHIVE set); found ${uniqueRequiredPaths.size}`,
    )
  }

  if (provenance.promotedArtifactPaths === undefined) {
    errors.push(
      'provenance.json is missing promotedArtifactPaths — validate requires the canonical PROMOTE-annotated subset to be explicitly recorded, not silently omitted',
    )
  } else {
    const uniquePromotedPaths = new Set(provenance.promotedArtifactPaths)
    if (uniquePromotedPaths.size !== provenance.promotedArtifactPaths.length) {
      errors.push(
        `provenance.json's promotedArtifactPaths contains duplicate paths (${provenance.promotedArtifactPaths.length} entries, ${uniquePromotedPaths.size} unique)`,
      )
    } else if (uniquePromotedPaths.size !== CANONICAL_PROMOTE_COUNT) {
      errors.push(
        `provenance.json's promotedArtifactPaths must contain exactly ${CANONICAL_PROMOTE_COUNT} unique paths (the canonical Lane 5 triage report's PROMOTE-annotated subset); found ${uniquePromotedPaths.size}`,
      )
    }
    const foreignPromotedPaths = [...uniquePromotedPaths].filter(path => !uniqueRequiredPaths.has(path))
    if (foreignPromotedPaths.length > 0) {
      errors.push(
        `provenance.json's promotedArtifactPaths contains path(s) not present in requiredArtifactPaths: ${foreignPromotedPaths.join(', ')}`,
      )
    }
  }

  return errors
}

const GROUNDED_NODE_TYPES = new Set<string>(['goal', 'option', 'decision', 'action', 'outcome'])

function parseSourceEvidenceRange(value: unknown): SourceEvidenceRange | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const r = value as Record<string, unknown>
  if (typeof r.path !== 'string' || typeof r.startLine !== 'number' || typeof r.endLine !== 'number') return undefined
  return {path: r.path, startLine: r.startLine, endLine: r.endLine}
}

function parseEdgeProvenance(value: unknown): EdgeProvenance | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const r = value as Record<string, unknown>
  if (typeof r.relationKind !== 'string') return undefined
  return r as unknown as EdgeProvenance
}

/** Non-throwing, minimally-strict structural parse of a persisted `SourceEvidenceProvenance` block. */
function parseSourceEvidenceProvenance(value: unknown): SourceEvidenceProvenance | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const r = value as Record<string, unknown>
  if (typeof r.mappingId !== 'string' || typeof r.reviewedApplied !== 'boolean') return undefined
  if (typeof r.nodes !== 'object' || r.nodes === null || Array.isArray(r.nodes)) return undefined
  if (!Array.isArray(r.edges) || !Array.isArray(r.warnings)) return undefined

  const nodes: Record<string, SourceEvidenceNodeProvenance> = {}
  for (const [changeId, rawNode] of Object.entries(r.nodes as Record<string, unknown>)) {
    if (typeof rawNode !== 'object' || rawNode === null) return undefined
    const n = rawNode as Record<string, unknown>
    if (typeof n.type !== 'string' || !GROUNDED_NODE_TYPES.has(n.type)) return undefined
    const evidence = parseSourceEvidenceRange(n.evidence)
    if (evidence === undefined) return undefined
    nodes[changeId] = {type: n.type as GroundedNodeType, evidence}
  }

  const edges: SourceEvidenceEdgeProvenance[] = []
  for (const rawEdge of r.edges) {
    if (typeof rawEdge !== 'object' || rawEdge === null) return undefined
    const e = rawEdge as Record<string, unknown>
    if (typeof e.fromChangeId !== 'string' || typeof e.toChangeId !== 'string' || typeof e.rationale !== 'string')
      return undefined
    const evidence = parseSourceEvidenceRange(e.evidence)
    const provenance = parseEdgeProvenance(e.provenance)
    if (evidence === undefined || provenance === undefined) return undefined
    edges.push({fromChangeId: e.fromChangeId, toChangeId: e.toChangeId, rationale: e.rationale, evidence, provenance})
  }

  if (!r.warnings.every(w => typeof w === 'string')) return undefined

  return {mappingId: r.mappingId, reviewedApplied: r.reviewedApplied, nodes, edges, warnings: r.warnings as string[]}
}
