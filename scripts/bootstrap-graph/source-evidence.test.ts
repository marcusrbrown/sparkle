/**
 * Tests for scripts/bootstrap-graph/source-evidence.ts.
 *
 * Uses the FULL, real, tracked source documents (`.ai/plan/*.md`,
 * `.ai/audit/*.md`) read straight off disk rather than trimmed excerpts —
 * per the Oracle repair pass, an excerpt can mask cross-section bugs (e.g.
 * a `**Verification**:` block in one `###` section leaking onto a leftover
 * action from a sibling section) that only show up against the full
 * document's heading structure.
 */

import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

import {standardAfterEach, standardBeforeEach} from '@sparkle/test-utils/lifecycle'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'

import {AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001} from './reviewed-mapping.js'
import {
  applyReviewedMapping,
  extractSourceEvidence,
  validateGroundedChain,
  validateReviewedGraph,
  type ExtractedEdge,
  type ExtractedNode,
  type ReviewedAssociationMapping,
} from './source-evidence.js'

beforeEach(() => {
  standardBeforeEach()
})

afterEach(() => {
  standardAfterEach()
})

/**
 * Narrows a possibly-`undefined` lookup result to `T` with a real runtime
 * assertion (via `expect(...).toBeDefined()`), replacing a bare non-null
 * assertion (`!`). Unlike `!`, this actually fails the test with a clear
 * message if the invariant the test relies on (e.g. "this node exists")
 * is ever violated, instead of silently producing a runtime `undefined`
 * that only surfaces as a confusing downstream failure.
 */
function expectDefined<T>(value: T | undefined, label: string): T {
  expect(value, `expected ${label} to be defined`).toBeDefined()
  if (value === undefined) throw new Error(`unreachable: ${label} was asserted defined above`)
  return value
}

const PLAN_PATH = '.ai/plan/refactor-audit-improvements-1.md'
const AUDIT_PATH = '.ai/audit/audit-final-report.md'

const PLAN_TEXT = readFileSync(fileURLToPath(new URL(`../../${PLAN_PATH}`, import.meta.url)), 'utf8')
const AUDIT_TEXT = readFileSync(fileURLToPath(new URL(`../../${AUDIT_PATH}`, import.meta.url)), 'utf8')

const FULL_DOCUMENTS = [
  {path: PLAN_PATH, text: PLAN_TEXT},
  {path: AUDIT_PATH, text: AUDIT_TEXT},
]

describe('extractSourceEvidence (full real documents)', () => {
  const result = extractSourceEvidence(FULL_DOCUMENTS)

  it('extracts the plan frontmatter as a goal node with exact evidence lines', () => {
    const goal = result.nodes.find(n => n.type === 'goal')
    expect(goal).toBeDefined()
    expect(goal?.title).toBe('Comprehensive Code Audit Improvements Implementation')
    expect(goal?.status).toBe('Completed')
    expect(goal?.date).toBe('2025-10-01')
    expect(goal?.evidence).toEqual({path: PLAN_PATH, startLine: 2, endLine: 7})
  })

  it('extracts exactly two decisions (ADR-001, ADR-002) with correctly bounded, non-overwritten status', () => {
    const decisions = result.nodes.filter(n => n.type === 'decision')
    expect(decisions).toHaveLength(2)

    const adr001 = expectDefined(
      decisions.find(d => d.title === 'ADR-001: TypeScript Root Directory Configuration'),
      'ADR-001 decision node',
    )
    expect(adr001.status).toBe('✅ IMPLEMENTED')
    expect(adr001.evidence).toEqual({path: AUDIT_PATH, startLine: 102, endLine: 118})

    const adr002 = expectDefined(
      decisions.find(d => d.title === 'ADR-002: Audit Documentation Exclusion from Linting'),
      'ADR-002 decision node',
    )
    expect(adr002.status).toBe('✅ IMPLEMENTED')
    // Finding 2 regression guard: must stay bounded to ADR-002's own section
    // (ending at its own **Status** line, 137), not extended ~150 lines further
    // out to the unrelated "Outstanding Issues" **Status** lines at 285/299.
    expect(adr002.evidence).toEqual({path: AUDIT_PATH, startLine: 122, endLine: 137})
    expect(adr002.evidence.endLine).toBeLessThan(141)
  })

  it('does not let the unrelated Outstanding-Issues Status lines (285, 299) attach to or extend any decision', () => {
    const decisions = result.nodes.filter(n => n.type === 'decision')
    for (const decision of decisions) {
      expect(decision.evidence.endLine).toBeLessThan(283)
    }
  })

  it('extracts exactly one action node (Change 1) — Change 2 has no **Solution**, so no action is fabricated for it', () => {
    const actions = result.nodes.filter(n => n.type === 'action')
    expect(actions).toHaveLength(1)
    expect(actions[0]?.title).toBe('Change 1: TypeScript Configuration Fix (HIGH-001)')
    expect(actions[0]?.evidence).toEqual({path: AUDIT_PATH, startLine: 36, endLine: 42})
  })

  it('extracts exactly two outcome nodes (Change 1 and Change 2 verifications)', () => {
    const outcomes = result.nodes.filter(n => n.type === 'outcome')
    expect(outcomes).toHaveLength(2)
    const change1Outcome = expectDefined(
      outcomes.find(o => o.evidence.startLine === 60),
      'Change 1 outcome node',
    )
    expect(change1Outcome.evidence).toEqual({path: AUDIT_PATH, startLine: 60, endLine: 64})
    const change2Outcome = expectDefined(
      outcomes.find(o => o.evidence.startLine === 91),
      'Change 2 outcome node',
    )
    expect(change2Outcome.evidence).toEqual({path: AUDIT_PATH, startLine: 91, endLine: 94})
  })

  it("Change 1's action has exactly its own outcome edge — Change 2's verification is never wrongly attached to it", () => {
    const action = expectDefined(
      result.nodes.find(n => n.type === 'action'),
      'action node',
    )
    const change1Outcome = expectDefined(
      result.nodes.find(n => n.type === 'outcome' && n.evidence.startLine === 60),
      'Change 1 outcome node',
    )
    const change2Outcome = expectDefined(
      result.nodes.find(n => n.type === 'outcome' && n.evidence.startLine === 91),
      'Change 2 outcome node',
    )

    const outcomeEdgesFromAction = result.edges.filter(e => e.fromKey === action.key)
    expect(outcomeEdgesFromAction).toHaveLength(1)
    expect(outcomeEdgesFromAction[0]?.toKey).toBe(change1Outcome.key)
    expect(result.edges.some(e => e.toKey === change2Outcome.key)).toBe(false)
  })

  it("warns that Change 2's verification has no supporting action, instead of silently attaching it elsewhere", () => {
    expect(
      result.warnings.some(w => w.includes('Verification found with no preceding action') && w.includes(':91')),
    ).toBe(true)
  })

  it('extracts exactly four rejected options, two per ADR, each bounded to its own decision section', () => {
    const options = result.nodes.filter(n => n.type === 'option')
    expect(options).toHaveLength(4)

    const adr001 = expectDefined(
      result.nodes.find(n => n.type === 'decision' && n.title.startsWith('ADR-001')),
      'ADR-001 decision node',
    )
    const adr002 = expectDefined(
      result.nodes.find(n => n.type === 'decision' && n.title.startsWith('ADR-002')),
      'ADR-002 decision node',
    )

    const adr001Options = result.edges.filter(
      e => e.toKey === adr001.key && e.provenance?.relationKind === 'rejected-option',
    )
    const adr002Options = result.edges.filter(
      e => e.toKey === adr002.key && e.provenance?.relationKind === 'rejected-option',
    )
    expect(adr001Options).toHaveLength(2)
    expect(adr002Options).toHaveLength(2)
  })

  it('produces exactly one decision -> action edge (ADR-001 -> Change 1, via the unambiguous shared `rootDir` token)', () => {
    const decisionActionEdges = result.edges.filter(e => {
      const from = result.nodes.find(n => n.key === e.fromKey)
      const to = result.nodes.find(n => n.key === e.toKey)
      return from?.type === 'decision' && to?.type === 'action'
    })
    expect(decisionActionEdges).toHaveLength(1)
    expect(decisionActionEdges[0]?.provenance?.relationKind).toBe('source-reported')
    expect(decisionActionEdges[0]?.rationale).toContain('rootDir')
    expect(decisionActionEdges[0]?.rationale).not.toContain('implemented by this action')
  })

  it('produces a grounded chain (internal shared walk) with no structural errors', () => {
    const validation = validateGroundedChain(result.nodes, result.edges)
    expect(validation.errors).toEqual([])
  })
})

describe('fenced code blocks are skipped for marker extraction (finding 3)', () => {
  it('does not extract a Decision/Alternatives from inside a backtick-fenced example', () => {
    const text = [
      '### Example Section',
      '',
      'Here is an example of what NOT to write:',
      '',
      '```markdown',
      '**Decision**: This is a fake decision inside an example.',
      '',
      '**Alternatives Considered**:',
      '1. Fake option (rejected: not real)',
      '```',
      '',
      'End of example.',
      '',
    ].join('\n')
    const result = extractSourceEvidence([{path: 'doc.md', text}])
    expect(result.nodes.filter(n => n.type === 'decision')).toEqual([])
    expect(result.nodes.filter(n => n.type === 'option')).toEqual([])
  })

  it('does not extract from inside a tilde-fenced block either', () => {
    const text = ['~~~', '**Decision**: Also fake, tilde-fenced.', '~~~', ''].join('\n')
    const result = extractSourceEvidence([{path: 'doc.md', text}])
    expect(result.nodes.filter(n => n.type === 'decision')).toEqual([])
  })

  it('still extracts real markers that follow a closed fence', () => {
    const text = [
      '### Real Section',
      '',
      '```json',
      '{ "example": true }',
      '```',
      '',
      '**Decision**: This one is real, outside any fence.',
      '',
      '**Status**: ✅ IMPLEMENTED',
      '',
    ].join('\n')
    const result = extractSourceEvidence([{path: 'doc.md', text}])
    const decisions = result.nodes.filter(n => n.type === 'decision')
    expect(decisions).toHaveLength(1)
    expect(decisions[0]?.status).toBe('✅ IMPLEMENTED')
  })

  it('treats fenced diff/code content as evidence content, not as new semantic markers, even when it looks marker-like', () => {
    const text = [
      '### Change with a diff',
      '',
      '**Solution**: Real solution text.',
      '',
      '```diff',
      '**Decision**: this looks like a marker but is diff content',
      '```',
      '',
    ].join('\n')
    const result = extractSourceEvidence([{path: 'doc.md', text}])
    expect(result.nodes.filter(n => n.type === 'decision')).toEqual([])
    expect(result.nodes.filter(n => n.type === 'action')).toHaveLength(1)
  })
})

describe('shared inline-code-span linking fails closed on ambiguity (findings 6)', () => {
  it('drops an inferred decision -> action link when a generic token (e.g. package.json) matches multiple actions, and warns instead of fabricating', () => {
    const text = [
      '### Change A',
      '',
      '**Solution**: Updated `package.json` for change A',
      '',
      '### Change B',
      '',
      '**Solution**: Updated `package.json` for change B',
      '',
      '### ADR-Shared: Ambiguous Decision',
      '',
      '**Decision**: Bump versions in `package.json` per policy.',
      '',
    ].join('\n')
    const result = extractSourceEvidence([{path: 'doc.md', text}])
    const decision = expectDefined(
      result.nodes.find(n => n.type === 'decision'),
      'decision node',
    )
    const decisionActionEdges = result.edges.filter(e => e.fromKey === decision.key)
    expect(decisionActionEdges).toEqual([])
    expect(result.warnings.some(w => w.includes('Ambiguous shared inline-code-span match for decision'))).toBe(true)
  })

  it('drops an inferred link when an action is matched by multiple decisions (reciprocal ambiguity), even if one decision-side view looks unique', () => {
    const text = [
      '### Change Common',
      '',
      '**Solution**: Touches `pnpm-lock.yaml` broadly',
      '',
      '### ADR-One: First',
      '',
      '**Decision**: Regenerate `pnpm-lock.yaml` per policy one.',
      '',
      '### ADR-Two: Second',
      '',
      '**Decision**: Also touches `pnpm-lock.yaml` per policy two.',
      '',
    ].join('\n')
    const result = extractSourceEvidence([{path: 'doc.md', text}])
    const action = expectDefined(
      result.nodes.find(n => n.type === 'action'),
      'action node',
    )
    expect(result.edges.some(e => e.toKey === action.key)).toBe(false)
    expect(result.warnings.some(w => w.includes('Ambiguous shared inline-code-span match for action'))).toBe(true)
  })

  it('still links an unambiguous 1:1 shared-token pair, but only as source-reported, never claiming proof of implementation', () => {
    const text = [
      '### Change A',
      '',
      '**Solution**: Updated `packages/a/config.json` to fix the bug',
      '',
      '### Change B',
      '',
      '**Solution**: Updated `packages/b/other.json` unrelated fix',
      '',
      '### ADR-A: First Decision',
      '',
      '**Decision**: Modify `packages/a/config.json` per policy.',
      '',
    ].join('\n')
    const result = extractSourceEvidence([{path: 'doc.md', text}])
    const decision = expectDefined(
      result.nodes.find(n => n.type === 'decision'),
      'decision node',
    )
    const actionA = expectDefined(
      result.nodes.find(n => n.title === 'Change A'),
      'Change A action node',
    )
    const actionB = expectDefined(
      result.nodes.find(n => n.title === 'Change B'),
      'Change B action node',
    )

    const edge = result.edges.find(e => e.fromKey === decision.key && e.toKey === actionA.key)
    expect(edge).toBeDefined()
    expect(edge?.provenance?.relationKind).toBe('source-reported')
    expect(edge?.rationale).not.toContain('implemented by this action')
    expect(result.edges.some(e => e.fromKey === decision.key && e.toKey === actionB.key)).toBe(false)
  })
})

describe('section-local state reset on headings (finding 1 regression, synthetic minimal case)', () => {
  it("does not attach a later Verification (no local Solution) to an earlier sibling section's action", () => {
    const text = [
      '### Change 1',
      '',
      '**Solution**: Do the real fix',
      '',
      '**Verification**:',
      '- Change 1 check passes',
      '',
      '### Change 2',
      '',
      '**Reason**: No solution marker in this section',
      '',
      '**Verification**:',
      '- Change 2 check passes',
      '',
    ].join('\n')
    const result = extractSourceEvidence([{path: 'doc.md', text}])
    const action = expectDefined(
      result.nodes.find(n => n.type === 'action'),
      'action node',
    )
    const outcomes = result.nodes.filter(n => n.type === 'outcome')
    expect(outcomes).toHaveLength(2)
    const ownOutcome = expectDefined(
      outcomes.find(o => o.description.includes('Change 1 check passes')),
      "Change 1's own outcome node",
    )
    const foreignOutcome = expectDefined(
      outcomes.find(o => o.description.includes('Change 2 check passes')),
      "Change 2's foreign outcome node",
    )

    const edgesFromAction = result.edges.filter(e => e.fromKey === action.key)
    expect(edgesFromAction).toHaveLength(1)
    expect(edgesFromAction[0]?.toKey).toBe(ownOutcome.key)
    expect(result.edges.some(e => e.toKey === foreignOutcome.key)).toBe(false)
    expect(result.warnings.some(w => w.includes('Verification found with no preceding action'))).toBe(true)
  })
})

describe('status overwrite guard on headings (finding 2 regression, synthetic minimal case)', () => {
  it('does not let a later, unrelated Status line attach to or extend an earlier decision in a sibling section', () => {
    const text = [
      '### ADR-X',
      '',
      '**Decision**: Do X.',
      '',
      '**Status**: IMPLEMENTED',
      '',
      '### Unrelated Later Section',
      '',
      '**Status**: DOCUMENTED',
      '',
    ].join('\n')
    const result = extractSourceEvidence([{path: 'doc.md', text}])
    const decision = expectDefined(
      result.nodes.find(n => n.type === 'decision'),
      'decision node',
    )
    expect(decision.status).toBe('IMPLEMENTED')
    expect(decision.evidence.endLine).toBe(5) // the ADR-X Status line, not the later unrelated one
  })
})

describe('cross-references', () => {
  it('resolves a repo-relative Markdown link against the supplied document set', () => {
    const a = {path: 'docs/a.md', text: 'See [the other doc](./b.md) for details.\n'}
    const b = {path: 'docs/b.md', text: '# B\n'}
    const result = extractSourceEvidence([a, b])
    const ref = result.crossReferences.find(r => r.fromPath === 'docs/a.md')
    expect(ref).toBeDefined()
    expect(ref?.resolvedPath).toBe('docs/b.md')
    expect(ref?.resolved).toBe(true)
    expect(result.warnings).toEqual([])
  })

  it('resolves a same-document anchor-only link without requiring a path match', () => {
    const a = {path: 'docs/a.md', text: 'Jump to [section](#some-section).\n'}
    const result = extractSourceEvidence([a])
    const ref = result.crossReferences[0]
    expect(ref?.resolvedPath).toBeUndefined()
    expect(ref?.anchor).toBe('some-section')
    expect(ref?.resolved).toBe(true)
  })

  it('splits a path#fragment link into resolvedPath and anchor', () => {
    const a = {path: 'docs/a.md', text: 'See [details](./b.md#setup).\n'}
    const b = {path: 'docs/b.md', text: '# B\n'}
    const result = extractSourceEvidence([a, b])
    const ref = result.crossReferences[0]
    expect(ref?.resolvedPath).toBe('docs/b.md')
    expect(ref?.anchor).toBe('setup')
  })

  it('reports a warning for a link target absent from the supplied document set', () => {
    const a = {path: 'docs/a.md', text: 'See [missing](./missing.md).\n'}
    const result = extractSourceEvidence([a])
    expect(result.crossReferences[0]?.resolved).toBe(false)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('missing.md')
  })

  it('excludes external (scheme-qualified) links entirely, not even as an unresolved warning', () => {
    const a = {path: 'docs/a.md', text: 'See [external](https://example.com/page) and [mail](mailto:a@example.com).\n'}
    const result = extractSourceEvidence([a])
    expect(result.crossReferences).toEqual([])
    expect(result.warnings).toEqual([])
  })

  it('does not treat a plain-prose filename mention as a cross-reference (links express references, not causality)', () => {
    const a = {path: 'docs/a.md', text: 'The fix touches docs/tsconfig.json directly, no link syntax here.\n'}
    const result = extractSourceEvidence([a])
    expect(result.crossReferences).toEqual([])
  })
})

describe('validateGroundedChain (@internal shared walk, exercised directly to avoid duplicating its logic in tests)', () => {
  const makeNode = (overrides: Partial<ExtractedNode> & Pick<ExtractedNode, 'key' | 'type'>): ExtractedNode => ({
    title: overrides.key,
    description: overrides.key,
    evidence: {path: 'doc.md', startLine: 1, endLine: 1},
    ...overrides,
  })

  it('passes for a single well-formed decision -> action -> outcome fragment (partial chain, no goal/option)', () => {
    const nodes: ExtractedNode[] = [
      makeNode({key: 'd1', type: 'decision'}),
      makeNode({key: 'a1', type: 'action'}),
      makeNode({key: 'o1', type: 'outcome'}),
    ]
    const edges: ExtractedEdge[] = [
      {fromKey: 'd1', toKey: 'a1', rationale: 'implements', evidence: {path: 'doc.md', startLine: 1, endLine: 1}},
      {fromKey: 'a1', toKey: 'o1', rationale: 'verifies', evidence: {path: 'doc.md', startLine: 1, endLine: 1}},
    ]
    const validation = validateGroundedChain(nodes, edges)
    expect(validation.valid).toBe(true)
    expect(validation.errors).toEqual([])
  })

  it('does not fail solely for incompleteness: an isolated node with no edges is valid', () => {
    const nodes: ExtractedNode[] = [makeNode({key: 'g1', type: 'goal'})]
    const validation = validateGroundedChain(nodes, [])
    expect(validation.valid).toBe(true)
  })

  it('fails on a dangling edge referencing a fabricated node key', () => {
    const nodes: ExtractedNode[] = [makeNode({key: 'a1', type: 'action'})]
    const edges: ExtractedEdge[] = [
      {
        fromKey: 'a1',
        toKey: 'o-does-not-exist',
        rationale: 'fabricated',
        evidence: {path: 'doc.md', startLine: 1, endLine: 1},
      },
    ]
    const validation = validateGroundedChain(nodes, edges)
    expect(validation.valid).toBe(false)
    expect(validation.errors.some(e => e.includes('Dangling edge'))).toBe(true)
  })

  it('fails on a wrong-order edge (outcome pointing back to goal)', () => {
    const nodes: ExtractedNode[] = [makeNode({key: 'g1', type: 'goal'}), makeNode({key: 'o1', type: 'outcome'})]
    const edges: ExtractedEdge[] = [
      {fromKey: 'o1', toKey: 'g1', rationale: 'backwards', evidence: {path: 'doc.md', startLine: 1, endLine: 1}},
    ]
    const validation = validateGroundedChain(nodes, edges)
    expect(validation.valid).toBe(false)
    expect(validation.errors.some(e => e.includes('not a valid chain transition'))).toBe(true)
  })

  it('fails on a cycle (decision -> action -> decision)', () => {
    const nodes: ExtractedNode[] = [makeNode({key: 'd1', type: 'decision'}), makeNode({key: 'a1', type: 'action'})]
    const edges: ExtractedEdge[] = [
      {fromKey: 'd1', toKey: 'a1', rationale: 'x', evidence: {path: 'doc.md', startLine: 1, endLine: 1}},
      {fromKey: 'a1', toKey: 'd1', rationale: 'y', evidence: {path: 'doc.md', startLine: 1, endLine: 1}},
    ]
    const validation = validateGroundedChain(nodes, edges)
    expect(validation.valid).toBe(false)
    expect(validation.errors.some(e => e.includes('Cycle detected'))).toBe(true)
  })

  it('fails when a node has missing/empty evidence range', () => {
    const nodes: ExtractedNode[] = [
      {key: 'g1', type: 'goal', title: 'g', description: 'g', evidence: {path: 'doc.md', startLine: 0, endLine: 0}},
    ]
    const validation = validateGroundedChain(nodes, [])
    expect(validation.valid).toBe(false)
    expect(validation.errors.some(e => e.includes('invalid or empty evidence range'))).toBe(true)
  })

  it('allows an explicit rejected option -> decision edge', () => {
    const nodes: ExtractedNode[] = [makeNode({key: 'opt1', type: 'option'}), makeNode({key: 'd1', type: 'decision'})]
    const edges: ExtractedEdge[] = [
      {
        fromKey: 'opt1',
        toKey: 'd1',
        rationale: 'rejected: too complex',
        evidence: {path: 'doc.md', startLine: 1, endLine: 1},
      },
    ]
    const validation = validateGroundedChain(nodes, edges)
    expect(validation.valid).toBe(true)
  })
})

describe('applyReviewedMapping (full real documents, updated expectedAction-guarded mapping)', () => {
  it('adds exactly one reviewed-association edge with reviewKind (no personal identity/PII)', () => {
    const extracted = extractSourceEvidence(FULL_DOCUMENTS)
    const mapped = applyReviewedMapping(extracted, FULL_DOCUMENTS, AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001)

    const goal = expectDefined(
      mapped.nodes.find(n => n.type === 'goal'),
      'goal node',
    )
    const decision = expectDefined(
      mapped.nodes.find(n => n.type === 'decision' && n.title.startsWith('ADR-001')),
      'ADR-001 decision node',
    )
    const associationEdges = mapped.edges.filter(e => e.provenance?.relationKind === 'reviewed-association')

    expect(associationEdges).toHaveLength(1)
    expect(associationEdges[0]?.fromKey).toBe(goal.key)
    expect(associationEdges[0]?.toKey).toBe(decision.key)
    expect(associationEdges[0]?.provenance?.disclaimer).toBe('reviewed-association, not-causal-intent')
    expect(associationEdges[0]?.provenance?.reviewKind).toBe('maintainer-reviewed')
    expect(associationEdges[0]?.provenance).not.toHaveProperty('reviewedBy')
    expect(JSON.stringify(associationEdges[0])).not.toMatch(/user|marcus/i)
  })

  it('upgrades only the exact Change 1 action to commit-supported, never any other action', () => {
    const extracted = extractSourceEvidence(FULL_DOCUMENTS)
    const decision = expectDefined(
      extracted.nodes.find(n => n.type === 'decision' && n.title.startsWith('ADR-001')),
      'ADR-001 decision node',
    )
    const action = expectDefined(
      extracted.nodes.find(n => n.type === 'action'),
      'action node',
    )
    const beforeEdge = extracted.edges.find(e => e.fromKey === decision.key && e.toKey === action.key)
    expect(beforeEdge?.provenance?.relationKind).toBe('source-reported')

    const mapped = applyReviewedMapping(extracted, FULL_DOCUMENTS, AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001)
    const afterEdge = mapped.edges.find(e => e.fromKey === decision.key && e.toKey === action.key)
    expect(afterEdge?.provenance?.relationKind).toBe('commit-supported')
    expect(afterEdge?.provenance?.commitRefs?.[0]?.sha).toBe('236ba68059847a663073843546417ab6b2f84e67')
    expect(action.title).toBe('Change 1: TypeScript Configuration Fix (HIGH-001)')
  })

  it('does NOT upgrade when expectedAction matches zero actions, and warns instead (finding 4)', () => {
    const extracted = extractSourceEvidence(FULL_DOCUMENTS)
    const badMapping: ReviewedAssociationMapping = {
      ...AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001,
      expectedAction: {
        ...expectDefined(AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001.expectedAction, 'fixture mapping expectedAction'),
        nodeTitle: 'Change 99: Does Not Exist',
      },
    }
    const mapped = applyReviewedMapping(extracted, FULL_DOCUMENTS, badMapping)
    const decision = expectDefined(
      extracted.nodes.find(n => n.type === 'decision' && n.title.startsWith('ADR-001')),
      'ADR-001 decision node',
    )
    const action = expectDefined(
      extracted.nodes.find(n => n.type === 'action'),
      'action node',
    )
    const edge = mapped.edges.find(e => e.fromKey === decision.key && e.toKey === action.key)
    expect(edge?.provenance?.relationKind).toBe('source-reported') // unchanged
    expect(mapped.warnings.some(w => w.includes('expectedAction matched 0 action node(s)'))).toBe(true)
  })

  it('does NOT upgrade when expectedAction matches multiple actions, and warns instead (finding 4)', () => {
    // Force both action nodes to share the exact same title the mapping expects,
    // by using a mapping whose expectedAction.nodeTitle matches both.
    const mapping: ReviewedAssociationMapping = {
      ...AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001,
    }
    // Rename the duplicate node's title in-place is not possible (read-only result),
    // so instead assert against a synthetic duplicate-title scenario directly.
    const duplicateTitledDocs = [
      {path: PLAN_PATH, text: PLAN_TEXT},
      {
        path: AUDIT_PATH,
        text: AUDIT_TEXT.replace(
          '### Change 2: ESLint Configuration Update',
          '### Change 1: TypeScript Configuration Fix (HIGH-001)',
        ).replace(
          '**Reason**: Exclude audit documentation from linting (contains complex code blocks that confuse parser)',
          '**Solution**: Removed `rootDir` constraint to allow Astro configuration files in root directory',
        ),
      },
    ]
    const extractedDup = extractSourceEvidence(duplicateTitledDocs)
    const duplicateActions = extractedDup.nodes.filter(
      n => n.type === 'action' && n.title === 'Change 1: TypeScript Configuration Fix (HIGH-001)',
    )
    expect(duplicateActions.length).toBeGreaterThan(1)

    const mapped = applyReviewedMapping(extractedDup, duplicateTitledDocs, mapping)
    expect(mapped.warnings.some(w => w.includes('expectedAction matched') && w.includes('action node(s)'))).toBe(true)
    expect(mapped.edges.some(e => e.provenance?.relationKind === 'commit-supported')).toBe(false)
  })

  it("snippet guard is location-bound: a matching snippet relocated OUTSIDE the expected node's own evidence range must not pass (finding 5)", () => {
    // Keep the ADR-001 heading (so the decision node is still found by title),
    // but change the **Decision** line content, and instead plant the ORIGINAL
    // decision snippet text somewhere else in the document, outside the
    // decision node's own evidence range [102,118]. A naive document-wide
    // `.includes()` check would wrongly pass; the location-bound guard must not.
    const decisionSnippet = 'Remove `rootDir` constraint from `docs/tsconfig.json` to follow standard Astro patterns.'
    const relocatedText = AUDIT_TEXT.replace(
      `**Decision**: ${decisionSnippet}`,
      '**Decision**: A completely different decision text now.',
    ).replace('## Executive Summary', `## Executive Summary\n\n<!-- ${decisionSnippet} -->`)
    const relocatedDocs = [
      {path: PLAN_PATH, text: PLAN_TEXT},
      {path: AUDIT_PATH, text: relocatedText},
    ]
    const extracted = extractSourceEvidence(relocatedDocs)
    const decisionStillFound = extracted.nodes.find(
      n => n.type === 'decision' && n.title === 'ADR-001: TypeScript Root Directory Configuration',
    )
    expect(decisionStillFound).toBeDefined() // sanity: node lookup by title still succeeds
    expect(relocatedText.includes(decisionSnippet)).toBe(true) // sanity: snippet is still somewhere in the doc

    const customMapping: ReviewedAssociationMapping = {
      ...AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001,
      to: {...AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001.to, sourceSnippet: decisionSnippet},
    }
    const mapped = applyReviewedMapping(extracted, relocatedDocs, customMapping)
    expect(mapped.edges.filter(e => e.provenance?.relationKind === 'reviewed-association')).toEqual([])
    expect(mapped.warnings.some(w => w.includes('not applied'))).toBe(true)
  })

  it('does NOT apply the mapping when the goal source snippet has drifted, and warns instead of fabricating', () => {
    const driftedDocs = [
      {
        path: PLAN_PATH,
        text: PLAN_TEXT.replace('Comprehensive Code Audit Improvements Implementation', 'Some Renamed Goal'),
      },
      {path: AUDIT_PATH, text: AUDIT_TEXT},
    ]
    const extracted = extractSourceEvidence(driftedDocs)
    const mapped = applyReviewedMapping(extracted, driftedDocs, AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001)
    expect(mapped.edges.filter(e => e.provenance?.relationKind === 'reviewed-association')).toEqual([])
    expect(mapped.warnings.some(w => w.includes('not applied'))).toBe(true)
  })

  it('does NOT apply the mapping to an unrelated document set even if paths happen to match', () => {
    const unrelatedDocs = [
      {path: PLAN_PATH, text: '# Totally unrelated content\n\nNo frontmatter goal here.\n'},
      {path: AUDIT_PATH, text: '# Also unrelated\n\nNo ADR here.\n'},
    ]
    const extracted = extractSourceEvidence(unrelatedDocs)
    const mapped = applyReviewedMapping(extracted, unrelatedDocs, AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001)
    expect(mapped.edges).toEqual(extracted.edges)
    expect(mapped.warnings.some(w => w.includes('not applied'))).toBe(true)
  })

  it('mapping application is pure: does not mutate the input result', () => {
    const extracted = extractSourceEvidence(FULL_DOCUMENTS)
    const edgeCountBefore = extracted.edges.length
    applyReviewedMapping(extracted, FULL_DOCUMENTS, AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001)
    expect(extracted.edges.length).toBe(edgeCountBefore)
  })
})

describe('validateReviewedGraph (single public strict gate)', () => {
  it('accepts the full real documents once the approved mapping is applied', () => {
    const extracted = extractSourceEvidence(FULL_DOCUMENTS)
    const mapped = applyReviewedMapping(extracted, FULL_DOCUMENTS, AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001)
    const validation = validateReviewedGraph(mapped.nodes, mapped.edges)
    expect(validation.errors).toEqual([])
    expect(validation.valid).toBe(true)
  })

  it('fails when the mapping was never applied (missing/non-applied mapping must fail the public gate)', () => {
    const extracted = extractSourceEvidence(FULL_DOCUMENTS)
    const validation = validateReviewedGraph(extracted.nodes, extracted.edges)
    expect(validation.valid).toBe(false)
    expect(validation.errors.some(e => e.includes('No reviewed-association edge found'))).toBe(true)
  })

  it('fails when the decision -> action edge is only source-reported (inferred), not commit-supported (finding 4 gate)', () => {
    const extracted = extractSourceEvidence(FULL_DOCUMENTS)
    // Apply the association but force the upgrade to fail via a bad expectedAction.
    const badMapping: ReviewedAssociationMapping = {
      ...AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001,
      expectedAction: {
        ...expectDefined(AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001.expectedAction, 'fixture mapping expectedAction'),
        nodeTitle: 'Does Not Exist',
      },
    }
    const mapped = applyReviewedMapping(extracted, FULL_DOCUMENTS, badMapping)
    const validation = validateReviewedGraph(mapped.nodes, mapped.edges)
    expect(validation.valid).toBe(false)
    expect(validation.errors.some(e => e.includes('no commit-supported decision -> action edge'))).toBe(true)
  })

  it("rejects a foreign option: an option whose own evidence lies outside the associated decision's section, even if its edge targets the right decision key (finding 7)", () => {
    const ev = {path: 'doc.md', startLine: 1, endLine: 1}
    const nodes: ExtractedNode[] = [
      {key: 'g1', type: 'goal', title: 'g', description: 'g', evidence: ev},
      {
        key: 'd1',
        type: 'decision',
        title: 'd',
        description: 'd',
        evidence: {path: 'doc.md', startLine: 10, endLine: 20},
      },
      {
        key: 'foreign-opt',
        type: 'option',
        title: 'foreign',
        description: 'foreign',
        // Evidence is in the SAME path but OUTSIDE the decision's [10,20] section bounds.
        evidence: {path: 'doc.md', startLine: 500, endLine: 500},
      },
      {key: 'a1', type: 'action', title: 'a', description: 'a', evidence: ev},
      {key: 'o1', type: 'outcome', title: 'o', description: 'o', evidence: ev},
    ]
    const edges: ExtractedEdge[] = [
      {fromKey: 'g1', toKey: 'd1', rationale: 'x', evidence: ev, provenance: {relationKind: 'reviewed-association'}},
      {
        fromKey: 'foreign-opt',
        toKey: 'd1',
        rationale: 'rejected: x',
        evidence: ev,
        provenance: {relationKind: 'rejected-option'},
      },
      {fromKey: 'd1', toKey: 'a1', rationale: 'x', evidence: ev, provenance: {relationKind: 'commit-supported'}},
      {fromKey: 'a1', toKey: 'o1', rationale: 'x', evidence: ev, provenance: {relationKind: 'source-reported'}},
    ]
    const validation = validateReviewedGraph(nodes, edges)
    expect(validation.valid).toBe(false)
    expect(validation.errors.some(e => e.includes('no rejected-option edges bounded within its own section'))).toBe(
      true,
    )
  })

  it("accepts an option correctly bounded within the decision's own evidence range", () => {
    const ev = {path: 'doc.md', startLine: 1, endLine: 1}
    const nodes: ExtractedNode[] = [
      {key: 'g1', type: 'goal', title: 'g', description: 'g', evidence: ev},
      {
        key: 'd1',
        type: 'decision',
        title: 'd',
        description: 'd',
        evidence: {path: 'doc.md', startLine: 10, endLine: 20},
      },
      {
        key: 'opt1',
        type: 'option',
        title: 'o',
        description: 'o',
        evidence: {path: 'doc.md', startLine: 15, endLine: 15},
      },
      {key: 'a1', type: 'action', title: 'a', description: 'a', evidence: ev},
      {key: 'o1', type: 'outcome', title: 'o', description: 'o', evidence: ev},
    ]
    const edges: ExtractedEdge[] = [
      {
        fromKey: 'g1',
        toKey: 'd1',
        rationale: 'x',
        evidence: ev,
        provenance: {
          relationKind: 'reviewed-association',
          reviewKind: 'maintainer-reviewed',
          reviewedDate: '2026-01-01',
          disclaimer: 'reviewed-association, not-causal-intent',
          fromEvidence: ev,
          toEvidence: {path: 'doc.md', startLine: 10, endLine: 20},
        },
      },
      {
        fromKey: 'opt1',
        toKey: 'd1',
        rationale: 'rejected: x',
        evidence: ev,
        provenance: {relationKind: 'rejected-option'},
      },
      {
        fromKey: 'd1',
        toKey: 'a1',
        rationale: 'x',
        evidence: ev,
        provenance: {
          relationKind: 'commit-supported',
          commitRefs: [{sha: 'a'.repeat(40), date: '2025-10-06', note: 'test commit'}],
        },
      },
      {fromKey: 'a1', toKey: 'o1', rationale: 'x', evidence: ev, provenance: {relationKind: 'source-reported'}},
    ]
    const validation = validateReviewedGraph(nodes, edges)
    expect(validation.errors).toEqual([])
    expect(validation.valid).toBe(true)
  })

  it('rejects an isolated goal with no reviewed-association edge at all', () => {
    const nodes: ExtractedNode[] = [
      {key: 'g1', type: 'goal', title: 'g', description: 'g', evidence: {path: 'doc.md', startLine: 1, endLine: 1}},
    ]
    const validation = validateReviewedGraph(nodes, [])
    expect(validation.valid).toBe(false)
    expect(validation.errors.some(e => e.includes('No reviewed-association edge found'))).toBe(true)
  })

  it('rejects a dangling reviewed-association edge (target decision does not exist)', () => {
    const ev = {path: 'doc.md', startLine: 1, endLine: 1}
    const nodes: ExtractedNode[] = [{key: 'g1', type: 'goal', title: 'g', description: 'g', evidence: ev}]
    const edges: ExtractedEdge[] = [
      {
        fromKey: 'g1',
        toKey: 'nonexistent',
        rationale: 'x',
        evidence: ev,
        provenance: {relationKind: 'reviewed-association'},
      },
    ]
    const validation = validateReviewedGraph(nodes, edges)
    expect(validation.valid).toBe(false)
  })

  it('rejects a wrong association target (association edge does not originate from a goal node)', () => {
    const ev = {path: 'doc.md', startLine: 1, endLine: 1}
    const nodes: ExtractedNode[] = [
      {key: 'a1', type: 'action', title: 'a', description: 'a', evidence: ev},
      {key: 'd1', type: 'decision', title: 'd', description: 'd', evidence: ev},
    ]
    const edges: ExtractedEdge[] = [
      {fromKey: 'a1', toKey: 'd1', rationale: 'x', evidence: ev, provenance: {relationKind: 'reviewed-association'}},
    ]
    const validation = validateReviewedGraph(nodes, edges)
    expect(validation.valid).toBe(false)
    expect(validation.errors.some(e => e.includes('wrong association target'))).toBe(true)
  })
})

describe('validateReviewedGraph provenance shape validation (R1)', () => {
  const goalEv = {path: 'doc.md', startLine: 1, endLine: 1}
  const decisionEv = {path: 'doc.md', startLine: 10, endLine: 20}
  const optionEv = {path: 'doc.md', startLine: 15, endLine: 15}
  const actionEv = {path: 'doc.md', startLine: 30, endLine: 30}
  const outcomeEv = {path: 'doc.md', startLine: 40, endLine: 40}

  function wellFormedFixture(): {nodes: ExtractedNode[]; edges: ExtractedEdge[]} {
    const nodes: ExtractedNode[] = [
      {key: 'g1', type: 'goal', title: 'g', description: 'g', evidence: goalEv},
      {key: 'd1', type: 'decision', title: 'd', description: 'd', evidence: decisionEv},
      {key: 'opt1', type: 'option', title: 'o', description: 'o', evidence: optionEv},
      {key: 'a1', type: 'action', title: 'a', description: 'a', evidence: actionEv},
      {key: 'o1', type: 'outcome', title: 'o', description: 'o', evidence: outcomeEv},
    ]
    const edges: ExtractedEdge[] = [
      {
        fromKey: 'g1',
        toKey: 'd1',
        rationale: 'x',
        evidence: decisionEv,
        provenance: {
          relationKind: 'reviewed-association',
          reviewKind: 'maintainer-reviewed',
          reviewedDate: '2026-01-01',
          disclaimer: 'reviewed-association, not-causal-intent',
          fromEvidence: goalEv,
          toEvidence: decisionEv,
        },
      },
      {
        fromKey: 'opt1',
        toKey: 'd1',
        rationale: 'rejected: x',
        evidence: optionEv,
        provenance: {relationKind: 'rejected-option'},
      },
      {
        fromKey: 'd1',
        toKey: 'a1',
        rationale: 'x',
        evidence: actionEv,
        provenance: {
          relationKind: 'commit-supported',
          commitRefs: [{sha: 'a'.repeat(40), date: '2025-10-06', note: 'test commit'}],
        },
      },
      {fromKey: 'a1', toKey: 'o1', rationale: 'x', evidence: outcomeEv, provenance: {relationKind: 'source-reported'}},
    ]
    return {nodes, edges}
  }

  it('accepts a well-formed reviewed structure with fully valid provenance', () => {
    const {nodes, edges} = wellFormedFixture()
    const validation = validateReviewedGraph(nodes, edges)
    expect(validation.errors).toEqual([])
    expect(validation.valid).toBe(true)
  })

  it('fails gracefully (no throw) when reviewKind is missing entirely', () => {
    const {nodes, edges} = wellFormedFixture()
    const mutated = edges.map(e =>
      e.provenance?.relationKind === 'reviewed-association'
        ? {...e, provenance: {...e.provenance, reviewKind: undefined}}
        : e,
    )
    let validationResult: ReturnType<typeof validateReviewedGraph> | undefined
    expect(() => {
      validationResult = validateReviewedGraph(nodes, mutated)
    }).not.toThrow()
    const validation = expectDefined(validationResult, 'validation result assigned inside the non-throwing callback')
    expect(validation.valid).toBe(false)
    expect(validation.errors.some(e => e.includes('missing or invalid reviewKind'))).toBe(true)
  })

  it('fails when reviewKind has the wrong value (not "maintainer-reviewed")', () => {
    const {nodes, edges} = wellFormedFixture()
    const mutated = edges.map(e =>
      e.provenance?.relationKind === 'reviewed-association'
        ? {...e, provenance: {...e.provenance, reviewKind: 'user' as never}}
        : e,
    )
    const validation = validateReviewedGraph(nodes, mutated)
    expect(validation.valid).toBe(false)
    expect(validation.errors.some(e => e.includes('missing or invalid reviewKind'))).toBe(true)
  })

  it('fails when reviewedDate is empty', () => {
    const {nodes, edges} = wellFormedFixture()
    const mutated = edges.map(e =>
      e.provenance?.relationKind === 'reviewed-association'
        ? {...e, provenance: {...e.provenance, reviewedDate: ''}}
        : e,
    )
    const validation = validateReviewedGraph(nodes, mutated)
    expect(validation.valid).toBe(false)
    expect(validation.errors.some(e => e.includes('missing or empty reviewedDate'))).toBe(true)
  })

  it('fails when disclaimer is missing', () => {
    const {nodes, edges} = wellFormedFixture()
    const mutated = edges.map(e =>
      e.provenance?.relationKind === 'reviewed-association'
        ? {...e, provenance: {...e.provenance, disclaimer: undefined}}
        : e,
    )
    const validation = validateReviewedGraph(nodes, mutated)
    expect(validation.valid).toBe(false)
    expect(validation.errors.some(e => e.includes('missing or empty disclaimer'))).toBe(true)
  })

  it('fails when provenance.fromEvidence/toEvidence is inconsistent with the actual connected nodes (tampered evidence)', () => {
    const {nodes, edges} = wellFormedFixture()
    const mutated = edges.map(e =>
      e.provenance?.relationKind === 'reviewed-association'
        ? {...e, provenance: {...e.provenance, fromEvidence: {path: 'other.md', startLine: 999, endLine: 999}}}
        : e,
    )
    const validation = validateReviewedGraph(nodes, mutated)
    expect(validation.valid).toBe(false)
    expect(validation.errors.some(e => e.includes('fromEvidence inconsistent'))).toBe(true)
  })

  it('fails gracefully (no throw) when commitRefs is entirely missing on a commit-supported edge', () => {
    const {nodes, edges} = wellFormedFixture()
    const mutated = edges.map(e =>
      e.provenance?.relationKind === 'commit-supported'
        ? {...e, provenance: {...e.provenance, commitRefs: undefined}}
        : e,
    )
    let validationResult: ReturnType<typeof validateReviewedGraph> | undefined
    expect(() => {
      validationResult = validateReviewedGraph(nodes, mutated)
    }).not.toThrow()
    const validation = expectDefined(validationResult, 'validation result assigned inside the non-throwing callback')
    expect(validation.valid).toBe(false)
    expect(validation.errors.some(e => e.includes('missing or malformed commitRefs'))).toBe(true)
  })

  it('fails when commitRefs is an empty array', () => {
    const {nodes, edges} = wellFormedFixture()
    const mutated = edges.map(e =>
      e.provenance?.relationKind === 'commit-supported' ? {...e, provenance: {...e.provenance, commitRefs: []}} : e,
    )
    const validation = validateReviewedGraph(nodes, mutated)
    expect(validation.valid).toBe(false)
    expect(validation.errors.some(e => e.includes('missing or malformed commitRefs'))).toBe(true)
  })

  it('fails when a commitRef sha is not a 40-hex string', () => {
    const {nodes, edges} = wellFormedFixture()
    const mutated = edges.map(e =>
      e.provenance?.relationKind === 'commit-supported'
        ? {...e, provenance: {...e.provenance, commitRefs: [{sha: 'not-a-sha', date: '2025-10-06', note: 'x'}]}}
        : e,
    )
    const validation = validateReviewedGraph(nodes, mutated)
    expect(validation.valid).toBe(false)
    expect(validation.errors.some(e => e.includes('missing or malformed commitRefs'))).toBe(true)
  })

  it('fails when a commitRef date is invalid/malformed', () => {
    const {nodes, edges} = wellFormedFixture()
    const mutated = edges.map(e =>
      e.provenance?.relationKind === 'commit-supported'
        ? {...e, provenance: {...e.provenance, commitRefs: [{sha: 'a'.repeat(40), date: 'not-a-date', note: 'x'}]}}
        : e,
    )
    const validation = validateReviewedGraph(nodes, mutated)
    expect(validation.valid).toBe(false)
    expect(validation.errors.some(e => e.includes('missing or malformed commitRefs'))).toBe(true)
  })

  it('the full real-document reviewed graph (approved mapping applied) has fully valid provenance end to end', () => {
    const extracted = extractSourceEvidence(FULL_DOCUMENTS)
    const mapped = applyReviewedMapping(extracted, FULL_DOCUMENTS, AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001)
    const validation = validateReviewedGraph(mapped.nodes, mapped.edges)
    expect(validation.errors).toEqual([])
    expect(validation.valid).toBe(true)
  })
})

describe('applyReviewedMapping rejects ambiguous duplicate goal/decision targets (R2)', () => {
  it('does not bind to either duplicate when two goal nodes AND two decision nodes share path+title; no association created, strict gate fails', () => {
    const path = 'dup.md'
    const snippetG = 'DUPLICATE GOAL SNIPPET'
    const snippetD = 'DUPLICATE DECISION SNIPPET'
    const text = [snippetG, snippetG, snippetD, snippetD].join('\n')

    const result = {
      nodes: [
        {key: 'gA', type: 'goal', title: 'Dup Goal', description: 'x', evidence: {path, startLine: 1, endLine: 1}},
        {key: 'gB', type: 'goal', title: 'Dup Goal', description: 'x', evidence: {path, startLine: 2, endLine: 2}},
        {
          key: 'dA',
          type: 'decision',
          title: 'Dup Decision',
          description: 'x',
          evidence: {path, startLine: 3, endLine: 3},
        },
        {
          key: 'dB',
          type: 'decision',
          title: 'Dup Decision',
          description: 'x',
          evidence: {path, startLine: 4, endLine: 4},
        },
      ] satisfies ExtractedNode[],
      edges: [] as ExtractedEdge[],
      crossReferences: [],
      warnings: [],
    }
    const mapping: ReviewedAssociationMapping = {
      id: 'dup-test-mapping',
      from: {path, sourceSnippet: snippetG, nodeTitle: 'Dup Goal'},
      to: {path, sourceSnippet: snippetD, nodeTitle: 'Dup Decision'},
      rationale: 'test only, not the approved mapping',
      disclaimer: 'reviewed-association, not-causal-intent',
      reviewKind: 'maintainer-reviewed',
      reviewedDate: '2026-01-01',
    }

    const mapped = applyReviewedMapping(result, [{path, text}], mapping)
    expect(mapped.edges).toEqual([])
    expect(
      mapped.warnings.some(
        w => w.includes('not applied') && w.includes('2 goal candidate(s)') && w.includes('2 decision candidate(s)'),
      ),
    ).toBe(true)

    const validation = validateReviewedGraph(mapped.nodes, mapped.edges)
    expect(validation.valid).toBe(false)
    expect(validation.errors.some(e => e.includes('No reviewed-association edge found'))).toBe(true)
  })

  it('does not change the meaning of the real approved mapping (still resolves uniquely against the full real documents)', () => {
    const extracted = extractSourceEvidence(FULL_DOCUMENTS)
    const goalMatches = extracted.nodes.filter(
      n => n.type === 'goal' && n.title === AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001.from.nodeTitle,
    )
    const decisionMatches = extracted.nodes.filter(
      n => n.type === 'decision' && n.title === AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001.to.nodeTitle,
    )
    expect(goalMatches).toHaveLength(1)
    expect(decisionMatches).toHaveLength(1)
    const mapped = applyReviewedMapping(extracted, FULL_DOCUMENTS, AUDIT_IMPROVEMENTS_GOAL_TO_ADR_001)
    expect(mapped.edges.some(e => e.provenance?.relationKind === 'reviewed-association')).toBe(true)
  })
})

describe('decision evidence range covers its Alternatives block regardless of Status order (R3)', () => {
  it("extends the decision's evidence to cover options when Status appears BEFORE Alternatives Considered", () => {
    const text = [
      '### ADR-Y',
      '',
      '**Decision**: Do Y.',
      '',
      '**Status**: IMPLEMENTED',
      '',
      '**Alternatives Considered**:',
      '1. Alt one (rejected: reason one)',
      '2. Alt two (rejected: reason two)',
      '',
    ].join('\n')
    const result = extractSourceEvidence([{path: 'doc.md', text}])
    const decision = expectDefined(
      result.nodes.find(n => n.type === 'decision'),
      'decision node',
    )
    const options = result.nodes.filter(n => n.type === 'option')
    expect(options).toHaveLength(2)
    for (const option of options) {
      expect(option.evidence.startLine).toBeGreaterThanOrEqual(decision.evidence.startLine)
      expect(option.evidence.endLine).toBeLessThanOrEqual(decision.evidence.endLine)
    }
  })

  it("extends the decision's evidence to cover options when there is no Status line at all", () => {
    const text = [
      '### ADR-Z',
      '',
      '**Decision**: Do Z.',
      '',
      '**Alternatives Considered**:',
      '1. Alt one (rejected: reason one)',
      '',
    ].join('\n')
    const result = extractSourceEvidence([{path: 'doc.md', text}])
    const decision = expectDefined(
      result.nodes.find(n => n.type === 'decision'),
      'decision node',
    )
    const option = expectDefined(
      result.nodes.find(n => n.type === 'option'),
      'option node',
    )
    expect(option.evidence.endLine).toBeLessThanOrEqual(decision.evidence.endLine)
    expect(decision.status).toBeUndefined()
  })

  it('a bounded-option strict-gate check now accepts options parsed after Status (regression for the R3 bug)', () => {
    const text = [
      '### ADR-Y',
      '',
      '**Decision**: Do `Y` thing.',
      '',
      '**Status**: IMPLEMENTED',
      '',
      '**Alternatives Considered**:',
      '1. Alt one (rejected: reason one)',
      '',
      '**Solution**: Implemented `Y` thing.',
      '',
      '**Verification**:',
      '- Y check passes',
      '',
    ].join('\n')
    const result = extractSourceEvidence([{path: 'doc.md', text}])
    const decision = expectDefined(
      result.nodes.find(n => n.type === 'decision'),
      'decision node',
    )
    expectDefined(
      result.nodes.find(n => n.type === 'option'),
      'option node',
    )
    const action = expectDefined(
      result.nodes.find(n => n.type === 'action'),
      'action node',
    )
    expectDefined(
      result.nodes.find(n => n.type === 'outcome'),
      'outcome node',
    )
    const goalEv = {path: 'doc.md', startLine: 1, endLine: 1}
    const nodesWithGoal: ExtractedNode[] = [
      {key: 'g1', type: 'goal', title: 'g', description: 'g', evidence: goalEv},
      ...result.nodes,
    ]
    const edgesWithAssociationAndUpgrade: ExtractedEdge[] = [
      ...result.edges.map(e =>
        e.fromKey === decision.key && e.toKey === action.key
          ? {
              ...e,
              provenance: {
                relationKind: 'commit-supported' as const,
                commitRefs: [{sha: 'b'.repeat(40), date: '2025-01-01', note: 'x'}],
              },
            }
          : e,
      ),
      {
        fromKey: 'g1',
        toKey: decision.key,
        rationale: 'x',
        evidence: decision.evidence,
        provenance: {
          relationKind: 'reviewed-association',
          reviewKind: 'maintainer-reviewed',
          reviewedDate: '2026-01-01',
          disclaimer: 'reviewed-association, not-causal-intent',
          fromEvidence: goalEv,
          toEvidence: decision.evidence,
        },
      },
    ]
    const validation = validateReviewedGraph(nodesWithGoal, edgesWithAssociationAndUpgrade)
    expect(validation.errors).toEqual([])
    expect(validation.valid).toBe(true)
  })

  it("does not let a second ADR's options satisfy the first decision's bounded-option check (foreign options still excluded)", () => {
    const text = [
      '### ADR-First',
      '',
      '**Decision**: Do first thing.',
      '',
      '**Alternatives Considered**:',
      '1. First alt (rejected: reason)',
      '',
      '### ADR-Second',
      '',
      '**Decision**: Do second thing.',
      '',
      '**Alternatives Considered**:',
      '1. Second alt (rejected: reason)',
      '',
    ].join('\n')
    const result = extractSourceEvidence([{path: 'doc.md', text}])
    const first = expectDefined(
      result.nodes.find(n => n.title === 'ADR-First'),
      'ADR-First decision node',
    )
    const second = expectDefined(
      result.nodes.find(n => n.title === 'ADR-Second'),
      'ADR-Second decision node',
    )
    const secondOption = expectDefined(
      result.nodes.find(n => n.type === 'option' && n.description.includes('Second alt')),
      'ADR-Second option node',
    )

    // Sanity: extraction itself never wires the second ADR's option to the first decision.
    expect(result.edges.some(e => e.fromKey === secondOption.key && e.toKey === first.key)).toBe(false)

    // Even a maliciously-rewired edge claiming the second option rejects into
    // the first decision must be excluded by the bounds check, since the
    // option's own evidence lies outside the first decision's section.
    const rewired = result.edges.map(e =>
      e.fromKey === secondOption.key && e.toKey === second.key ? {...e, toKey: first.key} : e,
    )
    const boundedForFirst = rewired.filter(e => {
      if (e.fromKey !== secondOption.key || e.toKey !== first.key || e.provenance?.relationKind !== 'rejected-option')
        return false
      const option = result.nodes.find(n => n.key === e.fromKey)
      return (
        option?.evidence.path === first.evidence.path &&
        option.evidence.startLine >= first.evidence.startLine &&
        option.evidence.endLine <= first.evidence.endLine
      )
    })
    expect(boundedForFirst).toEqual([])
  })

  it('regression: the full real ADR-002 range stays exactly 137 (unaffected by the Alternatives-extension change)', () => {
    const result = extractSourceEvidence(FULL_DOCUMENTS)
    const adr002 = expectDefined(
      result.nodes.find(n => n.type === 'decision' && n.title.startsWith('ADR-002')),
      'ADR-002 decision node',
    )
    expect(adr002.evidence).toEqual({path: AUDIT_PATH, startLine: 122, endLine: 137})
  })
})

describe('blank-line-tolerant list adjacency after **Verification**:/**Alternatives Considered**: markers (Prettier requires a blank line before a list following a paragraph)', () => {
  it('a single blank line between **Verification**: and its bullet list still yields the outcome node (Prettier-formatted shape)', () => {
    const unformatted = ['**Solution**: Do X.', '', '**Verification**:', '- check one', '- check two', ''].join('\n')
    const formatted = ['**Solution**: Do X.', '', '**Verification**:', '', '- check one', '- check two', ''].join('\n')
    const unformattedResult = extractSourceEvidence([{path: 'doc.md', text: unformatted}])
    const formattedResult = extractSourceEvidence([{path: 'doc.md', text: formatted}])

    const unformattedOutcome = expectDefined(
      unformattedResult.nodes.find(n => n.type === 'outcome'),
      'unformatted outcome node',
    )
    const formattedOutcome = expectDefined(
      formattedResult.nodes.find(n => n.type === 'outcome'),
      'formatted outcome node',
    )
    expect(formattedOutcome.description).toBe(unformattedOutcome.description)
    expect(formattedOutcome.title).toBe(unformattedOutcome.title)
    expect(formattedOutcome.evidence.endLine).toBe(unformattedOutcome.evidence.endLine + 1)

    const actionKey = expectDefined(
      unformattedResult.nodes.find(n => n.type === 'action'),
      'unformatted action node',
    ).key
    expect(unformattedResult.edges.some(e => e.fromKey === actionKey && e.toKey === unformattedOutcome.key)).toBe(true)
    const formattedActionKey = expectDefined(
      formattedResult.nodes.find(n => n.type === 'action'),
      'formatted action node',
    ).key
    expect(formattedResult.edges.some(e => e.fromKey === formattedActionKey && e.toKey === formattedOutcome.key)).toBe(
      true,
    )
  })

  it('multiple/whitespace-only blank lines between **Verification**: and its bullet list are also tolerated', () => {
    const text = ['**Solution**: Do X.', '', '**Verification**:', '', '   ', '', '- check one', ''].join('\n')
    const result = extractSourceEvidence([{path: 'doc.md', text}])
    const outcome = expectDefined(
      result.nodes.find(n => n.type === 'outcome'),
      'outcome node',
    )
    expect(outcome.description).toBe('check one')
  })

  it('a blank line between **Alternatives Considered**: and its numbered list still yields rejected-option nodes correctly bounded to the decision', () => {
    const text = [
      '### ADR-Blank',
      '',
      '**Decision**: Do the blank-line thing.',
      '',
      '**Alternatives Considered**:',
      '',
      '1. Alt one (rejected: reason one)',
      '2. Alt two (rejected: reason two)',
      '',
    ].join('\n')
    const result = extractSourceEvidence([{path: 'doc.md', text}])
    const decision = expectDefined(
      result.nodes.find(n => n.type === 'decision'),
      'decision node',
    )
    const options = result.nodes.filter(n => n.type === 'option')
    expect(options).toHaveLength(2)
    const rejectedEdges = result.edges.filter(e => e.provenance?.relationKind === 'rejected-option')
    expect(rejectedEdges).toHaveLength(2)
    for (const option of options) {
      expect(option.evidence.startLine).toBeGreaterThanOrEqual(decision.evidence.startLine)
      expect(option.evidence.endLine).toBeLessThanOrEqual(decision.evidence.endLine)
    }
    expect(rejectedEdges.every(e => e.toKey === decision.key)).toBe(true)
  })

  it('**Verification**: followed by blank lines then a NEXT HEADING (no list at all) captures no outcome and does not consume the heading', () => {
    const text = ['### Section A', '', '**Verification**:', '', '### Section B', '', '**Decision**: Do B.', ''].join(
      '\n',
    )
    const result = extractSourceEvidence([{path: 'doc.md', text}])
    expect(result.nodes.some(n => n.type === 'outcome')).toBe(false)
    const decision = expectDefined(
      result.nodes.find(n => n.type === 'decision'),
      'Section B decision node',
    )
    expect(decision.title).toBe('Section B')
  })

  it('**Alternatives Considered**: followed by blank lines then a NEXT HEADING (no list at all) yields no option nodes and does not consume the heading', () => {
    const text = [
      '### ADR-Empty',
      '',
      '**Decision**: Do the empty thing.',
      '',
      '**Alternatives Considered**:',
      '',
      '',
      '### Next Section',
      '',
      '**Decision**: Do the next thing.',
      '',
    ].join('\n')
    const result = extractSourceEvidence([{path: 'doc.md', text}])
    expect(result.nodes.some(n => n.type === 'option')).toBe(false)
    const decisions = result.nodes.filter(n => n.type === 'decision')
    expect(decisions).toHaveLength(2)
    expect(decisions.some(d => d.title === 'Next Section')).toBe(true)
  })

  it('the real, actually-Prettier-formatted full-cli audit-final-report.md fixture still extracts its rejected options and verification outcome', () => {
    const fixturePath = fileURLToPath(new URL('./test-fixtures/full-cli/audit-final-report.md', import.meta.url))
    const fixtureText = readFileSync(fixturePath, 'utf8')
    const result = extractSourceEvidence([{path: 'fixture.md', text: fixtureText}])

    const options = result.nodes.filter(n => n.type === 'option')
    expect(options).toHaveLength(2)
    const rejectedEdges = result.edges.filter(e => e.provenance?.relationKind === 'rejected-option')
    expect(rejectedEdges).toHaveLength(2)

    const outcome = expectDefined(
      result.nodes.find(n => n.type === 'outcome'),
      'outcome node',
    )
    expect(outcome.description).toContain('pnpm check:types')
    const action = expectDefined(
      result.nodes.find(n => n.type === 'action'),
      'action node',
    )
    expect(result.edges.some(e => e.fromKey === action.key && e.toKey === outcome.key)).toBe(true)
  })
})
