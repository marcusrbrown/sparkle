/**
 * Pipeline execution engine for handling command pipelines and I/O redirection.
 *
 * This module provides the core functionality for executing command pipelines
 * where stdout of one command becomes stdin of the next, and handles various
 * I/O redirection operators in a secure browser environment.
 */

import type {
  CommandExecutionResult,
  CommandPipeline,
  ExecutionContext,
  IORedirection,
  ParsedCommand,
  PipelineExecutionResult,
  ShellCommand,
  VirtualFileSystem,
} from './types'

import {consola} from 'consola'

/**
 * Error for pipeline execution failures.
 */
export class PipelineExecutionError extends Error {
  readonly pipelineCommand: string
  override readonly cause?: Error

  constructor(pipelineCommand: string, message: string, cause?: Error) {
    super(`Pipeline execution failed for "${pipelineCommand}": ${message}`)
    this.name = 'PipelineExecutionError'
    this.pipelineCommand = pipelineCommand
    this.cause = cause
  }
}

/**
 * Error for I/O redirection failures.
 */
export class RedirectionError extends Error {
  readonly operator: string
  readonly target: string
  override readonly cause?: Error

  constructor(operator: string, target: string, message: string, cause?: Error) {
    super(`Redirection failed (${operator} ${target}): ${message}`)
    this.name = 'RedirectionError'
    this.operator = operator
    this.target = target
    this.cause = cause
  }
}

/**
 * Execute a command pipeline with proper I/O handling and redirection.
 *
 * Processes commands in sequence, connecting stdout/stdin between pipeline stages
 * and handling file redirection operations through the virtual file system.
 *
 * Pipeline execution follows Unix shell conventions:
 * - Commands execute left-to-right with stdout → stdin flow
 * - Failure in any command stops the pipeline
 * - Exit code from the first failing command (or last successful) is returned
 * - All stderr output is combined and returned
 *
 * @param pipeline - The parsed command pipeline to execute
 * @param commands - Map of available shell commands by name
 * @param context - Execution context with environment and process info
 * @param fileSystem - Virtual file system for I/O redirection
 * @returns Promise resolving to complete pipeline execution result
 * @throws {PipelineExecutionError} When pipeline execution fails
 * @throws {RedirectionError} When I/O redirection operations fail
 *
 * @example
 * ```typescript
 * const result = await executePipeline(
 *   {commands: [{command: 'cat', args: ['file.txt']}, {command: 'grep', args: ['pattern']}], background: false},
 *   commandMap,
 *   context,
 *   fileSystem
 * );
 * ```
 */
export async function executePipeline(
  pipeline: CommandPipeline,
  commands: Map<string, ShellCommand>,
  context: ExecutionContext,
  fileSystem: VirtualFileSystem,
): Promise<PipelineExecutionResult> {
  const startTime = Date.now()
  const commandResults: CommandExecutionResult[] = []
  let currentInput = context.stdin || ''
  let finalOutput = ''
  let combinedStderr = ''
  let finalExitCode = 0

  try {
    for (let commandIndex = 0; commandIndex < pipeline.commands.length; commandIndex++) {
      const parsedCommand = pipeline.commands[commandIndex]
      if (!parsedCommand) {
        throw new Error(`Invalid command at position ${commandIndex}`)
      }

      const isLastCommand = commandIndex === pipeline.commands.length - 1

      // Apply input redirection for commands that specify it
      if (parsedCommand.inputRedirections.length > 0) {
        currentInput = await handleInputRedirection(parsedCommand.inputRedirections, fileSystem)
      }

      // Execute command with current input context
      const commandResult = await executeCommandWithRedirection(
        parsedCommand,
        commands,
        {...context, stdin: currentInput},
        fileSystem,
        isLastCommand,
      )

      commandResults.push(commandResult)

      // Accumulate stderr from all commands in the pipeline
      if (commandResult.stderr) {
        combinedStderr = combinedStderr ? `${combinedStderr}\n${commandResult.stderr}` : commandResult.stderr
      }

      // Stop pipeline on first command failure (Unix shell behavior)
      if (commandResult.exitCode !== 0) {
        finalExitCode = commandResult.exitCode
        finalOutput = commandResult.stdout
        break
      }

      // Pass stdout to next command as stdin (pipeline flow)
      currentInput = commandResult.stdout

      // Capture final output from the last successful command
      if (isLastCommand) {
        finalOutput = commandResult.stdout
      }
    }

    const executionTime = Date.now() - startTime

    return {
      processId: context.processId,
      command: pipeline.commands.map(cmd => `${cmd.command} ${cmd.args.join(' ')}`).join(' | '),
      commandResults,
      stdout: finalOutput,
      stderr: combinedStderr,
      exitCode: finalExitCode,
      executionTime,
    }
  } catch (error) {
    const pipelineCommand = pipeline.commands.map(cmd => `${cmd.command} ${cmd.args.join(' ')}`).join(' | ')
    const pipelineError = new PipelineExecutionError(
      pipelineCommand,
      error instanceof Error ? error.message : String(error),
      error instanceof Error ? error : undefined,
    )

    consola.error('[PipelineEngine] Pipeline execution failed:', pipelineError.message)

    return {
      processId: context.processId,
      command: pipelineCommand,
      commandResults,
      stdout: finalOutput,
      stderr: combinedStderr || pipelineError.message,
      exitCode: 1,
      executionTime: Date.now() - startTime,
    }
  }
}

/**
 * Execute a single command with redirection handling.
 *
 * Manages output redirection to files while preserving pipeline data flow
 * for commands that are part of a larger pipeline. Output redirection only
 * occurs for the final command in a pipeline or when explicitly redirected.
 *
 * @param parsedCommand - The parsed command with arguments and redirections
 * @param commands - Map of available shell commands
 * @param context - Execution context with stdin and environment
 * @param fileSystem - Virtual file system for redirection operations
 * @param isLastCommand - Whether this is the final command in the pipeline
 * @returns Promise resolving to command execution result
 */
async function executeCommandWithRedirection(
  parsedCommand: ParsedCommand,
  commands: Map<string, ShellCommand>,
  context: ExecutionContext,
  fileSystem: VirtualFileSystem,
  isLastCommand: boolean,
): Promise<CommandExecutionResult> {
  const command = commands.get(parsedCommand.command)

  if (!command) {
    return {
      processId: context.processId,
      command: `${parsedCommand.command} ${parsedCommand.args.join(' ')}`,
      stdout: '',
      stderr: `Command not found: ${parsedCommand.command}`,
      exitCode: 127,
      executionTime: 0,
    }
  }

  // Execute the command
  const result = await command.execute(parsedCommand.args, context)

  // Handle output redirection only for the last command or explicitly redirected commands
  if (parsedCommand.outputRedirections.length > 0 && (isLastCommand || hasOutputRedirection(parsedCommand))) {
    await handleOutputRedirection(parsedCommand.outputRedirections, result.stdout, result.stderr, fileSystem)

    // If output was redirected, don't pass it to the next command in pipeline
    return {
      ...result,
      stdout: isLastCommand ? '' : result.stdout, // Keep stdout for pipeline unless it's the last command
    }
  }

  return result
}

/**
 * Handle input redirection by reading from files.
 *
 * Processes input redirection operators to provide stdin content from files
 * in the virtual file system.
 */
async function handleInputRedirection(redirections: IORedirection[], fileSystem: VirtualFileSystem): Promise<string> {
  let inputContent = ''

  for (const redirection of redirections) {
    if (redirection.operator === '<') {
      try {
        const content = await fileSystem.readFile(redirection.target)
        inputContent += content
      } catch (error) {
        throw new RedirectionError(
          redirection.operator,
          redirection.target,
          `Failed to read input file: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error : undefined,
        )
      }
    }
  }

  return inputContent
}

/**
 * Handle output redirection by writing to files.
 *
 * Processes output redirection operators to write command output to files
 * in the virtual file system with appropriate append/overwrite behavior.
 */
async function handleOutputRedirection(
  redirections: IORedirection[],
  stdout: string,
  stderr: string,
  fileSystem: VirtualFileSystem,
): Promise<void> {
  for (const redirection of redirections) {
    try {
      switch (redirection.operator) {
        case '>':
          // Overwrite file with stdout
          await fileSystem.writeFile(redirection.target, stdout)
          break
        case '>>':
          // Append stdout to file
          await appendToFile(fileSystem, redirection.target, stdout)
          break
        case '2>':
          // Overwrite file with stderr
          await fileSystem.writeFile(redirection.target, stderr)
          break
        case '&>':
          // Overwrite file with both stdout and stderr
          await fileSystem.writeFile(redirection.target, stdout + stderr)
          break
        default:
          consola.warn(`Unsupported redirection operator: ${redirection.operator}`)
      }
    } catch (error) {
      throw new RedirectionError(
        redirection.operator,
        redirection.target,
        `Failed to write output: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
      )
    }
  }
}

/**
 * Append content to a file, creating it if it doesn't exist.
 */
async function appendToFile(fileSystem: VirtualFileSystem, filePath: string, content: string): Promise<void> {
  try {
    const existingContent = await fileSystem.readFile(filePath)
    await fileSystem.writeFile(filePath, existingContent + content)
  } catch {
    // File doesn't exist, create it
    await fileSystem.writeFile(filePath, content)
  }
}

/**
 * Check if a command has output redirection that should prevent pipeline flow.
 */
function hasOutputRedirection(parsedCommand: ParsedCommand): boolean {
  return parsedCommand.outputRedirections.some(
    r => r.operator === '>' || r.operator === '>>' || r.operator === '2>' || r.operator === '&>',
  )
}

/**
 * Resolve command with PATH lookup for pipeline execution.
 *
 * Attempts to find commands in the PATH when they're not available as built-ins.
 */
export async function resolveCommandForPipeline(
  commandName: string,
  context: ExecutionContext,
  fileSystem: VirtualFileSystem,
  commands: Map<string, ShellCommand>,
): Promise<ShellCommand | null> {
  // First check built-in commands
  const builtinCommand = commands.get(commandName)
  if (builtinCommand) {
    return builtinCommand
  }

  // Try PATH resolution (this would be expanded in a real implementation)
  const pathDirs = (context.environmentVariables.PATH || '').split(':')

  for (const dir of pathDirs) {
    const fullPath = `${dir}/${commandName}`
    try {
      if (await fileSystem.exists(fullPath)) {
        // In a real implementation, this would create a command wrapper for the executable
        // For now, return null to indicate command not found
        return null
      }
    } catch {
      // Continue searching
    }
  }

  return null
}
