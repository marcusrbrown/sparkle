/**
 * Shell commands implementation for the virtual shell environment.
 *
 * Provides built-in commands using function-based architecture for better
 * testability and composability. All commands follow consistent patterns
 * for error handling, result formatting, and execution timing.
 */

import type {CommandExecutionResult, ExecutionContext, ShellCommand, VirtualFileSystem} from './types'

/**
 * Shell command execution error for command-specific failures.
 *
 * Provides structured error information for failed command executions,
 * including the command name and appropriate exit code.
 */
export class ShellCommandError extends Error {
  readonly command: string
  readonly exitCode: number

  constructor(command: string, exitCode: number, message: string) {
    super(`${command}: ${message}`)
    this.name = 'ShellCommandError'
    this.command = command
    this.exitCode = exitCode
  }
}

/**
 * Create command execution result with timing information.
 *
 * Standardizes result format across all commands with consistent timing
 * and process tracking. This ensures all commands return results in a
 * uniform structure for proper shell integration.
 *
 * @param context - Execution context containing process ID and environment
 * @param command - Full command string that was executed
 * @param stdout - Standard output from the command execution
 * @param stderr - Standard error output from the command execution
 * @param exitCode - Command exit code (0 for success, non-zero for error)
 * @param startTime - Command start time for execution duration calculation
 * @returns Structured command execution result
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
 * Create echo command implementation.
 *
 * Echo command displays its arguments as a line of text to standard output.
 * This is one of the most fundamental shell commands, used for displaying
 * text and testing command execution.
 *
 * @returns Shell command implementation for echo
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
 * Create pwd (print working directory) command implementation.
 *
 * Pwd command prints the absolute path of the current working directory.
 * This command ignores all arguments and always returns the current directory
 * from the execution context.
 *
 * @returns Shell command implementation for pwd
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

/**
 * File system entry metadata for directory listings.
 *
 * Represents a file or directory with Unix-like attributes for display
 * in long-format directory listings (ls -l style).
 */
interface FileEntry {
  /** File or directory name */
  readonly name: string
  /** Entry type (file or directory) */
  readonly type: 'file' | 'directory'
  /** Unix-style permission string (e.g., '-rw-r--r--') */
  readonly permissions: string
  /** File size in bytes */
  readonly size: number
  /** Last modified date string */
  readonly modified: string
}

/**
 * Get detailed file listing with metadata for long-format display.
 *
 * Transforms basic file names into detailed file entries with Unix-like
 * metadata including permissions, size, and modification time. Uses
 * heuristics to determine file vs directory types in the virtual environment.
 *
 * @param fileSystem - Virtual file system to query
 * @param path - Directory path to list
 * @returns Array of file entries with detailed metadata
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
 *
 * Creates Unix-like long-format directory listing with file permissions,
 * sizes, dates, and names. Optionally filters hidden files (those starting with '.').
 *
 * @param entries - File entries to format
 * @param showAll - Whether to show hidden files (starting with '.')
 * @returns Formatted directory listing string
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
 * Create ls (list directory) command implementation.
 *
 * Lists directory contents with support for common flags like -l (long format)
 * and -a (show all files including hidden). Handles both simple and detailed
 * directory listings based on command flags.
 *
 * @param fileSystem - Virtual file system to query
 * @returns Shell command implementation for ls
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
 * Resolve relative paths to absolute paths within the virtual file system.
 *
 * Converts relative path references to absolute paths by combining them
 * with the current working directory. Handles edge cases like root directory.
 *
 * @param path - Path to resolve (can be absolute or relative)
 * @param workingDirectory - Current working directory for relative resolution
 * @returns Absolute path string
 */
function resolvePath(path: string, workingDirectory: string): string {
  if (path.startsWith('/')) {
    return path
  }
  return workingDirectory === '/' ? `/${path}` : `${workingDirectory}/${path}`
}

/**
 * Create cat (concatenate) command implementation.
 *
 * Cat command displays the contents of one or more files to standard output.
 * It can handle multiple files and will concatenate their contents in order.
 * Returns appropriate error messages for missing files or operands.
 *
 * @param fileSystem - Virtual file system to read files from
 * @returns Shell command implementation for cat
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
 * Create help command implementation.
 *
 * Help command provides information about available commands and their usage.
 * Can display general help listing all commands or specific help for individual commands.
 * Integrates with the command registry to provide accurate, up-to-date information.
 *
 * @param commands - Map of available commands for help information
 * @returns Shell command implementation for help
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
 * Create clear command implementation.
 *
 * Clear command clears the terminal screen using ANSI escape sequences.
 * Sends escape codes to clear the entire screen and move cursor to home position.
 * This command ignores all arguments.
 *
 * @returns Shell command implementation for clear
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
 * Create standard set of shell commands with file system integration.
 *
 * Initializes all built-in commands with proper dependencies and returns
 * a map for efficient command lookup by name. Each command is configured
 * with access to the virtual file system where appropriate.
 *
 * @param fileSystem - Virtual file system instance for file operations
 * @returns Map of command names to command implementations
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
