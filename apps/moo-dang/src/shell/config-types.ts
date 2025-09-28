/**
 * Configuration system types and interfaces for the moo-dang shell.
 *
 * This module provides comprehensive configuration management including user preferences,
 * appearance settings, behavior options, and persistence for the shell environment.
 */

import type {CompletionConfig} from './completion-types'
import type {HistoryConfig} from './history-types'
import type {ShellOptions} from './types'

/**
 * Available themes for the shell interface.
 */
export const SHELL_THEMES = ['dark', 'light', 'solarized-dark', 'solarized-light', 'custom'] as const
export type ShellTheme = (typeof SHELL_THEMES)[number]

/**
 * Font size options for terminal display.
 */
export const FONT_SIZES = [10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24] as const
export type FontSize = (typeof FONT_SIZES)[number]

/**
 * Shell prompt styles for customization.
 */
export const PROMPT_STYLES = ['default', 'minimal', 'verbose', 'git-aware', 'custom'] as const
export type PromptStyle = (typeof PROMPT_STYLES)[number]

/**
 * Terminal appearance configuration.
 */
export interface TerminalAppearanceConfig {
  /** Theme for terminal colors and styling */
  theme: ShellTheme
  /** Font size for terminal text */
  fontSize: FontSize
  /** Font family for terminal (monospace fonts) */
  fontFamily: string
  /** Enable cursor blinking */
  cursorBlink: boolean
  /** Terminal scrollback buffer size */
  scrollback: number
  /** Line height multiplier (1.0 = normal) */
  lineHeight: number
  /** Letter spacing in pixels */
  letterSpacing: number
  /** Whether to use ligatures in supported fonts */
  fontLigatures: boolean
}

/**
 * Shell behavior configuration options.
 */
export interface ShellBehaviorConfig {
  /** Shell prompt configuration */
  prompt: {
    /** Prompt style template */
    style: PromptStyle
    /** Custom prompt string (used when style is 'custom') */
    customTemplate: string
    /** Show current directory in prompt */
    showDirectory: boolean
    /** Show git branch in prompt (for git-aware style) */
    showGitBranch: boolean
  }
  /** Auto-completion behavior settings */
  completion: CompletionConfig
  /** Command history management settings */
  history: HistoryConfig
  /** Shell execution options */
  execution: ShellOptions
  /** Auto-save configuration changes */
  autoSave: boolean
  /** Confirm destructive operations */
  confirmDestructive: boolean
  /** Case sensitivity for command matching */
  caseSensitive: boolean
}

/**
 * Security and privacy configuration.
 */
export interface SecurityConfig {
  /** Allow execution of WASM modules */
  allowWasmExecution: boolean
  /** Maximum WASM module size in MB */
  maxWasmSize: number
  /** Persist sensitive data (history, environment) */
  persistSensitiveData: boolean
  /** Sandbox WASM execution */
  sandboxWasm: boolean
  /** Allow network operations from commands */
  allowNetworkAccess: boolean
}

/**
 * Accessibility configuration options.
 */
export interface AccessibilityConfig {
  /** Enable high contrast mode */
  highContrast: boolean
  /** Enable screen reader support */
  screenReader: boolean
  /** Increase focus indicators */
  enhancedFocus: boolean
  /** Announce command output */
  announceOutput: boolean
  /** Reduce motion and animations */
  reduceMotion: boolean
}

/**
 * Advanced shell configuration options.
 */
export interface AdvancedConfig {
  /** Enable debug logging */
  debugMode: boolean
  /** Performance monitoring */
  performanceMonitoring: boolean
  /** Experimental features toggle */
  experimentalFeatures: boolean
  /** Custom CSS for terminal styling */
  customCss: string
  /** Developer mode with additional tools */
  developerMode: boolean
}

/**
 * Complete shell configuration combining all aspects.
 */
export interface ShellConfig {
  /** Configuration version for migration */
  version: string
  /** Terminal appearance settings */
  appearance: TerminalAppearanceConfig
  /** Shell behavior and execution settings */
  behavior: ShellBehaviorConfig
  /** Security and privacy settings */
  security: SecurityConfig
  /** Accessibility options */
  accessibility: AccessibilityConfig
  /** Advanced configuration options */
  advanced: AdvancedConfig
  /** Last updated timestamp */
  lastUpdated: Date
}

/**
 * Configuration validation result.
 */
export interface ConfigValidationResult {
  /** Whether the configuration is valid */
  isValid: boolean
  /** List of validation errors */
  errors: string[]
  /** List of validation warnings */
  warnings: string[]
  /** Corrected configuration (if auto-fixable) */
  correctedConfig?: Partial<ShellConfig>
}

/**
 * Configuration change event.
 */
export interface ConfigChangeEvent {
  /** Path to the changed configuration property (dot notation) */
  path: string
  /** Previous value */
  oldValue: unknown
  /** New value */
  newValue: unknown
  /** Whether this was a bulk update */
  isBulkUpdate: boolean
  /** Timestamp of the change */
  timestamp: Date
}

/**
 * Configuration change listener function.
 */
export type ConfigChangeListener = (event: ConfigChangeEvent) => void

/**
 * Configuration import/export format.
 */
export interface ConfigExport {
  /** Configuration data */
  config: ShellConfig
  /** Export metadata */
  metadata: {
    /** Export timestamp */
    exportedAt: Date
    /** Shell version that created this export */
    shellVersion: string
    /** User agent that created this export */
    userAgent: string
  }
}

/**
 * Configuration manager interface for managing shell settings.
 */
export interface ConfigManager {
  /** Current configuration */
  readonly config: ShellConfig

  /** Whether auto-save is enabled */
  readonly autoSave: boolean

  /**
   * Get a configuration value by path.
   * @param path - Dot-notation path to the configuration property
   * @returns The configuration value or undefined if not found
   */
  readonly get: <T = unknown>(path: string) => T | undefined

  /**
   * Set a configuration value by path.
   * @param path - Dot-notation path to the configuration property
   * @param value - New value to set
   * @returns Promise that resolves when the value is set and persisted
   */
  readonly set: (path: string, value: unknown) => Promise<void>

  /**
   * Update multiple configuration values.
   * @param updates - Object with path-value pairs to update
   * @returns Promise that resolves when all values are set and persisted
   */
  readonly update: (updates: Record<string, unknown>) => Promise<void>

  /**
   * Reset configuration to defaults.
   * @param section - Optional section to reset (if not provided, resets all)
   * @returns Promise that resolves when configuration is reset and persisted
   */
  readonly reset: (section?: keyof ShellConfig) => Promise<void>

  /**
   * Validate the current configuration.
   * @returns Validation result with errors and warnings
   */
  readonly validate: () => ConfigValidationResult

  /**
   * Export configuration to JSON.
   * @returns Configuration export object
   */
  readonly export: () => ConfigExport

  /**
   * Import configuration from export object.
   * @param configExport - Configuration export to import
   * @returns Promise that resolves when configuration is imported and persisted
   */
  readonly import: (configExport: ConfigExport) => Promise<void>

  /**
   * Add listener for configuration changes.
   * @param listener - Function to call when configuration changes
   * @returns Function to remove the listener
   */
  readonly addListener: (listener: ConfigChangeListener) => () => void

  /**
   * Save current configuration to storage.
   * @returns Promise that resolves when configuration is saved
   */
  readonly save: () => Promise<void>

  /**
   * Load configuration from storage.
   * @returns Promise that resolves when configuration is loaded
   */
  readonly load: () => Promise<void>
}

/**
 * Configuration storage interface.
 */
export interface ConfigStorage {
  /**
   * Save configuration to storage.
   * @param config - Configuration to save
   * @returns Promise that resolves when saved
   */
  readonly save: (config: ShellConfig) => Promise<void>

  /**
   * Load configuration from storage.
   * @returns Promise that resolves to the loaded configuration or null if not found
   */
  readonly load: () => Promise<ShellConfig | null>

  /**
   * Clear stored configuration.
   * @returns Promise that resolves when cleared
   */
  readonly clear: () => Promise<void>

  /**
   * Check if storage is available.
   * @returns Whether storage is available for use
   */
  readonly isAvailable: () => boolean
}

/**
 * Configuration manager creation options.
 */
export interface ConfigManagerOptions {
  /** Storage implementation to use */
  storage?: ConfigStorage
  /** Whether to enable auto-save */
  autoSave?: boolean
  /** Storage key for persistence */
  storageKey?: string
  /** Validation options */
  validation?: {
    /** Whether to validate on load */
    validateOnLoad?: boolean
    /** Whether to auto-fix validation errors */
    autoFix?: boolean
  }
}
