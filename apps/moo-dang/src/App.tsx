import type {ReactElement} from 'react'
import {ThemeProvider} from '@sparkle/theme'
import {Terminal} from './components'

/**
 * Main application component for the moo-dang WASM web shell.
 *
 * This component provides the root layout and theme context for the entire
 * application. It integrates the Terminal component to provide the main
 * shell interface with xterm.js integration.
 *
 * @returns The main application with theme provider and terminal interface
 */
function App(): ReactElement {
  const handleTerminalData = (_data: string) => {
    // TODO: In Phase 3, this will be connected to the Web Worker shell
    // For now, we simply accept the input without processing
  }

  const handleTerminalReady = () => {
    // Terminal is ready for interaction
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
            <Terminal
              initialText="Welcome to moo-dang shell!\r\nTerminal interface is ready. Shell environment coming in Phase 3...\r\n$ "
              onData={handleTerminalData}
              onReady={handleTerminalReady}
              className="h-full"
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
