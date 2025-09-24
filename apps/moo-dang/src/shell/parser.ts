/**
 * Shell command parser for processing user input into executable commands.
 *
 * Provides robust parsing capabilities with support for quotes, special characters,
 * and various shell constructs while maintaining security in the browser environment.
 */

/**
 * Parse command string into command and arguments with quote handling.
 *
 * Supports basic shell quoting with single and double quotes to handle arguments
 * containing spaces or special characters. The parser is designed to be safe
 * for browser execution while providing familiar shell-like behavior.
 *
 * @param command - Raw command string to parse
 * @returns Array of parsed command parts, with the first element being the command name
 *
 * @example
 * ```typescript
 * parseCommand('echo "hello world"') // Returns: ['echo', 'hello world']
 * parseCommand("cat 'file with spaces.txt'") // Returns: ['cat', 'file with spaces.txt']
 * parseCommand('ls -la /home') // Returns: ['ls', '-la', '/home']
 * ```
 */
export function parseCommand(command: string): string[] {
  const parts: string[] = []
  let current = ''
  let inQuotes = false
  let quoteChar = ''

  const chars = Array.from(command)

  for (const char of chars) {
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true
      quoteChar = char
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false
      quoteChar = ''
    } else if (char === ' ' && !inQuotes) {
      if (current) {
        parts.push(current)
        current = ''
      }
    } else {
      current += char
    }
  }

  if (current) {
    parts.push(current)
  }

  return parts
}
