import type {ReactElement} from 'react'
import {ThemeProvider} from '@sparkle/theme'

/**
 * Main application component for the moo-dang WASM web shell.
 *
 * This component provides the root layout and theme context for the entire
 * application. It serves as a placeholder during Phase 1 development and
 * will be enhanced with terminal interface components in future phases.
 *
 * @returns The main application with theme provider and basic layout
 */
function App(): ReactElement {
  return (
    <ThemeProvider defaultTheme="system">
      <div className="min-h-screen bg-background">
        <header className="border-b p-4">
          <h1 className="text-2xl font-bold text-foreground">moo-dang</h1>
          <p className="text-muted-foreground">WASM-based Web Shell</p>
        </header>
        <main className="p-4">
          <div className="rounded-lg border bg-card p-6">
            <p className="text-card-foreground">Terminal interface coming soon...</p>
          </div>
        </main>
      </div>
    </ThemeProvider>
  )
}

export default App
