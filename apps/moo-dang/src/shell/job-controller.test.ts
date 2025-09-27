/**
 * Job control functionality tests for background process simulation.
 *
 * Tests the job control system including job creation, status tracking,
 * and job management commands (jobs, fg, bg, disown).
 */

import type {JobController} from './job-types'

import {describe, expect, it} from 'vitest'
import {createJobController} from './job-controller'

describe('JobController', () => {
  let jobController: JobController

  beforeEach(() => {
    jobController = createJobController({
      maxJobs: 5,
      enableNotifications: true,
      jobRetentionMs: 5000,
    })
  })

  describe('Job Creation and Management', () => {
    it('should create a new job', () => {
      const job = jobController.startJob('echo hello', 123, {
        background: true,
        timeout: 5000,
      })

      expect(job).toMatchObject({
        jobId: 1,
        processId: 123,
        command: 'echo hello',
        status: 'running',
        foreground: false,
      })
      expect(job.startTime).toBeGreaterThan(0)
    })

    it('should list active jobs', () => {
      jobController.startJob('sleep 10', 101, {background: true})
      jobController.startJob('cat file.txt', 102, {background: false})

      const jobs = jobController.listJobs()
      expect(jobs).toHaveLength(2)
      expect(jobs[0]?.command).toBe('sleep 10')
      expect(jobs[1]?.command).toBe('cat file.txt')
    })

    it('should get job by ID', () => {
      const createdJob = jobController.startJob('ls -la', 103, {background: true})
      const retrievedJob = jobController.getJob(createdJob.jobId)

      expect(retrievedJob).toEqual(createdJob)
    })

    it('should get job by process ID', () => {
      const createdJob = jobController.startJob('pwd', 104, {background: true})
      const retrievedJob = jobController.getJobByProcess(104)

      expect(retrievedJob).toEqual(createdJob)
    })
  })

  describe('Job Status Updates', () => {
    it('should update job status on completion', () => {
      const job = jobController.startJob('echo test', 105, {background: true})

      jobController.updateJobStatus(105, 'completed', 0, 'test\n', '')

      const updatedJob = jobController.getJob(job.jobId)
      expect(updatedJob?.status).toBe('completed')
      expect(updatedJob?.exitCode).toBe(0)
      expect(updatedJob?.output).toBe('test\n')
    })

    it('should update job status on failure', () => {
      const job = jobController.startJob('false', 106, {background: true})

      jobController.updateJobStatus(106, 'failed', 1, '', 'Command failed')

      const updatedJob = jobController.getJob(job.jobId)
      expect(updatedJob?.status).toBe('failed')
      expect(updatedJob?.exitCode).toBe(1)
      expect(updatedJob?.errorOutput).toBe('Command failed')
    })

    it('should create notifications on status change', () => {
      const job = jobController.startJob('sleep 1', 107, {background: true})

      jobController.updateJobStatus(107, 'completed', 0, '', '')

      const notifications = jobController.getNotifications()
      expect(notifications).toHaveLength(1)
      expect(notifications[0]?.job.jobId).toBe(job.jobId)
      expect(notifications[0]?.message).toContain('Done')
    })
  })

  describe('Job Control Operations', () => {
    it('should bring job to foreground', () => {
      const job = jobController.startJob('vim file.txt', 108, {background: true})

      const success = jobController.foregroundJob(job.jobId)

      expect(success).toBe(true)
      const updatedJob = jobController.getJob(job.jobId)
      expect(updatedJob?.foreground).toBe(true)
    })

    it('should send job to background', () => {
      const job = jobController.startJob('nano file.txt', 109, {background: false})

      const success = jobController.backgroundJob(job.jobId)

      expect(success).toBe(true)
      const updatedJob = jobController.getJob(job.jobId)
      expect(updatedJob?.foreground).toBe(false)
    })

    it('should kill a job', () => {
      const job = jobController.startJob('sleep 100', 110, {background: true})

      const success = jobController.killJob(job.jobId)

      expect(success).toBe(true)
      const updatedJob = jobController.getJob(job.jobId)
      expect(updatedJob?.status).toBe('killed')
    })

    it('should remove a job', () => {
      const job = jobController.startJob('echo done', 111, {background: true})

      const success = jobController.removeJob(job.jobId)

      expect(success).toBe(true)
      expect(jobController.getJob(job.jobId)).toBeUndefined()
    })
  })

  describe('Job Signals', () => {
    it('should handle SIGTERM signal', () => {
      const job = jobController.startJob('long-process', 112, {background: true})

      const success = jobController.sendSignal(job.jobId, 'SIGTERM')

      expect(success).toBe(true)
      const updatedJob = jobController.getJob(job.jobId)
      expect(updatedJob?.status).toBe('killed')
    })

    it('should handle SIGSTOP signal', () => {
      const job = jobController.startJob('interactive-app', 113, {background: true})

      const success = jobController.sendSignal(job.jobId, 'SIGSTOP')

      expect(success).toBe(true)
      const updatedJob = jobController.getJob(job.jobId)
      expect(updatedJob?.status).toBe('stopped')
    })

    it('should handle SIGCONT signal', () => {
      const job = jobController.startJob('paused-app', 114, {background: true})
      jobController.sendSignal(job.jobId, 'SIGSTOP') // Stop first

      const success = jobController.sendSignal(job.jobId, 'SIGCONT')

      expect(success).toBe(true)
      const updatedJob = jobController.getJob(job.jobId)
      expect(updatedJob?.status).toBe('running')
    })
  })

  describe('Notification Management', () => {
    it('should clear notifications after reading', () => {
      jobController.startJob('quick-task', 115, {background: true})
      jobController.updateJobStatus(115, 'completed', 0, 'done', '')

      expect(jobController.getNotifications()).toHaveLength(1)

      jobController.clearNotifications()
      expect(jobController.getNotifications()).toHaveLength(0)
    })
  })

  describe('Error Handling', () => {
    it('should return false for invalid job operations', () => {
      expect(jobController.foregroundJob(999)).toBe(false)
      expect(jobController.backgroundJob(999)).toBe(false)
      expect(jobController.killJob(999)).toBe(false)
      expect(jobController.removeJob(999)).toBe(false)
      expect(jobController.sendSignal(999, 'SIGTERM')).toBe(false)
    })

    it('should handle job limit enforcement', () => {
      // Create maximum number of jobs
      for (let i = 1; i <= 5; i++) {
        jobController.startJob(`job-${i}`, 200 + i, {background: true})
      }

      // Attempt to create one more job beyond the limit
      expect(() => {
        jobController.startJob('job-6', 206, {background: true})
      }).toThrow('Maximum number of jobs')
    })
  })
})

describe('Job Control Commands Integration', () => {
  it('should integrate with shell environment', async () => {
    // This would test the actual shell command integration
    // For now, we'll just verify the commands exist and have proper structure

    const {createStandardCommands} = await import('./commands')
    const {VirtualFileSystemImpl} = await import('./virtual-file-system')
    const {ShellEnvironment} = await import('./environment')

    const fileSystem = new VirtualFileSystemImpl(false)
    const environment = new ShellEnvironment(fileSystem)
    const commands = createStandardCommands(fileSystem, environment)

    // Verify job control commands are registered
    expect(commands.has('jobs')).toBe(true)
    expect(commands.has('fg')).toBe(true)
    expect(commands.has('bg')).toBe(true)
    expect(commands.has('disown')).toBe(true)

    // Verify command structure
    const jobsCommand = commands.get('jobs')
    expect(jobsCommand?.name).toBe('jobs')
    expect(jobsCommand?.description).toContain('background jobs')
    expect(typeof jobsCommand?.execute).toBe('function')
  })
})
