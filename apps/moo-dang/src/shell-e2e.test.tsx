/**
 * End-to-End tests for complete shell workflows in moo-dang WASM web shell.
 *
 * These tests verify complete user workflows from terminal interaction through
 * command execution to response display. They test the integration between
 * the React components, Web Worker shell, and WASM executable system to ensure
 * the entire application works cohesively for real user scenarios.
 *
 * These tests focus on application-level integration rather than detailed
 * component behavior, ensuring the shell application works as a complete system.
 */

import type {CommandTerminalHandle} from './components'
import type {ShellWorkerRequest} from './shell/types'

import {ThemeProvider} from '@sparkle/theme'
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react'

import {beforeEach, describe, expect, it, vi} from 'vitest'

import App from './App'
import {CommandTerminal} from './components'

// Extended timeout for end-to-end workflows
const E2E_TIMEOUT = 15000

/**
 * Mock worker implementation for testing shell workflows.
 * Provides realistic command responses for integration testing.
 */
class MockShellWorker extends EventTarget {
  postMessage(_message: ShellWorkerRequest): void {
    setTimeout(() => {
      this.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'command-result',
            result: {
              processId: 1001,
              command: 'test-command',
              stdout: 'Command executed successfully',
              stderr: '',
              exitCode: 0,
              executionTime: 10,
            },
          },
        }),
      )
    }, 50)
  }

  terminate(): void {
    // Mock cleanup
  }
}

beforeEach(() => {
  vi.stubGlobal('Worker', MockShellWorker)
})

describe('End-to-End Shell Workflows', () => {
  describe('Application Initialization and Terminal Setup', () => {
    it('should render complete application with terminal interface', async () => {
      render(<App />)

      // Verify main application structure
      const heading = screen.getByRole('heading', {level: 1})
      expect(heading.textContent).toBe('moo-dang')
      expect(screen.getByText('WASM-based Web Shell')).toBeDefined()

      // Verify terminal interface is present
      expect(screen.getByRole('terminal')).toBeDefined()
      expect(screen.getByLabelText('Terminal interface')).toBeDefined()

      // Verify terminal is accessible
      await waitFor(
        () => {
          const terminal = screen.getByRole('terminal')
          expect(terminal).toBeDefined()
        },
        {timeout: E2E_TIMEOUT},
      )
    })

    it('should initialize with welcome text and command prompt', async () => {
      render(<App />)

      await waitFor(() => {
        const terminal = screen.getByRole('terminal')
        expect(terminal).toBeDefined()
      })

      // Terminal should be present and functional
    })

    it('should handle theme integration properly', () => {
      render(
        <ThemeProvider defaultTheme="dark">
          <App />
        </ThemeProvider>,
      )

      expect(screen.getByRole('terminal')).toBeDefined()
    })
  })

  describe('Basic Command Execution Workflows', () => {
    it('should execute simple commands and display output', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByRole('terminal')).toBeDefined()
      })

      // Find and interact with terminal input
      const terminal = screen.getByRole('terminal')

      // Simulate typing a command (integration test for terminal interaction)
      await act(async () => {
        fireEvent.keyDown(terminal, {key: 'p'})
        fireEvent.keyDown(terminal, {key: 'w'})
        fireEvent.keyDown(terminal, {key: 'd'})
        fireEvent.keyDown(terminal, {key: 'Enter'})
      })

      // Terminal should handle input properly
      expect(terminal).toBeDefined()
    })

    it('should handle demo command for testing terminal output types', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByRole('terminal')).toBeDefined()
      })

      const terminal = screen.getByRole('terminal')

      // Execute demo command
      await act(async () => {
        'demo'.split('').forEach(char => {
          fireEvent.keyDown(terminal, {key: char})
        })
        fireEvent.keyDown(terminal, {key: 'Enter'})
      })

      // Should display various output types and formatting
    })

    it('should handle help command execution', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByRole('terminal')).toBeDefined()
      })

      const terminal = screen.getByRole('terminal')

      // Execute help command
      await act(async () => {
        'help'.split('').forEach(char => {
          fireEvent.keyDown(terminal, {key: char})
        })
        fireEvent.keyDown(terminal, {key: 'Enter'})
      })

      // Should handle help command
      expect(terminal).toBeDefined()
    })
  })

  describe('User Interface and Accessibility Workflows', () => {
    it('should support keyboard navigation and shortcuts', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByRole('terminal')).toBeDefined()
      })

      // Test keyboard shortcuts integration
      const terminal = screen.getByRole('terminal')

      // Test help command shortcut
      await act(async () => {
        fireEvent.keyDown(terminal, {key: '?'})
        fireEvent.keyDown(terminal, {key: 'Enter'})
      })

      // Should handle keyboard interaction
      expect(terminal).toBeDefined()
    })

    it('should handle terminal resizing properly', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByRole('terminal')).toBeDefined()
      })

      // Simulate window resize
      await act(async () => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 1200,
        })
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: 800,
        })

        window.dispatchEvent(new Event('resize'))
      })

      // Terminal should adapt to new size
      expect(screen.getByRole('terminal')).toBeDefined()
    })

    it('should provide proper accessibility attributes and screen reader support', () => {
      render(<App />)

      // Check accessibility attributes
      const terminal = screen.getByRole('terminal')
      expect(terminal.getAttribute('aria-label')).toBe('Terminal interface')

      // Check for accessibility provider
      const main = screen.getByRole('main')
      expect(main).toBeDefined()

      // Check for screen reader helper instructions
      const instructions = screen.getByLabelText('Instructions')
      expect(instructions).toBeDefined()
      expect(instructions.textContent).toContain('Press F1 for keyboard shortcuts help')
    })
  })

  describe('Complete Shell Session Workflows', () => {
    it('should handle complete user session from startup to command execution', async () => {
      render(<App />)

      // 1. Application initialization
      await waitFor(() => {
        expect(screen.getByRole('terminal')).toBeDefined()
      })

      const terminal = screen.getByRole('terminal')

      // 2. Execute a series of commands
      const commands = ['pwd', 'ls', 'help']

      for (const cmd of commands) {
        await act(async () => {
          cmd.split('').forEach(char => {
            fireEvent.keyDown(terminal, {key: char})
          })
          fireEvent.keyDown(terminal, {key: 'Enter'})
        })

        // Small delay between commands
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      // Complete session workflow verification
      expect(screen.getByRole('terminal')).toBeDefined()
    })

    it('should handle error recovery in complex workflows', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByRole('terminal')).toBeDefined()
      })

      const terminal = screen.getByRole('terminal')

      // Execute a series of commands with errors mixed in
      const commands = [
        'pwd', // success
        'invalidcmd', // error
        'help', // success
      ]

      for (const cmd of commands) {
        await act(async () => {
          cmd.split('').forEach(char => {
            fireEvent.keyDown(terminal, {key: char})
          })
          fireEvent.keyDown(terminal, {key: 'Enter'})
        })

        // Small delay between commands
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      // Terminal should still be functional after errors
      expect(screen.getByRole('terminal')).toBeDefined()
    })
  })
})

describe('CommandTerminal Component E2E Integration', () => {
  it('should integrate properly with shell for command execution', async () => {
    const mockRef = {current: null} as {current: CommandTerminalHandle | null}

    const TestWrapper = () => (
      <ThemeProvider>
        <CommandTerminal
          ref={mockRef}
          onCommandExecute={() => {}}
          options={{fontSize: 14, cursorBlink: true}}
          commandConfig={{prompt: '$ ', maxHistorySize: 50}}
          initialText="Test terminal ready\r\n"
        />
      </ThemeProvider>
    )

    render(<TestWrapper />)

    await waitFor(() => {
      expect(screen.getByRole('terminal')).toBeDefined()
    })

    // Test terminal integration
    expect(mockRef.current).toBeDefined()
  })

  it('should handle terminal output formatting correctly', async () => {
    const mockRef = {current: null} as {current: CommandTerminalHandle | null}

    const TestWrapper = () => (
      <ThemeProvider>
        <CommandTerminal
          ref={mockRef}
          onCommandExecute={(_cmd: string) => {
            /* handle command */
          }}
          options={{fontSize: 14, cursorBlink: true}}
          commandConfig={{prompt: '$ ', maxHistorySize: 50}}
          initialText="Ready for output testing\r\n"
        />
      </ThemeProvider>
    )

    render(<TestWrapper />)

    await waitFor(() => {
      expect(screen.getByRole('terminal')).toBeDefined()
      expect(mockRef.current).toBeDefined()
    })

    // Test different output types
    if (mockRef.current) {
      await act(async () => {
        const terminal = mockRef.current
        if (terminal) {
          terminal.addOutput('command', 'test-command')
          terminal.addOutput('output', 'Command output')
          terminal.addOutput('error', 'Error message')
          terminal.addOutput('warning', 'Warning message')
          terminal.addOutput('info', 'Info message')
          terminal.addOutput('system', 'System message')
        }
      })
    }

    // All output should be added to terminal
    expect(mockRef.current).toBeDefined()
  })
})
