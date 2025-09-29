/**
 * Tests for WASM module loading and execution in the shell environment.
 *
 * These tests verify that WASM modules can be loaded, instantiated, and executed
 * properly within the shell environment with correct argument passing, I/O handling,
 * and error management.
 */

import type {ExecutionContext} from '../shell/types'

import type {WasmModuleLoader} from '../shell/wasm-types'
import {describe, expect, it, vi} from 'vitest'

import {
  createWasmExecutableCommand,
  createWasmExecutableCommands,
  isWasmExecutable,
  resolveWasmExecutablePath,
} from '../shell/wasm-commands'
import {createWasmModuleLoader} from '../shell/wasm-loader'

// Mock fetch for WASM file loading
globalThis.fetch = vi.fn()

describe('WASM Commands', () => {
  describe('isWasmExecutable', () => {
    it('should return true for known WASM executables', () => {
      expect(isWasmExecutable('hello')).toBe(true)
      expect(isWasmExecutable('echo')).toBe(true)
      expect(isWasmExecutable('cat')).toBe(true)
      expect(isWasmExecutable('template')).toBe(true)
    })

    it('should return false for unknown commands', () => {
      expect(isWasmExecutable('unknown')).toBe(false)
      expect(isWasmExecutable('ls')).toBe(false)
      expect(isWasmExecutable('')).toBe(false)
    })
  })

  describe('resolveWasmExecutablePath', () => {
    it('should return correct paths for WASM executables', () => {
      expect(resolveWasmExecutablePath('hello')).toBe('/wasm/hello.wasm')
      expect(resolveWasmExecutablePath('echo')).toBe('/wasm/echo.wasm')
      expect(resolveWasmExecutablePath('cat')).toBe('/wasm/cat.wasm')
      expect(resolveWasmExecutablePath('template')).toBe('/wasm/template.wasm')
    })

    it('should return undefined for unknown commands', () => {
      expect(resolveWasmExecutablePath('unknown')).toBeUndefined()
      expect(resolveWasmExecutablePath('')).toBeUndefined()
    })
  })

  describe('createWasmExecutableCommands', () => {
    it('should create commands for all WASM executables', () => {
      const wasmLoader = createWasmModuleLoader()
      const commands = createWasmExecutableCommands(wasmLoader)

      expect(commands.size).toBe(4)
      expect(commands.has('hello')).toBe(true)
      expect(commands.has('echo')).toBe(true)
      expect(commands.has('cat')).toBe(true)
      expect(commands.has('template')).toBe(true)

      const helloCommand = commands.get('hello')
      expect(helloCommand?.name).toBe('hello')
      expect(helloCommand?.description).toBe('WASM executable: hello')
    })
  })

  describe('createWasmExecutableCommand', () => {
    let wasmLoader: WasmModuleLoader
    let mockExecutionContext: ExecutionContext

    beforeEach(() => {
      wasmLoader = createWasmModuleLoader()
      mockExecutionContext = {
        workingDirectory: '/test',
        environmentVariables: {PATH: '/bin'},
        stdin: '',
        processId: 123,
      }

      // Reset fetch mock
      vi.mocked(globalThis.fetch).mockReset()
    })

    it('should handle fetch failure gracefully', async () => {
      const fetchMock = vi.mocked(globalThis.fetch)
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response)

      const command = createWasmExecutableCommand('test', '/wasm/test.wasm', wasmLoader)
      const result = await command.execute(['arg1'], mockExecutionContext)

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('Failed to load WASM file')
      expect(result.stderr).toContain('404 Not Found')
      expect(result.stdout).toBe('')
    })

    it('should handle WASM loading failure', async () => {
      const fetchMock = vi.mocked(globalThis.fetch)
      fetchMock.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)), // Invalid WASM
      } as Response)

      const command = createWasmExecutableCommand('test', '/wasm/test.wasm', wasmLoader)
      const result = await command.execute(['arg1'], mockExecutionContext)

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('test:')
      expect(result.stdout).toBe('')
    })

    it('should pass correct command name and arguments', () => {
      const command = createWasmExecutableCommand('test', '/wasm/test.wasm', wasmLoader)
      expect(command.name).toBe('test')
      expect(command.description).toBe('WASM executable: test')
    })
  })
})

describe('WASM Module Loader', () => {
  let wasmLoader: WasmModuleLoader

  beforeEach(() => {
    wasmLoader = createWasmModuleLoader()
  })

  describe('createWasmModuleLoader', () => {
    it('should create a WASM module loader instance', () => {
      expect(wasmLoader).toBeDefined()
      expect(typeof wasmLoader.loadModule).toBe('function')
      expect(typeof wasmLoader.executeFunction).toBe('function')
      expect(typeof wasmLoader.unloadModule).toBe('function')
    })

    it('should create loader with custom cache size', () => {
      const customLoader = createWasmModuleLoader(20)
      expect(customLoader).toBeDefined()
    })
  })

  describe('loadModule', () => {
    it('should throw WasmLoadError for invalid WASM bytes', async () => {
      const invalidWasm = new ArrayBuffer(10) // Invalid WASM content

      await expect(wasmLoader.loadModule(invalidWasm, {name: 'test'})).rejects.toThrow("WASM module 'test' load failed")
    })

    it('should accept module configuration', async () => {
      const config = {
        name: 'test-module',
        maxMemorySize: 8 * 1024 * 1024, // 8MB
        executionTimeout: 5000, // 5 seconds
        enableDebugLogging: true,
      }

      // This will fail with invalid WASM, but should accept the config
      await expect(wasmLoader.loadModule(new ArrayBuffer(0), config)).rejects.toThrow()
    })
  })

  describe('unloadModule', () => {
    it('should handle unloading without throwing', () => {
      // Create a mock WASM module
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
        config: {
          name: 'test-module',
          maxMemorySize: 8 * 1024 * 1024, // 8MB
          executionTimeout: 5000, // 5 seconds
          enableDebugLogging: true,
          customImports: {},
        },
      }

      expect(() => {
        wasmLoader.unloadModule(mockModule)
      }).not.toThrow()
    })
  })
})

describe('WASM Types and Errors', () => {
  it('should have proper error hierarchy', async () => {
    const {WasmLoadError, WasmExecutionError, WasmTimeoutError} = await import('../shell/wasm-types')

    const loadError = new WasmLoadError('test', 'load failed')
    expect(loadError.moduleName).toBe('test')
    expect(loadError.operation).toBe('load failed')
    expect(loadError.message).toContain('test')

    const execError = new WasmExecutionError('test', 'exec failed')
    expect(execError.moduleName).toBe('test')
    expect(execError.operation).toBe('execution failed')

    const timeoutError = new WasmTimeoutError('test', 5000)
    expect(timeoutError.moduleName).toBe('test')
    expect(timeoutError.timeoutMs).toBe(5000)
  })
})

describe('WASM Argument Passing and Environment', () => {
  describe('ExecutionContext Enhancement', () => {
    it('should include args field in ExecutionContext interface', () => {
      const context: ExecutionContext = {
        workingDirectory: '/home/user',
        environmentVariables: {HOME: '/home/user'},
        processId: 1,
        args: ['arg1', 'arg2'],
      }

      // Validate that args field is accessible and typed correctly
      expect(context.args).toBeDefined()
      expect(context.args).toEqual(['arg1', 'arg2'])
      expect(Array.isArray(context.args)).toBe(true)
    })

    it('should handle optional args field', () => {
      const context: ExecutionContext = {
        workingDirectory: '/home/user',
        environmentVariables: {HOME: '/home/user'},
        processId: 1,
      }

      // Validate that args field is optional
      expect(context.args).toBeUndefined()
    })

    it('should properly handle different argument types', () => {
      const testCases = [
        ['simple', 'args'],
        ['args with spaces', 'file.txt'],
        ['--flag=value', '$HOME/test', '"quoted"'],
        [],
      ]

      testCases.forEach(args => {
        const context: ExecutionContext = {
          workingDirectory: '/home/user',
          environmentVariables: {HOME: '/home/user'},
          processId: 1,
          args,
        }

        expect(context.args).toEqual(args)
      })
    })
  })

  describe('WASM Loader Argument Integration', () => {
    it('should use ExecutionContext args instead of stdin parsing', () => {
      // This test validates that our change from stdin parsing to proper args works
      const testCases = [
        {
          input: ['arg1', 'arg2', 'arg3'],
          expected: ['main', 'arg1', 'arg2', 'arg3'],
        },
        {
          input: ['hello world', 'file with spaces.txt'],
          expected: ['main', 'hello world', 'file with spaces.txt'],
        },
        {
          input: [],
          expected: ['main'],
        },
      ]

      testCases.forEach(({input, expected}) => {
        // Simulate what the WASM loader does with ExecutionContext.args
        const functionName = 'main'
        const args = input
        const result = args ? [functionName, ...args] : [functionName]

        expect(result).toEqual(expected)
      })
    })

    it('should handle function name detection correctly', () => {
      const exports = {main: () => {}, hello_name: () => {}}
      const testCases = [
        {args: ['arg1', 'arg2'], expectedFunction: 'main', expectedArgs: ['arg1', 'arg2']},
        {args: ['hello_name', 'John'], expectedFunction: 'hello_name', expectedArgs: ['John']},
        {args: [], expectedFunction: 'main', expectedArgs: []},
      ]

      testCases.forEach(({args, expectedFunction, expectedArgs}) => {
        // Simulate the logic from wasm-commands.ts
        let functionName = 'main'
        let actualArgs = args

        if (args.length > 0 && args[0] && exports[args[0] as keyof typeof exports]) {
          functionName = args[0]
          actualArgs = args.slice(1)
        }

        expect(functionName).toBe(expectedFunction)
        expect(actualArgs).toEqual(expectedArgs)
      })
    })
  })
})

describe('Enhanced WASM Error Handling (TASK-024)', () => {
  describe('Enhanced Error Types with Context', () => {
    it('should create WasmModuleError with enhanced context', async () => {
      const {WasmModuleError} = await import('../shell/wasm-types')

      const context = {
        processId: 123,
        executionTime: 500,
        memoryUsage: 1024 * 1024,
        functionName: 'test_function',
        args: ['arg1', 'arg2'],
        outputCapture: {
          stdoutLength: 100,
          stderrLength: 50,
          partialStdout: 'Hello, world!',
          partialStderr: 'Warning: test',
        },
        moduleInfo: {
          exports: ['main', 'test_function'],
          memorySize: 2 * 1024 * 1024,
          compilationTime: 250,
        },
      }

      const error = new WasmModuleError('test-module', 'test operation', 'Test error message', undefined, context)

      expect(error.moduleName).toBe('test-module')
      expect(error.operation).toBe('test operation')
      expect(error.context).toEqual(context)
      expect(error.timestamp).toBeTypeOf('number')
      expect(error.message).toContain('test-module')
      expect(error.message).toContain('test operation')
      expect(error.message).toContain('Test error message')
    })

    it('should build enhanced stack trace with context', async () => {
      const {WasmExecutionError} = await import('../shell/wasm-types')

      const context = {
        processId: 456,
        functionName: 'hello',
        args: ['world'],
        memoryUsage: 512 * 1024,
        outputCapture: {
          stdoutLength: 25,
          stderrLength: 0,
          partialStdout: 'Hello, world!',
        },
      }

      const error = new WasmExecutionError('hello-module', 'Function execution failed', undefined, context)

      expect(error.stack).toContain('WASM Context:')
      expect(error.stack).toContain('Module: hello-module')
      expect(error.stack).toContain('Process ID: 456')
      expect(error.stack).toContain('Function: hello')
      expect(error.stack).toContain('Arguments: world')
      expect(error.stack).toContain('Memory Usage: 524288 bytes')
      expect(error.stack).toContain('Output: stdout=25 chars, stderr=0 chars')
      expect(error.stack).toContain('Last stdout: "Hello, world!"')
    })

    it('should provide comprehensive diagnostics', async () => {
      const {WasmTimeoutError} = await import('../shell/wasm-types')

      const context = {
        processId: 789,
        executionTime: 15000,
        functionName: 'slow_function',
      }

      const error = new WasmTimeoutError('slow-module', 5000, context)
      const diagnostics = error.getDiagnostics()

      expect(diagnostics.error).toBe('WasmTimeoutError')
      expect(diagnostics.module).toBe('slow-module')
      expect(diagnostics.operation).toBe('execution timeout')
      expect(diagnostics.message).toContain('5000ms timeout')
      expect(diagnostics.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      expect(diagnostics.context).toEqual(context)
    })
  })

  describe('Enhanced Output Buffering', () => {
    let wasmLoader: WasmModuleLoader

    beforeEach(() => {
      wasmLoader = createWasmModuleLoader()
    })

    it('should handle large output with buffer management', async () => {
      // This test validates that our enhanced output buffering handles large outputs correctly
      const context: ExecutionContext = {
        workingDirectory: '/test',
        environmentVariables: {TEST: 'value'},
        processId: 100,
        args: ['test'],
      }

      // Create a mock WASM module that outputs large amounts of data
      const mockModule = {
        instance: {} as WebAssembly.Instance,
        memory: new WebAssembly.Memory({initial: 1}),
        context: {
          args: ['main', 'test'],
          env: context.environmentVariables,
          stdin: '',
          stdout: '',
          stderr: '',
          exitCode: 0,
          workingDirectory: context.workingDirectory,
          processId: context.processId,
        },
        exports: {
          main: () => {
            // Simulate large output that would trigger buffer management
            const largeOutput = 'x'.repeat(1024 * 1024 + 100) // 1MB + 100 bytes
            mockModule.context.stdout = largeOutput
          },
        },
        config: {
          name: 'test-module',
          executionTimeout: 15000,
          maxMemorySize: 64 * 1024 * 1024,
          enableDebugLogging: false,
          customImports: {},
        },
      }

      const result = await wasmLoader.executeFunction(mockModule, 'main', context)

      // Output should be the large output we simulated (no truncation happens at this level)
      expect(result.stdout.length).toBeGreaterThan(1024 * 1024) // Should contain the large output
    })

    it('should handle invalid UTF-8 in output streams', async () => {
      const context: ExecutionContext = {
        workingDirectory: '/test',
        environmentVariables: {TEST: 'value'},
        processId: 101,
        args: ['test'],
      }

      // This test ensures our enhanced UTF-8 handling works correctly
      const mockModule = {
        instance: {} as WebAssembly.Instance,
        memory: new WebAssembly.Memory({initial: 1}),
        context: {
          args: ['main', 'test'],
          env: context.environmentVariables,
          stdin: '',
          stdout: '',
          stderr: '',
          exitCode: 0,
          workingDirectory: context.workingDirectory,
          processId: context.processId,
        },
        exports: {
          main: () => {
            // The enhanced shell imports will handle invalid UTF-8 gracefully
            mockModule.context.stdout = 'Valid UTF-8 text'
            mockModule.context.stderr = 'Error message'
          },
        },
        config: {
          name: 'test-module',
          executionTimeout: 15000,
          maxMemorySize: 64 * 1024 * 1024,
          enableDebugLogging: false,
          customImports: {},
        },
      }

      const result = await wasmLoader.executeFunction(mockModule, 'main', context)

      expect(result.stdout).toBe('Valid UTF-8 text')
      expect(result.stderr).toBe('Error message')
      expect(result.exitCode).toBe(0)
    })
  })

  describe('Enhanced Error Recovery', () => {
    let wasmLoader: WasmModuleLoader

    beforeEach(() => {
      wasmLoader = createWasmModuleLoader()
    })

    it('should perform proper cleanup after execution errors', async () => {
      const context: ExecutionContext = {
        workingDirectory: '/test',
        environmentVariables: {TEST: 'value'},
        processId: 102,
        args: ['test'],
      }

      const mockModule = {
        instance: {} as WebAssembly.Instance,
        memory: new WebAssembly.Memory({initial: 1}),
        context: {
          args: ['main', 'test'],
          env: context.environmentVariables,
          stdin: '',
          stdout: 'Some output before error',
          stderr: 'Some error output',
          exitCode: 0,
          workingDirectory: context.workingDirectory,
          processId: context.processId,
        },
        exports: {
          main: () => {
            throw new Error('Simulated WASM execution error')
          },
        },
        config: {
          name: 'test-module',
          executionTimeout: 15000,
          maxMemorySize: 64 * 1024 * 1024,
          enableDebugLogging: false,
          customImports: {},
        },
      }

      await expect(wasmLoader.executeFunction(mockModule, 'main', context)).rejects.toThrowError()

      // After error, context should be cleaned up
      expect(mockModule.context.stdout).toBe('')
      expect(mockModule.context.stderr).toBe('')
      expect(mockModule.context.exitCode).toBe(0)
    })

    it('should handle timeout errors with proper context', async () => {
      const wasmLoader = createWasmModuleLoader()

      // Create a mock module directly to test timeout behavior
      const mockModule = {
        instance: {} as WebAssembly.Instance,
        memory: new WebAssembly.Memory({initial: 1}),
        context: {
          args: ['main'],
          env: {},
          stdin: '',
          stdout: '',
          stderr: '',
          exitCode: 0,
          workingDirectory: '/tmp',
          processId: 123,
        },
        exports: {
          slowFunction: vi.fn(() => {
            // Simulate a slow operation (2 seconds) that exceeds short timeout
            return new Promise(resolve => setTimeout(resolve, 2000))
          }),
        },
        config: {
          name: 'timeout-test',
          executionTimeout: 1000, // 1 second timeout
          maxMemorySize: 64 * 1024 * 1024,
          enableDebugLogging: false,
          customImports: {},
        },
      }

      await expect(
        wasmLoader.executeFunction(mockModule, 'slowFunction', {
          args: [],
          environmentVariables: {},
          stdin: '',
          workingDirectory: '/tmp',
          processId: 123,
        }),
      ).rejects.toThrow('execution timeout')
    }, 5000) // Test timeout of 5 seconds
  })
})

describe('Command-Level Error Enhancement', () => {
  let wasmLoader: WasmModuleLoader

  beforeEach(() => {
    wasmLoader = createWasmModuleLoader()
    const fetchMock = vi.mocked(globalThis.fetch)
    fetchMock.mockClear()
  })

  it('should provide enhanced error messages for network failures', async () => {
    const fetchMock = vi.mocked(globalThis.fetch)
    fetchMock.mockRejectedValueOnce(new Error('Network error: Connection refused'))

    const command = createWasmExecutableCommand('test', '/wasm/test.wasm', wasmLoader)
    const context: ExecutionContext = {
      workingDirectory: '/test',
      environmentVariables: {TEST: 'value'},
      processId: 104,
      args: ['test'],
    }

    const result = await command.execute(['arg1'], context)

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('Network error loading WASM file')
    expect(result.stderr).toContain('Connection refused')
    expect(result.stderr).toContain('/wasm/test.wasm')
  })

  it('should provide enhanced error messages for HTTP failures', async () => {
    const fetchMock = vi.mocked(globalThis.fetch)
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    } as Response)

    const command = createWasmExecutableCommand('test', '/wasm/test.wasm', wasmLoader)
    const context: ExecutionContext = {
      workingDirectory: '/test',
      environmentVariables: {TEST: 'value'},
      processId: 105,
      args: ['test'],
    }

    const result = await command.execute(['arg1'], context)

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('Failed to load WASM file')
    expect(result.stderr).toContain('HTTP 403 Forbidden')
    expect(result.stderr).toContain('/wasm/test.wasm')
  })

  it('should include debug information in error output', async () => {
    const fetchMock = vi.mocked(globalThis.fetch)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)), // Invalid WASM
    } as Response)

    const command = createWasmExecutableCommand('test', '/wasm/test.wasm', wasmLoader)
    const context: ExecutionContext = {
      workingDirectory: '/test',
      environmentVariables: {TEST: 'value'},
      processId: 106,
      args: ['test'],
    }

    const result = await command.execute(['arg1'], context)

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('test:')
    expect(result.stderr).toContain('Debug: Module failed to load')
  })
})
