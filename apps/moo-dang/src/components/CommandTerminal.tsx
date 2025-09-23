import type {Terminal as XTerm} from '@xterm/xterm'
import type {XTermTheme} from './theme-utils'
import {cx, type HTMLProperties} from '@sparkle/ui'
import {consola} from 'consola'
import React, {useCallback, useEffect, useImperativeHandle, useRef, useState} from 'react'
import {useCommandInput, useTerminalOutput, type CommandInputConfig, type TerminalOutputType} from '../hooks'
import {
  clearCurrentLine,
  formatCommandLine,
  generateKeyboardShortcutsHelp,
  getTerminalCursorPosition,
  parseExtendedTerminalKey,
} from '../utils'
import {Terminal as BaseTerminal, type TerminalHandle as BaseTerminalHandle, type TerminalOptions} from './Terminal'

/**
 * Command terminal specific error interface with enhanced context.
 *
 * Provides structured error information for command terminal operations,
 * enabling better debugging and error recovery.
 */
export interface CommandTerminalError extends Error {
  readonly operation: string
  readonly cause?: unknown
}

/**
 * Creates a structured command terminal error with enhanced context.
 *
 * Uses functional approach instead of class inheritance for better
 * maintainability and adherence to project coding standards.
 *
 * @param message Error message describing what went wrong
 * @param operation The terminal operation that failed
 * @param cause Optional underlying cause of the error
 * @returns CommandTerminalError with structured information
 */
export function createCommandTerminalError(message: string, operation: string, cause?: unknown): CommandTerminalError {
  const error = new Error(`CommandTerminal ${operation}: ${message}`) as CommandTerminalError
  error.name = 'CommandTerminalError'

  // Use Object.defineProperty to set readonly properties
  Object.defineProperty(error, 'operation', {
    value: operation,
    writable: false,
    enumerable: true,
    configurable: false,
  })

  if (cause !== undefined) {
    Object.defineProperty(error, 'cause', {
      value: cause,
      writable: false,
      enumerable: true,
      configurable: false,
    })
  }

  return error
}

/**
 * Command history entry interface for better type safety.
 */
export interface CommandHistoryEntry {
  /** The executed command */
  command: string
  /** When the command was executed */
  timestamp: Date
  /** Unique identifier for the command */
  id: string
}

/**
 * Enhanced Terminal handle interface that includes command input functionality.
 */
export interface CommandTerminalHandle extends BaseTerminalHandle {
  /** Execute the current command */
  executeCommand: () => void
  /** Clear the current command input */
  clearCommand: () => void
  /** Set the current command */
  setCommand: (command: string) => void
  /** Get the current command */
  getCurrentCommand: () => string
  /** Clear command history */
  clearHistory: () => void
  /** Get command history */
  getHistory: () => CommandHistoryEntry[]
  /** Add output to the terminal */
  addOutput: (type: TerminalOutputType, content: string) => void
  /** Clear all terminal output */
  clearOutput: () => void
  /** Get all output entries */
  getOutputHistory: () => string
  /** Write formatted output directly to terminal */
  writeOutput: (content: string, formatted?: boolean) => void
}

/**
 * Props for the enhanced Terminal component with command input handling.
 *
 * Extends HTML div props but excludes children to maintain terminal control.
 */
export interface CommandTerminalProps extends Omit<HTMLProperties<HTMLDivElement>, 'children'> {
  /** Initial text to display when terminal loads */
  initialText?: string
  /** Custom theme override (uses Sparkle theme system by default) */
  themeOverride?: XTermTheme
  /** Terminal configuration options */
  options?: TerminalOptions
  /** Command input behavior configuration */
  commandConfig?: CommandInputConfig
  /** Handler for command execution events */
  onCommandExecute?: (command: string) => void
  /** Handler for terminal resize events */
  onResize?: (cols: number, rows: number) => void
  /** Handler for terminal ready state */
  onReady?: (terminal: XTerm) => void
  /** Enable command input processing (default: true) */
  enableCommandInput?: boolean
}

/**
 * Enhanced Terminal component with integrated command input handling and history.
 *
 * This component extends the base Terminal with full command-line interface
 * functionality including command history, keyboard shortcuts, line editing,
 * and proper prompt management.
 *
 * Features:
 * - Full command history with up/down arrow navigation
 * - Line editing with cursor positioning
 * - Keyboard shortcuts (Ctrl+C, Ctrl+L, etc.)
 * - Proper prompt display and management
 * - Integration with xterm.js for terminal emulation
 * - Theme integration with Sparkle design system
 */
export const CommandTerminal = React.forwardRef<CommandTerminalHandle, CommandTerminalProps>((props, ref) => {
  const {
    className,
    initialText = '',
    themeOverride,
    options = {},
    commandConfig = {},
    onCommandExecute,
    onResize,
    onReady,
    enableCommandInput = true,
    ...rest
  } = props

  const baseTerminalRef = useRef<BaseTerminalHandle>(null)
  const [isReady, setIsReady] = useState(false)

  // Command input handling
  const commandInput = useCommandInput(commandConfig, onCommandExecute)

  // Terminal output handling
  const terminalOutput = useTerminalOutput({
    maxOutputEntries: 1000,
    autoScroll: true,
  })

  /**
   * Renders the current command line with prompt and cursor positioning.
   *
   * This function handles the visual representation of the command line by:
   * - Clearing the current terminal line
   * - Writing the formatted prompt and command text
   * - Positioning the cursor at the correct location
   *
   * The rendering is debounced and only occurs when the terminal is ready
   * to prevent unnecessary writes during rapid state changes.
   */
  const renderCommandLine = useCallback((): void => {
    if (!baseTerminalRef.current || !isReady) return

    const terminal = baseTerminalRef.current.getTerminal()
    if (!terminal) return

    try {
      // Clear the current line
      terminal.write(clearCurrentLine())

      // Format and display the command line
      const {line} = formatCommandLine(commandInput.prompt, commandInput.currentCommand)
      terminal.write(line)

      // Position cursor at the correct location
      const cursorPos = getTerminalCursorPosition(commandInput.prompt, commandInput.cursorPosition)
      terminal.write(`\r${String.fromCharCode(0x1b)}[${cursorPos}C`)
    } catch (error) {
      const terminalError = createCommandTerminalError(
        error instanceof Error ? error.message : 'Unknown render error',
        'command line rendering',
        error,
      )
      consola.error('Failed to render command line:', terminalError)
    }
  }, [isReady, commandInput.prompt, commandInput.currentCommand, commandInput.cursorPosition])

  /**
   * Handles keyboard input from xterm.js and processes command line interactions.
   *
   * This function intercepts raw terminal input data and converts it into
   * meaningful command line actions including text insertion, navigation,
   * history traversal, and command execution. The function processes both
   * printable characters and special key sequences through the terminal
   * key parser to maintain proper cursor positioning and command state.
   */
  const handleTerminalData = useCallback(
    (data: string): void => {
      if (!enableCommandInput) return

      // Use enhanced key parser with accessibility features
      const keyEvent = parseExtendedTerminalKey(data)

      if (!keyEvent.shouldHandle) {
        consola.debug('Ignoring unhandled key event:', keyEvent)
        return
      }

      switch (keyEvent.type) {
        case 'enter':
          // Execute the command and move to next line
          if (baseTerminalRef.current) {
            baseTerminalRef.current.write(String.raw`\r\n`)
          }
          commandInput.executeCommand()
          break

        case 'backspace':
          commandInput.deleteCharacterBeforeCursor()
          break

        case 'delete':
          commandInput.deleteCharacterAtCursor()
          break

        case 'arrow-up':
        case 'ctrl-p':
          commandInput.navigateHistoryUp()
          break

        case 'arrow-down':
        case 'ctrl-n':
          commandInput.navigateHistoryDown()
          break

        case 'arrow-left':
        case 'ctrl-b':
          commandInput.moveCursorLeft()
          break

        case 'arrow-right':
        case 'ctrl-f':
          commandInput.moveCursorRight()
          break

        case 'home':
        case 'ctrl-a':
          commandInput.moveCursorToStart()
          break

        case 'end':
        case 'ctrl-e':
          commandInput.moveCursorToEnd()
          break

        case 'ctrl-c':
          // Cancel current command
          if (baseTerminalRef.current) {
            baseTerminalRef.current.write(String.raw`^C\r\n`)
          }
          commandInput.clearCommand()
          break

        case 'ctrl-l':
          // Clear screen
          if (baseTerminalRef.current) {
            baseTerminalRef.current.clear()
          }
          break

        case 'ctrl-k':
          // Delete from cursor to end of line
          {
            const newCommand = commandInput.currentCommand.slice(0, commandInput.cursorPosition)
            commandInput.setCommand(newCommand)
          }
          break

        case 'ctrl-u':
          // Delete entire line
          commandInput.clearCommand()
          break

        case 'ctrl-w':
          // Delete previous word
          {
            const currentCommand = commandInput.currentCommand
            const cursorPos = commandInput.cursorPosition
            const beforeCursor = currentCommand.slice(0, cursorPos)
            const afterCursor = currentCommand.slice(cursorPos)

            // Find the start of the previous word
            const trimmed = beforeCursor.trimEnd()
            const lastSpaceIndex = trimmed.lastIndexOf(' ')
            const newBeforeCursor = lastSpaceIndex === -1 ? '' : beforeCursor.slice(0, lastSpaceIndex + 1)

            commandInput.setCommand(newBeforeCursor + afterCursor)
          }
          break

        case 'f1':
          // Show keyboard shortcuts help
          if (baseTerminalRef.current) {
            const helpText = generateKeyboardShortcutsHelp()
            baseTerminalRef.current.write(helpText)
          }
          break

        case 'f2':
          // Accessibility menu (placeholder for now)
          if (baseTerminalRef.current) {
            baseTerminalRef.current.write('\r\n♿ Accessibility menu not yet implemented\r\n')
          }
          break

        case 'printable':
          if (keyEvent.char) {
            commandInput.insertCharacterAtCursor(keyEvent.char)
          }
          break

        case 'tab':
          // TODO: Implement tab completion in Phase 3
          consola.debug('Tab completion not yet implemented')
          break

        default:
          consola.debug('Unhandled key type:', keyEvent.type)
      }
    },
    [enableCommandInput, commandInput],
  )

  /**
   * Handles when the terminal is ready for interaction.
   */
  const handleTerminalReady = useCallback(
    (terminal: XTerm) => {
      setIsReady(true)

      // Display initial prompt
      if (enableCommandInput) {
        terminal.write(`\r\n${commandInput.prompt}`)
      }

      if (onReady) {
        onReady(terminal)
      }
    },
    [enableCommandInput, commandInput.prompt, onReady],
  )

  // Re-render command line when command input state changes
  useEffect(() => {
    if (enableCommandInput && isReady) {
      renderCommandLine()
    }
  }, [
    enableCommandInput,
    isReady,
    renderCommandLine,
    commandInput.currentCommand,
    commandInput.cursorPosition,
    commandInput.prompt,
  ])

  // Display new prompt after command execution
  useEffect(() => {
    if (enableCommandInput && isReady && baseTerminalRef.current) {
      // Command was executed, show new prompt
      if (commandInput.currentCommand === '' && !commandInput.isBrowsingHistory) {
        baseTerminalRef.current.write(commandInput.prompt)
      } else {
        // Not showing prompt if command exists or browsing history
      }
    }
  }, [enableCommandInput, isReady, commandInput.currentCommand, commandInput.isBrowsingHistory, commandInput.prompt])

  // Set up imperative handle
  useImperativeHandle(
    ref,
    (): CommandTerminalHandle => ({
      // Base terminal methods
      getTerminal: () => baseTerminalRef.current?.getTerminal() || null,
      fitToContainer: async () => {
        if (baseTerminalRef.current) {
          await baseTerminalRef.current.fitToContainer()
        }
      },
      write: (text: string) => {
        if (baseTerminalRef.current) {
          baseTerminalRef.current.write(text)
        }
      },
      clear: () => {
        if (baseTerminalRef.current) {
          baseTerminalRef.current.clear()
          if (enableCommandInput) {
            baseTerminalRef.current.write(commandInput.prompt)
          }
        }
      },
      focus: () => {
        if (baseTerminalRef.current) {
          baseTerminalRef.current.focus()
        }
      },
      // Command methods
      executeCommand: commandInput.executeCommand,
      clearCommand: commandInput.clearCommand,
      setCommand: commandInput.setCommand,
      getCurrentCommand: () => commandInput.currentCommand,
      clearHistory: commandInput.clearHistory,
      getHistory: () => commandInput.commandHistory,
      // Output methods
      addOutput: terminalOutput.addOutput,
      clearOutput: terminalOutput.clearOutput,
      getOutputHistory: () => terminalOutput.outputEntries.map(entry => entry.content).join('\n'),
      writeOutput: (content: string) => {
        if (baseTerminalRef.current) {
          baseTerminalRef.current.write(content)
        }
      },
    }),
    [enableCommandInput, commandInput, terminalOutput],
  )

  const containerClasses = cx('command-terminal-container', className)

  return (
    <div className={containerClasses} {...rest}>
      <BaseTerminal
        ref={baseTerminalRef}
        initialText={initialText}
        themeOverride={themeOverride}
        options={{
          ...options,
        }}
        onData={enableCommandInput ? handleTerminalData : undefined}
        onResize={onResize}
        onReady={handleTerminalReady}
        className="h-full"
      />
    </div>
  )
})

CommandTerminal.displayName = 'CommandTerminal'
