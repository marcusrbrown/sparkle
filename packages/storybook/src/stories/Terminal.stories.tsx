import type {TerminalHandle} from '@moo-dang/components/Terminal'
import type {Meta, StoryObj} from '@storybook/react-vite'

import {Terminal} from '@moo-dang/components/Terminal'
import {ThemeProvider, useTheme} from '@sparkle/theme'
import {consola} from 'consola'
import React, {useCallback, useRef, useState} from 'react'

/**
 * Terminal component that integrates xterm.js with React and Sparkle UI patterns.
 *
 * ## Features
 * - **xterm.js Integration**: Full-featured terminal emulation with modern web standards
 * - **Theme Integration**: Fully integrated with @sparkle/theme system supporting light/dark modes
 * - **Accessibility**: WCAG 2.1 AA compliant with proper ARIA labels and keyboard navigation
 * - **Resize Handling**: Automatic fitting to container with ResizeObserver and debounced updates
 * - **Error Handling**: Comprehensive error boundaries with user-friendly error states
 * - **Loading States**: Proper loading indicators during terminal initialization
 *
 * ## Design Tokens
 * Uses theme tokens from the Sparkle theme system:
 * - Terminal background, foreground, and cursor colors from theme
 * - Font family and size from theme typography settings
 * - Border and focus ring colors matching Sparkle UI patterns
 *
 * ## Basic Usage
 * ```tsx
 * <Terminal
 *   initialText="Welcome to the terminal!\r\n$ "
 *   onData={(data) => console.log('User typed:', data)}
 *   onReady={(terminal) => console.log('Terminal ready')}
 * />
 * ```
 *
 * ## With Custom Theme
 * ```tsx
 * <Terminal
 *   themeOverride={{
 *     background: '#000000',
 *     foreground: '#00ff00',
 *     cursor: '#ffffff'
 *   }}
 * />
 * ```
 *
 * ## Programmatic Control
 * ```tsx
 * const terminalRef = useRef<TerminalHandle>(null);
 *
 * // Write to terminal
 * terminalRef.current?.write('Hello World!\r\n');
 *
 * // Clear terminal
 * terminalRef.current?.clear();
 * ```
 */
const meta = {
  title: 'Apps/moo-dang/Terminal',
  component: Terminal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Full-featured terminal component with xterm.js integration and theme support.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    initialText: {
      control: 'text',
      description: 'Initial text to display when terminal loads',
      defaultValue: 'Welcome to moo-dang terminal!\r\n$ ',
    },
    onData: {
      action: 'data-received',
      description: 'Callback fired when user types in terminal',
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
} satisfies Meta<typeof Terminal>

export default meta
type Story = StoryObj<typeof meta>

interface ThemeOption {
  readonly value: 'light' | 'dark' | 'system'
  readonly label: string
  readonly icon: string
}

/**
 * Theme switcher component that allows users to test terminal appearance across themes.
 *
 * Provides visual theme switching controls to demonstrate how the terminal
 * component adapts to different color schemes and accessibility modes.
 */
function ThemeSwitcher(): React.JSX.Element {
  const {activeTheme, setTheme, systemTheme} = useTheme()

  const themes: readonly ThemeOption[] = [
    {value: 'light', label: 'Light', icon: '☀️'},
    {value: 'dark', label: 'Dark', icon: '🌙'},
    {value: 'system', label: `System (${systemTheme})`, icon: '⚙️'},
  ] as const

  const handleThemeChange = useCallback(
    (themeValue: ThemeOption['value']) => {
      try {
        setTheme(themeValue)
        consola.debug(`Theme switched to: ${themeValue}`)
      } catch (error) {
        consola.error('Failed to switch theme:', error)
      }
    },
    [setTheme],
  )

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="flex gap-2 p-2 bg-theme-surface-primary border border-theme-border rounded-lg shadow-lg">
        <span className="text-theme-text-secondary text-sm font-medium">Theme:</span>
        {themes.map(theme => (
          <button
            key={theme.value}
            onClick={() => handleThemeChange(theme.value)}
            className={`
              px-3 py-1 text-xs rounded transition-colors
              ${
                activeTheme === theme.value
                  ? 'bg-theme-primary-500 text-white'
                  : 'bg-theme-surface-secondary text-theme-text-primary hover:bg-theme-surface-hover'
              }
            `}
            aria-label={`Switch to ${theme.label} theme`}
            type="button"
          >
            {theme.icon} {theme.label}
          </button>
        ))}
      </div>
    </div>
  )
}

interface ThemeWrapperProps {
  readonly children: React.ReactNode
}

/**
 * Theme-aware wrapper that provides consistent theming context for stories.
 *
 * Ensures all terminal stories have access to the Sparkle theme system
 * and renders theme switching controls for testing different color schemes.
 */
function ThemeWrapper({children}: ThemeWrapperProps): React.JSX.Element {
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
 * Default terminal showcasing basic functionality.
 * Demonstrates the standard terminal configuration with welcome message.
 */
export const Default: Story = {
  render: args => (
    <ThemeWrapper>
      <div className="h-full">
        <Terminal {...args} initialText="Welcome to moo-dang terminal!\r\n$ " className="h-full" />
      </div>
    </ThemeWrapper>
  ),
}

/**
 * Interactive terminal that responds to user input.
 * Demonstrates basic shell-like behavior with echo functionality.
 */
export const Interactive: Story = {
  render: () => {
    const terminalRef = useRef<TerminalHandle>(null)
    const [currentLine, setCurrentLine] = useState('')

    const handleData = useCallback(
      (data: string): void => {
        const terminal = terminalRef.current
        if (terminal == null) {
          consola.warn('Terminal not ready for input')
          return
        }

        try {
          if (data === '\r' || data === '\n') {
            // Execute current command and reset line
            terminal.write('\r\n')
            if (currentLine.trim().length > 0) {
              terminal.write(`Echo: ${currentLine.trim()}\r\n`)
            }
            terminal.write('$ ')
            setCurrentLine('')
          } else if (data === '\u007F' || data === '\b') {
            // Handle backspace only if there's content to delete
            if (currentLine.length > 0) {
              terminal.write('\b \b')
              setCurrentLine(prev => prev.slice(0, -1))
            }
          } else if (data >= ' ' || data === '\t') {
            // Accept printable characters and tabs
            terminal.write(data)
            setCurrentLine(prev => prev + data)
          }
        } catch (error) {
          consola.error('Error handling terminal input:', error)
        }
      },
      [currentLine],
    )

    const handleReady = useCallback((terminal: unknown): void => {
      try {
        const term = terminal as {write: (data: string) => void}
        term.write('Interactive Terminal Demo\r\n')
        term.write('Type commands and press Enter to see them echoed back.\r\n')
        term.write('$ ')
      } catch (error) {
        consola.error('Error initializing interactive terminal:', error)
      }
    }, [])

    return (
      <ThemeWrapper>
        <div className="h-full">
          <Terminal ref={terminalRef} className="h-full" onData={handleData} onReady={handleReady} />
        </div>
      </ThemeWrapper>
    )
  },
}

/**
 * Terminal with custom theme override.
 * Demonstrates theme customization capabilities.
 */
export const CustomTheme: Story = {
  render: args => (
    <ThemeWrapper>
      <div className="h-full">
        <Terminal
          {...args}
          themeOverride={{
            background: '#0d1117',
            foreground: '#58a6ff',
            cursor: '#58a6ff',
            cursorAccent: '#0d1117',
            selectionBackground: 'rgba(88, 166, 255, 0.3)',
            black: '#484f58',
            red: '#ff7b72',
            green: '#7ee787',
            yellow: '#f2cc60',
            blue: '#58a6ff',
            magenta: '#bc8cff',
            cyan: '#39c5cf',
            white: '#b1bac4',
            brightBlack: '#6e7681',
            brightRed: '#ffa198',
            brightGreen: '#56d364',
            brightYellow: '#e3b341',
            brightBlue: '#79c0ff',
            brightMagenta: '#d2a8ff',
            brightCyan: '#56d4dd',
            brightWhite: '#f0f6fc',
          }}
          initialText="GitHub Dark Theme Terminal\r\n$ "
          className="h-full"
        />
      </div>
    </ThemeWrapper>
  ),
}

/**
 * Terminal with different size configurations.
 * Demonstrates various terminal sizing and font options.
 */
export const SizeVariants: Story = {
  render: () => (
    <ThemeWrapper>
      <div className="space-y-6 h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-theme-text-primary mb-2">Terminal Size Variants</h2>
          <p className="text-theme-text-secondary">Different font sizes and configurations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-5/6">
          {/* Small Terminal */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-theme-text-primary">Small (12px)</h3>
            <Terminal options={{fontSize: 12}} initialText="Small terminal\r\n$ " className="h-full border" />
          </div>

          {/* Medium Terminal */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-theme-text-primary">Medium (14px)</h3>
            <Terminal options={{fontSize: 14}} initialText="Medium terminal\r\n$ " className="h-full border" />
          </div>

          {/* Large Terminal */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-theme-text-primary">Large (16px)</h3>
            <Terminal options={{fontSize: 16}} initialText="Large terminal\r\n$ " className="h-full border" />
          </div>
        </div>
      </div>
    </ThemeWrapper>
  ),
}

/**
 * Terminal demonstrating programmatic control.
 * Shows how to interact with the terminal imperatively.
 */
export const ProgrammaticControl: Story = {
  render: () => {
    const terminalRef = useRef<TerminalHandle>(null)
    const [commandHistory, setCommandHistory] = useState<readonly string[]>([])

    const writeCommand = useCallback((command: string): void => {
      const terminal = terminalRef.current
      if (terminal == null) {
        consola.warn('Cannot write command: terminal not initialized')
        return
      }

      try {
        terminal.write(`${command}\r\n`)
        setCommandHistory(prev => [...prev, command])
        consola.debug(`Command written: ${command}`)
      } catch (error) {
        consola.error('Failed to write command to terminal:', error)
      }
    }, [])

    const clearTerminal = useCallback((): void => {
      const terminal = terminalRef.current
      if (terminal == null) {
        consola.warn('Cannot clear: terminal not initialized')
        return
      }

      try {
        terminal.clear()
        setCommandHistory([])
        consola.debug('Terminal cleared')
      } catch (error) {
        consola.error('Failed to clear terminal:', error)
      }
    }, [])

    const handleReady = useCallback((): void => {
      writeCommand('Terminal ready for programmatic control!')
      writeCommand('Use the buttons below to interact with the terminal.')
    }, [writeCommand])

    return (
      <ThemeWrapper>
        <div className="h-full space-y-4">
          {/* Control Panel */}
          <div className="bg-theme-surface-secondary p-4 rounded-lg border border-theme-border">
            <h3 className="text-lg font-semibold text-theme-text-primary mb-4">Terminal Controls</h3>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => writeCommand('Hello from button click!')}
                className="px-3 py-2 bg-theme-primary-500 text-white rounded hover:bg-theme-primary-600 transition-colors"
              >
                Write Message
              </button>
              <button
                onClick={() => writeCommand(new Date().toISOString())}
                className="px-3 py-2 bg-theme-success-500 text-white rounded hover:bg-theme-success-600 transition-colors"
              >
                Write Timestamp
              </button>
              <button
                onClick={() => writeCommand('─'.repeat(50))}
                className="px-3 py-2 bg-theme-warning-500 text-white rounded hover:bg-theme-warning-600 transition-colors"
              >
                Write Divider
              </button>
              <button
                onClick={clearTerminal}
                className="px-3 py-2 bg-theme-error-500 text-white rounded hover:bg-theme-error-600 transition-colors"
              >
                Clear Terminal
              </button>
            </div>
            <div className="mt-4">
              <p className="text-sm text-theme-text-secondary">Commands sent: {commandHistory.length}</p>
            </div>
          </div>

          {/* Terminal */}
          <Terminal ref={terminalRef} className="flex-1" onReady={handleReady} />
        </div>
      </ThemeWrapper>
    )
  },
}

/**
 * Terminal with loading and error states.
 * Demonstrates various terminal states for testing UI behavior.
 */
export const StateDemo: Story = {
  render: () => {
    const [showError, setShowError] = useState(false)
    const [showLoading, setShowLoading] = useState(false)

    return (
      <ThemeWrapper>
        <div className="h-full space-y-4">
          <div className="bg-theme-surface-secondary p-4 rounded-lg border border-theme-border">
            <h3 className="text-lg font-semibold text-theme-text-primary mb-4">Terminal State Demo</h3>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowError(false)
                  setShowLoading(true)
                  setTimeout(() => setShowLoading(false), 3000)
                }}
                className="px-3 py-2 bg-theme-primary-500 text-white rounded hover:bg-theme-primary-600 transition-colors"
              >
                Simulate Loading
              </button>
              <button
                onClick={() => setShowError(true)}
                className="px-3 py-2 bg-theme-error-500 text-white rounded hover:bg-theme-error-600 transition-colors"
              >
                Simulate Error
              </button>
              <button
                onClick={() => {
                  setShowError(false)
                  setShowLoading(false)
                }}
                className="px-3 py-2 bg-theme-success-500 text-white rounded hover:bg-theme-success-600 transition-colors"
              >
                Reset to Normal
              </button>
            </div>
          </div>

          <div className="flex-1">
            {showLoading ? (
              <div className="h-full border rounded-md bg-background relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                  <div className="text-center">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Initializing terminal...</p>
                  </div>
                </div>
              </div>
            ) : showError ? (
              <div className="h-full border border-destructive rounded-md bg-background relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 p-4">
                  <div className="rounded-md border border-destructive bg-background p-4 text-center">
                    <p className="text-sm font-medium text-destructive">Terminal Error</p>
                    <p className="mt-1 text-xs text-muted-foreground">Failed to initialize xterm.js instance</p>
                  </div>
                </div>
              </div>
            ) : (
              <Terminal
                initialText="Terminal ready! Use buttons above to test different states.\r\n$ "
                className="h-full"
              />
            )}
          </div>
        </div>
      </ThemeWrapper>
    )
  },
}
