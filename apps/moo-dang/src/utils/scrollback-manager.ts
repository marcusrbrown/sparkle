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
 * Scrollback buffer manager class.
 *
 * Provides comprehensive scrollback buffer management with features like:
 * - Automatic overflow handling with configurable limits
 * - Search functionality with regex and filtering support
 * - Optional persistence across browser sessions
 * - Memory usage monitoring and cleanup
 * - Export capabilities for debugging and analysis
 */
export class ScrollbackManager {
  private readonly config: Required<ScrollbackConfig>
  private lines: ScrollbackLine[] = []
  private lineIdCounter = 0

  constructor(config: ScrollbackConfig = {}) {
    this.config = {
      maxLines: config.maxLines ?? 1000,
      persist: config.persist ?? false,
      storageKey: config.storageKey ?? 'moo-dang-scrollback',
      enableSearch: config.enableSearch ?? true,
      maxAgeMinutes: config.maxAgeMinutes ?? 1440, // 24 hours
    }

    // Load persisted data if enabled
    if (this.config.persist) {
      this.loadFromStorage()
    }
  }

  /**
   * Adds a new line to the scrollback buffer.
   *
   * @param content Line content
   * @param type Optional line type
   * @param metadata Optional metadata
   * @returns The created scrollback line
   */
  addLine(content: string, type?: ScrollbackLine['type'], metadata?: ScrollbackLine['metadata']): ScrollbackLine {
    const line: ScrollbackLine = {
      id: `line-${Date.now()}-${++this.lineIdCounter}`,
      content,
      timestamp: new Date(),
      type,
      metadata,
    }

    this.lines.push(line)

    // Enforce maximum lines limit
    if (this.lines.length > this.config.maxLines) {
      const removedCount = this.lines.length - this.config.maxLines
      this.lines = this.lines.slice(removedCount)
      consola.debug(`Removed ${removedCount} old lines from scrollback buffer`)
    }

    // Persist if enabled
    if (this.config.persist) {
      this.saveToStorage()
    }

    return line
  }

  /**
   * Adds multiple lines from terminal output entries.
   *
   * @param entries Array of terminal output entries
   */
  addFromOutputEntries(entries: TerminalOutputEntry[]): void {
    for (const entry of entries) {
      this.addLine(entry.content, entry.type, {
        command: entry.metadata?.command,
      })
    }
  }

  /**
   * Gets all lines in the scrollback buffer.
   *
   * @param limit Optional limit on number of lines to return
   * @returns Array of scrollback lines
   */
  getLines(limit?: number): ScrollbackLine[] {
    return limit ? this.lines.slice(-limit) : [...this.lines]
  }

  /**
   * Gets lines within a specific range.
   *
   * @param start Start index (inclusive)
   * @param end End index (exclusive)
   * @returns Array of scrollback lines
   */
  getLineRange(start: number, end: number): ScrollbackLine[] {
    return this.lines.slice(start, end)
  }

  /**
   * Searches the scrollback buffer.
   *
   * @param options Search options
   * @returns Array of search results
   */
  search(options: ScrollbackSearchOptions): ScrollbackSearchResult[] {
    if (!this.config.enableSearch) {
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

    for (let index = 0; index < this.lines.length && results.length < maxResults; index++) {
      const line = this.lines[index]

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
  clear(): void {
    this.lines = []
    this.lineIdCounter = 0

    if (this.config.persist) {
      this.saveToStorage()
    }

    consola.debug('Cleared scrollback buffer')
  }

  /**
   * Removes lines older than the specified age.
   *
   * @param ageMinutes Age threshold in minutes
   * @returns Number of lines removed
   */
  cleanupOldLines(ageMinutes?: number): number {
    const cutoffAge = ageMinutes ?? this.config.maxAgeMinutes
    const cutoffTime = new Date(Date.now() - cutoffAge * 60 * 1000)

    const originalLength = this.lines.length
    this.lines = this.lines.filter(line => line.timestamp > cutoffTime)
    const removedCount = originalLength - this.lines.length

    if (removedCount > 0) {
      if (this.config.persist) {
        this.saveToStorage()
      }
      consola.debug(`Cleaned up ${removedCount} old lines from scrollback buffer`)
    }

    return removedCount
  }

  /**
   * Gets statistics about the scrollback buffer.
   *
   * @returns Scrollback buffer statistics
   */
  getStats(): ScrollbackStats {
    const linesByType: Record<string, number> = {}
    let totalBytes = 0

    for (const line of this.lines) {
      const type = line.type || 'unknown'
      linesByType[type] = (linesByType[type] || 0) + 1

      // Estimate memory usage
      totalBytes += line.content.length * 2 // Rough estimate for UTF-16
      totalBytes += 100 // Estimate for object overhead
    }

    return {
      totalLines: this.lines.length,
      estimatedMemoryUsage: totalBytes,
      oldestLine: this.lines.length > 0 ? this.lines.at(0)?.timestamp : undefined,
      newestLine: this.lines.length > 0 ? this.lines.at(-1)?.timestamp : undefined,
      linesByType,
    }
  }

  /**
   * Exports scrollback buffer as plain text.
   *
   * @param includeTimestamps Whether to include timestamps
   * @returns Plain text representation
   */
  exportAsText(includeTimestamps = false): string {
    return this.lines
      .map(line => {
        const timestamp = includeTimestamps ? `[${line.timestamp.toISOString()}] ` : ''
        const type = line.type ? `[${line.type.toUpperCase()}] ` : ''
        return `${timestamp}${type}${line.content}`
      })
      .join('\n')
  }

  /**
   * Exports scrollback buffer as JSON.
   *
   * @returns JSON representation of the buffer
   */
  exportAsJson(): string {
    return JSON.stringify(
      {
        config: this.config,
        lines: this.lines,
        stats: this.getStats(),
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    )
  }

  /**
   * Loads scrollback data from browser storage.
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey)
      if (stored) {
        const data = JSON.parse(stored)
        if (Array.isArray(data.lines)) {
          this.lines = data.lines.map((line: any) => ({
            ...line,
            timestamp: new Date(line.timestamp),
          }))
          this.lineIdCounter = data.lineIdCounter || 0
          consola.debug(`Loaded ${this.lines.length} lines from storage`)
        }
      }
    } catch (error) {
      consola.warn('Failed to load scrollback from storage:', error)
    }
  }

  /**
   * Saves scrollback data to browser storage.
   */
  private saveToStorage(): void {
    try {
      const data = {
        lines: this.lines,
        lineIdCounter: this.lineIdCounter,
        savedAt: new Date().toISOString(),
      }
      localStorage.setItem(this.config.storageKey, JSON.stringify(data))
    } catch (error) {
      consola.warn('Failed to save scrollback to storage:', error)
    }
  }
}

/**
 * Creates a new scrollback manager with the specified configuration.
 *
 * @param config Scrollback configuration options
 * @returns ScrollbackManager instance
 */
export function createScrollbackManager(config?: ScrollbackConfig): ScrollbackManager {
  return new ScrollbackManager(config)
}
