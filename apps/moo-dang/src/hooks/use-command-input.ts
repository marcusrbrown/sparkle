import type {CompletionEngine, CompletionResult, CompletionSuggestion} from '../shell/completion-types'
import type {HistoryManager} from '../shell/history-types'

import {useDebounce} from '@sparkle/utils'
import {consola} from 'consola'
import {useCallback, useEffect, useRef, useState} from 'react'
import {createHistoryManager} from '../shell/history-manager'

/**
 * Represents a command in the command history.
 */
export interface CommandHistoryEntry {
  /** The command text that was entered */
  command: string
  /** Timestamp when the command was entered */
  timestamp: Date
  /** Unique identifier for the command */
  id: string
}

/**
 * Configuration options for the command input handler.
 */
export interface CommandInputConfig {
  /** Maximum number of commands to keep in history (default: 100) */
  maxHistorySize?: number
  /** Initial prompt string (default: "$ ") */
  prompt?: string
  /** Debounce delay for command processing in milliseconds (default: 100) */
  debounceDelay?: number
  /** Whether to store duplicate commands in history (default: false) */
  allowDuplicates?: boolean
  /** Whether to enable Tab completion */
  enableTabCompletion?: boolean
  /** Whether to show completion suggestions automatically */
  autoShowCompletions?: boolean
  /** Minimum characters before showing completions */
  minCompletionLength?: number
  /** Maximum number of suggestions to display */
  maxDisplaySuggestions?: number
  /** Auto-complete common prefix on Tab */
  autoCompletePrefix?: boolean
}

/**
 * Completion state information.
 */
export interface CompletionState {
  /** Whether completion is active */
  isActive: boolean
  /** Current completion result */
  result: CompletionResult | null
  /** Index of selected suggestion */
  selectedIndex: number
  /** Whether completions are currently being fetched */
  isLoading: boolean
  /** Error message if completion failed */
  error: string | null
}

/**
 * State and handlers for terminal command input.
 */
export interface CommandInputState {
  /** Current command being typed */
  currentCommand: string
  /** Array of previous commands */
  commandHistory: CommandHistoryEntry[]
  /** Current position in command history (-1 = not browsing history) */
  historyIndex: number
  /** Whether we're currently browsing command history */
  isBrowsingHistory: boolean
  /** Current prompt string */
  prompt: string
  /** Current cursor position in the command */
  cursorPosition: number
  /** Whether the command input is ready */
  isReady: boolean
  /** Current completion state */
  completion: CompletionState
}

/**
 * Actions available for command input handling.
 */
export interface CommandInputActions {
  /** Execute the current command */
  executeCommand: () => void
  /** Update the current command text */
  setCommand: (command: string) => void
  /** Clear the current command */
  clearCommand: () => void
  /** Navigate up in command history */
  navigateHistoryUp: () => void
  /** Navigate down in command history */
  navigateHistoryDown: () => void
  /** Move cursor left */
  moveCursorLeft: () => void
  /** Move cursor right */
  moveCursorRight: () => void
  /** Move cursor to beginning of line */
  moveCursorToStart: () => void
  /** Move cursor to end of line */
  moveCursorToEnd: () => void
  /** Delete character at cursor position */
  deleteCharacterAtCursor: () => void
  /** Delete character before cursor position */
  deleteCharacterBeforeCursor: () => void
  /** Insert character at cursor position */
  insertCharacterAtCursor: (char: string) => void
  /** Clear the command history */
  clearHistory: () => void
  /** Set the prompt string */
  setPrompt: (prompt: string) => void
  /** Trigger completion for current input */
  requestCompletion: () => Promise<void>
  /** Apply the currently selected completion */
  applyCompletion: () => void
  /** Move selection up in completion list */
  selectPrevious: () => void
  /** Move selection down in completion list */
  selectNext: () => void
  /** Cancel current completion */
  cancelCompletion: () => void
  /** Set completion engine */
  setCompletionEngine: (engine: CompletionEngine | null) => void
}

/**
 * Result type for the useCommandInput hook.
 */
export interface UseCommandInputResult extends CommandInputState, CommandInputActions {
  /** Debounced version of current command for performance */
  debouncedCommand: string
}

/**
 * Custom hook for handling terminal command input, history, and cursor management.
 *
 * This hook provides comprehensive command-line interface functionality including:
 * - Command input buffer management
 * - Command history with navigation
 * - Cursor positioning and line editing
 * - Keyboard shortcut handling
 * - Debounced command processing for performance
 * - Intelligent completion suggestions with Tab completion
 *
 * @param config Configuration options for the command input handler
 * @param onCommandExecute Callback when a command is executed
 * @param workingDirectory Current working directory for file completion
 * @param environmentVariables Environment variables for completion context
 * @returns Command input state and action handlers
 */
export function useCommandInput(
  config: CommandInputConfig = {},
  onCommandExecute?: (command: string) => void,
  workingDirectory = '/',
  environmentVariables: Record<string, string> = {},
): UseCommandInputResult {
  const {
    maxHistorySize = 100,
    prompt = '$ ',
    debounceDelay = 100,
    allowDuplicates = false,
    enableTabCompletion = true,
    autoShowCompletions = false,
    minCompletionLength = 0,
    maxDisplaySuggestions = 10,
    autoCompletePrefix = true,
  } = config

  // Core state
  const [currentCommand, setCurrentCommand] = useState('')
  const [commandHistory, setCommandHistory] = useState<CommandHistoryEntry[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isBrowsingHistory, setIsBrowsingHistory] = useState(false)

  // History manager for persistence and advanced features
  const historyManagerRef = useRef<HistoryManager | null>(null)

  // Initialize history manager
  useEffect(() => {
    if (historyManagerRef.current == null) {
      historyManagerRef.current = createHistoryManager({
        maxHistorySize,
        persist: true,
        allowDuplicates,
        enableSearch: true,
        maxAgeDays: 30,
      } as const)

      // Load persisted history
      historyManagerRef.current
        .getHistory()
        .then(entries => {
          const historyEntries: CommandHistoryEntry[] = entries.map(entry => ({
            id: entry.id,
            command: entry.command,
            timestamp: entry.timestamp,
          }))
          setCommandHistory(historyEntries)
        })
        .catch(error => {
          consola.error('Failed to load command history:', error)
        })
    }
  }, [maxHistorySize, allowDuplicates])
  const [currentPrompt, setCurrentPrompt] = useState(prompt)
  const [cursorPosition, setCursorPosition] = useState(0)
  const [isReady] = useState(true)

  // Completion state
  const [completionState, setCompletionState] = useState<CompletionState>({
    isActive: false,
    result: null,
    selectedIndex: 0,
    isLoading: false,
    error: null,
  })

  // Completion engine reference
  const completionEngineRef = useRef<CompletionEngine | null>(null)

  // Track if we're in the middle of applying a completion
  const isApplyingCompletionRef = useRef(false)

  // Debounced command for performance optimization
  const debouncedCommand = useDebounce(currentCommand, debounceDelay)

  /**
   * Request completion suggestions for the current input.
   */
  const requestCompletion = useCallback(async (): Promise<void> => {
    const engine = completionEngineRef.current
    if (!engine) {
      consola.debug('No completion engine available')
      return
    }

    // Don't trigger completion if input is too short
    if (currentCommand.length < minCompletionLength) {
      setCompletionState(prev => ({
        ...prev,
        isActive: false,
        result: null,
      }))
      return
    }

    setCompletionState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }))

    try {
      const result = await engine.getCompletions(currentCommand, cursorPosition, workingDirectory, environmentVariables)

      // Limit displayed suggestions
      const limitedSuggestions = result.suggestions.slice(0, maxDisplaySuggestions)
      const limitedResult: CompletionResult = {
        ...result,
        suggestions: limitedSuggestions,
        hasMore: result.suggestions.length > maxDisplaySuggestions,
      }

      setCompletionState(prev => ({
        ...prev,
        isActive: limitedResult.suggestions.length > 0,
        result: limitedResult,
        selectedIndex: 0,
        isLoading: false,
      }))

      consola.debug(`Completion request completed: ${limitedResult.suggestions.length} suggestions`)
    } catch (error) {
      consola.error('Completion request failed:', error)
      setCompletionState(prev => ({
        ...prev,
        isActive: false,
        result: null,
        isLoading: false,
        error: error instanceof Error ? error.message : String(error),
      }))
    }
  }, [
    currentCommand,
    cursorPosition,
    workingDirectory,
    environmentVariables,
    minCompletionLength,
    maxDisplaySuggestions,
  ])

  /**
   * Apply the currently selected completion suggestion.
   */
  const applyCompletion = useCallback((): void => {
    const engine = completionEngineRef.current
    const {result, selectedIndex} = completionState

    if (!engine || !result || selectedIndex < 0 || selectedIndex >= result.suggestions.length) {
      return
    }

    const suggestion = result.suggestions[selectedIndex]
    if (!suggestion) {
      return
    }

    try {
      isApplyingCompletionRef.current = true

      const {newInput} = engine.applySuggestion(currentCommand, suggestion, cursorPosition)

      setCurrentCommand(newInput)
      setCursorPosition(newInput.length)
      setHistoryIndex(-1)
      setIsBrowsingHistory(false)

      setCompletionState(prev => ({
        ...prev,
        isActive: false,
        result: null,
      }))

      consola.debug(`Applied completion: "${suggestion.text}" -> "${newInput}"`)
    } catch (error) {
      consola.error('Failed to apply completion:', error)
    } finally {
      isApplyingCompletionRef.current = false
    }
  }, [completionState, currentCommand, cursorPosition])

  /**
   * Move selection to previous suggestion.
   */
  const selectPrevious = useCallback((): void => {
    setCompletionState(prev => {
      if (!prev.result || prev.result.suggestions.length === 0) {
        return prev
      }

      const newIndex = prev.selectedIndex <= 0 ? prev.result.suggestions.length - 1 : prev.selectedIndex - 1

      return {
        ...prev,
        selectedIndex: newIndex,
      }
    })
  }, [])

  /**
   * Move selection to next suggestion.
   */
  const selectNext = useCallback((): void => {
    setCompletionState(prev => {
      if (!prev.result || prev.result.suggestions.length === 0) {
        return prev
      }

      const newIndex = prev.selectedIndex >= prev.result.suggestions.length - 1 ? 0 : prev.selectedIndex + 1

      return {
        ...prev,
        selectedIndex: newIndex,
      }
    })
  }, [])

  /**
   * Cancel the current completion.
   */
  const cancelCompletion = useCallback((): void => {
    setCompletionState(prev => ({
      ...prev,
      isActive: false,
      result: null,
    }))
  }, [])

  /**
   * Set the completion engine.
   */
  const setCompletionEngine = useCallback((engine: CompletionEngine | null): void => {
    completionEngineRef.current = engine

    setCompletionState(prev => ({
      ...prev,
      isActive: false,
      result: null,
    }))

    consola.debug(`Completion engine ${engine ? 'set' : 'cleared'}`)
  }, [])

  /**
   * Adds a command to the history with deduplication and size management.
   */
  const addToHistory = useCallback(
    async (command: string) => {
      if (!command.trim()) return

      const entry: CommandHistoryEntry = {
        command: command.trim(),
        timestamp: new Date(),
        id: `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      }

      // Add to persistent history manager
      if (historyManagerRef.current) {
        try {
          await historyManagerRef.current.addCommand(entry.command, {
            workingDirectory,
            metadata: {
              sessionId: `session-${Date.now()}`,
              interactive: true,
            },
          })

          // Update local history state
          const updatedHistory = await historyManagerRef.current.getHistory()
          const historyEntries: CommandHistoryEntry[] = updatedHistory.map(historyEntry => ({
            id: historyEntry.id,
            command: historyEntry.command,
            timestamp: historyEntry.timestamp,
          }))
          setCommandHistory(historyEntries)

          consola.debug(`Added command to persistent history: "${entry.command}"`)
        } catch (error) {
          consola.error('Failed to add command to history:', error)

          // Fall back to local-only history
          setCommandHistory(prev => {
            let newHistory = [...prev]

            // Remove duplicate if not allowing duplicates
            if (!allowDuplicates) {
              newHistory = newHistory.filter(cmd => cmd.command !== entry.command)
            }

            // Add new command to the end
            newHistory.push(entry)

            // Trim to max size if necessary
            if (newHistory.length > maxHistorySize) {
              newHistory = newHistory.slice(-maxHistorySize)
            }

            return newHistory
          })
        }
      } else {
        // Fall back to local-only history if manager not available
        setCommandHistory(prev => {
          let newHistory = [...prev]

          if (!allowDuplicates) {
            newHistory = newHistory.filter(cmd => cmd.command !== entry.command)
          }

          newHistory.push(entry)

          if (newHistory.length > maxHistorySize) {
            newHistory = newHistory.slice(-maxHistorySize)
          }

          consola.debug(`Added command to local history: "${entry.command}" (history size: ${newHistory.length})`)
          return newHistory
        })
      }
    },
    [allowDuplicates, maxHistorySize, workingDirectory],
  )

  /**
   * Execute the current command and add it to history.
   * Enhanced to handle Tab completion behavior.
   */
  const executeCommand = useCallback((): void => {
    // If completion is active and Tab completion is enabled, apply completion
    if (enableTabCompletion && completionState.isActive && completionState.result) {
      // Try auto-complete with common prefix first
      if (autoCompletePrefix && completionState.result.commonPrefix && completionState.result.commonPrefix.length > 0) {
        const engine = completionEngineRef.current
        if (engine) {
          const prefixSuggestion: CompletionSuggestion = {
            text: completionState.result.commonPrefix,
            type: 'command',
            description: 'Common prefix',
            priority: 'high',
          }

          try {
            const {newInput} = engine.applySuggestion(currentCommand, prefixSuggestion, cursorPosition)

            setCurrentCommand(newInput)
            setCursorPosition(newInput.length)
            setHistoryIndex(-1)
            setIsBrowsingHistory(false)
            return // Don't execute the command, just complete the prefix
          } catch (error) {
            consola.error('Failed to apply prefix completion:', error)
          }
        }
      }

      // Otherwise apply the selected completion
      applyCompletion()
      return
    }

    // Normal command execution
    const command = currentCommand.trim()
    if (!command) return

    consola.debug(`Executing command: "${command}"`)

    // Add to history (async but don't wait)
    addToHistory(command).catch(error => {
      consola.error('Failed to add command to history:', error)
    })

    // Reset state
    setCurrentCommand('')
    setCursorPosition(0)
    setHistoryIndex(-1)
    setIsBrowsingHistory(false)

    // Clear completion state
    setCompletionState(prev => ({
      ...prev,
      isActive: false,
      result: null,
    }))

    if (onCommandExecute) {
      try {
        onCommandExecute(command)
      } catch (error) {
        consola.error('Error executing command callback:', error)
      }
    }
  }, [
    currentCommand,
    addToHistory,
    onCommandExecute,
    enableTabCompletion,
    autoCompletePrefix,
    completionState,
    applyCompletion,
    cursorPosition,
  ])

  /**
   * Update the current command text and reset history browsing.
   */
  const setCommand = useCallback((command: string): void => {
    setCurrentCommand(command)
    setCursorPosition(command.length)
    setHistoryIndex(-1)
    setIsBrowsingHistory(false)
  }, [])

  /**
   * Clear the current command.
   */
  const clearCommand = useCallback((): void => {
    setCurrentCommand('')
    setCursorPosition(0)
    setHistoryIndex(-1)
    setIsBrowsingHistory(false)
  }, [])

  /**
   * Navigate up in command history.
   */
  const navigateHistoryUp = useCallback((): void => {
    if (commandHistory.length === 0) return

    const newIndex = isBrowsingHistory ? Math.max(0, historyIndex - 1) : commandHistory.length - 1

    const command = commandHistory[newIndex]?.command || ''
    setCurrentCommand(command)
    setCursorPosition(command.length)
    setHistoryIndex(newIndex)
    setIsBrowsingHistory(true)

    consola.debug(`History up: index ${newIndex}, command: "${command}"`)
  }, [commandHistory, historyIndex, isBrowsingHistory])

  /**
   * Navigate down in command history.
   */
  const navigateHistoryDown = useCallback((): void => {
    if (!isBrowsingHistory) return

    if (historyIndex >= commandHistory.length - 1) {
      // At the bottom, clear command
      setCurrentCommand('')
      setCursorPosition(0)
      setHistoryIndex(-1)
      setIsBrowsingHistory(false)
      consola.debug('History down: cleared command')
    } else {
      const newIndex = historyIndex + 1
      const command = commandHistory[newIndex]?.command || ''
      setCurrentCommand(command)
      setCursorPosition(command.length)
      setHistoryIndex(newIndex)
      consola.debug(`History down: index ${newIndex}, command: "${command}"`)
    }
  }, [commandHistory, historyIndex, isBrowsingHistory])

  /**
   * Move cursor left in the current command.
   */
  const moveCursorLeft = useCallback(() => {
    setCursorPosition(prev => Math.max(0, prev - 1))
  }, [])

  /**
   * Move cursor right in the current command.
   */
  const moveCursorRight = useCallback(() => {
    setCursorPosition(prev => Math.min(currentCommand.length, prev + 1))
  }, [currentCommand.length])

  /**
   * Move cursor to the beginning of the line.
   */
  const moveCursorToStart = useCallback(() => {
    setCursorPosition(0)
  }, [])

  /**
   * Move cursor to the end of the line.
   */
  const moveCursorToEnd = useCallback(() => {
    setCursorPosition(currentCommand.length)
  }, [currentCommand.length])

  /**
   * Delete character at cursor position.
   */
  const deleteCharacterAtCursor = useCallback(() => {
    if (cursorPosition < currentCommand.length) {
      const newCommand = currentCommand.slice(0, cursorPosition) + currentCommand.slice(cursorPosition + 1)
      setCurrentCommand(newCommand)
      setHistoryIndex(-1)
      setIsBrowsingHistory(false)
    }
  }, [currentCommand, cursorPosition])

  /**
   * Delete character before cursor position (backspace).
   */
  const deleteCharacterBeforeCursor = useCallback(() => {
    if (cursorPosition > 0) {
      const newCommand = currentCommand.slice(0, cursorPosition - 1) + currentCommand.slice(cursorPosition)
      setCurrentCommand(newCommand)
      setCursorPosition(prev => prev - 1)
      setHistoryIndex(-1)
      setIsBrowsingHistory(false)
    }
  }, [currentCommand, cursorPosition])

  /**
   * Insert character at cursor position.
   */
  const insertCharacterAtCursor = useCallback(
    (char: string) => {
      const newCommand = currentCommand.slice(0, cursorPosition) + char + currentCommand.slice(cursorPosition)
      setCurrentCommand(newCommand)
      setCursorPosition(prev => prev + char.length)
      setHistoryIndex(-1)
      setIsBrowsingHistory(false)
    },
    [currentCommand, cursorPosition],
  )

  /**
   * Clear the entire command history.
   */
  const clearHistory = useCallback(async () => {
    if (historyManagerRef.current) {
      try {
        const removedCount = await historyManagerRef.current.clearHistory()
        consola.debug(`Cleared ${removedCount} commands from persistent history`)
      } catch (error) {
        consola.error('Failed to clear persistent history:', error)
      }
    }

    setCommandHistory([])
    setHistoryIndex(-1)
    setIsBrowsingHistory(false)
    consola.debug('Command history cleared')
  }, [])

  /**
   * Set the prompt string.
   */
  const setPrompt = useCallback((newPrompt: string): void => {
    setCurrentPrompt(newPrompt)
    consola.debug(`Prompt updated: "${newPrompt}"`)
  }, [])

  // Auto-trigger completions when enabled
  useEffect(() => {
    if (!autoShowCompletions || isApplyingCompletionRef.current) {
      return
    }

    // Debounce completion requests
    const timer = setTimeout(() => {
      if (currentCommand.length >= minCompletionLength) {
        requestCompletion()
      } else {
        setCompletionState(prev => ({
          ...prev,
          isActive: false,
          result: null,
        }))
      }
    }, 150) // Short delay to avoid excessive requests

    return () => clearTimeout(timer)
  }, [currentCommand, autoShowCompletions, minCompletionLength, requestCompletion])

  // Update cursor position when command changes externally
  useEffect(() => {
    if (cursorPosition > currentCommand.length) {
      setCursorPosition(currentCommand.length)
    }
  }, [currentCommand.length, cursorPosition])

  return {
    // State
    currentCommand,
    commandHistory,
    historyIndex,
    isBrowsingHistory,
    prompt: currentPrompt,
    cursorPosition,
    isReady,
    debouncedCommand,
    completion: completionState,
    // Actions
    executeCommand,
    setCommand,
    clearCommand,
    navigateHistoryUp,
    navigateHistoryDown,
    moveCursorLeft,
    moveCursorRight,
    moveCursorToStart,
    moveCursorToEnd,
    deleteCharacterAtCursor,
    deleteCharacterBeforeCursor,
    insertCharacterAtCursor,
    clearHistory,
    setPrompt,
    // Completion actions
    requestCompletion,
    applyCompletion,
    selectPrevious,
    selectNext,
    cancelCompletion,
    setCompletionEngine,
  }
}
