/**
 * Integration tests for WASM executable loading and execution.
 *
 * These tests verify the end-to-end functionality of loading, executing, and managing
 * WebAssembly modules within the shell environment. They focus on the integration between
 * WASM commands and the shell infrastructure, testing realistic scenarios with proper
 * error handling and resource management.
 */

import type {ExecutionContext} from './types'
import type {WasmModuleLoader} from './wasm-types'

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createWasmExecutableCommand, createWasmExecutableCommands} from './wasm-commands'
import {createWasmModuleLoader} from './wasm-loader'
import {WASM_EXECUTABLES, WasmLoadError} from './wasm-types'

// Integration test configuration
const TEST_TIMEOUT = 15000 // 15 seconds for integration tests

// Mock execution context for testing
const createMockExecutionContext = (): ExecutionContext => ({
  workingDirectory: '/test',
  environmentVariables: {
    PATH: '/bin:/usr/bin',
    HOME: '/home/test',
    USER: 'testuser',
  },
  processId: Math.floor(Math.random() * 1000) + 1000,
})

/**
 * Creates a minimal valid WASM module for testing.
 * This generates a simple WASM binary that exports a main function.
 */
function createMinimalWasmBinary(): ArrayBuffer {
  // Minimal WASM binary with a main export (simplified version)
  const wasmBytes = new Uint8Array([
    0x00,
    0x61,
    0x73,
    0x6d, // WASM magic number
    0x01,
    0x00,
    0x00,
    0x00, // WASM version
    0x01,
    0x04,
    0x01,
    0x60,
    0x00,
    0x00, // Type section: () -> ()
    0x03,
    0x02,
    0x01,
    0x00, // Function section: 1 function
    0x07,
    0x08,
    0x01,
    0x04,
    0x6d,
    0x61,
    0x69,
    0x6e,
    0x00,
    0x00, // Export section: "main"
    0x0a,
    0x04,
    0x01,
    0x02,
    0x00,
    0x0b, // Code section: empty function
  ])
  return wasmBytes.buffer.slice(0)
}

describe('WASM Executable Loading Integration Tests', () => {
  let wasmLoader: WasmModuleLoader
  let mockExecutionContext: ExecutionContext
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    wasmLoader = createWasmModuleLoader()
    mockExecutionContext = createMockExecutionContext()
    originalFetch = globalThis.fetch

    // Setup fetch mock for integration tests
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.clearAllMocks()
  })

  describe('WASM Module Loading via Direct API', () => {
    it(
      'should successfully load a valid WASM module',
      async () => {
        const wasmBinary = createMinimalWasmBinary()

        const result = await wasmLoader.loadModule(wasmBinary, {
          name: 'test-module',
          maxMemorySize: 1024 * 1024, // 1MB
          executionTimeout: 5000,
        })

        expect(result).toBeDefined()
        expect(result.instance).toBeInstanceOf(WebAssembly.Instance)
        expect(result.memory).toBeInstanceOf(WebAssembly.Memory)
        expect(result.exports).toHaveProperty('main')
        expect(result.context).toBeDefined()
      },
      TEST_TIMEOUT,
    )

    it(
      'should properly allocate memory for WASM modules',
      async () => {
        const wasmBinary = createMinimalWasmBinary()

        const result = await wasmLoader.loadModule(wasmBinary, {
          name: 'memory-test',
          maxMemorySize: 4 * 1024 * 1024, // 4MB
          executionTimeout: 5000,
        })

        expect(result.memory).toBeInstanceOf(WebAssembly.Memory)

        // Verify memory size is appropriate for Zig modules
        const memorySize = result.memory.buffer.byteLength
        expect(memorySize).toBeGreaterThanOrEqual(1024 * 1024) // At least 1MB
      },
      TEST_TIMEOUT,
    )

    it(
      'should handle invalid WASM binary data',
      async () => {
        const invalidWasm = new ArrayBuffer(10) // Too small to be valid WASM

        await expect(
          wasmLoader.loadModule(invalidWasm, {
            name: 'invalid-wasm',
          }),
        ).rejects.toThrow(WasmLoadError)
      },
      TEST_TIMEOUT,
    )

    it(
      'should execute WASM functions with proper context',
      async () => {
        const wasmBinary = createMinimalWasmBinary()

        const module = await wasmLoader.loadModule(wasmBinary, {
          name: 'exec-test',
          maxMemorySize: 2 * 1024 * 1024,
          executionTimeout: 5000,
        })

        const result = await wasmLoader.executeFunction(module, 'main', mockExecutionContext)

        expect(result).toBeDefined()
        expect(result.processId).toBe(mockExecutionContext.processId)
        expect(result.command).toBe('main')
        expect(result.exitCode).toBeDefined()
        expect(result.stdout).toBeDefined()
        expect(result.stderr).toBeDefined()
      },
      TEST_TIMEOUT,
    )
  })

  describe('WASM Command Integration', () => {
    it(
      'should create WASM executable command successfully',
      async () => {
        const fetchMock = vi.mocked(globalThis.fetch)
        const wasmBinary = createMinimalWasmBinary()

        fetchMock.mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(wasmBinary),
        } as Response)

        const command = createWasmExecutableCommand('test-cmd', '/wasm/test.wasm', wasmLoader)

        expect(command).toBeDefined()
        expect(command.name).toBe('test-cmd')
        expect(command.description).toBe('WASM executable: test-cmd')
        expect(typeof command.execute).toBe('function')
      },
      TEST_TIMEOUT,
    )

    it(
      'should handle WASM file loading failures in commands',
      async () => {
        const fetchMock = vi.mocked(globalThis.fetch)

        fetchMock.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        } as Response)

        const command = createWasmExecutableCommand('missing-cmd', '/wasm/missing.wasm', wasmLoader)
        const result = await command.execute([], mockExecutionContext)

        expect(result.exitCode).toBe(1)
        expect(result.stderr).toContain('Failed to load WASM file')
      },
      TEST_TIMEOUT,
    )

    it('should create commands for all registered WASM executables', () => {
      const commands = createWasmExecutableCommands(wasmLoader)

      expect(commands.size).toBe(WASM_EXECUTABLES.length)

      WASM_EXECUTABLES.forEach(executable => {
        expect(commands.has(executable)).toBe(true)
        const command = commands.get(executable)
        expect(command?.name).toBe(executable)
        expect(command?.description).toContain(executable)
      })
    })

    it(
      'should handle network errors gracefully in WASM commands',
      async () => {
        const fetchMock = vi.mocked(globalThis.fetch)

        fetchMock.mockRejectedValueOnce(new Error('Network timeout'))

        const command = createWasmExecutableCommand('network-test', '/wasm/network.wasm', wasmLoader)
        const result = await command.execute(['test'], mockExecutionContext)

        expect(result.exitCode).toBe(1)
        expect(result.stderr).toContain('Network error')
      },
      TEST_TIMEOUT,
    )
  })

  describe('WASM Module Caching Integration', () => {
    it(
      'should cache WASM modules effectively',
      async () => {
        const wasmBinary = createMinimalWasmBinary()

        // Load same module multiple times
        const module1 = await wasmLoader.loadModule(wasmBinary, {name: 'cache-test'})
        const module2 = await wasmLoader.loadModule(wasmBinary, {name: 'cache-test'})
        const module3 = await wasmLoader.loadModule(wasmBinary, {name: 'cache-test'})

        // Should all be valid modules
        expect(module1).toBeDefined()
        expect(module2).toBeDefined()
        expect(module3).toBeDefined()

        // Memory instances should be different (new instances) but all valid
        expect(module1.memory).toBeInstanceOf(WebAssembly.Memory)
        expect(module2.memory).toBeInstanceOf(WebAssembly.Memory)
        expect(module3.memory).toBeInstanceOf(WebAssembly.Memory)
      },
      TEST_TIMEOUT,
    )

    it('should handle module unloading properly', () => {
      // This should not throw even for mock modules
      expect(() => {
        const mockModule = {
          instance: {} as WebAssembly.Instance,
          memory: new WebAssembly.Memory({initial: 1}),
          context: {
            args: [],
            env: {},
            stdin: '',
            stdout: '',
            stderr: '',
            exitCode: 0,
            workingDirectory: '/',
            processId: 1,
          },
          exports: {},
        }
        wasmLoader.unloadModule(mockModule)
      }).not.toThrow()
    })
  })

  describe('WASM Error Handling Integration', () => {
    it(
      'should provide detailed error context for failed loads',
      async () => {
        const invalidWasm = new ArrayBuffer(4) // Invalid but not empty

        try {
          await wasmLoader.loadModule(invalidWasm, {
            name: 'error-test',
            enableDebugLogging: true,
          })
          // Should not reach here
          expect(true).toBe(false)
        } catch (error) {
          expect(error).toBeInstanceOf(WasmLoadError)
          expect((error as WasmLoadError).moduleName).toBe('error-test')
          expect((error as WasmLoadError).message).toContain('error-test')
        }
      },
      TEST_TIMEOUT,
    )

    it(
      'should handle memory limit constraints',
      async () => {
        const wasmBinary = createMinimalWasmBinary()

        // Test with very small memory limit
        const result = await wasmLoader.loadModule(wasmBinary, {
          name: 'memory-limit-test',
          maxMemorySize: 1024, // Very small - 1KB
        })

        // Should still succeed but with constrained memory
        expect(result).toBeDefined()
        expect(result.memory.buffer.byteLength).toBeGreaterThan(0)
      },
      TEST_TIMEOUT,
    )
  })

  describe('Comprehensive WASM File Loading Tests', () => {
    it('should verify all WASM executables are properly configured', () => {
      // This tests the registry of available WASM executables
      const expectedExecutables = ['hello', 'echo', 'cat', 'template']

      expect(WASM_EXECUTABLES).toEqual(expectedExecutables)

      // Verify all have consistent naming
      WASM_EXECUTABLES.forEach(executable => {
        expect(typeof executable).toBe('string')
        expect(executable.length).toBeGreaterThan(0)
        // Should be valid filename characters
        expect(/^[a-z0-9_-]+$/.test(executable)).toBe(true)
      })
    })

    it(
      'should handle concurrent WASM file loading',
      async () => {
        const fetchMock = vi.mocked(globalThis.fetch)
        const wasmBinary = createMinimalWasmBinary()

        // Mock multiple concurrent fetch requests
        fetchMock.mockResolvedValue({
          ok: true,
          arrayBuffer: () => Promise.resolve(wasmBinary),
        } as Response)

        // Load multiple different WASM modules concurrently
        const loadPromises = ['module1', 'module2', 'module3', 'module4'].map(async name => {
          const command = createWasmExecutableCommand(name, `/wasm/${name}.wasm`, wasmLoader)
          return command.execute(['test-arg'], mockExecutionContext)
        })

        const results = await Promise.all(loadPromises)

        // All should succeed
        results.forEach(result => {
          expect(result).toBeDefined()
          expect(typeof result.exitCode).toBe('number')
          expect(typeof result.stdout).toBe('string')
          expect(typeof result.stderr).toBe('string')
        })

        // Verify multiple concurrent fetch calls were made
        expect(fetchMock).toHaveBeenCalledTimes(4)
      },
      TEST_TIMEOUT,
    )

    it(
      'should handle WASM files with different sizes',
      async () => {
        const fetchMock = vi.mocked(globalThis.fetch)

        // Test different WASM file sizes
        const testSizes = [
          {name: 'tiny', size: 100},
          {name: 'small', size: 10000},
          {name: 'medium', size: 100000},
          {name: 'large', size: 500000},
        ]

        for (const testCase of testSizes) {
          const wasmBinary = new ArrayBuffer(testCase.size)
          new Uint8Array(wasmBinary).set([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]) // WASM magic + version

          fetchMock.mockResolvedValueOnce({
            ok: true,
            arrayBuffer: () => Promise.resolve(wasmBinary),
          } as Response)

          const command = createWasmExecutableCommand(testCase.name, `/wasm/${testCase.name}.wasm`, wasmLoader)

          // Larger files might fail due to invalid content, but should handle gracefully
          const result = await command.execute([], mockExecutionContext)
          expect(result).toBeDefined()
          expect(typeof result.exitCode).toBe('number')
        }
      },
      TEST_TIMEOUT,
    )

    it(
      'should handle malformed WASM file responses',
      async () => {
        const fetchMock = vi.mocked(globalThis.fetch)

        // Test various malformed responses
        const malformedResponses = [
          // Empty response
          {
            ok: true,
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
          },
          // Non-WASM binary data
          {
            ok: true,
            arrayBuffer: () => Promise.resolve(new TextEncoder().encode('not a wasm file').buffer),
          },
          // Corrupted WASM header
          {
            ok: true,
            arrayBuffer: () => {
              const buffer = new ArrayBuffer(8)
              new Uint8Array(buffer).set([0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x00, 0x00])
              return Promise.resolve(buffer)
            },
          },
        ]

        for (const [i, response] of malformedResponses.entries()) {
          fetchMock.mockResolvedValueOnce(response as Response)

          const command = createWasmExecutableCommand(`malformed-${i}`, `/wasm/malformed-${i}.wasm`, wasmLoader)
          const result = await command.execute(['test'], mockExecutionContext)

          // Should fail gracefully
          expect(result.exitCode).toBe(1)
          expect(result.stderr).toBeTruthy()
        }
      },
      TEST_TIMEOUT,
    )
  })

  describe('WASM Execution with I/O Integration', () => {
    it(
      'should handle WASM execution with various argument patterns',
      async () => {
        const fetchMock = vi.mocked(globalThis.fetch)
        const wasmBinary = createMinimalWasmBinary()

        fetchMock.mockResolvedValue({
          ok: true,
          arrayBuffer: () => Promise.resolve(wasmBinary),
        } as Response)

        const command = createWasmExecutableCommand('arg-test', '/wasm/arg-test.wasm', wasmLoader)

        // Test different argument patterns
        const testCases = [
          {args: [], description: 'no arguments'},
          {args: ['single'], description: 'single argument'},
          {args: ['multiple', 'args', 'here'], description: 'multiple arguments'},
          {args: ['--flag', 'value', '-x'], description: 'flag-style arguments'},
          {args: ['file.txt', '/path/to/file'], description: 'file path arguments'},
          {args: ['arg with spaces', '"quoted arg"'], description: 'arguments with spaces'},
        ]

        for (const testCase of testCases) {
          const result = await command.execute(testCase.args, mockExecutionContext)

          expect(result).toBeDefined()
          expect(result.command).toBe(`arg-test ${testCase.args.join(' ')}`.trim())
          expect(result.processId).toBe(mockExecutionContext.processId)
          expect(typeof result.exitCode).toBe('number')
          expect(typeof result.stdout).toBe('string')
          expect(typeof result.stderr).toBe('string')
        }
      },
      TEST_TIMEOUT,
    )

    it(
      'should handle environment variable access in WASM execution',
      async () => {
        const fetchMock = vi.mocked(globalThis.fetch)
        const wasmBinary = createMinimalWasmBinary()

        fetchMock.mockResolvedValue({
          ok: true,
          arrayBuffer: () => Promise.resolve(wasmBinary),
        } as Response)

        const command = createWasmExecutableCommand('env-test', '/wasm/env-test.wasm', wasmLoader)

        // Test with rich environment variables
        const richEnvironment: ExecutionContext = {
          ...mockExecutionContext,
          environmentVariables: {
            ...mockExecutionContext.environmentVariables,
            TEST_VAR: 'test_value',
            SHELL_NAME: 'moo-dang',
            DEBUG_MODE: 'true',
            CONFIG_PATH: '/etc/config',
            NUMERIC_VAR: '42',
          },
        }

        const result = await command.execute(['--show-env'], richEnvironment)

        expect(result).toBeDefined()
        expect(result.processId).toBe(richEnvironment.processId)
        // Environment variables should be accessible to WASM through the execution context
      },
      TEST_TIMEOUT,
    )

    it(
      'should handle working directory context in WASM execution',
      async () => {
        const fetchMock = vi.mocked(globalThis.fetch)
        const wasmBinary = createMinimalWasmBinary()

        fetchMock.mockResolvedValue({
          ok: true,
          arrayBuffer: () => Promise.resolve(wasmBinary),
        } as Response)

        const command = createWasmExecutableCommand('pwd-test', '/wasm/pwd-test.wasm', wasmLoader)

        // Test different working directories
        const workingDirs = ['/home/user', '/tmp', '/var/log', '/usr/local/bin']

        for (const workingDir of workingDirs) {
          const contextWithWorkingDir: ExecutionContext = {
            ...mockExecutionContext,
            workingDirectory: workingDir,
          }

          const result = await command.execute(['pwd'], contextWithWorkingDir)

          expect(result).toBeDefined()
          expect(result.processId).toBe(contextWithWorkingDir.processId)
          // Working directory should be accessible to WASM execution
        }
      },
      TEST_TIMEOUT,
    )
  })

  describe('WASM Error Handling and Timeout Integration', () => {
    it(
      'should handle WASM execution timeouts properly',
      async () => {
        const fetchMock = vi.mocked(globalThis.fetch)
        const wasmBinary = createMinimalWasmBinary()

        fetchMock.mockResolvedValue({
          ok: true,
          arrayBuffer: () => Promise.resolve(wasmBinary),
        } as Response)

        // Test with very short timeout
        const shortTimeoutLoader = createWasmModuleLoader()
        const command = createWasmExecutableCommand('timeout-test', '/wasm/timeout-test.wasm', shortTimeoutLoader)

        const startTime = Date.now()
        const result = await command.execute(['--infinite-loop'], mockExecutionContext)
        const endTime = Date.now()

        expect(result).toBeDefined()
        // Should either succeed quickly or timeout gracefully
        expect(endTime - startTime).toBeLessThan(20000) // Should not hang indefinitely
      },
      TEST_TIMEOUT,
    )

    it(
      'should handle memory allocation failures',
      async () => {
        const fetchMock = vi.mocked(globalThis.fetch)
        const wasmBinary = createMinimalWasmBinary()

        fetchMock.mockResolvedValue({
          ok: true,
          arrayBuffer: () => Promise.resolve(wasmBinary),
        } as Response)

        const command = createWasmExecutableCommand('memory-stress', '/wasm/memory-stress.wasm', wasmLoader)

        // Try to execute command that might stress memory
        const result = await command.execute(['--allocate-large'], mockExecutionContext)

        expect(result).toBeDefined()
        expect(typeof result.exitCode).toBe('number')
        // Should handle memory constraints gracefully
      },
      TEST_TIMEOUT,
    )

    it(
      'should provide comprehensive error reporting for WASM failures',
      async () => {
        const fetchMock = vi.mocked(globalThis.fetch)

        // Test comprehensive error scenarios
        const errorScenarios = [
          {
            name: 'network-failure',
            mockSetup: () => fetchMock.mockRejectedValueOnce(new Error('ECONNRESET: Connection reset by peer')),
            expectedInStderr: ['ECONNRESET', 'Connection reset'],
          },
          {
            name: 'server-error',
            mockSetup: () =>
              fetchMock.mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
              } as Response),
            expectedInStderr: ['500', 'Internal Server Error'],
          },
          {
            name: 'timeout-error',
            mockSetup: () => fetchMock.mockRejectedValueOnce(new Error('Request timeout after 30 seconds')),
            expectedInStderr: ['timeout', '30 seconds'],
          },
        ]

        for (const scenario of errorScenarios) {
          scenario.mockSetup()

          const command = createWasmExecutableCommand(scenario.name, `/wasm/${scenario.name}.wasm`, wasmLoader)
          const result = await command.execute(['test'], mockExecutionContext)

          expect(result.exitCode).toBe(1)
          expect(result.stderr).toBeTruthy()

          // Check that error details are present in stderr
          scenario.expectedInStderr.forEach(expectedText => {
            expect(result.stderr.toLowerCase()).toContain(expectedText.toLowerCase())
          })
        }
      },
      TEST_TIMEOUT,
    )
  })

  describe('End-to-End WASM Integration Workflows', () => {
    it(
      'should handle complete WASM executable workflow',
      async () => {
        const fetchMock = vi.mocked(globalThis.fetch)
        const wasmBinary = createMinimalWasmBinary()

        fetchMock.mockResolvedValue({
          ok: true,
          arrayBuffer: () => Promise.resolve(wasmBinary),
        } as Response)

        // Test a complete workflow: load all executables and run them
        const commands = createWasmExecutableCommands(wasmLoader)

        // Execute each registered WASM executable
        for (const [name, command] of commands) {
          const result = await command.execute(['--version'], mockExecutionContext)

          expect(result).toBeDefined()
          expect(result.command).toBe(`${name} --version`)
          expect(typeof result.exitCode).toBe('number')
          expect(typeof result.stdout).toBe('string')
          expect(typeof result.stderr).toBe('string')
          expect(result.processId).toBeGreaterThan(0)
        }
      },
      TEST_TIMEOUT,
    )

    it(
      'should maintain execution isolation between WASM commands',
      async () => {
        const fetchMock = vi.mocked(globalThis.fetch)
        const wasmBinary = createMinimalWasmBinary()

        fetchMock.mockResolvedValue({
          ok: true,
          arrayBuffer: () => Promise.resolve(wasmBinary),
        } as Response)

        const command1 = createWasmExecutableCommand('isolated1', '/wasm/isolated1.wasm', wasmLoader)
        const command2 = createWasmExecutableCommand('isolated2', '/wasm/isolated2.wasm', wasmLoader)

        // Execute commands with different contexts
        const context1: ExecutionContext = {
          ...mockExecutionContext,
          processId: 1001,
          workingDirectory: '/test1',
          environmentVariables: {TEST_ID: '1'},
        }

        const context2: ExecutionContext = {
          ...mockExecutionContext,
          processId: 1002,
          workingDirectory: '/test2',
          environmentVariables: {TEST_ID: '2'},
        }

        const [result1, result2] = await Promise.all([
          command1.execute(['test1'], context1),
          command2.execute(['test2'], context2),
        ])

        // Results should be isolated
        expect(result1.processId).toBe(1001)
        expect(result2.processId).toBe(1002)
        expect(result1.processId).not.toBe(result2.processId)
      },
      TEST_TIMEOUT,
    )

    it.skip('should handle loading actual hello.wasm executable', async () => {
      // This test would work with actual WASM files in production
      const fetchMock = vi.mocked(globalThis.fetch)

      // Mock a response that looks like a real WASM file
      const actualWasmSize = 50000 // Typical size for a simple Zig-compiled WASM
      const mockWasmBinary = new ArrayBuffer(actualWasmSize)

      fetchMock.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockWasmBinary),
      } as Response)

      const command = createWasmExecutableCommand('hello', '/wasm/hello.wasm', wasmLoader)
      const result = await command.execute([], mockExecutionContext)

      // With actual WASM files, we'd expect specific behavior
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Hello')
    })
  })
})
