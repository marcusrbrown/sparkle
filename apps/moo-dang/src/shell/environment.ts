/**
 * Shell environment implementation providing isolated execution contexts for commands.
 */

import type {JobController} from './job-types'
import type {
  CommandExecutionResult,
  ExecutionContext,
  ProcessInfo,
  ProcessStatus,
  ShellEnvironmentState,
  ShellOptions,
  VirtualFileSystem,
} from './types'

import {createJobController} from './job-controller'

/**
 * Default shell configuration options.
 */
const DEFAULT_SHELL_OPTIONS: ShellOptions = {
  maxProcesses: 10,
  commandTimeout: 30000, // 30 seconds
  enableDebugLogging: false,
  prompt: '$ ',
}

/**
 * Default environment variables for the shell.
 */
const DEFAULT_ENVIRONMENT_VARIABLES: Record<string, string> = {
  HOME: '/home/user',
  USER: 'user',
  SHELL: '/bin/moo-dang',
  PATH: '/bin:/usr/bin:/usr/local/bin:/wasm',
  PWD: '/home/user',
  TERM: 'moo-dang-web',
  LANG: 'en_US.UTF-8',
  LC_ALL: 'en_US.UTF-8',
  COLUMNS: '80',
  LINES: '24',
}

/**
 * Shell environment manages isolated execution contexts and process lifecycle.
 *
 * Provides secure process isolation, state management, and execution context
 * for commands running in the Web Worker environment.
 */
export class ShellEnvironment {
  private state: ShellEnvironmentState
  private readonly fileSystem: VirtualFileSystem
  private readonly jobController: JobController

  constructor(fileSystem: VirtualFileSystem, options: Partial<ShellOptions> = {}) {
    this.fileSystem = fileSystem

    const shellOptions: ShellOptions = {
      ...DEFAULT_SHELL_OPTIONS,
      ...options,
    }

    this.state = {
      workingDirectory: '/home/user',
      environmentVariables: {...DEFAULT_ENVIRONMENT_VARIABLES},
      shellOptions,
      processes: new Map(),
      nextProcessId: 1,
    }

    this.jobController = createJobController({
      maxJobs: shellOptions.maxProcesses,
      enableNotifications: true,
    })

    this.logDebug('Shell environment initialized', {
      workingDirectory: this.state.workingDirectory,
      maxProcesses: shellOptions.maxProcesses,
    })
  }

  /**
   * Get current shell environment state (immutable snapshot).
   */
  getState(): ShellEnvironmentState {
    return {
      ...this.state,
      processes: new Map(this.state.processes),
      environmentVariables: {...this.state.environmentVariables},
    }
  }

  /**
   * Change the current working directory.
   */
  async changeDirectory(path: string): Promise<string> {
    const resolvedPath = this.resolvePath(path)

    if (!(await this.fileSystem.exists(resolvedPath))) {
      throw new Error(`Directory not found: ${path}`)
    }

    const newDirectory = await this.fileSystem.changeDirectory(resolvedPath)

    this.state = {
      ...this.state,
      workingDirectory: newDirectory,
      environmentVariables: {
        ...this.state.environmentVariables,
        PWD: newDirectory,
      },
    }

    this.logDebug('Directory changed', {from: resolvedPath, to: newDirectory})
    return newDirectory
  }

  /**
   * Set environment variable.
   */
  setEnvironmentVariable(key: string, value: string): void {
    this.state = {
      ...this.state,
      environmentVariables: {
        ...this.state.environmentVariables,
        [key]: value,
      },
    }

    this.logDebug('Environment variable set', {key, value})
  }

  /**
   * Update terminal dimensions (COLUMNS and LINES environment variables).
   */
  setTerminalSize(columns: number, lines: number): void {
    this.state = {
      ...this.state,
      environmentVariables: {
        ...this.state.environmentVariables,
        COLUMNS: columns.toString(),
        LINES: lines.toString(),
      },
    }

    this.logDebug('Terminal dimensions updated', {columns, lines})
  }

  /**
   * Get environment variable value.
   */
  getEnvironmentVariable(key: string): string | undefined {
    return this.state.environmentVariables[key]
  }

  /**
   * Create isolated execution context for command execution.
   */
  createExecutionContext(stdin?: string, args?: string[]): ExecutionContext {
    const processId = this.state.nextProcessId

    this.state = {
      ...this.state,
      nextProcessId: processId + 1,
    }

    return {
      workingDirectory: this.state.workingDirectory,
      environmentVariables: {...this.state.environmentVariables},
      stdin,
      processId,
      args,
    }
  }

  /**
   * Start a new process for command execution.
   */
  startProcess(command: string, context: ExecutionContext): ProcessInfo {
    if (this.state.processes.size >= this.state.shellOptions.maxProcesses) {
      throw new Error(`Maximum number of processes reached: ${this.state.shellOptions.maxProcesses}`)
    }

    const processInfo: ProcessInfo = {
      id: context.processId,
      command,
      startTime: Date.now(),
      context,
      status: 'running',
    }

    const newProcesses = new Map(this.state.processes)
    newProcesses.set(processInfo.id, processInfo)

    this.state = {
      ...this.state,
      processes: newProcesses,
    }

    this.logDebug('Process started', {processId: processInfo.id, command})
    return processInfo
  }

  /**
   * Complete a process with execution result.
   */
  completeProcess(processId: number, result: CommandExecutionResult): void {
    const process = this.state.processes.get(processId)
    if (!process) {
      this.logDebug('Attempted to complete unknown process', {processId})
      return
    }

    // Update job controller with completion status
    this.jobController.updateJobStatus(
      processId,
      result.exitCode === 0 ? 'completed' : 'failed',
      result.exitCode,
      result.stdout,
      result.stderr,
    )

    const status: ProcessStatus = result.exitCode === 0 ? 'completed' : 'failed'
    const updatedProcess: ProcessInfo = {
      ...process,
      status,
    }

    const newProcesses = new Map(this.state.processes)
    newProcesses.set(processId, updatedProcess)

    this.state = {
      ...this.state,
      processes: newProcesses,
    }

    this.logDebug('Process completed', {
      processId,
      status,
      exitCode: result.exitCode,
      executionTime: result.executionTime,
    })

    // Remove completed processes after a short delay to allow status queries
    setTimeout(() => this.removeProcess(processId), 1000)
  }

  /**
   * Kill a running process.
   */
  killProcess(processId: number): boolean {
    const process = this.state.processes.get(processId)
    if (!process || process.status !== 'running') {
      return false
    }

    // Update job controller with kill status
    this.jobController.updateJobStatus(processId, 'killed')

    const killedProcess: ProcessInfo = {
      ...process,
      status: 'killed',
    }

    const newProcesses = new Map(this.state.processes)
    newProcesses.set(processId, killedProcess)

    this.state = {
      ...this.state,
      processes: newProcesses,
    }

    this.logDebug('Process killed', {processId})

    // Remove killed process after a short delay
    setTimeout(() => this.removeProcess(processId), 500)
    return true
  }

  /**
   * Get list of all processes.
   */
  getProcesses(): ProcessInfo[] {
    return Array.from(this.state.processes.values())
  }

  /**
   * Get specific process information.
   */
  getProcess(processId: number): ProcessInfo | undefined {
    return this.state.processes.get(processId)
  }

  /**
   * Resolve relative path to absolute path based on current working directory.
   */
  private resolvePath(path: string): string {
    if (path.startsWith('/')) {
      return path
    }

    if (path === '.') {
      return this.state.workingDirectory
    }

    if (path === '..') {
      const parts = this.state.workingDirectory.split('/').filter(Boolean)
      parts.pop()
      return `/${parts.join('/')}`
    }

    if (path.startsWith('./')) {
      path = path.slice(2)
    }

    return this.state.workingDirectory === '/' ? `/${path}` : `${this.state.workingDirectory}/${path}`
  }

  /**
   * Remove process from process table.
   */
  private removeProcess(processId: number): void {
    const newProcesses = new Map(this.state.processes)
    const removed = newProcesses.delete(processId)

    if (removed) {
      this.state = {
        ...this.state,
        processes: newProcesses,
      }

      this.logDebug('Process removed from table', {processId})
    }
  }

  /**
   * Get job controller for background job management.
   */
  getJobController(): JobController {
    return this.jobController
  }

  /**
   * Start a job (integrates with existing process creation).
   */
  startJob(command: string, background: boolean): ProcessInfo {
    const context = this.createExecutionContext()
    const processInfo = this.startProcess(command, context)

    // Register with job controller
    this.jobController.startJob(command, processInfo.id, {
      background,
      timeout: this.state.shellOptions.commandTimeout,
      notify: true,
    })

    return processInfo
  }

  /**
   * Log debug message if debug logging is enabled.
   */
  private logDebug(message: string, data?: Record<string, unknown>): void {
    if (this.state.shellOptions.enableDebugLogging) {
      // Use consola for structured logging in Web Worker environment
      import('consola')
        .then(({consola}) => {
          consola.debug(`[ShellEnvironment] ${message}`, data || {})
        })
        .catch(() => {
          // Fallback if consola import fails
        })
    }
  }
}
