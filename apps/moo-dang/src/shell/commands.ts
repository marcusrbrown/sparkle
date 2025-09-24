/**
 * Shell commands implementation for the virtual shell environment.
 *
 * Provides built-in commands using function-based architecture for better
 * testability and composability.
 */

import type {CommandExecutionResult, ExecutionContext, ShellCommand, VirtualFileSystem} from './types'

/**
 * Create command execution result with timing information.
 *
 * Standardizes result format across all commands with consistent timing
 * and process tracking.
 */
function createCommandResult(
  context: ExecutionContext,
  command: string,
  stdout = '',
  stderr = '',
  exitCode = 0,
  startTime = Date.now(),
): CommandExecutionResult {
  return {
    processId: context.processId,
    command,
    stdout,
    stderr,
    exitCode,
    executionTime: Date.now() - startTime,
  }
}

/**
 * Echo command - displays arguments as output.
 */
function createEchoCommand(): ShellCommand {
  return {
    name: 'echo',
    description: 'Display a line of text',
    execute: async (args: string[], context: ExecutionContext): Promise<CommandExecutionResult> => {
      const startTime = Date.now()
      const output = args.join(' ')
      return createCommandResult(context, `echo ${args.join(' ')}`, output, '', 0, startTime)
    },
  }
}

/**
 * Pwd command - prints current working directory.
 */
function createPwdCommand(): ShellCommand {
  return {
    name: 'pwd',
    description: 'Print working directory',
    execute: async (_args: string[], context: ExecutionContext): Promise<CommandExecutionResult> => {
      const startTime = Date.now()
      const workingDirectory = context.workingDirectory
      return createCommandResult(context, 'pwd', workingDirectory, '', 0, startTime)
    },
  }
}

interface FileEntry {
  name: string
  type: 'file' | 'directory'
  permissions: string
  size: number
  modified: string
}

/**
 * Get detailed file listing with metadata.
 */
async function getDetailedListing(fileSystem: VirtualFileSystem, path: string): Promise<FileEntry[]> {
  const entries = await fileSystem.listDirectory(path)
  return entries.map(name => ({
    name,
    type: name.includes('.') ? ('file' as const) : ('directory' as const),
    permissions: name.startsWith('.') ? '-rw-------' : '-rw-r--r--',
    size: name.includes('.') ? Math.floor(Math.random() * 10000) : 4096,
    modified: new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
  }))
}

/**
 * Format directory listing in long format (ls -l style).
 */
function formatLongListing(entries: FileEntry[], showAll: boolean): string {
  const filteredEntries = showAll ? entries : entries.filter(entry => !entry.name.startsWith('.'))

  if (filteredEntries.length === 0) {
    return ''
  }

  const lines = filteredEntries.map(entry => {
    const typeChar = entry.type === 'directory' ? 'd' : '-'
    return `${typeChar}${entry.permissions} 1 user user ${entry.size.toString().padStart(8)} ${entry.modified} ${entry.name}`
  })

  const totalSize = filteredEntries.reduce((sum, entry) => sum + entry.size, 0)
  return [`total ${Math.ceil(totalSize / 1024)}`, ...lines].join('\n')
}

/**
 * Ls command - lists directory contents with optional formatting.
 */
function createLsCommand(fileSystem: VirtualFileSystem): ShellCommand {
  return {
    name: 'ls',
    description: 'List directory contents',
    execute: async (args: string[], context: ExecutionContext): Promise<CommandExecutionResult> => {
      const startTime = Date.now()

      try {
        const isLongFormat = args.includes('-l') || args.includes('--long')
        const showAll = args.includes('-a') || args.includes('--all')

        const pathArgs = args.filter(arg => !arg.startsWith('-'))
        const targetPath = pathArgs.length > 0 && pathArgs[0] ? pathArgs[0] : context.workingDirectory

        if (isLongFormat) {
          const entries = await getDetailedListing(fileSystem, targetPath)
          const output = formatLongListing(entries, showAll)
          return createCommandResult(context, `ls ${args.join(' ')}`, output, '', 0, startTime)
        } else {
          const entries = await fileSystem.listDirectory(targetPath)
          const filteredEntries = showAll ? entries : entries.filter(name => !name.startsWith('.'))
          const output = filteredEntries.join('\n')
          return createCommandResult(context, `ls ${args.join(' ')}`, output, '', 0, startTime)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        return createCommandResult(context, `ls ${args.join(' ')}`, '', `ls: ${errorMessage}`, 1, startTime)
      }
    },
  }
}

/**
 * Resolve relative paths to absolute paths.
 */
function resolvePath(path: string, workingDirectory: string): string {
  if (path.startsWith('/')) {
    return path
  }
  return workingDirectory === '/' ? `/${path}` : `${workingDirectory}/${path}`
}

/**
 * Cat command - displays file contents.
 */
function createCatCommand(fileSystem: VirtualFileSystem): ShellCommand {
  return {
    name: 'cat',
    description: 'Display file contents',
    execute: async (args: string[], context: ExecutionContext): Promise<CommandExecutionResult> => {
      const startTime = Date.now()

      if (args.length === 0) {
        return createCommandResult(context, 'cat', '', 'cat: missing file operand', 1, startTime)
      }

      try {
        const outputs: string[] = []

        for (const filePath of args) {
          const resolvedPath = resolvePath(filePath, context.workingDirectory)

          if (!(await fileSystem.exists(resolvedPath))) {
            return createCommandResult(
              context,
              `cat ${args.join(' ')}`,
              '',
              `cat: ${filePath}: No such file or directory`,
              1,
              startTime,
            )
          }

          const content = await fileSystem.readFile(resolvedPath)
          outputs.push(content)
        }

        const output = outputs.join('')
        return createCommandResult(context, `cat ${args.join(' ')}`, output, '', 0, startTime)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        return createCommandResult(context, `cat ${args.join(' ')}`, '', `cat: ${errorMessage}`, 1, startTime)
      }
    },
  }
}

/**
 * Help command - displays command information.
 */
function createHelpCommand(commands: Map<string, ShellCommand>): ShellCommand {
  return {
    name: 'help',
    description: 'Show help information',
    execute: async (args: string[], context: ExecutionContext): Promise<CommandExecutionResult> => {
      const startTime = Date.now()

      if (args.length > 0) {
        const commandName = args[0]
        if (!commandName) {
          return createCommandResult(context, 'help', '', 'help: missing command name', 1, startTime)
        }

        const command = commands.get(commandName)
        if (!command) {
          return createCommandResult(
            context,
            `help ${commandName}`,
            '',
            `help: no help available for '${commandName}'`,
            1,
            startTime,
          )
        }

        const output = `${command.name}: ${command.description}`
        return createCommandResult(context, `help ${commandName}`, output, '', 0, startTime)
      }

      const commandList = Array.from(commands.values())
        .filter(cmd => cmd.name !== 'help')
        .map(cmd => `  ${cmd.name.padEnd(12)} ${cmd.description}`)
        .join('\n')

      const output = [
        'Available commands:',
        commandList,
        '',
        'Use "help [command]" for more information about a specific command.',
      ].join('\n')

      return createCommandResult(context, 'help', output, '', 0, startTime)
    },
  }
}

/**
 * Clear command - clears terminal screen.
 */
function createClearCommand(): ShellCommand {
  return {
    name: 'clear',
    description: 'Clear the terminal screen',
    execute: async (_args: string[], context: ExecutionContext): Promise<CommandExecutionResult> => {
      const startTime = Date.now()
      return createCommandResult(context, 'clear', '\u001B[2J\u001B[H', '', 0, startTime)
    },
  }
}

/**
 * Create standard set of shell commands.
 *
 * Initializes all built-in commands with proper dependencies and returns
 * a map for command lookup by name.
 */
export function createStandardCommands(fileSystem: VirtualFileSystem): Map<string, ShellCommand> {
  const commands = new Map<string, ShellCommand>()

  const echoCommand = createEchoCommand()
  const pwdCommand = createPwdCommand()
  const lsCommand = createLsCommand(fileSystem)
  const catCommand = createCatCommand(fileSystem)
  const clearCommand = createClearCommand()

  commands.set(echoCommand.name, echoCommand)
  commands.set(pwdCommand.name, pwdCommand)
  commands.set(lsCommand.name, lsCommand)
  commands.set(catCommand.name, catCommand)
  commands.set(clearCommand.name, clearCommand)

  const helpCommand = createHelpCommand(commands)
  commands.set(helpCommand.name, helpCommand)

  return commands
}
