import type {ReactElement} from 'react'
import {ThemeProvider} from '@sparkle/theme'

import {consola} from 'consola'
import {useCallback, useMemo, useRef, useState} from 'react'

import {
  AccessibilityProvider,
  CommandTerminal,
  KeyboardShortcutsHelp,
  ScreenReaderHelper,
  type CommandTerminalHandle,
} from './components'

/**
 * Main application component for the moo-dang WASM web shell.
 *
 * Provides the root layout and theme context for the terminal interface,
 * integrating accessibility features and command execution handling.
 */
function App(): ReactElement {
  const terminalRef = useRef<CommandTerminalHandle>(null)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  // Prevents duplicate terminal initialization in React StrictMode development
  const hasInitialized = useRef(false)

  // Memoize options to prevent recreation on every render
  const terminalOptions = useMemo(
    () => ({
      fontSize: 14,
      cursorBlink: true,
      scrollback: 1000,
    }),
    [],
  )

  // Memoize command config to prevent recreation on every render
  const commandConfig = useMemo(
    () => ({
      prompt: '$ ',
      maxHistorySize: 50,
      allowDuplicates: false,
    }),
    [],
  )

  // Memoize initial text to prevent terminal recreation
  const initialText = useMemo(
    () => 'Welcome to moo-dang shell!\r\nType commands below. Use ↑/↓ arrows for history.\r\n',
    [],
  )

  /**
   * Demonstrates various terminal output types for testing rendering.
   *
   * Displays sample commands, outputs, errors, warnings, and system messages
   * to showcase the terminal's formatting capabilities.
   */
  const demonstrateSampleOutputs = useCallback((): void => {
    const terminal = terminalRef.current
    if (terminal === null) return

    const demoOutputs = [
      {type: 'command' as const, content: 'ls -la'},
      {
        type: 'output' as const,
        content:
          'total 42\ndrwxr-xr-x  3 user  staff   96 Sep 23 01:30 .\ndrwxr-xr-x  4 user  staff  128 Sep 23 01:29 ..\n-rw-r--r--  1 user  staff 1234 Sep 23 01:30 README.md',
      },
      {type: 'command' as const, content: 'npm install nonexistent-package'},
      {type: 'error' as const, content: 'Package "nonexistent-package" not found in npm registry'},
      {type: 'command' as const, content: 'echo "Testing output formatting"'},
      {type: 'output' as const, content: 'Testing output formatting'},
      {type: 'warning' as const, content: 'This is a warning message about deprecated functionality'},
      {type: 'info' as const, content: 'System information: moo-dang shell v1.0.0'},
      {type: 'system' as const, content: 'Terminal output rendering demonstration complete'},
    ] as const

    for (const {type, content} of demoOutputs) {
      terminal.addOutput(type, content)
    }
  }, [])

  /**
   * Handles command execution from the terminal input.
   *
   * Processes special commands (help, demo) and provides generic output
   * for other commands. Includes duplicate execution prevention for help.
   *
   * @param command - The command string to execute
   */
  const handleCommandExecute = useCallback(
    (command: string): void => {
      command = command.trim()
      consola.info(`Command executed: "${command}"`)

      if (command === 'help' || command === '?') {
        // Prevent multiple rapid executions of help command
        if (showKeyboardHelp) {
          consola.debug('Help command ignored - modal already open')
          return
        }

        const terminal = terminalRef.current
        if (terminal !== null) {
          terminal.addOutput('command', command)
          terminal.addOutput('info', 'Opening keyboard shortcuts help...')
        }
        setShowKeyboardHelp(true)
        return
      }

      if (command === 'demo') {
        demonstrateSampleOutputs()
        return
      }

      const terminal = terminalRef.current
      if (terminal !== null) {
        terminal.addOutput('command', command)
        terminal.addOutput(
          'output',
          `Command "${command}" executed successfully.\nType "demo" to see output formatting examples.`,
        )
      }
    },
    [demonstrateSampleOutputs],
  )

  /**
   * Handles terminal ready event and displays welcome messages.
   *
   * Prevents duplicate initialization in React StrictMode by using a ref guard.
   * Displays welcome messages after a short delay to ensure terminal is ready.
   */
  const handleTerminalReady = useCallback((): void => {
    // React StrictMode intentionally double-invokes effects in development
    // This guard prevents duplicate welcome messages and console logs
    if (hasInitialized.current) {
      return
    }
    hasInitialized.current = true

    consola.info('Terminal is ready for command input')

    const DEMO_DELAY_MS = 500
    const welcomeMessages = [
      {type: 'system' as const, content: 'Welcome to moo-dang shell!'},
      {type: 'info' as const, content: 'Terminal output rendering is now active'},
      {type: 'info' as const, content: 'Try typing "demo" to see output formatting examples'},
    ] as const

    setTimeout(() => {
      const terminal = terminalRef.current
      if (terminal === null) return

      for (const {type, content} of welcomeMessages) {
        terminal.addOutput(type, content)
      }
    }, DEMO_DELAY_MS)
  }, [])

  return (
    <ThemeProvider defaultTheme="system">
      <AccessibilityProvider>
        <div style={{height: '100vh', display: 'flex', flexDirection: 'column'}}>
          <header style={{borderBottom: '1px solid #e5e7eb', padding: '1rem', textAlign: 'center'}}>
            <h1 className="text-2xl font-bold">moo-dang</h1>
            <p className="text-sm">WASM-based Web Shell</p>
          </header>
          <main style={{flex: '1', padding: '1rem'}}>
            <ScreenReaderHelper
              terminalState="Terminal ready for input"
              currentCommand=""
              cursorPosition={0}
              isReady={true}
            />

            <CommandTerminal
              ref={terminalRef}
              initialText={initialText}
              onCommandExecute={handleCommandExecute}
              onReady={handleTerminalReady}
              style={{height: '100%', width: '100%'}}
              commandConfig={commandConfig}
              options={terminalOptions}
            />

            <KeyboardShortcutsHelp isVisible={showKeyboardHelp} onClose={() => setShowKeyboardHelp(false)} />
          </main>
        </div>
      </AccessibilityProvider>
    </ThemeProvider>
  )
}

export default App
