/**
 * Accessibility utilities and screen reader support for terminal components.
 *
 * Provides comprehensive accessibility features including ARIA live regions,
 * screen reader announcements, focus management, and enhanced keyboard navigation.
 */

import {cx} from '@sparkle/ui'
import {consola} from 'consola'
import React, {useCallback, useEffect, useRef, useState} from 'react'

export interface AccessibilityConfig {
  readonly enableAnnouncements: boolean
  readonly enableKeyboardHelp: boolean
  readonly enableFocusManagement: boolean
  readonly announcementPriority: 'polite' | 'assertive'
  readonly debounceDelay: number
}

export const DEFAULT_ACCESSIBILITY_CONFIG: AccessibilityConfig = {
  enableAnnouncements: true,
  enableKeyboardHelp: true,
  enableFocusManagement: true,
  announcementPriority: 'polite',
  debounceDelay: 150,
} as const

export interface AccessibilityStatus {
  readonly screenReaderActive: boolean
  readonly currentFocus: string | null
  readonly lastAnnouncement: string | null
  readonly prefersHighContrast: boolean
  readonly prefersReducedMotion: boolean
}

/**
 * Hook for managing terminal accessibility features.
 *
 * Provides debounced screen reader announcements and user preference detection.
 */
export function useTerminalAccessibility(config: Partial<AccessibilityConfig> = {}): {
  status: AccessibilityStatus
  announce: (message: string, priority?: 'polite' | 'assertive') => void
  updateFocus: (elementDescription: string) => void
  announceCommand: (command: string, result?: 'success' | 'error' | 'pending') => void
  announceHistoryNavigation: (direction: 'previous' | 'next', command: string, position: number, total: number) => void
  announceCursorPosition: (position: number, total: number, character?: string) => void
  detectScreenReader: () => boolean
} {
  const mergedConfig = {...DEFAULT_ACCESSIBILITY_CONFIG, ...config}
  const [status, setStatus] = useState<AccessibilityStatus>({
    screenReaderActive: false,
    currentFocus: null,
    lastAnnouncement: null,
    prefersHighContrast: false,
    prefersReducedMotion: false,
  })

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastAnnouncementRef = useRef<string>('')

  const announce = useCallback(
    (message: string, priority: 'polite' | 'assertive' = mergedConfig.announcementPriority): void => {
      if (!mergedConfig.enableAnnouncements) return

      // Debounce rapid announcements
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current)
      }

      debounceTimerRef.current = setTimeout(() => {
        // Skip if same message was just announced
        if (lastAnnouncementRef.current === message) return

        lastAnnouncementRef.current = message

        let liveRegion = document.querySelector('#terminal-accessibility-announcements') as HTMLDivElement | null

        if (liveRegion === null) {
          liveRegion = document.createElement('div')
          liveRegion.id = 'terminal-accessibility-announcements'
          liveRegion.setAttribute('aria-live', priority)
          liveRegion.setAttribute('aria-atomic', 'true')
          liveRegion.setAttribute('role', priority === 'assertive' ? 'alert' : 'status')

          // Visually hidden but accessible to screen readers
          liveRegion.style.cssText = `
            position: absolute !important;
            width: 1px !important;
            height: 1px !important;
            padding: 0 !important;
            margin: -1px !important;
            overflow: hidden !important;
            clip: rect(0, 0, 0, 0) !important;
            white-space: nowrap !important;
            border: 0 !important;
          `

          document.body.append(liveRegion)
        } else {
          liveRegion.setAttribute('aria-live', priority)
          liveRegion.setAttribute('role', priority === 'assertive' ? 'alert' : 'status')
        }

        // Update message
        liveRegion.textContent = message

        setStatus(prev => ({...prev, lastAnnouncement: message}))
        consola.debug('Accessibility announcement:', {message, priority})
      }, mergedConfig.debounceDelay)
    },
    [mergedConfig.enableAnnouncements, mergedConfig.announcementPriority, mergedConfig.debounceDelay],
  )

  /**
   * Detects if a screen reader or other assistive technology is likely active.
   */
  const detectScreenReader = useCallback(() => {
    // Various heuristics to detect screen reader usage
    const hasAriaLiveSupport = 'ariaLive' in document.createElement('div')
    const hasAccessibilityAPI =
      navigator.userAgent !== undefined &&
      (navigator.userAgent.includes('NVDA') ||
        navigator.userAgent.includes('JAWS') ||
        navigator.userAgent.includes('VoiceOver'))

    // Check for accessibility-focused event listeners
    const hasA11yEventListeners = document.querySelector('[aria-live]') !== null

    const screenReaderActive = hasAriaLiveSupport || hasAccessibilityAPI || hasA11yEventListeners

    setStatus(prev => ({...prev, screenReaderActive}))
    return screenReaderActive
  }, [])

  /**
   * Updates focus tracking for accessibility.
   */
  const updateFocus = useCallback(
    (elementDescription: string) => {
      if (!mergedConfig.enableFocusManagement) return

      setStatus(prev => ({...prev, currentFocus: elementDescription}))
      announce(`Focus moved to ${elementDescription}`, 'polite')
    },
    [announce, mergedConfig.enableFocusManagement],
  )

  /**
   * Announces command execution with context.
   */
  const announceCommand = useCallback(
    (command: string, result?: 'success' | 'error' | 'pending') => {
      if (command.trim().length === 0) return

      let message = `Command executed: ${command}`
      if (result === 'success') {
        message += ' - completed successfully'
      } else if (result === 'error') {
        message += ' - completed with errors'
      } else if (result === 'pending') {
        message += ' - executing'
      }

      announce(message, result === 'error' ? 'assertive' : 'polite')
    },
    [announce],
  )

  /**
   * Announces navigation changes in command history.
   */
  const announceHistoryNavigation = useCallback(
    (direction: 'previous' | 'next', command: string, position: number, total: number) => {
      const message = `${direction} command: ${command} (${position} of ${total})`
      announce(message, 'polite')
    },
    [announce],
  )

  /**
   * Announces cursor position changes for screen readers.
   */
  const announceCursorPosition = useCallback(
    (position: number, total: number, character?: string) => {
      let message = `Cursor at position ${position} of ${total}`
      if (character != null && character.length > 0) {
        message += `, character: ${character}`
      }
      announce(message, 'polite')
    },
    [announce],
  )

  // Detect user preferences on mount
  useEffect(() => {
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    setStatus(prev => ({
      ...prev,
      prefersHighContrast,
      prefersReducedMotion,
    }))

    detectScreenReader()

    // Set up media query listeners for preference changes
    const contrastMedia = window.matchMedia('(prefers-contrast: high)')
    const motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)')

    const handleContrastChange = (e: MediaQueryListEvent) => {
      setStatus(prev => ({...prev, prefersHighContrast: e.matches}))
    }

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setStatus(prev => ({...prev, prefersReducedMotion: e.matches}))
    }

    contrastMedia.addEventListener('change', handleContrastChange)
    motionMedia.addEventListener('change', handleMotionChange)

    return () => {
      contrastMedia.removeEventListener('change', handleContrastChange)
      motionMedia.removeEventListener('change', handleMotionChange)

      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [detectScreenReader])

  return {
    status,
    announce,
    updateFocus,
    announceCommand,
    announceHistoryNavigation,
    announceCursorPosition,
    detectScreenReader,
  }
}

/**
 * Props for the AccessibilityProvider component.
 */
export interface AccessibilityProviderProps {
  children: React.ReactNode
  config?: Partial<AccessibilityConfig>
}

/**
 * Context for accessibility features.
 */
export const AccessibilityContext = React.createContext<ReturnType<typeof useTerminalAccessibility> | null>(null)

/**
 * Provider component for terminal accessibility features.
 */
export function AccessibilityProvider({children, config}: AccessibilityProviderProps): React.ReactElement {
  const accessibility = useTerminalAccessibility(config)

  return <AccessibilityContext.Provider value={accessibility}>{children}</AccessibilityContext.Provider>
}

/**
 * Hook to access the accessibility context.
 */
export function useAccessibility(): ReturnType<typeof useTerminalAccessibility> {
  const context = React.useContext(AccessibilityContext)
  if (context === null) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider')
  }
  return context
}

/**
 * Props for the ScreenReaderHelper component.
 */
export interface ScreenReaderHelperProps {
  /** Current terminal state description */
  terminalState?: string
  /** Current command being typed */
  currentCommand?: string
  /** Current cursor position */
  cursorPosition?: number
  /** Whether the terminal is ready for input */
  isReady?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Screen reader helper component that provides hidden content for assistive technologies.
 */
export function ScreenReaderHelper({
  terminalState = 'Terminal ready',
  currentCommand = '',
  cursorPosition = 0,
  isReady = true,
  className,
}: ScreenReaderHelperProps): React.ReactElement {
  const statusText = isReady
    ? `${terminalState}. Current command: ${currentCommand || 'empty'}. Cursor at position ${cursorPosition}.`
    : 'Terminal loading...'

  return (
    <div
      className={cx(
        'sr-only', // Screen reader only - visually hidden
        className,
      )}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label="Terminal status information"
    >
      <div aria-label="Terminal state">{statusText}</div>
      <div aria-label="Instructions">
        Use arrow keys to navigate command history. Press F1 for keyboard shortcuts help. Press F2 for accessibility
        options.
      </div>
    </div>
  )
}

/**
 * Props for the KeyboardShortcutsHelp component.
 */
export interface KeyboardShortcutsHelpProps {
  /** Whether the help is currently visible */
  isVisible: boolean
  /** Callback when help should be closed */
  onClose: () => void
  /** Additional CSS classes */
  className?: string
}

/**
 * Keyboard shortcuts help modal with full accessibility support.
 */
export function KeyboardShortcutsHelp({
  isVisible,
  onClose,
  className,
}: KeyboardShortcutsHelpProps): React.ReactElement | null {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Focus management for modal with delay to prevent event conflicts
  useEffect(() => {
    if (isVisible && dialogRef.current !== null) {
      // Small delay to prevent buffered keyboard events from interfering
      const focusTimeout = setTimeout(() => {
        if (dialogRef.current !== null) {
          dialogRef.current.focus()
        }
      }, 100)

      return () => clearTimeout(focusTimeout)
    }

    return undefined
  }, [isVisible])

  // Handle escape key to close modal with delay to prevent immediate closure
  useEffect(() => {
    if (!isVisible) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onClose()
      }
    }

    // Add delay before attaching listener to prevent buffered events
    const listenerTimeout = setTimeout(() => {
      document.addEventListener('keydown', handleKeyDown, true)
    }, 150)

    return () => {
      clearTimeout(listenerTimeout)
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [isVisible, onClose])

  if (isVisible === false) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      aria-describedby="shortcuts-description"
      className={cx('fixed inset-0 z-50 flex items-center justify-center', 'bg-black/50 backdrop-blur-sm', className)}
      onClick={e => {
        if (e.target === e.currentTarget) {
          e.preventDefault()
          e.stopPropagation()
          onClose()
        }
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={cx(
          'relative w-full max-w-2xl max-h-[80vh] m-4',
          'bg-background border rounded-lg shadow-lg overflow-hidden',
          'focus:outline-none focus:ring-2 focus:ring-ring',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 id="shortcuts-title" className="text-lg font-semibold">
            🎹 Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className={cx('p-2 hover:bg-muted rounded-md', 'focus:outline-none focus:ring-2 focus:ring-ring')}
            aria-label="Close keyboard shortcuts help"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto">
          <p id="shortcuts-description" className="text-sm text-muted-foreground mb-4">
            Complete list of keyboard shortcuts available in the terminal. Shortcuts marked with ♿ are essential for
            accessibility.
          </p>

          <div className="space-y-6">
            {/* Navigation Shortcuts */}
            <section>
              <h3 className="font-medium text-sm mb-2 text-primary">📋 Navigation</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">↑ / Ctrl+P</kbd>
                  <span>Previous command in history ♿</span>
                </div>
                <div className="flex justify-between">
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">↓ / Ctrl+N</kbd>
                  <span>Next command in history ♿</span>
                </div>
                <div className="flex justify-between">
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">← / Ctrl+B</kbd>
                  <span>Move cursor left ♿</span>
                </div>
                <div className="flex justify-between">
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">→ / Ctrl+F</kbd>
                  <span>Move cursor right ♿</span>
                </div>
                <div className="flex justify-between">
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Home / Ctrl+A</kbd>
                  <span>Beginning of line ♿</span>
                </div>
                <div className="flex justify-between">
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">End / Ctrl+E</kbd>
                  <span>End of line ♿</span>
                </div>
              </div>
            </section>

            {/* Editing Shortcuts */}
            <section>
              <h3 className="font-medium text-sm mb-2 text-primary">✏️ Editing</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Backspace</kbd>
                  <span>Delete character before cursor ♿</span>
                </div>
                <div className="flex justify-between">
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Delete</kbd>
                  <span>Delete character at cursor ♿</span>
                </div>
                <div className="flex justify-between">
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+K</kbd>
                  <span>Delete to end of line</span>
                </div>
                <div className="flex justify-between">
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+U</kbd>
                  <span>Delete entire line</span>
                </div>
                <div className="flex justify-between">
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+W</kbd>
                  <span>Delete previous word</span>
                </div>
              </div>
            </section>

            {/* System Shortcuts */}
            <section>
              <h3 className="font-medium text-sm mb-2 text-primary">⚙️ System</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Enter</kbd>
                  <span>Execute command ♿</span>
                </div>
                <div className="flex justify-between">
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+C</kbd>
                  <span>Cancel command ♿</span>
                </div>
                <div className="flex justify-between">
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+L</kbd>
                  <span>Clear screen</span>
                </div>
                <div className="flex justify-between">
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Tab</kbd>
                  <span>Auto-complete</span>
                </div>
              </div>
            </section>

            {/* Accessibility Shortcuts */}
            <section>
              <h3 className="font-medium text-sm mb-2 text-primary">♿ Accessibility</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">F1</kbd>
                  <span>Show this help ♿</span>
                </div>
                <div className="flex justify-between">
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">F2</kbd>
                  <span>Accessibility menu ♿</span>
                </div>
                <div className="flex justify-between">
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Escape</kbd>
                  <span>Close dialogs</span>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-6 p-3 bg-muted/50 rounded text-xs text-muted-foreground">
            <strong>♿ Essential for accessibility:</strong> These shortcuts are particularly important for users
            relying on keyboard navigation or assistive technologies.
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/20">
          <button
            onClick={onClose}
            className={cx(
              'w-full px-4 py-2 bg-primary text-primary-foreground rounded-md',
              'hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring',
            )}
          >
            Close (Escape)
          </button>
        </div>
      </div>
    </div>
  )
}
