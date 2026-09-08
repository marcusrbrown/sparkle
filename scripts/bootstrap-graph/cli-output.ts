/** Bounding and secret-scrubbing of any text that becomes part of a CLI result. */
import {scanTextForSecrets} from './secrets.js'

const MAX_CLI_OUTPUT_LENGTH = 2000

/**
 * Bounds and secret-scrubs any text before it becomes part of a `runCli`
 * result — subprocess stderr, thrown-error messages, and any other
 * externally-influenced content. A matched secret pattern is never echoed:
 * the whole string is replaced with a generic, rule-named redaction notice.
 */
export function sanitizeCliOutput(text: string, maxLength = MAX_CLI_OUTPUT_LENGTH): string {
  const matches = scanTextForSecrets(text)
  if (matches.length > 0) {
    return `[output redacted: matched secret rule "${matches[0]?.rule}"]`
  }
  return text.length > maxLength ? `${text.slice(0, maxLength)}... (truncated)` : text
}
