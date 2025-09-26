/**
 * Comprehensive test suite for the shell help system.
 *
 * Tests help command functionality, formatting, command documentation,
 * topic help, search capabilities, and edge cases for robust operation.
 */

import type {ExecutionContext, ShellCommand} from './types'

import {beforeEach, describe, expect, it, vi} from 'vitest'
import {COMMAND_HELP_REGISTRY} from './command-help'
import {createHelpCommand} from './commands'
import {createHelpSystem} from './help-system'

describe('Help System', () => {
  let helpCommand: ShellCommand
  let mockCommands: Map<string, ShellCommand>
  let mockContext: ExecutionContext

  beforeEach(() => {
    // Create mock commands map
    mockCommands = new Map([
      [
        'ls',
        {
          name: 'ls',
          description: 'List directory contents',
          execute: vi.fn(),
        },
      ],
      [
        'cd',
        {
          name: 'cd',
          description: 'Change directory',
          execute: vi.fn(),
        },
      ],
    ])

    // Create enhanced help command
    helpCommand = createHelpCommand(mockCommands)

    // Mock execution context
    mockContext = {
      workingDirectory: '/home/user',
      environmentVariables: {
        HOME: '/home/user',
        PATH: '/usr/bin',
      },
      processId: 1,
    }
  })

  describe('General Help', () => {
    it('should display general help overview', async () => {
      const result = await helpCommand.execute([], mockContext)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('MOO-DANG')
      expect(result.stdout).toContain('FEATURES')
      expect(result.stdout).toContain('GETTING STARTED')
      expect(result.stdout).toContain('COMMON COMMANDS')
      expect(result.stdout).toContain('HELP TOPICS')
    })

    it('should show command list with help list', async () => {
      const result = await helpCommand.execute(['list'], mockContext)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('AVAILABLE COMMANDS')
      expect(result.stdout).toContain('ls')
      expect(result.stdout).toContain('cd')
      expect(result.stdout).toContain('echo')
    })

    it('should show command list with help commands', async () => {
      const result = await helpCommand.execute(['commands'], mockContext)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('AVAILABLE COMMANDS')
    })
  })

  describe('Command-Specific Help', () => {
    it('should display detailed help for ls command', async () => {
      const result = await helpCommand.execute(['ls'], mockContext)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('NAME')
      expect(result.stdout).toContain('ls - List directory contents')
      expect(result.stdout).toContain('USAGE')
      expect(result.stdout).toContain('OPTIONS')
      expect(result.stdout).toContain('EXAMPLES')
      expect(result.stdout).toContain('-l')
      expect(result.stdout).toContain('-a')
    })

    it('should display detailed help for cd command', async () => {
      const result = await helpCommand.execute(['cd'], mockContext)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('cd - Change current working directory')
      expect(result.stdout).toContain('USAGE')
      expect(result.stdout).toContain('cd [DIRECTORY]')
      expect(result.stdout).toContain('EXAMPLES')
    })

    it('should display help for echo command', async () => {
      const result = await helpCommand.execute(['echo'], mockContext)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('echo - Display text to output')
      expect(result.stdout).toContain('echo [TEXT]...')
    })

    it('should display help for help command itself', async () => {
      const result = await helpCommand.execute(['help'], mockContext)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('help - Display help information')
      expect(result.stdout).toContain('help COMMAND')
      expect(result.stdout).toContain('help topic TOPIC')
    })

    it('should handle unknown command', async () => {
      const result = await helpCommand.execute(['unknown'], mockContext)

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain("Command 'unknown' not found")
    })
  })

  describe('Topic Help', () => {
    it('should list all available topics', async () => {
      const result = await helpCommand.execute(['topics'], mockContext)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('HELP TOPICS')
      expect(result.stdout).toContain('files')
      expect(result.stdout).toContain('system')
      expect(result.stdout).toContain('text')
      expect(result.stdout).toContain('help')
    })

    it('should show help for files topic', async () => {
      const result = await helpCommand.execute(['topic', 'files'], mockContext)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('TOPIC: FILE OPERATIONS')
      expect(result.stdout).toContain('COMMANDS')
      expect(result.stdout).toContain('DETAILS')
      expect(result.stdout).toContain('ls')
      expect(result.stdout).toContain('cd')
    })

    it('should show help for system topic', async () => {
      const result = await helpCommand.execute(['topic', 'system'], mockContext)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('TOPIC: SYSTEM COMMANDS')
      expect(result.stdout).toContain('env')
      expect(result.stdout).toContain('export')
    })

    it('should handle unknown topic', async () => {
      const result = await helpCommand.execute(['topic', 'unknown'], mockContext)

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain("Topic 'unknown' not found")
    })

    it('should list topics when no topic specified', async () => {
      const result = await helpCommand.execute(['topic'], mockContext)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('HELP TOPICS')
    })
  })

  describe('Search Functionality', () => {
    it('should search for commands by name', async () => {
      const result = await helpCommand.execute(['search', 'list'], mockContext)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('SEARCH RESULTS FOR: list')
      expect(result.stdout).toContain('ls')
    })

    it('should search for commands by description', async () => {
      const result = await helpCommand.execute(['search', 'directory'], mockContext)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('SEARCH RESULTS FOR: directory')
      expect(result.stdout).toContain('cd')
      expect(result.stdout).toContain('pwd')
    })

    it('should search in help topics', async () => {
      const result = await helpCommand.execute(['search', 'environment'], mockContext)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('SEARCH RESULTS FOR: environment')
    })

    it('should handle no search results', async () => {
      const result = await helpCommand.execute(['search', 'xyztotallyunknown'], mockContext)

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain("No matches found for query 'xyztotallyunknown'")
    })

    it('should handle empty search query', async () => {
      const result = await helpCommand.execute(['search'], mockContext)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('SEARCH RESULTS FOR:')
      expect(result.stdout).toContain('ls (command)')
    })

    it('should search with multi-word query', async () => {
      const result = await helpCommand.execute(['search', 'file operations'], mockContext)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('SEARCH RESULTS FOR: file operations')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty command name', async () => {
      const result = await helpCommand.execute([''], mockContext)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('MOO-DANG')
    })

    it('should handle invalid help option', async () => {
      const result = await helpCommand.execute(['--invalid'], mockContext)

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain("Command '--invalid' not found")
    })

    it('should handle multiple arguments for single command help', async () => {
      const result = await helpCommand.execute(['ls', 'extra', 'args'], mockContext)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('ls - List directory contents')
    })
  })

  describe('Command Registry', () => {
    it('should have help information for all expected commands', () => {
      const expectedCommands = [
        'ls',
        'cd',
        'pwd',
        'cat',
        'echo',
        'clear',
        'env',
        'export',
        'printenv',
        'unset',
        'which',
        'help',
      ]

      for (const commandName of expectedCommands) {
        expect(COMMAND_HELP_REGISTRY.has(commandName)).toBe(true)
      }
    })

    it('should have complete help info structure', () => {
      for (const [name, helpInfo] of COMMAND_HELP_REGISTRY) {
        expect(helpInfo.name).toBe(name)
        expect(helpInfo.summary).toBeTruthy()
        expect(helpInfo.description).toBeTruthy()
        expect(Array.isArray(helpInfo.usage)).toBe(true)
        expect(Array.isArray(helpInfo.options)).toBe(true)
        expect(Array.isArray(helpInfo.examples)).toBe(true)
      }
    })
  })
})

describe('Help System Class', () => {
  let helpSystem: ReturnType<typeof createHelpSystem>

  beforeEach(() => {
    helpSystem = createHelpSystem()

    // Register a test command
    helpSystem.registerCommand({
      name: 'test',
      summary: 'Test command',
      description: 'This is a test command for unit testing',
      usage: [
        {
          pattern: 'test [options]',
          description: 'Run test with options',
        },
      ],
      options: [
        {
          shortForm: '-v',
          description: 'Verbose output',
        },
      ],
      examples: [
        {
          command: 'test -v',
          description: 'Run test with verbose output',
        },
      ],
    })
  })

  describe('Command Registration', () => {
    it('should register command help information', () => {
      const result = helpSystem.getCommandHelp('test')
      expect(result.success).toBe(true)
      expect(result.content).toContain('test - Test command')
    })

    it('should handle unregistered command', () => {
      const result = helpSystem.getCommandHelp('nonexistent')
      expect(result.success).toBe(false)
      expect(result.error).toContain("Command 'nonexistent' not found")
    })
  })

  describe('Output Formatting', () => {
    it('should format command help with all sections', () => {
      const result = helpSystem.getCommandHelp('test')
      expect(result.success).toBe(true)
      expect(result.content).toContain('NAME')
      expect(result.content).toContain('USAGE')
      expect(result.content).toContain('DESCRIPTION')
      expect(result.content).toContain('OPTIONS')
      expect(result.content).toContain('EXAMPLES')
    })

    it('should respect formatting options', () => {
      const result = helpSystem.getCommandHelp('test', {
        showExamples: false,
        showDetails: false,
      })
      expect(result.success).toBe(true)
      expect(result.content).not.toContain('EXAMPLES')
      expect(result.content).not.toContain('DESCRIPTION')
    })
  })

  describe('Topic Management', () => {
    it('should list default help topics', () => {
      const result = helpSystem.listTopics()
      expect(result.success).toBe(true)
      expect(result.content).toContain('files')
      expect(result.content).toContain('system')
    })

    it('should get topic help', () => {
      const result = helpSystem.getTopicHelp('files')
      expect(result.success).toBe(true)
      expect(result.content).toContain('TOPIC: FILE OPERATIONS')
    })
  })

  describe('Search Functionality', () => {
    it('should search registered commands', () => {
      const result = helpSystem.searchHelp('test')
      expect(result.success).toBe(true)
      expect(result.content).toContain('test (command)')
    })

    it('should handle empty search results', () => {
      const result = helpSystem.searchHelp('zzzznonexistent')
      expect(result.success).toBe(false)
    })
  })
})
