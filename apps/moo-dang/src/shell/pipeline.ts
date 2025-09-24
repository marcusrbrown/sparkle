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
 * Execute a command pipeline with proper I/O handling and redirection.
 *
 * Processes commands in sequence, connecting stdout/stdin between pipeline stages
 * and handling file redirection operations through the virtual file system.
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
    for (let i = 0; i < pipeline.commands.length; i++) {
      const parsedCommand = pipeline.commands[i]
      if (!parsedCommand) {
        throw new Error(`Invalid command at position ${i}`)
      }

      const isLastCommand = i === pipeline.commands.length - 1

      // Handle input redirection for the first command or current command
      if (parsedCommand.inputRedirections.length > 0) {
        currentInput = await handleInputRedirection(parsedCommand.inputRedirections, fileSystem)
      }

      // Execute the command with current input
      const commandResult = await executeCommandWithRedirection(
        parsedCommand,
        commands,
        {...context, stdin: currentInput},
        fileSystem,
        isLastCommand,
      )

      commandResults.push(commandResult)

      // Accumulate stderr from all commands
      if (commandResult.stderr) {
        combinedStderr += (combinedStderr ? '\n' : '') + commandResult.stderr
      }

      // If command failed, stop pipeline execution
      if (commandResult.exitCode !== 0) {
        finalExitCode = commandResult.exitCode
        finalOutput = commandResult.stdout
        break
      }

      // Prepare input for next command (stdout becomes stdin)
      currentInput = commandResult.stdout

      // For the last command, this becomes the final output
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
    const errorMessage = error instanceof Error ? error.message : String(error)
    consola.error('[PipelineEngine] Pipeline execution failed:', errorMessage)

    return {
      processId: context.processId,
      command: pipeline.commands.map(cmd => `${cmd.command} ${cmd.args.join(' ')}`).join(' | '),
      commandResults,
      stdout: finalOutput,
      stderr: combinedStderr || errorMessage,
      exitCode: 1,
      executionTime: Date.now() - startTime,
    }
  }
}

/**
 * Execute a single command with redirection handling.
 *
 * Manages output redirection to files while preserving pipeline data flow
 * for commands that are part of a larger pipeline.
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
        throw new Error(
          `Failed to read input file '${redirection.target}': ${error instanceof Error ? error.message : String(error)}`,
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
      throw new Error(
        `Failed to write to '${redirection.target}': ${error instanceof Error ? error.message : String(error)}`,
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
