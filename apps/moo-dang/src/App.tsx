import type {ReactElement} from 'react'
import {ThemeProvider} from '@sparkle/theme'

import {consola} from 'consola'
import {useCallback, useRef, useState} from 'react'

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

  const demonstrateSampleOutputs = useCallback((): void => {
    const terminal = terminalRef.current
    if (!terminal) return

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

  const handleCommandExecute = useCallback(
    (command: string): void => {
      command = command.trim()
      consola.info(`Command executed: "${command}"`)

      if (command === 'help' || command === '?') {
        setShowKeyboardHelp(true)
        return
      }

      if (command === 'demo') {
        demonstrateSampleOutputs()
        return
      }

      const terminal = terminalRef.current
      if (terminal) {
        terminal.addOutput('command', command)
        terminal.addOutput(
          'output',
          `Command "${command}" executed successfully.\nType "demo" to see output formatting examples.`,
        )
      }
    },
    [demonstrateSampleOutputs],
  )

  const handleTerminalReady = useCallback((): void => {
    consola.info('Terminal is ready for command input')

    const DEMO_DELAY_MS = 500
    const welcomeMessages = [
      {type: 'system' as const, content: 'Welcome to moo-dang shell!'},
      {type: 'info' as const, content: 'Terminal output rendering is now active'},
      {type: 'info' as const, content: 'Try typing "demo" to see output formatting examples'},
    ] as const

    setTimeout(() => {
      const terminal = terminalRef.current
      if (!terminal) return

      for (const {type, content} of welcomeMessages) {
        terminal.addOutput(type, content)
      }
    }, DEMO_DELAY_MS)
  }, [])

  return (
    <ThemeProvider defaultTheme="system">
      <AccessibilityProvider>
        <div className="min-h-screen bg-background flex flex-col">
          <header className="border-b p-4 flex-shrink-0">
            <h1 className="text-2xl font-bold text-foreground">moo-dang</h1>
            <p className="text-muted-foreground">WASM-based Web Shell</p>
          </header>
          <main className="flex-1 p-4 min-h-0">
            <div className="h-full relative">
              <ScreenReaderHelper
                terminalState="Terminal ready for input"
                currentCommand=""
                cursorPosition={0}
                isReady={true}
              />

              <CommandTerminal
                ref={terminalRef}
                initialText="Welcome to moo-dang shell!\r\nType commands below. Use ↑/↓ arrows for history.\r\n"
                onCommandExecute={handleCommandExecute}
                onReady={handleTerminalReady}
                className="h-full"
                commandConfig={{
                  prompt: '$ ',
                  maxHistorySize: 50,
                  allowDuplicates: false,
                }}
                options={{
                  fontSize: 14,
                  cursorBlink: true,
                  scrollback: 1000,
                }}
              />

              <KeyboardShortcutsHelp isVisible={showKeyboardHelp} onClose={() => setShowKeyboardHelp(false)} />
            </div>
          </main>
        </div>
      </AccessibilityProvider>
    </ThemeProvider>
  )
}

export default App
