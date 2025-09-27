/**
 * Job control types and interfaces for background process management in the WASM shell.
 *
 * This module defines the job control system that simulates Unix-like background
 * job management in a web browser environment. Jobs represent command executions
 * that can run in "background" mode while the user continues working with the shell.
 */

/**
 * Job status indicating the current state of a background job.
 */
export type JobStatus = 'running' | 'stopped' | 'completed' | 'killed' | 'failed'

/**
 * Job control signal types that can be sent to jobs.
 */
export type JobSignal = 'SIGTERM' | 'SIGKILL' | 'SIGSTOP' | 'SIGCONT'

/**
 * Background job information tracked by the job control system.
 */
export interface Job {
  /** Unique job identifier (incremental) */
  readonly jobId: number
  /** Process ID of the command execution */
  readonly processId: number
  /** Command string that was executed */
  readonly command: string
  /** Job execution status */
  readonly status: JobStatus
  /** Timestamp when job was started */
  readonly startTime: number
  /** Timestamp when job completed (if applicable) */
  readonly endTime?: number
  /** Exit code if job has completed */
  readonly exitCode?: number
  /** Job output if completed */
  readonly output?: string
  /** Job error output if completed or failed */
  readonly errorOutput?: string
  /** Whether this job is in the foreground */
  readonly foreground: boolean
}

/**
 * Job control notification for status changes.
 */
export interface JobNotification {
  /** Job that changed status */
  readonly job: Job
  /** Previous status */
  readonly previousStatus: JobStatus
  /** Notification message for display */
  readonly message: string
}

/**
 * Job execution options for starting background jobs.
 */
export interface JobExecutionOptions {
  /** Whether to start job in background (true) or foreground (false) */
  readonly background: boolean
  /** Timeout for job execution in milliseconds */
  readonly timeout?: number
  /** Whether to notify on job completion */
  readonly notify?: boolean
}

/**
 * Job control configuration options.
 */
export interface JobControlOptions {
  /** Maximum number of background jobs allowed */
  readonly maxJobs: number
  /** Default timeout for background jobs */
  readonly defaultTimeout: number
  /** Whether to enable job completion notifications */
  readonly enableNotifications: boolean
  /** How long to keep completed jobs in the job table */
  readonly jobRetentionMs: number
}

/**
 * Job control system interface for managing background processes.
 */
export interface JobController {
  /** Start a new job (background or foreground) */
  readonly startJob: (command: string, processId: number, options: JobExecutionOptions) => Job

  /** Get job by job ID */
  readonly getJob: (jobId: number) => Job | undefined

  /** Get job by process ID */
  readonly getJobByProcess: (processId: number) => Job | undefined

  /** List all active jobs */
  readonly listJobs: () => Job[]

  /** Bring job to foreground */
  readonly foregroundJob: (jobId: number) => boolean

  /** Send job to background */
  readonly backgroundJob: (jobId: number) => boolean

  /** Send signal to job */
  readonly sendSignal: (jobId: number, signal: JobSignal) => boolean

  /** Kill job */
  readonly killJob: (jobId: number) => boolean

  /** Remove job from job table */
  readonly removeJob: (jobId: number) => boolean

  /** Update job status (called by process completion) */
  readonly updateJobStatus: (
    processId: number,
    status: JobStatus,
    exitCode?: number,
    output?: string,
    errorOutput?: string,
  ) => void

  /** Get pending job notifications */
  readonly getNotifications: () => JobNotification[]

  /** Clear job notifications */
  readonly clearNotifications: () => void

  /** Cleanup completed jobs based on retention policy */
  readonly cleanup: () => void
}
