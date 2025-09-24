import {useTheme} from '@sparkle/theme'
import {cx, type HTMLProperties} from '@sparkle/ui'
import {FitAddon} from '@xterm/addon-fit'
import {Terminal as XTerm} from '@xterm/xterm'
import {consola} from 'consola'
import React, {useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState} from 'react'
import {getTerminalFontFamily, getTerminalFontSize, sparkleToXTermTheme, type XTermTheme} from './theme-utils'
import '@xterm/xterm/css/xterm.css'

const DEFAULT_TERMINAL_OPTIONS = {
  fontSize: 14,
  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
  cursorBlink: true,
  scrollback: 1000,
  allowProposedApi: true,
} as const satisfies TerminalOptions

const DEFAULT_THEME_OPTIONS = {
  background: '#000000',
  foreground: '#ffffff',
  cursor: '#ffffff',
  selectionBackground: 'rgba(255, 255, 255, 0.3)',
} as const satisfies XTermTheme

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
 * Terminal-specific error interface with enhanced context and cause chaining.
 *
 * Provides structured error information for terminal operations,
 * enabling better debugging and error recovery.
 */
export interface TerminalError extends Error {
  readonly operation: string
  readonly cause?: unknown
}

/**
 * Creates a structured terminal error with enhanced context.
 *
 * Uses functional approach for better maintainability and consistency
 * with project coding standards.
 *
 * @param message - Descriptive error message
 * @param operation - Terminal operation that failed
 * @param cause - Original error that caused this failure
 * @returns Structured terminal error object
 */
export function createTerminalError(message: string, operation: string, cause?: unknown): TerminalError {
  const error = new Error(`Terminal ${operation}: ${message}`) as TerminalError
  error.name = 'TerminalError'

  Object.defineProperty(error, 'operation', {
    value: operation,
    writable: false,
    enumerable: true,
    configurable: false,
  })

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
 * Write text to the terminal instance with error handling.
 *
 * @param terminal - XTerm instance to write to
 * @param text - Text content to write
 * @throws {TerminalError} When write operation fails
 */
export function writeToTerminal(terminal: XTerm, text: string): void {
  try {
    terminal.write(text)
  } catch (writeError) {
    throw createTerminalError('Write operation failed', 'write', writeError)
  }
}

/**
 * Clear the terminal screen with error handling.
 *
 * @param terminal - XTerm instance to clear
 * @throws {TerminalError} When clear operation fails
 */
export function clearTerminal(terminal: XTerm): void {
  try {
    terminal.clear()
  } catch (clearError) {
    throw createTerminalError('Clear operation failed', 'clear', clearError)
  }
}

/**
 * Focus the terminal for keyboard input with error handling.
 *
 * @param terminal - XTerm instance to focus
 * @throws {TerminalError} When focus operation fails
 */
export function focusTerminal(terminal: XTerm): void {
  try {
    terminal.focus()
  } catch (focusError) {
    throw createTerminalError('Focus operation failed', 'focus', focusError)
  }
}

/**
 * Configuration options for terminal behavior and appearance.
 */
export interface TerminalOptions {
  /** Font size in pixels */
  fontSize?: number
  /** Font family string for terminal text */
  fontFamily?: string
  /** Whether cursor should blink */
  cursorBlink?: boolean
  /** Number of lines to keep in scrollback buffer */
  scrollback?: number
  /** Enable proposed API features (experimental) */
  allowProposedApi?: boolean
}

/**
 * Props for the Terminal component.
 *
 * Extends standard div props while excluding children since terminal
 * content is managed programmatically through xterm.js.
 */
export interface TerminalProps extends Omit<HTMLProperties<HTMLDivElement>, 'children'> {
  /** Initial text to display when terminal loads */
  initialText?: string
  /** Custom theme override (optional - uses Sparkle theme by default) */
  themeOverride?: XTermTheme
  /** Terminal configuration options */
  options?: TerminalOptions
  /** Callback fired when user types in terminal */
  onData?: (data: string) => void
  /** Callback fired when terminal dimensions change */
  onResize?: (cols: number, rows: number) => void
  /** Callback fired when terminal is ready for use */
  onReady?: (terminal: XTerm) => void
}

/**
 * Terminal component that integrates xterm.js with React and Sparkle UI patterns.
 *
 * Provides a full-featured terminal interface with theme integration, accessibility,
 * enhanced resize handling, and error handling following Sparkle UI conventions.
 */
export const Terminal = React.forwardRef<TerminalHandle, TerminalProps>((props, ref) => {
  const {className, initialText = '', themeOverride, options = {}, onData, onResize, onReady, ...rest} = props

  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const onDataDisposableRef = useRef<{dispose: () => void} | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get Sparkle theme context
  const {theme: sparkleTheme} = useTheme()

  // Memoize theme conversion to prevent unnecessary rerenders
  const xtermTheme = useMemo(() => {
    return themeOverride || sparkleToXTermTheme(sparkleTheme)
  }, [themeOverride, sparkleTheme])

  // Memoize font settings to prevent unnecessary rerenders
  const fontSettings = useMemo(
    () => ({
      fontFamily: options.fontFamily || getTerminalFontFamily(sparkleTheme),
      fontSize: options.fontSize || getTerminalFontSize(sparkleTheme),
    }),
    [options.fontFamily, options.fontSize, sparkleTheme],
  )

  /**
   * Safely performs terminal fit operation with comprehensive error handling.
   * Only performs fit if container has reasonable dimensions.
   */
  const performFit = useCallback(async (): Promise<void> => {
    if (!fitAddonRef.current || !terminalRef.current || !isReady || !containerRef.current) {
      return
    }

    const containerRect = containerRef.current.getBoundingClientRect()
    if (containerRect.width < 50 || containerRect.height < 20) {
      consola.warn('Skipping terminal fit: container dimensions too small', {
        width: containerRect.width,
        height: containerRect.height,
      })
      return
    }

    try {
      fitAddonRef.current.fit()
    } catch (fitError) {
      const errorMessage = fitError instanceof Error ? fitError.message : 'Unknown fit error'
      const terminalError = createTerminalError(errorMessage, 'fit', fitError)
      consola.warn('Terminal fit operation failed:', terminalError)
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

  // Store current callbacks in refs to avoid recreating terminal
  const onDataRef = useRef(onData)
  const onResizeRef = useRef(onResize)
  const onReadyRef = useRef(onReady)

  // Update refs when callbacks change
  useEffect(() => {
    onDataRef.current = onData
    onResizeRef.current = onResize
    onReadyRef.current = onReady
  }, [onData, onResize, onReady])

  // Memoize terminal options to prevent recreation
  const terminalOptions = useMemo(
    () => ({
      ...DEFAULT_TERMINAL_OPTIONS,
      ...options,
      fontFamily: fontSettings.fontFamily,
      fontSize: fontSettings.fontSize,
      theme: {
        ...DEFAULT_THEME_OPTIONS,
        ...xtermTheme,
      },
    }),
    [options, fontSettings.fontFamily, fontSettings.fontSize, xtermTheme],
  )

  // Separate effect for terminal initialization
  useEffect(() => {
    if (containerRef.current == null) return

    try {
      const terminal = new XTerm(terminalOptions)
      terminalRef.current = terminal

      const fitAddon = new FitAddon()
      fitAddonRef.current = fitAddon
      terminal.loadAddon(fitAddon)

      terminal.open(containerRef.current)

      // Ensure the terminal is properly sized after opening
      // Use multiple approaches for better reliability
      requestAnimationFrame(() => {
        if (fitAddonRef.current && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect()
          if (rect.width > 0 && rect.height > 0) {
            try {
              fitAddon.fit()
            } catch (fitError) {
              consola.warn('Initial terminal fit failed:', fitError)
            }
          }
        }
      })

      // Secondary fit attempt after a short delay to handle CSS loading
      setTimeout(() => {
        if (fitAddonRef.current && containerRef.current) {
          try {
            fitAddon.fit()
          } catch (fitError) {
            consola.warn('Secondary terminal fit failed:', fitError)
          }
        }
      }, 50)

      if (onDataRef.current) {
        onDataDisposableRef.current = terminal.onData((data: string) => {
          onDataRef.current?.(data)
        })
      }

      if (onResizeRef.current != null) {
        terminal.onResize((event: {cols: number; rows: number}) => {
          onResizeRef.current?.(event.cols, event.rows)
        })
      }

      setIsReady(true)
      setError(null)

      if (onReadyRef.current != null) {
        onReadyRef.current(terminal)
      }
    } catch (initError) {
      const errorMessage = initError instanceof Error ? initError.message : 'Unknown initialization error'
      const terminalError = createTerminalError(errorMessage, 'initialization', initError)

      consola.error('Terminal initialization failed:', terminalError)
      setError(terminalError.message)
      setIsReady(false)
    }

    return () => {
      try {
        // Dispose onData handler
        if (onDataDisposableRef.current) {
          onDataDisposableRef.current.dispose()
          onDataDisposableRef.current = null
        }

        if (terminalRef.current != null) {
          terminalRef.current.dispose()
          terminalRef.current = null
        }
        fitAddonRef.current = null
        setIsReady(false)
        setError(null)
      } catch (cleanupError) {
        consola.warn('Terminal cleanup encountered an error:', cleanupError)
      }
    }
  }, [terminalOptions])

  // Separate effect for writing initial text (only when terminal is ready)
  useEffect(() => {
    if (terminalRef.current && isReady && initialText.length > 0) {
      terminalRef.current.write(initialText)
    }
  }, [initialText, isReady])

  useEffect(() => {
    if (!isReady || !fitAddonRef.current || !containerRef.current) return

    let resizeTimeout: NodeJS.Timeout | null = null

    const handleResize = () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout)
      }

      resizeTimeout = setTimeout(() => {
        if (fitAddonRef.current && containerRef.current) {
          try {
            // Check if container has valid dimensions before attempting fit
            const rect = containerRef.current.getBoundingClientRect()
            if (rect.width > 0 && rect.height > 0) {
              fitAddonRef.current.fit()
            }
          } catch (fitError) {
            consola.warn('Terminal resize failed:', fitError)
          }
        }
      }, 100) // Debounce resize by 100ms
    }

    // Use ResizeObserver for more accurate container size changes
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(containerRef.current)

    // Also listen to window resize as fallback
    window.addEventListener('resize', handleResize)

    return () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout)
      }
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleResize)
    }
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
