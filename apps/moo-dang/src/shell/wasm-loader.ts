/**
 * WASM module loader implementation for the moo-dang shell.
 *
 * This module provides the core functionality for loading, instantiating, and executing
 * WebAssembly modules within the shell environment. It handles module caching, memory
 * management, and secure execution with proper timeout handling.
 */

import type {ExecutionContext} from './types'
import type {
  CreateShellImports,
  ShellImports,
  WasmExecutionContext,
  WasmExecutionResult,
  WasmExports,
  WasmModule,
  WasmModuleCache,
  WasmModuleConfig,
  WasmModuleLoader,
} from './wasm-types'
import {consola} from 'consola'

import {WasmExecutionError, WasmLoadError, WasmTimeoutError} from './wasm-types'

/**
 * Default configuration values for WASM module execution.
 */
const DEFAULT_CONFIG: Required<Omit<WasmModuleConfig, 'name'>> = {
  maxMemorySize: 32 * 1024 * 1024, // 32MB - more suitable for Zig WASM modules
  executionTimeout: 15000, // 15 seconds
  enableDebugLogging: false,
  customImports: {},
}

/**
 * Simple LRU cache implementation for WASM modules.
 */
class WasmModuleCacheImpl implements WasmModuleCache {
  private readonly cache = new Map<string, WasmModule>()
  private readonly maxSize: number

  constructor(maxSize = 10) {
    this.maxSize = maxSize
  }

  get(key: string): WasmModule | undefined {
    const module = this.cache.get(key)
    if (module) {
      // Move to end (most recently used)
      this.cache.delete(key)
      this.cache.set(key, module)
    }
    return module
  }

  set(key: string, module: WasmModule): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first entry)
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }
    this.cache.set(key, module)
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

/**
 * Creates shell import functions for WASM module execution.
 *
 * These functions provide the interface between WASM modules and the shell environment,
 * allowing modules to perform I/O operations, access arguments, and interact with
 * the environment.
 */
function createShellImports(context: WasmExecutionContext, memory: WebAssembly.Memory): ShellImports {
  /**
   * Safely read a string from WASM memory with bounds checking.
   */
  function readStringFromMemory(ptr: number, len: number): string {
    try {
      // Get current memory buffer (it might have grown)
      const memoryArray = new Uint8Array(memory.buffer)
      if (ptr < 0 || len < 0) {
        consola.warn('WASM string read invalid parameters', {ptr, len, memorySize: memoryArray.length})
        return ''
      }

      if (ptr + len > memoryArray.length) {
        consola.warn('WASM string read out of bounds', {ptr, len, memorySize: memoryArray.length})
        // Try to read what we can instead of returning empty string
        const availableLen = Math.max(0, memoryArray.length - ptr)
        if (availableLen > 0) {
          const bytes = memoryArray.slice(ptr, ptr + availableLen)
          return new TextDecoder('utf-8', {fatal: false}).decode(bytes)
        }
        return ''
      }

      const bytes = memoryArray.slice(ptr, ptr + len)
      return new TextDecoder('utf-8', {fatal: false}).decode(bytes)
    } catch (error) {
      consola.error('Failed to read string from WASM memory', error)
      return ''
    }
  }

  /**
   * Safely write a string to WASM memory with bounds checking.
   */
  function writeStringToMemory(ptr: number, maxLen: number, data: string): number {
    try {
      // Get current memory buffer (it might have grown)
      const memoryArray = new Uint8Array(memory.buffer)
      if (ptr < 0 || maxLen <= 0) {
        consola.warn('WASM string write invalid parameters', {ptr, maxLen, memorySize: memoryArray.length})
        return 0
      }

      if (ptr + maxLen > memoryArray.length) {
        consola.warn('WASM string write out of bounds', {ptr, maxLen, memorySize: memoryArray.length})
        return 0
      }

      const encoder = new TextEncoder()
      const encoded = encoder.encode(data)
      const writeLen = Math.min(encoded.length, maxLen - 1) // Reserve space for null terminator

      memoryArray.set(encoded.slice(0, writeLen), ptr)
      if (writeLen < maxLen) {
        memoryArray[ptr + writeLen] = 0 // Null terminate
      }

      return writeLen
    } catch (error) {
      consola.error('Failed to write string to WASM memory', error)
      return 0
    }
  }

  return {
    shell_write_stdout: (dataPtr: number, dataLen: number) => {
      const data = readStringFromMemory(dataPtr, dataLen)
      context.stdout += data
    },

    shell_write_stderr: (dataPtr: number, dataLen: number) => {
      const data = readStringFromMemory(dataPtr, dataLen)
      context.stderr += data
    },

    shell_read_stdin: (bufferPtr: number, bufferLen: number) => {
      return writeStringToMemory(bufferPtr, bufferLen, context.stdin)
    },

    shell_get_argc: () => {
      return context.args.length
    },

    shell_get_arg: (index: number, bufferPtr: number, bufferLen: number) => {
      if (index < 0 || index >= context.args.length) {
        return 0
      }
      const arg = context.args[index] || ''
      return writeStringToMemory(bufferPtr, bufferLen, arg)
    },

    shell_get_env: (keyPtr: number, keyLen: number, bufferPtr: number, bufferLen: number) => {
      const key = readStringFromMemory(keyPtr, keyLen)
      const value = context.env[key] || ''
      return writeStringToMemory(bufferPtr, bufferLen, value)
    },

    shell_set_exit_code: (code: number) => {
      context.exitCode = code
    },
  }
}

/**
 * WASM module loader implementation with caching and security features.
 */
export class WasmModuleLoaderImpl implements WasmModuleLoader {
  private readonly cache: WasmModuleCache
  private readonly createShellImportsFn: CreateShellImports

  constructor(cacheSize = 10) {
    this.cache = new WasmModuleCacheImpl(cacheSize)
    this.createShellImportsFn = createShellImports
  }

  async loadModule(bytes: ArrayBuffer, config: WasmModuleConfig): Promise<WasmModule> {
    const fullConfig = {...DEFAULT_CONFIG, ...config}

    if (fullConfig.enableDebugLogging) {
      consola.debug(`Loading WASM module: ${config.name}`, {
        size: bytes.byteLength,
        maxMemory: fullConfig.maxMemorySize,
        timeout: fullConfig.executionTimeout,
      })
    }

    try {
      // Create execution context (will be populated during execution)
      const executionContext: WasmExecutionContext = {
        args: [],
        env: {},
        stdin: '',
        stdout: '',
        stderr: '',
        exitCode: 0,
        workingDirectory: '/',
        processId: 0,
      }

      // Compile the module first to check its memory requirements
      const wasmModule = await WebAssembly.compile(bytes)

      // Create memory with initial size and maximum limit
      const initialPages = Math.ceil(fullConfig.maxMemorySize / 65536) // WebAssembly page size is 64KB
      const memory = new WebAssembly.Memory({
        initial: Math.max(initialPages, 256), // Start with at least 256 pages (16MB) for Zig modules
        maximum: Math.max(initialPages, 512), // Allow up to 512 pages (32MB) maximum
      })

      // Create shell imports
      const shellImports = this.createShellImportsFn(executionContext, memory)

      // Combine custom imports with shell imports
      const imports = {
        env: {
          ...shellImports,
          memory,
        },
        ...fullConfig.customImports,
      }

      // Instantiate the module with our imports
      const instance = await WebAssembly.instantiate(wasmModule, imports)

      // Extract exports
      const moduleExports: WasmExports = {
        main: instance.exports.main as (() => void) | undefined,
        memory: instance.exports.memory as WebAssembly.Memory | undefined,
      }

      // Add all other exports
      for (const [name, value] of Object.entries(instance.exports)) {
        if (name !== 'main' && name !== 'memory') {
          moduleExports[name] = value
        }
      }

      // Use the memory we provided in imports, which is now shared with the module
      const actualMemory = memory

      const module: WasmModule = {
        instance,
        memory: actualMemory,
        context: executionContext,
        exports: moduleExports,
      }

      if (fullConfig.enableDebugLogging) {
        consola.debug(`Successfully loaded WASM module: ${config.name}`, {
          exports: Object.keys(instance.exports),
          memorySize: module.memory.buffer.byteLength,
        })
      }

      return module
    } catch (error) {
      throw new WasmLoadError(
        config.name,
        `Failed to compile or instantiate module: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
      )
    }
  }

  async executeFunction(
    module: WasmModule,
    functionName = 'main',
    executionContext: ExecutionContext,
  ): Promise<WasmExecutionResult> {
    const startTime = Date.now()

    // Update module execution context
    module.context.args = [functionName, ...(executionContext.stdin?.split(' ') || [])]
    module.context.env = {...executionContext.environmentVariables}
    module.context.stdin = executionContext.stdin || ''
    module.context.stdout = ''
    module.context.stderr = ''
    module.context.exitCode = 0
    module.context.workingDirectory = executionContext.workingDirectory
    module.context.processId = executionContext.processId

    try {
      const exportedFunction = module.exports[functionName]

      if (!exportedFunction || typeof exportedFunction !== 'function') {
        throw new WasmExecutionError(
          'unknown',
          `Function '${functionName}' not found or not callable. Available exports: ${Object.keys(module.exports).join(', ')}`,
        )
      }

      // Execute with timeout
      const timeoutMs = 15000 // 15 second default timeout
      await Promise.race([
        new Promise<void>(resolve => {
          try {
            exportedFunction()
            resolve()
          } catch (error) {
            throw new WasmExecutionError(
              'unknown',
              `Function execution failed: ${error instanceof Error ? error.message : String(error)}`,
              error instanceof Error ? error : undefined,
            )
          }
        }),
        new Promise<never>((_resolve, reject) => {
          setTimeout(() => {
            reject(new WasmTimeoutError('unknown', timeoutMs))
          }, timeoutMs)
        }),
      ])

      const executionTime = Date.now() - startTime

      return {
        processId: executionContext.processId,
        command: functionName,
        stdout: module.context.stdout,
        stderr: module.context.stderr,
        exitCode: module.context.exitCode,
        executionTime,
        moduleName: 'unknown',
        functionName,
        peakMemoryUsage: module.memory.buffer.byteLength,
      }
    } catch (error) {
      if (error instanceof WasmTimeoutError || error instanceof WasmExecutionError) {
        throw error
      }

      throw new WasmExecutionError(
        'unknown',
        `Unexpected error during execution: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
      )
    }
  }

  unloadModule(module: WasmModule): void {
    // Clear the execution context
    module.context.stdout = ''
    module.context.stderr = ''
    module.context.exitCode = 0

    // Note: WebAssembly doesn't provide explicit cleanup APIs,
    // but we can clear references to help with garbage collection
    consola.debug('Unloaded WASM module', {
      memorySize: module.memory.buffer.byteLength,
      exports: Object.keys(module.exports),
    })
  }

  /**
   * Get the module cache for external management.
   */
  getCache(): WasmModuleCache {
    return this.cache
  }
}

/**
 * Create a new WASM module loader with the specified cache size.
 */
export function createWasmModuleLoader(cacheSize = 10): WasmModuleLoader {
  return new WasmModuleLoaderImpl(cacheSize)
}
