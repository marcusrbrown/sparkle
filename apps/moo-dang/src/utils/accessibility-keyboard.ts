/**
 * Enhanced keyboard shortcuts and accessibility utilities for terminal applications.
 *
 * This module provides comprehensive keyboard shortcut handling and accessibility
 * features for web-based terminal emulators, including screen reader support,
 * ARIA live regions, and advanced keyboard navigation.
 */

import {consola} from 'consola'

/**
 * Extended terminal key codes including additional shortcuts and accessibility features.
 */
export const EXTENDED_TERMINAL_KEYS = {
  // Core navigation and editing (already implemented)
  ENTER: '\r',
  BACKSPACE: String.fromCharCode(0x7f),
  DELETE: `${String.fromCharCode(0x1b)}[3~`,
  TAB: '\t',
  ESCAPE: String.fromCharCode(0x1b),

  // Control shortcuts (already implemented)
  CTRL_C: String.fromCharCode(0x03), // Cancel
  CTRL_D: String.fromCharCode(0x04), // EOF
  CTRL_L: String.fromCharCode(0x0c), // Clear screen
  CTRL_A: String.fromCharCode(0x01), // Beginning of line
  CTRL_E: String.fromCharCode(0x05), // End of line
  CTRL_K: String.fromCharCode(0x0b), // Kill to end
  CTRL_U: String.fromCharCode(0x15), // Kill entire line

  // Additional terminal shortcuts
  CTRL_R: String.fromCharCode(0x12), // Reverse search through history
  CTRL_S: String.fromCharCode(0x13), // Forward search through history
  CTRL_W: String.fromCharCode(0x17), // Delete previous word
  CTRL_Y: String.fromCharCode(0x19), // Yank (paste) killed text
  CTRL_Z: String.fromCharCode(0x1a), // Suspend process

  // Copy/paste shortcuts (browser-dependent)
  CTRL_SHIFT_C: String.fromCharCode(0x03), // Copy (with shift modifier)
  CTRL_SHIFT_V: String.fromCharCode(0x16), // Paste (with shift modifier)

  // Navigation shortcuts
  CTRL_B: String.fromCharCode(0x02), // Move backward one character
  CTRL_F: String.fromCharCode(0x06), // Move forward one character
  CTRL_P: String.fromCharCode(0x10), // Previous command (same as up arrow)
  CTRL_N: String.fromCharCode(0x0e), // Next command (same as down arrow)

  // Arrow keys (already implemented)
  ARROW_UP: `${String.fromCharCode(0x1b)}[A`,
  ARROW_DOWN: `${String.fromCharCode(0x1b)}[B`,
  ARROW_LEFT: `${String.fromCharCode(0x1b)}[D`,
  ARROW_RIGHT: `${String.fromCharCode(0x1b)}[C`,
  HOME: `${String.fromCharCode(0x1b)}[H`,
  END: `${String.fromCharCode(0x1b)}[F`,

  // Function keys for accessibility shortcuts
  F1: `${String.fromCharCode(0x1b)}OP`, // Help
  F2: `${String.fromCharCode(0x1b)}OQ`, // Context menu
  F3: `${String.fromCharCode(0x1b)}OR`, // Find/search
  F10: `${String.fromCharCode(0x1b)}[21~`, // Menu

  // Page navigation
  PAGE_UP: `${String.fromCharCode(0x1b)}[5~`,
  PAGE_DOWN: `${String.fromCharCode(0x1b)}[6~`,
} as const

/**
 * Extended terminal key types including new accessibility shortcuts.
 */
export type ExtendedTerminalKeyType =
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
  | 'ctrl-r'
  | 'ctrl-s'
  | 'ctrl-w'
  | 'ctrl-y'
  | 'ctrl-z'
  | 'ctrl-b'
  | 'ctrl-f'
  | 'ctrl-p'
  | 'ctrl-n'
  | 'ctrl-shift-c'
  | 'ctrl-shift-v'
  | 'arrow-up'
  | 'arrow-down'
  | 'arrow-left'
  | 'arrow-right'
  | 'home'
  | 'end'
  | 'page-up'
  | 'page-down'
  | 'f1'
  | 'f2'
  | 'f3'
  | 'f10'
  | 'printable'
  | 'unknown'

/**
 * Enhanced terminal key event with accessibility context.
 */
export interface ExtendedTerminalKeyEvent {
  /** The type of key that was pressed */
  type: ExtendedTerminalKeyType
  /** The raw key data from the terminal */
  data: string
  /** For printable characters, the character that should be inserted */
  char?: string
  /** Whether this key event should be handled by the command input system */
  shouldHandle: boolean
  /** Whether this is an accessibility-focused shortcut */
  isAccessibilityShortcut: boolean
  /** Human-readable description of the shortcut for screen readers */
  description?: string
}

/**
 * Keyboard shortcut information for help and accessibility documentation.
 */
export interface KeyboardShortcut {
  /** Key combination (e.g., "Ctrl+C") */
  keys: string
  /** Description of what the shortcut does */
  description: string
  /** Category for organizing shortcuts */
  category: 'navigation' | 'editing' | 'search' | 'system' | 'accessibility'
  /** Whether this is an essential accessibility shortcut */
  isAccessibilityEssential: boolean
}

/**
 * Comprehensive list of all supported keyboard shortcuts.
 */
export const KEYBOARD_SHORTCUTS: readonly KeyboardShortcut[] = [
  // Navigation shortcuts
  {
    keys: 'Up Arrow / Ctrl+P',
    description: 'Navigate to previous command in history',
    category: 'navigation',
    isAccessibilityEssential: true,
  },
  {
    keys: 'Down Arrow / Ctrl+N',
    description: 'Navigate to next command in history',
    category: 'navigation',
    isAccessibilityEssential: true,
  },
  {
    keys: 'Left Arrow / Ctrl+B',
    description: 'Move cursor left one character',
    category: 'navigation',
    isAccessibilityEssential: true,
  },
  {
    keys: 'Right Arrow / Ctrl+F',
    description: 'Move cursor right one character',
    category: 'navigation',
    isAccessibilityEssential: true,
  },
  {
    keys: 'Home / Ctrl+A',
    description: 'Move cursor to beginning of line',
    category: 'navigation',
    isAccessibilityEssential: true,
  },
  {
    keys: 'End / Ctrl+E',
    description: 'Move cursor to end of line',
    category: 'navigation',
    isAccessibilityEssential: true,
  },
  {keys: 'Page Up', description: 'Scroll terminal output up', category: 'navigation', isAccessibilityEssential: false},
  {
    keys: 'Page Down',
    description: 'Scroll terminal output down',
    category: 'navigation',
    isAccessibilityEssential: false,
  },

  // Editing shortcuts
  {
    keys: 'Backspace',
    description: 'Delete character before cursor',
    category: 'editing',
    isAccessibilityEssential: true,
  },
  {keys: 'Delete', description: 'Delete character at cursor', category: 'editing', isAccessibilityEssential: true},
  {
    keys: 'Ctrl+K',
    description: 'Delete from cursor to end of line',
    category: 'editing',
    isAccessibilityEssential: false,
  },
  {keys: 'Ctrl+U', description: 'Delete entire line', category: 'editing', isAccessibilityEssential: false},
  {keys: 'Ctrl+W', description: 'Delete previous word', category: 'editing', isAccessibilityEssential: false},
  {keys: 'Ctrl+Y', description: 'Paste previously deleted text', category: 'editing', isAccessibilityEssential: false},

  // Search shortcuts
  {
    keys: 'Ctrl+R',
    description: 'Search backwards through command history',
    category: 'search',
    isAccessibilityEssential: false,
  },
  {
    keys: 'Ctrl+S',
    description: 'Search forwards through command history',
    category: 'search',
    isAccessibilityEssential: false,
  },
  {keys: 'F3', description: 'Find text in terminal output', category: 'search', isAccessibilityEssential: false},

  // System shortcuts
  {keys: 'Enter', description: 'Execute current command', category: 'system', isAccessibilityEssential: true},
  {
    keys: 'Ctrl+C',
    description: 'Cancel current command or interrupt process',
    category: 'system',
    isAccessibilityEssential: true,
  },
  {keys: 'Ctrl+D', description: 'Send EOF signal or exit shell', category: 'system', isAccessibilityEssential: false},
  {keys: 'Ctrl+L', description: 'Clear terminal screen', category: 'system', isAccessibilityEssential: false},
  {keys: 'Ctrl+Z', description: 'Suspend current process', category: 'system', isAccessibilityEssential: false},
  {keys: 'Tab', description: 'Auto-complete command or filename', category: 'system', isAccessibilityEssential: false},

  // Accessibility shortcuts
  {keys: 'F1', description: 'Show keyboard shortcuts help', category: 'accessibility', isAccessibilityEssential: true},
  {
    keys: 'F2',
    description: 'Open accessibility context menu',
    category: 'accessibility',
    isAccessibilityEssential: true,
  },
  {keys: 'F10', description: 'Open main application menu', category: 'accessibility', isAccessibilityEssential: false},
  {keys: 'Ctrl+Shift+C', description: 'Copy selected text', category: 'accessibility', isAccessibilityEssential: false},
  {
    keys: 'Ctrl+Shift+V',
    description: 'Paste from clipboard',
    category: 'accessibility',
    isAccessibilityEssential: false,
  },
] as const

/**
 * Enhanced terminal key parser with accessibility features.
 *
 * @param data The raw key data from xterm.js onData event
 * @returns Enhanced parsed key event information
 */
export function parseExtendedTerminalKey(data: string): ExtendedTerminalKeyEvent {
  // Handle extended shortcuts first
  switch (data) {
    case EXTENDED_TERMINAL_KEYS.CTRL_R:
      return {
        type: 'ctrl-r',
        data,
        shouldHandle: true,
        isAccessibilityShortcut: false,
        description: 'Reverse search through command history',
      }

    case EXTENDED_TERMINAL_KEYS.CTRL_S:
      return {
        type: 'ctrl-s',
        data,
        shouldHandle: true,
        isAccessibilityShortcut: false,
        description: 'Forward search through command history',
      }

    case EXTENDED_TERMINAL_KEYS.CTRL_W:
      return {
        type: 'ctrl-w',
        data,
        shouldHandle: true,
        isAccessibilityShortcut: false,
        description: 'Delete previous word',
      }

    case EXTENDED_TERMINAL_KEYS.CTRL_Y:
      return {
        type: 'ctrl-y',
        data,
        shouldHandle: true,
        isAccessibilityShortcut: false,
        description: 'Paste previously deleted text',
      }

    case EXTENDED_TERMINAL_KEYS.CTRL_Z:
      return {
        type: 'ctrl-z',
        data,
        shouldHandle: true,
        isAccessibilityShortcut: false,
        description: 'Suspend current process',
      }

    case EXTENDED_TERMINAL_KEYS.CTRL_B:
      return {
        type: 'ctrl-b',
        data,
        shouldHandle: true,
        isAccessibilityShortcut: true,
        description: 'Move cursor backward one character',
      }

    case EXTENDED_TERMINAL_KEYS.CTRL_F:
      return {
        type: 'ctrl-f',
        data,
        shouldHandle: true,
        isAccessibilityShortcut: true,
        description: 'Move cursor forward one character',
      }

    case EXTENDED_TERMINAL_KEYS.CTRL_P:
      return {
        type: 'ctrl-p',
        data,
        shouldHandle: true,
        isAccessibilityShortcut: true,
        description: 'Previous command in history',
      }

    case EXTENDED_TERMINAL_KEYS.CTRL_N:
      return {
        type: 'ctrl-n',
        data,
        shouldHandle: true,
        isAccessibilityShortcut: true,
        description: 'Next command in history',
      }

    case EXTENDED_TERMINAL_KEYS.F1:
      return {
        type: 'f1',
        data,
        shouldHandle: true,
        isAccessibilityShortcut: true,
        description: 'Show keyboard shortcuts help',
      }

    case EXTENDED_TERMINAL_KEYS.F2:
      return {
        type: 'f2',
        data,
        shouldHandle: true,
        isAccessibilityShortcut: true,
        description: 'Open accessibility context menu',
      }

    case EXTENDED_TERMINAL_KEYS.F3:
      return {
        type: 'f3',
        data,
        shouldHandle: true,
        isAccessibilityShortcut: false,
        description: 'Find text in terminal output',
      }

    case EXTENDED_TERMINAL_KEYS.F10:
      return {
        type: 'f10',
        data,
        shouldHandle: true,
        isAccessibilityShortcut: true,
        description: 'Open main application menu',
      }

    case EXTENDED_TERMINAL_KEYS.PAGE_UP:
      return {
        type: 'page-up',
        data,
        shouldHandle: true,
        isAccessibilityShortcut: false,
        description: 'Scroll terminal output up',
      }

    case EXTENDED_TERMINAL_KEYS.PAGE_DOWN:
      return {
        type: 'page-down',
        data,
        shouldHandle: true,
        isAccessibilityShortcut: false,
        description: 'Scroll terminal output down',
      }

    // Fall back to original key parsing for existing shortcuts
    case EXTENDED_TERMINAL_KEYS.ENTER:
      return {type: 'enter', data, shouldHandle: true, isAccessibilityShortcut: true, description: 'Execute command'}

    case EXTENDED_TERMINAL_KEYS.BACKSPACE:
      return {
        type: 'backspace',
        data,
        shouldHandle: true,
        isAccessibilityShortcut: true,
        description: 'Delete character before cursor',
      }

    case EXTENDED_TERMINAL_KEYS.DELETE:
      return {
        type: 'delete',
        data,
        shouldHandle: true,
        isAccessibilityShortcut: true,
        description: 'Delete character at cursor',
      }

    case EXTENDED_TERMINAL_KEYS.TAB:
      return {type: 'tab', data, shouldHandle: true, isAccessibilityShortcut: false, description: 'Auto-complete'}

    case EXTENDED_TERMINAL_KEYS.ESCAPE:
      return {type: 'escape', data, shouldHandle: true, isAccessibilityShortcut: false, description: 'Cancel operation'}

    case EXTENDED_TERMINAL_KEYS.CTRL_C:
      return {type: 'ctrl-c', data, shouldHandle: true, isAccessibilityShortcut: true, description: 'Cancel command'}

    case EXTENDED_TERMINAL_KEYS.CTRL_D:
      return {type: 'ctrl-d', data, shouldHandle: true, isAccessibilityShortcut: false, description: 'End of file'}

    case EXTENDED_TERMINAL_KEYS.CTRL_L:
      return {type: 'ctrl-l', data, shouldHandle: true, isAccessibilityShortcut: false, description: 'Clear screen'}

    case EXTENDED_TERMINAL_KEYS.CTRL_A:
      return {
        type: 'ctrl-a',
        data,
        shouldHandle: true,
        isAccessibilityShortcut: true,
        description: 'Move to beginning of line',
      }

    case EXTENDED_TERMINAL_KEYS.CTRL_E:
      return {
        type: 'ctrl-e',
        data,
        shouldHandle: true,
        isAccessibilityShortcut: true,
        description: 'Move to end of line',
      }

    case EXTENDED_TERMINAL_KEYS.CTRL_K:
      return {
        type: 'ctrl-k',
        data,
        shouldHandle: true,
        isAccessibilityShortcut: false,
        description: 'Delete to end of line',
      }

    case EXTENDED_TERMINAL_KEYS.CTRL_U:
      return {
        type: 'ctrl-u',
        data,
        shouldHandle: true,
        isAccessibilityShortcut: false,
        description: 'Delete entire line',
      }

    case EXTENDED_TERMINAL_KEYS.ARROW_UP:
      return {
        type: 'arrow-up',
        data,
        shouldHandle: true,
        isAccessibilityShortcut: true,
        description: 'Navigate to previous command',
      }

    case EXTENDED_TERMINAL_KEYS.ARROW_DOWN:
      return {
        type: 'arrow-down',
        data,
        shouldHandle: true,
        isAccessibilityShortcut: true,
        description: 'Navigate to next command',
      }

    case EXTENDED_TERMINAL_KEYS.ARROW_LEFT:
      return {
        type: 'arrow-left',
        data,
        shouldHandle: true,
        isAccessibilityShortcut: true,
        description: 'Move cursor left',
      }

    case EXTENDED_TERMINAL_KEYS.ARROW_RIGHT:
      return {
        type: 'arrow-right',
        data,
        shouldHandle: true,
        isAccessibilityShortcut: true,
        description: 'Move cursor right',
      }

    case EXTENDED_TERMINAL_KEYS.HOME:
      return {
        type: 'home',
        data,
        shouldHandle: true,
        isAccessibilityShortcut: true,
        description: 'Move to beginning of line',
      }

    case EXTENDED_TERMINAL_KEYS.END:
      return {type: 'end', data, shouldHandle: true, isAccessibilityShortcut: true, description: 'Move to end of line'}
  }

  // Handle printable characters
  if (data.length === 1 && isPrintableChar(data)) {
    return {
      type: 'printable',
      data,
      char: data,
      shouldHandle: true,
      isAccessibilityShortcut: false,
      description: `Insert character: ${data}`,
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
    isAccessibilityShortcut: false,
  }
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
 * Generates a formatted help text for all keyboard shortcuts.
 *
 * @param categoryFilter Optional category to filter shortcuts
 * @returns Formatted help text ready for terminal display
 */
export function generateKeyboardShortcutsHelp(categoryFilter?: KeyboardShortcut['category']): string {
  const shortcuts = categoryFilter
    ? KEYBOARD_SHORTCUTS.filter(shortcut => shortcut.category === categoryFilter)
    : KEYBOARD_SHORTCUTS

  const categories = Array.from(new Set(shortcuts.map(s => s.category)))

  let helpText = '\r\n🎹 Keyboard Shortcuts Help\r\n'
  helpText += `${'='.repeat(50)}\r\n\r\n`

  for (const category of categories) {
    const categoryShortcuts = shortcuts.filter(s => s.category === category)
    const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1)

    helpText += `📋 ${categoryTitle} Shortcuts:\r\n`
    helpText += `${'-'.repeat(30)}\r\n`

    for (const shortcut of categoryShortcuts) {
      const essential = shortcut.isAccessibilityEssential ? ' ♿' : ''
      helpText += `  ${shortcut.keys.padEnd(20)} - ${shortcut.description}${essential}\r\n`
    }
    helpText += '\r\n'
  }

  helpText += '♿ = Essential for accessibility\r\n'
  helpText += 'Press any key to continue...\r\n'

  return helpText
}

/**
 * Announces a keyboard action to screen readers using appropriate ARIA live regions.
 *
 * @param action The action that was performed
 * @param context Additional context about the action
 * @param priority The priority level for the announcement
 */
export function announceKeyboardAction(
  action: string,
  context?: string,
  priority: 'polite' | 'assertive' = 'polite',
): void {
  const message = context ? `${action}: ${context}` : action

  // Create or update ARIA live region for screen reader announcements
  let liveRegion = document.querySelector('#terminal-announcements') as HTMLDivElement | null

  if (liveRegion) {
    // Update the aria-live priority if needed
    liveRegion.setAttribute('aria-live', priority)
  } else {
    liveRegion = document.createElement('div')
    liveRegion.id = 'terminal-announcements'
    liveRegion.setAttribute('aria-live', priority)
    liveRegion.setAttribute('aria-atomic', 'true')
    liveRegion.setAttribute('role', 'status')
    liveRegion.style.position = 'absolute'
    liveRegion.style.left = '-10000px'
    liveRegion.style.width = '1px'
    liveRegion.style.height = '1px'
    liveRegion.style.overflow = 'hidden'
    document.body.append(liveRegion)
  }

  // Clear and set new message
  liveRegion.textContent = message

  // Log for debugging
  consola.debug('Screen reader announcement:', {message, priority})
}
