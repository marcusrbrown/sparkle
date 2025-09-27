/**
 * Tests for shell command completion system.
 *
 * Comprehensive test suite covering completion engine, providers, and integration
 * to ensure reliable completion functionality in the moo-dang shell environment.
 */

import type {CompletionProvider, CompletionSuggestion} from './completion-types'

import {beforeEach, describe, expect, it} from 'vitest'
import {createCompletionEngine} from './completion-engine'
import {createCompletionProviders} from './completion-providers'
import {ShellEnvironment} from './environment'
import {VirtualFileSystemImpl} from './virtual-file-system'

describe('Completion Engine (TASK-028)', () => {
  describe('Core Engine Functionality', () => {
    it('should create engine with default configuration', () => {
      const engine = createCompletionEngine()
      expect(engine.config.maxSuggestions).toBe(20)
      expect(engine.config.caseSensitive).toBe(false)
      expect(engine.config.autoCompletePrefix).toBe(true)
    })

    it('should create engine with custom configuration', () => {
      const engine = createCompletionEngine({
        maxSuggestions: 10,
        caseSensitive: true,
        minInputLength: 2,
      })

      expect(engine.config.maxSuggestions).toBe(10)
      expect(engine.config.caseSensitive).toBe(true)
      expect(engine.config.minInputLength).toBe(2)
    })

    it('should register and unregister providers', () => {
      const engine = createCompletionEngine()

      const testProvider: CompletionProvider = {
        id: 'test',
        name: 'Test Provider',
        supportedTypes: ['command'],
        priority: 'medium',
        canComplete: () => true,
        getCompletions: async () => [],
      }

      engine.registerProvider(testProvider)
      expect(engine.getProviders()).toHaveLength(1)
      expect(engine.getProviders()[0]?.id).toBe('test')

      engine.unregisterProvider('test')
      expect(engine.getProviders()).toHaveLength(0)
    })

    it('should not register duplicate providers', () => {
      const engine = createCompletionEngine()

      const testProvider: CompletionProvider = {
        id: 'test',
        name: 'Test Provider',
        supportedTypes: ['command'],
        priority: 'medium',
        canComplete: () => true,
        getCompletions: async () => [],
      }

      engine.registerProvider(testProvider)
      engine.registerProvider(testProvider) // Should warn, not add duplicate

      expect(engine.getProviders()).toHaveLength(1)
    })
  })

  describe('Completion Generation', () => {
    it('should generate empty completions for short input', async () => {
      const engine = createCompletionEngine({minInputLength: 3})

      const result = await engine.getCompletions('ab', 2, '/', {})

      expect(result.suggestions).toHaveLength(0)
      expect(result.hasMore).toBe(false)
    })

    it('should collect suggestions from multiple providers', async () => {
      const engine = createCompletionEngine()

      const provider1: CompletionProvider = {
        id: 'provider1',
        name: 'Provider 1',
        supportedTypes: ['command'],
        priority: 'high',
        canComplete: () => true,
        getCompletions: async () => [
          {
            text: 'echo',
            type: 'command',
            description: 'Echo command',
            priority: 'high',
          },
        ],
      }

      const provider2: CompletionProvider = {
        id: 'provider2',
        name: 'Provider 2',
        supportedTypes: ['command'],
        priority: 'medium',
        canComplete: () => true,
        getCompletions: async () => [
          {
            text: 'ls',
            type: 'command',
            description: 'List command',
            priority: 'high',
          },
        ],
      }

      engine.registerProvider(provider1)
      engine.registerProvider(provider2)

      const result = await engine.getCompletions('l', 1, '/', {})

      expect(result.suggestions).toHaveLength(2)
      expect(result.suggestions.map((s: CompletionSuggestion) => s.text)).toEqual(['ls', 'echo'])
    })

    it('should sort suggestions by priority and relevance', async () => {
      const engine = createCompletionEngine()

      const provider: CompletionProvider = {
        id: 'test',
        name: 'Test Provider',
        supportedTypes: ['command'],
        priority: 'high',
        canComplete: () => true,
        getCompletions: async _context => [
          {
            text: 'list',
            type: 'command',
            description: 'List command',
            priority: 'low',
          },
          {
            text: 'ls',
            type: 'command',
            description: 'List files (exact match)',
            priority: 'high',
          },
          {
            text: 'locate',
            type: 'command',
            description: 'Locate command',
            priority: 'medium',
          },
        ],
      }

      engine.registerProvider(provider)

      const result = await engine.getCompletions('l', 1, '/', {})

      // Should prioritize: exact match + high priority first, then by priority
      expect(result.suggestions[0]?.text).toBe('ls')
      expect(result.suggestions[1]?.text).toBe('locate')
      expect(result.suggestions[2]?.text).toBe('list')
    })

    it('should limit suggestions to maxSuggestions', async () => {
      const engine = createCompletionEngine({maxSuggestions: 2})

      const provider: CompletionProvider = {
        id: 'test',
        name: 'Test Provider',
        supportedTypes: ['command'],
        priority: 'high',
        canComplete: () => true,
        getCompletions: async () => [
          {text: 'cmd1', type: 'command', description: 'Command 1', priority: 'high'},
          {text: 'cmd2', type: 'command', description: 'Command 2', priority: 'high'},
          {text: 'cmd3', type: 'command', description: 'Command 3', priority: 'high'},
        ],
      }

      engine.registerProvider(provider)

      const result = await engine.getCompletions('cmd', 3, '/', {})

      expect(result.suggestions).toHaveLength(2)
      expect(result.hasMore).toBe(true)
    })

    it('should find common prefix for auto-completion', async () => {
      const engine = createCompletionEngine({autoCompletePrefix: true})

      const provider: CompletionProvider = {
        id: 'test',
        name: 'Test Provider',
        supportedTypes: ['command'],
        priority: 'high',
        canComplete: () => true,
        getCompletions: async () => [
          {text: 'test_command_1', type: 'command', description: 'Test 1', priority: 'high'},
          {text: 'test_command_2', type: 'command', description: 'Test 2', priority: 'high'},
          {text: 'test_other', type: 'command', description: 'Test Other', priority: 'high'},
        ],
      }

      engine.registerProvider(provider)

      const result = await engine.getCompletions('test', 4, '/', {})

      expect(result.commonPrefix).toBe('test_')
    })
  })

  describe('Suggestion Application', () => {
    it('should apply suggestion by replacing current word', () => {
      const engine = createCompletionEngine()

      const suggestion: CompletionSuggestion = {
        text: 'echo',
        type: 'command',
        description: 'Echo command',
        priority: 'high',
      }

      const {newInput, newCursorPosition} = engine.applySuggestion('ec hello', suggestion, 2)

      expect(newInput).toBe('echo hello')
      expect(newCursorPosition).toBe(4)
    })

    it('should apply suggestion with explicit range', () => {
      const engine = createCompletionEngine()

      const suggestion: CompletionSuggestion = {
        text: 'echo',
        type: 'command',
        description: 'Echo command',
        priority: 'high',
        range: {start: 0, end: 2},
      }

      const {newInput, newCursorPosition} = engine.applySuggestion('ec hello', suggestion, 2)

      expect(newInput).toBe('echo hello')
      expect(newCursorPosition).toBe(4)
    })

    it('should add space when required', () => {
      const engine = createCompletionEngine()

      const suggestion: CompletionSuggestion = {
        text: 'echo',
        type: 'command',
        description: 'Echo command',
        priority: 'high',
        requiresSpace: true,
      }

      const {newInput, newCursorPosition} = engine.applySuggestion('ec', suggestion, 2)

      expect(newInput).toBe('echo ')
      expect(newCursorPosition).toBe(5)
    })
  })
})

describe('Completion Providers', () => {
  let fileSystem: VirtualFileSystemImpl
  let environment: ShellEnvironment
  let commands: Map<string, unknown>
  let providers: CompletionProvider[]

  beforeEach(async () => {
    fileSystem = new VirtualFileSystemImpl(false)
    environment = new ShellEnvironment(fileSystem)
    commands = new Map([
      ['echo', {}],
      ['ls', {}],
      ['cat', {}],
      ['cd', {}],
    ])

    // Set up test file system
    await fileSystem.writeFile('/test.txt', 'test content')
    await fileSystem.createDirectory('/subdir')
    await fileSystem.writeFile('/subdir/nested.txt', 'nested content')
    await fileSystem.writeFile('/.hidden', 'hidden file')

    providers = createCompletionProviders(commands, fileSystem, environment)
  })

  describe('Command Completion Provider', () => {
    it('should complete command names', async () => {
      const commandProvider = providers.find(p => p.id === 'commands')
      expect(commandProvider).toBeDefined()

      const context = {
        input: 'ec',
        cursorPosition: 2,
        commandParts: ['ec'],
        currentPartIndex: 0,
        currentPart: 'ec',
        workingDirectory: '/',
        environmentVariables: {},
        isNewCommand: true,
      }

      if (!commandProvider) {
        throw new Error('Command provider not found')
      }
      const suggestions = await commandProvider.getCompletions(context, {
        maxSuggestions: 10,
        minInputLength: 0,
        showDescriptions: true,
        autoCompletePrefix: true,
        caseSensitive: false,
        includeHiddenFiles: false,
      })

      expect(suggestions).toHaveLength(1)
      expect(suggestions[0]?.text).toBe('echo')
      expect(suggestions[0]?.type).toBe('command')
    })

    it('should not complete for non-command positions', async () => {
      const commandProvider = providers.find(p => p.id === 'commands')

      const context = {
        input: 'echo ec',
        cursorPosition: 7,
        commandParts: ['echo', 'ec'],
        currentPartIndex: 1,
        currentPart: 'ec',
        workingDirectory: '/',
        environmentVariables: {},
        isNewCommand: false,
      }

      if (!commandProvider) {
        throw new Error('Command provider not found')
      }
      expect(commandProvider.canComplete(context)).toBe(false)
    })
  })

  describe('File Completion Provider', () => {
    it('should complete file names', async () => {
      const fileProvider = providers.find(p => p.id === 'files')
      if (!fileProvider) {
        throw new Error('File provider not found')
      }

      const context = {
        input: 'cat te',
        cursorPosition: 6,
        commandParts: ['cat', 'te'],
        currentPartIndex: 1,
        currentPart: 'te',
        workingDirectory: '/',
        environmentVariables: {},
        isNewCommand: false,
      }

      const suggestions = await fileProvider.getCompletions(context, {
        maxSuggestions: 10,
        minInputLength: 0,
        showDescriptions: true,
        autoCompletePrefix: true,
        caseSensitive: false,
        includeHiddenFiles: false,
      })

      expect(suggestions).toHaveLength(1)
      expect(suggestions[0]?.text).toBe('test.txt')
      expect(suggestions[0]?.type).toBe('file')
    })

    it('should complete directory names with trailing slash', async () => {
      const fileProvider = providers.find(p => p.id === 'files')
      if (!fileProvider) {
        throw new Error('File provider not found')
      }

      const context = {
        input: 'cd sub',
        cursorPosition: 6,
        commandParts: ['cd', 'sub'],
        currentPartIndex: 1,
        currentPart: 'sub',
        workingDirectory: '/',
        environmentVariables: {},
        isNewCommand: false,
      }

      const suggestions = await fileProvider.getCompletions(context, {
        maxSuggestions: 10,
        minInputLength: 0,
        showDescriptions: true,
        autoCompletePrefix: true,
        caseSensitive: false,
        includeHiddenFiles: false,
      })

      expect(suggestions).toHaveLength(1)
      expect(suggestions[0]?.text).toBe('subdir/')
      expect(suggestions[0]?.type).toBe('directory')
    })

    it('should exclude hidden files by default', async () => {
      const fileProvider = providers.find(p => p.id === 'files')
      if (!fileProvider) {
        throw new Error('File provider not found')
      }

      const context = {
        input: 'cat .',
        cursorPosition: 5,
        commandParts: ['cat', '.'],
        currentPartIndex: 1,
        currentPart: '.',
        workingDirectory: '/',
        environmentVariables: {},
        isNewCommand: false,
      }

      const suggestions = await fileProvider.getCompletions(context, {
        maxSuggestions: 10,
        minInputLength: 0,
        showDescriptions: true,
        autoCompletePrefix: true,
        caseSensitive: false,
        includeHiddenFiles: false,
      })

      expect(suggestions.find((s: CompletionSuggestion) => s.text === '.hidden')).toBeUndefined()
    })

    it('should include hidden files when configured', async () => {
      const fileProvider = providers.find(p => p.id === 'files')
      if (!fileProvider) {
        throw new Error('File provider not found')
      }

      const context = {
        input: 'cat .',
        cursorPosition: 5,
        commandParts: ['cat', '.'],
        currentPartIndex: 1,
        currentPart: '.',
        workingDirectory: '/',
        environmentVariables: {},
        isNewCommand: false,
      }

      const suggestions = await fileProvider.getCompletions(context, {
        maxSuggestions: 10,
        minInputLength: 0,
        showDescriptions: true,
        autoCompletePrefix: true,
        caseSensitive: false,
        includeHiddenFiles: true,
      })

      expect(suggestions.find((s: CompletionSuggestion) => s.text === '.hidden')).toBeDefined()
    })
  })

  describe('Environment Variable Completion Provider', () => {
    it('should complete environment variables with $ prefix', async () => {
      const envProvider = providers.find(p => p.id === 'environment')
      if (!envProvider) {
        throw new Error('Environment provider not found')
      }

      const context = {
        input: 'echo $PA',
        cursorPosition: 8,
        commandParts: ['echo', '$PA'],
        currentPartIndex: 1,
        currentPart: '$PA',
        workingDirectory: '/',
        environmentVariables: {PATH: '/bin:/usr/bin', PWD: '/'},
        isNewCommand: false,
      }

      const suggestions = await envProvider.getCompletions(context, {
        maxSuggestions: 10,
        minInputLength: 0,
        showDescriptions: true,
        autoCompletePrefix: true,
        caseSensitive: false,
        includeHiddenFiles: false,
      })

      expect(suggestions).toHaveLength(1)
      expect(suggestions[0]?.text).toBe('$PATH')
      expect(suggestions[0]?.type).toBe('environment')
    })

    it('should complete for export command', async () => {
      const envProvider = providers.find(p => p.id === 'environment')
      if (!envProvider) {
        throw new Error('Environment provider not found')
      }

      const context = {
        input: 'export PA',
        cursorPosition: 9,
        commandParts: ['export', 'PA'],
        currentPartIndex: 1,
        currentPart: 'PA',
        workingDirectory: '/',
        environmentVariables: {PATH: '/bin:/usr/bin'},
        isNewCommand: false,
      }

      expect(envProvider.canComplete(context)).toBe(true)

      const suggestions = await envProvider.getCompletions(context, {
        maxSuggestions: 10,
        minInputLength: 0,
        showDescriptions: true,
        autoCompletePrefix: true,
        caseSensitive: false,
        includeHiddenFiles: false,
      })

      expect(suggestions).toHaveLength(1)
      expect(suggestions[0]?.text).toBe('PATH')
      expect(suggestions[0]?.type).toBe('environment')
    })
  })

  describe('Option Completion Provider', () => {
    it('should complete common options', async () => {
      const optionProvider = providers.find(p => p.id === 'options')
      if (!optionProvider) {
        throw new Error('Option provider not found')
      }

      const context = {
        input: 'ls -',
        cursorPosition: 4,
        commandParts: ['ls', '-'],
        currentPartIndex: 1,
        currentPart: '-',
        workingDirectory: '/',
        environmentVariables: {},
        isNewCommand: false,
      }

      const suggestions = await optionProvider.getCompletions(context, {
        maxSuggestions: 10,
        minInputLength: 0,
        showDescriptions: true,
        autoCompletePrefix: true,
        caseSensitive: false,
        includeHiddenFiles: false,
      })

      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.find((s: CompletionSuggestion) => s.text === '-l')).toBeDefined()
      expect(suggestions.find((s: CompletionSuggestion) => s.text === '-h')).toBeDefined()
    })

    it('should not complete for non-option inputs', async () => {
      const optionProvider = providers.find(p => p.id === 'options')
      if (!optionProvider) {
        throw new Error('Option provider not found')
      }

      const context = {
        input: 'ls file',
        cursorPosition: 7,
        commandParts: ['ls', 'file'],
        currentPartIndex: 1,
        currentPart: 'file',
        workingDirectory: '/',
        environmentVariables: {},
        isNewCommand: false,
      }

      expect(optionProvider.canComplete(context)).toBe(false)
    })
  })
})

describe('Integration Tests', () => {
  it('should provide comprehensive completion for shell commands', async () => {
    const fileSystem = new VirtualFileSystemImpl(false)
    const environment = new ShellEnvironment(fileSystem)
    const commands = new Map([
      ['echo', {}],
      ['ls', {}],
      ['cat', {}],
    ])

    await fileSystem.writeFile('/test.txt', 'content')

    const engine = createCompletionEngine()
    const providers = createCompletionProviders(commands, fileSystem, environment)

    for (const provider of providers) {
      engine.registerProvider(provider)
    }

    // Test command completion
    const cmdResult = await engine.getCompletions('ec', 2, '/', {})
    expect(cmdResult.suggestions.find((s: CompletionSuggestion) => s.text === 'echo')).toBeDefined()

    // Test file completion
    const fileResult = await engine.getCompletions('cat te', 6, '/', {})
    expect(fileResult.suggestions.find((s: CompletionSuggestion) => s.text === 'test.txt')).toBeDefined()

    // Test environment variable completion
    const envResult = await engine.getCompletions('echo $PA', 8, '/', {PATH: '/bin'})
    expect(envResult.suggestions.find((s: CompletionSuggestion) => s.text === '$PATH')).toBeDefined()
  })
})
