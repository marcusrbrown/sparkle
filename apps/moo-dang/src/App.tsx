import type {ReactElement} from 'react'
import {ThemeProvider} from '@sparkle/theme'

import {consola} from 'consola'
import {useRef} from 'react'

import {CommandTerminal, type CommandTerminalHandle} from './components'

/**
 * Main application component for the moo-dang WASM web shell.
 *
 * This component provides the root layout and theme context for the entire
 * application. It integrates the CommandTerminal component to provide the main
 * shell interface with command input handling, history, and xterm.js integration.
 *
 * @returns The main application with theme provider and command terminal interface
 */
function App(): ReactElement {
  const terminalRef = useRef<CommandTerminalHandle>(null)

  /**
   * Demonstrates sample output types by adding various formatted outputs.
   */
  const demonstrateSampleOutputs = () => {
    const terminal = terminalRef.current
    if (!terminal) return

    // Add sample outputs demonstrating different types
    terminal.addOutput('command', 'ls -la')
    terminal.addOutput(
      'output',
      'total 42\ndrwxr-xr-x  3 user  staff   96 Sep 23 01:30 .\ndrwxr-xr-x  4 user  staff  128 Sep 23 01:29 ..\n-rw-r--r--  1 user  staff 1234 Sep 23 01:30 README.md',
    )

    terminal.addOutput('command', 'npm install nonexistent-package')
    terminal.addOutput('error', 'Package "nonexistent-package" not found in npm registry')

    terminal.addOutput('command', 'echo "Testing output formatting"')
    terminal.addOutput('output', 'Testing output formatting')

    terminal.addOutput('warning', 'This is a warning message about deprecated functionality')
    terminal.addOutput('info', 'System information: moo-dang shell v1.0.0')
    terminal.addOutput('system', 'Terminal output rendering demonstration complete')
  }

  /**
   * Handles command execution from the terminal.
   * In Phase 3, this will be connected to the Web Worker shell environment.
   */
  const handleCommandExecute = (command: string) => {
    consola.info(`Command executed: "${command}"`)

    // Demonstrate sample outputs for specific commands
    if (command.trim() === 'demo') {
      demonstrateSampleOutputs()
      return
    }

    // For other commands, show a placeholder response
    const terminal = terminalRef.current
    if (terminal) {
      terminal.addOutput('command', command)
      terminal.addOutput(
        'output',
        `Command "${command}" executed successfully.\nType "demo" to see output formatting examples.`,
      )
    }

    // TODO: In Phase 3, this will send commands to the Web Worker shell
  }

  /**
   * Handles when the terminal is ready for interaction.
   */
  const handleTerminalReady = () => {
    consola.info('Terminal is ready for command input')

    // Show initial demo outputs
    setTimeout(() => {
      const terminal = terminalRef.current
      if (terminal) {
        terminal.addOutput('system', 'Welcome to moo-dang shell!')
        terminal.addOutput('info', 'Terminal output rendering is now active')
        terminal.addOutput('info', 'Try typing "demo" to see output formatting examples')
      }
    }, 500)

    // TODO: In Phase 3, this will trigger shell environment initialization
  }

  return (
    <ThemeProvider defaultTheme="system">
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b p-4 flex-shrink-0">
          <h1 className="text-2xl font-bold text-foreground">moo-dang</h1>
          <p className="text-muted-foreground">WASM-based Web Shell</p>
        </header>
        <main className="flex-1 p-4 min-h-0">
          <div className="h-full">
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
          </div>
        </main>
      </div>
    </ThemeProvider>
  )
}

export default App
