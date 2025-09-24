import type {ReactElement} from 'react'
import {consola} from 'consola'
import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import App from './App.js'
import './index.css'

/**
 * Application initialization error with enhanced context.
 */
export interface AppInitializationError extends Error {
  readonly cause?: unknown
}

/**
 * Creates a structured application initialization error.
 *
 * Uses functional approach for better maintainability and consistency
 * with project coding standards that favor functions over ES6 classes.
 */
export function createAppInitializationError(message: string, cause?: unknown): AppInitializationError {
  const error = new Error(`Application initialization failed: ${message}`) as AppInitializationError
  error.name = 'AppInitializationError'

  if (cause !== undefined) {
    Object.defineProperty(error, 'cause', {
      value: cause,
      writable: false,
      enumerable: true,
      configurable: false,
    })
  }

  return error
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
      throw createAppInitializationError('Root element not found - ensure the HTML contains <div id="root"></div>')
    }

    const root = createRoot(rootElement)
    const appElement: ReactElement = (
      <StrictMode>
        <App />
      </StrictMode>
    )

    root.render(appElement)
  } catch (error) {
    consola.error('Failed to initialize application:', error)
    throw error
  }
}

// Initialize the application
initializeApp()
