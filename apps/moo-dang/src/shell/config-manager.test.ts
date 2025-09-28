/**
 * Comprehensive test suite for shell configuration management system.
 *
 * Tests configuration manager functionality including persistence, validation,
 * change notifications, and integration with shell commands.
 */

import type {ConfigChangeEvent, ConfigStorage, ShellConfig} from './config-types'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {createConfigManager, DEFAULT_CONFIG, ShellConfigManager} from './config-manager'

// Mock localStorage for testing
const mockStorage = (): Record<string, string> => ({})

const createMockStorage = (): ConfigStorage => {
  const storage = mockStorage()

  return {
    save: vi.fn(async (config: ShellConfig) => {
      storage['test-config'] = JSON.stringify({
        ...config,
        lastUpdated: config.lastUpdated.toISOString(),
      })
    }),
    load: vi.fn(async () => {
      const stored = storage['test-config']
      if (!stored) {
        return null
      }
      const parsed = JSON.parse(stored) as ShellConfig & {lastUpdated: string}
      return {
        ...parsed,
        lastUpdated: new Date(parsed.lastUpdated),
      }
    }),
    clear: vi.fn(async () => {
      delete storage['test-config']
    }),
    isAvailable: vi.fn(() => true),
  }
}

describe('ShellConfigManager', () => {
  let configManager: ShellConfigManager
  let mockStorageInstance: ConfigStorage

  beforeEach(() => {
    mockStorageInstance = createMockStorage()
    configManager = new ShellConfigManager({
      storage: mockStorageInstance,
      autoSave: false, // Disable auto-save for testing
    })
  })

  describe('constructor and initialization', () => {
    it('should initialize with default configuration', () => {
      const config = configManager.config

      expect(config.version).toBe(DEFAULT_CONFIG.version)
      expect(config.appearance.theme).toBe('dark')
      expect(config.behavior.prompt.style).toBe('default')
      expect(config.security.allowWasmExecution).toBe(true)
    })

    it('should respect auto-save option', () => {
      const autoSaveManager = new ShellConfigManager({autoSave: true})
      const noAutoSaveManager = new ShellConfigManager({autoSave: false})

      expect(autoSaveManager.autoSave).toBe(true)
      expect(noAutoSaveManager.autoSave).toBe(false)
    })
  })

  describe('get configuration values', () => {
    it('should get configuration value by path', () => {
      const theme = configManager.get<string>('appearance.theme')
      const fontSize = configManager.get<number>('appearance.fontSize')
      const promptStyle = configManager.get<string>('behavior.prompt.style')

      expect(theme).toBe('dark')
      expect(fontSize).toBe(14)
      expect(promptStyle).toBe('default')
    })

    it('should return undefined for non-existent paths', () => {
      const value = configManager.get('non.existent.path')
      expect(value).toBeUndefined()
    })

    it('should handle deeply nested paths', () => {
      const maxSuggestions = configManager.get<number>('behavior.completion.maxSuggestions')
      expect(maxSuggestions).toBe(20)
    })
  })

  describe('set configuration values', () => {
    it('should set configuration value by path', async () => {
      await configManager.set('appearance.theme', 'light')

      const theme = configManager.get<string>('appearance.theme')
      expect(theme).toBe('light')
    })

    it('should update lastUpdated timestamp when setting values', async () => {
      const originalTimestamp = configManager.config.lastUpdated

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1))
      await configManager.set('appearance.fontSize', 16)

      const newTimestamp = configManager.config.lastUpdated
      expect(newTimestamp.getTime()).toBeGreaterThan(originalTimestamp.getTime())
    })

    it('should throw error for invalid paths', async () => {
      await expect(configManager.set('', 'value')).rejects.toThrow('Invalid configuration path')
      await expect(configManager.set('invalid..path', 'value')).rejects.toThrow()
    })

    it('should handle nested object paths', async () => {
      await configManager.set('behavior.prompt.showDirectory', false)

      const showDirectory = configManager.get<boolean>('behavior.prompt.showDirectory')
      expect(showDirectory).toBe(false)
    })
  })

  describe('update multiple values', () => {
    it('should update multiple configuration values', async () => {
      const updates = {
        'appearance.theme': 'solarized-dark',
        'appearance.fontSize': 18,
        'behavior.autoSave': false,
      }

      await configManager.update(updates)

      expect(configManager.get('appearance.theme')).toBe('solarized-dark')
      expect(configManager.get('appearance.fontSize')).toBe(18)
      expect(configManager.get('behavior.autoSave')).toBe(false)
    })

    it('should emit change events for bulk updates', async () => {
      const changeEvents: ConfigChangeEvent[] = []
      const removeListener = configManager.addListener(event => {
        changeEvents.push(event)
      })

      await configManager.update({
        'appearance.theme': 'light',
        'behavior.caseSensitive': true,
      })

      expect(changeEvents).toHaveLength(2)
      expect(changeEvents[0]?.isBulkUpdate).toBe(true)
      expect(changeEvents[1]?.isBulkUpdate).toBe(true)

      removeListener()
    })
  })

  describe('reset configuration', () => {
    it('should reset entire configuration to defaults', async () => {
      // Change some values first
      await configManager.set('appearance.theme', 'light')
      await configManager.set('appearance.fontSize', 20)

      // Reset everything
      await configManager.reset()

      expect(configManager.get('appearance.theme')).toBe('dark')
      expect(configManager.get('appearance.fontSize')).toBe(14)
    })

    it('should reset specific section only', async () => {
      // Change values in different sections
      await configManager.set('appearance.theme', 'light')
      await configManager.set('behavior.autoSave', false)

      // Reset only appearance section
      await configManager.reset('appearance')

      expect(configManager.get('appearance.theme')).toBe('dark') // Reset
      expect(configManager.get('behavior.autoSave')).toBe(false) // Not reset
    })
  })

  describe('validation', () => {
    it('should validate correct configuration', () => {
      const validation = configManager.validate()

      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should detect invalid theme', async () => {
      await configManager.set('appearance.theme', 'invalid-theme')

      const validation = configManager.validate()

      expect(validation.isValid).toBe(false)
      expect(validation.errors.some(error => error.includes('Invalid theme'))).toBe(true)
    })

    it('should detect invalid font size', async () => {
      await configManager.set('appearance.fontSize', 999)

      const validation = configManager.validate()

      expect(validation.isValid).toBe(false)
      expect(validation.errors.some(error => error.includes('Invalid font size'))).toBe(true)
    })

    it('should provide warnings for suboptimal values', async () => {
      await configManager.set('appearance.scrollback', 50) // Very small

      const validation = configManager.validate()

      expect(validation.warnings.some(warning => warning.includes('very small'))).toBe(true)
    })
  })

  describe('export and import', () => {
    it('should export configuration with metadata', () => {
      const configExport = configManager.export()

      expect(configExport.config).toEqual(configManager.config)
      expect(configExport.metadata.shellVersion).toBe(configManager.config.version)
      expect(configExport.metadata.exportedAt).toBeInstanceOf(Date)
    })

    it('should import configuration successfully', async () => {
      // Create a modified configuration export
      const originalExport = configManager.export()
      const modifiedConfig = {
        ...originalExport.config,
        appearance: {
          ...originalExport.config.appearance,
          theme: 'light' as const,
          fontSize: 16 as const,
        },
      }

      const modifiedExport = {
        ...originalExport,
        config: modifiedConfig,
      }

      await configManager.import(modifiedExport)

      expect(configManager.get('appearance.theme')).toBe('light')
      expect(configManager.get('appearance.fontSize')).toBe(16)
    })
  })

  describe('change listeners', () => {
    it('should emit change events when values are set', async () => {
      const changeEvents: ConfigChangeEvent[] = []
      const removeListener = configManager.addListener(event => {
        changeEvents.push(event)
      })

      await configManager.set('appearance.theme', 'light')

      expect(changeEvents).toHaveLength(1)
      expect(changeEvents[0]?.path).toBe('appearance.theme')
      expect(changeEvents[0]?.oldValue).toBe('dark')
      expect(changeEvents[0]?.newValue).toBe('light')
      expect(changeEvents[0]?.isBulkUpdate).toBe(false)

      removeListener()
    })

    it('should remove listener when unsubscribe function is called', async () => {
      const changeEvents: ConfigChangeEvent[] = []
      const removeListener = configManager.addListener(event => {
        changeEvents.push(event)
      })

      await configManager.set('appearance.theme', 'light')
      expect(changeEvents).toHaveLength(1)

      removeListener()

      await configManager.set('appearance.theme', 'dark')
      expect(changeEvents).toHaveLength(1) // No new events after removal
    })

    it('should handle errors in listeners gracefully', async () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error')
      })

      configManager.addListener(errorListener)

      // This should not throw, even though the listener throws
      await expect(configManager.set('appearance.theme', 'light')).resolves.not.toThrow()
      expect(errorListener).toHaveBeenCalled()
    })
  })

  describe('persistence', () => {
    it('should save configuration to storage', async () => {
      await configManager.save()

      expect(mockStorageInstance.save).toHaveBeenCalledWith(configManager.config)
    })

    it('should load configuration from storage', async () => {
      // Prepare stored configuration
      const storedConfig = {
        ...DEFAULT_CONFIG,
        appearance: {
          ...DEFAULT_CONFIG.appearance,
          theme: 'light' as const,
        },
      }

      vi.mocked(mockStorageInstance.load).mockResolvedValueOnce(storedConfig)

      await configManager.load()

      expect(configManager.get('appearance.theme')).toBe('light')
    })

    it('should handle storage load errors gracefully', async () => {
      vi.mocked(mockStorageInstance.load).mockRejectedValueOnce(new Error('Storage error'))

      // Should not throw and should use defaults
      await expect(configManager.load()).resolves.not.toThrow()
      expect(configManager.get('appearance.theme')).toBe('dark') // Default value
    })

    it('should merge loaded config with defaults', async () => {
      // Simulate partial stored configuration (missing some properties)
      const partialConfig = {
        version: '1.0.0',
        appearance: {
          theme: 'light' as const,
          // Missing other appearance properties
        },
        lastUpdated: new Date(),
        // Missing other sections
      } as Partial<ShellConfig>

      // Clear any previous mock calls and set up new return value
      vi.mocked(mockStorageInstance.load).mockClear()
      vi.mocked(mockStorageInstance.load).mockResolvedValue(partialConfig as ShellConfig)

      // Verify initial state (should be defaults from constructor)
      expect(configManager.get('appearance.theme')).toBe('dark')

      // Call load explicitly to test merge functionality
      await configManager.load()

      // Verify the mock was called
      expect(vi.mocked(mockStorageInstance.load)).toHaveBeenCalled()

      // Should have loaded value
      expect(configManager.get('appearance.theme')).toBe('light')
      // Should have default values for missing properties
      expect(configManager.get('appearance.fontSize')).toBe(14)
      expect(configManager.get('behavior.prompt.style')).toBe('default')
    })
  })

  describe('auto-save functionality', () => {
    it('should auto-save when auto-save is enabled', async () => {
      const autoSaveManager = new ShellConfigManager({
        storage: mockStorageInstance,
        autoSave: true,
      })

      await autoSaveManager.set('appearance.theme', 'light')

      // Should have called save automatically
      expect(mockStorageInstance.save).toHaveBeenCalled()
    })

    it('should not auto-save when auto-save is disabled', async () => {
      await configManager.set('appearance.theme', 'light')

      // Should not have called save automatically
      expect(mockStorageInstance.save).not.toHaveBeenCalled()
    })
  })
})

describe('createConfigManager factory', () => {
  it('should create a ShellConfigManager instance', () => {
    const manager = createConfigManager()

    expect(manager).toBeInstanceOf(ShellConfigManager)
    expect(typeof manager.get).toBe('function')
    expect(typeof manager.set).toBe('function')
  })

  it('should pass options to constructor', () => {
    const manager = createConfigManager({autoSave: false})

    expect(manager.autoSave).toBe(false)
  })
})

describe('DEFAULT_CONFIG', () => {
  it('should have all required configuration sections', () => {
    expect(DEFAULT_CONFIG).toHaveProperty('version')
    expect(DEFAULT_CONFIG).toHaveProperty('appearance')
    expect(DEFAULT_CONFIG).toHaveProperty('behavior')
    expect(DEFAULT_CONFIG).toHaveProperty('security')
    expect(DEFAULT_CONFIG).toHaveProperty('accessibility')
    expect(DEFAULT_CONFIG).toHaveProperty('advanced')
    expect(DEFAULT_CONFIG).toHaveProperty('lastUpdated')
  })

  it('should have sensible default values', () => {
    expect(DEFAULT_CONFIG.appearance.theme).toBe('dark')
    expect(DEFAULT_CONFIG.appearance.fontSize).toBe(14)
    expect(DEFAULT_CONFIG.behavior.autoSave).toBe(true)
    expect(DEFAULT_CONFIG.security.allowWasmExecution).toBe(true)
    expect(DEFAULT_CONFIG.accessibility.highContrast).toBe(false)
  })

  it('should have valid nested configuration', () => {
    expect(DEFAULT_CONFIG.behavior.prompt.style).toBe('default')
    expect(DEFAULT_CONFIG.behavior.completion.maxSuggestions).toBe(20)
    expect(DEFAULT_CONFIG.behavior.history.maxHistorySize).toBe(1000)
  })
})
