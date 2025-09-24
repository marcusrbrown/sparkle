/**
 * Enhanced Shell Worker providing isolated shell environment with proper process management.
 *
 * Web Worker implementation for executing shell commands in isolation from the main thread.
 * Supports virtual file system operations, process lifecycle management, and built-in commands.
 */

import type {
  ChangeDirectoryRequest,
  ExecuteCommandRequest,
  GetEnvironmentRequest,
  KillProcessRequest,
  ListProcessesRequest,
  SetEnvironmentRequest,
  ShellCommand,
  ShellWorkerRequest,
  ShellWorkerResponse,
} from '../shell/types'

import {consola} from 'consola'
import {createStandardCommands} from '../shell/commands'
import {ShellEnvironment} from '../shell/environment'
import {parseCommand} from '../shell/parser'
import {VirtualFileSystemImpl} from '../shell/virtual-file-system'

interface ShellWorkerState {
  readonly environment: ShellEnvironment
  readonly fileSystem: VirtualFileSystemImpl
  readonly commands: Map<string, ShellCommand>
}

/**
 * Initialize shell worker state with virtual file system and command registry.
 *
 * Creates isolated environment suitable for Web Worker execution with conservative
 * resource limits to prevent browser performance issues.
 */
function createShellWorkerState(): ShellWorkerState {
  const fileSystem = new VirtualFileSystemImpl(false)

  const environment = new ShellEnvironment(fileSystem, {
    enableDebugLogging: false,
    maxProcesses: 5, // Conservative limit for web environment
    commandTimeout: 15000, // 15 second timeout for commands
  })

  const commands = createStandardCommands(fileSystem)

  return {environment, fileSystem, commands}
}

/**
 * Handle incoming messages from the main thread.
 *
 * Routes requests to appropriate handlers based on message type and returns
 * structured responses with proper error handling.
 */
async function handleMessage(state: ShellWorkerState, request: ShellWorkerRequest): Promise<ShellWorkerResponse> {
  try {
    switch (request.type) {
      case 'execute':
        return await handleExecuteCommand(state, request)
      case 'get-environment':
        return handleGetEnvironment(state, request)
      case 'set-environment':
        return handleSetEnvironment(state, request)
      case 'change-directory':
        return await handleChangeDirectory(state, request)
      case 'kill-process':
        return handleKillProcess(state, request)
      case 'list-processes':
        return handleListProcesses(state, request)
      default:
        return {
          type: 'error',
          message: `Unknown request type: ${(request as {type: unknown}).type}`,
          code: 'UNKNOWN_REQUEST',
        }
    }
  } catch (error) {
    logError('Request handling failed', error)
    return {
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
      code: 'REQUEST_FAILED',
    }
  }
}

/**
 * Execute a command in the shell environment.
 *
 * Handles command parsing, validation, execution, and result processing with proper
 * timeout handling and error recovery.
 */
async function handleExecuteCommand(
  state: ShellWorkerState,
  request: ExecuteCommandRequest,
): Promise<ShellWorkerResponse> {
  const {command, stdin, timeout} = request
  const trimmedCommand = command.trim()

  if (!trimmedCommand) {
    return {
      type: 'command-result',
      result: {
        processId: 0,
        command: '',
        stdout: '',
        stderr: '',
        exitCode: 0,
        executionTime: 0,
      },
    }
  }

  const parts = parseCommand(trimmedCommand)
  const commandName = parts[0]
  const args = parts.slice(1)

  if (!commandName) {
    return {
      type: 'command-result',
      result: {
        processId: 0,
        command: trimmedCommand,
        stdout: '',
        stderr: 'Command parsing failed',
        exitCode: 1,
        executionTime: 0,
      },
    }
  }

  const shellCommand = state.commands.get(commandName)
  if (!shellCommand) {
    return {
      type: 'command-result',
      result: {
        processId: 0,
        command: trimmedCommand,
        stdout: '',
        stderr: `Command not found: ${commandName}`,
        exitCode: 127,
        executionTime: 0,
      },
    }
  }

  const context = state.environment.createExecutionContext(stdin)
  const processInfo = state.environment.startProcess(trimmedCommand, context)

  try {
    const result = await executeWithTimeout(() => shellCommand.execute(args, context), timeout || 15000)
    state.environment.completeProcess(processInfo.id, result)

    return {
      type: 'command-result',
      result,
    }
  } catch (error) {
    const errorResult = {
      processId: context.processId,
      command: trimmedCommand,
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: 1,
      executionTime: Date.now() - processInfo.startTime,
    }

    state.environment.completeProcess(processInfo.id, errorResult)

    return {
      type: 'command-result',
      result: errorResult,
    }
  }
}

/**
 * Get current shell environment state.
 */
function handleGetEnvironment(state: ShellWorkerState, _request: GetEnvironmentRequest): ShellWorkerResponse {
  const environmentState = state.environment.getState()
  return {
    type: 'environment',
    state: environmentState,
  }
}

/**
 * Set environment variable in shell state.
 */
function handleSetEnvironment(state: ShellWorkerState, request: SetEnvironmentRequest): ShellWorkerResponse {
  state.environment.setEnvironmentVariable(request.key, request.value)
  return {
    type: 'environment-set',
    key: request.key,
    value: request.value,
  }
}

/**
 * Change working directory with path validation.
 */
async function handleChangeDirectory(
  state: ShellWorkerState,
  request: ChangeDirectoryRequest,
): Promise<ShellWorkerResponse> {
  try {
    const newDirectory = await state.environment.changeDirectory(request.path)
    return {
      type: 'directory-changed',
      newDirectory,
    }
  } catch (error) {
    return {
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
      code: 'DIRECTORY_CHANGE_FAILED',
    }
  }
}

/**
 * Terminate a running process by ID.
 */
function handleKillProcess(state: ShellWorkerState, request: KillProcessRequest): ShellWorkerResponse {
  const killed = state.environment.killProcess(request.processId)
  if (killed) {
    return {
      type: 'process-killed',
      processId: request.processId,
    }
  } else {
    return {
      type: 'error',
      message: `Process not found or already terminated: ${request.processId}`,
      code: 'PROCESS_NOT_FOUND',
    }
  }
}

/**
 * List all running processes in the environment.
 */
function handleListProcesses(state: ShellWorkerState, _request: ListProcessesRequest): ShellWorkerResponse {
  const processes = state.environment.getProcesses()
  return {
    type: 'process-list',
    processes,
  }
}

/**
 * Execute function with timeout to prevent hanging operations.
 *
 * Wraps Promise-returning functions with a timeout mechanism to ensure commands
 * don't block the worker indefinitely.
 */
async function executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Command timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    fn()
      .then(result => {
        clearTimeout(timer)
        resolve(result)
      })
      .catch(error => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

/**
 * Log error message to main thread using structured logging.
 */
function logError(message: string, error?: unknown): void {
  consola.error(`[ShellWorker] ${message}`, error instanceof Error ? error.message : String(error))
}

// Initialize shell worker state
const shellWorkerState = createShellWorkerState()

// Listen for messages from main thread
globalThis.addEventListener('message', async (event: MessageEvent<ShellWorkerRequest>) => {
  const response = await handleMessage(shellWorkerState, event.data)
  globalThis.postMessage(response)
})
