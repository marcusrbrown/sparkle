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
      expect(result.stderr).toContain('Failed to load WASM file: 404 Not Found')
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
