/**
 * Unit tests for theme-utils.ts.
 *
 * Tests cover Sparkle theme to XTerm theme conversion, font family and size extraction,
 * and theme validation following Sparkle testing patterns.
 */

import type {ThemeConfig} from '@sparkle/theme'
import {describe, expect, expectTypeOf, it} from 'vitest'

import {
  DEFAULT_XTERM_THEME,
  getTerminalFontFamily,
  getTerminalFontSize,
  sparkleToXTermTheme,
  type XTermTheme,
} from './theme-utils'

// Helper to create minimal valid theme configs for testing
const createTheme = (overrides: Partial<ThemeConfig> = {}): ThemeConfig =>
  ({
    colors: {},
    typography: {
      fontFamily: {},
      fontSize: {},
      fontWeight: {},
      lineHeight: {},
      letterSpacing: {},
    },
    spacing: {},
    shadows: {},
    borderRadius: {},
    animation: {},
    ...overrides,
  }) as ThemeConfig

describe('Theme Utils', () => {
  describe('sparkleToXTermTheme', () => {
    it('should convert minimal Sparkle theme to XTerm theme', () => {
      const sparkleTheme = createTheme({
        colors: {},
      })

      const xtermTheme = sparkleToXTermTheme(sparkleTheme)

      expect(xtermTheme).toBeDefined()
      expect(xtermTheme.foreground).toBeDefined()
      expect(xtermTheme.background).toBeDefined()
      expect(xtermTheme.cursor).toBeDefined()
    })

    it('should use semantic colors when available', () => {
      const sparkleTheme = createTheme({
        colors: {
          semantic: {
            foreground: '#333333',
            background: '#ffffff',
          },
        },
      })

      const xtermTheme = sparkleToXTermTheme(sparkleTheme)

      expect(xtermTheme.foreground).toBe('#333333')
      expect(xtermTheme.background).toBe('#ffffff')
    })

    it('should use neutral colors as fallback', () => {
      const sparkleTheme = createTheme({
        colors: {
          neutral: {
            50: '#f9fafb',
            100: '#f3f4f6',
            800: '#1f2937',
            900: '#111827',
          },
        },
      })

      const xtermTheme = sparkleToXTermTheme(sparkleTheme)

      expect(xtermTheme.foreground).toBe('#111827') // neutral[900]
      expect(xtermTheme.background).toBe('#f9fafb') // neutral[50]
    })

    it('should map primary colors correctly', () => {
      const sparkleTheme = createTheme({
        colors: {
          primary: {
            300: '#93c5fd',
            400: '#60a5fa',
            500: '#3b82f6',
            600: '#2563eb',
            700: '#1d4ed8',
          },
        },
      })

      const xtermTheme = sparkleToXTermTheme(sparkleTheme)

      expect(xtermTheme.cursor).toBe('#3b82f6') // primary[500]
      expect(xtermTheme.blue).toBe('#3b82f6') // primary[500]
      expect(xtermTheme.brightBlue).toBe('#60a5fa') // primary[400]
      expect(xtermTheme.cyan).toBe('#60a5fa') // primary[400]
      expect(xtermTheme.brightCyan).toBe('#93c5fd') // primary[300]
    })

    it('should map semantic status colors correctly', () => {
      const sparkleTheme = createTheme({
        colors: {
          success: {
            400: '#4ade80',
            500: '#22c55e',
          },
          warning: {
            400: '#facc15',
            500: '#eab308',
          },
          danger: {
            400: '#f87171',
            500: '#ef4444',
          },
        },
      })

      const xtermTheme = sparkleToXTermTheme(sparkleTheme)

      expect(xtermTheme.green).toBe('#22c55e') // success[500]
      expect(xtermTheme.brightGreen).toBe('#4ade80') // success[400]
      expect(xtermTheme.yellow).toBe('#eab308') // warning[500]
      expect(xtermTheme.brightYellow).toBe('#facc15') // warning[400]
      expect(xtermTheme.red).toBe('#ef4444') // danger[500]
      expect(xtermTheme.brightRed).toBe('#f87171') // danger[400]
    })

    it('should create selection background with transparency', () => {
      const sparkleTheme = createTheme({
        colors: {
          primary: {
            500: '#3b82f6',
          },
        },
      })

      const xtermTheme = sparkleToXTermTheme(sparkleTheme)

      expect(xtermTheme.selectionBackground).toBe('#3b82f640') // 25% opacity
    })

    it('should fall back to default colors when theme colors missing', () => {
      const sparkleTheme = createTheme({
        colors: {},
      })

      const xtermTheme = sparkleToXTermTheme(sparkleTheme)

      // Should fall back to default ANSI colors
      expect(xtermTheme.black).toBe('#073642')
      expect(xtermTheme.red).toBe('#dc322f')
      expect(xtermTheme.green).toBe('#859900')
      expect(xtermTheme.yellow).toBe('#b58900')
      expect(xtermTheme.blue).toBe('#268bd2')
      expect(xtermTheme.magenta).toBe('#d33682')
      expect(xtermTheme.cyan).toBe('#2aa198')
      expect(xtermTheme.white).toBe('#eee8d5')
    })

    it('should have correct type signature', () => {
      const sparkleTheme = createTheme({colors: {}})
      const xtermTheme = sparkleToXTermTheme(sparkleTheme)

      expectTypeOf(xtermTheme).toEqualTypeOf<XTermTheme>()
      expectTypeOf(xtermTheme.foreground).toEqualTypeOf<string | undefined>()
      expectTypeOf(xtermTheme.background).toEqualTypeOf<string | undefined>()
    })
  })

  describe('getTerminalFontFamily', () => {
    it('should return default font family for minimal theme', () => {
      const sparkleTheme = createTheme({colors: {}})

      const fontFamily = getTerminalFontFamily(sparkleTheme)

      expect(fontFamily).toBe('Menlo, Monaco, "Courier New", monospace')
    })

    it('should return default font family when typography missing', () => {
      const sparkleTheme = createTheme({
        colors: {},
        typography: {
          fontFamily: {},
          fontSize: {},
          fontWeight: {},
          lineHeight: {},
          letterSpacing: {},
        },
      })

      const fontFamily = getTerminalFontFamily(sparkleTheme)

      expect(fontFamily).toBe('Menlo, Monaco, "Courier New", monospace')
    })

    it('should use theme monospace font family when available', () => {
      const sparkleTheme = createTheme({
        colors: {},
        typography: {
          fontFamily: {
            mono: 'JetBrains Mono, Consolas, monospace',
          },
          fontSize: {},
          fontWeight: {},
          lineHeight: {},
          letterSpacing: {},
        },
      })

      const fontFamily = getTerminalFontFamily(sparkleTheme)

      expect(fontFamily).toBe('JetBrains Mono, Consolas, monospace')
    })

    it('should use sans font family with monospace fallback', () => {
      const sparkleTheme = createTheme({
        colors: {},
        typography: {
          fontFamily: {
            sans: 'Arial, Helvetica, sans-serif',
          },
          fontSize: {},
          fontWeight: {},
          lineHeight: {},
          letterSpacing: {},
        },
      })

      const fontFamily = getTerminalFontFamily(sparkleTheme)

      expect(fontFamily).toBe('Arial, Helvetica, sans-serif, monospace')
    })

    it('should handle array font families', () => {
      const sparkleTheme = createTheme({
        colors: {},
        typography: {
          fontFamily: {
            mono: ['JetBrains Mono', 'Consolas', 'monospace'] as any, // Type assertion for test
          },
          fontSize: {},
          fontWeight: {},
          lineHeight: {},
          letterSpacing: {},
        },
      })

      const fontFamily = getTerminalFontFamily(sparkleTheme)

      expect(fontFamily).toBe('JetBrains Mono, Consolas, monospace')
    })

    it('should have correct type signature', () => {
      const sparkleTheme = createTheme({colors: {}})
      const fontFamily = getTerminalFontFamily(sparkleTheme)

      expectTypeOf(fontFamily).toEqualTypeOf<string>()
    })
  })

  describe('getTerminalFontSize', () => {
    it('should return default font size for minimal theme', () => {
      const sparkleTheme = createTheme({colors: {}})

      const fontSize = getTerminalFontSize(sparkleTheme)

      expect(fontSize).toBe(14)
    })

    it('should return default font size when typography missing', () => {
      const sparkleTheme = createTheme({
        colors: {},
        typography: {
          fontFamily: {},
          fontSize: {},
          fontWeight: {},
          lineHeight: {},
          letterSpacing: {},
        },
      })

      const fontSize = getTerminalFontSize(sparkleTheme)

      expect(fontSize).toBe(14)
    })

    it('should use theme sm font size when available', () => {
      const sparkleTheme = createTheme({
        colors: {},
        typography: {
          fontFamily: {},
          fontSize: {
            sm: '12px',
            base: '16px',
            lg: '18px',
          },
          fontWeight: {},
          lineHeight: {},
          letterSpacing: {},
        },
      })

      const fontSize = getTerminalFontSize(sparkleTheme)

      // Should parse "12px" to number 12 for sm size
      expect(fontSize).toBe(12)
    })

    it('should use base font size as fallback', () => {
      const sparkleTheme = createTheme({
        colors: {},
        typography: {
          fontFamily: {},
          fontSize: {
            base: '16px',
            lg: '18px',
          },
          fontWeight: {},
          lineHeight: {},
          letterSpacing: {},
        },
      })

      const fontSize = getTerminalFontSize(sparkleTheme)

      // Should parse "16px" to number 14 (base size reduced by 2 for terminal density)
      expect(fontSize).toBe(14)
    })

    it('should handle font size without px unit', () => {
      const sparkleTheme = createTheme({
        colors: {},
        typography: {
          fontFamily: {},
          fontSize: {
            sm: '14',
          },
          fontWeight: {},
          lineHeight: {},
          letterSpacing: {},
        },
      })

      const fontSize = getTerminalFontSize(sparkleTheme)

      expect(fontSize).toBe(14)
    })

    it('should fall back to default for invalid font size', () => {
      const sparkleTheme = createTheme({
        colors: {},
        typography: {
          fontFamily: {},
          fontSize: {
            sm: 'invalid',
            base: 'also-invalid',
          },
          fontWeight: {},
          lineHeight: {},
          letterSpacing: {},
        },
      })

      const fontSize = getTerminalFontSize(sparkleTheme)

      expect(fontSize).toBe(14) // Default fallback
    })

    it('should have correct type signature', () => {
      const sparkleTheme = createTheme({colors: {}})
      const fontSize = getTerminalFontSize(sparkleTheme)

      expectTypeOf(fontSize).toEqualTypeOf<number>()
    })
  })

  describe('DEFAULT_XTERM_THEME', () => {
    it('should have all required XTerm theme properties', () => {
      expect(DEFAULT_XTERM_THEME.background).toBe('#000000')
      expect(DEFAULT_XTERM_THEME.foreground).toBe('#ffffff')
      expect(DEFAULT_XTERM_THEME.cursor).toBe('#ffffff')
      expect(DEFAULT_XTERM_THEME.cursorAccent).toBe('#000000')
    })

    it('should have complete ANSI color palette', () => {
      const colors = [
        'black',
        'red',
        'green',
        'yellow',
        'blue',
        'magenta',
        'cyan',
        'white',
        'brightBlack',
        'brightRed',
        'brightGreen',
        'brightYellow',
        'brightBlue',
        'brightMagenta',
        'brightCyan',
        'brightWhite',
      ] as const

      for (const color of colors) {
        expect(DEFAULT_XTERM_THEME[color]).toBeDefined()
        expect(typeof DEFAULT_XTERM_THEME[color]).toBe('string')
      }
    })

    it('should have selection background with transparency', () => {
      expect(DEFAULT_XTERM_THEME.selectionBackground).toBe('#3b82f640')
    })

    it('should have correct type signature', () => {
      expectTypeOf(DEFAULT_XTERM_THEME).toEqualTypeOf<XTermTheme>()
    })
  })

  describe('XTermTheme interface', () => {
    it('should accept all standard terminal colors', () => {
      const theme: XTermTheme = {
        foreground: '#ffffff',
        background: '#000000',
        cursor: '#ffffff',
        cursorAccent: '#000000',
        selectionForeground: '#ffffff',
        selectionBackground: '#333333',
        black: '#000000',
        red: '#ff0000',
        green: '#00ff00',
        yellow: '#ffff00',
        blue: '#0000ff',
        magenta: '#ff00ff',
        cyan: '#00ffff',
        white: '#ffffff',
        brightBlack: '#808080',
        brightRed: '#ff8080',
        brightGreen: '#80ff80',
        brightYellow: '#ffff80',
        brightBlue: '#8080ff',
        brightMagenta: '#ff80ff',
        brightCyan: '#80ffff',
        brightWhite: '#ffffff',
      }

      expectTypeOf(theme).toEqualTypeOf<XTermTheme>()
    })

    it('should accept minimal theme with optional properties', () => {
      const theme: XTermTheme = {
        foreground: '#ffffff',
        background: '#000000',
      }

      expectTypeOf(theme).toEqualTypeOf<XTermTheme>()
    })
  })
})
