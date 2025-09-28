/**
 * Configuration manager implementation for the moo-dang shell.
 *
 * Provides comprehensive configuration management with localStorage persistence,
 * validation, change notifications, and default value management for all shell settings.
 */

import type {
  AccessibilityConfig,
  AdvancedConfig,
  ConfigChangeEvent,
  ConfigChangeListener,
  ConfigExport,
  ConfigManager,
  ConfigManagerOptions,
  ConfigStorage,
  ConfigValidationResult,
  SecurityConfig,
  ShellBehaviorConfig,
  ShellConfig,
  TerminalAppearanceConfig,
} from './config-types'

import {consola} from 'consola'

/**
 * Default configuration values for the shell.
 */
const DEFAULT_CONFIG: ShellConfig = {
  version: '1.0.0',
  appearance: {
    theme: 'dark',
    fontSize: 14,
    fontFamily: 'Monaco, Menlo, Ubuntu Mono, Consolas, monospace',
    cursorBlink: true,
    scrollback: 1000,
    lineHeight: 1.2,
    letterSpacing: 0,
    fontLigatures: true,
  } as TerminalAppearanceConfig,
  behavior: {
    prompt: {
      style: 'default',
      customTemplate: '$ ',
      showDirectory: true,
      showGitBranch: false,
    },
    completion: {
      maxSuggestions: 20,
      minInputLength: 0,
      showDescriptions: true,
      autoCompletePrefix: true,
      caseSensitive: false,
      includeHiddenFiles: false,
    },
    history: {
      maxHistorySize: 1000,
      persist: true,
      storageKey: 'moo-dang-history',
      allowDuplicates: false,
      enableSearch: true,
      maxAgeDays: 30,
      saveSensitive: false,
    },
    execution: {
      maxProcesses: 10,
      commandTimeout: 30000,
      enableDebugLogging: false,
      prompt: '$ ',
    },
    autoSave: true,
    confirmDestructive: true,
    caseSensitive: false,
  } as ShellBehaviorConfig,
  security: {
    allowWasmExecution: true,
    maxWasmSize: 10,
    persistSensitiveData: false,
    sandboxWasm: true,
    allowNetworkAccess: false,
  } as SecurityConfig,
  accessibility: {
    highContrast: false,
    screenReader: false,
    enhancedFocus: false,
    announceOutput: false,
    reduceMotion: false,
  } as AccessibilityConfig,
  advanced: {
    debugMode: false,
    performanceMonitoring: false,
    experimentalFeatures: false,
    customCss: '',
    developerMode: false,
  } as AdvancedConfig,
  lastUpdated: new Date(),
} as const

/**
 * localStorage-based configuration storage implementation.
 */
class LocalStorageConfigStorage implements ConfigStorage {
  constructor(private readonly storageKey = 'moo-dang-config') {}

  readonly save = async (config: ShellConfig): Promise<void> => {
    if (!this.isAvailable()) {
      throw new Error('localStorage is not available')
    }

    try {
      const serialized = JSON.stringify({
        ...config,
        lastUpdated: config.lastUpdated.toISOString(),
      })
      localStorage.setItem(this.storageKey, serialized)
      consola.debug('Configuration saved to localStorage', {storageKey: this.storageKey})
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      consola.error('Failed to save configuration', {error: errorMessage})
      throw new Error(`Failed to save configuration: ${errorMessage}`)
    }
  }

  readonly load = async (): Promise<ShellConfig | null> => {
    if (!this.isAvailable()) {
      return null
    }

    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored == null) {
        consola.debug('No stored configuration found')
        return null
      }

      const parsed = JSON.parse(stored) as ShellConfig & {lastUpdated: string}
      const config: ShellConfig = {
        ...parsed,
        lastUpdated: new Date(parsed.lastUpdated),
      }

      consola.debug('Configuration loaded from localStorage', {storageKey: this.storageKey})
      return config
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      consola.error('Failed to load configuration', {error: errorMessage})
      return null
    }
  }

  readonly clear = async (): Promise<void> => {
    if (!this.isAvailable()) {
      return
    }

    try {
      localStorage.removeItem(this.storageKey)
      consola.debug('Configuration cleared from localStorage', {storageKey: this.storageKey})
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      consola.error('Failed to clear configuration', {error: errorMessage})
      throw new Error(`Failed to clear configuration: ${errorMessage}`)
    }
  }

  readonly isAvailable = (): boolean => {
    try {
      const test = '__localStorage_test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  }
}

/**
 * Shell configuration manager implementation using function-based pattern.
 *
 * Creates a configuration manager instance with localStorage persistence,
 * validation, and change notification capabilities.
 */
/**
 * Validate configuration import data.
 */
function validateImport(configExport: ConfigExport): ConfigValidationResult {
  const errors: string[] = []

  if (configExport.config == null || typeof configExport.config !== 'object') {
    errors.push('Invalid configuration data')
  }

  if (configExport.metadata == null || typeof configExport.metadata !== 'object') {
    errors.push('Invalid metadata')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
  }
}

/**
 * Merge stored configuration with defaults to ensure all properties exist.
 */
function mergeWithDefaults(stored: ShellConfig): ShellConfig {
  return {
    ...DEFAULT_CONFIG,
    ...stored,
    appearance: {
      ...DEFAULT_CONFIG.appearance,
      ...(stored.appearance ?? {}),
    },
    behavior: {
      ...DEFAULT_CONFIG.behavior,
      ...(stored.behavior ?? {}),
      prompt: {
        ...DEFAULT_CONFIG.behavior.prompt,
        ...(stored.behavior?.prompt ?? {}),
      },
      completion: {
        ...DEFAULT_CONFIG.behavior.completion,
        ...(stored.behavior?.completion ?? {}),
      },
      history: {
        ...DEFAULT_CONFIG.behavior.history,
        ...(stored.behavior?.history ?? {}),
      },
      execution: {
        ...DEFAULT_CONFIG.behavior.execution,
        ...(stored.behavior?.execution ?? {}),
      },
    },
    security: {
      ...DEFAULT_CONFIG.security,
      ...(stored.security ?? {}),
    },
    accessibility: {
      ...DEFAULT_CONFIG.accessibility,
      ...(stored.accessibility ?? {}),
    },
    advanced: {
      ...DEFAULT_CONFIG.advanced,
      ...(stored.advanced ?? {}),
    },
  }
}

export function createShellConfigManager(options: ConfigManagerOptions = {}): ConfigManager {
  let _config: ShellConfig = structuredClone(DEFAULT_CONFIG)
  const storage = options.storage ?? new LocalStorageConfigStorage(options.storageKey)
  const listeners = new Set<ConfigChangeListener>()
  const _autoSave = options.autoSave ?? true

  /**
   * Emit configuration change event to all listeners.
   */
  function emitChange(event: ConfigChangeEvent): void {
    for (const listener of listeners) {
      try {
        listener(event)
      } catch (error) {
        consola.error('Error in configuration change listener', {error})
      }
    }
  }

  const configManager: ConfigManager = {
    get config(): ShellConfig {
      return structuredClone(_config)
    },

    get autoSave(): boolean {
      return _autoSave
    },

    get: <T = unknown>(path: string): T | undefined => {
      try {
        const parts = path.split('.')
        let current: unknown = _config

        for (const part of parts) {
          if (current != null && typeof current === 'object' && part in current) {
            current = (current as Record<string, unknown>)[part]
          } else {
            return undefined
          }
        }

        return current as T
      } catch (error) {
        consola.error('Failed to get configuration value', {path, error})
        return undefined
      }
    },

    set: async (path: string, value: unknown): Promise<void> => {
      const oldValue = configManager.get(path)

      try {
        // Validate path
        if (!path || path.trim() === '') {
          throw new Error('Invalid configuration path')
        }

        if (path.includes('..') || path.startsWith('.') || path.endsWith('.')) {
          throw new Error('Invalid configuration path')
        }

        const parts = path.split('.')
        const lastPart = parts.pop()

        if (lastPart == null || lastPart.trim() === '') {
          throw new Error('Invalid configuration path')
        }

        let current: Record<string, unknown> = _config as unknown as Record<string, unknown>

        // Navigate to parent object
        for (const part of parts) {
          if (!(part in current) || typeof current[part] !== 'object' || current[part] == null) {
            throw new Error(`Invalid configuration path: ${path}`)
          }
          current = current[part] as Record<string, unknown>
        }

        // Set the value
        current[lastPart] = value
        _config.lastUpdated = new Date()

        // Emit change event
        emitChange({
          path,
          oldValue,
          newValue: value,
          isBulkUpdate: false,
          timestamp: _config.lastUpdated,
        })

        // Auto-save if enabled
        if (_autoSave) {
          await configManager.save()
        }

        consola.debug('Configuration value set', {path, value})
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        consola.error('Failed to set configuration value', {path, value, error: errorMessage})
        throw new Error(`Failed to set configuration value at ${path}: ${errorMessage}`)
      }
    },

    update: async (updates: Record<string, unknown>): Promise<void> => {
      const changeEvents: ConfigChangeEvent[] = []

      try {
        // Collect all changes
        for (const [path, value] of Object.entries(updates)) {
          const oldValue = configManager.get(path)
          changeEvents.push({
            path,
            oldValue,
            newValue: value,
            isBulkUpdate: true,
            timestamp: new Date(),
          })
        }

        // Apply all changes
        for (const [path, value] of Object.entries(updates)) {
          const parts = path.split('.')
          const lastPart = parts.pop()

          if (lastPart == null) {
            throw new Error(`Invalid configuration path: ${path}`)
          }

          let current: Record<string, unknown> = _config as unknown as Record<string, unknown>

          // Navigate to parent object
          for (const part of parts) {
            if (!(part in current) || typeof current[part] !== 'object' || current[part] == null) {
              throw new Error(`Invalid configuration path: ${path}`)
            }
            current = current[part] as Record<string, unknown>
          }

          // Set the value
          current[lastPart] = value
        }

        _config.lastUpdated = new Date()

        // Emit all change events
        for (const event of changeEvents) {
          emitChange(event)
        }

        // Auto-save if enabled
        if (_autoSave) {
          await configManager.save()
        }

        consola.debug('Configuration updated', {updates})
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        consola.error('Failed to update configuration', {updates, error: errorMessage})
        throw new Error(`Failed to update configuration: ${errorMessage}`)
      }
    },

    reset: async (section?: keyof ShellConfig): Promise<void> => {
      try {
        const oldConfig = structuredClone(_config)

        if (section) {
          // Reset specific section
          _config[section] = structuredClone(DEFAULT_CONFIG[section]) as never
        } else {
          // Reset entire configuration
          _config = structuredClone(DEFAULT_CONFIG)
        }

        _config.lastUpdated = new Date()

        // Emit change event
        emitChange({
          path: section ?? 'root',
          oldValue: section ? oldConfig[section] : oldConfig,
          newValue: section ? _config[section] : _config,
          isBulkUpdate: false,
          timestamp: _config.lastUpdated,
        })

        // Auto-save if enabled
        if (_autoSave) {
          await configManager.save()
        }

        consola.info('Configuration reset', {section: section ?? 'all'})
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        consola.error('Failed to reset configuration', {section, error: errorMessage})
        throw new Error(`Failed to reset configuration: ${errorMessage}`)
      }
    },

    validate: (): ConfigValidationResult => {
      const errors: string[] = []
      const warnings: string[] = []

      try {
        // Validate appearance config
        if (!['dark', 'light', 'solarized-dark', 'solarized-light', 'custom'].includes(_config.appearance.theme)) {
          errors.push(`Invalid theme: ${_config.appearance.theme}`)
        }

        if (![10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24].includes(_config.appearance.fontSize)) {
          errors.push(`Invalid font size: ${_config.appearance.fontSize}`)
        }

        if (_config.appearance.scrollback < 100) {
          warnings.push('Scrollback buffer is very small, consider increasing for better history')
        }

        // Validate behavior config
        if (!['default', 'minimal', 'verbose', 'git-aware', 'custom'].includes(_config.behavior.prompt.style)) {
          errors.push(`Invalid prompt style: ${_config.behavior.prompt.style}`)
        }

        if (_config.behavior.completion.maxSuggestions < 1) {
          errors.push('Max suggestions must be at least 1')
        }

        if (_config.behavior.history.maxHistorySize && _config.behavior.history.maxHistorySize < 10) {
          warnings.push('History size is very small, consider increasing for better history management')
        }

        // Validate security config
        if (_config.security.maxWasmSize < 1 || _config.security.maxWasmSize > 100) {
          warnings.push('WASM size limit should be between 1-100 MB')
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
        }
      } catch (error) {
        return {
          isValid: false,
          errors: [`Validation failed: ${error instanceof Error ? error.message : String(error)}`],
          warnings: [],
        }
      }
    },

    export: (): ConfigExport => {
      return {
        config: structuredClone(_config),
        metadata: {
          exportedAt: new Date(),
          shellVersion: _config.version,
          userAgent: globalThis.navigator?.userAgent ?? 'Unknown',
        },
      }
    },

    import: async (configExport: ConfigExport): Promise<void> => {
      try {
        const validation = validateImport(configExport)
        if (!validation.isValid) {
          throw new Error(`Invalid configuration import: ${validation.errors.join(', ')}`)
        }

        const oldConfig = structuredClone(_config)
        _config = structuredClone(configExport.config)
        _config.lastUpdated = new Date()

        // Emit change event
        emitChange({
          path: 'root',
          oldValue: oldConfig,
          newValue: _config,
          isBulkUpdate: false,
          timestamp: _config.lastUpdated,
        })

        // Auto-save if enabled
        if (_autoSave) {
          await configManager.save()
        }

        consola.info('Configuration imported successfully')
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        consola.error('Failed to import configuration', {error: errorMessage})
        throw new Error(`Failed to import configuration: ${errorMessage}`)
      }
    },

    addListener: (listener: ConfigChangeListener): (() => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    save: async (): Promise<void> => {
      try {
        await storage.save(_config)
        consola.debug('Configuration saved successfully')
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        consola.error('Failed to save configuration', {error: errorMessage})
        throw new Error(`Failed to save configuration: ${errorMessage}`)
      }
    },

    load: async (): Promise<void> => {
      try {
        const stored = await storage.load()
        if (stored) {
          // Merge with defaults to ensure all properties exist
          _config = mergeWithDefaults(stored)
          consola.debug('Configuration loaded successfully')
        } else {
          consola.debug('No stored configuration found, using defaults')
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        consola.error('Failed to load configuration', {error: errorMessage})
        // Don't throw, just use defaults
        _config = structuredClone(DEFAULT_CONFIG)
      }
    },
  }

  // Load configuration from storage on initialization
  if (storage.isAvailable()) {
    configManager.load().catch(error => {
      consola.error('Failed to load configuration during initialization', {error})
    })
  }

  return configManager
}

/**
 * Create a new configuration manager instance.
 */
export function createConfigManager(options?: ConfigManagerOptions): ConfigManager {
  return createShellConfigManager(options ?? {})
}

/**
 * Default configuration for easy access.
 */
export {DEFAULT_CONFIG}
