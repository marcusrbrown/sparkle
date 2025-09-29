import type {CommandTerminalHandle} from '@moo-dang/components/CommandTerminal'
import type {Meta, StoryObj} from '@storybook/react-vite'

import {CommandTerminal} from '@moo-dang/components/CommandTerminal'
import {ThemeProvider, useTheme} from '@sparkle/theme'
import React, {useCallback, useRef, useState} from 'react'

/**
 * CommandTerminal component that combines xterm.js with integrated command input handling and history.
 *
 * ## Features
 * - **Enhanced Terminal**: Builds on base Terminal component with command-line interface capabilities
 * - **Command History**: Built-in command history with navigation and persistence
 * - **Input Handling**: Comprehensive keyboard input handling including shortcuts
 * - **Shell Integration**: Designed for integration with the moo-dang WASM shell environment
 * - **Theme Integration**: Full Sparkle theme system support with dark/light modes
 * - **Accessibility**: WCAG 2.1 AA compliant with proper keyboard navigation and screen reader support
 *
 * ## Design Tokens
 * Inherits all Terminal component design tokens plus:
 * - Command prompt styling from theme
 * - History navigation visual indicators
 * - Input validation states and colors
 *
 * ## Basic Usage
 * ```tsx
 * <CommandTerminal
 *   enableCommandInput={true}
 *   onCommandExecute={(command) => console.log('Execute:', command)}
 * />
 * ```
 *
 * ## With Command Configuration
 * ```tsx
 * <CommandTerminal
 *   commandConfig={{
 *     prompt: '$ ',
 *     historySize: 100,
 *     enableCompletion: true
 *   }}
 *   onCommandExecute={handleCommand}
 * />
 * ```
 *
 * ## Programmatic Control
 * ```tsx
 * const terminalRef = useRef<CommandTerminalHandle>(null);
 *
 * // Execute command programmatically
 * terminalRef.current?.executeCommand();
 *
 * // Add output to terminal
 * terminalRef.current?.addOutput('success', 'Command completed successfully');
 * ```
 */
const meta = {
  title: 'Apps/moo-dang/CommandTerminal',
  component: CommandTerminal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Enhanced terminal component with integrated command input handling and shell-like behavior.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    enableCommandInput: {
      control: 'boolean',
      description: 'Enable command input handling',
      defaultValue: true,
    },
    onCommandExecute: {
      action: 'command-executed',
      description: 'Callback fired when user executes a command',
    },
    onResize: {
      action: 'terminal-resized',
      description: 'Callback fired when terminal dimensions change',
    },
    onReady: {
      action: 'terminal-ready',
      description: 'Callback fired when terminal is ready for use',
    },
  },
} satisfies Meta<typeof CommandTerminal>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Theme switcher component for demonstrating theme-aware terminal behavior
 */
function ThemeSwitcher() {
  const {activeTheme, setTheme, systemTheme} = useTheme()

  const themes = [
    {value: 'light', label: 'Light', icon: '☀️'},
    {value: 'dark', label: 'Dark', icon: '🌙'},
    {value: 'system', label: `System (${systemTheme})`, icon: '⚙️'},
  ] as const

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="flex gap-2 p-2 bg-theme-surface-primary border border-theme-border rounded-lg shadow-lg">
        <span className="text-theme-text-secondary text-sm font-medium">Theme:</span>
        {themes.map(theme => (
          <button
            key={theme.value}
            onClick={() => setTheme(theme.value)}
            className={`
              px-3 py-1 text-xs rounded transition-colors
              ${
                activeTheme === theme.value
                  ? 'bg-theme-primary-500 text-white'
                  : 'bg-theme-surface-secondary text-theme-text-primary hover:bg-theme-surface-hover'
              }
            `}
            aria-label={`Switch to ${theme.label} theme`}
          >
            {theme.icon} {theme.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Theme-aware wrapper component for stories
 */
function ThemeWrapper({children}: {children: React.ReactNode}) {
  return (
    <ThemeProvider defaultTheme="system">
      <div className="min-h-screen bg-theme-surface-primary text-theme-text-primary transition-colors">
        <ThemeSwitcher />
        <div className="p-8 h-screen">{children}</div>
      </div>
    </ThemeProvider>
  )
}

/**
 * Default command terminal showcasing basic shell-like functionality.
 * Demonstrates the standard command terminal configuration.
 */
export const Default: Story = {
  render: args => (
    <ThemeWrapper>
      <div className="h-full">
        <CommandTerminal {...args} enableCommandInput={true} className="h-full" />
      </div>
    </ThemeWrapper>
  ),
}

/**
 * Interactive command terminal that processes user commands.
 * Demonstrates command execution with history and output handling.
 */
export const Interactive: Story = {
  render: () => {
    const terminalRef = useRef<CommandTerminalHandle>(null)
    const [commandCount, setCommandCount] = useState(0)

    const handleCommandExecute = useCallback((command: string) => {
      if (!terminalRef.current) return

      const trimmedCommand = command.trim()

      if (trimmedCommand === '') {
        return
      }

      // Simulate command processing
      setCommandCount(prev => prev + 1)

      if (trimmedCommand === 'help') {
        terminalRef.current.addOutput('info', 'Available commands: help, clear, echo [text], date, history')
      } else if (trimmedCommand === 'clear') {
        terminalRef.current.clearOutput()
      } else if (trimmedCommand.startsWith('echo ')) {
        const message = trimmedCommand.slice(5)
        terminalRef.current.addOutput('output', message)
      } else if (trimmedCommand === 'date') {
        terminalRef.current.addOutput('info', new Date().toISOString())
      } else if (trimmedCommand === 'history') {
        const history = terminalRef.current.getHistory()
        history.forEach((entry, index) => {
          terminalRef.current?.addOutput('info', `${index + 1}: ${entry.command}`)
        })
      } else {
        terminalRef.current.addOutput('error', `Unknown command: ${trimmedCommand}`)
        terminalRef.current.addOutput('info', 'Type "help" for available commands')
      }
    }, [])

    const handleReady = useCallback(() => {
      if (!terminalRef.current) return

      terminalRef.current.addOutput('info', 'Welcome to moo-dang Command Terminal!')
      terminalRef.current.addOutput('info', 'Type "help" to see available commands.')
    }, [])

    return (
      <ThemeWrapper>
        <div className="h-full space-y-4">
          <div className="bg-theme-surface-secondary p-4 rounded-lg border border-theme-border">
            <h3 className="text-lg font-semibold text-theme-text-primary mb-2">Interactive Command Terminal</h3>
            <p className="text-sm text-theme-text-secondary mb-2">Commands executed: {commandCount}</p>
            <p className="text-xs text-theme-text-secondary">Try commands: help, clear, echo [text], date, history</p>
          </div>

          <CommandTerminal
            ref={terminalRef}
            className="flex-1"
            enableCommandInput={true}
            onCommandExecute={handleCommandExecute}
            onReady={handleReady}
          />
        </div>
      </ThemeWrapper>
    )
  },
}

/**
 * Command terminal with custom configuration.
 * Demonstrates various command input configuration options.
 */
export const CustomConfiguration: Story = {
  render: () => {
    const terminalRef = useRef<CommandTerminalHandle>(null)

    const handleCommandExecute = useCallback((command: string) => {
      if (!terminalRef.current) return

      terminalRef.current.addOutput('output', `Executed: ${command}`)
    }, [])

    const handleReady = useCallback(() => {
      if (!terminalRef.current) return

      terminalRef.current.addOutput('info', 'Custom configured terminal ready!')
      terminalRef.current.addOutput('info', 'Notice the custom prompt and configuration.')
    }, [])

    return (
      <ThemeWrapper>
        <div className="h-full">
          <CommandTerminal
            ref={terminalRef}
            className="h-full"
            commandConfig={{
              prompt: 'moo-dang> ',
              maxHistorySize: 50,
              enableTabCompletion: true,
            }}
            enableCommandInput={true}
            onCommandExecute={handleCommandExecute}
            onReady={handleReady}
          />
        </div>
      </ThemeWrapper>
    )
  },
}

/**
 * Command terminal demonstrating programmatic control.
 * Shows how to interact with the terminal imperatively.
 */
export const ProgrammaticControl: Story = {
  render: () => {
    const terminalRef = useRef<CommandTerminalHandle>(null)
    const [commandHistory, setCommandHistory] = useState<string[]>([])

    const executeCommand = useCallback((command: string) => {
      if (!terminalRef.current) return

      terminalRef.current.setCommand(command)
      terminalRef.current.executeCommand()
      setCommandHistory(prev => [...prev, command])
    }, [])

    const addOutput = useCallback((type: 'info' | 'output' | 'warning' | 'error', content: string) => {
      terminalRef.current?.addOutput(type, content)
    }, [])

    const clearTerminal = useCallback(() => {
      terminalRef.current?.clearOutput()
      setCommandHistory([])
    }, [])

    const clearHistory = useCallback(() => {
      terminalRef.current?.clearHistory()
      setCommandHistory([])
    }, [])

    const handleCommandExecute = useCallback(
      (command: string) => {
        setCommandHistory(prev => [...prev, command])
        addOutput('info', `User executed: ${command}`)
      },
      [addOutput],
    )

    return (
      <ThemeWrapper>
        <div className="h-full space-y-4">
          {/* Control Panel */}
          <div className="bg-theme-surface-secondary p-4 rounded-lg border border-theme-border">
            <h3 className="text-lg font-semibold text-theme-text-primary mb-4">Command Terminal Controls</h3>

            {/* Command Execution Buttons */}
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-theme-text-primary mb-2">Execute Commands:</p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => executeCommand('ls -la')}
                    className="px-3 py-2 bg-theme-primary-500 text-white rounded hover:bg-theme-primary-600 transition-colors text-sm"
                  >
                    ls -la
                  </button>
                  <button
                    onClick={() => executeCommand('pwd')}
                    className="px-3 py-2 bg-theme-primary-500 text-white rounded hover:bg-theme-primary-600 transition-colors text-sm"
                  >
                    pwd
                  </button>
                  <button
                    onClick={() => executeCommand('whoami')}
                    className="px-3 py-2 bg-theme-primary-500 text-white rounded hover:bg-theme-primary-600 transition-colors text-sm"
                  >
                    whoami
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-theme-text-primary mb-2">Add Output:</p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => addOutput('info', 'Informational message')}
                    className="px-3 py-2 bg-theme-info-500 text-white rounded hover:bg-theme-info-600 transition-colors text-sm"
                  >
                    Add Info
                  </button>
                  <button
                    onClick={() => addOutput('output', 'Operation completed successfully')}
                    className="px-3 py-2 bg-theme-success-500 text-white rounded hover:bg-theme-success-600 transition-colors text-sm"
                  >
                    Add Output
                  </button>
                  <button
                    onClick={() => addOutput('warning', 'Warning: Check configuration')}
                    className="px-3 py-2 bg-theme-warning-500 text-white rounded hover:bg-theme-warning-600 transition-colors text-sm"
                  >
                    Add Warning
                  </button>
                  <button
                    onClick={() => addOutput('error', 'Error: Command failed')}
                    className="px-3 py-2 bg-theme-error-500 text-white rounded hover:bg-theme-error-600 transition-colors text-sm"
                  >
                    Add Error
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-theme-text-primary mb-2">Terminal Control:</p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={clearTerminal}
                    className="px-3 py-2 bg-theme-error-500 text-white rounded hover:bg-theme-error-600 transition-colors text-sm"
                  >
                    Clear Terminal
                  </button>
                  <button
                    onClick={clearHistory}
                    className="px-3 py-2 bg-theme-warning-500 text-white rounded hover:bg-theme-warning-600 transition-colors text-sm"
                  >
                    Clear History
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-theme-border">
              <p className="text-sm text-theme-text-secondary">Commands executed: {commandHistory.length}</p>
              {commandHistory.length > 0 && (
                <p className="text-xs text-theme-text-secondary mt-1">Recent: {commandHistory.slice(-3).join(', ')}</p>
              )}
            </div>
          </div>

          {/* Terminal */}
          <CommandTerminal
            ref={terminalRef}
            className="flex-1"
            enableCommandInput={true}
            onCommandExecute={handleCommandExecute}
          />
        </div>
      </ThemeWrapper>
    )
  },
}

/**
 * Command terminal with disabled command input.
 * Shows the terminal functioning as a display-only interface.
 */
export const DisplayOnly: Story = {
  render: () => {
    const terminalRef = useRef<CommandTerminalHandle>(null)

    const handleReady = useCallback(() => {
      if (!terminalRef.current) return

      terminalRef.current.addOutput('info', 'Display-only terminal mode')
      terminalRef.current.addOutput('info', 'Command input is disabled')
      terminalRef.current.addOutput('output', 'System: Ready for output display')
      terminalRef.current.addOutput('warning', 'Warning: Interactive mode disabled')
    }, [])

    const addSampleOutput = useCallback(() => {
      if (!terminalRef.current) return

      const messages = [
        {type: 'info' as const, content: `[${new Date().toLocaleTimeString()}] System status: OK`},
        {type: 'output' as const, content: 'Process completed successfully'},
        {type: 'warning' as const, content: 'Disk usage at 80%'},
        {type: 'error' as const, content: 'Network timeout detected'},
      ]

      const randomMessage = messages[Math.floor(Math.random() * messages.length)]
      if (randomMessage) {
        terminalRef.current.addOutput(randomMessage.type, randomMessage.content)
      }
    }, [])

    return (
      <ThemeWrapper>
        <div className="h-full space-y-4">
          <div className="bg-theme-surface-secondary p-4 rounded-lg border border-theme-border">
            <h3 className="text-lg font-semibold text-theme-text-primary mb-4">Display-Only Terminal</h3>
            <p className="text-sm text-theme-text-secondary mb-4">
              Command input is disabled. This terminal only displays output.
            </p>
            <button
              onClick={addSampleOutput}
              className="px-3 py-2 bg-theme-primary-500 text-white rounded hover:bg-theme-primary-600 transition-colors"
            >
              Add Sample Output
            </button>
          </div>

          <CommandTerminal ref={terminalRef} className="flex-1" enableCommandInput={false} onReady={handleReady} />
        </div>
      </ThemeWrapper>
    )
  },
}
