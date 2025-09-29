/**
 * Terminal scrollback buffer management utilities.
 *
 * Provides comprehensive scrollback buffer management for terminal applications
 * including line storage, overflow handling, search, and persistence.
 */

import type {TerminalOutputEntry} from '../hooks'
import {consola} from 'consola'

/**
 * Configuration options for scrollback buffer management.
 */
export interface ScrollbackConfig {
  /** Maximum number of lines to keep in the scrollback buffer (default: 1000) */
  maxLines?: number
  /** Whether to persist scrollback across sessions (default: false) */
  persist?: boolean
  /** Storage key for persistence (default: 'moo-dang-scrollback') */
  storageKey?: string
  /** Whether to enable search functionality (default: true) */
  enableSearch?: boolean
  /** Maximum age of entries in minutes before cleanup (default: 1440 = 24 hours) */
  maxAgeMinutes?: number
}

/**
 * Represents a line in the scrollback buffer.
 */
export interface ScrollbackLine {
  /** Unique identifier for the line */
  id: string
  /** Line content */
  content: string
  /** Timestamp when the line was added */
  timestamp: Date
  /** Type of content (for filtering and formatting) */
  type?: 'command' | 'output' | 'error' | 'system' | 'warning' | 'info'
  /** Optional metadata */
  metadata?: {
    /** Command that generated this line */
    command?: string
    /** Whether this line is part of multiline output */
    isMultiline?: boolean
    /** Multiline group ID for related lines */
    groupId?: string
  }
}

/**
 * Data structure for serialized scrollback lines from storage.
 */
interface ScrollbackLineData {
  id: string
  content: string
  timestamp: string
  type?: 'command' | 'output' | 'error' | 'system' | 'warning' | 'info'
  metadata?: {
    command?: string
    isMultiline?: boolean
    groupId?: string
  }
}

/**
 * Search options for scrollback buffer.
 */
export interface ScrollbackSearchOptions {
  /** Search term */
  query: string
  /** Whether to use case-sensitive search (default: false) */
  caseSensitive?: boolean
  /** Whether to use regex search (default: false) */
  useRegex?: boolean
  /** Limit number of results (default: 100) */
  maxResults?: number
  /** Filter by line type */
  typeFilter?: ScrollbackLine['type']
  /** Search within specific time range */
  timeRange?: {
    start: Date
    end: Date
  }
}

/**
 * Search result from scrollback buffer.
 */
export interface ScrollbackSearchResult {
  /** The matching line */
  line: ScrollbackLine
  /** Index of the line in the buffer */
  index: number
  /** Match highlights (character positions) */
  matches: {start: number; end: number}[]
}

/**
 * Scrollback buffer statistics.
 */
export interface ScrollbackStats {
  /** Total number of lines */
  totalLines: number
  /** Memory usage estimate in bytes */
  estimatedMemoryUsage: number
  /** Oldest line timestamp */
  oldestLine?: Date
  /** Newest line timestamp */
  newestLine?: Date
  /** Lines by type */
  linesByType: Record<string, number>
}

/**
 * Scrollback buffer state management using functional approach.
 *
 * Provides comprehensive scrollback buffer management with features like:
 * - Automatic overflow handling with configurable limits
 * - Search functionality with regex and filtering support
 * - Optional persistence across browser sessions
 * - Memory usage monitoring and cleanup
 * - Export capabilities for debugging and analysis
 */

/**
 * Internal state for scrollback buffer management.
 */
interface ScrollbackState {
  lines: ScrollbackLine[]
  lineIdCounter: number
  config: Required<ScrollbackConfig>
}

/**
 * Scrollback buffer manager interface.
 *
 * Uses functional programming patterns instead of class-based approach
 * for better maintainability and testability.
 */
export interface ScrollbackManager {
  /** Add a new line to the scrollback buffer */
  addLine: (content: string, type?: ScrollbackLine['type'], metadata?: ScrollbackLine['metadata']) => ScrollbackLine
  /** Add multiple lines from terminal output entries */
  addFromOutputEntries: (entries: TerminalOutputEntry[]) => void
  /** Get all lines in the scrollback buffer */
  getLines: (limit?: number) => ScrollbackLine[]
  /** Get lines within a specific range */
  getLineRange: (start: number, end: number) => ScrollbackLine[]
  /** Search the scrollback buffer */
  search: (options: ScrollbackSearchOptions) => ScrollbackSearchResult[]
  /** Clear all lines from the scrollback buffer */
  clear: () => void
  /** Remove lines older than the specified age */
  cleanupOldLines: (ageMinutes?: number) => number
  /** Get statistics about the scrollback buffer */
  getStats: () => ScrollbackStats
  /** Export scrollback buffer as plain text */
  exportAsText: (includeTimestamps?: boolean) => string
  /** Export scrollback buffer as JSON */
  exportAsJson: () => string
}

/**
 * Loads scrollback data from browser storage.
 */
function loadFromStorage(config: Required<ScrollbackConfig>): Pick<ScrollbackState, 'lines' | 'lineIdCounter'> {
  try {
    const stored = localStorage.getItem(config.storageKey)
    if (stored) {
      const data = JSON.parse(stored)
      if (Array.isArray(data.lines)) {
        const lines = data.lines.map((line: ScrollbackLineData) => ({
          ...line,
          timestamp: new Date(line.timestamp),
        }))
        consola.debug(`Loaded ${lines.length} lines from storage`)
        return {
          lines,
          lineIdCounter: data.lineIdCounter || 0,
        }
      }
    }
  } catch (error) {
    consola.warn('Failed to load scrollback from storage:', error)
  }
  return {
    lines: [],
    lineIdCounter: 0,
  }
}

/**
 * Saves scrollback data to browser storage.
 */
function saveToStorage(state: ScrollbackState): void {
  try {
    const data = {
      lines: state.lines,
      lineIdCounter: state.lineIdCounter,
      savedAt: new Date().toISOString(),
    }
    localStorage.setItem(state.config.storageKey, JSON.stringify(data))
  } catch (error) {
    consola.warn('Failed to save scrollback to storage:', error)
  }
}

/**
 * Creates a new scrollback manager with the specified configuration.
 *
 * Uses functional programming patterns to manage scrollback state and operations.
 * All methods maintain immutability where appropriate and provide clean interfaces.
 *
 * @param config Scrollback configuration options
 * @returns ScrollbackManager interface with all necessary operations
 */
export function createScrollbackManager(config: ScrollbackConfig = {}): ScrollbackManager {
  const resolvedConfig: Required<ScrollbackConfig> = {
    maxLines: config.maxLines ?? 1000,
    persist: config.persist ?? false,
    storageKey: config.storageKey ?? 'moo-dang-scrollback',
    enableSearch: config.enableSearch ?? true,
    maxAgeMinutes: config.maxAgeMinutes ?? 1440, // 24 hours
  }

  const persistedData = resolvedConfig.persist ? loadFromStorage(resolvedConfig) : {lines: [], lineIdCounter: 0}

  const state: ScrollbackState = {
    lines: persistedData.lines,
    lineIdCounter: persistedData.lineIdCounter,
    config: resolvedConfig,
  }

  /**
   * Adds a new line to the scrollback buffer.
   */
  const addLine = (
    content: string,
    type?: ScrollbackLine['type'],
    metadata?: ScrollbackLine['metadata'],
  ): ScrollbackLine => {
    const line: ScrollbackLine = {
      id: `line-${Date.now()}-${++state.lineIdCounter}`,
      content,
      timestamp: new Date(),
      type,
      metadata,
    }

    state.lines.push(line)

    // Enforce maximum lines limit
    if (state.lines.length > state.config.maxLines) {
      const removedCount = state.lines.length - state.config.maxLines
      state.lines = state.lines.slice(removedCount)
      consola.debug(`Removed ${removedCount} old lines from scrollback buffer`)
    }

    // Persist if enabled
    if (state.config.persist) {
      saveToStorage(state)
    }

    return line
  }

  /**
   * Adds multiple lines from terminal output entries.
   */
  const addFromOutputEntries = (entries: TerminalOutputEntry[]): void => {
    for (const entry of entries) {
      addLine(entry.content, entry.type, {
        command: entry.metadata?.command,
      })
    }
  }

  /**
   * Gets all lines in the scrollback buffer.
   */
  const getLines = (limit?: number): ScrollbackLine[] => {
    return limit ? state.lines.slice(-limit) : [...state.lines]
  }

  /**
   * Gets lines within a specific range.
   */
  const getLineRange = (start: number, end: number): ScrollbackLine[] => {
    return state.lines.slice(start, end)
  }

  /**
   * Searches the scrollback buffer.
   */
  const search = (options: ScrollbackSearchOptions): ScrollbackSearchResult[] => {
    if (!state.config.enableSearch) {
      consola.warn('Search is disabled in scrollback configuration')
      return []
    }

    const {query, caseSensitive = false, useRegex = false, maxResults = 100, typeFilter, timeRange} = options

    if (!query.trim()) {
      return []
    }

    const results: ScrollbackSearchResult[] = []
    let searchPattern: RegExp

    try {
      if (useRegex) {
        searchPattern = new RegExp(query, caseSensitive ? 'g' : 'gi')
      } else {
        const escapedQuery = query.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
        searchPattern = new RegExp(escapedQuery, caseSensitive ? 'g' : 'gi')
      }
    } catch (error) {
      consola.error('Invalid search pattern:', error)
      return []
    }

    for (let index = 0; index < state.lines.length && results.length < maxResults; index++) {
      const line = state.lines[index]

      if (!line) continue

      // Apply filters
      if (typeFilter && line.type !== typeFilter) {
        continue
      }

      if (timeRange && (line.timestamp < timeRange.start || line.timestamp > timeRange.end)) {
        continue
      }

      // Search for matches
      const matches: {start: number; end: number}[] = []

      // Reset regex lastIndex for global patterns
      searchPattern.lastIndex = 0

      let match = searchPattern.exec(line.content)
      while (match !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
        })

        // Prevent infinite loop for zero-length matches
        if (match[0].length === 0) {
          searchPattern.lastIndex++
        }

        match = searchPattern.exec(line.content)
      }

      if (matches.length > 0) {
        results.push({
          line,
          index,
          matches,
        })
      }
    }

    return results
  }

  /**
   * Clears all lines from the scrollback buffer.
   */
  const clear = (): void => {
    state.lines = []
    state.lineIdCounter = 0

    if (state.config.persist) {
      saveToStorage(state)
    }

    consola.debug('Cleared scrollback buffer')
  }

  /**
   * Removes lines older than the specified age.
   */
  const cleanupOldLines = (ageMinutes?: number): number => {
    const cutoffAge = ageMinutes ?? state.config.maxAgeMinutes
    const cutoffTime = new Date(Date.now() - cutoffAge * 60 * 1000)

    const originalLength = state.lines.length
    state.lines = state.lines.filter(line => line.timestamp > cutoffTime)
    const removedCount = originalLength - state.lines.length

    if (removedCount > 0) {
      if (state.config.persist) {
        saveToStorage(state)
      }
      consola.debug(`Cleaned up ${removedCount} old lines from scrollback buffer`)
    }

    return removedCount
  }

  /**
   * Gets statistics about the scrollback buffer.
   */
  const getStats = (): ScrollbackStats => {
    const linesByType: Record<string, number> = {}
    let totalBytes = 0

    for (const line of state.lines) {
      const type = line.type || 'unknown'
      linesByType[type] = (linesByType[type] || 0) + 1

      // Estimate memory usage
      totalBytes += line.content.length * 2 // Rough estimate for UTF-16
      totalBytes += 100 // Estimate for object overhead
    }

    return {
      totalLines: state.lines.length,
      estimatedMemoryUsage: totalBytes,
      oldestLine: state.lines.length > 0 ? state.lines.at(0)?.timestamp : undefined,
      newestLine: state.lines.length > 0 ? state.lines.at(-1)?.timestamp : undefined,
      linesByType,
    }
  }

  /**
   * Exports scrollback buffer as plain text.
   */
  const exportAsText = (includeTimestamps = false): string => {
    return state.lines
      .map(line => {
        const timestamp = includeTimestamps ? `[${line.timestamp.toISOString()}] ` : ''
        const type = line.type ? `[${line.type.toUpperCase()}] ` : ''
        return `${timestamp}${type}${line.content}`
      })
      .join('\n')
  }

  /**
   * Exports scrollback buffer as JSON.
   */
  const exportAsJson = (): string => {
    return JSON.stringify(
      {
        config: state.config,
        lines: state.lines,
        stats: getStats(),
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    )
  }

  return {
    addLine,
    addFromOutputEntries,
    getLines,
    getLineRange,
    search,
    clear,
    cleanupOldLines,
    getStats,
    exportAsText,
    exportAsJson,
  }
}
