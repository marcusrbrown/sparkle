/**
 * Shell commands implementation for the virtual shell environment.
 *
 * This module provides Unix-like shell commands designed for secure browser execution.
 * Each command follows POSIX conventions where feasible while preventing security
 * vulnerabilities in the browser context. Commands use structured logging for
 * debugging and maintain consistent error reporting patterns.
 */

import type {ShellEnvironment} from './environment'
import type {ScriptStatement} from './script-types'
import type {CommandExecutionResult, ExecutionContext, ShellCommand, VirtualFileSystem} from './types'

import {consola} from 'consola'
import {COMMAND_HELP_REGISTRY} from './command-help'
import {createConfigManager} from './config-manager'
import {createHelpSystem} from './help-system'
import {createHistoryManager} from './history-manager'

import {createShellScriptExecutor} from './script-executor'
import {createShellScriptParser} from './script-parser'

/**
 * Configuration constants for command execution behavior and resource limits.
 *
 * These values balance functionality with browser security and performance constraints.
 */
const COMMAND_EXECUTION_CONSTANTS = {
  /** Maximum script execution time to prevent infinite loops in shell scripts */
  SCRIPT_TIMEOUT_MS: 30_000,
  /** Performance threshold for logging slow command executions */
  SLOW_COMMAND_THRESHOLD_MS: 1000,
} as const

/**
 * Global configuration manager instance for shell configuration.
 *
 * Shared across all command handlers to maintain consistent configuration state.
 */
const configManager = createConfigManager()

/**
 * Validates source command arguments and returns the script path.
 *
 * Ensures exactly one filename argument is provided following POSIX conventions.
 */
function validateSourceArguments(args: string[]): {valid: true; scriptPath: string} | {valid: false; error: string} {
  if (!args || args.length === 0) {
    return {valid: false, error: 'source: filename argument required'}
  }

  if (args.length > 1) {
    return {valid: false, error: 'source: too many arguments'}
  }

  const scriptPath = args[0]
  if (!scriptPath) {
    return {valid: false, error: 'source: filename argument required'}
  }

  return {valid: true, scriptPath}
}

/**
 * Loads and parses a shell script file from the virtual filesystem.
 *
 * Handles file existence checking, content reading, and syntax parsing with
 * detailed error reporting for script development feedback.
 */
async function loadAndParseScript(
  fileSystem: VirtualFileSystem,
  scriptPath: string,
  workingDirectory: string,
): Promise<{success: true; statements: ScriptStatement[]; resolvedPath: string} | {success: false; error: string}> {
  try {
    // Resolve the script path relative to working directory
    const resolvedPath = resolvePath(scriptPath, workingDirectory)

    // Check if file exists
    if (!(await fileSystem.exists(resolvedPath))) {
      return {success: false, error: `source: ${scriptPath}: No such file or directory`}
    }

    // Read script file from virtual filesystem
    const scriptContent = await fileSystem.readFile(resolvedPath)

    // Parse the script content
    const parser = createShellScriptParser()
    const parseResult = parser.parseScript(scriptContent)

    if (!parseResult.success) {
      const errorMessage = parseResult.error || 'Unknown parse error'
      return {success: false, error: `source: ${scriptPath}: Parse error: ${errorMessage}`}
    }

    const statements = parseResult.statements || []
    consola.info(`Script parsing successful: ${statements.length} statements found`)

    return {success: true, statements, resolvedPath}
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {success: false, error: `source: ${scriptPath}: ${errorMessage}`}
  }
}

/**
 * Executes parsed shell script statements with proper context and error handling.
 *
 * Creates an isolated script execution environment while maintaining access to
 * the parent shell's commands and environment variables.
 */
async function executeShellScript(
  statements: ScriptStatement[],
  context: ExecutionContext,
  resolvedPath: string,
  fileSystem: VirtualFileSystem,
  environment: ShellEnvironment,
  commands: Map<string, ShellCommand>,
): Promise<{success: true; result: CommandExecutionResult} | {success: false; result: CommandExecutionResult}> {
  const statementCount = statements.length

  if (statementCount === 0) {
    return {
      success: true,
      result: createCommandResult(context, 'source', 'Script is empty', '', 0),
    }
  }

  try {
    // Create script executor with access to all shell commands
    const executor = createShellScriptExecutor(fileSystem, environment, commands)

    // Create execution context for the script
    const scriptContext = executor.createContext({
      workingDirectory: context.workingDirectory,
      environmentVariables: context.environmentVariables,
      scriptPath: resolvedPath,
      processId: context.processId,
    })

    // Execute the script
    const executionResult = await executor.executeScript(statements, scriptContext, {
      timeout: COMMAND_EXECUTION_CONSTANTS.SCRIPT_TIMEOUT_MS,
      debug: false,
    })

    if (executionResult.success) {
      return {
        success: true,
        result: createCommandResult(
          context,
          'source',
          executionResult.stdout || `Script executed successfully: ${statementCount} statements`,
          executionResult.stderr || '',
          executionResult.exitCode,
        ),
      }
    } else {
      return {
        success: false,
        result: createCommandResult(
          context,
          'source',
          executionResult.stdout || '',
          executionResult.stderr || executionResult.error || 'Script execution failed',
          executionResult.exitCode,
        ),
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    consola.error('Script execution failed:', {
      script: resolvedPath,
      error: errorMessage,
    })

    return {
      success: false,
      result: createCommandResult(context, 'source', '', `source: ${resolvedPath}: ${errorMessage}`, 1),
    }
  }
}

/**
 * Base error class for shell command execution failures.
 *
 * Provides structured error information with specific exit codes that match
 * Unix conventions, enabling scripts to handle errors appropriately.
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
 * Error for invalid command arguments or syntax.
 *
 * Uses exit code 1 for compatibility with existing test suite and simpler error handling.
 */
export class InvalidArgumentError extends ShellCommandError {
  constructor(command: string, message: string) {
    super(command, 1, message)
    this.name = 'InvalidArgumentError'
  }
}

/**
 * Error for file or directory operations.
 *
 * Uses exit code 1 for general errors that don't fit other categories.
 */
export class FileOperationError extends ShellCommandError {
  constructor(command: string, message: string) {
    super(command, 1, message)
    this.name = 'FileOperationError'
  }
}

/**
 * Creates standardized command execution result with timing information and structured logging.
 *
 * Centralizes result creation to ensure consistent format and enable performance monitoring.
 * Logs command execution details for debugging and performance analysis while avoiding
 * noise from successful operations that users don't need to see.
 */
function createCommandResult(
  context: ExecutionContext,
  command: string,
  stdout = '',
  stderr = '',
  exitCode = 0,
  startTime = Date.now(),
): CommandExecutionResult {
  const executionTime = Date.now() - startTime

  // Log errors and performance issues for debugging, but avoid noise from normal operations
  if (exitCode !== 0) {
    consola.debug(`Command failed: ${command} (exit code: ${exitCode}, time: ${executionTime}ms)`, {
      command,
      exitCode,
      stderr,
      executionTime,
      processId: context.processId,
    })
  } else if (executionTime > COMMAND_EXECUTION_CONSTANTS.SLOW_COMMAND_THRESHOLD_MS) {
    // Log slow commands for performance monitoring
    consola.info(`Slow command execution: ${command} took ${executionTime}ms`, {
      command,
      executionTime,
      processId: context.processId,
    })
  }

  return {
    processId: context.processId,
    command,
    stdout,
    stderr,
    exitCode,
    executionTime,
  }
}

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

function createPwdCommand(): ShellCommand {
  return {
    name: 'pwd',
    description: 'Print working directory',
    execute: async (_args: string[], context: ExecutionContext): Promise<CommandExecutionResult> => {
      const startTime = Date.now()
      return createCommandResult(context, 'pwd', context.workingDirectory, '', 0, startTime)
    },
  }
}

/**
 * File system entry metadata for Unix-style directory listings.
 */
interface FileEntry {
  readonly name: string
  readonly type: 'file' | 'directory'
  readonly permissions: string
  readonly size: number
  readonly modified: string
}

/**
 * Gets detailed file listing with Unix-like metadata using heuristics for file type detection.
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
 * Formats directory entries in Unix-style long format with optional hidden file filtering.
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
 * Creates ls command with support for -l (long format) and -a (show hidden) flags.
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
 * Resolves relative paths to absolute paths, handling root directory edge case.
 */
function resolvePath(path: string, workingDirectory: string): string {
  if (path.startsWith('/')) {
    return path
  }
  return workingDirectory === '/' ? `/${path}` : `${workingDirectory}/${path}`
}

/**
 * Creates cat command for displaying and concatenating file contents.
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
 * Creates the source command for executing shell scripts (.sh files).
 *
 * The source command reads and executes commands from a shell script file
 * within the current shell environment. This allows users to run stored
 * command sequences and scripts.
 */
function createSourceCommand(
  fileSystem: VirtualFileSystem,
  environment: ShellEnvironment,
  commands: Map<string, ShellCommand>,
): ShellCommand {
  return {
    name: 'source',
    description: 'Execute commands from a shell script file',
    execute: async (args: string[], context: ExecutionContext): Promise<CommandExecutionResult> => {
      const startTime = Date.now()

      // Validate command arguments
      const validation = validateSourceArguments(args)
      if (!validation.valid) {
        return createCommandResult(context, 'source', '', validation.error, 1, startTime)
      }

      // Load and parse the script file
      const parseResult = await loadAndParseScript(fileSystem, validation.scriptPath, context.workingDirectory)
      if (!parseResult.success) {
        return createCommandResult(context, 'source', '', parseResult.error, 1, startTime)
      }

      // Execute the parsed script
      const executionResult = await executeShellScript(
        parseResult.statements,
        context,
        parseResult.resolvedPath,
        fileSystem,
        environment,
        commands,
      )

      return executionResult.result
    },
  }
}

/**
 * Enhanced help command with comprehensive documentation and search capabilities.
 */
export function createHelpCommand(_commands: Map<string, ShellCommand>): ShellCommand {
  // Initialize help system with all command documentation
  const helpSystem = createHelpSystem()

  // Register help information for all commands
  for (const [_name, helpInfo] of COMMAND_HELP_REGISTRY) {
    helpSystem.registerCommand(helpInfo)
  }

  return {
    name: 'help',
    description: 'Show comprehensive help information for commands and topics',
    execute: async (args: string[], context: ExecutionContext): Promise<CommandExecutionResult> => {
      const startTime = Date.now()

      try {
        // Parse help command arguments
        const result = parseHelpArguments(args)

        // Route to appropriate help function
        let helpResult

        switch (result.type) {
          case 'general':
            helpResult = helpSystem.getGeneralHelp()
            break

          case 'command':
            if (result.target == null) {
              return createCommandResult(context, 'help', '', 'help: missing command name', 1, startTime)
            }
            helpResult = helpSystem.getCommandHelp(result.target)
            break

          case 'topic':
            if (result.target == null) {
              helpResult = helpSystem.listTopics()
            } else {
              helpResult = helpSystem.getTopicHelp(result.target)
            }
            break

          case 'topics':
            helpResult = helpSystem.listTopics()
            break

          case 'search':
            if (result.target == null) {
              return createCommandResult(context, 'help search', '', 'help search: missing search query', 1, startTime)
            }
            helpResult = helpSystem.searchHelp(result.target)
            break

          case 'list':
            helpResult = helpSystem.listCommands()
            break

          default:
            return createCommandResult(
              context,
              `help ${args.join(' ')}`,
              '',
              `help: unknown option: ${args[0]}`,
              1,
              startTime,
            )
        }

        // Handle help result
        if (helpResult.success) {
          return createCommandResult(context, `help ${args.join(' ')}`, helpResult.content, '', 0, startTime)
        } else {
          return createCommandResult(
            context,
            `help ${args.join(' ')}`,
            '',
            helpResult.error || 'Help system error',
            1,
            startTime,
          )
        }
      } catch (error) {
        consola.error('Help command execution failed:', error)
        return createCommandResult(
          context,
          `help ${args.join(' ')}`,
          '',
          `help: internal error: ${error instanceof Error ? error.message : String(error)}`,
          1,
          startTime,
        )
      }
    },
  }
}

/**
 * Parse help command arguments to determine the type of help request.
 */
function parseHelpArguments(args: string[]): HelpRequest {
  if (args.length === 0) {
    return {type: 'general'}
  }

  const firstArg = args[0]
  if (!firstArg) {
    return {type: 'general'}
  }

  switch (firstArg.toLowerCase()) {
    case 'topics':
      return {type: 'topics'}

    case 'topic':
      return {
        type: 'topic',
        target: args[1],
      }

    case 'search':
      return {
        type: 'search',
        target: args.slice(1).join(' '),
      }

    case 'list':
    case 'commands':
      return {type: 'list'}

    default:
      // Assume it's a command name
      return {
        type: 'command',
        target: firstArg,
      }
  }
}

/**
 * Help request type and target information.
 */
interface HelpRequest {
  /** Type of help request */
  readonly type: 'general' | 'command' | 'topic' | 'topics' | 'search' | 'list'
  /** Target command name, topic ID, or search query */
  readonly target?: string
}

/**
 * Creates cd command with home directory (~) support.
 */
function createCdCommand(fileSystem: VirtualFileSystem, environment: ShellEnvironment): ShellCommand {
  return {
    name: 'cd',
    description: 'Change directory',
    execute: async (args: string[], context: ExecutionContext): Promise<CommandExecutionResult> => {
      const startTime = Date.now()

      try {
        const targetPath = args.length > 0 && args[0] ? args[0] : '~'
        const resolvedPath =
          targetPath === '~'
            ? context.environmentVariables.HOME || '/home/user'
            : resolvePath(targetPath, context.workingDirectory)

        if (!(await fileSystem.exists(resolvedPath))) {
          return createCommandResult(
            context,
            `cd ${args.join(' ')}`,
            '',
            `cd: no such file or directory: ${targetPath}`,
            1,
            startTime,
          )
        }

        if (!(await fileSystem.isDirectory(resolvedPath))) {
          return createCommandResult(
            context,
            `cd ${args.join(' ')}`,
            '',
            `cd: not a directory: ${targetPath}`,
            1,
            startTime,
          )
        }

        await environment.changeDirectory(resolvedPath)
        return createCommandResult(context, `cd ${args.join(' ')}`, '', '', 0, startTime)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        return createCommandResult(context, `cd ${args.join(' ')}`, '', `cd: ${errorMessage}`, 1, startTime)
      }
    },
  }
}

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
 * Creates env command for displaying and setting environment variables.
 */
function createEnvCommand(): ShellCommand {
  return {
    name: 'env',
    description: 'Display or set environment variables',
    execute: async (args: string[], context: ExecutionContext): Promise<CommandExecutionResult> => {
      const startTime = Date.now()

      try {
        // Handle variable assignments (env VAR=value command...)
        const envVarsToSet: Record<string, string> = {}
        const commandArgs: string[] = []
        let foundCommand = false

        for (const arg of args) {
          if (arg.includes('=') && !foundCommand) {
            const [key, ...valueParts] = arg.split('=')
            if (key && key.trim()) {
              envVarsToSet[key.trim()] = valueParts.join('=')
            }
          } else {
            foundCommand = true
            commandArgs.push(arg)
          }
        }

        // If no command specified, just display environment variables
        if (commandArgs.length === 0) {
          const envVars = {...context.environmentVariables, ...envVarsToSet}
          const output = Object.entries(envVars)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n')

          return createCommandResult(context, 'env', output, '', 0, startTime)
        }

        // Set temporary environment variables for command execution
        // Note: This would require executing the command with modified environment
        // For now, just display what would happen
        let output = 'env: Command execution with modified environment not implemented yet\n'
        if (Object.keys(envVarsToSet).length > 0) {
          output += 'Environment variables that would be set:\n'
          output += Object.entries(envVarsToSet)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n')
          output += '\n'
        }
        output += `Command that would be executed: ${commandArgs.join(' ')}`

        return createCommandResult(context, `env ${args.join(' ')}`, output, '', 0, startTime)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        return createCommandResult(context, `env ${args.join(' ')}`, '', `env: ${errorMessage}`, 1, startTime)
      }
    },
  }
}

/**
 * Creates export command for setting environment variables.
 *
 * Implements POSIX export behavior where variables are made available to child processes.
 * In our browser shell, all variables are effectively exported, but we maintain the
 * command for script compatibility. Variable name validation prevents JavaScript
 * injection attacks while allowing standard shell variable names.
 */
function createExportCommand(environment: ShellEnvironment): ShellCommand {
  return {
    name: 'export',
    description: 'Set environment variables for export to child processes',
    execute: async (args: string[], context: ExecutionContext): Promise<CommandExecutionResult> => {
      const startTime = Date.now()

      try {
        if (args.length === 0) {
          // Display exported variables using bash-style declare format for compatibility
          const output = Object.entries(context.environmentVariables)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `declare -x ${key}="${value}"`)
            .join('\n')

          return createCommandResult(context, 'export', output, '', 0, startTime)
        }

        // Process variable assignments and validations
        for (const arg of args) {
          if (arg.includes('=')) {
            const [key, ...valueParts] = arg.split('=')
            const trimmedKey = key?.trim()

            if (!trimmedKey) {
              throw new InvalidArgumentError('export', `invalid variable name: ${key || '(empty)'}`)
            }

            // Validate variable name to prevent injection and maintain POSIX compliance
            if (!/^[a-z_]\w*$/i.test(trimmedKey)) {
              throw new InvalidArgumentError('export', `invalid variable name: ${trimmedKey}`)
            }

            const value = valueParts.join('=')
            environment.setEnvironmentVariable(trimmedKey, value)

            consola.debug(`Environment variable exported: ${trimmedKey}=${value}`, {
              command: 'export',
              variable: trimmedKey,
              processId: context.processId,
            })
          } else {
            // Export existing variable (validate name even though it's a no-op)
            const varName = arg.trim()
            if (!varName || !/^[a-z_]\w*$/i.test(varName)) {
              throw new InvalidArgumentError('export', `invalid variable name: ${varName || '(empty)'}`)
            }
          }
        }

        return createCommandResult(context, `export ${args.join(' ')}`, '', '', 0, startTime)
      } catch (error) {
        if (error instanceof ShellCommandError) {
          return createCommandResult(context, `export ${args.join(' ')}`, '', error.message, error.exitCode, startTime)
        }

        // Unexpected errors should be logged for debugging
        consola.error('Unexpected error in export command', {
          error: error instanceof Error ? error.message : String(error),
          args,
          processId: context.processId,
        })

        return createCommandResult(context, `export ${args.join(' ')}`, '', `export: unexpected error`, 1, startTime)
      }
    },
  }
}

/**
 * Creates printenv command for displaying environment variables.
 */
function createPrintenvCommand(): ShellCommand {
  return {
    name: 'printenv',
    description: 'Print environment variables',
    execute: async (args: string[], context: ExecutionContext): Promise<CommandExecutionResult> => {
      const startTime = Date.now()

      try {
        if (args.length === 0) {
          // Print all environment variables
          const output = Object.entries(context.environmentVariables)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n')

          return createCommandResult(context, 'printenv', output, '', 0, startTime)
        }

        // Print specific variables
        const results: string[] = []
        let hasError = false

        for (const varName of args) {
          const value = context.environmentVariables[varName]
          if (value === undefined) {
            // printenv typically doesn't error for missing variables, just doesn't output them
            // But some implementations do return non-zero exit code
            hasError = true
          } else {
            results.push(value)
          }
        }

        const output = results.join('\n')
        return createCommandResult(
          context,
          `printenv ${args.join(' ')}`,
          output,
          '',
          hasError && results.length === 0 ? 1 : 0,
          startTime,
        )
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        return createCommandResult(context, `printenv ${args.join(' ')}`, '', `printenv: ${errorMessage}`, 1, startTime)
      }
    },
  }
}

/**
 * Creates unset command for removing environment variables.
 */
function createUnsetCommand(environment: ShellEnvironment): ShellCommand {
  return {
    name: 'unset',
    description: 'Unset environment variables',
    execute: async (args: string[], context: ExecutionContext): Promise<CommandExecutionResult> => {
      const startTime = Date.now()

      try {
        if (args.length === 0) {
          return createCommandResult(context, 'unset', '', 'unset: missing variable name', 1, startTime)
        }

        for (const varName of args) {
          const trimmedName = varName.trim()
          if (!trimmedName || !/^[a-z_]\w*$/i.test(trimmedName)) {
            return createCommandResult(
              context,
              `unset ${args.join(' ')}`,
              '',
              `unset: invalid variable name: ${varName}`,
              1,
              startTime,
            )
          }

          // Remove the environment variable by setting it to undefined
          environment.setEnvironmentVariable(trimmedName, '')
          // Note: In a more sophisticated implementation, we'd actually delete the variable
          // rather than setting it to empty string, but this works for our purposes
        }

        return createCommandResult(context, `unset ${args.join(' ')}`, '', '', 0, startTime)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        return createCommandResult(context, `unset ${args.join(' ')}`, '', `unset: ${errorMessage}`, 1, startTime)
      }
    },
  }
}

/**
 * Resolves a command name to its full path using the PATH environment variable.
 *
 * Implements Unix PATH resolution by searching each directory in order until the
 * command is found. Commands with path separators are returned as-is because
 * they specify explicit paths. This design follows shell conventions where
 * "./cmd" or "/usr/bin/cmd" bypass PATH searching.
 */
async function resolveCommandPath(
  commandName: string,
  pathVariable: string,
  fileSystem: VirtualFileSystem,
): Promise<string | null> {
  // Commands with path separators specify explicit paths and bypass PATH resolution
  if (commandName.startsWith('/') || commandName.includes('/')) {
    return commandName
  }

  const pathDirectories = pathVariable.split(':').filter(Boolean)

  for (const directory of pathDirectories) {
    const candidatePath = `${directory}/${commandName}`

    try {
      if (await fileSystem.exists(candidatePath)) {
        // In a real filesystem we'd check execute permissions, but our virtual
        // filesystem doesn't implement permissions, so existence implies executability
        return candidatePath
      }
    } catch (error) {
      // Log directory access issues for debugging but continue searching
      consola.debug(`Cannot access directory during PATH resolution: ${directory}`, {
        directory,
        command: commandName,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return null
}

/**
 * Creates which command for locating executables in PATH.
 *
 * Follows Unix which behavior where the command succeeds if any requested command
 * is found and fails only if none are found. This allows scripts to check for
 * command availability reliably.
 */
function createWhichCommand(fileSystem: VirtualFileSystem): ShellCommand {
  return {
    name: 'which',
    description: 'Locate executables in PATH',
    execute: async (args: string[], context: ExecutionContext): Promise<CommandExecutionResult> => {
      const startTime = Date.now()

      try {
        if (args.length === 0) {
          throw new InvalidArgumentError('which', 'missing command name')
        }

        const pathVariable = context.environmentVariables.PATH || ''
        const foundPaths: string[] = []
        const notFoundCommands: string[] = []

        for (const commandName of args) {
          const trimmedName = commandName.trim()
          if (!trimmedName) {
            notFoundCommands.push('(empty)')
            continue
          }

          const resolvedPath = await resolveCommandPath(trimmedName, pathVariable, fileSystem)
          if (resolvedPath) {
            foundPaths.push(resolvedPath)
            consola.debug(`Command found in PATH: ${trimmedName} -> ${resolvedPath}`, {
              command: trimmedName,
              resolvedPath,
              processId: context.processId,
            })
          } else {
            notFoundCommands.push(trimmedName)
          }
        }

        // which returns success if any command was found, error if none found
        const exitCode = foundPaths.length > 0 ? 0 : 1
        const output = foundPaths.join('\n')

        if (notFoundCommands.length > 0) {
          consola.debug(`Commands not found in PATH: ${notFoundCommands.join(', ')}`, {
            notFound: notFoundCommands,
            pathVariable,
            processId: context.processId,
          })
        }

        return createCommandResult(context, `which ${args.join(' ')}`, output, '', exitCode, startTime)
      } catch (error) {
        if (error instanceof ShellCommandError) {
          return createCommandResult(context, `which ${args.join(' ')}`, '', error.message, error.exitCode, startTime)
        }

        consola.error('Unexpected error in which command', {
          error: error instanceof Error ? error.message : String(error),
          args,
          processId: context.processId,
        })

        return createCommandResult(context, `which ${args.join(' ')}`, '', 'which: unexpected error', 1, startTime)
      }
    },
  }
}

/**
 * Enhances the shell environment with PATH-based command lookup.
 *
 * This function attempts to resolve a command name to its full path using the PATH
 * environment variable when the command is not found in the command registry.
 */
export async function resolveCommandWithPath(
  commandName: string,
  context: ExecutionContext,
  fileSystem: VirtualFileSystem,
  commands: Map<string, ShellCommand>,
): Promise<ShellCommand | null> {
  // First check if it's a built-in command
  if (commands.has(commandName)) {
    return commands.get(commandName) || null
  }

  // Try to resolve using PATH
  const pathVariable = context.environmentVariables.PATH || ''
  const resolvedPath = await resolveCommandPath(commandName, pathVariable, fileSystem)

  if (resolvedPath) {
    // Create a dynamic command that executes the found executable
    // For now, this is a placeholder - in a full implementation this would
    // execute the actual binary or WASM module
    return {
      name: commandName,
      description: `Executable at ${resolvedPath}`,
      execute: async (args: string[], execContext: ExecutionContext): Promise<CommandExecutionResult> => {
        const startTime = Date.now()
        const output = `${resolvedPath}: execution not implemented (would execute: ${commandName} ${args.join(' ')})`
        return createCommandResult(execContext, `${commandName} ${args.join(' ')}`, output, '', 0, startTime)
      },
    }
  }

  return null
}

/**
 * Creates the standard set of shell commands (echo, pwd, ls, cat, cd, clear, help, env, export, printenv, unset, which).
 */

/**
 * Create the jobs command for listing background jobs.
 */
function createJobsCommand(environment: ShellEnvironment): ShellCommand {
  return {
    name: 'jobs',
    description: 'List active background jobs',
    execute: async (_args: string[], context: ExecutionContext) => {
      const jobController = environment.getJobController()
      const jobs = jobController.listJobs()

      if (jobs.length === 0) {
        return createCommandResult(context, 'jobs', 'No active jobs\n')
      }

      let output = ''
      for (const job of jobs) {
        const statusIndicator = job.foreground ? '+' : '-'
        const statusText =
          job.status === 'running'
            ? 'Running'
            : job.status === 'stopped'
              ? 'Stopped'
              : job.status === 'completed'
                ? 'Done'
                : job.status === 'killed'
                  ? 'Terminated'
                  : 'Failed'

        output += `[${job.jobId}]${statusIndicator}  ${statusText}                ${job.command}\n`
      }

      return createCommandResult(context, 'jobs', output)
    },
  }
}

/**
 * Create the fg command for bringing jobs to foreground.
 */
function createForegroundCommand(environment: ShellEnvironment): ShellCommand {
  return {
    name: 'fg',
    description: 'Bring a job to the foreground',
    execute: async (args: string[], context: ExecutionContext) => {
      const jobController = environment.getJobController()

      if (args.length === 0) {
        // Bring most recent job to foreground
        const jobs = jobController.listJobs().filter(j => j.status === 'running' || j.status === 'stopped')
        if (jobs.length === 0) {
          return createCommandResult(context, 'fg', '', 'fg: no current job\n', 1)
        }

        const mostRecentJob = jobs.at(-1)
        if (mostRecentJob) {
          const success = jobController.foregroundJob(mostRecentJob.jobId)
          if (success) {
            return createCommandResult(context, 'fg', `${mostRecentJob.command}\n`)
          } else {
            return createCommandResult(context, 'fg', '', 'fg: job has terminated\n', 1)
          }
        }
      } else {
        const jobId = Number.parseInt(args[0] || '', 10)
        if (Number.isNaN(jobId)) {
          return createCommandResult(context, 'fg', '', 'fg: invalid job number\n', 1)
        }

        const job = jobController.getJob(jobId)
        if (!job) {
          return createCommandResult(context, 'fg', '', `fg: ${jobId}: no such job\n`, 1)
        }

        const success = jobController.foregroundJob(jobId)
        if (success) {
          return createCommandResult(context, 'fg', `${job.command}\n`)
        } else {
          return createCommandResult(context, 'fg', '', 'fg: job has terminated\n', 1)
        }
      }

      return createCommandResult(context, 'fg', '', 'fg: no current job\n', 1)
    },
  }
}

/**
 * Create the bg command for sending jobs to background.
 */
function createBackgroundCommand(environment: ShellEnvironment): ShellCommand {
  return {
    name: 'bg',
    description: 'Put jobs in the background',
    execute: async (args: string[], context: ExecutionContext) => {
      const jobController = environment.getJobController()

      if (args.length === 0) {
        // Send most recent stopped job to background
        const jobs = jobController.listJobs().filter(j => j.status === 'stopped')
        if (jobs.length === 0) {
          return createCommandResult(context, 'bg', '', 'bg: no current job\n', 1)
        }

        const mostRecentJob = jobs.at(-1)
        if (mostRecentJob) {
          const success = jobController.backgroundJob(mostRecentJob.jobId)
          if (success) {
            return createCommandResult(context, 'bg', `[${mostRecentJob.jobId}]+ ${mostRecentJob.command} &\n`)
          } else {
            return createCommandResult(context, 'bg', '', 'bg: job has terminated\n', 1)
          }
        }
      } else {
        const jobId = Number.parseInt(args[0] || '', 10)
        if (Number.isNaN(jobId)) {
          return createCommandResult(context, 'bg', '', 'bg: invalid job number\n', 1)
        }

        const job = jobController.getJob(jobId)
        if (!job) {
          return createCommandResult(context, 'bg', '', `bg: ${jobId}: no such job\n`, 1)
        }

        const success = jobController.backgroundJob(jobId)
        if (success) {
          return createCommandResult(context, 'bg', `[${job.jobId}]+ ${job.command} &\n`)
        } else {
          return createCommandResult(context, 'bg', '', 'bg: job has terminated\n', 1)
        }
      }

      return createCommandResult(context, 'bg', '', 'bg: no current job\n', 1)
    },
  }
}

/**
 * Create the disown command for removing jobs from job control.
 */
function createDisownCommand(environment: ShellEnvironment): ShellCommand {
  return {
    name: 'disown',
    description: 'Remove jobs from the active job list',
    execute: async (args: string[], context: ExecutionContext) => {
      const jobController = environment.getJobController()

      if (args.length === 0) {
        return createCommandResult(context, 'disown', '', 'disown: usage: disown [job_spec]\n', 1)
      }

      const jobId = Number.parseInt(args[0] || '', 10)
      if (Number.isNaN(jobId)) {
        return createCommandResult(context, 'disown', '', 'disown: invalid job number\n', 1)
      }

      const job = jobController.getJob(jobId)
      if (!job) {
        return createCommandResult(context, 'disown', '', `disown: ${jobId}: no such job\n`, 1)
      }

      const success = jobController.removeJob(jobId)
      if (success) {
        return createCommandResult(context, 'disown', `Job ${jobId} disowned\n`)
      } else {
        return createCommandResult(context, 'disown', '', `disown: failed to disown job ${jobId}\n`, 1)
      }
    },
  }
}

/**
 * Creates history command for managing shell command history.
 */
function createHistoryCommand(): ShellCommand {
  const historyManager = createHistoryManager({
    maxHistorySize: 1000,
    persist: true,
    allowDuplicates: false,
    enableSearch: true,
    maxAgeDays: 30,
  } as const)

  return {
    name: 'history',
    description: 'Display, search, or manage command history',
    execute: async (args: string[], context: ExecutionContext): Promise<CommandExecutionResult> => {
      const startTime = Date.now()

      try {
        // Parse command options
        const options = parseHistoryOptions(args)

        if (options.help) {
          const helpOutput = getHistoryHelpText()
          return createCommandResult(context, 'history', helpOutput, '', 0, startTime)
        }

        if (options.clear) {
          const removedCount = await historyManager.clearHistory()
          const output = `Cleared ${removedCount} history entries\n`
          return createCommandResult(context, 'history -c', output, '', 0, startTime)
        }

        if (options.search) {
          const searchResult = await historyManager.searchHistory({
            query: options.search,
            caseSensitive: options.caseSensitive,
            useRegex: options.regex,
            maxResults: options.maxResults || 100,
          })

          if (searchResult.entries.length === 0) {
            const output = `No history entries found matching "${options.search}"\n`
            return createCommandResult(context, `history -s "${options.search}"`, output, '', 0, startTime)
          }

          const output = formatHistoryEntries(searchResult.entries, options)
          const summary = searchResult.truncated
            ? `\nShowing ${searchResult.entries.length} of ${searchResult.totalMatches} matches (search time: ${searchResult.searchTime}ms)\n`
            : `\nFound ${searchResult.totalMatches} matches (search time: ${searchResult.searchTime}ms)\n`

          return createCommandResult(context, `history -s "${options.search}"`, output + summary, '', 0, startTime)
        }

        if (options.stats) {
          const stats = await historyManager.getStats()
          const output = formatHistoryStats(stats)
          return createCommandResult(context, 'history --stats', output, '', 0, startTime)
        }

        if (options.export) {
          const exportData = await historyManager.exportHistory({
            format: options.format || 'txt',
            includeMetadata: options.includeMetadata,
          })
          return createCommandResult(context, `history --export`, exportData, '', 0, startTime)
        }

        if (options.recent) {
          const recentEntries = await historyManager.getRecent(options.count || 10)
          const output = formatHistoryEntries(recentEntries, options)
          return createCommandResult(context, `history -r ${options.count || 10}`, output, '', 0, startTime)
        }

        // Default: show all history
        const allEntries = await historyManager.getHistory()
        const entriesToShow = options.count ? allEntries.slice(0, options.count) : allEntries
        const output = formatHistoryEntries(entriesToShow, options)

        return createCommandResult(context, 'history', output, '', 0, startTime)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        return createCommandResult(context, `history ${args.join(' ')}`, '', `history: ${errorMessage}`, 1, startTime)
      }
    },
  }
}

/**
 * Options for history command parsing.
 */
interface HistoryOptions {
  help: boolean
  clear: boolean
  search?: string
  stats: boolean
  export: boolean
  recent: boolean
  count?: number
  maxResults?: number
  caseSensitive: boolean
  regex: boolean
  format?: 'json' | 'csv' | 'txt'
  includeMetadata: boolean
  showNumbers: boolean
}

/**
 * Parses command line arguments for the history command.
 */
function parseHistoryOptions(args: string[]): HistoryOptions {
  const options: HistoryOptions = {
    help: false,
    clear: false,
    stats: false,
    export: false,
    recent: false,
    caseSensitive: false,
    regex: false,
    includeMetadata: true,
    showNumbers: true,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg == null || arg.trim().length === 0) continue

    switch (arg) {
      case '-h':
      case '--help':
        options.help = true
        break
      case '-c':
      case '--clear':
        options.clear = true
        break
      case '-s':
      case '--search':
        if (i + 1 < args.length) {
          options.search = args[++i]
        }
        break
      case '--stats':
        options.stats = true
        break
      case '--export':
        options.export = true
        break
      case '-r':
      case '--recent':
        options.recent = true
        if (i + 1 < args.length) {
          const nextArg = args[i + 1]
          if (nextArg != null && /^\d+$/.test(nextArg)) {
            options.count = Number.parseInt(nextArg, 10)
            i++
          }
        }
        break
      case '-n':
      case '--max-results':
        if (i + 1 < args.length) {
          const nextArg = args[i + 1]
          if (nextArg != null && nextArg.trim().length > 0) {
            options.maxResults = Number.parseInt(nextArg, 10)
            i++
          }
        }
        break
      case '-i':
      case '--case-sensitive':
        options.caseSensitive = true
        break
      case '-e':
      case '--regex':
        options.regex = true
        break
      case '--format':
        if (i + 1 < args.length) {
          const format = args[++i]
          if (format === 'json' || format === 'csv' || format === 'txt') {
            options.format = format
          }
        }
        break
      case '--no-metadata':
        options.includeMetadata = false
        break
      case '--no-numbers':
        options.showNumbers = false
        break
      default:
        // Check if it's a number (count)
        if (/^\d+$/.test(arg)) {
          options.count = Number.parseInt(arg, 10)
        }
        break
    }
  }

  return options
}

/**
 * Formats history entries for display.
 */
function formatHistoryEntries(
  entries: {command: string; timestamp: Date; id: string}[],
  options: HistoryOptions,
): string {
  if (entries.length === 0) {
    return 'No history entries found\n'
  }

  return `${entries
    .map((entry, index) => {
      const timestamp = entry.timestamp.toLocaleString()
      const number = options.showNumbers ? `${index + 1}`.padStart(4).concat('  ') : ''
      return `${number}${timestamp}  ${entry.command}`
    })
    .join('\n')}\n`
}

/**
 * Formats history statistics for display.
 */
function formatHistoryStats(stats: {
  totalCommands: number
  uniqueCommands: number
  topCommands: {command: string; count: number}[]
}): string {
  const lines = [
    'History Statistics:',
    '==================',
    `Total commands: ${stats.totalCommands}`,
    `Unique commands: ${stats.uniqueCommands}`,
    '',
    'Most frequently used commands:',
  ]

  stats.topCommands.forEach((cmd, index) => {
    lines.push(`${(index + 1).toString().padStart(2)}. ${cmd.command.padEnd(20)} (${cmd.count} times)`)
  })

  return lines.join('\n').concat('\n')
}

/**
 * Returns help text for the history command.
 */
function getHistoryHelpText(): string {
  return `Usage: history [OPTION]... [COUNT]

Display, search, or manage shell command history.

Options:
  -h, --help              Show this help message
  -c, --clear             Clear all history entries
  -s, --search QUERY      Search history for matching commands
  -r, --recent [COUNT]    Show recent commands (default: 10)
  -n, --max-results NUM   Maximum search results (default: 100)
  -i, --case-sensitive    Use case-sensitive search
  -e, --regex             Use regular expression search
  --stats                 Show history statistics
  --export                Export history
  --format FORMAT         Export format: json, csv, txt (default: txt)
  --no-metadata           Exclude metadata from export
  --no-numbers            Don't show line numbers

Examples:
  history                 Show all history
  history 20              Show last 20 commands
  history -s "git"        Search for commands containing "git"
  history -c              Clear all history
  history --stats         Show usage statistics
  history --export --format json  Export history as JSON
`
}

/**
 * Creates config command for managing shell configuration and preferences.
 */
function createConfigCommand(): ShellCommand {
  return {
    name: 'config',
    description: 'Manage shell configuration and preferences',
    execute: async (args: string[], context: ExecutionContext): Promise<CommandExecutionResult> => {
      const startTime = Date.now()

      try {
        // Parse command options
        const options = parseConfigOptions(args)

        if (options.help) {
          const helpOutput = getConfigHelpText()
          return createCommandResult(context, 'config', helpOutput, '', 0, startTime)
        }

        // Handle subcommands
        switch (options.subcommand) {
          case 'get':
            return handleConfigGet(options, context, startTime)
          case 'set':
            return await handleConfigSet(options, context, startTime)
          case 'list':
            return handleConfigList(options, context, startTime)
          case 'reset':
            return await handleConfigReset(options, context, startTime)
          case 'export':
            return handleConfigExport(options, context, startTime)
          case 'import':
            return await handleConfigImport(options, context, startTime)
          case 'validate':
            return handleConfigValidate(context, startTime)
          default:
            // Show general config status
            return handleConfigStatus(context, startTime)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        return createCommandResult(context, `config ${args.join(' ')}`, '', `config: ${errorMessage}`, 1, startTime)
      }
    },
  }
}

/**
 * Configuration command options.
 */
interface ConfigOptions {
  help: boolean
  subcommand?: 'get' | 'set' | 'list' | 'reset' | 'export' | 'import' | 'validate'
  path?: string
  value?: string
  section?: string
  format?: 'json' | 'yaml' | 'text'
  file?: string
}

/**
 * Parse configuration command arguments.
 */
function parseConfigOptions(args: string[]): ConfigOptions {
  const options: ConfigOptions = {
    help: false,
    format: 'text',
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg == null || arg.trim().length === 0) continue

    switch (arg) {
      case '-h':
      case '--help':
        options.help = true
        break
      case '--format':
        if (i + 1 < args.length) {
          const format = args[++i]
          if (format === 'json' || format === 'yaml' || format === 'text') {
            options.format = format
          }
        }
        break
      case '--section':
        if (i + 1 < args.length) {
          options.section = args[++i]
        }
        break
      case '--file':
        if (i + 1 < args.length) {
          options.file = args[++i]
        }
        break
      default:
        // Handle subcommands and path/value
        if (!options.subcommand && ['get', 'set', 'list', 'reset', 'export', 'import', 'validate'].includes(arg)) {
          options.subcommand = arg as ConfigOptions['subcommand']
        } else if (options.subcommand === 'get' || options.subcommand === 'set') {
          if (!options.path) {
            options.path = arg
          } else if (options.subcommand === 'set' && !options.value) {
            options.value = arg
          }
        }
        break
    }
  }

  return options
}

/**
 * Handle 'config get' subcommand.
 */
function handleConfigGet(options: ConfigOptions, context: ExecutionContext, startTime: number): CommandExecutionResult {
  if (!options.path) {
    return createCommandResult(context, 'config get', '', 'config get: missing configuration path', 1, startTime)
  }

  try {
    const value = configManager.get(options.path)
    if (value === undefined) {
      return createCommandResult(
        context,
        `config get ${options.path}`,
        '',
        `config get: configuration path '${options.path}' not found`,
        1,
        startTime,
      )
    }

    const output = `${options.path}: ${JSON.stringify(value, null, 2)}\n`
    return createCommandResult(context, `config get ${options.path}`, output, '', 0, startTime)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return createCommandResult(
      context,
      `config get ${options.path}`,
      '',
      `config get: error retrieving configuration - ${errorMessage}`,
      1,
      startTime,
    )
  }
}

/**
 * Handle 'config set' subcommand.
 */
async function handleConfigSet(
  options: ConfigOptions,
  context: ExecutionContext,
  startTime: number,
): Promise<CommandExecutionResult> {
  if (!options.path) {
    return createCommandResult(context, 'config set', '', 'config set: missing configuration path', 1, startTime)
  }

  if (options.value === undefined) {
    return createCommandResult(
      context,
      `config set ${options.path}`,
      '',
      'config set: missing configuration value',
      1,
      startTime,
    )
  }

  try {
    // Parse the value based on its type
    const parsedValue = _parseConfigValue(options.value)

    // Set the configuration value
    await configManager.set(options.path, parsedValue)

    const output = `Configuration updated: ${options.path} = ${JSON.stringify(parsedValue)}\n`
    return createCommandResult(context, `config set ${options.path} ${options.value}`, output, '', 0, startTime)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return createCommandResult(
      context,
      `config set ${options.path} ${options.value}`,
      '',
      `config set: error setting configuration - ${errorMessage}`,
      1,
      startTime,
    )
  }
}

/**
 * Handle 'config list' subcommand.
 */
function handleConfigList(
  options: ConfigOptions,
  context: ExecutionContext,
  startTime: number,
): CommandExecutionResult {
  try {
    const config = configManager.config
    let output = ''

    if (options.section) {
      // Show specific section
      const sectionConfig = configManager.get(options.section)
      if (sectionConfig === undefined) {
        return createCommandResult(
          context,
          `config list ${options.section}`,
          '',
          `config list: section '${options.section}' not found`,
          1,
          startTime,
        )
      }

      output = `Configuration section: ${options.section}\n`
      output += `${'='.repeat(30 + options.section.length)}\n\n`
      output += _formatFullConfig({[options.section]: sectionConfig} as any, 'readable')
    } else {
      // Show all configuration
      output = 'Complete Shell Configuration\n'
      output += '============================\n\n'
      output += _formatFullConfig(config, 'readable')
    }

    return createCommandResult(context, 'config list', output, '', 0, startTime)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return createCommandResult(
      context,
      'config list',
      '',
      `config list: error listing configuration - ${errorMessage}`,
      1,
      startTime,
    )
  }
}

/**
 * Handle 'config reset' subcommand.
 */
async function handleConfigReset(
  options: ConfigOptions,
  context: ExecutionContext,
  startTime: number,
): Promise<CommandExecutionResult> {
  try {
    if (options.section) {
      await configManager.reset(options.section as any)
      const output = `Configuration section '${options.section}' has been reset to defaults.\n`
      return createCommandResult(context, `config reset ${options.section}`, output, '', 0, startTime)
    } else {
      await configManager.reset()
      const output = 'All configuration has been reset to defaults.\n'
      return createCommandResult(context, 'config reset', output, '', 0, startTime)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return createCommandResult(
      context,
      'config reset',
      '',
      `config reset: error resetting configuration - ${errorMessage}`,
      1,
      startTime,
    )
  }
}

/**
 * Handle 'config export' subcommand.
 */
function handleConfigExport(
  _options: ConfigOptions,
  context: ExecutionContext,
  startTime: number,
): CommandExecutionResult {
  try {
    const exportData = configManager.export()
    const output = `${JSON.stringify(exportData, null, 2)}\n`
    return createCommandResult(context, 'config export', output, '', 0, startTime)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return createCommandResult(
      context,
      'config export',
      '',
      `config export: error exporting configuration - ${errorMessage}`,
      1,
      startTime,
    )
  }
}

/**
 * Handle 'config import' subcommand.
 */
async function handleConfigImport(
  _options: ConfigOptions,
  context: ExecutionContext,
  startTime: number,
): Promise<CommandExecutionResult> {
  // Note: Full file import functionality would require VFS integration
  // For now, return instructions on how to use export/import
  const output = [
    'config import: Import functionality available via configuration manager',
    '',
    'To import configuration:',
    '1. Export current config: config export > config.json',
    '2. Modify the exported JSON file as needed',
    '3. Use the configuration manager API to import',
    '',
    'Full command-line import support requires file system integration.',
    '',
  ].join('\n')

  return createCommandResult(context, 'config import', output, '', 0, startTime)
}

/**
 * Handle 'config validate' subcommand.
 */
function handleConfigValidate(context: ExecutionContext, startTime: number): CommandExecutionResult {
  try {
    const validation = configManager.validate()

    let output = 'Configuration Validation Results\n'
    output += '================================\n\n'

    if (validation.isValid) {
      output += '✓ Configuration is valid\n\n'
    } else {
      output += '✗ Configuration has errors:\n\n'
      for (const error of validation.errors) {
        output += `  • ${error}\n`
      }
      output += '\n'
    }

    if (validation.warnings.length > 0) {
      output += 'Warnings:\n'
      for (const warning of validation.warnings) {
        output += `  ⚠ ${warning}\n`
      }
      output += '\n'
    }

    const exitCode = validation.isValid ? 0 : 1
    return createCommandResult(context, 'config validate', output, '', exitCode, startTime)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return createCommandResult(
      context,
      'config validate',
      '',
      `config validate: error validating configuration - ${errorMessage}`,
      1,
      startTime,
    )
  }
}

/**
 * Handle default config status display.
 */
function handleConfigStatus(context: ExecutionContext, startTime: number): CommandExecutionResult {
  try {
    const config = configManager.config
    const validation = configManager.validate()

    let output = 'moo-dang Shell Configuration\n'
    output += '============================\n\n'

    output += `Status: ${validation.isValid ? '✓ Valid' : '✗ Issues Found'}\n`
    output += `Version: ${config.version}\n`
    output += `Last Updated: ${config.lastUpdated.toLocaleString()}\n`
    output += `Auto-save: ${configManager.autoSave ? 'Enabled' : 'Disabled'}\n\n`

    if (!validation.isValid) {
      output += 'Errors:\n'
      for (const error of validation.errors) {
        output += `  • ${error}\n`
      }
      output += '\n'
    }

    if (validation.warnings.length > 0) {
      output += 'Warnings:\n'
      for (const warning of validation.warnings) {
        output += `  ⚠ ${warning}\n`
      }
      output += '\n'
    }

    output += 'Available Configuration Sections:\n'
    output += '  appearance    - Terminal appearance and theming\n'
    output += '  behavior      - Shell behavior and execution settings\n'
    output += '  security      - Security and privacy settings\n'
    output += '  accessibility - Accessibility options\n'
    output += '  advanced      - Advanced configuration options\n\n'

    output += 'Usage:\n'
    output += '  config list                    Show all configuration\n'
    output += '  config get <path>              Get configuration value\n'
    output += '  config set <path> <value>      Set configuration value\n'
    output += '  config reset [section]         Reset configuration\n'
    output += '  config validate               Validate configuration\n'
    output += '  config --help                 Show detailed help\n'

    return createCommandResult(context, 'config', output, '', 0, startTime)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return createCommandResult(
      context,
      'config',
      '',
      `config: error retrieving configuration status - ${errorMessage}`,
      1,
      startTime,
    )
  }
}

/**
function formatConfigValue(path: string, value: unknown, format: string): string {
  if (format === 'json') {
    return JSON.stringify({[path]: value}, null, 2)
  }
 
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value, null, 2)
  }
 
  return String(value)
}
 
/**
 * Format configuration section for display.
 */
function formatConfigSection(section: string, value: unknown, format: string): string {
  if (format === 'json') {
    return JSON.stringify({[section]: value}, null, 2)
  }

  let output = `Configuration section: ${section}\n`
  output += `${'='.repeat(section.length + 22)}\n`

  if (typeof value === 'object' && value !== null) {
    for (const [key, val] of Object.entries(value)) {
      output += `${key}: ${JSON.stringify(val)}\n`
    }
  } else {
    output += `${String(value)}\n`
  }

  return output
}

/**
 * Format full configuration for display.
 */
function _formatFullConfig(config: import('./config-types').ShellConfig, format: string): string {
  if (format === 'json') {
    return JSON.stringify(config, null, 2)
  }

  let output = 'Complete Shell Configuration\n'
  output += '===========================\n\n'

  const sections = ['appearance', 'behavior', 'security', 'accessibility', 'advanced'] as const

  for (const section of sections) {
    output += `${formatConfigSection(section, config[section], 'text')}\n`
  }

  return output
}

/**
 * Parse string value to appropriate type.
 */
function _parseConfigValue(value: string): unknown {
  // Try boolean
  if (value === 'true') return true
  if (value === 'false') return false

  // Try number
  if (/^\d+$/.test(value)) {
    return Number.parseInt(value, 10)
  }

  if (/^\d+\.\d+$/.test(value)) {
    return Number.parseFloat(value)
  }

  // Return as string
  return value
}

/**
 * Get help text for config command.
 */
function getConfigHelpText(): string {
  return `config - Manage shell configuration and preferences

Usage:
  config [subcommand] [options]

Subcommands:
  list                           List all configuration or specific section
  get <path>                     Get configuration value at path
  set <path> <value>             Set configuration value at path
  reset [section]                Reset configuration to defaults
  export                         Export configuration as JSON
  import                         Import configuration from JSON
  validate                       Validate current configuration

Options:
  -h, --help                     Show this help message
  --section <name>               Target specific configuration section
  --format <format>              Output format: text, json (default: text)
  --file <path>                  File path for import/export operations

Configuration Paths:
  appearance.theme               Terminal theme (dark, light, etc.)
  appearance.fontSize            Terminal font size
  appearance.fontFamily          Terminal font family
  behavior.prompt.style          Prompt style (default, minimal, etc.)
  behavior.completion.maxSuggestions  Max completion suggestions
  behavior.history.maxHistorySize     Max history entries
  security.allowWasmExecution    Allow WASM module execution
  accessibility.highContrast     Enable high contrast mode

Examples:
  config                         Show configuration status
  config list                    Show all configuration
  config list --section appearance  Show appearance settings only
  config get appearance.theme    Get current theme
  config set appearance.theme dark  Set theme to dark
  config reset appearance        Reset appearance to defaults
  config validate               Check configuration validity
  config export                 Export configuration as JSON
`
}

export function createStandardCommands(
  fileSystem: VirtualFileSystem,
  environment: ShellEnvironment,
): Map<string, ShellCommand> {
  const commands = new Map<string, ShellCommand>()

  const echoCommand = createEchoCommand()
  const pwdCommand = createPwdCommand()
  const lsCommand = createLsCommand(fileSystem)
  const catCommand = createCatCommand(fileSystem)
  const cdCommand = createCdCommand(fileSystem, environment)
  const clearCommand = createClearCommand()

  // Environment variable management commands
  const envCommand = createEnvCommand()
  const exportCommand = createExportCommand(environment)
  const printenvCommand = createPrintenvCommand()
  const unsetCommand = createUnsetCommand(environment)
  const whichCommand = createWhichCommand(fileSystem)

  // History management command
  const historyCommand = createHistoryCommand()

  commands.set(echoCommand.name, echoCommand)
  commands.set(pwdCommand.name, pwdCommand)
  commands.set(lsCommand.name, lsCommand)
  commands.set(catCommand.name, catCommand)
  commands.set(cdCommand.name, cdCommand)
  commands.set(clearCommand.name, clearCommand)
  commands.set(envCommand.name, envCommand)
  commands.set(exportCommand.name, exportCommand)
  commands.set(printenvCommand.name, printenvCommand)
  commands.set(unsetCommand.name, unsetCommand)
  commands.set(whichCommand.name, whichCommand)
  commands.set(historyCommand.name, historyCommand)

  const sourceCommand = createSourceCommand(fileSystem, environment, commands)
  commands.set(sourceCommand.name, sourceCommand)

  // Job control commands
  const jobsCommand = createJobsCommand(environment)
  const fgCommand = createForegroundCommand(environment)
  const bgCommand = createBackgroundCommand(environment)
  const disownCommand = createDisownCommand(environment)

  commands.set(jobsCommand.name, jobsCommand)
  commands.set(fgCommand.name, fgCommand)
  commands.set(bgCommand.name, bgCommand)
  commands.set(disownCommand.name, disownCommand)

  // Configuration management command
  const configCommand = createConfigCommand()
  commands.set(configCommand.name, configCommand)

  const helpCommand = createHelpCommand(commands)
  commands.set(helpCommand.name, helpCommand)

  return commands
}
