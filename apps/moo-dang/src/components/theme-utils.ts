import type {ThemeConfig} from '@sparkle/theme'

/**
 * xterm.js terminal theme configuration interface.
 * Maps to the ITheme interface from xterm.js library.
 */
export interface XTermTheme {
  foreground?: string
  background?: string
  cursor?: string
  cursorAccent?: string
  selectionForeground?: string
  selectionBackground?: string
  black?: string
  red?: string
  green?: string
  yellow?: string
  blue?: string
  magenta?: string
  cyan?: string
  white?: string
  brightBlack?: string
  brightRed?: string
  brightGreen?: string
  brightYellow?: string
  brightBlue?: string
  brightMagenta?: string
  brightCyan?: string
  brightWhite?: string
}

/**
 * Default ANSI color palette optimized for terminal readability.
 * These colors provide good contrast and are widely compatible across terminals.
 * Based on the solarized color scheme which is designed for long-term viewing.
 */
const DEFAULT_ANSI_COLORS = {
  // Standard ANSI colors with carefully chosen contrast ratios
  black: '#073642',
  red: '#dc322f',
  green: '#859900',
  yellow: '#b58900',
  blue: '#268bd2',
  magenta: '#d33682',
  cyan: '#2aa198',
  white: '#eee8d5',
  // Bright variants provide visual hierarchy in terminal output
  brightBlack: '#525252',
  brightRed: '#f87171',
  brightGreen: '#4ade80',
  brightYellow: '#facc15',
  brightBlue: '#60a5fa',
  brightMagenta: '#e879f9',
  brightCyan: '#22d3ee',
  brightWhite: '#ffffff',
} as const

/**
 * Default monospace font stack optimized for terminal display.
 * Prioritizes readability and character distinction in code environments.
 */
const DEFAULT_TERMINAL_FONTS = 'Menlo, Monaco, "Courier New", monospace' as const

/**
 * Standard terminal font size in pixels.
 * Balances readability with screen real estate usage.
 */
const DEFAULT_TERMINAL_FONT_SIZE = 14 as const

/**
 * Converts Sparkle theme configuration to xterm.js compatible theme.
 *
 * This conversion handles the semantic differences between design system tokens
 * and terminal color requirements. Sparkle uses semantic naming (primary, secondary)
 * while xterm.js expects ANSI color names (red, green, blue).
 *
 * @param theme - Sparkle theme configuration with design tokens
 * @returns xterm.js theme object optimized for terminal display
 */
export function sparkleToXTermTheme(theme: ThemeConfig): XTermTheme {
  const colors = theme.colors || {}
  const semantic = colors.semantic || {}
  const neutral = colors.neutral || {}
  const primary = colors.primary || {}
  const success = colors.success || {}
  const warning = colors.warning || {}
  const danger = colors.danger || {}

  return {
    // Core terminal colors using semantic tokens with fallbacks
    foreground: semantic.foreground || neutral?.[900] || neutral?.[800] || '#1f2937',
    background: semantic.background || neutral?.[50] || neutral?.[100] || '#f9fafb',
    cursor: primary?.[500] || primary?.[600] || '#3b82f6',
    cursorAccent: semantic.background || neutral?.[50] || '#f9fafb',

    // Selection colors with transparency for better visibility
    selectionForeground: semantic.foreground || '#1f2937',
    selectionBackground: `${primary?.[500] || '#3b82f6'}40`, // 25% opacity

    // ANSI color mappings using semantic tokens where possible
    // Falls back to carefully chosen defaults for terminal readability
    black: neutral?.[900] || DEFAULT_ANSI_COLORS.black,
    red: danger?.[500] || DEFAULT_ANSI_COLORS.red,
    green: success?.[500] || DEFAULT_ANSI_COLORS.green,
    yellow: warning?.[500] || DEFAULT_ANSI_COLORS.yellow,
    blue: primary?.[500] || DEFAULT_ANSI_COLORS.blue,
    magenta: primary?.[700] || DEFAULT_ANSI_COLORS.magenta,
    cyan: primary?.[400] || DEFAULT_ANSI_COLORS.cyan,
    white: neutral?.[100] || DEFAULT_ANSI_COLORS.white,

    // Bright variants for enhanced contrast in terminal output
    brightBlack: neutral?.[600] || DEFAULT_ANSI_COLORS.brightBlack,
    brightRed: danger?.[400] || DEFAULT_ANSI_COLORS.brightRed,
    brightGreen: success?.[400] || DEFAULT_ANSI_COLORS.brightGreen,
    brightYellow: warning?.[400] || DEFAULT_ANSI_COLORS.brightYellow,
    brightBlue: primary?.[400] || DEFAULT_ANSI_COLORS.brightBlue,
    brightMagenta: primary?.[500] || DEFAULT_ANSI_COLORS.brightMagenta,
    brightCyan: primary?.[300] || DEFAULT_ANSI_COLORS.brightCyan,
    brightWhite: neutral?.[50] || DEFAULT_ANSI_COLORS.brightWhite,
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
 *
 * Prioritizes monospace fonts for terminal usage because character width
 * consistency is critical for proper alignment in command-line interfaces.
 *
 * @param theme - Sparkle theme configuration
 * @returns CSS font-family string optimized for terminal display
 */
export function getTerminalFontFamily(theme: ThemeConfig): string {
  const typography = theme.typography || {}
  const fontFamily = typography.fontFamily || {}

  // Prefer mono font for character alignment in terminal
  const monoFamily = fontFamily.mono

  if (monoFamily) {
    return Array.isArray(monoFamily) ? monoFamily.join(', ') : String(monoFamily)
  }

  // Fallback to sans with monospace appended for character width consistency
  const sansFamily = fontFamily.sans
  if (sansFamily) {
    const family = Array.isArray(sansFamily) ? sansFamily.join(', ') : String(sansFamily)
    return `${family}, monospace`
  }

  return DEFAULT_TERMINAL_FONTS
}

/**
 * Gets font size from Sparkle theme typography tokens.
 *
 * Uses smaller font sizes than typical web content because terminals
 * display dense text content where readability at smaller sizes is preferred.
 *
 * @param theme - Sparkle theme configuration
 * @returns Font size in pixels suitable for terminal display
 */
export function getTerminalFontSize(theme: ThemeConfig): number {
  const typography = theme.typography || {}
  const fontSize = typography.fontSize || {}

  // Prefer smaller font sizes for terminal density
  const candidates = [fontSize.sm, fontSize.small, fontSize.base, fontSize.md, fontSize.medium]

  for (const size of candidates) {
    if (size) {
      const parsed = Number.parseFloat(String(size))
      if (!Number.isNaN(parsed) && parsed > 0) {
        // Use base size for sm/small, slightly reduce for larger sizes
        return candidates.indexOf(size) < 2 ? parsed : Math.max(12, parsed - 2)
      }
    }
  }

  return DEFAULT_TERMINAL_FONT_SIZE
}
