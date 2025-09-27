/**
 * Core completion engine implementation for shell command completion.
 *
 * This module provides the main completion engine that coordinates multiple
 * completion providers to generate intelligent suggestions for command input.
 * Designed for high performance and extensibility in the browser environment.
 */

import type {
  CompletionConfig,
  CompletionContext,
  CompletionEngine,
  CompletionEvent,
  CompletionEventListener,
  CompletionProvider,
  CompletionResult,
  CompletionSuggestion,
} from './completion-types'

import {consola} from 'consola'

/**
 * Default configuration for completion behavior.
 */
const DEFAULT_COMPLETION_CONFIG: CompletionConfig = {
  maxSuggestions: 20,
  minInputLength: 0,
  showDescriptions: true,
  autoCompletePrefix: true,
  caseSensitive: false,
  includeHiddenFiles: false,
}

/**
 * Creates a completion context from input parameters.
 *
 * Parses the command line input and determines the context needed for
 * generating appropriate completions.
 */
function createCompletionContext(
  input: string,
  cursorPosition: number,
  workingDirectory: string,
  environmentVariables: Record<string, string>,
): CompletionContext {
  // Ensure cursor position is within bounds
  const safeCursorPosition = Math.max(0, Math.min(cursorPosition, input.length))

  // Get the part of the input up to the cursor for parsing
  const inputToCursor = input.slice(0, safeCursorPosition)

  // Parse command parts using simple whitespace splitting for now
  // TODO: Enhance with proper shell parsing that handles quotes, escaping, etc.
  const commandParts = inputToCursor
    .trim()
    .split(/\s+/)
    .filter(part => part.length > 0)

  // Determine which part we're currently completing
  let currentPartIndex = 0
  let currentPart = ''

  if (commandParts.length > 0) {
    // Check if cursor is after whitespace (starting new part)
    const lastChar = inputToCursor.slice(-1)
    const isAfterWhitespace = lastChar === ' ' || lastChar === '\t'

    if (isAfterWhitespace) {
      currentPartIndex = commandParts.length
      currentPart = ''
    } else {
      currentPartIndex = commandParts.length - 1
      currentPart = commandParts[currentPartIndex] ?? ''
    }
  }

  const isNewCommand = currentPartIndex === 0

  return {
    input,
    cursorPosition: safeCursorPosition,
    commandParts,
    currentPartIndex,
    currentPart,
    workingDirectory,
    environmentVariables,
    isNewCommand,
  }
}

/**
 * Finds the common prefix among completion suggestions.
 *
 * Used for auto-completion when multiple suggestions share a common start.
 */
function findCommonPrefix(suggestions: CompletionSuggestion[]): string {
  if (suggestions.length === 0) {
    return ''
  }

  if (suggestions.length === 1) {
    return suggestions[0]?.text ?? ''
  }

  const firstSuggestion = suggestions[0]
  if (!firstSuggestion) {
    return ''
  }

  let commonPrefix = firstSuggestion.text

  for (let i = 1; i < suggestions.length; i++) {
    const suggestion = suggestions[i]
    if (!suggestion) {
      continue
    }

    let j = 0
    while (j < commonPrefix.length && j < suggestion.text.length && commonPrefix[j] === suggestion.text[j]) {
      j++
    }

    commonPrefix = commonPrefix.slice(0, j)

    if (commonPrefix === '') {
      break
    }
  }

  return commonPrefix
}

/**
 * Sorts completion suggestions by priority and relevance.
 *
 * Uses a multi-criteria sorting algorithm considering priority, type,
 * and alphabetical order for consistent results.
 */
function sortSuggestions(suggestions: CompletionSuggestion[], context: CompletionContext): CompletionSuggestion[] {
  const priorityOrder = {high: 0, medium: 1, low: 2}

  return [...suggestions].sort((a, b) => {
    // First sort by priority
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (priorityDiff !== 0) {
      return priorityDiff
    }

    // Then by relevance (exact matches first)
    const aExactMatch = a.text.startsWith(context.currentPart)
    const bExactMatch = b.text.startsWith(context.currentPart)

    if (aExactMatch && !bExactMatch) {
      return -1
    }
    if (!aExactMatch && bExactMatch) {
      return 1
    }

    // Finally alphabetical order
    return a.text.localeCompare(b.text)
  })
}

/**
 * Main completion engine implementation.
 */
export class CompletionEngineImpl implements CompletionEngine {
  private readonly providers = new Map<string, CompletionProvider>()
  private readonly eventListeners = new Set<CompletionEventListener>()

  readonly config: CompletionConfig

  constructor(config: CompletionConfig = DEFAULT_COMPLETION_CONFIG) {
    this.config = config
  }

  readonly registerProvider = (provider: CompletionProvider): void => {
    if (this.providers.has(provider.id)) {
      consola.warn(`Completion provider with id '${provider.id}' is already registered`)
      return
    }

    this.providers.set(provider.id, provider)
    consola.debug(`Registered completion provider: ${provider.name} (${provider.id})`)
  }

  readonly unregisterProvider = (providerId: string): void => {
    if (!this.providers.has(providerId)) {
      consola.warn(`Completion provider with id '${providerId}' is not registered`)
      return
    }

    this.providers.delete(providerId)
    consola.debug(`Unregistered completion provider: ${providerId}`)
  }

  readonly getProviders = (): CompletionProvider[] => {
    return Array.from(this.providers.values())
  }

  readonly getCompletions = async (
    input: string,
    cursorPosition: number,
    workingDirectory: string,
    environmentVariables: Record<string, string>,
  ): Promise<CompletionResult> => {
    const context = createCompletionContext(input, cursorPosition, workingDirectory, environmentVariables)

    // Emit request event
    this.emitEvent({
      type: 'request',
      context,
    })

    try {
      // Skip completion if input is too short
      if (context.currentPart.length < this.config.minInputLength) {
        const result: CompletionResult = {
          suggestions: [],
          hasMore: false,
          context,
        }

        this.emitEvent({
          type: 'result',
          context,
          suggestions: result.suggestions,
        })

        return result
      }

      // Collect suggestions from all applicable providers
      const allSuggestions: CompletionSuggestion[] = []

      for (const provider of this.providers.values()) {
        try {
          if (!provider.canComplete(context)) {
            continue
          }

          const suggestions = await provider.getCompletions(context, this.config)
          allSuggestions.push(...suggestions)
        } catch (error) {
          consola.error(`Completion provider ${provider.id} failed:`, error)
        }
      }

      // Sort and limit suggestions
      const sortedSuggestions = sortSuggestions(allSuggestions, context)
      const limitedSuggestions = sortedSuggestions.slice(0, this.config.maxSuggestions)
      const hasMore = sortedSuggestions.length > this.config.maxSuggestions

      // Find common prefix for auto-completion
      const commonPrefix = this.config.autoCompletePrefix ? findCommonPrefix(limitedSuggestions) : undefined

      const result: CompletionResult = {
        suggestions: limitedSuggestions,
        hasMore,
        context,
        commonPrefix,
      }

      // Emit result event
      this.emitEvent({
        type: 'result',
        context,
        suggestions: result.suggestions,
      })

      return result
    } catch (error) {
      consola.error('Completion generation failed:', error)

      const result: CompletionResult = {
        suggestions: [],
        hasMore: false,
        context,
      }

      this.emitEvent({
        type: 'result',
        context,
        suggestions: result.suggestions,
      })

      return result
    }
  }

  readonly applySuggestion = (
    input: string,
    suggestion: CompletionSuggestion,
    cursorPosition: number,
  ): {newInput: string; newCursorPosition: number} => {
    const context = createCompletionContext(input, cursorPosition, '', {})

    try {
      let newInput: string
      let newCursorPosition: number

      if (suggestion.range) {
        // Use explicit range if provided
        const before = input.slice(0, suggestion.range.start)
        const after = input.slice(suggestion.range.end)
        newInput = before + suggestion.text + after
        newCursorPosition = suggestion.range.start + suggestion.text.length
      } else {
        // Replace current part being completed
        const beforeCursor = input.slice(0, cursorPosition)
        const afterCursor = input.slice(cursorPosition)

        // Find the start of the current part
        const words = beforeCursor.split(/\s+/)
        const currentWord = words.at(-1) ?? ''
        const wordStart = beforeCursor.lastIndexOf(currentWord)

        if (wordStart === -1) {
          // Fallback: insert at cursor position
          newInput = beforeCursor + suggestion.text + afterCursor
          newCursorPosition = cursorPosition + suggestion.text.length
        } else {
          const before = input.slice(0, wordStart)
          newInput = before + suggestion.text + afterCursor
          newCursorPosition = wordStart + suggestion.text.length
        }
      }

      // Add space if required by the suggestion
      if (suggestion.requiresSpace) {
        newInput = `${newInput.slice(0, newCursorPosition)} ${newInput.slice(newCursorPosition)}`
        newCursorPosition += 1
      }

      // Emit apply event
      this.emitEvent({
        type: 'apply',
        context,
        appliedSuggestion: suggestion,
      })

      return {newInput, newCursorPosition}
    } catch (error) {
      consola.error('Failed to apply completion suggestion:', error)

      // Return original input on error
      return {newInput: input, newCursorPosition: cursorPosition}
    }
  }

  /**
   * Add an event listener for completion events.
   */
  readonly addEventListener = (listener: CompletionEventListener): void => {
    this.eventListeners.add(listener)
  }

  /**
   * Remove an event listener for completion events.
   */
  readonly removeEventListener = (listener: CompletionEventListener): void => {
    this.eventListeners.delete(listener)
  }

  private emitEvent(event: CompletionEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event)
      } catch (error) {
        consola.error('Completion event listener failed:', error)
      }
    }
  }
}

/**
 * Creates a new completion engine with default configuration.
 */
export function createCompletionEngine(config?: Partial<CompletionConfig>): CompletionEngine {
  const fullConfig = {...DEFAULT_COMPLETION_CONFIG, ...config}
  return new CompletionEngineImpl(fullConfig)
}
