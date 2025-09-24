/**
 * Enhanced Shell Worker - Provides isolated shell environment with proper process management.
 *
 * This worker implements a complete shell environment with:
 * - Process isolation and execution contexts
 * - Virtual file system for safe file operations
 * - Built-in shell commands (echo, pwd, ls, cat, help, clear)
 * - Environment variable management
 * - Working directory management
 * - Process lifecycle management
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

import {createStandardCommands} from '../shell/commands'
import {ShellEnvironment} from '../shell/environment'
import {VirtualFileSystemImpl} from '../shell/virtual-file-system'

/**
 * Enhanced shell worker implementation with proper isolation and state management.
 */
class ShellWorkerImpl {
  private readonly environment: ShellEnvironment
  private readonly fileSystem: VirtualFileSystemImpl
  private readonly commands: Map<string, ShellCommand>

  constructor() {
    // Initialize virtual file system without debug logging
    this.fileSystem = new VirtualFileSystemImpl(false)

    // Initialize shell environment without debug logging to prevent interference
    this.environment = new ShellEnvironment(this.fileSystem, {
      enableDebugLogging: false,
      maxProcesses: 5, // Conservative limit for web environment
      commandTimeout: 15000, // 15 second timeout for commands
    })

    // Initialize standard shell commands
    this.commands = createStandardCommands(this.fileSystem)

    // Don't log initialization here - App.tsx handles this to prevent duplicates
  }

  /**
   * Handle incoming messages from the main thread.
   */
  async handleMessage(request: ShellWorkerRequest): Promise<ShellWorkerResponse> {
    try {
      switch (request.type) {
        case 'execute':
          return await this.handleExecuteCommand(request)
        case 'get-environment':
          return this.handleGetEnvironment(request)
        case 'set-environment':
          return this.handleSetEnvironment(request)
        case 'change-directory':
          return await this.handleChangeDirectory(request)
        case 'kill-process':
          return this.handleKillProcess(request)
        case 'list-processes':
          return this.handleListProcesses(request)
        default:
          return {
            type: 'error',
            message: `Unknown request type: ${(request as any).type}`,
            code: 'UNKNOWN_REQUEST',
          }
      }
    } catch (error) {
      this.logError('Request handling failed', error)
      return {
        type: 'error',
        message: error instanceof Error ? error.message : String(error),
        code: 'REQUEST_FAILED',
      }
    }
  }

  /**
   * Execute a command in the shell environment.
   */
  private async handleExecuteCommand(request: ExecuteCommandRequest): Promise<ShellWorkerResponse> {
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

    // Parse command and arguments
    const parts = this.parseCommand(trimmedCommand)
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

    // Check if command exists
    const shellCommand = this.commands.get(commandName)
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

    // Create execution context
    const context = this.environment.createExecutionContext(stdin)

    // Start process tracking
    const processInfo = this.environment.startProcess(trimmedCommand, context)

    try {
      // Execute command with timeout
      const result = await this.executeWithTimeout(() => shellCommand.execute(args, context), timeout || 15000)

      // Complete process
      this.environment.completeProcess(processInfo.id, result)

      return {
        type: 'command-result',
        result,
      }
    } catch (error) {
      // Handle execution error
      const errorResult = {
        processId: context.processId,
        command: trimmedCommand,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: 1,
        executionTime: Date.now() - processInfo.startTime,
      }

      this.environment.completeProcess(processInfo.id, errorResult)

      return {
        type: 'command-result',
        result: errorResult,
      }
    }
  }

  /**
   * Get current shell environment state.
   */
  private handleGetEnvironment(_request: GetEnvironmentRequest): ShellWorkerResponse {
    const state = this.environment.getState()
    return {
      type: 'environment',
      state,
    }
  }

  /**
   * Set environment variable.
   */
  private handleSetEnvironment(request: SetEnvironmentRequest): ShellWorkerResponse {
    this.environment.setEnvironmentVariable(request.key, request.value)
    return {
      type: 'environment-set',
      key: request.key,
      value: request.value,
    }
  }

  /**
   * Change working directory.
   */
  private async handleChangeDirectory(request: ChangeDirectoryRequest): Promise<ShellWorkerResponse> {
    try {
      const newDirectory = await this.environment.changeDirectory(request.path)
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
   * Kill a running process.
   */
  private handleKillProcess(request: KillProcessRequest): ShellWorkerResponse {
    const killed = this.environment.killProcess(request.processId)
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
   * List all running processes.
   */
  private handleListProcesses(_request: ListProcessesRequest): ShellWorkerResponse {
    const processes = this.environment.getProcesses()
    return {
      type: 'process-list',
      processes,
    }
  }

  /**
   * Parse command string into command and arguments.
   */
  private parseCommand(command: string): string[] {
    // Simple parsing - split on spaces, handle basic quoting
    const parts: string[] = []
    let current = ''
    let inQuotes = false
    let quoteChar = ''

    const chars = Array.from(command)

    for (const char of chars) {
      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true
        quoteChar = char
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false
        quoteChar = ''
      } else if (char === ' ' && !inQuotes) {
        if (current) {
          parts.push(current)
          current = ''
        }
      } else {
        current += char
      }
    }

    if (current) {
      parts.push(current)
    }

    return parts
  }

  /**
   * Execute function with timeout.
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
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
   * Log error message to main thread.
   */
  private logError(message: string, error?: unknown): void {
    globalThis.postMessage({
      type: 'log',
      level: 'error',
      message: `[ShellWorker] ${message}`,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

// Initialize shell worker
const shellWorker = new ShellWorkerImpl()

// Listen for messages from main thread
globalThis.addEventListener('message', async (event: MessageEvent<ShellWorkerRequest>) => {
  const response = await shellWorker.handleMessage(event.data)
  globalThis.postMessage(response)
})
