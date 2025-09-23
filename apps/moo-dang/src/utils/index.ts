export {
  announceKeyboardAction,
  EXTENDED_TERMINAL_KEYS,
  generateKeyboardShortcutsHelp,
  KEYBOARD_SHORTCUTS,
  parseExtendedTerminalKey,
  type ExtendedTerminalKeyEvent,
  type ExtendedTerminalKeyType,
  type KeyboardShortcut,
} from './accessibility-keyboard'

export {
  ANSI_COLORS,
  ANSI_CONTROLS,
  formatCommandPrompt,
  formatError,
  formatOutputEntries,
  formatOutputEntry,
  OUTPUT_TYPE_FORMATS,
  stripAnsiCodes,
  wrapText,
  type OutputFormatOptions,
} from './output-formatting'

export {
  createScrollbackManager,
  type ScrollbackConfig,
  type ScrollbackLine,
  type ScrollbackSearchOptions,
  type ScrollbackSearchResult,
  type ScrollbackStats,
} from './scrollback-manager'

export type {ScrollbackManager} from './scrollback-manager'

export {
  clearCurrentLine,
  formatCommandLine,
  getTerminalCursorPosition,
  moveCursorToPosition,
  parseTerminalKey,
  TERMINAL_KEYS,
  type TerminalKeyEvent,
  type TerminalKeyType,
} from './terminal-keys'
