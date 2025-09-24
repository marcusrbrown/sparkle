/**
 * Shell command parser for processing user input into executable commands.
 *
 * This parser provides secure shell-like behavior in browser environments by implementing
 * familiar Unix shell quoting conventions while preventing security vulnerabilities.
 * The design balances user expectations from terminal environments with browser safety requirements.
 */

/**
 * Quote handling strategy for parsed command tokens.
 *
 * Tracks how each token was quoted in the original command to determine variable expansion behavior.
 * This distinction is critical because shell conventions require different expansion rules
 * for single-quoted, double-quoted, and unquoted text.
 */
type QuoteType = 'none' | 'single' | 'double'

/**
 * Internal representation of a parsed command token with its quoting context.
 *
 * Separating content from quote type allows the parser to apply shell-compliant
 * variable expansion rules after tokenization is complete.
 */
interface ParsedToken {
  readonly content: string
  readonly quoteType: QuoteType
}

/**
 * Expands environment variables in text using shell-standard variable substitution.
 *
 * Implements both $VAR and ${VAR} syntax because many shell users expect both forms
 * to work interchangeably. The ${VAR} form is processed first to handle edge cases
 * where variable names might be ambiguous (e.g., "$VARname" vs "${VAR}name").
 *
 * Variables that don't exist expand to empty strings, following POSIX shell behavior
 * rather than throwing errors, which maintains script compatibility.
 *
 * @param text - Text containing variable references to expand
 * @param environmentVariables - Map of environment variable names to values
 * @returns Text with variables expanded to their values or empty strings for undefined variables
 *
 * @example
 * ```typescript
 * expandVariables('$HOME/docs', {HOME: '/home/user'}) // Returns: '/home/user/docs'
 * expandVariables('${PATH}:/bin', {PATH: '/usr/bin'}) // Returns: '/usr/bin:/bin'
 * expandVariables('$UNDEFINED', {}) // Returns: '' (empty string, not error)
 * ```
 */
export function expandVariables(text: string, environmentVariables: Record<string, string>): string {
  let result = text

  // Process ${VAR} syntax first because it's more specific and prevents ambiguity
  // when variable names are followed by word characters (e.g., "${VAR}name" vs "$VARname")
  result = result.replaceAll(/\$\{([a-z_]\w*)\}/gi, (_match, varName) => {
    return environmentVariables[varName] || ''
  })

  // Process $VAR syntax only when followed by non-word characters or end of string
  // This prevents incorrect expansion of "$VARname" when only "VAR" is defined
  result = result.replaceAll(/\$([a-z_]\w*)(?=\W|$)/gi, (_match, varName) => {
    return environmentVariables[varName] || ''
  })

  return result
}

/**
 * Parse command string into command and arguments with shell-compliant quote handling and variable expansion.
 *
 * Implements Unix shell quoting conventions because users expect familiar terminal behavior.
 * Single quotes preserve literal text (no variable expansion) to allow passing literal $
 * characters. Double quotes allow variable expansion while preserving spaces, enabling
 * complex argument construction. This two-phase approach (tokenize, then expand) prevents
 * security issues while maintaining shell compatibility.
 *
 * The parser maintains quote type information to apply correct expansion rules after
 * tokenization, ensuring that 'echo $HOME' and "echo $HOME" behave as users expect
 * from traditional shells.
 *
 * @param command - Raw command string to parse
 * @param environmentVariables - Optional environment variables for expansion
 * @returns Array of parsed command parts, with the first element being the command name
 *
 * @example
 * ```typescript
 * parseCommand('echo "hello world"') // Returns: ['echo', 'hello world']
 * parseCommand("cat 'file with spaces.txt'") // Returns: ['cat', 'file with spaces.txt']
 * parseCommand('ls -la $HOME', {HOME: '/home/user'}) // Returns: ['ls', '-la', '/home/user']
 * parseCommand('echo "$HOME and $PATH"', {HOME: '/home/user', PATH: '/bin'}) // Returns: ['echo', '/home/user and /bin']
 * parseCommand("echo '$HOME'") // Returns: ['echo', '$HOME'] (literal, no expansion)
 * ```
 */
export function parseCommand(command: string, environmentVariables?: Record<string, string>): string[] {
  const tokens: ParsedToken[] = []
  let currentTokenContent = ''
  let inQuotes = false
  let quoteChar = ''
  let currentQuoteType: QuoteType = 'none'

  const characters = Array.from(command)

  for (const char of characters) {
    if ((char === '"' || char === "'") && !inQuotes) {
      // Start of quoted section - quote character is consumed but not included in content
      inQuotes = true
      quoteChar = char
      currentQuoteType = char === '"' ? 'double' : 'single'
    } else if (char === quoteChar && inQuotes) {
      // End of quoted section - quote character is consumed but not included in content
      // Preserve currentQuoteType to track that this token was quoted
      inQuotes = false
      quoteChar = ''
    } else if (char === ' ' && !inQuotes) {
      // Unquoted space acts as token separator
      if (currentTokenContent || currentQuoteType !== 'none') {
        tokens.push({content: currentTokenContent, quoteType: currentQuoteType})
        currentTokenContent = ''
        currentQuoteType = 'none'
      }
    } else {
      // Regular character becomes part of current token
      currentTokenContent += char
    }
  }

  // Add final token if any content or if it was an empty quoted string
  if (currentTokenContent || currentQuoteType !== 'none') {
    tokens.push({content: currentTokenContent, quoteType: currentQuoteType})
  }

  // Apply variable expansion based on quote type and return final command parts
  if (environmentVariables) {
    return tokens.map((token: ParsedToken) => {
      if (token.quoteType === 'single') {
        // Single quotes preserve literal content - no variable expansion
        return token.content
      } else {
        // Double quotes and unquoted text allow variable expansion
        return expandVariables(token.content, environmentVariables)
      }
    }) // Preserve empty strings when environment variables are provided
  }

  // No environment variables - return content and filter empty strings for backward compatibility
  return tokens.map((token: ParsedToken) => token.content).filter((content: string) => content !== '')
}
