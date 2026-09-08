/**
 * Deterministic, source-grounded evidence extraction for the Deciduous
 * bootstrap graph (Unit 4, bounded lane).
 *
 * Design contract:
 * - No classifier / no generic Markdown AST framework. Extraction only
 *   recognizes a small, explicit set of structural markers that already
 *   exist verbatim in the audited source documents (bold field labels such
 *   as `**Decision**:`, numbered "Alternatives Considered" lists, YAML
 *   frontmatter `goal:`/`status:` pairs, `**Verification**:` bullet lists).
 *   Anything that is not one of those explicit markers is left unextracted
 *   rather than guessed at. Fenced code blocks (``` or ~~~, indented up to 3
 *   spaces, closed only by a matching-or-longer fence of the same character)
 *   are skipped entirely for marker scanning — a `**Decision**:`-looking line
 *   inside an example diff is source *content*, not a semantic marker.
 * - Every node and edge carries a `SourceEvidence` pointer (path + 1-based
 *   inclusive line range) back to the exact lines that justified it. No
 *   node is manufactured from paragraph vibes.
 * - Section-local state (the "current decision" and "current action" used to
 *   link a `Verification` block or an `Alternatives Considered` list back to
 *   the marker above them) resets on every Markdown heading, at any level.
 *   Two sibling `###` sections never leak state into each other, so a
 *   `**Verification**:` block in a section with no `**Solution**:` of its
 *   own is reported as an outcome with no supporting action (and a warning),
 *   never silently attached to a different section's action.
 * - Callers pass in `documents` (`{path, text}`) directly — there is no
 *   filename-based special-casing ("if path contains 'plan'..."). The same
 *   marker scan runs uniformly over every supplied document, so the
 *   contract is "explicit markers, wherever they occur" rather than
 *   "magic knowledge of two specific files".
 * - Local `key` values are internal-only planning identifiers (stable for
 *   a given input, not real Deciduous IDs). Integrators mint real IDs
 *   later; this module never claims to.
 * - Cross-references are extracted separately from causal edges: a
 *   Markdown link is evidence that document A *mentions* document B, not
 *   that A caused, decided, or resulted in B. Only explicit marker-driven
 *   relationships (e.g. a rejected alternative next to a Decision) become
 *   edges.
 * - A decision→action edge inferred purely from a shared inline-code token
 *   (e.g. both mention `` `rootDir` ``) is a weak, generic signal — common
 *   tokens like `package.json` appear across unrelated pairs constantly.
 *   This module fails closed on ambiguity: if a decision's shared-token
 *   match isn't a mutually unique 1:1 pairing with exactly one action (and
 *   vice versa), no edge is created and a warning is recorded instead of a
 *   fabricated causal link. Even the unambiguous case is recorded as
 *   `source-reported` (an inferred textual association), never as proof of
 *   implementation — only an approved `ReviewedAssociationMapping` with an
 *   explicit `expectedAction` guard can upgrade a specific edge to
 *   `commit-supported`.
 *
 * Known limitation (documented, not silently papered over): this module
 * does not connect a `goal` node to a `decision` node found in a
 * "different" document unless an explicit Markdown link or shared
 * identifier ties them together in the extracted text. Automatic extraction
 * alone does not establish that connection — doing so would be an
 * authored/inferred mapping, not a grounded extraction.
 *
 * Reviewed cross-document associations (additive, opt-in): a human can
 * explicitly review two artifacts and approve treating them as related
 * without claiming original causal intent. That approval is supplied
 * externally as a `ReviewedAssociationMapping` (see the sibling
 * `reviewed-mapping.ts` for the one currently approved instance) and applied
 * via `applyReviewedMapping`, which re-verifies the mapping's declared source
 * snippets are still literally present *within the specific node's own
 * evidence range* (not just anywhere in the document — a quoted string
 * relocated to an unrelated section must not pass) before adding anything.
 * If the source has drifted, it emits a warning and adds nothing, rather
 * than silently attaching an approved label to changed or unrelated
 * content. `extractSourceEvidence` itself remains fully automatic and
 * mapping-free.
 *
 * Validation surface: `validateGroundedChain` is the shared, permissive walk
 * (non-dangling, correctly ordered, evidence-backed) used internally; it
 * intentionally tolerates isolated nodes and partial fragments because
 * automatic extraction alone is often incomplete, and is not the public
 * integration gate (see its doc comment). `validateReviewedGraph` is the
 * single public gate: it requires an actual, fully-connected reviewed
 * structure (goal → reviewed-association → decision ← rejected-option(s),
 * decision → commit-supported → action → outcome) anchored on the approved
 * mapping, and fails if the mapping was never applied.
 */

import posixPath from 'node:path/posix'

/** A source document supplied for extraction, addressed by repo-relative path. */
export interface SourceDocumentInput {
  readonly path: string
  readonly text: string
}

/** Node types recognized by the bounded chain walk (goal → option → decision → action → outcome). */
export type GroundedNodeType = 'goal' | 'option' | 'decision' | 'action' | 'outcome'

/** A pointer back to the exact source lines that justify a node or edge. */
export interface SourceEvidenceRange {
  readonly path: string
  /** 1-based, inclusive. */
  readonly startLine: number
  /** 1-based, inclusive. */
  readonly endLine: number
}

/** An extracted node. `key` is a stable, extraction-local identifier — not a real Deciduous ID. */
export interface ExtractedNode {
  readonly key: string
  readonly type: GroundedNodeType
  readonly title: string
  readonly description: string
  readonly evidence: SourceEvidenceRange
  /** Explicit status text from source (e.g. "IMPLEMENTED", "Completed"), when present verbatim. */
  readonly status?: string
  /** Explicit date from source (e.g. frontmatter `last_updated`), retained as historical fact. */
  readonly date?: string
}

/**
 * How an edge's relationship claim is grounded. This is a qualifier on the
 * "strength/kind" of evidence behind an edge, kept distinct from whether the
 * edge exists at all:
 * - `rejected-option`: this option's own text says it was rejected in favor
 *   of the connected decision (source-internal, no external corroboration
 *   needed).
 * - `source-reported`: the source document itself asserts the relationship
 *   (e.g. a "Verification" section reporting a result, or an inferred
 *   shared-token decision/action pairing) without independent (e.g. live
 *   test-run or git) corroboration at extraction time. Never treated as
 *   proof of implementation on its own.
 * - `commit-supported`: the relationship is additionally backed by a
 *   specific, explicitly declared commit reference (sha + date), supplied as
 *   static historical evidence — never fetched via a live git call from this
 *   pure module, and only ever applied to the one action an approved
 *   mapping's `expectedAction` guard uniquely resolves.
 * - `reviewed-association`: a human reviewed two artifacts and explicitly
 *   approved treating them as related, while explicitly *not* claiming
 *   original causal/planned intent. Only ever added by `applyReviewedMapping`
 *   from an externally supplied, snippet-verified `ReviewedAssociationMapping`
 *   — never inferred automatically by `extractSourceEvidence`.
 */
export type EdgeRelationKind = 'rejected-option' | 'source-reported' | 'commit-supported' | 'reviewed-association'

/** How a reviewed association was approved. No personal identity/PII — a role/kind only. */
export type ReviewKind = 'maintainer-reviewed'

/** A statically declared historical commit reference (never fetched live from git by this module). */
export interface DeclaredCommitRef {
  readonly sha: string
  readonly date: string
  readonly note: string
}

/** Additive provenance detail for an edge, describing the kind and strength of its grounding. */
export interface EdgeProvenance {
  readonly relationKind: EdgeRelationKind
  readonly reviewKind?: ReviewKind
  readonly reviewedDate?: string
  readonly disclaimer?: string
  readonly commitRefs?: readonly DeclaredCommitRef[]
  readonly fromEvidence?: SourceEvidenceRange
  readonly toEvidence?: SourceEvidenceRange
}

/** An extracted, explicitly-justified relationship between two extracted nodes. */
export interface ExtractedEdge {
  readonly fromKey: string
  readonly toKey: string
  readonly rationale: string
  readonly evidence: SourceEvidenceRange
  /** Additive, optional. Absence does not change any existing consumer's behavior. */
  readonly provenance?: EdgeProvenance
}

/** A Markdown link found in source text, normalized and checked against the supplied document set. */
export interface ExtractedCrossReference {
  readonly fromPath: string
  readonly linkText: string
  /** Raw link target as written in source (before normalization). */
  readonly rawTarget: string
  /** Normalized repo-relative path this link resolves to, or `undefined` for a same-document anchor link. */
  readonly resolvedPath: string | undefined
  /** Anchor fragment, if any, without the leading `#`. */
  readonly anchor: string | undefined
  readonly evidence: SourceEvidenceRange
  /** True when `resolvedPath` (or the same document, for anchor-only links) is present in the supplied document set. */
  readonly resolved: boolean
}

export interface SourceExtractionResult {
  readonly nodes: readonly ExtractedNode[]
  readonly edges: readonly ExtractedEdge[]
  readonly crossReferences: readonly ExtractedCrossReference[]
  readonly warnings: readonly string[]
}

export interface GroundedChainValidation {
  readonly valid: boolean
  readonly errors: readonly string[]
  readonly warnings: readonly string[]
}

const FRONTMATTER_DELIMITER = /^---\s*$/
// Note: the leading `\s*` and the capturing group below are anchored on a
// non-whitespace first character (`\S`) rather than the ReDoS-prone
// `\s*(.+)$` shape, where an optional run of whitespace immediately
// followed by an unbounded "anything" group can backtrack over the same
// whitespace characters in polynomially many ways. This preserves the
// captured value exactly for any line with real (non-whitespace-only)
// content; a value consisting entirely of whitespace now fails to match
// instead of capturing a whitespace-only string (see source-evidence.test.ts
// regression coverage).
const FRONTMATTER_GOAL = /^goal:\s*(\S.*)$/
const FRONTMATTER_STATUS = /^status:\s*(\S.*)$/
const FRONTMATTER_LAST_UPDATED = /^last_updated:\s*(\S.*)$/
const FRONTMATTER_DATE_CREATED = /^date_created:\s*(\S.*)$/

// Heading hashes are matched but never captured (only the trimmed title
// text is used), and the interior capture is anchored the same way as
// above to avoid the `\s+`/`.+?`/trailing-`\s*` backtracking ambiguity.
const HEADING = /^#{1,6}\s+(\S.*)$/
const FENCE_DELIMITER = /^ {0,3}(`{3,}|~{3,})/

const BOLD_DECISION = /^\*\*Decision\*\*:\s*(\S.*)$/
const BOLD_STATUS_LINE = /^\*\*Status\*\*:\s*(\S.*)$/
const BOLD_ALTERNATIVES_HEADER = /^\*\*Alternatives Considered\*\*:\s*$/
const NUMBERED_ITEM = /^\d+\.\s+(\S.*)$/
const REJECTED_RATIONALE = /\(rejected:\s*([^)\s][^)]*)\)/i

const BOLD_SOLUTION = /^\*\*Solution\*\*:\s*(\S.*)$/
const BOLD_VERIFICATION_HEADER = /^\*\*Verification\*\*:\s*$/
const BULLET_ITEM = /^-\s+(\S.*)$/

const MARKDOWN_LINK = /\[([^\]]+)\]\(([^)]+)\)/g
const EXTERNAL_SCHEME = /^[a-z][a-z0-9+.-]*:/i

/** Splits into 1-based-indexable lines (index 0 is unused padding so `lines[n]` is line `n`). */
function toLines(text: string): string[] {
  return ['', ...text.split(/\r?\n/)]
}

/** A line containing only whitespace (or nothing) — the blank line Prettier requires between a paragraph/marker and a following list. */
function isBlankLine(line: string): boolean {
  return /^\s*$/.test(line)
}

/**
 * Advances past zero or more blank lines starting at `startIndex`, returning the index of the
 * first non-blank line (which may or may not turn out to be a list item — callers still validate
 * that separately). This is intentionally the ONLY Markdown-structure concession made here: valid
 * CommonMark/Prettier output requires a blank line between a paragraph-like marker (`**Verification**:`,
 * `**Alternatives Considered**:`) and the list that follows it, so treating the immediately-next
 * line as the list is too strict and silently drops real content. This does not become a general
 * Markdown parser — it only skips whitespace-only lines, never headings, fences, or other content,
 * so a marker with no following list (just blank lines then unrelated content) still correctly
 * yields nothing rather than reaching into the next section.
 */
function skipBlankLines(lines: readonly string[], startIndex: number): number {
  let index = startIndex
  while (index < lines.length && isBlankLine(lines[index] ?? '')) {
    index += 1
  }
  return index
}

/**
 * Narrows a possibly-`undefined` lookup/index result to `T`, replacing a bare
 * non-null assertion (`!`) with an explicit, type-safe invariant check. Every
 * call site here follows a preceding guard (e.g. an index/length check just
 * above) that already guarantees the value exists; this only exists to give
 * that guarantee a checked, descriptive failure instead of `!`'s silent,
 * unchecked one if the invariant is ever violated by a future edit.
 */
function definitely<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(`Invariant violation: ${message}`)
  return value
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    .slice(0, 60)
}

const INLINE_CODE_SPAN = /`([^`]+)`/g

/** Extracts the set of backtick-quoted inline code spans from a line of text. */
function extractCodeSpans(text: string): Set<string> {
  const spans = new Set<string>()
  for (const match of text.matchAll(INLINE_CODE_SPAN)) {
    const span = match[1]?.trim()
    if (span) spans.add(span)
  }
  return spans
}

/**
 * Checks that `snippet` literally appears within `text`'s lines
 * `evidence.startLine..evidence.endLine` (1-based, inclusive) — not merely
 * anywhere in the document. Used to guard reviewed-mapping application
 * against a snippet that's still present somewhere in the file but has
 * moved out of the specific node's own section.
 */
function evidenceContainsSnippet(text: string, evidence: SourceEvidenceRange, snippet: string): boolean {
  const lines = toLines(text)
  const slice = lines.slice(evidence.startLine, evidence.endLine + 1).join('\n')
  return slice.includes(snippet)
}

function makeKeyFactory(): (path: string, type: GroundedNodeType, title: string) => string {
  const seen = new Map<string, number>()
  return (path: string, type: GroundedNodeType, title: string): string => {
    const base = `${slug(path)}::${type}::${slug(title) || 'untitled'}`
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return count === 0 ? base : `${base}--${count}`
  }
}

/**
 * Extracts goal/option/decision/action/outcome nodes, the edges that
 * explicitly connect them, and repo-relative Markdown cross-references,
 * from the supplied documents.
 *
 * Pure and deterministic: no filesystem, network, or `deciduous`/`gh`
 * calls. Given the same `documents` array, always returns the same
 * result (aside from key-collision suffixing order, which follows
 * document array order).
 */
export function extractSourceEvidence(documents: readonly SourceDocumentInput[]): SourceExtractionResult {
  const nodes: ExtractedNode[] = []
  const edges: ExtractedEdge[] = []
  const crossReferences: ExtractedCrossReference[] = []
  const warnings: string[] = []
  const nextKey = makeKeyFactory()
  const knownPaths = new Set(documents.map(doc => doc.path))

  for (const doc of documents) {
    const lines = toLines(doc.text)
    let currentHeading = ''
    let currentHeadingLine = 0
    let lastDecisionKey: string | undefined
    let lastActionKey: string | undefined
    let inFence = false
    let fenceChar = ''
    let fenceLen = 0

    // --- Frontmatter goal (explicit `goal:` / `status:` YAML fields) ---
    if (FRONTMATTER_DELIMITER.test(lines[1] ?? '')) {
      let closeLine = 0
      for (let i = 2; i < lines.length; i++) {
        if (FRONTMATTER_DELIMITER.test(lines[i] ?? '')) {
          closeLine = i
          break
        }
      }
      if (closeLine > 0) {
        let goalLine = 0
        let goalText = ''
        let statusLine = 0
        let statusText = ''
        let dateText = ''
        for (let i = 2; i < closeLine; i++) {
          const line = lines[i] ?? ''
          const goalMatch = FRONTMATTER_GOAL.exec(line)
          if (goalMatch) {
            goalLine = i
            goalText = goalMatch[1] ?? ''
          }
          const statusMatch = FRONTMATTER_STATUS.exec(line)
          if (statusMatch) {
            statusLine = i
            statusText = statusMatch[1] ?? ''
          }
          const lastUpdatedMatch = FRONTMATTER_LAST_UPDATED.exec(line)
          if (lastUpdatedMatch) dateText = lastUpdatedMatch[1] ?? ''
          const dateCreatedMatch = FRONTMATTER_DATE_CREATED.exec(line)
          if (dateCreatedMatch && !dateText) dateText = dateCreatedMatch[1] ?? ''
        }
        if (goalLine > 0) {
          const endLine = Math.max(statusLine, goalLine)
          nodes.push({
            key: nextKey(doc.path, 'goal', goalText),
            type: 'goal',
            title: goalText,
            description: goalText,
            evidence: {path: doc.path, startLine: goalLine, endLine},
            status: statusText || undefined,
            date: dateText || undefined,
          })
        }
      }
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i] ?? ''

      // --- Fenced code blocks are source content, never semantic markers. ---
      const fenceMatch = FENCE_DELIMITER.exec(line)
      if (fenceMatch) {
        const marker = definitely(fenceMatch[1], 'FENCE_DELIMITER always captures a mandatory group 1 when it matches')
        if (!inFence) {
          inFence = true
          fenceChar = definitely(marker[0], 'the fence marker quantifier requires at least 3 characters')
          fenceLen = marker.length
        } else if (marker[0] === fenceChar && marker.length >= fenceLen) {
          inFence = false
        }
        continue
      }
      if (inFence) continue

      // --- Headings reset section-local state: a "current decision"/"current
      //     action" never leaks from one ### section into a sibling one. ---
      const headingMatch = HEADING.exec(line)
      if (headingMatch) {
        currentHeading = headingMatch[1] ?? ''
        currentHeadingLine = i
        lastDecisionKey = undefined
        lastActionKey = undefined
        continue
      }

      // --- Decision (`**Decision**: ...`) ---
      const decisionMatch = BOLD_DECISION.exec(line)
      if (decisionMatch) {
        const title = currentHeading || (decisionMatch[1] ?? 'Decision')
        const key = nextKey(doc.path, 'decision', title)
        nodes.push({
          key,
          type: 'decision',
          title,
          description: decisionMatch[1] ?? '',
          evidence: {path: doc.path, startLine: currentHeadingLine || i, endLine: i},
        })
        lastDecisionKey = key
        continue
      }

      // --- Status attaches to the most recently seen decision in the SAME
      //     heading section only (headings above reset lastDecisionKey), and
      //     never overwrites a status already set for that decision. ---
      const statusMatch = BOLD_STATUS_LINE.exec(line)
      if (statusMatch && lastDecisionKey) {
        const idx = nodes.findIndex(n => n.key === lastDecisionKey)
        if (idx !== -1) {
          const existing = definitely(nodes[idx], 'idx came from a successful findIndex on this same array')
          if (existing.status === undefined) {
            nodes[idx] = {
              ...existing,
              status: statusMatch[1] ?? '',
              evidence: {...existing.evidence, endLine: Math.max(existing.evidence.endLine, i)},
            }
          }
        }
        continue
      }

      // --- Alternatives Considered → rejected option nodes + edges to the decision ---
      if (BOLD_ALTERNATIVES_HEADER.test(line) && lastDecisionKey) {
        // Zero or more blank lines are valid (Prettier-required, even) between the marker and its
        // first numbered item — see skipBlankLines. A marker with no list at all (blank lines then
        // unrelated content) still yields nothing: the item-match loop below breaks immediately.
        let j = skipBlankLines(lines, i + 1)
        let lastOptionLine = i
        while (j < lines.length) {
          const candidate = lines[j] ?? ''
          const itemMatch = NUMBERED_ITEM.exec(candidate)
          if (!itemMatch) break
          const itemText = itemMatch[1] ?? ''
          const rationaleMatch = REJECTED_RATIONALE.exec(itemText)
          const optionTitle = itemText.replace(REJECTED_RATIONALE, '').trim()
          const optionKey = nextKey(doc.path, 'option', optionTitle)
          nodes.push({
            key: optionKey,
            type: 'option',
            title: optionTitle,
            description: itemText,
            evidence: {path: doc.path, startLine: j, endLine: j},
          })
          edges.push({
            fromKey: optionKey,
            toKey: lastDecisionKey,
            rationale: rationaleMatch ? `rejected: ${rationaleMatch[1]}` : 'rejected (no explicit reason given)',
            evidence: {path: doc.path, startLine: j, endLine: j},
            provenance: {relationKind: 'rejected-option'},
          })
          lastOptionLine = j
          j += 1
        }
        // Extend the decision's own evidence range to cover its Alternatives
        // block, regardless of whether Status appears before or after it (or
        // not at all) — a downstream "is this option within the decision's own
        // section" bounds check must not reject legitimate options just
        // because Status happened to come first, or is missing. This never
        // extends past the current section: headings above already reset
        // lastDecisionKey, and this loop only consumes consecutive numbered
        // lines immediately following the marker.
        if (lastOptionLine > i) {
          const idx = nodes.findIndex(n => n.key === lastDecisionKey)
          if (idx !== -1) {
            const existing = definitely(nodes[idx], 'idx came from a successful findIndex on this same array')
            if (lastOptionLine > existing.evidence.endLine) {
              nodes[idx] = {...existing, evidence: {...existing.evidence, endLine: lastOptionLine}}
            }
          }
        }
        i = j - 1
        continue
      }

      // --- Solution → action node. Linked to a decision afterwards (see below), not
      //     here, because in real audit reports the "Change" section documenting the
      //     Solution frequently appears *before* the "ADR" section documenting the
      //     Decision that motivated it — sequential lastDecisionKey tracking would
      //     silently miss (or misattribute) that edge. ---
      const solutionMatch = BOLD_SOLUTION.exec(line)
      if (solutionMatch) {
        const title = currentHeading || 'Solution'
        const key = nextKey(doc.path, 'action', title)
        nodes.push({
          key,
          type: 'action',
          title,
          description: solutionMatch[1] ?? '',
          evidence: {path: doc.path, startLine: currentHeadingLine || i, endLine: i},
        })
        lastActionKey = key
        continue
      }

      // --- Verification bullets → a single outcome node, linked from the current
      //     action IF one exists in this same section. A section with Verification
      //     but no Solution (e.g. a change documented only by a "Reason") still
      //     yields an outcome fact, but with no action edge and an explicit warning
      //     — never silently attached to a different section's leftover action. ---
      if (BOLD_VERIFICATION_HEADER.test(line)) {
        const startLine = i
        let endLine = i
        const bulletTexts: string[] = []
        // Zero or more blank lines are valid (Prettier-required, even) between the marker and its
        // first bullet — see skipBlankLines. A marker with no list at all (blank lines then
        // unrelated content, e.g. a following heading) still yields nothing: the bullet-match loop
        // below breaks immediately, and `i = j - 1` below resumes normal scanning at that content
        // rather than consuming it.
        let j = skipBlankLines(lines, i + 1)
        while (j < lines.length) {
          const candidate = lines[j] ?? ''
          const bulletMatch = BULLET_ITEM.exec(candidate)
          if (!bulletMatch) break
          bulletTexts.push(bulletMatch[1] ?? '')
          endLine = j
          j += 1
        }
        if (bulletTexts.length > 0) {
          const title = currentHeading ? `Verification: ${currentHeading}` : 'Verification'
          const key = nextKey(doc.path, 'outcome', title)
          nodes.push({
            key,
            type: 'outcome',
            title,
            description: bulletTexts.join(' | '),
            evidence: {path: doc.path, startLine, endLine},
          })
          if (lastActionKey) {
            edges.push({
              fromKey: lastActionKey,
              toKey: key,
              rationale: 'reported verification outcome for this action',
              evidence: {path: doc.path, startLine, endLine},
              // Source-reported only: the document asserts this outcome; extraction
              // never independently runs tests or otherwise re-verifies it.
              provenance: {relationKind: 'source-reported'},
            })
          } else {
            warnings.push(
              `Verification found with no preceding action in the same section ("${currentHeading || 'untitled section'}") at ${doc.path}:${startLine} — outcome extracted without a supporting action -> outcome edge.`,
            )
          }
        }
        i = j - 1
        continue
      }
    }

    // --- Decision → action edges, linked by an explicit shared inline-code
    //     reference (e.g. both mention `docs/tsconfig.json`) rather than by
    //     document order. Fails closed on ambiguity: a shared token that
    //     matches more than one action (or an action matched by more than one
    //     decision) is common for generic tokens like `package.json` and must
    //     not fabricate a causal link — only a mutually unique 1:1 pairing
    //     produces an edge, and even then it is recorded as `source-reported`
    //     (an inferred textual association), never as proof of
    //     implementation. ---
    const decisionsInDoc = nodes.filter(n => n.type === 'decision' && n.evidence.path === doc.path)
    const actionsInDoc = nodes.filter(n => n.type === 'action' && n.evidence.path === doc.path)
    const decisionCandidateActions = new Map<string, string[]>()
    const actionCandidateDecisions = new Map<string, string[]>()
    for (const decision of decisionsInDoc) {
      const decisionSpans = extractCodeSpans(decision.description)
      if (decisionSpans.size === 0) continue
      for (const action of actionsInDoc) {
        const actionSpans = extractCodeSpans(action.description)
        const shared = [...decisionSpans].filter(span => actionSpans.has(span))
        if (shared.length === 0) continue
        decisionCandidateActions.set(decision.key, [...(decisionCandidateActions.get(decision.key) ?? []), action.key])
        actionCandidateDecisions.set(action.key, [...(actionCandidateDecisions.get(action.key) ?? []), decision.key])
      }
    }
    for (const [decisionKey, actionKeys] of decisionCandidateActions) {
      if (actionKeys.length !== 1) {
        warnings.push(
          `Ambiguous shared inline-code-span match for decision "${decisionKey}" in ${doc.path}: ${actionKeys.length} candidate action(s) share a token — inferred decision -> action link dropped rather than fabricating a causal edge.`,
        )
        continue
      }
      const actionKey = definitely(actionKeys[0], 'actionKeys.length === 1 was just checked above')
      const reciprocal = actionCandidateDecisions.get(actionKey) ?? []
      if (reciprocal.length !== 1) {
        warnings.push(
          `Ambiguous shared inline-code-span match for action "${actionKey}" in ${doc.path}: it shares a token with ${reciprocal.length} decision(s) — inferred decision -> action link dropped rather than fabricating a causal edge.`,
        )
        continue
      }
      const decision = definitely(
        decisionsInDoc.find(d => d.key === decisionKey),
        'decisionKey originated from a decision.key in decisionsInDoc',
      )
      const action = definitely(
        actionsInDoc.find(a => a.key === actionKey),
        'actionKey originated from an action.key in actionsInDoc',
      )
      const decisionSpans = extractCodeSpans(decision.description)
      const actionSpans = extractCodeSpans(action.description)
      const shared = [...decisionSpans].find(span => actionSpans.has(span))
      edges.push({
        fromKey: decision.key,
        toKey: action.key,
        rationale: `reported association via shared inline reference (not a proven implementation link): \`${shared}\``,
        evidence: {
          path: doc.path,
          startLine: Math.min(decision.evidence.startLine, action.evidence.startLine),
          endLine: Math.max(decision.evidence.endLine, action.evidence.endLine),
        },
        // Default is source-reported (text-only, generic, no external knowledge).
        // An approved ReviewedAssociationMapping with an explicit expectedAction
        // guard may upgrade this specific edge to `commit-supported` — this pure,
        // generic extractor cannot know that without such input.
        provenance: {relationKind: 'source-reported'},
      })
    }

    // --- Repo-relative Markdown cross-references (mentions, not causal edges) ---
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i] ?? ''
      for (const match of line.matchAll(MARKDOWN_LINK)) {
        const linkText = match[1] ?? ''
        const rawTarget = (match[2] ?? '').trim()
        if (rawTarget === '' || EXTERNAL_SCHEME.test(rawTarget)) continue

        const evidence: SourceEvidenceRange = {path: doc.path, startLine: i, endLine: i}

        if (rawTarget.startsWith('#')) {
          const anchor = rawTarget.slice(1)
          crossReferences.push({
            fromPath: doc.path,
            linkText,
            rawTarget,
            resolvedPath: undefined,
            anchor,
            evidence,
            resolved: true,
          })
          continue
        }

        const hashIndex = rawTarget.indexOf('#')
        const pathPart = hashIndex === -1 ? rawTarget : rawTarget.slice(0, hashIndex)
        const anchorPart = hashIndex === -1 ? undefined : rawTarget.slice(hashIndex + 1)

        const resolvedPath = posixPath.normalize(posixPath.join(posixPath.dirname(doc.path), pathPart))
        const resolved = knownPaths.has(resolvedPath)
        if (!resolved) {
          warnings.push(
            `Unresolved cross-reference in ${doc.path}:${i} — "${rawTarget}" does not match any supplied document path (resolved to "${resolvedPath}")`,
          )
        }
        crossReferences.push({
          fromPath: doc.path,
          linkText,
          rawTarget,
          resolvedPath,
          anchor: anchorPart,
          evidence,
          resolved,
        })
      }
    }
  }

  return {nodes, edges, crossReferences, warnings}
}

const ALLOWED_TRANSITIONS = new Set<string>([
  'goal->option',
  'goal->decision',
  'option->decision',
  'decision->action',
  'action->outcome',
])

const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/i
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Non-throwing shape check for a single declared commit reference. */
function isValidDeclaredCommitRef(ref: unknown): ref is DeclaredCommitRef {
  if (typeof ref !== 'object' || ref === null) return false
  const candidate = ref as Record<string, unknown>
  return (
    typeof candidate.sha === 'string' &&
    COMMIT_SHA_PATTERN.test(candidate.sha) &&
    typeof candidate.date === 'string' &&
    ISO_DATE_PATTERN.test(candidate.date) &&
    !Number.isNaN(Date.parse(candidate.date)) &&
    typeof candidate.note === 'string' &&
    candidate.note.trim() !== ''
  )
}

/** Non-throwing check that a non-empty string field is present. */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

/** Non-throwing structural equality check for two evidence ranges. */
function evidenceRangesEqual(a: SourceEvidenceRange | undefined, b: SourceEvidenceRange | undefined): boolean {
  if (!a || !b) return false
  return a.path === b.path && a.startLine === b.startLine && a.endLine === b.endLine
}

/**
 * Shared, permissive walk used internally by `validateReviewedGraph`
 * (and directly by this module's own tests to exercise the walk without
 * duplicating its logic). Not the public integration gate — it intentionally
 * tolerates isolated nodes and partial fragments, because automatic
 * extraction alone is often incomplete. Callers integrating with the
 * bootstrap CLI should use `validateReviewedGraph` instead.
 *
 * Validates that extracted edges form a grounded (non-dangling, correctly
 * ordered, evidence-backed) walk over goal → option → decision → action →
 * outcome. Does not require every type to be present, and does not require
 * a single connected path spanning all five types — partial, evidence-only
 * fragments are valid; only requires that whatever nodes/edges exist are
 * internally consistent.
 *
 * @internal
 */
export function validateGroundedChain(
  nodes: readonly ExtractedNode[],
  edges: readonly ExtractedEdge[],
): GroundedChainValidation {
  const errors: string[] = []
  const warnings: string[] = []
  const byKey = new Map(nodes.map(n => [n.key, n]))

  if (nodes.length === 0) {
    errors.push('No nodes extracted: at least one grounded node is required overall.')
  }

  for (const node of nodes) {
    if (!node.evidence.path) {
      errors.push(`Node "${node.key}" has no evidence path.`)
    }
    if (!(node.evidence.startLine >= 1) || !(node.evidence.endLine >= node.evidence.startLine)) {
      errors.push(`Node "${node.key}" has an invalid or empty evidence range.`)
    }
  }

  const adjacency = new Map<string, string[]>()
  for (const edge of edges) {
    const from = byKey.get(edge.fromKey)
    const to = byKey.get(edge.toKey)
    if (!from) {
      errors.push(`Dangling edge: fromKey "${edge.fromKey}" does not match any extracted node.`)
      continue
    }
    if (!to) {
      errors.push(`Dangling edge: toKey "${edge.toKey}" does not match any extracted node.`)
      continue
    }
    if (!edge.evidence.path || !(edge.evidence.startLine >= 1) || !(edge.evidence.endLine >= edge.evidence.startLine)) {
      errors.push(`Edge "${edge.fromKey}" -> "${edge.toKey}" has an invalid or empty evidence range.`)
    }
    const transitionKey = `${from.type}->${to.type}`
    if (!ALLOWED_TRANSITIONS.has(transitionKey) && from.type !== to.type) {
      // Rejected-option edges point option -> decision, which is allowed above;
      // anything else out of chain order is flagged as a wrong-order edge.
      errors.push(
        `Edge "${edge.fromKey}" (${from.type}) -> "${edge.toKey}" (${to.type}) is not a valid chain transition.`,
      )
    }
    if (from.type === to.type && from.key !== to.key) {
      warnings.push(`Edge "${edge.fromKey}" -> "${edge.toKey}" connects two nodes of the same type ("${from.type}").`)
    }
    const list = adjacency.get(edge.fromKey) ?? []
    list.push(edge.toKey)
    adjacency.set(edge.fromKey, list)
  }

  // Cycle detection (defense in depth beyond the type-order check above).
  const WHITE = 0
  const GRAY = 1
  const BLACK = 2
  const color = new Map<string, number>(nodes.map(n => [n.key, WHITE]))
  const hasCycle = (start: string): boolean => {
    const stack: {key: string; iter: number}[] = [{key: start, iter: 0}]
    color.set(start, GRAY)
    while (stack.length > 0) {
      const frame = definitely(stack.at(-1), 'the while loop condition just checked stack.length > 0')
      const neighbors = adjacency.get(frame.key) ?? []
      if (frame.iter < neighbors.length) {
        const next = definitely(neighbors[frame.iter], 'frame.iter < neighbors.length was just checked above')
        frame.iter += 1
        const nextColor = color.get(next)
        if (nextColor === GRAY) return true
        if (nextColor === WHITE) {
          color.set(next, GRAY)
          stack.push({key: next, iter: 0})
        }
      } else {
        color.set(frame.key, BLACK)
        stack.pop()
      }
    }
    return false
  }
  for (const node of nodes) {
    if (color.get(node.key) === WHITE && hasCycle(node.key)) {
      errors.push('Cycle detected among extracted edges.')
      break
    }
  }

  return {valid: errors.length === 0, errors, warnings}
}

/**
 * An externally reviewed, human-approved association between a `goal` node
 * (in one document) and a `decision` node (potentially in another document),
 * explicitly qualified as a *reviewed association* rather than a claim of
 * original causal or planned intent.
 *
 * Matching is done by exact node `title` plus a verbatim source snippet
 * that must appear *within that specific node's own evidence range* — not
 * merely somewhere in the document (a quoted string relocated to an
 * unrelated section must not pass) — not by line number, which shifts as
 * documents are edited.
 */
export interface ReviewedAssociationMapping {
  readonly id: string
  readonly from: {
    readonly path: string
    /** Verbatim substring expected within the goal node's own evidence range; checked for drift before applying. */
    readonly sourceSnippet: string
    /** Must equal the extracted goal node's `title` for this mapping to attach. */
    readonly nodeTitle: string
  }
  readonly to: {
    readonly path: string
    /** Verbatim substring expected within the decision node's own evidence range. */
    readonly sourceSnippet: string
    /** Must equal the extracted decision node's `title` for this mapping to attach. */
    readonly nodeTitle: string
  }
  readonly rationale: string
  readonly disclaimer: string
  readonly reviewKind: ReviewKind
  readonly reviewedDate: string
  /**
   * Required guard for `decisionActionUpgrade`: identifies the single,
   * unique action node the commit reference applies to. If this does not
   * resolve to exactly one action node (by path + title), or its snippet
   * isn't found within that action's own evidence range, the upgrade is
   * skipped with a warning — the approved commit association is never
   * silently extended to an arbitrary or ambiguous action.
   */
  readonly expectedAction?: {
    readonly path: string
    readonly sourceSnippet: string
    readonly nodeTitle: string
  }
  /**
   * Optional: additionally upgrade the (already-extracted, source-reported)
   * decision→action edge for this same decision to `commit-supported`, using
   * a specific, statically declared commit reference. Never fetched live.
   * Requires `expectedAction` to be set; otherwise skipped with a warning.
   */
  readonly decisionActionUpgrade?: {
    readonly relationKind: 'commit-supported'
    readonly commitRefs: readonly DeclaredCommitRef[]
  }
}

/**
 * Applies exactly one externally approved `ReviewedAssociationMapping` on top
 * of an already-extracted `SourceExtractionResult`.
 *
 * Never inferred, never automatic, never applied to content that doesn't
 * literally still contain the mapping's declared source snippets *within the
 * matched node's own evidence range* — if a node can't be uniquely
 * identified, or its snippet isn't found at the expected location (document
 * missing, drift, or the mapping targeting unrelated content), this returns
 * `result` with only a warning appended and no new edge. This function does
 * not perform any git/network/filesystem I/O; commit references are taken
 * verbatim from the supplied mapping.
 *
 * Pure: does not mutate `result`.
 */
export function applyReviewedMapping(
  result: SourceExtractionResult,
  documents: readonly SourceDocumentInput[],
  mapping: ReviewedAssociationMapping,
): SourceExtractionResult {
  const warnings = [...result.warnings]
  const docTextByPath = new Map(documents.map(doc => [doc.path, doc.text]))

  // Filter + require exactly one candidate (same discipline as the
  // expectedAction guard below) — a bare `.find()` would silently bind to
  // whichever duplicate-titled goal/decision happens to come first if the
  // extraction ever produces more than one node sharing a path + title.
  const goalCandidates = result.nodes.filter(
    n => n.type === 'goal' && n.evidence.path === mapping.from.path && n.title === mapping.from.nodeTitle,
  )
  const decisionCandidates = result.nodes.filter(
    n => n.type === 'decision' && n.evidence.path === mapping.to.path && n.title === mapping.to.nodeTitle,
  )
  if (goalCandidates.length !== 1 || decisionCandidates.length !== 1) {
    warnings.push(
      `Reviewed mapping "${mapping.id}" not applied: expected exactly one goal node and one decision node (by path + title); found ${goalCandidates.length} goal candidate(s) and ${decisionCandidates.length} decision candidate(s) — cannot safely bind to an ambiguous or missing target.`,
    )
    return {...result, warnings}
  }
  const goalNode = definitely(goalCandidates[0], 'goalCandidates.length === 1 was just checked above')
  const decisionNode = definitely(decisionCandidates[0], 'decisionCandidates.length === 1 was just checked above')

  const fromText = docTextByPath.get(mapping.from.path)
  if (fromText === undefined || !evidenceContainsSnippet(fromText, goalNode.evidence, mapping.from.sourceSnippet)) {
    warnings.push(
      `Reviewed mapping "${mapping.id}" not applied: expected source snippet not found within the goal node's own evidence range at "${mapping.from.path}" (document missing, source drifted, or the snippet exists elsewhere but not at the expected location).`,
    )
    return {...result, warnings}
  }
  const toText = docTextByPath.get(mapping.to.path)
  if (toText === undefined || !evidenceContainsSnippet(toText, decisionNode.evidence, mapping.to.sourceSnippet)) {
    warnings.push(
      `Reviewed mapping "${mapping.id}" not applied: expected source snippet not found within the decision node's own evidence range at "${mapping.to.path}" (document missing, source drifted, or the snippet exists elsewhere but not at the expected location).`,
    )
    return {...result, warnings}
  }

  const edges: ExtractedEdge[] = [...result.edges]
  edges.push({
    fromKey: goalNode.key,
    toKey: decisionNode.key,
    rationale: mapping.rationale,
    evidence: decisionNode.evidence,
    provenance: {
      relationKind: 'reviewed-association',
      reviewKind: mapping.reviewKind,
      reviewedDate: mapping.reviewedDate,
      disclaimer: mapping.disclaimer,
      fromEvidence: goalNode.evidence,
      toEvidence: decisionNode.evidence,
    },
  })

  if (mapping.decisionActionUpgrade) {
    if (mapping.expectedAction) {
      const expectedAction = mapping.expectedAction
      const actionCandidates = result.nodes.filter(
        n => n.type === 'action' && n.evidence.path === expectedAction.path && n.title === expectedAction.nodeTitle,
      )
      if (actionCandidates.length === 1) {
        const actionNode = definitely(actionCandidates[0], 'actionCandidates.length === 1 was just checked above')
        const actionText = docTextByPath.get(expectedAction.path)
        if (
          actionText === undefined ||
          !evidenceContainsSnippet(actionText, actionNode.evidence, expectedAction.sourceSnippet)
        ) {
          warnings.push(
            `Reviewed mapping "${mapping.id}": expectedAction source snippet not found within the matched action node's own evidence range — commit-supported upgrade skipped.`,
          )
        } else {
          const edgeIndex = edges.findIndex(e => e.fromKey === decisionNode.key && e.toKey === actionNode.key)
          if (edgeIndex === -1) {
            warnings.push(
              `Reviewed mapping "${mapping.id}": no existing decision -> action edge found from "${decisionNode.key}" to "${actionNode.key}" to upgrade.`,
            )
          } else {
            const edge = definitely(edges[edgeIndex], 'edgeIndex !== -1 was just checked above')
            edges[edgeIndex] = {
              ...edge,
              provenance: {
                ...edge.provenance,
                relationKind: mapping.decisionActionUpgrade.relationKind,
                commitRefs: mapping.decisionActionUpgrade.commitRefs,
              },
            }
          }
        }
      } else {
        warnings.push(
          `Reviewed mapping "${mapping.id}": expectedAction matched ${actionCandidates.length} action node(s) (expected exactly 1) — commit-supported upgrade skipped to avoid extending the approved commit association to an ambiguous or arbitrary action.`,
        )
      }
    } else {
      warnings.push(
        `Reviewed mapping "${mapping.id}": decisionActionUpgrade declared without an expectedAction guard — upgrade skipped (cannot safely target a unique action).`,
      )
    }
  }

  return {...result, edges, warnings}
}

/**
 * The single public validation gate for a reviewed structure: goal
 * —(reviewed-association)→ decision ←(rejected-option, bounded to the
 * decision's own section)— option(s), decision —(commit-supported)→ action
 * —(any grounded edge)→ outcome, all tied to the *same* decision.
 *
 * Stricter than the internal `validateGroundedChain` walk it reuses (never
 * duplicates): a missing or non-applied `ReviewedAssociationMapping`, an
 * isolated goal, a dangling or wrong-typed association target, options whose
 * own evidence falls outside the associated decision's section ("foreign
 * options"), or a decision missing a *specifically* `commit-supported`
 * action link (a generic inferred `source-reported` link is not sufficient)
 * are all reported as errors. This is the only function bootstrap-graph's
 * CLI integration should call to gate on a complete reviewed chain.
 */
export function validateReviewedGraph(
  nodes: readonly ExtractedNode[],
  edges: readonly ExtractedEdge[],
): GroundedChainValidation {
  const generic = validateGroundedChain(nodes, edges)
  const errors = new Set<string>(generic.errors)
  const warnings = [...generic.warnings]
  const byKey = new Map(nodes.map(n => [n.key, n]))

  const associationEdges = edges.filter(e => e.provenance?.relationKind === 'reviewed-association')
  if (associationEdges.length === 0) {
    errors.add(
      'No reviewed-association edge found: a complete reviewed structure requires an explicitly approved and successfully applied goal -> decision mapping; automatic extraction alone is incomplete.',
    )
    return {valid: false, errors: [...errors], warnings}
  }

  for (const assoc of associationEdges) {
    const goal = byKey.get(assoc.fromKey)
    const decision = byKey.get(assoc.toKey)

    if (!goal || goal.type !== 'goal') {
      errors.add(
        `Reviewed-association edge "${assoc.fromKey}" -> "${assoc.toKey}" does not originate from a goal node (wrong association target).`,
      )
      continue
    }
    if (!decision || decision.type !== 'decision') {
      errors.add(
        `Reviewed-association edge "${assoc.fromKey}" -> "${assoc.toKey}" does not target a decision node (wrong association target).`,
      )
      continue
    }

    // Provenance shape/consistency checks: don't trust the producer merely
    // because relationKind says "reviewed-association" — malformed or
    // fabricated provenance fields must fail the gate (gracefully, never
    // throwing), not silently pass through.
    const assocProvenance = assoc.provenance
    if (assocProvenance?.reviewKind !== 'maintainer-reviewed') {
      errors.add(
        `Reviewed-association edge "${assoc.fromKey}" -> "${assoc.toKey}" has missing or invalid reviewKind (expected "maintainer-reviewed").`,
      )
    }
    if (!isNonEmptyString(assocProvenance?.reviewedDate)) {
      errors.add(
        `Reviewed-association edge "${assoc.fromKey}" -> "${assoc.toKey}" has a missing or empty reviewedDate.`,
      )
    }
    if (!isNonEmptyString(assocProvenance?.disclaimer)) {
      errors.add(
        `Reviewed-association edge "${assoc.fromKey}" -> "${assoc.toKey}" has a missing or empty disclaimer (must reflect that this is a reviewed association, not causal intent).`,
      )
    }
    if (!evidenceRangesEqual(assocProvenance?.fromEvidence, goal.evidence)) {
      errors.add(
        `Reviewed-association edge "${assoc.fromKey}" -> "${assoc.toKey}" has provenance.fromEvidence inconsistent with the actual goal node's evidence.`,
      )
    }
    if (!evidenceRangesEqual(assocProvenance?.toEvidence, decision.evidence)) {
      errors.add(
        `Reviewed-association edge "${assoc.fromKey}" -> "${assoc.toKey}" has provenance.toEvidence inconsistent with the actual decision node's evidence.`,
      )
    }

    // Rejected-option edges must be bounded within the SAME decision's own
    // section (path + evidence range) — a foreign option from a different
    // ADR pointing at this decision's key must not satisfy completeness.
    const rejectedOptionEdges = edges.filter(
      e => e.toKey === decision.key && e.provenance?.relationKind === 'rejected-option',
    )
    const boundedOptionEdges = rejectedOptionEdges.filter(e => {
      const option = byKey.get(e.fromKey)
      return (
        option?.type === 'option' &&
        option.evidence.path === decision.evidence.path &&
        option.evidence.startLine >= decision.evidence.startLine &&
        option.evidence.endLine <= decision.evidence.endLine
      )
    })
    if (boundedOptionEdges.length === 0) {
      errors.add(
        `Decision "${decision.key}" has no rejected-option edges bounded within its own section: structure is disconnected from its options (or all options are foreign, pointing at a different decision's section).`,
      )
    }

    const commitSupportedActionEdges = edges
      .filter(e => e.fromKey === decision.key && e.provenance?.relationKind === 'commit-supported')
      .map(e => ({edge: e, node: byKey.get(e.toKey)}))
      .filter((x): x is {edge: ExtractedEdge; node: ExtractedNode} => x.node?.type === 'action')
    if (commitSupportedActionEdges.length === 0) {
      errors.add(
        `Decision "${decision.key}" has no commit-supported decision -> action edge: a complete reviewed structure requires the approved mapping's expectedAction upgrade, not merely an inferred (source-reported) link.`,
      )
      continue
    }

    // Commit-supported provenance shape: at least one commitRef with a
    // 40-hex sha and a valid, non-empty date — not merely a relationKind
    // label with no supporting data behind it.
    for (const {edge: commitEdge} of commitSupportedActionEdges) {
      const refs = commitEdge.provenance?.commitRefs
      if (!Array.isArray(refs) || refs.length === 0 || !refs.every(ref => isValidDeclaredCommitRef(ref))) {
        errors.add(
          `Decision "${decision.key}"'s commit-supported edge to "${commitEdge.toKey}" has missing or malformed commitRefs (each requires a 40-hex sha and a valid, non-empty date).`,
        )
      }
    }

    const hasOutcome = commitSupportedActionEdges.some(({node: actionNode}) =>
      edges.some(e => e.fromKey === actionNode.key && byKey.get(e.toKey)?.type === 'outcome'),
    )
    if (!hasOutcome) {
      errors.add(
        `Decision "${decision.key}"'s action has no outgoing edge to an outcome node: structure is missing its outcome.`,
      )
    }
  }

  return {valid: errors.size === 0, errors: [...errors], warnings}
}
