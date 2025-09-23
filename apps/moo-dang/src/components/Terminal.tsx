import {cx, type HTMLProperties} from '@sparkle/ui'
import {FitAddon} from '@xterm/addon-fit'
import {Terminal as XTerm} from '@xterm/xterm'
import React, {useEffect, useRef, useState} from 'react'
import '@xterm/xterm/css/xterm.css'

const DEFAULT_TERMINAL_OPTIONS = {
  fontSize: 14,
  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
  cursorBlink: true,
  scrollback: 1000,
  allowProposedApi: true,
} as const

const DEFAULT_THEME_OPTIONS = {
  background: '#000000',
  foreground: '#ffffff',
  cursor: '#ffffff',
  selection: 'rgba(255, 255, 255, 0.3)',
} as const

/**
 * Creates a terminal-specific error with proper context and cause chaining.
 */
function createTerminalError(message: string, cause?: unknown): Error {
  const error = new Error(`Terminal error: ${message}`)
  error.name = 'TerminalError'
  error.cause = cause
  return error
}

/**
 * Write text to the terminal instance with error handling.
 */
export function writeToTerminal(terminal: XTerm, text: string): void {
  try {
    terminal.write(text)
  } catch (writeError) {
    throw createTerminalError(`Failed to write to terminal: ${writeError}`, writeError)
  }
}

/**
 * Clear the terminal screen with error handling.
 */
export function clearTerminal(terminal: XTerm): void {
  try {
    terminal.clear()
  } catch (clearError) {
    throw createTerminalError(`Failed to clear terminal: ${clearError}`, clearError)
  }
}

/**
 * Focus the terminal for keyboard input with error handling.
 */
export function focusTerminal(terminal: XTerm): void {
  try {
    terminal.focus()
  } catch (focusError) {
    throw createTerminalError(`Failed to focus terminal: ${focusError}`, focusError)
  }
}

export interface TerminalProps extends Omit<HTMLProperties<HTMLDivElement>, 'children'> {
  initialText?: string
  theme?: {
    background?: string
    foreground?: string
    cursor?: string
    selection?: string
  }
  options?: {
    fontSize?: number
    fontFamily?: string
    cursorBlink?: boolean
    scrollback?: number
    allowProposedApi?: boolean
  }
  onData?: (data: string) => void
  onResize?: (cols: number, rows: number) => void
  onReady?: (terminal: XTerm) => void
}

/**
 * Terminal component that integrates xterm.js with React and Sparkle UI patterns.
 *
 * Provides a full-featured terminal interface with theme integration, accessibility,
 * and error handling following Sparkle UI conventions.
 */
export const Terminal = React.forwardRef<HTMLDivElement, TerminalProps>((props, ref) => {
  const {className, initialText = '', theme = {}, options = {}, onData, onResize, onReady, ...rest} = props

  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mergedRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node
      if (typeof ref === 'function') {
        ref(node)
      } else if (ref != null) {
        ref.current = node
      }
    },
    [ref],
  )

  useEffect(() => {
    if (containerRef.current == null) return

    try {
      const terminalOptions = {
        ...DEFAULT_TERMINAL_OPTIONS,
        ...options,
        theme: {
          ...DEFAULT_THEME_OPTIONS,
          ...theme,
        },
      }

      const terminal = new XTerm(terminalOptions)
      terminalRef.current = terminal

      const fitAddon = new FitAddon()
      fitAddonRef.current = fitAddon
      terminal.loadAddon(fitAddon)

      terminal.open(containerRef.current)
      fitAddon.fit()

      if (initialText.length > 0) {
        terminal.write(initialText)
      }

      if (onData != null) {
        terminal.onData(onData)
      }

      if (onResize != null) {
        terminal.onResize((event: {cols: number; rows: number}) => {
          onResize(event.cols, event.rows)
        })
      }

      setIsReady(true)
      setError(null)

      if (onReady != null) {
        onReady(terminal)
      }
    } catch (initError) {
      const errorMessage = initError instanceof Error ? initError.message : 'Unknown initialization error'
      const terminalError = createTerminalError(`Failed to initialize terminal: ${errorMessage}`, initError)

      console.error('Terminal initialization failed:', terminalError)
      setError(terminalError.message)
      setIsReady(false)
    }

    return () => {
      try {
        if (terminalRef.current != null) {
          terminalRef.current.dispose()
          terminalRef.current = null
        }
        fitAddonRef.current = null
        setIsReady(false)
        setError(null)
      } catch (cleanupError) {
        console.warn('Terminal cleanup encountered an error:', cleanupError)
      }
    }
  }, [initialText, theme, options, onData, onResize, onReady])

  useEffect(() => {
    if (!isReady || fitAddonRef.current == null) return

    const handleResize = () => {
      try {
        fitAddonRef.current?.fit()
      } catch (resizeError) {
        console.warn('Terminal resize failed:', resizeError)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isReady])

  const containerClasses = cx(
    'terminal-container',
    'relative',
    'h-full',
    'w-full',
    'overflow-hidden',
    'rounded-md',
    'border',
    'bg-background',
    'focus-within:ring-2',
    'focus-within:ring-ring',
    'focus-within:ring-offset-2',
    error != null && 'border-destructive',
    className,
  )

  return (
    <div
      ref={mergedRef}
      className={containerClasses}
      role="terminal"
      aria-label="Terminal interface"
      aria-live="polite"
      aria-atomic="false"
      tabIndex={0}
      {...rest}
    >
      {error != null && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-destructive/10 p-4"
          role="alert"
          aria-live="assertive"
        >
          <div className="rounded-md border border-destructive bg-background p-4 text-center">
            <p className="text-sm font-medium text-destructive">Terminal Error</p>
            <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      )}

      {!isReady && error == null && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <div className="text-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Initializing terminal...</p>
          </div>
        </div>
      )}
    </div>
  )
})

Terminal.displayName = 'Terminal'
