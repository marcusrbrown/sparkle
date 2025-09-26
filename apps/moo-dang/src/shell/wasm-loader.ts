/**
 * WASM module loader implementation for the moo-dang shell.
 *
 * This module provides the core functionality for loading, instantiating, and executing
 * WebAssembly modules within the shell environment. It handles module caching, memory
 * management, and secure execution with proper timeout handling.
 */

import type {ExecutionContext} from './types'
import type {
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
 * Memory configuration constants for WebAssembly modules.
 *
 * WebAssembly memory is allocated in 64KB pages. Zig-compiled modules typically
 * require more memory than C modules due to runtime overhead and garbage collection.
 */
const WASM_MEMORY_CONFIG = {
  /** WebAssembly memory page size in bytes */
  PAGE_SIZE: 64 * 1024,
  /** Minimum initial pages for Zig modules (16MB) */
  MIN_INITIAL_PAGES: 256,
  /** Maximum pages allowed (32MB) for browser compatibility */
  MAX_PAGES: 512,
} as const

/**
 * Default configuration values for WASM module execution.
 *
 * These defaults are optimized for Zig-compiled WebAssembly modules which
 * require more memory and longer execution times than typical C modules.
 */
const DEFAULT_CONFIG: Required<Omit<WasmModuleConfig, 'name'>> = {
  maxMemorySize: WASM_MEMORY_CONFIG.MAX_PAGES * WASM_MEMORY_CONFIG.PAGE_SIZE, // 32MB
  executionTimeout: 15000, // 15 seconds - generous for complex operations
  enableDebugLogging: false,
  customImports: {},
} as const

/**
 * Creates a simple LRU cache implementation for WASM modules.
 *
 * Uses Map data structure to maintain insertion order for efficient LRU tracking.
 * When cache reaches capacity, removes least recently used entries automatically.
 */
function createWasmModuleCache(maxSize = 10): WasmModuleCache {
  const cache = new Map<string, WasmModule>()

  return {
    get(key: string): WasmModule | undefined {
      const module = cache.get(key)
      if (module) {
        // Move to end (most recently used)
        cache.delete(key)
        cache.set(key, module)
      }
      return module
    },

    set(key: string, module: WasmModule): void {
      if (cache.has(key)) {
        cache.delete(key)
      } else if (cache.size >= maxSize) {
        // Remove least recently used (first entry)
        const firstKey = cache.keys().next().value
        if (firstKey) {
          cache.delete(firstKey)
        }
      }
      cache.set(key, module)
    },

    delete(key: string): void {
      cache.delete(key)
    },

    clear(): void {
      cache.clear()
    },

    size(): number {
      return cache.size
    },
  }
}

/**
 * Creates WebAssembly memory with appropriate sizing for module requirements.
 *
 * Memory sizing is critical for Zig modules which need substantial initial allocation
 * for their runtime. We start with a generous initial size and allow growth up to
 * browser-safe limits.
 */
function createWasmMemory(maxMemorySize: number): WebAssembly.Memory {
  const maxPages = Math.ceil(maxMemorySize / WASM_MEMORY_CONFIG.PAGE_SIZE)

  return new WebAssembly.Memory({
    initial: Math.max(WASM_MEMORY_CONFIG.MIN_INITIAL_PAGES, maxPages),
    maximum: Math.max(maxPages, WASM_MEMORY_CONFIG.MAX_PAGES),
  })
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      consola.error('Failed to read string from WASM memory', {error: errorMessage, ptr, len})
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      consola.error('Failed to write string to WASM memory', {error: errorMessage, ptr, maxLen})
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
 *
 * Manages WebAssembly module lifecycle including compilation, instantiation,
 * execution, and cleanup. Provides memory management, timeout protection,
 * and proper error handling for Zig-compiled modules.
 */
export class WasmModuleLoaderImpl implements WasmModuleLoader {
  private readonly cache: WasmModuleCache

  constructor(cacheSize = 10) {
    this.cache = createWasmModuleCache(cacheSize)
  }

  async loadModule(bytes: ArrayBuffer, config: WasmModuleConfig): Promise<WasmModule> {
    const fullConfig = {...DEFAULT_CONFIG, ...config}
    const cacheKey = `${config.name}-${bytes.byteLength}`

    // Check cache first to avoid recompilation
    const cachedModule = this.cache.get(cacheKey)
    if (cachedModule) {
      if (fullConfig.enableDebugLogging) {
        consola.debug(`Using cached WASM module: ${config.name}`)
      }
      return cachedModule
    }

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

      // Create memory with appropriate sizing for the module
      const memory = createWasmMemory(fullConfig.maxMemorySize)

      // Create shell imports
      const shellImports = createShellImports(executionContext, memory)

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

      // Cache the compiled module for future use
      this.cache.set(cacheKey, module)

      return module
    } catch (error: unknown) {
      const cause = error instanceof Error ? error : undefined
      const message = error instanceof Error ? error.message : String(error)

      throw new WasmLoadError(config.name, `Failed to compile or instantiate module: ${message}`, cause)
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

      // Execute with timeout protection to prevent hanging
      const timeoutMs = DEFAULT_CONFIG.executionTimeout
      await Promise.race([
        new Promise<void>(resolve => {
          try {
            exportedFunction()
            resolve()
          } catch (error: unknown) {
            const cause = error instanceof Error ? error : undefined
            const message = error instanceof Error ? error.message : String(error)

            throw new WasmExecutionError('unknown', `Function execution failed: ${message}`, cause)
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
    } catch (error: unknown) {
      if (error instanceof WasmTimeoutError || error instanceof WasmExecutionError) {
        throw error
      }

      const cause = error instanceof Error ? error : undefined
      const message = error instanceof Error ? error.message : String(error)

      throw new WasmExecutionError('unknown', `Unexpected error during execution: ${message}`, cause)
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
}

/**
 * Create a new WASM module loader with the specified cache size.
 */
export function createWasmModuleLoader(cacheSize = 10): WasmModuleLoader {
  return new WasmModuleLoaderImpl(cacheSize)
}
