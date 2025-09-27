/**
 * Job control system implementation for managing background processes in the WASM shell.
 *
 * This module provides Unix-like job control functionality in a web browser environment,
 * simulating background process execution while maintaining the shell's interactive capabilities.
 * The implementation tracks job states, provides job management commands, and handles
 * process lifecycle events within the constraints of Web Worker execution.
 */

import type {
  Job,
  JobController,
  JobControlOptions,
  JobExecutionOptions,
  JobNotification,
  JobSignal,
  JobStatus,
} from './job-types'

import {consola} from 'consola'

/**
 * Default configuration for job control system.
 */
const DEFAULT_JOB_CONTROL_OPTIONS: JobControlOptions = {
  maxJobs: 10,
  defaultTimeout: 30000, // 30 seconds
  enableNotifications: true,
  jobRetentionMs: 60000, // 1 minute
}

/**
 * Job control system implementation managing background process simulation.
 *
 * Provides job lifecycle management, status tracking, and notification system
 * for commands executed in background mode. Simulates Unix shell job control
 * semantics within browser Web Worker constraints.
 */
export class JobControlSystem implements JobController {
  private readonly options: JobControlOptions
  private readonly jobs: Map<number, Job> = new Map()
  private readonly notifications: JobNotification[] = []
  private nextJobId = 1

  constructor(options: Partial<JobControlOptions> = {}) {
    this.options = {
      ...DEFAULT_JOB_CONTROL_OPTIONS,
      ...options,
    }

    // Start cleanup timer
    this.startCleanupTimer()

    consola.debug('[JobController] Job control system initialized', {
      maxJobs: this.options.maxJobs,
      enableNotifications: this.options.enableNotifications,
    })
  }

  /**
   * Start a new job with the specified execution options.
   */
  readonly startJob = (command: string, processId: number, options: JobExecutionOptions): Job => {
    if (this.jobs.size >= this.options.maxJobs) {
      throw new Error(`Maximum number of jobs (${this.options.maxJobs}) exceeded`)
    }

    const jobId = this.nextJobId++
    const job: Job = {
      jobId,
      processId,
      command,
      status: 'running',
      startTime: Date.now(),
      foreground: !options.background,
    }

    this.jobs.set(jobId, job)

    if (options.background && this.options.enableNotifications) {
      consola.info(`[Job ${jobId}] Started background job: ${command}`)
    }

    consola.debug('[JobController] Job started', {
      jobId,
      processId,
      command,
      background: options.background,
    })

    return job
  }

  /**
   * Get job by job ID.
   */
  readonly getJob = (jobId: number): Job | undefined => {
    return this.jobs.get(jobId)
  }

  /**
   * Get job by process ID.
   */
  readonly getJobByProcess = (processId: number): Job | undefined => {
    for (const job of this.jobs.values()) {
      if (job.processId === processId) {
        return job
      }
    }
    return undefined
  }

  /**
   * List all jobs (active and recently completed).
   */
  readonly listJobs = (): Job[] => {
    return Array.from(this.jobs.values()).sort((a, b) => a.jobId - b.jobId)
  }

  /**
   * Bring a background job to the foreground.
   */
  readonly foregroundJob = (jobId: number): boolean => {
    const job = this.jobs.get(jobId)
    if (!job) {
      return false
    }

    if (job.status !== 'running' && job.status !== 'stopped') {
      return false // Can't foreground completed jobs
    }

    const updatedJob: Job = {
      ...job,
      foreground: true,
    }

    this.jobs.set(jobId, updatedJob)

    if (job.status === 'stopped') {
      // Resume stopped job when bringing to foreground
      this.updateJobStatusInternal(jobId, 'running')
    }

    consola.debug('[JobController] Job brought to foreground', {jobId})
    return true
  }

  /**
   * Send a job to the background.
   */
  readonly backgroundJob = (jobId: number): boolean => {
    const job = this.jobs.get(jobId)
    if (!job) {
      return false
    }

    if (job.status !== 'running' && job.status !== 'stopped') {
      return false // Can't background completed jobs
    }

    const updatedJob: Job = {
      ...job,
      foreground: false,
    }

    this.jobs.set(jobId, updatedJob)

    if (job.status === 'stopped') {
      // Resume job when sending to background
      this.updateJobStatusInternal(jobId, 'running')
    }

    consola.debug('[JobController] Job sent to background', {jobId})
    return true
  }

  /**
   * Send a signal to a job.
   */
  readonly sendSignal = (jobId: number, signal: JobSignal): boolean => {
    const job = this.jobs.get(jobId)
    if (!job) {
      return false
    }

    switch (signal) {
      case 'SIGTERM':
      case 'SIGKILL':
        this.updateJobStatusInternal(jobId, 'killed')
        break
      case 'SIGSTOP':
        if (job.status === 'running') {
          this.updateJobStatusInternal(jobId, 'stopped')
        }
        break
      case 'SIGCONT':
        if (job.status === 'stopped') {
          this.updateJobStatusInternal(jobId, 'running')
        }
        break
      default:
        return false
    }

    consola.debug('[JobController] Signal sent to job', {jobId, signal})
    return true
  }

  /**
   * Kill a job.
   */
  readonly killJob = (jobId: number): boolean => {
    return this.sendSignal(jobId, 'SIGKILL')
  }

  /**
   * Remove a job from the job table.
   */
  readonly removeJob = (jobId: number): boolean => {
    const job = this.jobs.get(jobId)
    if (!job) {
      return false
    }

    this.jobs.delete(jobId)
    consola.debug('[JobController] Job removed', {jobId})
    return true
  }

  /**
   * Update job status (called when process completes or changes status).
   */
  readonly updateJobStatus = (
    processId: number,
    status: JobStatus,
    exitCode?: number,
    output?: string,
    errorOutput?: string,
  ): void => {
    const job = this.getJobByProcess(processId)
    if (!job) {
      return
    }

    const wasBackground = !job.foreground
    const previousStatus = job.status

    const updatedJob: Job = {
      ...job,
      status,
      ...(status === 'completed' || status === 'failed' || status === 'killed'
        ? {
            endTime: Date.now(),
            exitCode,
            output,
            errorOutput,
          }
        : {}),
    }

    this.jobs.set(job.jobId, updatedJob)

    // Create notification for status changes
    if (this.options.enableNotifications && previousStatus !== status) {
      let message: string

      if (status === 'completed') {
        message = wasBackground
          ? `[${job.jobId}]+  Done                    ${job.command}`
          : `Process ${processId} completed`
      } else if (status === 'failed') {
        message = wasBackground
          ? `[${job.jobId}]+  Exit ${exitCode || 1}                 ${job.command}`
          : `Process ${processId} failed`
      } else if (status === 'killed') {
        message = wasBackground
          ? `[${job.jobId}]+  Terminated              ${job.command}`
          : `Process ${processId} killed`
      } else if (status === 'stopped') {
        message = `[${job.jobId}]+  Stopped                ${job.command}`
      } else {
        message = `[${job.jobId}]   ${status}                  ${job.command}`
      }

      const notification: JobNotification = {
        job: updatedJob,
        previousStatus,
        message,
      }

      this.notifications.push(notification)
    }

    consola.debug('[JobController] Job status updated', {
      jobId: job.jobId,
      processId,
      previousStatus,
      newStatus: status,
      exitCode,
    })
  }

  /**
   * Get pending job notifications.
   */
  readonly getNotifications = (): JobNotification[] => {
    return [...this.notifications]
  }

  /**
   * Clear job notifications.
   */
  readonly clearNotifications = (): void => {
    this.notifications.length = 0
  }

  /**
   * Cleanup completed jobs based on retention policy.
   */
  readonly cleanup = (): void => {
    const now = Date.now()
    const jobsToRemove: number[] = []

    for (const [jobId, job] of this.jobs) {
      if (
        (job.status === 'completed' || job.status === 'failed' || job.status === 'killed') &&
        job.endTime &&
        now - job.endTime > this.options.jobRetentionMs
      ) {
        jobsToRemove.push(jobId)
      }
    }

    for (const jobId of jobsToRemove) {
      this.jobs.delete(jobId)
    }

    if (jobsToRemove.length > 0) {
      consola.debug('[JobController] Cleaned up completed jobs', {
        removedJobs: jobsToRemove.length,
      })
    }
  }

  /**
   * Internal method to update job status without external validation.
   */
  private updateJobStatusInternal(jobId: number, status: JobStatus): void {
    const job = this.jobs.get(jobId)
    if (!job) {
      return
    }

    const updatedJob: Job = {
      ...job,
      status,
    }

    this.jobs.set(jobId, updatedJob)
  }

  /**
   * Start cleanup timer to periodically remove old completed jobs.
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanup()
    }, 30000) // Run cleanup every 30 seconds
  }
}

/**
 * Create a new job control system with the specified options.
 */
export function createJobController(options: Partial<JobControlOptions> = {}): JobController {
  return new JobControlSystem(options)
}
