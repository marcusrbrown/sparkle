/**
 * Lane 5 `.ai/` triage report parsing and the canonical-shape gate that
 * verifies a parsed report matches the real pinned document (16 unique
 * ARCHIVE artifacts, 4 PROMOTE-annotated).
 */

/** A single ARCHIVE-classified artifact parsed out of the Lane 5 triage report. */
export interface TriageArtifact {
  readonly path: string
  readonly disposition: string
  /** True if the artifact also carries a PROMOTE annotation in the report. */
  readonly promoted: boolean
  /**
   * True if the artifact is gitignored in a fresh clone (per the report's
   * "Resolves" column) and therefore requires `--source-root` pointed at a
   * real local checkout to read, rather than the staged snapshot alone.
   */
  readonly requiresSourceRoot: boolean
}

const BACKTICKED_PATH = /`([^`]+)`/

/**
 * Parses one `| # | \`path\` | disposition | resolves |` markdown table row.
 * Splits on `|` and trims each cell rather than using a single regex with
 * adjacent `\s*`/`.+?` groups, which the repo's regexp lint rules flag as a
 * super-linear-backtracking risk for attacker-controlled input.
 */
function parseArchiveTableRow(line: string): {path: string; disposition: string; resolves: string} | undefined {
  if (!line.startsWith('|')) {
    return undefined
  }

  const cells = line.split('|').map(cell => cell.trim())
  if (cells.length < 5 || !/^\d+$/.test(cells[1] ?? '')) {
    return undefined
  }

  const pathMatch = BACKTICKED_PATH.exec(cells[2] ?? '')
  if (!pathMatch?.[1]) {
    return undefined
  }

  return {path: pathMatch[1], disposition: cells[3] ?? '', resolves: cells[4] ?? ''}
}

/**
 * Parses the Lane 5 `.ai/` triage report markdown into the set of
 * ARCHIVE-classified artifacts the bootstrap must ingest. DELETE-classified
 * and KEEP-AS-IS entries are intentionally excluded — only ARCHIVE rows (some
 * of which additionally carry a PROMOTE annotation) become graph nodes.
 */
export function parseTriageReport(markdown: string): TriageArtifact[] {
  const lines = markdown.split('\n')

  const promotedPaths = new Set<string>()
  let inPromoteSection = false
  let inArchiveSection = false
  const archiveRows: {path: string; disposition: string; resolves: string}[] = []

  for (const line of lines) {
    if (line.startsWith('## ')) {
      const heading = line.slice(3).trim()
      inPromoteSection = heading.startsWith('PROMOTE')
      inArchiveSection = heading.startsWith('ARCHIVE')
      continue
    }

    if (inPromoteSection) {
      if (/^\d+\.\s/.test(line)) {
        const pathMatch = BACKTICKED_PATH.exec(line)
        if (pathMatch?.[1] !== undefined) {
          promotedPaths.add(pathMatch[1])
        }
      }
      continue
    }

    if (inArchiveSection) {
      const row = parseArchiveTableRow(line)
      if (row) {
        archiveRows.push(row)
      }
    }
  }

  return archiveRows.map(row => ({
    path: row.path,
    disposition: row.disposition,
    promoted: promotedPaths.has(row.path),
    requiresSourceRoot: !row.resolves.startsWith('Revision clone.'),
  }))
}

/** The Lane 5 triage report's canonical shape, verified against the actual pinned document: 16 unique ARCHIVE artifacts, 4 of which carry a PROMOTE annotation. */
export const CANONICAL_ARCHIVE_COUNT = 16
export const CANONICAL_PROMOTE_COUNT = 4

/**
 * Verifies a parsed triage report matches the canonical Lane 5 shape rather
 * than trusting whatever a caller's `--triage` file happens to contain. The
 * public `build` command refuses to run against a report with the wrong
 * artifact count, duplicate paths, or the wrong PROMOTE-annotation count —
 * a 1-artifact (or 0-artifact) triage file is a test fixture shortcut, never
 * a legitimate production input, and must not silently "succeed" through
 * this command.
 */
export function validateCanonicalTriageShape(artifacts: readonly TriageArtifact[]): string[] {
  const errors: string[] = []
  const uniquePaths = new Set(artifacts.map(artifact => artifact.path))
  if (uniquePaths.size !== artifacts.length) {
    errors.push(
      `triage report contains duplicate ARCHIVE paths (${artifacts.length} row(s), ${uniquePaths.size} unique)`,
    )
  }
  if (artifacts.length !== CANONICAL_ARCHIVE_COUNT) {
    errors.push(
      `triage report must classify exactly ${CANONICAL_ARCHIVE_COUNT} unique ARCHIVE artifacts; found ${artifacts.length}`,
    )
  }
  const promotedCount = artifacts.filter(artifact => artifact.promoted).length
  if (promotedCount !== CANONICAL_PROMOTE_COUNT) {
    errors.push(
      `triage report must mark exactly ${CANONICAL_PROMOTE_COUNT} ARCHIVE artifacts with a PROMOTE annotation; found ${promotedCount}`,
    )
  }
  return errors
}
