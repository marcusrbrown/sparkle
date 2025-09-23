/**
 * Terminal output rendering hook and utilities.
 *
 * Provides comprehensive terminal output management including structured output
 * rendering, scrollback buffer management, and ANSI escape sequence support.
 */

import type {Terminal as XTerm} from '@xterm/xterm'
import {consola} from 'consola'
import {useCallback, useRef, useState} from 'react'

/**
 * Type definitions for terminal output system.
 */
export type TerminalOutputType = 'command' | 'output' | 'error' | 'warning' | 'info' | 'system'

/**
 * Structured terminal output entry with metadata.
 */
export interface TerminalOutputEntry {
  /** Unique identifier for the output entry */
  id: string
  /** Type of output for formatting and styling */
  type: TerminalOutputType
  /** The actual content to display */
  content: string
  /** Timestamp when the output was created */
  timestamp: Date
  /** Optional metadata for advanced rendering */
  metadata?: {
    /** Command that generated this output (for command/output types) */
    command?: string
    /** Exit code for command results */
    exitCode?: number
    /** Whether this output should be treated as raw (no additional formatting) */
    raw?: boolean
    /** Custom styling information */
    style?: {
      color?: string
      backgroundColor?: string
      bold?: boolean
      italic?: boolean
    }
  }
}

/**
 * Configuration options for terminal output rendering.
 */
export interface TerminalOutputConfig {
  /** Maximum number of output entries to keep in memory (default: 1000) */
  maxOutputEntries?: number
  /** Whether to automatically scroll to bottom on new output (default: true) */
  autoScroll?: boolean
  /** Whether to timestamp output entries (default: false) */
  showTimestamps?: boolean
  /** Whether to enable ANSI escape sequence parsing (default: true) */
  enableAnsiParsing?: boolean
  /** Whether to deduplicate consecutive identical outputs (default: false) */
  deduplicateOutput?: boolean
}

/**
 * Hook return interface for terminal output management.
 */
export interface UseTerminalOutputReturn {
  /** Array of current output entries in display order */
  outputEntries: TerminalOutputEntry[]
  /** Add a new output entry to the terminal */
  addOutput: (type: TerminalOutputType, content: string, metadata?: TerminalOutputEntry['metadata']) => void
  /** Clear all output entries */
  clearOutput: () => void
  /** Clear output entries older than specified minutes (default: 60) */
  clearOldOutput: (ageMinutes?: number) => void
  /** Render all pending output to the terminal instance */
  renderToTerminal: (terminal: XTerm) => void
  /** Set the terminal instance for automatic rendering */
  setTerminal: (terminal: XTerm | null) => void
  /** Get total number of output entries ever created */
  getTotalEntryCount: () => number
  /** Export output history as plain text */
  exportAsText: () => string
}

/**
 * Custom hook for managing terminal output rendering and scrollback.
 *
 * This hook provides comprehensive terminal output management including:
 * - Structured output with type-based formatting
 * - Scrollback buffer management with configurable limits
 * - ANSI escape sequence support for colors and formatting
 * - Automatic and manual rendering to xterm.js instances
 * - Output deduplication and cleanup utilities
 *
 * @param config Configuration options for output behavior
 * @returns Object with output management functions and state
 */
export function useTerminalOutput(config: TerminalOutputConfig = {}): UseTerminalOutputReturn {
  const {
    maxOutputEntries = 1000,
    autoScroll = true,
    showTimestamps = false,
    enableAnsiParsing: _enableAnsiParsing = true,
    deduplicateOutput = false,
  } = config

  const [outputEntries, setOutputEntries] = useState<TerminalOutputEntry[]>([])
  const terminalRef = useRef<XTerm | null>(null)
  const entryCounterRef = useRef(0)
  const pendingRenderRef = useRef(false)

  /**
   * Generates a unique ID for output entries.
   */
  const generateEntryId = useCallback((): string => {
    return `output-${Date.now()}-${++entryCounterRef.current}`
  }, [])

  /**
   * Renders all pending output entries to the specified terminal instance.
   *
   * This function handles the actual writing of output to the xterm.js terminal
   * with proper formatting, colors, and ANSI escape sequence processing.
   *
   * @param terminal The xterm.js terminal instance to render to
   */
  const renderToTerminal = useCallback(
    (terminal: XTerm) => {
      // Implementation will be enhanced in the next step with formatting utilities
      // For now, we provide basic rendering
      try {
        // This is a placeholder that will be enhanced with proper formatting
        outputEntries.forEach(entry => {
          let formattedContent = entry.content

          // Add timestamp if enabled
          if (showTimestamps) {
            const timestamp = entry.timestamp.toLocaleTimeString()
            formattedContent = `[${timestamp}] ${formattedContent}`
          }

          // Add newline if content doesn't end with one
          if (!formattedContent.endsWith('\r\n') && !formattedContent.endsWith('\n')) {
            formattedContent += '\r\n'
          }

          terminal.write(formattedContent)
        })

        consola.debug(`Rendered ${outputEntries.length} output entries to terminal`)
      } catch (error) {
        consola.error('Failed to render output to terminal:', error)
      }
    },
    [outputEntries, showTimestamps],
  )

  /**
   * Adds a new output entry to the terminal with automatic rendering.
   *
   * @param type Type of output for formatting
   * @param content Content to display
   * @param metadata Optional metadata for advanced rendering
   */
  const addOutput = useCallback(
    (type: TerminalOutputType, content: string, metadata: TerminalOutputEntry['metadata'] = {}) => {
      const newEntry: TerminalOutputEntry = {
        id: generateEntryId(),
        type,
        content,
        timestamp: new Date(),
        metadata,
      }

      setOutputEntries(prev => {
        let updatedEntries = [...prev]

        // Check for deduplication if enabled
        if (deduplicateOutput && updatedEntries.length > 0) {
          const lastEntry = updatedEntries.at(-1)
          if (lastEntry && lastEntry.type === type && lastEntry.content === content) {
            // Duplicate found, update timestamp instead of adding new entry
            const updatedLastEntry: TerminalOutputEntry = {
              ...lastEntry,
              timestamp: new Date(),
            }
            updatedEntries[updatedEntries.length - 1] = updatedLastEntry
            return updatedEntries
          }
        }

        // Add new entry
        updatedEntries.push(newEntry)

        // Enforce maximum entry limit
        if (updatedEntries.length > maxOutputEntries) {
          const entriesToRemove = updatedEntries.length - maxOutputEntries
          updatedEntries = updatedEntries.slice(entriesToRemove)
          consola.debug(`Removed ${entriesToRemove} old output entries to stay within limit of ${maxOutputEntries}`)
        }

        return updatedEntries
      })

      // Auto-render to terminal if available
      if (terminalRef.current && autoScroll) {
        requestAnimationFrame(() => {
          if (terminalRef.current && !pendingRenderRef.current) {
            pendingRenderRef.current = true
            renderToTerminal(terminalRef.current)
            pendingRenderRef.current = false
          }
        })
      }
    },
    [generateEntryId, deduplicateOutput, maxOutputEntries, autoScroll, renderToTerminal],
  )

  /**
   * Clears all output entries from memory.
   */
  const clearOutput = useCallback(() => {
    setOutputEntries([])
    consola.debug('Cleared all terminal output entries')
  }, [])

  /**
   * Removes output entries older than the specified age.
   *
   * @param ageMinutes Age threshold in minutes (default: 60)
   */
  const clearOldOutput = useCallback((ageMinutes = 60) => {
    const cutoffTime = new Date(Date.now() - ageMinutes * 60 * 1000)

    setOutputEntries(prev => {
      const filteredEntries = prev.filter(entry => entry.timestamp > cutoffTime)
      const removedCount = prev.length - filteredEntries.length

      if (removedCount > 0) {
        consola.debug(`Removed ${removedCount} output entries older than ${ageMinutes} minutes`)
      }

      return filteredEntries
    })
  }, [])

  /**
   * Sets the terminal instance for automatic rendering.
   *
   * @param terminal The xterm.js terminal instance or null to disable auto-rendering
   */
  const setTerminal = useCallback((terminal: XTerm | null) => {
    terminalRef.current = terminal
    if (terminal) {
      consola.debug('Terminal instance set for output rendering')
    }
  }, [])

  /**
   * Gets the total number of output entries created during this session.
   *
   * @returns Total entry count
   */
  const getTotalEntryCount = useCallback(() => {
    return entryCounterRef.current
  }, [])

  /**
   * Exports the current output history as plain text.
   *
   * @returns Formatted text representation of all output entries
   */
  const exportAsText = useCallback(() => {
    return outputEntries
      .map(entry => {
        const timestamp = showTimestamps ? `[${entry.timestamp.toISOString()}] ` : ''
        const typePrefix = `[${entry.type.toUpperCase()}] `
        return `${timestamp}${typePrefix}${entry.content}`
      })
      .join('\n')
  }, [outputEntries, showTimestamps])

  return {
    outputEntries,
    addOutput,
    clearOutput,
    clearOldOutput,
    renderToTerminal,
    setTerminal,
    getTotalEntryCount,
    exportAsText,
  }
}
