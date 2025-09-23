import {cx, type HTMLProperties} from '@sparkle/ui'
import {FitAddon} from '@xterm/addon-fit'
import {Terminal as XTerm} from '@xterm/xterm'
import React, {useCallback, useEffect, useImperativeHandle, useRef, useState} from 'react'
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
 * Imperative handle interface for Terminal component.
 * Provides programmatic access to terminal operations.
 */
export interface TerminalHandle {
  /** Get the underlying XTerm instance */
  getTerminal: () => XTerm | null
  /** Manually trigger terminal resize to fit container */
  fitToContainer: () => Promise<void>
  /** Write text to the terminal */
  write: (text: string) => void
  /** Clear the terminal screen */
  clear: () => void
  /** Focus the terminal for keyboard input */
  focus: () => void
}

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
 * enhanced resize handling, and error handling following Sparkle UI conventions.
 */
export const Terminal = React.forwardRef<TerminalHandle, TerminalProps>((props, ref) => {
  const {className, initialText = '', theme = {}, options = {}, onData, onResize, onReady, ...rest} = props

  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounce resize operations to prevent excessive calls
  // REMOVED - simplified approach

  /**
   * Safely performs terminal fit operation with comprehensive error handling.
   * Only performs fit if container has reasonable dimensions.
   */
  const performFit = useCallback(async (): Promise<void> => {
    if (!fitAddonRef.current || !terminalRef.current || !isReady || !containerRef.current) {
      return
    }

    // Check if container has reasonable dimensions before fitting
    const containerRect = containerRef.current.getBoundingClientRect()
    if (containerRect.width < 50 || containerRect.height < 20) {
      // Container is too small or not yet properly sized - skip this fit
      console.warn('Skipping terminal fit: container dimensions too small', {
        width: containerRect.width,
        height: containerRect.height,
      })
      return
    }

    try {
      fitAddonRef.current.fit()
    } catch (fitError) {
      const errorMessage = fitError instanceof Error ? fitError.message : 'Unknown fit error'
      const terminalError = createTerminalError(`Failed to fit terminal to container: ${errorMessage}`, fitError)
      console.warn('Terminal fit operation failed:', terminalError)
      throw terminalError
    }
  }, [isReady])

  // Set up imperative handle for programmatic control
  useImperativeHandle(
    ref,
    (): TerminalHandle => ({
      getTerminal: () => terminalRef.current,
      fitToContainer: performFit,
      write: (text: string) => {
        if (terminalRef.current) {
          writeToTerminal(terminalRef.current, text)
        }
      },
      clear: () => {
        if (terminalRef.current) {
          clearTerminal(terminalRef.current)
        }
      },
      focus: () => {
        if (terminalRef.current) {
          focusTerminal(terminalRef.current)
        }
      },
    }),
    [performFit],
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

      // Wait for next frame to ensure layout is complete before fitting
      requestAnimationFrame(() => {
        if (fitAddonRef.current) {
          fitAddon.fit()
        }
      })

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

  // Simple window resize handling
  useEffect(() => {
    if (!isReady || !fitAddonRef.current) return

    const handleWindowResize = () => {
      if (fitAddonRef.current) {
        // Use requestAnimationFrame to ensure resize happens after layout
        requestAnimationFrame(() => {
          if (fitAddonRef.current) {
            try {
              fitAddonRef.current.fit()
            } catch (fitError) {
              console.warn('Terminal resize failed:', fitError)
            }
          }
        })
      }
    }

    window.addEventListener('resize', handleWindowResize)
    return () => window.removeEventListener('resize', handleWindowResize)
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
      ref={containerRef}
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
