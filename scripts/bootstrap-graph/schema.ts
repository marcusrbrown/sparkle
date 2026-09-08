/**
 * Pinned-schema validation for committed `.deciduous/sync/**` record JSON
 * and the two publication exports (`graph-data.json`, `git-history.json`).
 */

/** Result of validating a payload against one of this module's pinned schemas. */
export interface SchemaValidationResult {
  readonly ok: boolean
  readonly errors: string[]
}

function requireFields(record: Record<string, unknown>, fields: readonly string[], label: string): string[] {
  return fields
    .filter(field => !(field in record) || record[field] === undefined)
    .map(field => `${label} missing required field: ${field}`)
}

/** Validates a single committed `.deciduous/sync/nodes/*.json` record against its real captured shape. */
export function validateNodeRecordSchema(record: unknown): SchemaValidationResult {
  if (typeof record !== 'object' || record === null) {
    return {ok: false, errors: ['node record is not an object']}
  }
  const errors = requireFields(
    record as Record<string, unknown>,
    ['author', 'change_id', 'created_at', 'node_type', 'status', 'title', 'updated_at'],
    'node record',
  )
  return {ok: errors.length === 0, errors}
}

/** Validates a single committed `.deciduous/sync/edges/*.json` record against its real captured shape. */
export function validateEdgeRecordSchema(record: unknown): SchemaValidationResult {
  if (typeof record !== 'object' || record === null) {
    return {ok: false, errors: ['edge record is not an object']}
  }
  const errors = requireFields(
    record as Record<string, unknown>,
    ['author', 'created_at', 'edge_id', 'edge_type', 'from_change_id', 'to_change_id', 'weight'],
    'edge record',
  )
  return {ok: errors.length === 0, errors}
}

/**
 * Validates `docs/public/graph-data.json` against its real captured shape.
 * Note this export's node/edge shape intentionally omits the `author` field
 * present on committed records — that is expected, not a validation defect.
 */
export function validateGraphExportSchema(payload: unknown): SchemaValidationResult {
  if (typeof payload !== 'object' || payload === null) {
    return {ok: false, errors: ['graph export is not an object']}
  }
  const {nodes, edges} = payload as Record<string, unknown>
  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    return {ok: false, errors: ['graph export must have array "nodes" and "edges" fields']}
  }

  const errors: string[] = []
  const nodeFields = [
    'id',
    'change_id',
    'node_type',
    'title',
    'status',
    'created_at',
    'updated_at',
    'metadata_json',
  ] as const
  const edgeFields = [
    'id',
    'from_node_id',
    'to_node_id',
    'from_change_id',
    'to_change_id',
    'edge_type',
    'weight',
    'created_at',
  ] as const

  nodes.forEach((node, index) => {
    if (typeof node !== 'object' || node === null) {
      errors.push(`graph export node ${index} is not an object`)
      return
    }
    errors.push(...requireFields(node as Record<string, unknown>, nodeFields, `graph export node ${index}`))
  })
  edges.forEach((edge, index) => {
    if (typeof edge !== 'object' || edge === null) {
      errors.push(`graph export edge ${index} is not an object`)
      return
    }
    errors.push(...requireFields(edge as Record<string, unknown>, edgeFields, `graph export edge ${index}`))
  })

  return {ok: errors.length === 0, errors}
}

/**
 * Validates `docs/public/git-history.json` against its real captured shape.
 * This is a distinct schema from `graph-data.json`'s node/edge allowlist —
 * they are different export shapes, validated independently.
 */
export function validateGitHistoryExportSchema(payload: unknown): SchemaValidationResult {
  if (!Array.isArray(payload)) {
    return {ok: false, errors: ['git-history export must be a JSON array']}
  }

  const errors: string[] = []
  const fields = ['hash', 'short_hash', 'author', 'date', 'message', 'files_changed'] as const
  payload.forEach((entry, index) => {
    if (typeof entry !== 'object' || entry === null) {
      errors.push(`git-history entry ${index} is not an object`)
      return
    }
    errors.push(...requireFields(entry as Record<string, unknown>, fields, `git-history entry ${index}`))
  })

  return {ok: errors.length === 0, errors}
}

/** Validates a single committed `.deciduous/sync/themes/*.json` record against its real captured shape. */
export function validateThemeRecordSchema(record: unknown): SchemaValidationResult {
  if (typeof record !== 'object' || record === null) {
    return {ok: false, errors: ['theme record is not an object']}
  }
  const errors = requireFields(
    record as Record<string, unknown>,
    ['author', 'change_id', 'color', 'created_at', 'name', 'updated_at'],
    'theme record',
  )
  return {ok: errors.length === 0, errors}
}

/** Validates a single committed `.deciduous/sync/tags/*.json` record against its real captured shape. */
export function validateTagRecordSchema(record: unknown): SchemaValidationResult {
  if (typeof record !== 'object' || record === null) {
    return {ok: false, errors: ['tag record is not an object']}
  }
  const errors = requireFields(
    record as Record<string, unknown>,
    ['author', 'created_at', 'node_change_id', 'source', 'theme_change_id'],
    'tag record',
  )
  return {ok: errors.length === 0, errors}
}
