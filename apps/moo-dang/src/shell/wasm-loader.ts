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
 * Creates shell import functions for WASM module execution with smart memory detection.
 *
 * These functions provide the interface between WASM modules and the shell environment,
 * allowing modules to perform I/O operations, access arguments, and interact with
 * the environment. The smart memory detection automatically chooses between imported
 * and exported memory based on where the actual data is located.
 */
function createShellImports(
  context: WasmExecutionContext,
  importedMemory: WebAssembly.Memory,
  getInstance?: () => WebAssembly.Instance,
): ShellImports {
  return {
    shell_write_stdout: (dataPtr: number, dataLen: number) => {
      // Try to find the correct memory (either imported or exported)
      let targetMemory = importedMemory

      // Check if we should use exported memory instead
      const instance = getInstance?.()
      if (instance?.exports?.memory instanceof WebAssembly.Memory) {
        const exportedMemory = instance.exports.memory as WebAssembly.Memory

        // Check if the data pointer is valid in exported memory
        if (dataPtr + dataLen <= exportedMemory.buffer.byteLength) {
          const exportedBytes = new Uint8Array(exportedMemory.buffer).slice(dataPtr, dataPtr + Math.min(dataLen, 10))
          const importedBytes = new Uint8Array(importedMemory.buffer).slice(dataPtr, dataPtr + Math.min(dataLen, 10))

          // If exported memory has non-zero data and imported has zeros, use exported
          const hasDataInExported = exportedBytes.some(b => b !== 0)
          const hasDataInImported = importedBytes.some(b => b !== 0)

          if (hasDataInExported && !hasDataInImported) {
            targetMemory = exportedMemory
          }
        }
      }

      // Read from the target memory
      const memoryArray = new Uint8Array(targetMemory.buffer)

      if (dataPtr < 0 || dataLen < 0 || dataPtr + dataLen > memoryArray.length) {
        consola.warn('WASM string read out of bounds', {dataPtr, dataLen, memorySize: memoryArray.length})
        return
      }

      const bytes = memoryArray.slice(dataPtr, dataPtr + dataLen)
      const data = new TextDecoder('utf-8', {fatal: false}).decode(bytes)

      context.stdout += data
    },

    shell_write_stderr: (dataPtr: number, dataLen: number) => {
      // Similar logic for stderr...
      let targetMemory = importedMemory
      const instance = getInstance?.()
      if (instance?.exports?.memory instanceof WebAssembly.Memory) {
        targetMemory = instance.exports.memory as WebAssembly.Memory
      }

      const memoryArray = new Uint8Array(targetMemory.buffer)
      if (dataPtr < 0 || dataLen < 0 || dataPtr + dataLen > memoryArray.length) {
        return
      }

      const bytes = memoryArray.slice(dataPtr, dataPtr + dataLen)
      const data = new TextDecoder('utf-8', {fatal: false}).decode(bytes)
      context.stderr += data
    },

    shell_read_stdin: (bufferPtr: number, bufferLen: number) => {
      let targetMemory = importedMemory
      const instance = getInstance?.()
      if (instance?.exports?.memory instanceof WebAssembly.Memory) {
        targetMemory = instance.exports.memory as WebAssembly.Memory
      }

      const memoryArray = new Uint8Array(targetMemory.buffer)
      if (bufferPtr < 0 || bufferLen <= 0 || bufferPtr + bufferLen > memoryArray.length) {
        return 0
      }

      const encoder = new TextEncoder()
      const encoded = encoder.encode(context.stdin)
      const writeLen = Math.min(encoded.length, bufferLen - 1)

      memoryArray.set(encoded.slice(0, writeLen), bufferPtr)
      if (writeLen < bufferLen) {
        memoryArray[bufferPtr + writeLen] = 0
      }

      return writeLen
    },

    shell_get_argc: () => {
      return context.args.length
    },

    shell_get_arg: (index: number, bufferPtr: number, bufferLen: number) => {
      if (index < 0 || index >= context.args.length) {
        return 0
      }

      let targetMemory = importedMemory
      const instance = getInstance?.()
      if (instance?.exports?.memory instanceof WebAssembly.Memory) {
        targetMemory = instance.exports.memory as WebAssembly.Memory
      }

      const memoryArray = new Uint8Array(targetMemory.buffer)
      if (bufferPtr < 0 || bufferLen <= 0 || bufferPtr + bufferLen > memoryArray.length) {
        return 0
      }

      const arg = context.args[index] || ''
      const encoder = new TextEncoder()
      const encoded = encoder.encode(arg)
      const writeLen = Math.min(encoded.length, bufferLen - 1)

      memoryArray.set(encoded.slice(0, writeLen), bufferPtr)
      if (writeLen < bufferLen) {
        memoryArray[bufferPtr + writeLen] = 0
      }

      return writeLen
    },

    shell_get_env: (keyPtr: number, keyLen: number, bufferPtr: number, bufferLen: number) => {
      let targetMemory = importedMemory
      const instance = getInstance?.()
      if (instance?.exports?.memory instanceof WebAssembly.Memory) {
        targetMemory = instance.exports.memory as WebAssembly.Memory
      }

      const memoryArray = new Uint8Array(targetMemory.buffer)

      // Read key
      if (keyPtr < 0 || keyLen < 0 || keyPtr + keyLen > memoryArray.length) {
        return 0
      }
      const keyBytes = memoryArray.slice(keyPtr, keyPtr + keyLen)
      const key = new TextDecoder('utf-8', {fatal: false}).decode(keyBytes)

      const value = context.env[key] || ''

      // Write value
      if (bufferPtr < 0 || bufferLen <= 0 || bufferPtr + bufferLen > memoryArray.length) {
        return 0
      }

      const encoder = new TextEncoder()
      const encoded = encoder.encode(value)
      const writeLen = Math.min(encoded.length, bufferLen - 1)

      memoryArray.set(encoded.slice(0, writeLen), bufferPtr)
      if (writeLen < bufferLen) {
        memoryArray[bufferPtr + writeLen] = 0
      }

      return writeLen
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

      // Try to instantiate the module first without providing memory
      // to see if it exports its own (common for Zig modules)
      let instance: WebAssembly.Instance

      // Always provide our own memory, but create shell imports that can handle both
      const actualMemory = createWasmMemory(fullConfig.maxMemorySize)

      // Create shell imports with a closure to access instance when available
      const shellImports = createShellImports(executionContext, actualMemory, () => instance)

      const imports = {
        env: {
          ...shellImports,
          memory: actualMemory,
        },
        ...fullConfig.customImports,
      }

      instance = await WebAssembly.instantiate(wasmModule, imports)
      consola.debug('WASM using smart shell imports with memory detection')

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

    // Update module execution context - use proper arguments if available
    module.context.args = executionContext.args ? [functionName, ...executionContext.args] : [functionName]
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
