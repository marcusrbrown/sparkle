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
 */
export interface CommandTerminalError extends Error {
  readonly operation: string
  readonly cause?: unknown
}

/**
 * Creates a structured command terminal error with enhanced context.
 *
 * Uses functional approach for better maintainability and consistency
 * with project coding standards.
 */
export function createCommandTerminalError(message: string, operation: string, cause?: unknown): CommandTerminalError {
  const error = new Error(`CommandTerminal ${operation}: ${message}`) as CommandTerminalError
  error.name = 'CommandTerminalError'

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

export interface CommandHistoryEntry {
  readonly command: string
  readonly timestamp: Date
  readonly id: string
}

export interface CommandTerminalHandle extends BaseTerminalHandle {
  executeCommand: () => void
  clearCommand: () => void
  setCommand: (command: string) => void
  getCurrentCommand: () => string
  clearHistory: () => void
  getHistory: () => CommandHistoryEntry[]
  addOutput: (type: TerminalOutputType, content: string) => void
  clearOutput: () => void
  getOutputHistory: () => string
  writeOutput: (content: string, formatted?: boolean) => void
}

export interface CommandTerminalProps extends Omit<HTMLProperties<HTMLDivElement>, 'children'> {
  readonly initialText?: string
  readonly themeOverride?: XTermTheme
  readonly options?: TerminalOptions
  readonly commandConfig?: CommandInputConfig
  readonly onCommandExecute?: (command: string) => void
  readonly onResize?: (cols: number, rows: number) => void
  readonly onReady?: (terminal: XTerm) => void
  readonly enableCommandInput?: boolean
}

/**
 * Enhanced Terminal component with integrated command input handling and history.
 *
 * Bridges xterm.js terminal emulation with command-line interface expectations,
 * providing shell-like behavior for the moo-dang WASM environment.
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
   * Memoized to prevent excessive writes during rapid state changes.
   */
  const renderCommandLine = useCallback((): void => {
    if (!baseTerminalRef.current || !isReady) return

    const terminal = baseTerminalRef.current.getTerminal()
    if (!terminal) return

    try {
      terminal.write(clearCurrentLine())

      const {line} = formatCommandLine(commandInput.prompt, commandInput.currentCommand)
      terminal.write(line)

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
   * Converts raw terminal input into meaningful command line actions through
   * the enhanced key parser with accessibility features.
   */
  const handleTerminalData = useCallback(
    (data: string): void => {
      if (!enableCommandInput) return

      const keyEvent = parseExtendedTerminalKey(data)

      if (!keyEvent.shouldHandle) {
        consola.debug('Ignoring unhandled key event:', keyEvent)
        return
      }

      switch (keyEvent.type) {
        case 'enter':
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
          if (baseTerminalRef.current) {
            baseTerminalRef.current.write(String.raw`^C\r\n`)
          }
          commandInput.clearCommand()
          break

        case 'ctrl-l':
          if (baseTerminalRef.current) {
            baseTerminalRef.current.clear()
          }
          break

        case 'ctrl-k':
          {
            const newCommand = commandInput.currentCommand.slice(0, commandInput.cursorPosition)
            commandInput.setCommand(newCommand)
          }
          break

        case 'ctrl-u':
          commandInput.clearCommand()
          break

        case 'ctrl-w':
          {
            const currentCommand = commandInput.currentCommand
            const cursorPos = commandInput.cursorPosition
            const beforeCursor = currentCommand.slice(0, cursorPos)
            const afterCursor = currentCommand.slice(cursorPos)

            const trimmed = beforeCursor.trimEnd()
            const lastSpaceIndex = trimmed.lastIndexOf(' ')
            const newBeforeCursor = lastSpaceIndex === -1 ? '' : beforeCursor.slice(0, lastSpaceIndex + 1)

            commandInput.setCommand(newBeforeCursor + afterCursor)
          }
          break

        case 'f1':
          if (baseTerminalRef.current) {
            const helpText = generateKeyboardShortcutsHelp()
            baseTerminalRef.current.write(helpText)
          }
          break

        case 'f2':
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
          consola.debug('Tab completion not yet implemented')
          break

        default:
          consola.debug('Unhandled key type:', keyEvent.type)
          break
      }
    },
    [enableCommandInput, commandInput],
  )

  const handleTerminalReady = useCallback(
    (terminal: XTerm): void => {
      setIsReady(true)

      // Connect terminal output to the actual terminal for rendering
      terminalOutput.setTerminal(terminal)

      if (enableCommandInput) {
        terminal.write(`\r\n${commandInput.prompt}`)
      }

      if (onReady) {
        onReady(terminal)
      }
    },
    [enableCommandInput, commandInput.prompt, onReady, terminalOutput],
  )

  // Use ref to avoid constant re-renders from command input changes
  const lastRenderRef = useRef({
    currentCommand: '',
    cursorPosition: 0,
    prompt: '',
  })

  // Effect to render command line when command input changes
  useEffect(() => {
    if (!enableCommandInput || !isReady) return

    const current = {
      currentCommand: commandInput.currentCommand,
      cursorPosition: commandInput.cursorPosition,
      prompt: commandInput.prompt,
    }

    // Only render if something actually changed
    const hasChanged =
      current.currentCommand !== lastRenderRef.current.currentCommand ||
      current.cursorPosition !== lastRenderRef.current.cursorPosition ||
      current.prompt !== lastRenderRef.current.prompt

    if (hasChanged) {
      renderCommandLine()
      lastRenderRef.current = current
    }
  }, [enableCommandInput, isReady, commandInput.currentCommand, commandInput.cursorPosition, commandInput.prompt])

  useImperativeHandle(
    ref,
    (): CommandTerminalHandle => ({
      getTerminal: () => baseTerminalRef.current?.getTerminal() || null,
      fitToContainer: async (): Promise<void> => {
        if (baseTerminalRef.current) {
          await baseTerminalRef.current.fitToContainer()
        }
      },
      write: (text: string): void => {
        if (baseTerminalRef.current) {
          baseTerminalRef.current.write(text)
        }
      },
      clear: (): void => {
        if (baseTerminalRef.current) {
          baseTerminalRef.current.clear()
          if (enableCommandInput) {
            baseTerminalRef.current.write(commandInput.prompt)
          }
        }
      },
      focus: (): void => {
        if (baseTerminalRef.current) {
          baseTerminalRef.current.focus()
        }
      },
      executeCommand: commandInput.executeCommand,
      clearCommand: commandInput.clearCommand,
      setCommand: commandInput.setCommand,
      getCurrentCommand: (): string => commandInput.currentCommand,
      clearHistory: commandInput.clearHistory,
      getHistory: (): CommandHistoryEntry[] => commandInput.commandHistory,
      addOutput: terminalOutput.addOutput,
      clearOutput: terminalOutput.clearOutput,
      getOutputHistory: (): string => terminalOutput.outputEntries.map(entry => entry.content).join('\n'),
      writeOutput: (content: string): void => {
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
        options={options}
        onData={enableCommandInput ? handleTerminalData : undefined}
        onResize={onResize}
        onReady={handleTerminalReady}
        className="h-full"
      />
    </div>
  )
})

CommandTerminal.displayName = 'CommandTerminal'
