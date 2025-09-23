/**
 * Terminal keyboard event handling utilities.
 *
 * Provides functions for interpreting terminal key events and mapping them
 * to appropriate command input actions.
 */

import {consola} from 'consola'

/**
 * Special key codes and sequences used in terminal environments.
 */
export const TERMINAL_KEYS = {
  ENTER: '\r',
  BACKSPACE: String.fromCharCode(0x7f),
  DELETE: `${String.fromCharCode(0x1b)}[3~`,
  TAB: '\t',
  ESCAPE: String.fromCharCode(0x1b),
  CTRL_C: String.fromCharCode(0x03),
  CTRL_D: String.fromCharCode(0x04),
  CTRL_L: String.fromCharCode(0x0c),
  CTRL_A: String.fromCharCode(0x01),
  CTRL_E: String.fromCharCode(0x05),
  CTRL_K: String.fromCharCode(0x0b),
  CTRL_U: String.fromCharCode(0x15),
  ARROW_UP: `${String.fromCharCode(0x1b)}[A`,
  ARROW_DOWN: `${String.fromCharCode(0x1b)}[B`,
  ARROW_LEFT: `${String.fromCharCode(0x1b)}[D`,
  ARROW_RIGHT: `${String.fromCharCode(0x1b)}[C`,
  HOME: `${String.fromCharCode(0x1b)}[H`,
  END: `${String.fromCharCode(0x1b)}[F`,
} as const

/**
 * Type representing the different categories of terminal key events.
 */
export type TerminalKeyType =
  | 'enter'
  | 'backspace'
  | 'delete'
  | 'tab'
  | 'escape'
  | 'ctrl-c'
  | 'ctrl-d'
  | 'ctrl-l'
  | 'ctrl-a'
  | 'ctrl-e'
  | 'ctrl-k'
  | 'ctrl-u'
  | 'arrow-up'
  | 'arrow-down'
  | 'arrow-left'
  | 'arrow-right'
  | 'home'
  | 'end'
  | 'printable'
  | 'unknown'

/**
 * Result of parsing a terminal key event.
 */
export interface TerminalKeyEvent {
  /** The type of key that was pressed */
  type: TerminalKeyType
  /** The raw key data from the terminal */
  data: string
  /** For printable characters, the character that should be inserted */
  char?: string
  /** Whether this key event should be handled by the command input system */
  shouldHandle: boolean
}

/**
 * Checks if a character is a printable ASCII character.
 *
 * @param char The character to check
 * @returns True if the character is printable
 */
function isPrintableChar(char: string): boolean {
  if (char.length !== 1) return false
  const code = char.charCodeAt(0)
  // Printable ASCII range: 32-126 (space to tilde)
  return code >= 32 && code <= 126
}

/**
 * Parses terminal key input data and returns structured key event information.
 *
 * This function handles both special key sequences (arrows, function keys, etc.)
 * and printable characters, providing a normalized interface for terminal
 * key event handling.
 *
 * @param data The raw key data from xterm.js onData event
 * @returns Parsed key event information
 */
export function parseTerminalKey(data: string): TerminalKeyEvent {
  // Handle special keys first
  switch (data) {
    case TERMINAL_KEYS.ENTER:
      return {type: 'enter', data, shouldHandle: true}

    case TERMINAL_KEYS.BACKSPACE:
      return {type: 'backspace', data, shouldHandle: true}

    case TERMINAL_KEYS.DELETE:
      return {type: 'delete', data, shouldHandle: true}

    case TERMINAL_KEYS.TAB:
      return {type: 'tab', data, shouldHandle: true}

    case TERMINAL_KEYS.ESCAPE:
      return {type: 'escape', data, shouldHandle: true}

    case TERMINAL_KEYS.CTRL_C:
      return {type: 'ctrl-c', data, shouldHandle: true}

    case TERMINAL_KEYS.CTRL_D:
      return {type: 'ctrl-d', data, shouldHandle: true}

    case TERMINAL_KEYS.CTRL_L:
      return {type: 'ctrl-l', data, shouldHandle: true}

    case TERMINAL_KEYS.CTRL_A:
      return {type: 'ctrl-a', data, shouldHandle: true}

    case TERMINAL_KEYS.CTRL_E:
      return {type: 'ctrl-e', data, shouldHandle: true}

    case TERMINAL_KEYS.CTRL_K:
      return {type: 'ctrl-k', data, shouldHandle: true}

    case TERMINAL_KEYS.CTRL_U:
      return {type: 'ctrl-u', data, shouldHandle: true}

    case TERMINAL_KEYS.ARROW_UP:
      return {type: 'arrow-up', data, shouldHandle: true}

    case TERMINAL_KEYS.ARROW_DOWN:
      return {type: 'arrow-down', data, shouldHandle: true}

    case TERMINAL_KEYS.ARROW_LEFT:
      return {type: 'arrow-left', data, shouldHandle: true}

    case TERMINAL_KEYS.ARROW_RIGHT:
      return {type: 'arrow-right', data, shouldHandle: true}

    case TERMINAL_KEYS.HOME:
      return {type: 'home', data, shouldHandle: true}

    case TERMINAL_KEYS.END:
      return {type: 'end', data, shouldHandle: true}
  }

  // Handle printable characters
  if (data.length === 1 && isPrintableChar(data)) {
    return {
      type: 'printable',
      data,
      char: data,
      shouldHandle: true,
    }
  }

  // Log unknown key sequences for debugging
  if (data.length > 0) {
    consola.debug('Unknown terminal key sequence:', {
      data,
      length: data.length,
      charCodes: [...data].map(c => c.charCodeAt(0)),
    })
  }

  return {
    type: 'unknown',
    data,
    shouldHandle: false,
  }
}

/**
 * Formats a command and prompt for display in the terminal.
 *
 * @param prompt The prompt string (e.g., "$ ")
 * @param command The current command text
 * @returns Object with formatted line and cursor information
 */
export function formatCommandLine(
  prompt: string,
  command: string,
): {line: string; promptLength: number; totalLength: number} {
  const line = prompt + command
  const promptLength = prompt.length
  const totalLength = line.length

  return {
    line,
    promptLength,
    totalLength,
  }
}

/**
 * Calculates the terminal cursor position for a given command and cursor position.
 *
 * @param prompt The prompt string
 * @param cursorPosition The cursor position within the command (0-based)
 * @returns The absolute cursor position in the terminal line
 */
export function getTerminalCursorPosition(prompt: string, cursorPosition: number): number {
  return prompt.length + cursorPosition
}

/**
 * Clears the current line in the terminal and positions cursor at start.
 *
 * @returns ANSI sequence to clear line and move cursor to beginning
 */
export function clearCurrentLine(): string {
  return `\r${String.fromCharCode(0x1b)}[K`
}

/**
 * Moves the terminal cursor to a specific position in the current line.
 *
 * @param position The column position (1-based for ANSI sequences)
 * @returns ANSI sequence to move cursor to the specified position
 */
export function moveCursorToPosition(position: number): string {
  return `\r${String.fromCharCode(0x1b)}[${Math.max(1, position)}C`
}
