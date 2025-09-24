/**
 * Basic shell commands implementation for the virtual shell environment.
 */

import type {CommandExecutionResult, ExecutionContext, ShellCommand, VirtualFileSystem} from './types'

/**
 * Base class for shell commands with common functionality.
 */
abstract class BaseShellCommand implements ShellCommand {
  abstract readonly name: string
  abstract readonly description: string

  protected createResult(
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

  abstract readonly execute: (args: string[], context: ExecutionContext) => Promise<CommandExecutionResult>
}

/**
 * Echo command - prints arguments to stdout.
 */
export class EchoCommand extends BaseShellCommand {
  readonly name = 'echo'
  readonly description = 'Display a line of text'

  readonly execute = async (args: string[], context: ExecutionContext): Promise<CommandExecutionResult> => {
    const startTime = Date.now()
    const output = args.join(' ')

    return this.createResult(context, `echo ${args.join(' ')}`, output, '', 0, startTime)
  }
}

/**
 * Pwd command - prints current working directory.
 */
export class PwdCommand extends BaseShellCommand {
  readonly name = 'pwd'
  readonly description = 'Print working directory'

  readonly execute = async (_args: string[], context: ExecutionContext): Promise<CommandExecutionResult> => {
    const startTime = Date.now()
    const workingDirectory = context.workingDirectory

    return this.createResult(context, 'pwd', workingDirectory, '', 0, startTime)
  }
}

/**
 * Ls command - lists directory contents.
 */
export class LsCommand extends BaseShellCommand {
  readonly name = 'ls'
  readonly description = 'List directory contents'

  constructor(private readonly fileSystem: VirtualFileSystem) {
    super()
  }

  readonly execute = async (args: string[], context: ExecutionContext): Promise<CommandExecutionResult> => {
    const startTime = Date.now()

    try {
      const isLongFormat = args.includes('-l') || args.includes('--long')
      const showAll = args.includes('-a') || args.includes('--all')

      // Get directory path (default to current directory)
      const pathArgs = args.filter(arg => !arg.startsWith('-'))
      const targetPath = pathArgs.length > 0 && pathArgs[0] ? pathArgs[0] : context.workingDirectory

      if (isLongFormat) {
        // Long format listing (like ls -l)
        const entries = await this.getDetailedListing(targetPath)
        const output = this.formatLongListing(entries, showAll)
        return this.createResult(context, `ls ${args.join(' ')}`, output, '', 0, startTime)
      } else {
        // Simple listing
        const entries = await this.fileSystem.listDirectory(targetPath)
        const filteredEntries = showAll ? entries : entries.filter(name => !name.startsWith('.'))
        const output = filteredEntries.join('\n')
        return this.createResult(context, `ls ${args.join(' ')}`, output, '', 0, startTime)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return this.createResult(context, `ls ${args.join(' ')}`, '', `ls: ${errorMessage}`, 1, startTime)
    }
  }

  private async getDetailedListing(path: string): Promise<
    {
      name: string
      type: 'file' | 'directory'
      permissions: string
      size: number
      lastModified: Date
    }[]
  > {
    // Use the file system's detailed listing if available
    // Otherwise, fall back to basic listing
    const fileSystemImpl = this.fileSystem as any
    if (typeof fileSystemImpl.getDetailedListing === 'function') {
      return fileSystemImpl.getDetailedListing(path)
    }

    // Fallback implementation
    const entries = await this.fileSystem.listDirectory(path)
    return entries.map(name => ({
      name,
      type: 'file' as const, // Default to file type
      permissions: '-rw-r--r--',
      size: 0,
      lastModified: new Date(),
    }))
  }

  private formatLongListing(
    entries: {
      name: string
      type: 'file' | 'directory'
      permissions: string
      size: number
      lastModified: Date
    }[],
    showAll: boolean,
  ): string {
    const filteredEntries = showAll ? entries : entries.filter(entry => !entry.name.startsWith('.'))

    if (filteredEntries.length === 0) {
      return ''
    }

    const lines = filteredEntries.map(entry => {
      const date = entry.lastModified.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })

      const sizeStr = entry.size.toString().padStart(8)

      return `${entry.permissions} 1 user user ${sizeStr} ${date} ${entry.name}`
    })

    return lines.join('\n')
  }
}

/**
 * Cat command - display file contents.
 */
export class CatCommand extends BaseShellCommand {
  readonly name = 'cat'
  readonly description = 'Display file contents'

  constructor(private readonly fileSystem: VirtualFileSystem) {
    super()
  }

  readonly execute = async (args: string[], context: ExecutionContext): Promise<CommandExecutionResult> => {
    const startTime = Date.now()

    if (args.length === 0) {
      return this.createResult(context, 'cat', '', 'cat: missing file operand', 1, startTime)
    }

    try {
      const outputs: string[] = []

      for (const filePath of args) {
        const resolvedPath = this.resolvePath(filePath, context.workingDirectory)

        if (!(await this.fileSystem.exists(resolvedPath))) {
          return this.createResult(
            context,
            `cat ${args.join(' ')}`,
            '',
            `cat: ${filePath}: No such file or directory`,
            1,
            startTime,
          )
        }

        const content = await this.fileSystem.readFile(resolvedPath)
        outputs.push(content)
      }

      const output = outputs.join('')
      return this.createResult(context, `cat ${args.join(' ')}`, output, '', 0, startTime)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return this.createResult(context, `cat ${args.join(' ')}`, '', `cat: ${errorMessage}`, 1, startTime)
    }
  }

  private resolvePath(path: string, workingDirectory: string): string {
    if (path.startsWith('/')) {
      return path
    }

    return workingDirectory === '/' ? `/${path}` : `${workingDirectory}/${path}`
  }
}

/**
 * Help command - display available commands and their descriptions.
 */
export class HelpCommand extends BaseShellCommand {
  readonly name = 'help'
  readonly description = 'Display available commands'

  constructor(private readonly commands: Map<string, ShellCommand>) {
    super()
  }

  readonly execute = async (args: string[], context: ExecutionContext): Promise<CommandExecutionResult> => {
    const startTime = Date.now()

    if (args.length > 0) {
      // Show help for specific command
      const commandName = args[0]
      if (!commandName) {
        return this.createResult(context, 'help', '', 'help: missing command name', 1, startTime)
      }
      const command = this.commands.get(commandName)

      if (!command) {
        return this.createResult(
          context,
          `help ${commandName}`,
          '',
          `help: ${commandName}: command not found`,
          1,
          startTime,
        )
      }

      const output = `${command.name}: ${command.description}`
      return this.createResult(context, `help ${commandName}`, output, '', 0, startTime)
    }

    // Show all available commands
    const commandList: string[] = []
    commandList.push('Available commands:')
    commandList.push('')

    for (const [name, command] of this.commands) {
      commandList.push(`  ${name.padEnd(12)} ${command.description}`)
    }

    commandList.push('')
    commandList.push('Use "help <command>" to get help for a specific command.')

    const output = commandList.join('\n')
    return this.createResult(context, 'help', output, '', 0, startTime)
  }
}

/**
 * Clear command - clear the terminal screen.
 */
export class ClearCommand extends BaseShellCommand {
  readonly name = 'clear'
  readonly description = 'Clear the terminal screen'

  readonly execute = async (_args: string[], context: ExecutionContext): Promise<CommandExecutionResult> => {
    const startTime = Date.now()

    // Return special control sequence that the terminal can interpret
    return this.createResult(context, 'clear', '\u001B[2J\u001B[H', '', 0, startTime)
  }
}

/**
 * Create standard set of shell commands.
 */
export function createStandardCommands(fileSystem: VirtualFileSystem): Map<string, ShellCommand> {
  const commands = new Map<string, ShellCommand>()

  const echoCommand = new EchoCommand()
  const pwdCommand = new PwdCommand()
  const lsCommand = new LsCommand(fileSystem)
  const catCommand = new CatCommand(fileSystem)
  const clearCommand = new ClearCommand()

  commands.set(echoCommand.name, echoCommand)
  commands.set(pwdCommand.name, pwdCommand)
  commands.set(lsCommand.name, lsCommand)
  commands.set(catCommand.name, catCommand)
  commands.set(clearCommand.name, clearCommand)

  // Create help command with reference to all commands
  const helpCommand = new HelpCommand(commands)
  commands.set(helpCommand.name, helpCommand)

  return commands
}
