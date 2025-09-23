import {cx, type HTMLProperties} from '@sparkle/ui'
import {FitAddon} from '@xterm/addon-fit'
import {Terminal as XTerm} from '@xterm/xterm'
import React, {useEffect, useRef, useState} from 'react'
import '@xterm/xterm/css/xterm.css'

export interface TerminalProps extends Omit<HTMLProperties<HTMLDivElement>, 'children'> {
  /**
   * Initial text to display when the terminal is opened
   */
  initialText?: string
  /**
   * Terminal theme options
   */
  theme?: {
    background?: string
    foreground?: string
    cursor?: string
    selection?: string
  }
  /**
   * Terminal configuration options
   */
  options?: {
    fontSize?: number
    fontFamily?: string
    cursorBlink?: boolean
    scrollback?: number
    allowProposedApi?: boolean
  }
  /**
   * Called when the terminal receives data input from the user
   */
  onData?: (data: string) => void
  /**
   * Called when the terminal size changes
   */
  onResize?: (cols: number, rows: number) => void
  /**
   * Called when the terminal is ready and fully initialized
   */
  onReady?: (terminal: XTerm) => void
}

/**
 * Custom error class for terminal initialization and operation failures.
 */
export class TerminalError extends Error {
  override readonly cause?: unknown

  constructor(message: string, cause?: unknown) {
    super(`Terminal error: ${message}`)
    this.name = 'TerminalError'
    this.cause = cause
  }
}

/**
 * Terminal component that integrates xterm.js with React and Sparkle UI patterns.
 *
 * This component provides a full-featured terminal interface using xterm.js,
 * with proper theme integration, accessibility features, and error handling.
 * It follows Sparkle UI conventions and React best practices.
 *
 * @example
 * ```tsx
 * <Terminal
 *   initialText="Welcome to moo-dang shell!\r\n$ "
 *   onData={(data) => console.log('User input:', data)}
 *   onReady={(terminal) => console.log('Terminal ready')}
 * />
 * ```
 */
export const Terminal = React.forwardRef<HTMLDivElement, TerminalProps>((props, ref) => {
  const {className, initialText = '', theme = {}, options = {}, onData, onResize, onReady, ...rest} = props

  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Merge refs if both external ref and internal ref are provided
  const mergedRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node
      if (typeof ref === 'function') {
        ref(node)
      } else if (ref) {
        ref.current = node
      }
    },
    [ref],
  )

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current) return

    try {
      // Default terminal options with theme integration
      const defaultOptions = {
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        cursorBlink: true,
        scrollback: 1000,
        allowProposedApi: true,
        theme: {
          background: '#000000',
          foreground: '#ffffff',
          cursor: '#ffffff',
          selection: 'rgba(255, 255, 255, 0.3)',
          ...theme,
        },
        ...options,
      }

      // Create terminal instance
      const terminal = new XTerm(defaultOptions)
      terminalRef.current = terminal

      // Create and load fit addon
      const fitAddon = new FitAddon()
      fitAddonRef.current = fitAddon
      terminal.loadAddon(fitAddon)

      // Open terminal in container
      terminal.open(containerRef.current)

      // Initial fit to container
      fitAddon.fit()

      // Write initial text if provided
      if (initialText) {
        terminal.write(initialText)
      }

      // Set up event handlers
      if (onData) {
        terminal.onData(onData)
      }

      if (onResize) {
        terminal.onResize(({cols, rows}) => {
          onResize(cols, rows)
        })
      }

      // Mark as ready and call ready callback
      setIsReady(true)
      setError(null)

      if (onReady) {
        onReady(terminal)
      }
    } catch (initError) {
      const errorMessage = initError instanceof Error ? initError.message : 'Unknown initialization error'
      const terminalError = new TerminalError(`Failed to initialize terminal: ${errorMessage}`, initError)

      console.error('Terminal initialization failed:', terminalError)
      setError(terminalError.message)
      setIsReady(false)
    }

    // Cleanup function
    return () => {
      try {
        if (terminalRef.current) {
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

  // Handle window resize events to fit terminal
  useEffect(() => {
    if (!isReady || !fitAddonRef.current) return

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

  // Base CSS classes for the terminal container
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
    error && 'border-destructive',
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
      {error && (
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

      {!isReady && !error && (
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

/**
 * Write text to the terminal instance.
 *
 * @param terminal - The terminal instance
 * @param text - Text to write to the terminal
 */
export function writeToTerminal(terminal: XTerm, text: string): void {
  try {
    terminal.write(text)
  } catch (writeError) {
    throw new TerminalError(`Failed to write to terminal: ${writeError}`, writeError)
  }
}

/**
 * Clear the terminal screen.
 *
 * @param terminal - The terminal instance
 */
export function clearTerminal(terminal: XTerm): void {
  try {
    terminal.clear()
  } catch (clearError) {
    throw new TerminalError(`Failed to clear terminal: ${clearError}`, clearError)
  }
}

/**
 * Focus the terminal for keyboard input.
 *
 * @param terminal - The terminal instance
 */
export function focusTerminal(terminal: XTerm): void {
  try {
    terminal.focus()
  } catch (focusError) {
    throw new TerminalError(`Failed to focus terminal: ${focusError}`, focusError)
  }
}
