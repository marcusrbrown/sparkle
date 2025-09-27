/**
 * History management types and interfaces for shell command history.
 *
 * Provides type-safe interfaces for command history persistence, search functionality,
 * and history management operations in the moo-dang WASM shell.
 */

/**
 * Configuration options for shell command history management.
 */
export interface HistoryConfig {
  /** Maximum number of commands to keep in history (default: 1000) */
  maxHistorySize?: number
  /** Whether to persist history across browser sessions (default: true) */
  persist?: boolean
  /** Storage key for persistence (default: 'moo-dang-history') */
  storageKey?: string
  /** Whether to store duplicate commands (default: false) */
  allowDuplicates?: boolean
  /** Whether to enable history search functionality (default: true) */
  enableSearch?: boolean
  /** Maximum age of history entries in days before cleanup (default: 30) */
  maxAgeDays?: number
  /** Whether to save sensitive commands (commands starting with space) (default: false) */
  saveSensitive?: boolean
}

/**
 * Enhanced history entry with persistence metadata.
 * Extends the basic CommandHistoryEntry with additional metadata for persistence and search.
 */
export interface HistoryEntry {
  /** Unique identifier for the history entry */
  id: string
  /** The command text that was entered */
  command: string
  /** Timestamp when the command was executed */
  timestamp: Date
  /** Working directory when command was executed */
  workingDirectory: string
  /** Exit code of the command (if available) */
  exitCode?: number
  /** Duration of command execution in milliseconds */
  duration?: number
  /** Whether the command was executed successfully */
  success?: boolean
  /** Optional metadata for the command */
  metadata?: {
    /** User who executed the command */
    user?: string
    /** Session identifier */
    sessionId?: string
    /** Whether command was executed interactively */
    interactive?: boolean
    /** Tags for categorizing the command */
    tags?: string[]
  }
}

/**
 * Options for searching through command history.
 */
export interface HistorySearchOptions {
  /** Search query string */
  query: string
  /** Whether to use case-sensitive search (default: false) */
  caseSensitive?: boolean
  /** Whether to use regular expression search (default: false) */
  useRegex?: boolean
  /** Search only in command text or include metadata (default: 'command') */
  searchIn?: 'command' | 'all'
  /** Maximum number of results to return (default: 100) */
  maxResults?: number
  /** Date range for search */
  dateRange?: {
    /** Start date for search range */
    from?: Date
    /** End date for search range */
    to?: Date
  }
  /** Filter by working directory */
  workingDirectory?: string
  /** Filter by success status */
  success?: boolean
  /** Filter by exit code */
  exitCode?: number
}

/**
 * Result of a history search operation.
 */
export interface HistorySearchResult {
  /** Matching history entries */
  entries: HistoryEntry[]
  /** Total number of matches (may be more than entries.length due to maxResults) */
  totalMatches: number
  /** Search query that was used */
  query: string
  /** Whether the results were truncated due to maxResults */
  truncated: boolean
  /** Search execution time in milliseconds */
  searchTime: number
}

/**
 * Statistics about the command history.
 */
export interface HistoryStats {
  /** Total number of commands in history */
  totalCommands: number
  /** Number of unique commands */
  uniqueCommands: number
  /** Date of oldest command */
  oldestCommand?: Date
  /** Date of newest command */
  newestCommand?: Date
  /** Most frequently used commands */
  topCommands: {
    command: string
    count: number
    lastUsed: Date
  }[]
  /** Average commands per day */
  averagePerDay: number
  /** Total storage size in bytes */
  storageSize: number
}

/**
 * Options for history export operations.
 */
export interface HistoryExportOptions {
  /** Format for export (default: 'json') */
  format?: 'json' | 'csv' | 'txt'
  /** Whether to include metadata (default: true) */
  includeMetadata?: boolean
  /** Date range for export */
  dateRange?: {
    from?: Date
    to?: Date
  }
  /** Filter by working directory */
  workingDirectory?: string
  /** Whether to include only successful commands */
  successfulOnly?: boolean
}

/**
 * Main interface for command history management.
 * Provides comprehensive history operations including persistence, search, and analytics.
 */
export interface HistoryManager {
  /** Add a new command to history */
  addCommand: (command: string, metadata?: Partial<HistoryEntry>) => Promise<void>
  /** Get all history entries */
  getHistory: () => Promise<HistoryEntry[]>
  /** Search history with various filters and options */
  searchHistory: (options: HistorySearchOptions) => Promise<HistorySearchResult>
  /** Clear all or filtered history entries */
  clearHistory: (filter?: Partial<HistoryEntry>) => Promise<number>
  /** Remove a specific history entry by ID */
  removeEntry: (id: string) => Promise<boolean>
  /** Get history statistics and analytics */
  getStats: () => Promise<HistoryStats>
  /** Export history in various formats */
  exportHistory: (options?: HistoryExportOptions) => Promise<string>
  /** Import history from exported data */
  importHistory: (data: string, format?: 'json' | 'csv' | 'txt') => Promise<number>
  /** Get recent commands (default: last 10) */
  getRecent: (count?: number) => Promise<HistoryEntry[]>
  /** Get frequently used commands */
  getFrequent: (count?: number) => Promise<{command: string; count: number; lastUsed: Date}[]>
  /** Cleanup old entries based on age and size limits */
  cleanup: () => Promise<number>
  /** Force save current history to storage */
  save: () => Promise<void>
  /** Reload history from storage */
  load: () => Promise<void>
}

/**
 * Internal state for history management.
 */
export interface HistoryState {
  /** Configuration options */
  config: Required<HistoryConfig>
  /** Current history entries */
  entries: HistoryEntry[]
  /** Entry ID counter for generating unique IDs */
  entryIdCounter: number
  /** Whether history has been loaded from storage */
  loaded: boolean
  /** Last save timestamp */
  lastSave: Date
  /** Session identifier */
  sessionId: string
}

/**
 * History change event types.
 */
export type HistoryEventType = 'added' | 'removed' | 'cleared' | 'imported' | 'loaded'

/**
 * History change event data.
 */
export interface HistoryEvent {
  /** Type of history change */
  type: HistoryEventType
  /** Entry that was affected (for 'added' and 'removed' events) */
  entry?: HistoryEntry
  /** Number of entries affected */
  count: number
  /** Timestamp of the event */
  timestamp: Date
}

/**
 * History event listener callback.
 */
export type HistoryEventListener = (event: HistoryEvent) => void

/**
 * Interface for history event management.
 */
export interface HistoryEventManager {
  /** Add an event listener */
  addEventListener: (type: HistoryEventType, listener: HistoryEventListener) => void
  /** Remove an event listener */
  removeEventListener: (type: HistoryEventType, listener: HistoryEventListener) => void
  /** Emit a history event */
  emit: (event: HistoryEvent) => void
}
