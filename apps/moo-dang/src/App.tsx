import type {ReactElement} from 'react'
import {ThemeProvider} from '@sparkle/theme'
import {consola} from 'consola'
import {CommandTerminal} from './components'

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
  /**
   * Handles command execution from the terminal.
   * In Phase 3, this will be connected to the Web Worker shell environment.
   */
  const handleCommandExecute = (command: string) => {
    consola.info(`Command executed: "${command}"`)
    // TODO: In Phase 3, this will send commands to the Web Worker shell
    // For now, we just log the command execution
  }

  /**
   * Handles when the terminal is ready for interaction.
   */
  const handleTerminalReady = () => {
    consola.info('Terminal is ready for command input')
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
