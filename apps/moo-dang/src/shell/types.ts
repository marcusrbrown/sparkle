/**
 * Enhanced shell environment types for proper isolation and state management.
 */

/**
 * Redirection operator types for I/O redirection.
 */
export type RedirectionOperator = '>' | '<' | '>>' | '2>' | '&>'

/**
 * Redirection specification for command I/O.
 */
export interface IORedirection {
  /** Type of redirection operation */
  readonly operator: RedirectionOperator
  /** Target file path for redirection */
  readonly target: string
  /** File descriptor for advanced redirection (optional) */
  readonly fileDescriptor?: number
}

/**
 * Parsed command with potential pipeline and redirection information.
 */
export interface ParsedCommand {
  /** Command name */
  readonly command: string
  /** Command arguments */
  readonly args: string[]
  /** Input redirection specifications */
  readonly inputRedirections: IORedirection[]
  /** Output redirection specifications */
  readonly outputRedirections: IORedirection[]
}

/**
 * Command pipeline representation.
 */
export interface CommandPipeline {
  /** Commands in the pipeline (in order of execution) */
  readonly commands: ParsedCommand[]
  /** Whether to run pipeline in background */
  readonly background: boolean
}

/**
 * Pipeline execution result combining results from all commands.
 */
export interface PipelineExecutionResult {
  /** Process ID of the pipeline (first command's process ID) */
  readonly processId: number
  /** Original command line that created the pipeline */
  readonly command: string
  /** Results from each command in the pipeline */
  readonly commandResults: CommandExecutionResult[]
  /** Final stdout from the last command */
  readonly stdout: string
  /** Combined stderr from all commands */
  readonly stderr: string
  /** Exit code of the last command (or first failing command) */
  readonly exitCode: number
  /** Total execution time for the entire pipeline */
  readonly executionTime: number
}

/**
 * Shell environment state containing working directory, environment variables, and shell options.
 */
export interface ShellEnvironmentState {
  /** Current working directory path */
  readonly workingDirectory: string
  /** Environment variables available to shell commands */
  readonly environmentVariables: Record<string, string>
  /** Shell execution options and settings */
  readonly shellOptions: ShellOptions
  /** Process table for tracking running processes */
  readonly processes: ReadonlyMap<number, ProcessInfo>
  /** Next available process ID */
  readonly nextProcessId: number
}

/**
 * Shell configuration options.
 */
export interface ShellOptions {
  /** Maximum number of concurrent processes */
  readonly maxProcesses: number
  /** Command execution timeout in milliseconds */
  readonly commandTimeout: number
  /** Enable debug logging for shell operations */
  readonly enableDebugLogging: boolean
  /** Shell prompt string */
  readonly prompt: string
}

/**
 * Information about a running process in the shell.
 */
export interface ProcessInfo {
  /** Unique process identifier */
  readonly id: number
  /** Command that started this process */
  readonly command: string
  /** Process start time */
  readonly startTime: number
  /** Process execution context */
  readonly context: ExecutionContext
  /** Process status */
  readonly status: ProcessStatus
}

/**
 * Process execution status.
 */
export type ProcessStatus = 'running' | 'completed' | 'failed' | 'killed'

/**
 * Execution context for command isolation.
 */
export interface ExecutionContext {
  /** Working directory for this execution */
  readonly workingDirectory: string
  /** Environment variables for this execution */
  readonly environmentVariables: Record<string, string>
  /** Standard input data */
  readonly stdin?: string
  /** Process ID for this execution */
  readonly processId: number
  /** Command-line arguments (argv-style array) */
  readonly args?: string[]
}

/**
 * Result of command execution.
 */
export interface CommandExecutionResult {
  /** Process ID that executed the command */
  readonly processId: number
  /** Command that was executed */
  readonly command: string
  /** Standard output from the command */
  readonly stdout: string
  /** Standard error from the command */
  readonly stderr: string
  /** Exit code (0 for success, non-zero for error) */
  readonly exitCode: number
  /** Execution time in milliseconds */
  readonly executionTime: number
}

/**
 * Enhanced shell worker request types.
 */
export type ShellWorkerRequest =
  | ExecuteCommandRequest
  | ExecutePipelineRequest
  | GetEnvironmentRequest
  | SetEnvironmentRequest
  | ChangeDirectoryRequest
  | KillProcessRequest
  | ListProcessesRequest
  | ListJobsRequest
  | ForegroundJobRequest
  | BackgroundJobRequest
  | KillJobRequest
  | GetJobNotificationsRequest

/**
 * Request to execute a command in the shell.
 */
export interface ExecuteCommandRequest {
  readonly type: 'execute'
  readonly command: string
  readonly stdin?: string
  readonly timeout?: number
}

/**
 * Request to execute a command pipeline in the shell.
 */
export interface ExecutePipelineRequest {
  readonly type: 'execute-pipeline'
  readonly pipeline: CommandPipeline
  readonly stdin?: string
  readonly timeout?: number
}

/**
 * Request to get current shell environment state.
 */
export interface GetEnvironmentRequest {
  readonly type: 'get-environment'
}

/**
 * Request to set environment variable.
 */
export interface SetEnvironmentRequest {
  readonly type: 'set-environment'
  readonly key: string
  readonly value: string
}

/**
 * Request to change working directory.
 */
export interface ChangeDirectoryRequest {
  readonly type: 'change-directory'
  readonly path: string
}

/**
 * Request to kill a running process.
 */
export interface KillProcessRequest {
  readonly type: 'kill-process'
  readonly processId: number
}

/**
 * Request to list all running processes.
 */
export interface ListProcessesRequest {
  readonly type: 'list-processes'
}

/**
 * Request to list background jobs.
 */
export interface ListJobsRequest {
  readonly type: 'list-jobs'
}

/**
 * Request to bring job to foreground.
 */
export interface ForegroundJobRequest {
  readonly type: 'foreground-job'
  readonly jobId: number
}

/**
 * Request to send job to background.
 */
export interface BackgroundJobRequest {
  readonly type: 'background-job'
  readonly jobId: number
}

/**
 * Request to kill a job.
 */
export interface KillJobRequest {
  readonly type: 'kill-job'
  readonly jobId: number
}

/**
 * Request to get job notifications.
 */
export interface GetJobNotificationsRequest {
  readonly type: 'get-job-notifications'
}

/**
 * Enhanced shell worker response types.
 */
export type ShellWorkerResponse =
  | CommandExecutionResponse
  | PipelineExecutionResponse
  | EnvironmentResponse
  | EnvironmentSetResponse
  | DirectoryChangedResponse
  | ProcessKilledResponse
  | ProcessListResponse
  | JobListResponse
  | JobControlResponse
  | JobNotificationsResponse
  | ErrorResponse
  | LogResponse
  | DebugResponse

/**
 * Response to command execution request.
 */
export interface CommandExecutionResponse {
  readonly type: 'command-result'
  readonly result: CommandExecutionResult
}

/**
 * Response to pipeline execution request.
 */
export interface PipelineExecutionResponse {
  readonly type: 'pipeline-result'
  readonly result: PipelineExecutionResult
}

/**
 * Response to environment state request.
 */
export interface EnvironmentResponse {
  readonly type: 'environment'
  readonly state: ShellEnvironmentState
}

/**
 * Response to environment variable set request.
 */
export interface EnvironmentSetResponse {
  readonly type: 'environment-set'
  readonly key: string
  readonly value: string
}

/**
 * Response to directory change request.
 */
export interface DirectoryChangedResponse {
  readonly type: 'directory-changed'
  readonly newDirectory: string
}

/**
 * Response to process kill request.
 */
export interface ProcessKilledResponse {
  readonly type: 'process-killed'
  readonly processId: number
}

/**
 * Response to process list request.
 */
export interface ProcessListResponse {
  readonly type: 'process-list'
  readonly processes: ProcessInfo[]
}

/**
 * Response to job list request.
 */
export interface JobListResponse {
  readonly type: 'job-list'
  readonly jobs: import('./job-types').Job[]
}

/**
 * Response to job control operations (fg, bg, kill).
 */
export interface JobControlResponse {
  readonly type: 'job-control'
  readonly success: boolean
  readonly message?: string
}

/**
 * Response to job notifications request.
 */
export interface JobNotificationsResponse {
  readonly type: 'job-notifications'
  readonly notifications: import('./job-types').JobNotification[]
}

/**
 * Error response for failed operations.
 */
export interface ErrorResponse {
  readonly type: 'error'
  readonly message: string
  readonly code?: string
}

/**
 * Log response for worker log messages.
 */
export interface LogResponse {
  readonly type: 'log'
  readonly level: 'info' | 'error'
  readonly message: string
  readonly data?: Record<string, unknown>
  readonly error?: string
}

/**
 * Debug response for worker debug messages.
 */
export interface DebugResponse {
  readonly type: 'debug'
  readonly message: string
  readonly data?: Record<string, unknown>
}

/**
 * Shell command interface for implementing built-in commands.
 */
export interface ShellCommand {
  /** Command name */
  readonly name: string
  /** Command description */
  readonly description: string
  /** Execute the command with given arguments and context */
  readonly execute: (args: string[], context: ExecutionContext) => Promise<CommandExecutionResult>
}

/**
 * Directory entry information for detailed listings.
 */
export interface DirectoryEntry {
  /** Entry name */
  readonly name: string
  /** Entry type (file or directory) */
  readonly type: 'file' | 'directory'
  /** File permissions string (e.g., '-rw-r--r--' or 'drwxr-xr-x') */
  readonly permissions: string
  /** File size in bytes (0 for directories) */
  readonly size: number
  /** Last modification timestamp */
  readonly lastModified: Date
}

/**
 * Virtual file system interface for shell file operations.
 */
export interface VirtualFileSystem {
  /** Get current working directory */
  readonly getCurrentDirectory: () => string
  /** Change working directory */
  readonly changeDirectory: (path: string) => Promise<string>
  /** List directory contents (simple names only) */
  readonly listDirectory: (path: string) => Promise<string[]>
  /** Get detailed directory listing with file information */
  readonly getDetailedListing: (path: string) => Promise<DirectoryEntry[]>
  /** Check if path exists */
  readonly exists: (path: string) => Promise<boolean>
  /** Read file contents */
  readonly readFile: (path: string) => Promise<string>
  /** Write file contents */
  readonly writeFile: (path: string, content: string) => Promise<void>
  /** Create a new directory */
  readonly createDirectory: (path: string) => Promise<void>
  /** Remove a file or directory */
  readonly remove: (path: string) => Promise<void>
  /** Check if path is a directory */
  readonly isDirectory: (path: string) => Promise<boolean>
  /** Check if path is a file */
  readonly isFile: (path: string) => Promise<boolean>
  /** Get file or directory size in bytes */
  readonly getSize: (path: string) => Promise<number>
}

// Legacy types for backward compatibility - will be removed in future versions
/** @deprecated Use ExecuteCommandRequest instead */
export interface LegacyShellWorkerRequest {
  type: 'execute'
  command: string
}

/** @deprecated Use CommandExecutionResponse instead */
export interface LegacyShellWorkerResponse {
  type: 'result'
  output: string
  error?: string
}
