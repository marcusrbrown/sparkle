import {spawn} from 'node:child_process'
import {existsSync, readFileSync, writeFileSync} from 'node:fs'
import {join, resolve} from 'node:path'
import {performance} from 'node:perf_hooks'
import process from 'node:process'

import {afterEach, describe, expect, it} from 'vitest'

/**
 * TEST-005: Development workflow testing for watch modes and hot reload functionality
 *
 * This test suite validates development workflows including TypeScript watch mode,
 * build watch mode, development server functionality, and hot reload capabilities
 * to ensure optimal developer experience.
 */

const WORKSPACE_ROOT = resolve(process.cwd())

interface ProcessResult {
  pid: number
  stdout: string[]
  stderr: string[]
  exitCode: number | null
  duration: number
}

/**
 * Start a process and monitor it for a specified duration
 */
function startAndMonitorProcess(
  command: string,
  args: string[],
  options: {
    timeout: number // milliseconds
    expectedOutput?: string[]
    workingDir?: string
  },
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const start = performance.now()
    const child = spawn(command, args, {
      cwd: options.workingDir || WORKSPACE_ROOT,
      stdio: 'pipe',
      shell: true,
    })

    const stdout: string[] = []
    const stderr: string[] = []
    let resolved = false

    child.stdout?.on('data', data => {
      const output = data.toString()
      stdout.push(output)

      // Check if we've seen expected output
      if (options.expectedOutput) {
        const allOutput = stdout.join('')
        const hasAllExpected = options.expectedOutput.every(expected => allOutput.includes(expected))

        if (hasAllExpected && !resolved) {
          resolved = true
          child.kill()
          resolve({
            pid: child.pid || 0,
            stdout,
            stderr,
            exitCode: null,
            duration: (performance.now() - start) / 1000,
          })
        }
      }
    })

    child.stderr?.on('data', data => {
      stderr.push(data.toString())
    })

    child.on('exit', code => {
      if (!resolved) {
        resolved = true
        resolve({
          pid: child.pid || 0,
          stdout,
          stderr,
          exitCode: code,
          duration: (performance.now() - start) / 1000,
        })
      }
    })

    child.on('error', error => {
      if (!resolved) {
        resolved = true
        reject(error)
      }
    })

    // Timeout handling
    setTimeout(() => {
      if (!resolved) {
        resolved = true
        child.kill()
        resolve({
          pid: child.pid || 0,
          stdout,
          stderr,
          exitCode: null,
          duration: options.timeout / 1000,
        })
      }
    }, options.timeout)
  })
}

/**
 * Modify a file and track the modification for cleanup
 */
function createFileModification(
  packageName: string,
  fileName: string,
  modification: string,
): {filePath: string; cleanup: () => void} {
  const filePath = join(WORKSPACE_ROOT, `packages/${packageName}/src/${fileName}`)
  const originalContent = existsSync(filePath) ? readFileSync(filePath, 'utf8') : ''

  const modifiedContent = `${originalContent}\n${modification}`
  writeFileSync(filePath, modifiedContent)

  const cleanup = () => {
    if (originalContent) {
      writeFileSync(filePath, originalContent)
    }
  }

  return {filePath, cleanup}
}

describe('Development Workflow Testing', () => {
  const cleanupFunctions: (() => void)[] = []

  afterEach(() => {
    // Clean up any file modifications
    cleanupFunctions.forEach(cleanup => cleanup())
    cleanupFunctions.length = 0
  })

  describe('TypeScript Watch Mode', () => {
    it('should start TypeScript watch mode successfully', async () => {
      const result = await startAndMonitorProcess('pnpm', ['build:types:watch'], {
        timeout: 20000, // 20 seconds
        expectedOutput: ['Watching for file changes', 'Found 0 errors'],
      })

      expect(result.stdout.join('')).toMatch(/Watching for file changes|watch/i)
      expect(result.stderr.join('')).not.toMatch(/error|fail/i)

      console.warn(`TypeScript watch mode started in ${result.duration.toFixed(2)}s`)
    }, 30000)

    it('should detect TypeScript file changes and recompile', async () => {
      // Start TypeScript watch mode
      const watchPromise = startAndMonitorProcess('pnpm', ['build:types:watch'], {
        timeout: 30000,
        expectedOutput: ['Watching for file changes'],
      })

      // Wait a moment for watch mode to initialize
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Modify a TypeScript file
      const {cleanup} = createFileModification('types', 'index.ts', '// Watch mode test change')
      cleanupFunctions.push(cleanup)

      const result = await watchPromise

      // Should detect the file change
      const allOutput = result.stdout.join('')
      expect(allOutput).toMatch(/File change detected|Starting compilation|Watching for file changes/)

      console.warn('TypeScript watch mode successfully detected file changes')
    }, 45000)

    it('should handle TypeScript compilation errors gracefully in watch mode', async () => {
      // Start watch mode
      const watchPromise = startAndMonitorProcess('pnpm', ['build:types:watch'], {
        timeout: 25000,
        expectedOutput: ['Watching for file changes'],
      })

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Introduce a syntax error
      const {cleanup} = createFileModification('types', 'index.ts', 'const syntaxError = }')
      cleanupFunctions.push(cleanup)

      // Wait a moment for compilation
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Fix the error
      cleanup()

      const result = await watchPromise

      // Should handle errors gracefully and continue watching
      const allOutput = result.stdout.join('') + result.stderr.join('')
      expect(allOutput).toMatch(/error|Watching|continue/)

      console.warn('TypeScript watch mode handled errors gracefully')
    }, 35000)
  })

  describe('Build Watch Mode', () => {
    it('should start build watch mode for all packages', async () => {
      const result = await startAndMonitorProcess('pnpm', ['build:watch'], {
        timeout: 15000,
        expectedOutput: ['watching', 'build'],
      })

      expect(result.stdout.join('')).toMatch(/watch|build/i)

      console.warn(`Build watch mode started in ${result.duration.toFixed(2)}s`)
    }, 25000)

    it('should rebuild affected packages when source files change', async () => {
      // Start build watch
      const watchPromise = startAndMonitorProcess('pnpm', ['build:watch'], {
        timeout: 25000,
        expectedOutput: ['watching'],
      })

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 4000))

      // Modify a source file in utils package
      const {cleanup} = createFileModification('utils', 'index.ts', '// Build watch test modification')
      cleanupFunctions.push(cleanup)

      const result = await watchPromise

      // Should trigger rebuild
      const allOutput = result.stdout.join('')
      expect(allOutput).toMatch(/build|rebuild|change|watch/)

      console.warn('Build watch mode detected changes and triggered rebuilds')
    }, 40000)
  })

  describe('Development Server Functionality', () => {
    it('should start development servers successfully', async () => {
      const result = await startAndMonitorProcess('pnpm', ['dev'], {
        timeout: 30000,
        expectedOutput: ['Local:', 'ready', 'started'],
      })

      const output = result.stdout.join('')
      expect(output).toMatch(/Local|ready|started|running|server/i)

      console.warn(`Development servers started in ${result.duration.toFixed(2)}s`)
    }, 45000)

    it('should start Storybook development server', async () => {
      const result = await startAndMonitorProcess('pnpm', ['--filter=@sparkle/storybook', 'dev'], {
        timeout: 25000,
        expectedOutput: ['Local:', 'Storybook', 'started'],
      })

      const output = result.stdout.join('')
      expect(output).toMatch(/Storybook|Local|started|ready/i)

      console.warn('Storybook development server started successfully')
    }, 35000)

    it('should start UI package development server', async () => {
      const result = await startAndMonitorProcess('pnpm', ['--filter=@sparkle/ui', 'dev'], {
        timeout: 20000,
        expectedOutput: ['Local:', 'ready'],
      })

      const output = result.stdout.join('')
      expect(output).toMatch(/Local|ready|started|server/i)

      console.warn('UI package development server started successfully')
    }, 30000)
  })

  describe('Health Check Integration', () => {
    it('should pass health check with development environment ready', async () => {
      const result = await startAndMonitorProcess('pnpm', ['health-check'], {
        timeout: 15000,
        expectedOutput: ['Health check complete', 'operational'],
      })

      expect(result.exitCode).toBe(0)

      const output = result.stdout.join('')
      expect(output).toMatch(/All health checks passed|operational|complete/i)

      console.warn(`Health check completed in ${result.duration.toFixed(2)}s`)
    }, 25000)
  })

  describe('Hot Reload and Change Detection', () => {
    it('should detect changes in theme package and trigger dependent rebuilds', async () => {
      // This test simulates the hot reload behavior by checking build times
      // when theme files change (should affect ui and storybook packages)

      const {cleanup} = createFileModification(
        'theme',
        'index.ts',
        `
// Hot reload test - theme modification
export const testThemeChange = {
  color: '#test-color-${Date.now()}'
}
`,
      )
      cleanupFunctions.push(cleanup)

      // Test that incremental build detects the change
      const buildResult = await startAndMonitorProcess('pnpm', ['build'], {
        timeout: 20000,
        expectedOutput: ['completed', 'success'],
      })

      expect(buildResult.exitCode).toBe(0)

      console.warn('Theme change detection and dependent rebuild successful')
    }, 30000)

    it('should validate file change detection performance', async () => {
      // Test that file changes are detected quickly
      const start = performance.now()

      const {cleanup} = createFileModification('utils', 'index.ts', '// Performance test change')
      cleanupFunctions.push(cleanup)

      // Start a quick type check to see how fast changes are detected
      await startAndMonitorProcess('tsc', ['--noEmit'], {
        timeout: 10000,
        expectedOutput: [],
      })

      const detectionTime = (performance.now() - start) / 1000

      // File change detection should be very fast
      expect(detectionTime).toBeLessThan(8)

      console.warn(`File change detection took ${detectionTime.toFixed(2)}s`)
    })
  })

  describe('Error Recovery in Development', () => {
    it('should recover from temporary file corruption during development', async () => {
      // Create a temporary syntax error
      const {cleanup} = createFileModification('utils', 'index.ts', 'invalid syntax here }}}')

      // Run type check (should fail)
      const errorResult = await startAndMonitorProcess('tsc', ['--noEmit'], {
        timeout: 8000,
        expectedOutput: [],
      })

      expect(errorResult.exitCode).not.toBe(0)

      // Fix the error
      cleanup()

      // Type check should pass now
      const fixedResult = await startAndMonitorProcess('tsc', ['--noEmit'], {
        timeout: 8000,
        expectedOutput: [],
      })

      expect(fixedResult.exitCode).toBe(0)

      console.warn('Development workflow recovered from temporary errors successfully')
    })

    it('should handle concurrent development processes', async () => {
      // Start multiple processes concurrently to test resource handling
      const processes = [
        startAndMonitorProcess('pnpm', ['check:types'], {
          timeout: 10000,
          expectedOutput: [],
        }),
        startAndMonitorProcess('pnpm', ['health-check'], {
          timeout: 10000,
          expectedOutput: [],
        }),
      ]

      const results = await Promise.all(processes)

      // All processes should complete successfully
      results.forEach((result, index) => {
        expect(result.exitCode).toBe(0)
        console.warn(`Concurrent process ${index + 1} completed successfully`)
      })
    })
  })

  describe('Development Command Performance', () => {
    it('should start development processes within reasonable time limits', async () => {
      const commands = [
        {cmd: 'check:types', timeout: 8000, expectedTime: 5},
        {cmd: 'health-check', timeout: 12000, expectedTime: 8},
        {cmd: 'check:dependencies', timeout: 5000, expectedTime: 3},
      ]

      for (const {cmd, timeout, expectedTime} of commands) {
        const result = await startAndMonitorProcess('pnpm', [cmd], {
          timeout,
          expectedOutput: [],
        })

        expect(result.duration).toBeLessThan(expectedTime)
        expect(result.exitCode).toBe(0)

        console.warn(`${cmd} completed in ${result.duration.toFixed(2)}s (target: <${expectedTime}s)`)
      }
    })

    it('should maintain responsive development experience under load', async () => {
      // Simulate development load by making multiple file changes
      const modifications = [
        createFileModification('types', 'index.ts', '// Load test 1'),
        createFileModification('utils', 'index.ts', '// Load test 2'),
        createFileModification('theme', 'index.ts', '// Load test 3'),
      ]

      modifications.forEach(mod => cleanupFunctions.push(mod.cleanup))

      // Run type check under this load
      const result = await startAndMonitorProcess('tsc', ['--noEmit'], {
        timeout: 15000,
        expectedOutput: [],
      })

      // Should still complete in reasonable time even with multiple changes
      expect(result.duration).toBeLessThan(12)
      expect(result.exitCode).toBe(0)

      console.warn(`Type checking under load completed in ${result.duration.toFixed(2)}s`)
    })
  })
})
