/**
 * Shell command history management with persistence and search functionality.
 *
 * Provides comprehensive command history management including localStorage persistence,
 * advanced search capabilities, analytics, and export/import functionality.
 */

import type {
  HistoryConfig,
  HistoryEntry,
  HistoryEventListener,
  HistoryEventType,
  HistoryExportOptions,
  HistoryManager,
  HistorySearchOptions,
  HistorySearchResult,
  HistoryState,
  HistoryStats,
} from './history-types'

import {consola} from 'consola'

/**
 * Stored history entry as it appears in localStorage (with string timestamp).
 */
interface StoredHistoryEntry {
  id: string
  command: string
  timestamp: string
  workingDirectory: string
  exitCode?: number
  duration?: number
  success?: boolean
  metadata?: HistoryEntry['metadata']
}

/**
 * Structure of data stored in localStorage.
 */
interface StoredHistoryData {
  entries: StoredHistoryEntry[]
  entryIdCounter: number
  sessionId?: string
  savedAt?: string
  version?: string
}

/**
 * Type guard to validate stored history data structure.
 */
function isStoredHistoryData(value: unknown): value is StoredHistoryData {
  return (
    typeof value === 'object' &&
    value !== null &&
    'entries' in value &&
    Array.isArray((value as StoredHistoryData).entries) &&
    typeof (value as StoredHistoryData).entryIdCounter === 'number'
  )
}

/**
 * Default configuration for history management.
 */
const DEFAULT_HISTORY_CONFIG = {
  maxHistorySize: 1000,
  persist: true,
  storageKey: 'moo-dang-history',
  allowDuplicates: false,
  enableSearch: true,
  maxAgeDays: 30,
  saveSensitive: false,
} as const satisfies Required<HistoryConfig>

/**
 * Loads command history from browser localStorage.
 */
function loadFromStorage(config: Required<HistoryConfig>): Pick<HistoryState, 'entries' | 'entryIdCounter'> {
  if (!config.persist) {
    return {entries: [], entryIdCounter: 0}
  }

  try {
    const stored = localStorage.getItem(config.storageKey)
    if (stored != null && stored.trim().length > 0) {
      const data: unknown = JSON.parse(stored)
      if (isStoredHistoryData(data)) {
        const entries = data.entries.map((entry: StoredHistoryEntry) => ({
          ...entry,
          timestamp: new Date(entry.timestamp),
        }))
        consola.debug(`Loaded ${entries.length} history entries from storage`)
        return {
          entries,
          entryIdCounter: data.entryIdCounter || entries.length,
        }
      }
    }
  } catch (error) {
    consola.warn('Failed to load command history from storage:', error)
  }
  return {
    entries: [],
    entryIdCounter: 0,
  }
}

/**
 * Saves command history to browser localStorage.
 */
function saveToStorage(state: HistoryState): void {
  if (!state.config.persist) {
    return
  }

  try {
    const data = {
      entries: state.entries,
      entryIdCounter: state.entryIdCounter,
      sessionId: state.sessionId,
      savedAt: new Date().toISOString(),
      version: '1.0.0',
    }
    localStorage.setItem(state.config.storageKey, JSON.stringify(data))
    consola.debug(`Saved ${state.entries.length} history entries to storage`)
  } catch (error) {
    consola.warn('Failed to save command history to storage:', error)
  }
}

/**
 * Generates a unique session identifier.
 */
function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Generates a unique entry identifier.
 */
function generateEntryId(counter: number): string {
  return `entry-${Date.now()}-${counter.toString().padStart(6, '0')}`
}

/**
 * Cleans up old entries based on age and size constraints.
 */
function cleanupEntries(state: HistoryState): HistoryEntry[] {
  let entries = [...state.entries]

  // Remove entries older than maxAgeDays
  if (state.config.maxAgeDays > 0) {
    const cutoffDate = new Date(Date.now() - state.config.maxAgeDays * 24 * 60 * 60 * 1000)
    const beforeCount = entries.length
    entries = entries.filter(entry => entry.timestamp >= cutoffDate)
    const removedByAge = beforeCount - entries.length
    if (removedByAge > 0) {
      consola.debug(`Removed ${removedByAge} entries older than ${state.config.maxAgeDays} days`)
    }
  }

  // Trim to maxHistorySize (keep most recent)
  if (entries.length > state.config.maxHistorySize) {
    const beforeCount = entries.length
    entries = entries.slice(-state.config.maxHistorySize)
    const removedBySize = beforeCount - entries.length
    consola.debug(`Removed ${removedBySize} entries to maintain max size of ${state.config.maxHistorySize}`)
  }

  return entries
}

/**
 * Performs history search with various filtering options.
 */
function performSearch(entries: HistoryEntry[], options: HistorySearchOptions): HistorySearchResult {
  const startTime = Date.now()
  let matchingEntries = entries

  // Filter by date range
  if (options.dateRange?.from) {
    const fromDate = options.dateRange.from
    matchingEntries = matchingEntries.filter(entry => entry.timestamp >= fromDate)
  }
  if (options.dateRange?.to) {
    const toDate = options.dateRange.to
    matchingEntries = matchingEntries.filter(entry => entry.timestamp <= toDate)
  }

  // Filter by working directory
  if (options.workingDirectory) {
    matchingEntries = matchingEntries.filter(entry => entry.workingDirectory === options.workingDirectory)
  }

  // Filter by success status
  if (options.success !== undefined) {
    matchingEntries = matchingEntries.filter(entry => entry.success === options.success)
  }

  // Filter by exit code
  if (options.exitCode !== undefined) {
    matchingEntries = matchingEntries.filter(entry => entry.exitCode === options.exitCode)
  }

  // Text search
  if (options.query.trim()) {
    const query = options.caseSensitive ? options.query : options.query.toLowerCase()

    if (options.useRegex) {
      try {
        const regex = new RegExp(query, options.caseSensitive ? 'g' : 'gi')
        matchingEntries = matchingEntries.filter(entry => {
          const searchText =
            options.searchIn === 'all' ? `${entry.command} ${JSON.stringify(entry.metadata || {})}` : entry.command
          const textToSearch = options.caseSensitive ? searchText : searchText.toLowerCase()
          return regex.test(textToSearch)
        })
      } catch (regexError) {
        consola.warn('Invalid regex pattern, falling back to text search:', regexError)
        // Fall back to text search
        matchingEntries = matchingEntries.filter(entry => {
          const searchText =
            options.searchIn === 'all' ? `${entry.command} ${JSON.stringify(entry.metadata || {})}` : entry.command
          const textToSearch = options.caseSensitive ? searchText : searchText.toLowerCase()
          return textToSearch.includes(query)
        })
      }
    } else {
      matchingEntries = matchingEntries.filter(entry => {
        const searchText =
          options.searchIn === 'all' ? `${entry.command} ${JSON.stringify(entry.metadata || {})}` : entry.command
        const textToSearch = options.caseSensitive ? searchText : searchText.toLowerCase()
        return textToSearch.includes(query)
      })
    }
  }

  const totalMatches = matchingEntries.length
  const maxResults = options.maxResults || 100
  const truncated = totalMatches > maxResults

  const resultEntries = matchingEntries
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, maxResults)

  const searchTime = Date.now() - startTime

  return {
    entries: resultEntries,
    totalMatches,
    query: options.query,
    truncated,
    searchTime,
  }
}

/**
 * Calculates history statistics and analytics.
 */
function calculateStats(entries: HistoryEntry[]): HistoryStats {
  if (entries.length === 0) {
    return {
      totalCommands: 0,
      uniqueCommands: 0,
      topCommands: [],
      averagePerDay: 0,
      storageSize: 0,
    }
  }

  const commandCounts = new Map<string, {count: number; lastUsed: Date}>()
  let oldestDate: Date | undefined
  let newestDate: Date | undefined

  for (const entry of entries) {
    // Count commands
    const existing = commandCounts.get(entry.command)
    if (existing) {
      existing.count++
      if (entry.timestamp > existing.lastUsed) {
        existing.lastUsed = entry.timestamp
      }
    } else {
      commandCounts.set(entry.command, {count: 1, lastUsed: entry.timestamp})
    }

    // Track date range
    if (!oldestDate || entry.timestamp < oldestDate) {
      oldestDate = entry.timestamp
    }
    if (!newestDate || entry.timestamp > newestDate) {
      newestDate = entry.timestamp
    }
  }

  // Calculate top commands
  const topCommands = Array.from(commandCounts.entries())
    .map(([command, stats]) => ({command, count: stats.count, lastUsed: stats.lastUsed}))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Calculate average per day
  let averagePerDay = 0
  if (oldestDate && newestDate) {
    const daysDiff = Math.max(1, (newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24))
    averagePerDay = entries.length / daysDiff
  }

  // Calculate storage size
  const storageSize = JSON.stringify(entries).length

  return {
    totalCommands: entries.length,
    uniqueCommands: commandCounts.size,
    oldestCommand: oldestDate,
    newestCommand: newestDate,
    topCommands,
    averagePerDay,
    storageSize,
  }
}

/**
 * Exports history entries in specified format.
 */
function exportHistoryData(entries: HistoryEntry[], options: HistoryExportOptions = {}): string {
  let filteredEntries = entries

  // Apply filters
  if (options.dateRange?.from) {
    const fromDate = options.dateRange.from
    filteredEntries = filteredEntries.filter(entry => entry.timestamp >= fromDate)
  }
  if (options.dateRange?.to) {
    const toDate = options.dateRange.to
    filteredEntries = filteredEntries.filter(entry => entry.timestamp <= toDate)
  }
  if (options.workingDirectory) {
    filteredEntries = filteredEntries.filter(entry => entry.workingDirectory === options.workingDirectory)
  }
  if (options.successfulOnly) {
    filteredEntries = filteredEntries.filter(entry => entry.success === true)
  }

  const format = options.format || 'json'

  switch (format) {
    case 'json':
      return JSON.stringify(filteredEntries, null, 2)

    case 'csv': {
      const headers = ['timestamp', 'command', 'workingDirectory']
      if (options.includeMetadata !== false) {
        headers.push('exitCode', 'duration', 'success')
      }

      const rows = filteredEntries.map(entry => {
        const row = [entry.timestamp.toISOString(), `"${entry.command.replaceAll('"', '""')}"`, entry.workingDirectory]
        if (options.includeMetadata !== false) {
          row.push(entry.exitCode?.toString() || '', entry.duration?.toString() || '', entry.success?.toString() || '')
        }
        return row.join(',')
      })

      return [headers.join(','), ...rows].join('\n')
    }

    case 'txt':
      return filteredEntries
        .map(entry => {
          const timestamp = entry.timestamp.toLocaleString()
          const dir = entry.workingDirectory
          const command = entry.command
          const status = entry.success === undefined ? '' : entry.success ? ' ✓' : ' ✗'
          return `[${timestamp}] ${dir}$ ${command}${status}`
        })
        .join('\n')

    default:
      throw new Error(`Unsupported export format: ${format}`)
  }
}

/**
 * Creates a new command history manager with the specified configuration.
 *
 * Provides comprehensive history management including persistence, search, analytics,
 * and import/export capabilities for the moo-dang shell.
 *
 * @param config History configuration options
 * @returns HistoryManager interface with all history operations
 */
export function createHistoryManager(config: HistoryConfig = {}): HistoryManager {
  const fullConfig: Required<HistoryConfig> = {
    ...DEFAULT_HISTORY_CONFIG,
    ...config,
  }

  // Initialize state
  const initialData = loadFromStorage(fullConfig)
  const sessionId = generateSessionId()

  const state: HistoryState = {
    config: fullConfig,
    entries: initialData.entries,
    entryIdCounter: initialData.entryIdCounter,
    loaded: true,
    lastSave: new Date(),
    sessionId,
  }

  // Cleanup on initialization
  state.entries = cleanupEntries(state)

  // Event listeners for history changes
  const eventListeners = new Map<HistoryEventType, Set<HistoryEventListener>>()

  /**
   * Emits a history event to all registered listeners.
   */
  function emitEvent(type: HistoryEventType, entry?: HistoryEntry, count = 1): void {
    const listeners = eventListeners.get(type)
    if (listeners) {
      const event = {
        type,
        entry,
        count,
        timestamp: new Date(),
      }
      listeners.forEach(listener => {
        try {
          listener(event)
        } catch (error) {
          consola.error(`Error in history event listener for ${type}:`, error)
        }
      })
    }
  }

  /**
   * Saves state to storage and updates last save time.
   */
  function saveState(): void {
    saveToStorage(state)
    state.lastSave = new Date()
  }

  // Implementation of HistoryManager interface
  const manager: HistoryManager = {
    async addCommand(command: string, metadata: Partial<HistoryEntry> = {}): Promise<void> {
      const trimmedCommand = command.trim()

      // Skip empty commands
      if (!trimmedCommand) {
        return
      }

      // Skip sensitive commands if not configured to save them
      if (!state.config.saveSensitive && trimmedCommand.startsWith(' ')) {
        consola.debug('Skipping sensitive command (starts with space)')
        return
      }

      // Check for duplicates if not allowed
      if (!state.config.allowDuplicates) {
        const existingIndex = state.entries.findIndex(entry => entry.command === trimmedCommand)
        if (existingIndex !== -1) {
          // Move existing entry to end (most recent)
          const existing = state.entries.splice(existingIndex, 1)[0]
          if (!existing) {
            throw new Error('Failed to retrieve existing history entry')
          }
          existing.timestamp = new Date()
          state.entries.push(existing)
          saveState()
          return
        }
      }

      // Create new entry
      const entry: HistoryEntry = {
        id: generateEntryId(state.entryIdCounter++),
        command: trimmedCommand,
        timestamp: new Date(),
        workingDirectory: metadata.workingDirectory || '/',
        exitCode: metadata.exitCode,
        duration: metadata.duration,
        success: metadata.success,
        metadata: {
          sessionId: state.sessionId,
          interactive: true,
          ...metadata.metadata,
        },
      }

      state.entries.push(entry)

      // Cleanup if needed
      if (state.entries.length > state.config.maxHistorySize) {
        state.entries = cleanupEntries(state)
      }

      saveState()
      emitEvent('added', entry)

      consola.debug(`Added command to history: "${trimmedCommand}" (total: ${state.entries.length})`)
    },

    async getHistory(): Promise<HistoryEntry[]> {
      return [...state.entries].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    },

    async searchHistory(options: HistorySearchOptions): Promise<HistorySearchResult> {
      return performSearch(state.entries, options)
    },

    async clearHistory(filter?: Partial<HistoryEntry>): Promise<number> {
      const beforeCount = state.entries.length

      if (filter === undefined) {
        // Clear all history
        state.entries = []
      } else {
        // Clear filtered entries
        state.entries = state.entries.filter(entry => {
          // Return true to keep, false to remove
          if (filter.command && entry.command !== filter.command) return true
          if (filter.workingDirectory && entry.workingDirectory !== filter.workingDirectory) return true
          if (filter.success !== undefined && entry.success !== filter.success) return true
          if (filter.exitCode !== undefined && entry.exitCode !== filter.exitCode) return true
          return false // Remove this entry
        })
      }

      const removedCount = beforeCount - state.entries.length

      if (removedCount > 0) {
        saveState()
        emitEvent('cleared', undefined, removedCount)
        consola.debug(`Cleared ${removedCount} history entries`)
      }

      return removedCount
    },

    async removeEntry(id: string): Promise<boolean> {
      const index = state.entries.findIndex(entry => entry.id === id)
      if (index !== -1) {
        const removed = state.entries.splice(index, 1)[0]
        if (!removed) {
          throw new Error(`Failed to remove history entry with id: ${id}`)
        }
        saveState()
        emitEvent('removed', removed)
        consola.debug(`Removed history entry: ${id}`)
        return true
      }
      return false
    },

    async getStats(): Promise<HistoryStats> {
      return calculateStats(state.entries)
    },

    async exportHistory(options: HistoryExportOptions = {}): Promise<string> {
      return exportHistoryData(state.entries, options)
    },

    async importHistory(data: string, format: 'json' | 'csv' | 'txt' = 'json'): Promise<number> {
      let importedEntries: HistoryEntry[] = []

      try {
        switch (format) {
          case 'json': {
            const parsed: unknown = JSON.parse(data)
            if (Array.isArray(parsed)) {
              importedEntries = parsed
                .filter(
                  (entry): entry is StoredHistoryEntry =>
                    typeof entry === 'object' &&
                    entry !== null &&
                    typeof entry.command === 'string' &&
                    typeof entry.timestamp === 'string',
                )
                .map((entry: StoredHistoryEntry) => ({
                  ...entry,
                  timestamp: new Date(entry.timestamp),
                  id: entry.id || generateEntryId(state.entryIdCounter++),
                }))
            }
            break
          }

          case 'csv': {
            const lines = data.split('\n').filter(line => line.trim())
            if (lines.length > 1) {
              // Skip header row
              for (let i = 1; i < lines.length; i++) {
                const line = lines[i]
                if (line) {
                  const values = line.split(',')
                  if (values.length >= 3 && values[0] && values[1] && values[2]) {
                    const entry: HistoryEntry = {
                      id: generateEntryId(state.entryIdCounter++),
                      command: values[1].replaceAll(/^"|"$/g, '').replaceAll('""', '"'),
                      timestamp: new Date(values[0]),
                      workingDirectory: values[2],
                    }
                    importedEntries.push(entry)
                  }
                }
              }
            }
            break
          }

          case 'txt': {
            const lines = data.split('\n').filter(line => line.trim())
            for (const line of lines) {
              // Parse format: [timestamp] dir$ command
              const match = line.match(/^\[([^\]]+)\] ([^$]+)\$ (.+)$/)
              if (match && match[1] && match[2] && match[3]) {
                const entry: HistoryEntry = {
                  id: generateEntryId(state.entryIdCounter++),
                  command: match[3],
                  timestamp: new Date(match[1]),
                  workingDirectory: match[2],
                }
                importedEntries.push(entry)
              }
            }
            break
          }

          default:
            throw new Error(`Unsupported import format: ${format}`)
        }

        // Add imported entries
        state.entries.push(...importedEntries)

        // Remove duplicates if not allowed
        if (!state.config.allowDuplicates) {
          const seen = new Set<string>()
          state.entries = state.entries.filter(entry => {
            if (seen.has(entry.command)) {
              return false
            }
            seen.add(entry.command)
            return true
          })
        }

        // Cleanup and sort
        state.entries = cleanupEntries(state)
        state.entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

        saveState()
        emitEvent('imported', undefined, importedEntries.length)

        consola.debug(`Imported ${importedEntries.length} history entries from ${format} format`)
        return importedEntries.length
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        consola.error(`Failed to import history from ${format} format:`, errorMessage)
        throw new Error(`Import failed: ${errorMessage}`)
      }
    },

    async getRecent(count = 10): Promise<HistoryEntry[]> {
      return state.entries.slice(-count).reverse()
    },

    async getFrequent(count = 10): Promise<{command: string; count: number; lastUsed: Date}[]> {
      const commandCounts = new Map<string, {count: number; lastUsed: Date}>()

      for (const entry of state.entries) {
        const existing = commandCounts.get(entry.command)
        if (existing) {
          existing.count++
          if (entry.timestamp > existing.lastUsed) {
            existing.lastUsed = entry.timestamp
          }
        } else {
          commandCounts.set(entry.command, {count: 1, lastUsed: entry.timestamp})
        }
      }

      return Array.from(commandCounts.entries())
        .map(([command, stats]) => ({command, count: stats.count, lastUsed: stats.lastUsed}))
        .sort((a, b) => b.count - a.count)
        .slice(0, count)
    },

    async cleanup(): Promise<number> {
      const beforeCount = state.entries.length
      state.entries = cleanupEntries(state)
      const removedCount = beforeCount - state.entries.length

      if (removedCount > 0) {
        saveState()
        consola.debug(`Cleanup removed ${removedCount} history entries`)
      }

      return removedCount
    },

    async save(): Promise<void> {
      saveState()
    },

    async load(): Promise<void> {
      const loadedData = loadFromStorage(state.config)
      state.entries = loadedData.entries
      state.entryIdCounter = loadedData.entryIdCounter
      state.loaded = true

      // Cleanup after load
      state.entries = cleanupEntries(state)

      emitEvent('loaded', undefined, state.entries.length)
      consola.debug(`Loaded ${state.entries.length} history entries`)
    },
  }

  return manager
}
