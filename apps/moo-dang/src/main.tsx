import type {ReactElement} from 'react'
import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import App from './App.js'
import './index.css'

/**
 * Custom error class for application initialization failures.
 */
export class AppInitializationError extends Error {
  override readonly cause?: unknown

  constructor(message: string, cause?: unknown) {
    super(`Application initialization failed: ${message}`)
    this.name = 'AppInitializationError'
    this.cause = cause
  }
}

/**
 * Application entry point for the moo-dang WASM web shell.
 *
 * Sets up React root with StrictMode and renders the main App component.
 * Includes proper error handling for missing DOM elements.
 */
function initializeApp(): void {
  try {
    const rootElement = document.querySelector('#root')
    if (!rootElement) {
      throw new AppInitializationError('Root element not found - ensure the HTML contains <div id="root"></div>')
    }

    const root = createRoot(rootElement)
    const appElement: ReactElement = (
      <StrictMode>
        <App />
      </StrictMode>
    )

    root.render(appElement)
  } catch (error) {
    console.error('Failed to initialize application:', error)
    throw error
  }
}

// Initialize the application
initializeApp()
