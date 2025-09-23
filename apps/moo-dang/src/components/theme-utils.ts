import type {ThemeConfig} from '@sparkle/types'

/**
 * Extended xterm.js theme interface with comprehensive color mapping.
 * Includes the essential colors needed for terminal theming.
 */
export interface XTermTheme {
  /** Default background color */
  background?: string
  /** Default foreground color */
  foreground?: string
  /** Cursor color */
  cursor?: string
  /** Cursor accent color (fg color for a block cursor) */
  cursorAccent?: string
  /** Selection background color (can be transparent) */
  selectionBackground?: string
  /** Selection foreground color */
  selectionForeground?: string
  /** Selection background when terminal is not focused */
  selectionInactiveBackground?: string

  // ANSI colors (0-7)
  /** ANSI black (eg. \x1b[30m) */
  black?: string
  /** ANSI red (eg. \x1b[31m) */
  red?: string
  /** ANSI green (eg. \x1b[32m) */
  green?: string
  /** ANSI yellow (eg. \x1b[33m) */
  yellow?: string
  /** ANSI blue (eg. \x1b[34m) */
  blue?: string
  /** ANSI magenta (eg. \x1b[35m) */
  magenta?: string
  /** ANSI cyan (eg. \x1b[36m) */
  cyan?: string
  /** ANSI white (eg. \x1b[37m) */
  white?: string

  // ANSI bright colors (8-15)
  /** ANSI bright black (eg. \x1b[1;30m) */
  brightBlack?: string
  /** ANSI bright red (eg. \x1b[1;31m) */
  brightRed?: string
  /** ANSI bright green (eg. \x1b[1;32m) */
  brightGreen?: string
  /** ANSI bright yellow (eg. \x1b[1;33m) */
  brightYellow?: string
  /** ANSI bright blue (eg. \x1b[1;34m) */
  brightBlue?: string
  /** ANSI bright magenta (eg. \x1b[1;35m) */
  brightMagenta?: string
  /** ANSI bright cyan (eg. \x1b[1;36m) */
  brightCyan?: string
  /** ANSI bright white (eg. \x1b[1;37m) */
  brightWhite?: string

  /** ANSI extended colors (16-255) */
  extendedAnsi?: string[]
}

/**
 * Converts Sparkle theme tokens to xterm.js theme format.
 *
 * Maps semantic colors from Sparkle design tokens to appropriate
 * xterm.js terminal colors, ensuring proper contrast and accessibility.
 * Provides sensible ANSI color mappings using the theme's color scales.
 *
 * @param theme - Sparkle theme configuration with design tokens
 * @returns XTerm theme object compatible with xterm.js Terminal
 *
 * @example
 * ```typescript
 * import { useTheme } from '@sparkle/theme'
 * import { sparkleToXTermTheme } from './theme-utils'
 *
 * const { theme } = useTheme()
 * const xtermTheme = sparkleToXTermTheme(theme)
 *
 * const terminal = new Terminal({
 *   theme: xtermTheme
 * })
 * ```
 */
export function sparkleToXTermTheme(theme: ThemeConfig): XTermTheme {
  // Extract color tokens with fallbacks for safety
  const colors = theme.colors || {}
  const background = colors.background || {}
  const text = colors.text || {}
  const primary = colors.primary || {}
  const success = colors.success || {}
  const warning = colors.warning || {}
  const error = colors.error || {}
  const neutral = colors.neutral || {}

  return {
    // Core terminal colors using semantic tokens
    background: background.primary || '#000000',
    foreground: text.primary || '#ffffff',
    cursor: primary[500] || text.primary || '#ffffff',
    cursorAccent: background.primary || '#000000',

    // Selection colors with transparency for better UX
    selectionBackground: `${primary[500] || '#3b82f6'}40`, // 25% opacity
    selectionForeground: text.primary,
    selectionInactiveBackground: `${neutral?.[500] || '#6b7280'}20`, // 12.5% opacity

    // ANSI colors (0-7) using neutral and semantic color scales
    // Dark colors - using darker shades from neutral scale
    black: neutral?.[800] || background.secondary || '#262626',
    red: error?.[600] || '#dc2626',
    green: success?.[600] || '#16a34a',
    yellow: warning?.[600] || '#ca8a04',
    blue: primary?.[600] || '#2563eb',
    magenta: '#c026d3', // Using a sensible purple
    cyan: '#0891b2', // Using a sensible cyan
    white: neutral?.[300] || text.secondary || '#d1d5db',

    // ANSI bright colors (8-15) using lighter shades
    brightBlack: neutral?.[600] || '#525252',
    brightRed: error?.[400] || '#f87171',
    brightGreen: success?.[400] || '#4ade80',
    brightYellow: warning?.[400] || '#facc15',
    brightBlue: primary?.[400] || '#60a5fa',
    brightMagenta: '#e879f9', // Bright purple
    brightCyan: '#22d3ee', // Bright cyan
    brightWhite: text.primary || '#ffffff',
  }
}

/**
 * Default terminal theme for fallback situations.
 * Provides a dark terminal theme that works when no Sparkle theme is available.
 */
export const DEFAULT_XTERM_THEME: XTermTheme = {
  background: '#000000',
  foreground: '#ffffff',
  cursor: '#ffffff',
  cursorAccent: '#000000',
  selectionBackground: '#3b82f640',
  black: '#262626',
  red: '#dc2626',
  green: '#16a34a',
  yellow: '#ca8a04',
  blue: '#2563eb',
  magenta: '#c026d3',
  cyan: '#0891b2',
  white: '#d1d5db',
  brightBlack: '#525252',
  brightRed: '#f87171',
  brightGreen: '#4ade80',
  brightYellow: '#facc15',
  brightBlue: '#60a5fa',
  brightMagenta: '#e879f9',
  brightCyan: '#22d3ee',
  brightWhite: '#ffffff',
}

/**
 * Gets font family from Sparkle theme typography tokens.
 * Falls back to monospace fonts suitable for terminal usage.
 *
 * @param theme - Sparkle theme configuration
 * @returns CSS font-family string optimized for terminal display
 */
export function getTerminalFontFamily(theme: ThemeConfig): string {
  const typography = theme.typography || {}
  const fontFamily = typography.fontFamily || {}

  // Prefer mono font, fallback to sans if not available
  const monoFamily = fontFamily.mono
  const sansFamily = fontFamily.sans

  if (monoFamily) {
    return Array.isArray(monoFamily) ? monoFamily.join(', ') : String(monoFamily)
  }

  if (sansFamily) {
    const family = Array.isArray(sansFamily) ? sansFamily.join(', ') : String(sansFamily)
    return `${family}, monospace`
  }

  // Default monospace stack for terminals
  return 'Menlo, Monaco, "Courier New", monospace'
}

/**
 * Gets font size from Sparkle theme typography tokens.
 * Returns a reasonable terminal font size with fallback.
 *
 * @param theme - Sparkle theme configuration
 * @returns Font size in pixels suitable for terminal display
 */
export function getTerminalFontSize(theme: ThemeConfig): number {
  const typography = theme.typography || {}
  const fontSize = typography.fontSize || {}

  // Use small or base font size, preferring smaller for terminals
  const smallSize = fontSize.sm || fontSize.small
  const baseSize = fontSize.base || fontSize.md || fontSize.medium

  if (smallSize) {
    const parsed = Number.parseFloat(String(smallSize))
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  if (baseSize) {
    const parsed = Number.parseFloat(String(baseSize))
    if (!Number.isNaN(parsed)) {
      return Math.max(12, parsed - 2) // Slightly smaller than base
    }
  }

  // Default terminal font size
  return 14
}
