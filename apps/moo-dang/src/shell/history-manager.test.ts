import type {HistoryConfig, HistoryEntry} from './history-types.js'

import {beforeEach, describe, expect, it, vi} from 'vitest'
import {createHistoryManager} from './history-manager.js'

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

// Set up global localStorage mock
Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

describe('History Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  describe('createHistoryManager', () => {
    it('should create history manager with default config', () => {
      const manager = createHistoryManager()
      expect(manager).toBeDefined()
      expect(typeof manager.addCommand).toBe('function')
      expect(typeof manager.getHistory).toBe('function')
      expect(typeof manager.searchHistory).toBe('function')
      expect(typeof manager.clearHistory).toBe('function')
      expect(typeof manager.exportHistory).toBe('function')
      expect(typeof manager.getStats).toBe('function')
    })

    it('should create history manager with custom config', () => {
      const config: HistoryConfig = {
        maxHistorySize: 200,
        storageKey: 'custom-history',
        persist: false,
      }
      const manager = createHistoryManager(config)
      expect(manager).toBeDefined()
    })
  })

  describe('addCommand', () => {
    it('should add command to history', async () => {
      const manager = createHistoryManager()
      await manager.addCommand('echo hello', {
        workingDirectory: '/test',
        success: true,
      })

      const entries = await manager.getHistory()
      expect(entries).toHaveLength(1)
      expect(entries[0]?.command).toBe('echo hello')
      expect(entries[0]?.workingDirectory).toBe('/test')
      expect(entries[0]?.success).toBe(true)
    })

    it('should respect maxHistorySize limit', async () => {
      const manager = createHistoryManager({maxHistorySize: 2})

      await manager.addCommand('command1')
      await manager.addCommand('command2')
      await manager.addCommand('command3')

      const entries = await manager.getHistory()
      expect(entries.length).toBeLessThanOrEqual(2)
    })

    it('should save to localStorage when persist is true', async () => {
      const manager = createHistoryManager({persist: true})
      await manager.addCommand('test command')

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'moo-dang-history',
        expect.stringContaining('"command":"test command"'),
      )
    })

    it('should not save to localStorage when persist is false', async () => {
      const manager = createHistoryManager({persist: false})
      await manager.addCommand('test command')

      expect(mockLocalStorage.setItem).not.toHaveBeenCalled()
    })
  })

  describe('searchHistory', () => {
    let manager: ReturnType<typeof createHistoryManager>

    beforeEach(async () => {
      manager = createHistoryManager()
      await manager.addCommand('git status')
      await manager.addCommand('git commit -m "fix"')
      await manager.addCommand('npm test')
      await manager.addCommand('git push origin main')
    })

    it('should search by command text', async () => {
      const results = await manager.searchHistory({query: 'git'})
      expect(results.entries).toHaveLength(3)
      expect(results.entries.every((entry: HistoryEntry) => entry.command.includes('git'))).toBe(true)
    })

    it('should limit search results', async () => {
      const results = await manager.searchHistory({query: 'git', maxResults: 1})
      expect(results.entries).toHaveLength(1)
    })

    it('should handle case-insensitive search', async () => {
      const results = await manager.searchHistory({query: 'GIT'})
      expect(results.entries).toHaveLength(3)
    })

    it('should return empty results for no matches', async () => {
      const results = await manager.searchHistory({query: 'nonexistent'})
      expect(results.entries).toHaveLength(0)
      expect(results.totalMatches).toBe(0)
    })

    it('should provide search statistics', async () => {
      const results = await manager.searchHistory({query: 'git'})
      expect(results.totalMatches).toBe(3)
      expect(results.truncated).toBe(false)
    })
  })

  describe('clearHistory', () => {
    it('should clear all entries', async () => {
      const manager = createHistoryManager()
      await manager.addCommand('command1')
      await manager.addCommand('command2')

      const entriesBefore = await manager.getHistory()
      expect(entriesBefore).toHaveLength(2)

      const removedCount = await manager.clearHistory()
      expect(removedCount).toBe(2)

      const entriesAfter = await manager.getHistory()
      expect(entriesAfter).toHaveLength(0)
    })

    it('should remove from localStorage when persist is true', async () => {
      const manager = createHistoryManager({persist: true})
      await manager.addCommand('command1')
      await manager.clearHistory()

      expect(mockLocalStorage.setItem).toHaveBeenCalled()
    })
  })

  describe('exportHistory', () => {
    it('should export history in JSON format', async () => {
      const manager = createHistoryManager()
      await manager.addCommand('echo hello')
      await manager.addCommand('pwd')

      const exported = await manager.exportHistory()
      const parsed = JSON.parse(exported)

      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed[0]?.command).toBe('echo hello')
      expect(parsed[1]?.command).toBe('pwd')
    })
  })

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      const manager = createHistoryManager()
      await manager.addCommand('git status', {success: true, duration: 100})
      await manager.addCommand('npm test', {success: false, duration: 200})
      await manager.addCommand('git push', {success: true, duration: 150})

      const stats = await manager.getStats()

      expect(stats.totalCommands).toBe(3)
      expect(stats.uniqueCommands).toBe(3)
      expect(stats.topCommands).toHaveLength(3)
    })

    it('should handle empty history', async () => {
      const manager = createHistoryManager()
      const stats = await manager.getStats()

      expect(stats.totalCommands).toBe(0)
      expect(stats.uniqueCommands).toBe(0)
      expect(stats.topCommands).toHaveLength(0)
    })
  })

  describe('getRecent', () => {
    it('should return recent commands', async () => {
      const manager = createHistoryManager()
      await manager.addCommand('command1')
      await manager.addCommand('command2')
      await manager.addCommand('command3')

      const recent = await manager.getRecent(2)
      expect(recent).toHaveLength(2)
      expect(recent[0]?.command).toBe('command3') // Most recent first
      expect(recent[1]?.command).toBe('command2')
    })
  })

  describe('getFrequent', () => {
    it('should return frequent commands', async () => {
      const manager = createHistoryManager({allowDuplicates: true})
      await manager.addCommand('git status')
      await manager.addCommand('git push')
      await manager.addCommand('git status') // Duplicate
      await manager.addCommand('npm test')

      const frequent = await manager.getFrequent(3)
      expect(frequent).toHaveLength(3)
      // Check that the most frequent command has count > 1
      const mostFrequent = frequent[0]
      expect(mostFrequent?.count).toBeGreaterThan(1)
    })
  })

  describe('localStorage persistence', () => {
    it('should load existing history from localStorage', async () => {
      const existingHistory = {
        entries: [
          {
            id: '1',
            command: 'existing command',
            timestamp: new Date(),
            workingDirectory: '/',
            success: true,
          },
        ],
        entryIdCounter: 1,
      }

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingHistory))

      const manager = createHistoryManager({persist: true})
      await manager.load()
      const entries = await manager.getHistory()

      expect(entries).toHaveLength(1)
      expect(entries[0]?.command).toBe('existing command')
    })

    it('should handle corrupted localStorage data gracefully', async () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json')

      const manager = createHistoryManager({persist: true})
      await manager.load()
      const entries = await manager.getHistory()

      expect(entries).toHaveLength(0)
    })

    it('should handle localStorage errors gracefully', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      const manager = createHistoryManager({persist: true})

      // Should not throw error
      await expect(manager.addCommand('test')).resolves.not.toThrow()
    })
  })
})
