/**
 * Enhanced Shell Worker providing isolated shell environment with proper process management.
 *
 * Web Worker implementation for executing shell commands in isolation from the main thread.
 * Supports virtual file system operations, process lifecycle management, and built-in commands.
 */

import type {
  BackgroundJobRequest,
  ChangeDirectoryRequest,
  CommandPipeline,
  ExecuteCommandRequest,
  ExecutePipelineRequest,
  ExecutionContext,
  ForegroundJobRequest,
  GetEnvironmentRequest,
  GetJobNotificationsRequest,
  KillJobRequest,
  KillProcessRequest,
  ListJobsRequest,
  ListProcessesRequest,
  SetEnvironmentRequest,
  ShellCommand,
  ShellWorkerRequest,
  ShellWorkerResponse,
} from '../shell/types'
import type {WasmModuleLoader} from '../shell/wasm-types'

import {consola} from 'consola'
import {createStandardCommands, resolveCommandWithPath} from '../shell/commands'
import {ShellEnvironment} from '../shell/environment'
import {parseCommand, parseCommandPipeline} from '../shell/parser'
import {executePipeline} from '../shell/pipeline'
import {VirtualFileSystemImpl} from '../shell/virtual-file-system'
import {createWasmExecutableCommands} from '../shell/wasm-commands'
import {createWasmModuleLoader} from '../shell/wasm-loader'

interface ShellWorkerState {
  readonly environment: ShellEnvironment
  readonly fileSystem: VirtualFileSystemImpl
  readonly commands: Map<string, ShellCommand>
  readonly wasmLoader: WasmModuleLoader
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

  const wasmLoader = createWasmModuleLoader(5) // Cache up to 5 WASM modules
  const commands = createStandardCommands(fileSystem, environment)

  const wasmCommands = createWasmExecutableCommands(wasmLoader)
  for (const [name, command] of wasmCommands) {
    commands.set(name, command)
  }

  return {environment, fileSystem, commands, wasmLoader}
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
      case 'execute-pipeline':
        return await handleExecutePipeline(state, request)
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
      case 'list-jobs':
        return handleListJobs(state, request)
      case 'foreground-job':
        return handleForegroundJob(state, request)
      case 'background-job':
        return handleBackgroundJob(state, request)
      case 'kill-job':
        return handleKillJob(state, request)
      case 'get-job-notifications':
        return handleGetJobNotifications(state, request)
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
 * Execute a command pipeline in the shell environment.
 *
 * Handles multi-command pipelines with I/O redirection, managing the flow of data
 * between commands and integrating with the virtual file system for file operations.
 * Supports background execution for commands ending with '&'.
 */
async function handleExecutePipeline(
  state: ShellWorkerState,
  request: ExecutePipelineRequest,
): Promise<ShellWorkerResponse> {
  const {pipeline, stdin, timeout} = request

  // Detect simple command case and delegate to single command handler
  if (pipeline.commands.length === 1 && pipeline.commands[0]?.outputRedirections.length === 0) {
    const singleCommand = pipeline.commands[0]
    if (singleCommand) {
      const commandRequest: ExecuteCommandRequest = {
        type: 'execute',
        command: `${singleCommand.command} ${singleCommand.args.join(' ')}`,
        stdin,
        timeout,
      }
      return await handleExecuteCommand(state, commandRequest)
    }
  }

  const context = state.environment.createExecutionContext(stdin)
  const commandString = pipeline.commands.map(cmd => `${cmd.command} ${cmd.args.join(' ')}`).join(' | ')

  // Use environment's startJob method for job control integration
  const processInfo = state.environment.startJob(commandString, pipeline.background)

  // Handle background processes
  if (pipeline.background) {
    // Start background execution - don't wait for completion
    executeBackgroundPipeline(pipeline, state, context, processInfo.id, timeout || 15000)

    // Return immediately with background job information
    return {
      type: 'pipeline-result',
      result: {
        processId: processInfo.id,
        command: commandString,
        commandResults: [],
        stdout: `[${processInfo.id}] ${processInfo.id}\n`, // Job started message
        stderr: '',
        exitCode: 0,
        executionTime: 0,
      },
    }
  }

  // Handle foreground processes (existing synchronous behavior)
  try {
    const result = await executeWithTimeout(
      () => executePipeline(pipeline, state.commands, context, state.fileSystem),
      timeout || 15000,
    )

    state.environment.completeProcess(processInfo.id, {
      processId: result.processId,
      command: result.command,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      executionTime: result.executionTime,
    })

    return {
      type: 'pipeline-result',
      result,
    }
  } catch (error) {
    const errorResult = {
      processId: context.processId,
      command: commandString,
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: 1,
      executionTime: Date.now() - processInfo.startTime,
    }

    state.environment.completeProcess(processInfo.id, errorResult)

    return {
      type: 'pipeline-result',
      result: {
        processId: errorResult.processId,
        command: errorResult.command,
        commandResults: [],
        stdout: errorResult.stdout,
        stderr: errorResult.stderr,
        exitCode: errorResult.exitCode,
        executionTime: errorResult.executionTime,
      },
    }
  }
}

/**
 * Execute a pipeline in the background asynchronously.
 *
 * This function simulates background process execution by running the pipeline
 * asynchronously and updating the process status when complete.
 */
function executeBackgroundPipeline(
  pipeline: CommandPipeline,
  state: ShellWorkerState,
  context: ExecutionContext,
  processId: number,
  timeout: number,
): void {
  ;(async () => {
    try {
      const result = await executeWithTimeout(
        () => executePipeline(pipeline, state.commands, context, state.fileSystem),
        timeout,
      )

      // Complete the background process
      state.environment.completeProcess(processId, {
        processId: result.processId,
        command: result.command,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        executionTime: result.executionTime,
      })

      consola.debug('[ShellWorker] Background job completed', {
        processId,
        exitCode: result.exitCode,
        executionTime: result.executionTime,
      })
    } catch (error) {
      // Handle background process errors
      const errorResult = {
        processId: context.processId,
        command: pipeline.commands.map(cmd => `${cmd.command} ${cmd.args.join(' ')}`).join(' | '),
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: 1,
        executionTime: Date.now() - Date.now(), // This will be overwritten by process tracking
      }

      state.environment.completeProcess(processId, errorResult)

      consola.debug('[ShellWorker] Background job failed', {
        processId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })().catch(error => {
    // Final error handler for any uncaught errors
    consola.error('[ShellWorker] Uncaught error in background job execution', {
      processId,
      error: error instanceof Error ? error.message : String(error),
    })
  })
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

  // Check if command contains pipeline operators or redirection
  if (trimmedCommand.includes('|') || /[<>]/.test(trimmedCommand)) {
    const tempContext = state.environment.createExecutionContext(stdin)
    const pipeline = parseCommandPipeline(trimmedCommand, tempContext.environmentVariables)

    const pipelineRequest: ExecutePipelineRequest = {
      type: 'execute-pipeline',
      pipeline,
      stdin,
      timeout,
    }

    const pipelineResponse = await handleExecutePipeline(state, pipelineRequest)

    // Convert pipeline response to command response format for backward compatibility
    if (pipelineResponse.type === 'pipeline-result') {
      return {
        type: 'command-result',
        result: {
          processId: pipelineResponse.result.processId,
          command: pipelineResponse.result.command,
          stdout: pipelineResponse.result.stdout,
          stderr: pipelineResponse.result.stderr,
          exitCode: pipelineResponse.result.exitCode,
          executionTime: pipelineResponse.result.executionTime,
        },
      }
    }

    return pipelineResponse
  }

  const tempContext = state.environment.createExecutionContext(stdin)
  const parts = parseCommand(trimmedCommand, tempContext.environmentVariables)
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

  let shellCommand = state.commands.get(commandName)

  // If command not found in built-ins, try PATH resolution
  if (!shellCommand) {
    const resolveContext = state.environment.createExecutionContext()
    const resolvedCommand = await resolveCommandWithPath(commandName, resolveContext, state.fileSystem, state.commands)
    shellCommand = resolvedCommand || undefined
  }

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

  const context = state.environment.createExecutionContext(stdin, args)
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
 * List all background jobs.
 */
function handleListJobs(state: ShellWorkerState, _request: ListJobsRequest): ShellWorkerResponse {
  const jobController = state.environment.getJobController()
  const jobs = jobController.listJobs()
  return {
    type: 'job-list',
    jobs,
  }
}

/**
 * Bring a background job to the foreground.
 */
function handleForegroundJob(state: ShellWorkerState, request: ForegroundJobRequest): ShellWorkerResponse {
  const jobController = state.environment.getJobController()
  const success = jobController.foregroundJob(request.jobId)
  return {
    type: 'job-control',
    success,
    message: success
      ? `Job ${request.jobId} brought to foreground`
      : `Job ${request.jobId} not found or cannot be foregrounded`,
  }
}

/**
 * Send a job to the background.
 */
function handleBackgroundJob(state: ShellWorkerState, request: BackgroundJobRequest): ShellWorkerResponse {
  const jobController = state.environment.getJobController()
  const success = jobController.backgroundJob(request.jobId)
  return {
    type: 'job-control',
    success,
    message: success
      ? `Job ${request.jobId} sent to background`
      : `Job ${request.jobId} not found or cannot be backgrounded`,
  }
}

/**
 * Kill a background job.
 */
function handleKillJob(state: ShellWorkerState, request: KillJobRequest): ShellWorkerResponse {
  const jobController = state.environment.getJobController()
  const success = jobController.killJob(request.jobId)
  return {
    type: 'job-control',
    success,
    message: success ? `Job ${request.jobId} terminated` : `Job ${request.jobId} not found`,
  }
}

/**
 * Get job notifications for completed or status-changed jobs.
 */
function handleGetJobNotifications(state: ShellWorkerState, _request: GetJobNotificationsRequest): ShellWorkerResponse {
  const jobController = state.environment.getJobController()
  const notifications = jobController.getNotifications()
  jobController.clearNotifications() // Clear after reading
  return {
    type: 'job-notifications',
    notifications,
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

const shellWorkerState = createShellWorkerState()

// Listen for messages from main thread
globalThis.addEventListener('message', async (event: MessageEvent<ShellWorkerRequest>) => {
  const response = await handleMessage(shellWorkerState, event.data)
  globalThis.postMessage(response)
})
