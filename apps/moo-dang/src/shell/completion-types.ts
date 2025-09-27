/**
 * Types and interfaces for shell command completion and suggestion system.
 *
 * This module provides the foundation for intelligent command completion including
 * command names, file paths, arguments, options, and environment variables.
 * Designed to work seamlessly with the xterm.js terminal and shell worker.
 */

/**
 * Available completion types for categorizing different kinds of suggestions.
 */
export const COMPLETION_TYPES = ['command', 'file', 'directory', 'argument', 'option', 'environment', 'alias'] as const

/**
 * Types of completions that can be suggested to users.
 */
export type CompletionType = (typeof COMPLETION_TYPES)[number]

/**
 * Available priority levels for ordering completion suggestions.
 */
export const COMPLETION_PRIORITIES = ['high', 'medium', 'low'] as const

/**
 * Priority levels for completion suggestions ordering.
 */
export type CompletionPriority = (typeof COMPLETION_PRIORITIES)[number]

/**
 * Individual completion suggestion with metadata.
 */
export interface CompletionSuggestion {
  /** The text to insert when this completion is selected */
  readonly text: string
  /** Type of completion for categorization and styling */
  readonly type: CompletionType
  /** Human-readable description of the completion */
  readonly description: string
  /** Priority for ordering suggestions */
  readonly priority: CompletionPriority
  /** Additional context or usage information */
  readonly detail?: string
  /** Whether this completion requires additional input */
  readonly requiresSpace?: boolean
  /** Replacement range in the original input */
  readonly range?: CompletionRange
}

/**
 * Range specification for completion replacement.
 */
export interface CompletionRange {
  /** Start position (inclusive) */
  readonly start: number
  /** End position (exclusive) */
  readonly end: number
}

/**
 * Context information for generating completions.
 */
export interface CompletionContext {
  /** Full command line input */
  readonly input: string
  /** Current cursor position in the input */
  readonly cursorPosition: number
  /** Parsed command parts */
  readonly commandParts: string[]
  /** Index of the current command part being completed */
  readonly currentPartIndex: number
  /** Text of the current part being completed */
  readonly currentPart: string
  /** Working directory for file completion */
  readonly workingDirectory: string
  /** Available environment variables */
  readonly environmentVariables: Record<string, string>
  /** Whether we're at the start of a new command */
  readonly isNewCommand: boolean
}

/**
 * Result of completion generation including suggestions and metadata.
 */
export interface CompletionResult {
  /** Array of completion suggestions */
  readonly suggestions: CompletionSuggestion[]
  /** Whether there are more suggestions available */
  readonly hasMore: boolean
  /** Original context that generated these completions */
  readonly context: CompletionContext
  /** Common prefix that can be auto-completed */
  readonly commonPrefix?: string
}

/**
 * Configuration for completion behavior.
 */
export interface CompletionConfig {
  /** Maximum number of suggestions to return */
  readonly maxSuggestions: number
  /** Minimum input length before showing completions */
  readonly minInputLength: number
  /** Whether to show descriptions in completion display */
  readonly showDescriptions: boolean
  /** Whether to auto-complete common prefixes */
  readonly autoCompletePrefix: boolean
  /** Case sensitivity for matching */
  readonly caseSensitive: boolean
  /** Whether to include hidden files in file completions */
  readonly includeHiddenFiles: boolean
}

/**
 * Provider interface for generating specific types of completions.
 */
export interface CompletionProvider {
  /** Unique identifier for this provider */
  readonly id: string
  /** Human-readable name for this provider */
  readonly name: string
  /** Types of completions this provider handles */
  readonly supportedTypes: CompletionType[]
  /** Priority of this provider relative to others */
  readonly priority: CompletionPriority

  /**
   * Generate completion suggestions for the given context.
   *
   * @param context - Current completion context
   * @param config - Configuration for completion behavior
   * @returns Promise resolving to completion suggestions
   */
  readonly getCompletions: (context: CompletionContext, config: CompletionConfig) => Promise<CompletionSuggestion[]>

  /**
   * Check if this provider should handle the given context.
   *
   * @param context - Current completion context
   * @returns Whether this provider should generate completions
   */
  readonly canComplete: (context: CompletionContext) => boolean
}

/**
 * Main completion engine interface.
 */
export interface CompletionEngine {
  /** Configuration for completion behavior */
  readonly config: CompletionConfig

  /**
   * Register a completion provider with the engine.
   *
   * @param provider - Provider to register
   */
  readonly registerProvider: (provider: CompletionProvider) => void

  /**
   * Unregister a completion provider from the engine.
   *
   * @param providerId - ID of provider to unregister
   */
  readonly unregisterProvider: (providerId: string) => void

  /**
   * Get all registered providers.
   *
   * @returns Array of registered providers
   */
  readonly getProviders: () => CompletionProvider[]

  /**
   * Generate completion suggestions for the given input and context.
   *
   * @param input - Current command line input
   * @param cursorPosition - Current cursor position
   * @param workingDirectory - Current working directory
   * @param environmentVariables - Available environment variables
   * @returns Promise resolving to completion result
   */
  readonly getCompletions: (
    input: string,
    cursorPosition: number,
    workingDirectory: string,
    environmentVariables: Record<string, string>,
  ) => Promise<CompletionResult>

  /**
   * Apply a completion suggestion to the input.
   *
   * @param input - Original input
   * @param suggestion - Suggestion to apply
   * @param cursorPosition - Current cursor position
   * @returns New input with completion applied and new cursor position
   */
  readonly applySuggestion: (
    input: string,
    suggestion: CompletionSuggestion,
    cursorPosition: number,
  ) => {newInput: string; newCursorPosition: number}
}

/**
 * Event interface for completion-related events.
 */
export interface CompletionEvent {
  /** Type of completion event */
  readonly type: 'request' | 'result' | 'apply' | 'cancel'
  /** Context when the event occurred */
  readonly context: CompletionContext
  /** Suggestions involved in the event (if applicable) */
  readonly suggestions?: CompletionSuggestion[]
  /** Applied suggestion (for 'apply' events) */
  readonly appliedSuggestion?: CompletionSuggestion
}

/**
 * Listener function for completion events.
 */
export type CompletionEventListener = (event: CompletionEvent) => void

/**
 * Options for completion display and interaction.
 */
export interface CompletionDisplayOptions {
  /** Maximum number of visible suggestions */
  readonly maxVisible: number
  /** Whether to show type icons */
  readonly showIcons: boolean
  /** Whether to show descriptions */
  readonly showDescriptions: boolean
  /** Whether to show detailed information */
  readonly showDetails: boolean
  /** Theme for completion display */
  readonly theme: 'light' | 'dark' | 'auto'
}
