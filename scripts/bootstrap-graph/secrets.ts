/**
 * Fail-closed secret scanning: known-secret patterns matched against raw
 * text or a whole JSON-like payload, never surfacing the matched value —
 * only the rule name and (for payload scans) a field path.
 */

/**
 * A known-secret detection rule. The pattern is matched against raw text; a
 * match's *value* is never surfaced anywhere in this module's outputs — only
 * the rule name and, for payload scans, a field path.
 */
export interface SecretScanRule {
  readonly name: string
  readonly pattern: RegExp
}

/** A single secret-scan hit. Never carries the matched value. */
export interface SecretScanMatch {
  readonly path: string
  readonly rule: string
}

/**
 * Default fail-closed secret patterns: tokens, passwords, API keys,
 * bearer/auth headers, credentialed URLs, AWS-style access keys.
 *
 * Deliberately conservative (prefers false positives over false negatives)
 * per the plan's fail-closed requirement — a match blocks promotion pending
 * explicit human review, it does not redact-and-continue.
 */
const DEFAULT_SECRET_SCAN_RULES: readonly SecretScanRule[] = [
  {name: 'github-token', pattern: /gh[pousr]_[A-Za-z0-9]{36,}/},
  {name: 'aws-access-key', pattern: /AKIA[0-9A-Z]{16}/},
  {name: 'credentialed-url', pattern: /[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s:@]+@[^\s"']+/i},
  {name: 'bearer-token', pattern: /\b(?:Authorization:\s*)?Bearer\s+[\w.-]{16,}/i},
  {name: 'generic-api-key', pattern: /\b(?:api[_-]?key|secret|password)\s*[:=]\s*["']?[\w/+-]{12,}["']?/i},
]

/**
 * Scans free-form text for known-secret patterns. Returns which rule(s)
 * matched — never the matched substring — so callers can report a violation
 * without leaking the secret into logs or error output.
 */
export function scanTextForSecrets(
  text: string,
  rules: readonly SecretScanRule[] = DEFAULT_SECRET_SCAN_RULES,
): SecretScanMatch[] {
  const matches: SecretScanMatch[] = []
  for (const rule of rules) {
    if (rule.pattern.test(text)) {
      matches.push({path: '', rule: rule.name})
    }
  }
  return matches
}

/**
 * Recursively scans every string field of a JSON-like payload (objects,
 * arrays, nested combinations) for known-secret patterns, reporting the
 * dotted/bracketed field path of each hit alongside the matched rule name.
 *
 * Used for the fail-closed full-payload secret-scrub: normalized inputs
 * before any `deciduous add`/`doc attach` call, and the fully staged output
 * (records + both exports) before Stage 3 review.
 */
export function scanPayloadForSecrets(
  payload: unknown,
  rules: readonly SecretScanRule[] = DEFAULT_SECRET_SCAN_RULES,
  path = '',
): SecretScanMatch[] {
  if (typeof payload === 'string') {
    return scanTextForSecrets(payload, rules).map(match => ({...match, path}))
  }

  if (Array.isArray(payload)) {
    return payload.flatMap((item, index) => scanPayloadForSecrets(item, rules, `${path}[${index}]`))
  }

  if (payload !== null && typeof payload === 'object') {
    return Object.entries(payload as Record<string, unknown>).flatMap(([key, value]) =>
      scanPayloadForSecrets(value, rules, path === '' ? key : `${path}.${key}`),
    )
  }

  return []
}
