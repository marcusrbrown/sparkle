/**
 * Terminal output formatting utilities.
 *
 * Provides functions for formatting different types of terminal output with
 * proper styling, colors, and ANSI escape sequences.
 */

import type {TerminalOutputEntry, TerminalOutputType} from '../hooks'

/**
 * ANSI escape sequences for terminal formatting.
 */
export const ANSI_COLORS = {
  // Text colors
  BLACK: '\u001B[30m',
  RED: '\u001B[31m',
  GREEN: '\u001B[32m',
  YELLOW: '\u001B[33m',
  BLUE: '\u001B[34m',
  MAGENTA: '\u001B[35m',
  CYAN: '\u001B[36m',
  WHITE: '\u001B[37m',
  GRAY: '\u001B[90m',

  // Bright colors
  BRIGHT_RED: '\u001B[91m',
  BRIGHT_GREEN: '\u001B[92m',
  BRIGHT_YELLOW: '\u001B[93m',
  BRIGHT_BLUE: '\u001B[94m',
  BRIGHT_MAGENTA: '\u001B[95m',
  BRIGHT_CYAN: '\u001B[96m',
  BRIGHT_WHITE: '\u001B[97m',

  // Background colors
  BG_BLACK: '\u001B[40m',
  BG_RED: '\u001B[41m',
  BG_GREEN: '\u001B[42m',
  BG_YELLOW: '\u001B[43m',
  BG_BLUE: '\u001B[44m',
  BG_MAGENTA: '\u001B[45m',
  BG_CYAN: '\u001B[46m',
  BG_WHITE: '\u001B[47m',

  // Reset and styles
  RESET: '\u001B[0m',
  BOLD: '\u001B[1m',
  DIM: '\u001B[2m',
  ITALIC: '\u001B[3m',
  UNDERLINE: '\u001B[4m',
  BLINK: '\u001B[5m',
  REVERSE: '\u001B[7m',
  STRIKETHROUGH: '\u001B[9m',
} as const

/**
 * Common ANSI control sequences for terminal operations.
 */
export const ANSI_CONTROLS = {
  CLEAR_LINE: '\u001B[2K',
  CLEAR_SCREEN: '\u001B[2J',
  CLEAR_TO_END: '\u001B[0K',
  CURSOR_HOME: '\u001B[H',
  CURSOR_UP: '\u001B[A',
  CURSOR_DOWN: '\u001B[B',
  CURSOR_LEFT: '\u001B[D',
  CURSOR_RIGHT: '\u001B[C',
  SAVE_CURSOR: '\u001B[s',
  RESTORE_CURSOR: '\u001B[u',
  HIDE_CURSOR: '\u001B[?25l',
  SHOW_CURSOR: '\u001B[?25h',
} as const

/**
 * Type-specific formatting configuration for different output types.
 */
export const OUTPUT_TYPE_FORMATS: Record<
  TerminalOutputType,
  {
    prefix?: string
    color: string
    backgroundColor?: string
    style?: string
  }
> = {
  command: {
    prefix: '$ ',
    color: ANSI_COLORS.BRIGHT_BLUE,
    style: ANSI_COLORS.BOLD,
  },
  output: {
    color: ANSI_COLORS.WHITE,
  },
  error: {
    prefix: '❌ ',
    color: ANSI_COLORS.BRIGHT_RED,
    style: ANSI_COLORS.BOLD,
  },
  warning: {
    prefix: '⚠️  ',
    color: ANSI_COLORS.BRIGHT_YELLOW,
    style: ANSI_COLORS.BOLD,
  },
  info: {
    prefix: 'ℹ️  ',
    color: ANSI_COLORS.BRIGHT_CYAN,
  },
  system: {
    prefix: '🔧 ',
    color: ANSI_COLORS.GRAY,
    style: ANSI_COLORS.ITALIC,
  },
}

/**
 * Options for formatting terminal output.
 */
export interface OutputFormatOptions {
  /** Whether to include ANSI colors and styling (default: true) */
  enableColors?: boolean
  /** Whether to include type prefixes (default: true) */
  showPrefixes?: boolean
  /** Whether to include timestamps (default: false) */
  showTimestamps?: boolean
  /** Custom timestamp format function */
  formatTimestamp?: (timestamp: Date) => string
  /** Maximum line length before wrapping (default: 80) */
  maxLineLength?: number
  /** Whether to strip existing ANSI codes before formatting (default: false) */
  stripExistingAnsi?: boolean
}

/**
 * Simple ANSI escape sequence removal.
 * This avoids ESLint issues with control characters in regex.
 */
export function stripAnsiCodes(text: string): string {
  // Use string replacement approach to avoid regex control character issues
  let cleaned = text

  // Remove common ANSI sequences
  const patterns = [
    '\u001B[30m',
    '\u001B[31m',
    '\u001B[32m',
    '\u001B[33m',
    '\u001B[34m',
    '\u001B[35m',
    '\u001B[36m',
    '\u001B[37m',
    '\u001B[90m',
    '\u001B[91m',
    '\u001B[92m',
    '\u001B[93m',
    '\u001B[94m',
    '\u001B[95m',
    '\u001B[96m',
    '\u001B[97m',
    '\u001B[0m',
    '\u001B[1m',
    '\u001B[2m',
    '\u001B[3m',
    '\u001B[4m',
  ]

  for (const pattern of patterns) {
    cleaned = cleaned.replaceAll(pattern, '')
  }

  return cleaned
}

/**
 * Wraps text to the specified line length.
 * Simplified version without complex ANSI handling.
 *
 * @param text Text to wrap
 * @param maxLength Maximum line length
 * @returns Array of wrapped lines
 */
export function wrapText(text: string, maxLength: number): string[] {
  const lines = text.split('\n')
  const wrappedLines: string[] = []

  for (const line of lines) {
    if (stripAnsiCodes(line).length <= maxLength) {
      wrappedLines.push(line)
      continue
    }

    // Simple wrapping by words
    const words = line.split(' ')
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine.length === 0 ? word : `${currentLine} ${word}`
      if (stripAnsiCodes(testLine).length <= maxLength) {
        currentLine = testLine
      } else if (currentLine.length > 0) {
        wrappedLines.push(currentLine)
        currentLine = word
      } else {
        // Word is longer than max length, split it
        wrappedLines.push(word)
        currentLine = ''
      }
    }

    if (currentLine.length > 0) {
      wrappedLines.push(currentLine)
    }
  }

  return wrappedLines
}

/**
 * Formats a terminal output entry with proper styling and colors.
 *
 * @param entry The output entry to format
 * @param options Formatting options
 * @returns Formatted text ready for terminal display
 */
export function formatOutputEntry(entry: TerminalOutputEntry, options: OutputFormatOptions = {}): string {
  const {
    enableColors = true,
    showPrefixes = true,
    showTimestamps = false,
    formatTimestamp = ts => ts.toLocaleTimeString(),
    maxLineLength = 80,
    stripExistingAnsi = false,
  } = options

  let content = entry.content

  if (stripExistingAnsi) {
    content = stripAnsiCodes(content)
  }

  const typeFormat = OUTPUT_TYPE_FORMATS[entry.type] || OUTPUT_TYPE_FORMATS.output

  let formattedOutput = ''

  if (showTimestamps) {
    const timestamp = formatTimestamp(entry.timestamp)
    if (enableColors) {
      formattedOutput += `${ANSI_COLORS.GRAY}[${timestamp}]${ANSI_COLORS.RESET} `
    } else {
      formattedOutput += `[${timestamp}] `
    }
  }

  // Add type prefix if enabled
  if (showPrefixes && typeFormat.prefix) {
    formattedOutput += typeFormat.prefix
  }

  // Apply colors and styling if enabled
  if (enableColors) {
    if (typeFormat.style) {
      formattedOutput += typeFormat.style
    }
    if (typeFormat.backgroundColor) {
      formattedOutput += typeFormat.backgroundColor
    }
    formattedOutput += typeFormat.color
  }

  // Add the content
  formattedOutput += content

  // Reset colors if enabled
  if (enableColors) {
    formattedOutput += ANSI_COLORS.RESET
  }

  // Wrap text if needed
  if (maxLineLength > 0) {
    const wrappedLines = wrapText(formattedOutput, maxLineLength)
    return wrappedLines.join('\r\n')
  }

  return formattedOutput
}

/**
 * Formats multiple output entries for batch terminal display.
 *
 * @param entries Array of output entries to format
 * @param options Formatting options
 * @returns Formatted text ready for terminal display
 */
export function formatOutputEntries(entries: TerminalOutputEntry[], options: OutputFormatOptions = {}): string {
  return entries.map(entry => formatOutputEntry(entry, options)).join('\r\n')
}

/**
 * Creates a formatted command prompt line.
 *
 * @param prompt The prompt string (e.g., "$ ")
 * @param command The command text
 * @param options Formatting options
 * @returns Formatted command line
 */
export function formatCommandPrompt(prompt: string, command = '', options: OutputFormatOptions = {}): string {
  const {enableColors = true} = options

  let formattedPrompt = prompt

  if (enableColors) {
    formattedPrompt = `${ANSI_COLORS.BRIGHT_GREEN}${prompt}${ANSI_COLORS.RESET}`
  }

  return `${formattedPrompt}${command}`
}

/**
 * Creates a formatted error message with context.
 *
 * @param error The error object or message
 * @param command Optional command that caused the error
 * @param options Formatting options
 * @returns Formatted error message
 */
export function formatError(error: Error | string, command?: string, options: OutputFormatOptions = {}): string {
  const {enableColors = true} = options

  const errorMessage = error instanceof Error ? error.message : error
  let formattedError = ''

  if (command) {
    if (enableColors) {
      formattedError += `${ANSI_COLORS.BRIGHT_RED}Command failed:${ANSI_COLORS.RESET} ${ANSI_COLORS.YELLOW}${command}${ANSI_COLORS.RESET}\r\n`
    } else {
      formattedError += `Command failed: ${command}\r\n`
    }
  }

  if (enableColors) {
    formattedError += `${ANSI_COLORS.BRIGHT_RED}Error:${ANSI_COLORS.RESET} ${errorMessage}`
  } else {
    formattedError += `Error: ${errorMessage}`
  }

  return formattedError
}
