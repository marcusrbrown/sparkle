/**
 * Tests for shell command execution and dispatching functionality.
 *
 * Validates command registration, execution context creation,
 * and command result handling in the shell environment.
 */

import type {ExecutionContext, ShellCommand} from './types'

import {beforeEach, describe, expect, it} from 'vitest'

import {createStandardCommands} from './commands'
import {ShellEnvironment} from './environment'
import {VirtualFileSystemImpl} from './virtual-file-system'

describe('Standard Shell Commands', () => {
  let fileSystem: VirtualFileSystemImpl
  let environment: ShellEnvironment
  let commands: Map<string, ShellCommand>
  let executionContext: ExecutionContext

  beforeEach(() => {
    fileSystem = new VirtualFileSystemImpl(false)
    environment = new ShellEnvironment(fileSystem)
    commands = createStandardCommands(fileSystem, environment)
    executionContext = {
      workingDirectory: '/home/user',
      environmentVariables: {
        HOME: '/home/user',
        USER: 'user',
        PATH: '/bin:/usr/bin',
        PWD: '/home/user',
      },
      processId: 1,
    }
  })

  function getCommand(name: string): ShellCommand {
    const command = commands.get(name)
    if (!command) {
      throw new Error(`Command ${name} not found`)
    }
    return command
  }

  describe('command registry', () => {
    it('should register all expected built-in commands', () => {
      const expectedCommands = ['echo', 'pwd', 'ls', 'cat', 'clear', 'help']

      for (const commandName of expectedCommands) {
        expect(commands.has(commandName)).toBe(true)
        const command = commands.get(commandName)
        expect(command).toBeDefined()
        expect(command?.name).toBe(commandName)
        expect(typeof command?.description).toBe('string')
        expect(typeof command?.execute).toBe('function')
      }
    })

    it('should provide meaningful descriptions for all commands', () => {
      for (const [_name, command] of commands) {
        expect(command.description).toBeTruthy()
        expect(command.description.length).toBeGreaterThan(0)
        expect(command.description).not.toBe('TODO: Add description')
      }
    })
  })

  describe('echo command', () => {
    it('should echo simple text', async () => {
      const echoCommand = getCommand('echo')
      const result = await echoCommand.execute(['hello', 'world'], executionContext)

      expect(result.stdout).toBe('hello world')
      expect(result.stderr).toBe('')
      expect(result.exitCode).toBe(0)
      expect(result.processId).toBe(1)
      expect(result.command).toBe('echo hello world')
    })

    it('should handle empty arguments', async () => {
      const echoCommand = commands.get('echo')!
      const result = await echoCommand.execute([], executionContext)

      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('')
      expect(result.exitCode).toBe(0)
    })

    it('should handle special characters', async () => {
      const echoCommand = commands.get('echo')!
      const result = await echoCommand.execute(['!@#$%^&*()', 'test'], executionContext)

      expect(result.stdout).toBe('!@#$%^&*() test')
      expect(result.exitCode).toBe(0)
    })
  })

  describe('pwd command', () => {
    it('should return current working directory', async () => {
      const pwdCommand = commands.get('pwd')!
      const result = await pwdCommand.execute([], executionContext)

      expect(result.stdout).toBe('/home/user')
      expect(result.stderr).toBe('')
      expect(result.exitCode).toBe(0)
      expect(result.command).toBe('pwd')
    })

    it('should ignore arguments', async () => {
      const pwdCommand = commands.get('pwd')!
      const result = await pwdCommand.execute(['ignored', 'args'], executionContext)

      expect(result.stdout).toBe('/home/user')
      expect(result.exitCode).toBe(0)
    })
  })

  describe('clear command', () => {
    it('should return clear screen escape sequences', async () => {
      const clearCommand = commands.get('clear')!
      const result = await clearCommand.execute([], executionContext)

      expect(result.stdout).toBe('\u001B[2J\u001B[H')
      expect(result.stderr).toBe('')
      expect(result.exitCode).toBe(0)
    })

    it('should ignore arguments', async () => {
      const clearCommand = commands.get('clear')!
      const result = await clearCommand.execute(['ignored'], executionContext)

      expect(result.stdout).toBe('\u001B[2J\u001B[H')
      expect(result.exitCode).toBe(0)
    })
  })

  describe('cd command', () => {
    it('should change to existing directory', async () => {
      // Create a test directory first
      await fileSystem.createDirectory('/home/user/testdir')

      const cdCommand = commands.get('cd')!
      const result = await cdCommand.execute(['testdir'], executionContext)

      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('')
      expect(result.exitCode).toBe(0)
    })

    it('should change to home directory when no arguments', async () => {
      const cdCommand = commands.get('cd')!
      const result = await cdCommand.execute([], executionContext)

      expect(result.exitCode).toBe(0)
    })

    it('should handle tilde (~) for home directory', async () => {
      const cdCommand = commands.get('cd')!
      const result = await cdCommand.execute(['~'], executionContext)

      expect(result.exitCode).toBe(0)
    })

    it('should return error for non-existent directory', async () => {
      const cdCommand = commands.get('cd')!
      const result = await cdCommand.execute(['/nonexistent'], executionContext)

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('cd: no such file or directory')
    })
  })

  describe('ls command', () => {
    it('should list directory contents', async () => {
      const lsCommand = commands.get('ls')!
      const result = await lsCommand.execute([], executionContext)

      expect(result.exitCode).toBe(0)
      expect(result.stderr).toBe('')
      expect(result.stdout).toContain('README.md')
      expect(result.stdout).toContain('documents')
    })

    it('should handle long format listing', async () => {
      const lsCommand = commands.get('ls')!
      const result = await lsCommand.execute(['-l'], executionContext)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('total')
      expect(result.stdout).toContain('-rw-r--r--')
      expect(result.stdout).toContain('d-rw-r--r--') // Directory permissions format in our implementation
    })

    it('should handle show all flag', async () => {
      const lsCommand = commands.get('ls')!
      const resultNormal = await lsCommand.execute([], executionContext)
      const resultAll = await lsCommand.execute(['-a'], executionContext)

      expect(resultNormal.exitCode).toBe(0)
      expect(resultAll.exitCode).toBe(0)
      // Both should succeed, -a might show more files if any start with .
    })

    it('should handle non-existent directory', async () => {
      const lsCommand = commands.get('ls')!
      const result = await lsCommand.execute(['/nonexistent'], executionContext)

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('ls:')
      expect(result.stdout).toBe('')
    })
  })

  describe('cat command', () => {
    it('should display file contents', async () => {
      const catCommand = commands.get('cat')!
      const result = await catCommand.execute(['README.md'], executionContext)

      expect(result.exitCode).toBe(0)
      expect(result.stderr).toBe('')
      expect(result.stdout).toContain('Welcome to moo-dang shell!')
    })

    it('should handle multiple files', async () => {
      // First write a test file
      await fileSystem.writeFile('/home/user/test.txt', 'test content')

      const catCommand = commands.get('cat')!
      const result = await catCommand.execute(['README.md', 'test.txt'], executionContext)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Welcome to moo-dang shell!')
      expect(result.stdout).toContain('test content')
    })

    it('should handle missing file operand', async () => {
      const catCommand = commands.get('cat')!
      const result = await catCommand.execute([], executionContext)

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('missing file operand')
      expect(result.stdout).toBe('')
    })

    it('should handle non-existent file', async () => {
      const catCommand = commands.get('cat')!
      const result = await catCommand.execute(['nonexistent.txt'], executionContext)

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('No such file or directory')
      expect(result.stdout).toBe('')
    })
  })

  describe('help command', () => {
    it('should display general help when no arguments', async () => {
      const helpCommand = commands.get('help')!
      const result = await helpCommand.execute([], executionContext)

      expect(result.exitCode).toBe(0)
      expect(result.stderr).toBe('')
      expect(result.stdout).toContain('Available commands:')
      expect(result.stdout).toContain('echo')
      expect(result.stdout).toContain('pwd')
      expect(result.stdout).toContain('ls')
    })

    it('should display specific command help', async () => {
      const helpCommand = commands.get('help')!
      const result = await helpCommand.execute(['echo'], executionContext)

      expect(result.exitCode).toBe(0)
      expect(result.stderr).toBe('')
      expect(result.stdout).toContain('echo:')
      expect(result.stdout).toContain('Display a line of text')
    })

    it('should handle help for non-existent command', async () => {
      const helpCommand = commands.get('help')!
      const result = await helpCommand.execute(['nonexistent'], executionContext)

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('no help available')
      expect(result.stdout).toBe('')
    })

    it('should handle empty command name', async () => {
      const helpCommand = commands.get('help')!
      const result = await helpCommand.execute([''], executionContext)

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('missing command name')
      expect(result.stdout).toBe('')
    })
  })

  describe('command execution result format', () => {
    it('should include timing information', async () => {
      const echoCommand = commands.get('echo')!
      const startTime = Date.now()
      const result = await echoCommand.execute(['test'], executionContext)
      const endTime = Date.now()

      expect(result.executionTime).toBeGreaterThanOrEqual(0)
      expect(result.executionTime).toBeLessThanOrEqual(endTime - startTime + 100) // Allow some buffer
    })

    it('should include process ID', async () => {
      const echoCommand = commands.get('echo')!
      const customContext = {...executionContext, processId: 42}
      const result = await echoCommand.execute(['test'], customContext)

      expect(result.processId).toBe(42)
    })

    it('should include full command in result', async () => {
      const echoCommand = commands.get('echo')!
      const result = await echoCommand.execute(['hello', 'world'], executionContext)

      expect(result.command).toBe('echo hello world')
    })
  })

  describe('error handling', () => {
    it('should handle file system errors gracefully', async () => {
      // Create a mock file system that throws errors
      const errorFileSystem = {
        getCurrentDirectory: () => '/home/user',
        changeDirectory: async () => {
          throw new Error('File system error')
        },
        listDirectory: async () => {
          throw new Error('Permission denied')
        },
        exists: async () => {
          throw new Error('Access denied')
        },
        readFile: async () => {
          throw new Error('File read error')
        },
        writeFile: async () => {
          throw new Error('File write error')
        },
        createDirectory: async () => {
          throw new Error('Create directory error')
        },
        remove: async () => {
          throw new Error('Remove error')
        },
        isDirectory: async () => {
          throw new Error('Directory check error')
        },
        isFile: async () => {
          throw new Error('File check error')
        },
        getSize: async () => {
          throw new Error('Size check error')
        },
        getDetailedListing: async () => {
          throw new Error('Detailed listing error')
        },
      }

      const errorEnvironment = new ShellEnvironment(errorFileSystem)
      const errorCommands = createStandardCommands(errorFileSystem, errorEnvironment)
      const lsCommand = errorCommands.get('ls')!

      const result = await lsCommand.execute([], executionContext)
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('ls:')
    })

    it('should maintain consistent error format across commands', async () => {
      const lsCommand = commands.get('ls')!
      const catCommand = commands.get('cat')!

      const lsResult = await lsCommand.execute(['/nonexistent'], executionContext)
      const catResult = await catCommand.execute(['nonexistent.txt'], executionContext)

      expect(lsResult.exitCode).toBe(1)
      expect(catResult.exitCode).toBe(1)
      expect(lsResult.stderr).toMatch(/^ls:/)
      expect(catResult.stderr).toMatch(/^cat:/)
    })
  })
})
