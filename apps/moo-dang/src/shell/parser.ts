/**
 * Shell command parser for processing user input into executable commands.
 *
 * Provides robust parsing capabilities with support for quotes, special characters,
 * and various shell constructs while maintaining security in the browser environment.
 */

/**
 * Expands environment variables in a string.
 *
 * Supports both $VAR and ${VAR} syntax for variable substitution.
 * Variables are expanded using the provided environment variable mapping.
 *
 * @param text - Text containing variable references to expand
 * @param environmentVariables - Map of environment variable names to values
 * @returns Text with variables expanded to their values
 *
 * @example
 * ```typescript
 * expandVariables('$HOME/docs', {HOME: '/home/user'}) // Returns: '/home/user/docs'
 * expandVariables('${PATH}:/bin', {PATH: '/usr/bin'}) // Returns: '/usr/bin:/bin'
 * ```
 */
export function expandVariables(text: string, environmentVariables: Record<string, string>): string {
  let result = text

  // Handle ${VAR} syntax first (more specific)
  result = result.replaceAll(/\$\{([a-z_]\w*)\}/gi, (_match, varName) => {
    return environmentVariables[varName] || ''
  })

  // Handle $VAR syntax (must be followed by non-word character or end of string)
  result = result.replaceAll(/\$([a-z_]\w*)(?=\W|$)/gi, (_match, varName) => {
    return environmentVariables[varName] || ''
  })

  return result
}

/**
 * Parse command string into command and arguments with quote handling and variable expansion.
 *
 * Supports basic shell quoting with single and double quotes to handle arguments
 * containing spaces or special characters. Variables are expanded in double-quoted
 * strings and unquoted text, but not in single-quoted strings (following shell conventions).
 * The parser is designed to be safe for browser execution while providing familiar shell-like behavior.
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
 * ```
 */
export function parseCommand(command: string, environmentVariables?: Record<string, string>): string[] {
  interface ParsedPart {
    content: string
    quoteType: 'none' | 'single' | 'double'
  }

  const parts: ParsedPart[] = []
  let current = ''
  let inQuotes = false
  let quoteChar = ''
  let currentQuoteType: 'none' | 'single' | 'double' = 'none'

  const chars = Array.from(command)

  for (const char of chars) {
    if ((char === '"' || char === "'") && !inQuotes) {
      // Start of quoted section - don't include the quote character
      inQuotes = true
      quoteChar = char
      currentQuoteType = char === '"' ? 'double' : 'single'
    } else if (char === quoteChar && inQuotes) {
      // End of quoted section - don't include the quote character
      // Keep currentQuoteType to remember this token was quoted
      inQuotes = false
      quoteChar = ''
    } else if (char === ' ' && !inQuotes) {
      // Space outside quotes - end current token
      if (current || currentQuoteType !== 'none') {
        parts.push({content: current, quoteType: currentQuoteType})
        current = ''
        currentQuoteType = 'none'
      }
    } else {
      // Regular character - add to current token
      current += char
    }
  }

  // Add final token if any
  if (current || currentQuoteType !== 'none') {
    parts.push({content: current, quoteType: currentQuoteType})
  }

  // Process parts based on quoting and environment variables
  if (environmentVariables) {
    return parts.map(part => {
      if (part.quoteType === 'single') {
        // Single quotes: no variable expansion
        return part.content
      } else {
        // Double quotes or unquoted: expand variables
        return expandVariables(part.content, environmentVariables)
      }
    }) // Don't filter empty strings when environment variables are provided
  }

  // No environment variables provided - just return content and filter empty strings
  return parts.map(part => part.content).filter(content => content !== '')
}
