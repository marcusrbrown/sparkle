import {useDebounce} from '@sparkle/utils'
import {consola} from 'consola'
import {useCallback, useEffect, useState} from 'react'

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
 *
 * @param config Configuration options for the command input handler
 * @param onCommandExecute Callback when a command is executed
 * @returns Command input state and action handlers
 */
export function useCommandInput(
  config: CommandInputConfig = {},
  onCommandExecute?: (command: string) => void,
): UseCommandInputResult {
  const {maxHistorySize = 100, prompt = '$ ', debounceDelay = 100, allowDuplicates = false} = config

  // Core state
  const [currentCommand, setCurrentCommand] = useState('')
  const [commandHistory, setCommandHistory] = useState<CommandHistoryEntry[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isBrowsingHistory, setIsBrowsingHistory] = useState(false)
  const [currentPrompt, setCurrentPrompt] = useState(prompt)
  const [cursorPosition, setCursorPosition] = useState(0)
  const [isReady] = useState(true)

  // Debounced command for performance optimization
  const debouncedCommand = useDebounce(currentCommand, debounceDelay)

  /**
   * Adds a command to the history with deduplication and size management.
   */
  const addToHistory = useCallback(
    (command: string) => {
      if (!command.trim()) return

      const entry: CommandHistoryEntry = {
        command: command.trim(),
        timestamp: new Date(),
        id: `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      }

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

        consola.debug(`Added command to history: "${entry.command}" (history size: ${newHistory.length})`)
        return newHistory
      })
    },
    [allowDuplicates, maxHistorySize],
  )

  /**
   * Execute the current command and add it to history.
   */
  const executeCommand = useCallback((): void => {
    const command = currentCommand.trim()
    if (!command) return

    consola.debug(`Executing command: "${command}"`)

    // Add to history
    addToHistory(command)

    // Reset state
    setCurrentCommand('')
    setCursorPosition(0)
    setHistoryIndex(-1)
    setIsBrowsingHistory(false)

    // Execute callback
    if (onCommandExecute) {
      try {
        onCommandExecute(command)
      } catch (error) {
        consola.error('Error executing command callback:', error)
      }
    }
  }, [currentCommand, addToHistory, onCommandExecute])

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
  const clearHistory = useCallback(() => {
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
  }
}
