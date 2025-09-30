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

vi.mock('@xterm/xterm', () => ({
  Terminal: vi.fn().mockImplementation(() => ({
    write: vi.fn(),
    clear: vi.fn(),
    focus: vi.fn(),
    open: vi.fn(),
    dispose: vi.fn(),
    loadAddon: vi.fn(),
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
 * ResizeObserver mock for container size change testing.
 * Browser API not available in test environment.
 */
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

/**
 * Mock XTerm terminal interface for testing.
 * Prevents actual terminal initialization during tests while maintaining API compatibility.
 */
interface MockTerminal {
  write: ReturnType<typeof vi.fn>
  clear: ReturnType<typeof vi.fn>
  focus: ReturnType<typeof vi.fn>
  open: ReturnType<typeof vi.fn>
  dispose: ReturnType<typeof vi.fn>
  loadAddon: ReturnType<typeof vi.fn>
  onData: ReturnType<typeof vi.fn>
  onResize: ReturnType<typeof vi.fn>
  options: Record<string, unknown>
  cols: number
  rows: number
}

const createMockTerminal = (): MockTerminal => ({
  write: vi.fn(),
  clear: vi.fn(),
  focus: vi.fn(),
  open: vi.fn(),
  dispose: vi.fn(),
  loadAddon: vi.fn(),
  onData: vi.fn(() => ({dispose: vi.fn()})),
  onResize: vi.fn(() => ({dispose: vi.fn()})),
  options: {},
  cols: 80,
  rows: 24,
})

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
      const mockTerminal = createMockTerminal()
      writeToTerminal(mockTerminal as any, 'test text')
      expect(mockTerminal.write).toHaveBeenCalledWith('test text')
    })

    it('should throw TerminalError on write failure', () => {
      const mockTerminal = createMockTerminal()
      mockTerminal.write.mockImplementationOnce(() => {
        throw new Error('Write failed')
      })

      expect(() => writeToTerminal(mockTerminal as any, 'test')).toThrow('Terminal write: Write operation failed')
    })
  })

  describe('clearTerminal', () => {
    it('should clear terminal', () => {
      const mockTerminal = createMockTerminal()
      clearTerminal(mockTerminal as any)
      expect(mockTerminal.clear).toHaveBeenCalled()
    })

    it('should throw TerminalError on clear failure', () => {
      const mockTerminal = createMockTerminal()
      mockTerminal.clear.mockImplementationOnce(() => {
        throw new Error('Clear failed')
      })

      expect(() => clearTerminal(mockTerminal as any)).toThrow('Terminal clear: Clear operation failed')
    })
  })

  describe('focusTerminal', () => {
    it('should focus terminal', () => {
      const mockTerminal = createMockTerminal()
      focusTerminal(mockTerminal as any)
      expect(mockTerminal.focus).toHaveBeenCalled()
    })

    it('should throw TerminalError on focus failure', () => {
      const mockTerminal = createMockTerminal()
      mockTerminal.focus.mockImplementationOnce(() => {
        throw new Error('Focus failed')
      })

      expect(() => focusTerminal(mockTerminal as any)).toThrow('Terminal focus: Focus operation failed')
    })
  })
})
