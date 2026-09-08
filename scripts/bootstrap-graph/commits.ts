/**
 * Git-log source pass: commit classification/batching and the real
 * full-history `git log` invocation (via the real `git` CLI).
 */
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'

import {computePrMergeConfidence} from './pr-source.js'

/** Raw input for a single commit from `git log`. */
export interface CommitInput {
  readonly sha: string
  readonly message: string
  readonly date: string
  /** True for a PR-merge commit (confidence 80); false for direct-to-main (confidence 60). */
  readonly isPrMerge: boolean
}

/** A commit classified for the "action" node the git-log pass adds. */
export interface ClassifiedCommit {
  readonly sha: string
  readonly date: string
  readonly summary: string
  readonly confidence: number
  readonly isDepsChore: boolean
}

const DEPS_CHORE_PREFIX = /^chore\(deps\):/i

/**
 * Classifies a single commit for the git-log pass. Confidence uses the SAME
 * approved two-tier scheme as `computePrMergeConfidence` (80 verified / 60
 * otherwise): 80 only when this commit's sha is in `verifiedMergeShas` — the
 * set of merge-commit SHAs from a real, gh-confirmed merged-PR snapshot.
 * `commit.isPrMerge` (parent-count > 1) is retained on the input/metadata
 * but is deliberately never used as PR proof here — a real repo has
 * squash-merge and branch-sync commits that are two-parent without being a
 * GitHub PR merge. `chore(deps)` commits are flagged for run-window
 * batching rather than individual nodes.
 */
export function classifyCommit(commit: CommitInput, verifiedMergeShas: ReadonlySet<string>): ClassifiedCommit {
  return {
    sha: commit.sha,
    date: commit.date,
    summary: commit.message,
    confidence: computePrMergeConfidence({mergeCommitSha: commit.sha}, verifiedMergeShas),
    isDepsChore: DEPS_CHORE_PREFIX.test(commit.message),
  }
}

/** The single batched `observation` node produced for a run window's `chore(deps)` commits. */
export interface DepsBatch {
  readonly runWindowId: string
  readonly commits: ClassifiedCommit[]
  readonly summary: string
}

/**
 * Batches every `chore(deps)` commit in a git-log pass into one `observation`
 * node per bootstrap run-window (not per calendar period — 51.5% of recent
 * commits are `chore(deps)` with no clean weekly/daily cadence, so run-window
 * batching is the deterministic, evidence-grounded choice per the plan).
 *
 * Returns `undefined` when there are no deps commits to batch, so callers
 * don't add an empty observation node.
 */
export function batchDepsCommits(commits: ClassifiedCommit[], runWindowId: string): DepsBatch | undefined {
  const depsCommits = commits.filter(commit => commit.isDepsChore)
  if (depsCommits.length === 0) {
    return undefined
  }

  return {
    runWindowId,
    commits: depsCommits,
    summary: `${depsCommits.length} dependency-bump commit(s) batched for run window ${runWindowId}`,
  }
}

const GIT_LOG_FIELD_SEPARATOR = '\u001F'

/**
 * Builds the argv array for the full-history `git log` invocation the
 * git-log pass runs, one field-delimited line per commit so subjects
 * containing arbitrary characters (including pipes) parse unambiguously.
 *
 * Walks history from a single resolved `ref` (a SHA or any git revision
 * expression) rather than `--all`. The production `build` path always
 * passes the snapshot's own resolved pinned SHA here, never a live branch
 * name — `--all` would follow every ref in the repo (including branches
 * that moved after the snapshot was taken), defeating the point of pinning.
 * The default of `'HEAD'` exists only for direct unit-testing convenience.
 */
export function buildGitLogArgv(ref = 'HEAD'): string[] {
  return [
    'log',
    ref,
    '--date=iso-strict',
    `--pretty=format:%H${GIT_LOG_FIELD_SEPARATOR}%P${GIT_LOG_FIELD_SEPARATOR}%an${GIT_LOG_FIELD_SEPARATOR}%ad${GIT_LOG_FIELD_SEPARATOR}%s`,
  ]
}

/**
 * Parses `git log`'s field-delimited output into `CommitInput[]`. A commit
 * is classified as a PR-merge (`isPrMerge: true`) when it has more than one
 * parent hash — the standard signature of a merge commit — rather than by
 * pattern-matching the commit message.
 */
export function parseGitLogOutput(stdout: string): CommitInput[] {
  return stdout
    .split('\n')
    .filter(line => line.length > 0)
    .map(line => {
      const [sha, parents, , date, message] = line.split(GIT_LOG_FIELD_SEPARATOR)
      const parentCount = (parents ?? '').trim().split(/\s+/).filter(Boolean).length
      return {sha: sha ?? '', message: message ?? '', date: date ?? '', isPrMerge: parentCount > 1}
    })
}

const GIT_COMMAND_TIMEOUT_MS = 15_000
const GIT_COMMAND_MAX_BUFFER_BYTES = 2_000_000

const execFileAsync = promisify(execFile)

/**
 * Runs the real, full-history `git log` against `repoDir` (argv array,
 * `shell: false`, bounded output) and parses it into `CommitInput[]`. Full
 * history is retained deliberately — `chore(deps)` batching (see
 * `batchDepsCommits`) is a content decision, not a coverage cut.
 *
 * `ref` should be the snapshot's resolved pinned SHA in production, so
 * history is read from the frozen checkout at a fixed point rather than
 * whatever a live branch currently points at.
 */
export async function collectCommitsFromGitLog(repoDir: string, ref = 'HEAD'): Promise<CommitInput[]> {
  const {stdout} = await execFileAsync('git', buildGitLogArgv(ref), {
    cwd: repoDir,
    timeout: GIT_COMMAND_TIMEOUT_MS,
    maxBuffer: GIT_COMMAND_MAX_BUFFER_BYTES,
  })
  return parseGitLogOutput(stdout)
}
