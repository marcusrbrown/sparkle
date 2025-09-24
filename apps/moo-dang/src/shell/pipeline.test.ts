/**
 * Tests for command pipeline parsing, execution, and I/O redirection functionality.
 */

import type {CommandPipeline, ExecutionContext, ShellCommand} from './types'
import {beforeEach, describe, expect, it} from 'vitest'
import {parseCommandPipeline} from './parser'
import {executePipeline} from './pipeline'
import {VirtualFileSystemImpl} from './virtual-file-system'

describe('parseCommandPipeline', () => {
  it('should parse simple commands without pipelines', () => {
    const result = parseCommandPipeline('ls -la')

    expect(result.commands).toHaveLength(1)
    expect(result.commands[0]?.command).toBe('ls')
    expect(result.commands[0]?.args).toEqual(['-la'])
    expect(result.background).toBe(false)
  })

  it('should parse pipeline commands', () => {
    const result = parseCommandPipeline('cat file.txt | grep "error" | wc -l')

    expect(result.commands).toHaveLength(3)
    expect(result.commands[0]?.command).toBe('cat')
    expect(result.commands[0]?.args).toEqual(['file.txt'])
    expect(result.commands[1]?.command).toBe('grep')
    expect(result.commands[1]?.args).toEqual(['error'])
    expect(result.commands[2]?.command).toBe('wc')
    expect(result.commands[2]?.args).toEqual(['-l'])
  })

  it('should parse output redirection', () => {
    const result = parseCommandPipeline('ls -la > output.txt')

    expect(result.commands).toHaveLength(1)
    expect(result.commands[0]?.outputRedirections).toHaveLength(1)
    expect(result.commands[0]?.outputRedirections[0]?.operator).toBe('>')
    expect(result.commands[0]?.outputRedirections[0]?.target).toBe('output.txt')
  })

  it('should parse input redirection', () => {
    const result = parseCommandPipeline('sort < input.txt')

    expect(result.commands).toHaveLength(1)
    expect(result.commands[0]?.inputRedirections).toHaveLength(1)
    expect(result.commands[0]?.inputRedirections[0]?.operator).toBe('<')
    expect(result.commands[0]?.inputRedirections[0]?.target).toBe('input.txt')
  })

  it('should parse append redirection', () => {
    const result = parseCommandPipeline('echo "log entry" >> logfile.txt')

    expect(result.commands).toHaveLength(1)
    expect(result.commands[0]?.outputRedirections).toHaveLength(1)
    expect(result.commands[0]?.outputRedirections[0]?.operator).toBe('>>')
    expect(result.commands[0]?.outputRedirections[0]?.target).toBe('logfile.txt')
  })

  it('should parse stderr redirection', () => {
    const result = parseCommandPipeline('ls nonexistent 2> errors.txt')

    expect(result.commands).toHaveLength(1)
    expect(result.commands[0]?.outputRedirections).toHaveLength(1)
    expect(result.commands[0]?.outputRedirections[0]?.operator).toBe('2>')
    expect(result.commands[0]?.outputRedirections[0]?.target).toBe('errors.txt')
  })

  it('should parse background execution', () => {
    const result = parseCommandPipeline('long-running-command &')

    expect(result.commands).toHaveLength(1)
    expect(result.commands[0]?.command).toBe('long-running-command')
    expect(result.background).toBe(true)
  })

  it('should handle complex pipeline with redirections', () => {
    const result = parseCommandPipeline('cat input.txt | grep "pattern" > output.txt 2> errors.txt')

    expect(result.commands).toHaveLength(2)
    expect(result.commands[0]?.command).toBe('cat')
    expect(result.commands[1]?.command).toBe('grep')
    expect(result.commands[1]?.outputRedirections).toHaveLength(2)
  })
})

describe('executePipeline', () => {
  let fileSystem: VirtualFileSystemImpl
  let commands: Map<string, ShellCommand>
  let context: ExecutionContext

  beforeEach(() => {
    fileSystem = new VirtualFileSystemImpl(false)
    commands = new Map()
    context = {
      workingDirectory: '/test',
      environmentVariables: {},
      processId: 1,
    }

    // Create mock commands for testing
    commands.set('echo', {
      name: 'echo',
      description: 'Print text',
      async execute(args) {
        return {
          processId: context.processId,
          command: `echo ${args.join(' ')}`,
          stdout: `${args.join(' ')}${String.raw`\n`}`,
          stderr: '',
          exitCode: 0,
          executionTime: 10,
        }
      },
    })

    commands.set('cat', {
      name: 'cat',
      description: 'Display file contents',
      async execute(args, ctx) {
        if (ctx.stdin) {
          return {
            processId: context.processId,
            command: `cat ${args.join(' ')}`,
            stdout: ctx.stdin,
            stderr: '',
            exitCode: 0,
            executionTime: 10,
          }
        }
        return {
          processId: context.processId,
          command: `cat ${args.join(' ')}`,
          stdout: String.raw`test content\n`,
          stderr: '',
          exitCode: 0,
          executionTime: 10,
        }
      },
    })

    commands.set('grep', {
      name: 'grep',
      description: 'Search text patterns',
      async execute(args, ctx) {
        const pattern = args[0] || ''
        const input = ctx.stdin || ''
        const lines = input.split(String.raw`\n`).filter(line => line.includes(pattern.replaceAll('"', '')))
        return {
          processId: context.processId,
          command: `grep ${args.join(' ')}`,
          stdout: lines.join(String.raw`\n`) + (lines.length > 0 ? String.raw`\n` : ''),
          stderr: '',
          exitCode: 0,
          executionTime: 10,
        }
      },
    })
  })

  it('should execute simple pipeline', async () => {
    const pipeline: CommandPipeline = {
      commands: [
        {command: 'echo', args: ['hello world'], inputRedirections: [], outputRedirections: []},
        {command: 'cat', args: [], inputRedirections: [], outputRedirections: []},
      ],
      background: false,
    }

    const result = await executePipeline(pipeline, commands, context, fileSystem)

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toBe(String.raw`hello world\n`)
    expect(result.commandResults).toHaveLength(2)
  })

  it('should handle pipeline with grep filtering', async () => {
    const pipeline: CommandPipeline = {
      commands: [
        {command: 'echo', args: [String.raw`line1\ntest line\nline3`], inputRedirections: [], outputRedirections: []},
        {command: 'grep', args: ['test'], inputRedirections: [], outputRedirections: []},
      ],
      background: false,
    }

    const result = await executePipeline(pipeline, commands, context, fileSystem)

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('test line')
  })

  it('should handle command not found in pipeline', async () => {
    const pipeline: CommandPipeline = {
      commands: [{command: 'nonexistent', args: [], inputRedirections: [], outputRedirections: []}],
      background: false,
    }

    const result = await executePipeline(pipeline, commands, context, fileSystem)

    expect(result.exitCode).toBe(127)
    expect(result.stderr).toContain('Command not found: nonexistent')
  })

  it('should handle output redirection to file', async () => {
    const pipeline: CommandPipeline = {
      commands: [
        {
          command: 'echo',
          args: ['test output'],
          inputRedirections: [],
          outputRedirections: [{operator: '>', target: 'output.txt'}],
        },
      ],
      background: false,
    }

    const result = await executePipeline(pipeline, commands, context, fileSystem)

    expect(result.exitCode).toBe(0)

    // Check that file was created
    const fileExists = await fileSystem.exists('output.txt')
    expect(fileExists).toBe(true)

    const fileContent = await fileSystem.readFile('output.txt')
    expect(fileContent).toBe(String.raw`test output\n`)
  })

  it('should handle input redirection from file', async () => {
    // Create input file first
    await fileSystem.writeFile('input.txt', String.raw`file content\n`)

    const pipeline: CommandPipeline = {
      commands: [
        {
          command: 'cat',
          args: [],
          inputRedirections: [{operator: '<', target: 'input.txt'}],
          outputRedirections: [],
        },
      ],
      background: false,
    }

    const result = await executePipeline(pipeline, commands, context, fileSystem)

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toBe(String.raw`file content\n`)
  })

  it('should handle append redirection', async () => {
    // Create file with initial content
    await fileSystem.writeFile('append.txt', String.raw`initial\n`)

    const pipeline: CommandPipeline = {
      commands: [
        {
          command: 'echo',
          args: ['appended'],
          inputRedirections: [],
          outputRedirections: [{operator: '>>', target: 'append.txt'}],
        },
      ],
      background: false,
    }

    const result = await executePipeline(pipeline, commands, context, fileSystem)

    expect(result.exitCode).toBe(0)

    const fileContent = await fileSystem.readFile('append.txt')
    expect(fileContent).toBe(String.raw`initial\nappended\n`)
  })
})
