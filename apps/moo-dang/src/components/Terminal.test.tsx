/**
 * Unit tests for Terminal component.
 *
 * Comprehensive test coverage for terminal creation, theme integration, error handling,
 * and utility functions. Tests follow Sparkle testing patterns with proper type safety
 * and meaningful assertions that validate both implementation correctness and API contracts.
 */

import {ThemeProvider} from '@sparkle/theme'
import {render, screen} from '@testing-library/react'
import {describe, expect, expectTypeOf, it, vi} from 'vitest'

import {
  clearTerminal,
  createTerminalError,
  focusTerminal,
  Terminal,
  writeToTerminal,
  type TerminalProps,
} from './Terminal'

// Mock xterm.js and addons with comprehensive interface coverage
vi.mock('@xterm/xterm', () => ({
  Terminal: vi.fn().mockImplementation(() => ({
    write: vi.fn(),
    clear: vi.fn(),
    focus: vi.fn(),
    open: vi.fn(),
    dispose: vi.fn(),
    onData: vi.fn(() => ({dispose: vi.fn()})),
    onResize: vi.fn(() => ({dispose: vi.fn()})),
    options: {},
    cols: 80,
    rows: 24,
  })),
}))

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: vi.fn().mockImplementation(() => ({
    fit: vi.fn(),
    proposeDimensions: vi.fn(() => ({cols: 80, rows: 24})),
  })),
}))

/**
 * Mock ResizeObserver for testing terminal resize functionality.
 * Essential for terminal fit operations that depend on container size changes.
 */
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

describe('Terminal Component', () => {
  const renderTerminal = (props: Partial<TerminalProps> = {}) => {
    return render(
      <ThemeProvider>
        <Terminal data-testid="terminal" {...props} />
      </ThemeProvider>,
    )
  }

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      renderTerminal()
      expect(screen.getByTestId('terminal')).toBeDefined()
    })

    it('should apply custom className', () => {
      const customClass = 'custom-terminal-class'
      renderTerminal({className: customClass})

      const terminal = screen.getByTestId('terminal')
      expect(terminal.className).toContain(customClass)
    })

    it('should have proper accessibility attributes', () => {
      renderTerminal()

      const terminal = screen.getByTestId('terminal')
      expect(terminal.getAttribute('role')).toBe('terminal')
      expect(terminal.getAttribute('aria-label')).toBe('Terminal interface')
      expect(terminal.getAttribute('tabIndex')).toBe('0')
    })
  })

  describe('Component Props', () => {
    it('should accept terminal options', () => {
      const options = {
        fontSize: 16,
        fontFamily: 'monospace',
        cursorBlink: false,
      }

      expect(() => renderTerminal({options})).not.toThrow()
    })

    it('should accept initial text', () => {
      const initialText = 'Welcome to moo-dang shell!'

      expect(() => renderTerminal({initialText})).not.toThrow()
    })

    it('should accept event callbacks', () => {
      const onData = vi.fn()
      const onResize = vi.fn()
      const onReady = vi.fn()

      expect(() => renderTerminal({onData, onResize, onReady})).not.toThrow()
    })

    it('should accept theme override', () => {
      const themeOverride = {
        background: '#000000',
        foreground: '#ffffff',
      }

      expect(() => renderTerminal({themeOverride})).not.toThrow()
    })
  })
})

describe('Terminal Utility Functions', () => {
  describe('createTerminalError', () => {
    it('should create terminal error with operation and message', () => {
      const error = createTerminalError('Test message', 'test-operation')

      expect(error.message).toBe('Terminal test-operation: Test message')
      expect(error.name).toBe('TerminalError')
      expect(error.operation).toBe('test-operation')
    })

    it('should create terminal error with cause', () => {
      const originalError = new Error('Original error')
      const error = createTerminalError('Test message', 'test-operation', originalError)

      expect(error.cause).toBe(originalError)
    })

    it('should have correct type signature', () => {
      const error = createTerminalError('Test', 'operation')
      expectTypeOf(error.operation).toEqualTypeOf<string>()
      expectTypeOf(error.cause).toEqualTypeOf<unknown>()
    })
  })

  describe('writeToTerminal', () => {
    it('should write text to terminal', () => {
      // Using minimal mock - 'as any' is necessary for test mocking of external XTerm interface
      const mockTerminal = {write: vi.fn()} as any
      writeToTerminal(mockTerminal, 'test text')
      expect(mockTerminal.write).toHaveBeenCalledWith('test text')
    })

    it('should throw TerminalError on write failure', () => {
      // Mock terminal that throws to test error handling behavior
      const mockTerminal = {
        write: vi.fn().mockImplementationOnce(() => {
          throw new Error('Write failed')
        }),
      } as any

      expect(() => writeToTerminal(mockTerminal, 'test')).toThrow('Terminal write: Write operation failed')
    })
  })

  describe('clearTerminal', () => {
    it('should clear terminal', () => {
      // Using minimal mock - 'as any' is necessary for test mocking of external XTerm interface
      const mockTerminal = {clear: vi.fn()} as any
      clearTerminal(mockTerminal)
      expect(mockTerminal.clear).toHaveBeenCalled()
    })

    it('should throw TerminalError on clear failure', () => {
      // Mock terminal that throws to test error handling behavior
      const mockTerminal = {
        clear: vi.fn().mockImplementationOnce(() => {
          throw new Error('Clear failed')
        }),
      } as any

      expect(() => clearTerminal(mockTerminal)).toThrow('Terminal clear: Clear operation failed')
    })
  })

  describe('focusTerminal', () => {
    it('should focus terminal', () => {
      // Using minimal mock - 'as any' is necessary for test mocking of external XTerm interface
      const mockTerminal = {focus: vi.fn()} as any
      focusTerminal(mockTerminal)
      expect(mockTerminal.focus).toHaveBeenCalled()
    })

    it('should throw TerminalError on focus failure', () => {
      // Mock terminal that throws to test error handling behavior
      const mockTerminal = {
        focus: vi.fn().mockImplementationOnce(() => {
          throw new Error('Focus failed')
        }),
      } as any

      expect(() => focusTerminal(mockTerminal)).toThrow('Terminal focus: Focus operation failed')
    })
  })
})
