import {ThemeProvider} from '@sparkle/theme'

function App() {
  return (
    <ThemeProvider defaultTheme="light">
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
