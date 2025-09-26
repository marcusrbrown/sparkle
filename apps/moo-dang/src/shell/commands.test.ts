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
      const expectedCommands = ['echo', 'pwd', 'ls', 'cat', 'clear', 'help', 'source']

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
      expect(result.stdout).toContain('MOO-DANG - A WASM-based web shell')
      expect(result.stdout).toContain('COMMON COMMANDS')
      expect(result.stdout).toContain('echo')
      expect(result.stdout).toContain('pwd')
      expect(result.stdout).toContain('ls')
    })

    it('should display specific command help', async () => {
      const helpCommand = commands.get('help')!
      const result = await helpCommand.execute(['echo'], executionContext)

      expect(result.exitCode).toBe(0)
      expect(result.stderr).toBe('')
      expect(result.stdout).toContain('NAME')
      expect(result.stdout).toContain('echo - Display text to output')
      expect(result.stdout).toContain('USAGE')
      expect(result.stdout).toContain('DESCRIPTION')
    })

    it('should handle help for non-existent command', async () => {
      const helpCommand = commands.get('help')!
      const result = await helpCommand.execute(['nonexistent'], executionContext)

      expect(result.exitCode).toBe(1)
      expect(result.stdout).toBe('')
      expect(result.stderr).toContain("Command 'nonexistent' not found")
    })

    it('should handle empty command name', async () => {
      const helpCommand = commands.get('help')!
      const result = await helpCommand.execute([''], executionContext)

      expect(result.exitCode).toBe(0)
      expect(result.stderr).toBe('')
      expect(result.stdout).toContain('MOO-DANG - A WASM-based web shell')
      expect(result.stdout).toContain('COMMON COMMANDS')
    })
  })

  describe('source command', () => {
    it('should require a filename argument', async () => {
      const sourceCommand = commands.get('source')!
      const result = await sourceCommand.execute([], executionContext)

      expect(result.exitCode).toBe(1)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('source: filename argument required')
    })

    it('should handle too many arguments', async () => {
      const sourceCommand = commands.get('source')!
      const result = await sourceCommand.execute(['file1.sh', 'file2.sh'], executionContext)

      expect(result.exitCode).toBe(1)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('source: too many arguments')
    })

    it('should handle non-existent files', async () => {
      const sourceCommand = commands.get('source')!
      const result = await sourceCommand.execute(['nonexistent.sh'], executionContext)

      expect(result.exitCode).toBe(1)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('source: nonexistent.sh: No such file or directory')
    })

    it('should execute valid shell scripts', async () => {
      // Create a simple shell script in the working directory
      const scriptPath = `${executionContext.workingDirectory}/script.sh`
      await fileSystem.writeFile(scriptPath, '#!/bin/bash\necho "hello world"\nls -la\n')

      const sourceCommand = commands.get('source')!
      const result = await sourceCommand.execute(['script.sh'], executionContext)

      expect(result.exitCode).toBe(0)
      expect(result.stderr).toBe('')
      expect(result.stdout).toContain('Script executed successfully')
      expect(result.stdout).toContain('statements')
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

  describe('Environment Variable Commands', () => {
    describe('env command', () => {
      it('should display all environment variables when no arguments', async () => {
        const envCommand = commands.get('env')!
        const result = await envCommand.execute([], executionContext)

        expect(result.exitCode).toBe(0)
        expect(result.stderr).toBe('')
        expect(result.stdout).toContain('HOME=/home/user')
        expect(result.stdout).toContain('USER=user')
        expect(result.stdout).toContain('PATH=/bin:/usr/bin')
      })

      it('should handle variable assignments', async () => {
        const envCommand = commands.get('env')!
        const result = await envCommand.execute(['TEST_VAR=test_value'], executionContext)

        expect(result.exitCode).toBe(0)
        expect(result.stdout).toContain('TEST_VAR=test_value')
      })

      it('should show what would happen with command execution', async () => {
        const envCommand = commands.get('env')!
        const result = await envCommand.execute(['TEST_VAR=value', 'echo', 'hello'], executionContext)

        expect(result.exitCode).toBe(0)
        expect(result.stdout).toContain('TEST_VAR=value')
        expect(result.stdout).toContain('echo hello')
      })
    })

    describe('export command', () => {
      it('should display exported variables when no arguments', async () => {
        const exportCommand = commands.get('export')!
        const result = await exportCommand.execute([], executionContext)

        expect(result.exitCode).toBe(0)
        expect(result.stdout).toContain('declare -x HOME="/home/user"')
        expect(result.stdout).toContain('declare -x USER="user"')
      })

      it('should set environment variable', async () => {
        const exportCommand = commands.get('export')!
        const result = await exportCommand.execute(['TEST_VAR=exported_value'], executionContext)

        expect(result.exitCode).toBe(0)
        expect(result.stderr).toBe('')

        // Verify the variable was set in the environment
        expect(environment.getEnvironmentVariable('TEST_VAR')).toBe('exported_value')
      })

      it('should handle variable names without values', async () => {
        const exportCommand = commands.get('export')!
        const result = await exportCommand.execute(['EXISTING_VAR'], executionContext)

        expect(result.exitCode).toBe(0)
        expect(result.stderr).toBe('')
      })

      it('should reject invalid variable names', async () => {
        const exportCommand = commands.get('export')!
        const result = await exportCommand.execute(['123_INVALID=value'], executionContext)

        expect(result.exitCode).toBe(1)
        expect(result.stderr).toContain('invalid variable name')
      })
    })

    describe('printenv command', () => {
      it('should print all environment variables when no arguments', async () => {
        const printenvCommand = commands.get('printenv')!
        const result = await printenvCommand.execute([], executionContext)

        expect(result.exitCode).toBe(0)
        expect(result.stdout).toContain('HOME=/home/user')
        expect(result.stdout).toContain('USER=user')
      })

      it('should print specific environment variables', async () => {
        const printenvCommand = commands.get('printenv')!
        const result = await printenvCommand.execute(['HOME', 'USER'], executionContext)

        expect(result.exitCode).toBe(0)
        expect(result.stdout).toContain('/home/user')
        expect(result.stdout).toContain('user')
      })

      it('should handle missing environment variables gracefully', async () => {
        const printenvCommand = commands.get('printenv')!
        const result = await printenvCommand.execute(['NONEXISTENT_VAR'], executionContext)

        expect(result.exitCode).toBe(1)
        expect(result.stdout).toBe('')
      })

      it('should handle mixed existing and missing variables', async () => {
        const printenvCommand = commands.get('printenv')!
        const result = await printenvCommand.execute(['HOME', 'NONEXISTENT', 'USER'], executionContext)

        expect(result.exitCode).toBe(0) // Should succeed if any variables found
        expect(result.stdout).toContain('/home/user')
        expect(result.stdout).toContain('user')
      })
    })

    describe('unset command', () => {
      it('should require variable name', async () => {
        const unsetCommand = commands.get('unset')!
        const result = await unsetCommand.execute([], executionContext)

        expect(result.exitCode).toBe(1)
        expect(result.stderr).toContain('missing variable name')
      })

      it('should unset environment variable', async () => {
        // First set a variable
        environment.setEnvironmentVariable('TEST_UNSET', 'test_value')
        expect(environment.getEnvironmentVariable('TEST_UNSET')).toBe('test_value')

        const unsetCommand = commands.get('unset')!
        const result = await unsetCommand.execute(['TEST_UNSET'], executionContext)

        expect(result.exitCode).toBe(0)
        expect(result.stderr).toBe('')

        // Variable should be empty (unset)
        expect(environment.getEnvironmentVariable('TEST_UNSET')).toBe('')
      })

      it('should reject invalid variable names', async () => {
        const unsetCommand = commands.get('unset')!
        const result = await unsetCommand.execute(['123_INVALID'], executionContext)

        expect(result.exitCode).toBe(1)
        expect(result.stderr).toContain('invalid variable name')
      })

      it('should handle multiple variables', async () => {
        environment.setEnvironmentVariable('TEST_A', 'value_a')
        environment.setEnvironmentVariable('TEST_B', 'value_b')

        const unsetCommand = commands.get('unset')!
        const result = await unsetCommand.execute(['TEST_A', 'TEST_B'], executionContext)

        expect(result.exitCode).toBe(0)
        expect(environment.getEnvironmentVariable('TEST_A')).toBe('')
        expect(environment.getEnvironmentVariable('TEST_B')).toBe('')
      })
    })

    describe('which command', () => {
      beforeEach(async () => {
        // Create some test executables in PATH directories
        await fileSystem.writeFile('/bin/test_executable', '#!/bin/sh\necho "test executable"')

        // Create /usr/bin directory structure if it doesn't exist
        try {
          await fileSystem.createDirectory('/usr')
          await fileSystem.createDirectory('/usr/bin')
        } catch {
          // Directory might already exist
        }
        await fileSystem.writeFile('/usr/bin/another_executable', '#!/bin/sh\necho "another executable"')
      })

      it('should require command name', async () => {
        const whichCommand = commands.get('which')!
        const result = await whichCommand.execute([], executionContext)

        expect(result.exitCode).toBe(1)
        expect(result.stderr).toContain('missing command name')
      })

      it('should find executables in PATH', async () => {
        const whichCommand = commands.get('which')!
        const result = await whichCommand.execute(['test_executable'], executionContext)

        expect(result.exitCode).toBe(0)
        expect(result.stdout).toContain('/bin/test_executable')
      })

      it('should find executables in different PATH directories', async () => {
        const whichCommand = commands.get('which')!
        const result = await whichCommand.execute(['another_executable'], executionContext)

        expect(result.exitCode).toBe(0)
        expect(result.stdout).toContain('/usr/bin/another_executable')
      })

      it('should handle non-existent commands', async () => {
        const whichCommand = commands.get('which')!
        const result = await whichCommand.execute(['nonexistent_command'], executionContext)

        expect(result.exitCode).toBe(1)
        expect(result.stdout).toBe('')
      })

      it('should handle multiple commands', async () => {
        const whichCommand = commands.get('which')!
        const result = await whichCommand.execute(['test_executable', 'another_executable'], executionContext)

        expect(result.exitCode).toBe(0)
        expect(result.stdout).toContain('/bin/test_executable')
        expect(result.stdout).toContain('/usr/bin/another_executable')
      })

      it('should handle mixed existing and non-existent commands', async () => {
        const whichCommand = commands.get('which')!
        const result = await whichCommand.execute(['test_executable', 'nonexistent'], executionContext)

        expect(result.exitCode).toBe(0) // Should succeed if any commands found
        expect(result.stdout).toContain('/bin/test_executable')
        expect(result.stdout).not.toContain('nonexistent')
      })
    })
  })
})
