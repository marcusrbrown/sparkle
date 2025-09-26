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
  WasmErrorContext,
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
 * WebAssembly memory allocation requires careful sizing for different compilation targets.
 * Zig-compiled modules need substantial initial allocation due to runtime overhead and
 * garbage collection requirements, unlike minimal C modules that can start smaller.
 */
const WASM_MEMORY_CONFIG = {
  /** WebAssembly memory page size in bytes (64KB standard) */
  PAGE_SIZE: 64 * 1024,
  /** Minimum initial pages for Zig modules (16MB prevents frequent reallocations) */
  MIN_INITIAL_PAGES: 256,
  /** Maximum pages allowed (32MB ensures browser compatibility) */
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
        cache.delete(key)
        cache.set(key, module)
      }
      return module
    },

    set(key: string, module: WasmModule): void {
      if (cache.has(key)) {
        cache.delete(key)
      } else if (cache.size >= maxSize) {
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
 * Determines the correct memory buffer to use for WASM operations.
 *
 * Zig-compiled WASM modules often export their own memory while the host provides
 * imported memory. This function intelligently selects the appropriate memory by
 * checking where actual data is located, preventing null byte reads that occur
 * when the wrong memory buffer is used.
 *
 * @param importedMemory - Memory buffer provided by the host
 * @param getInstance - Function to get the WASM instance when available
 * @param dataPtr - Pointer to data location for validation
 * @param dataLen - Length of data for validation
 * @returns The appropriate memory buffer (imported or exported)
 */
function selectTargetMemory(
  importedMemory: WebAssembly.Memory,
  getInstance: (() => WebAssembly.Instance) | undefined,
  dataPtr: number,
  dataLen: number,
): WebAssembly.Memory {
  const instance = getInstance?.()
  if (!instance?.exports?.memory || !(instance.exports.memory instanceof WebAssembly.Memory)) {
    return importedMemory
  }

  const exportedMemory = instance.exports.memory as WebAssembly.Memory

  // Validate data pointer bounds in exported memory
  if (dataPtr + dataLen > exportedMemory.buffer.byteLength) {
    return importedMemory
  }

  // Sample a small portion of both memory buffers to detect where actual data exists
  const sampleSize = Math.min(dataLen, 10)
  const exportedBytes = new Uint8Array(exportedMemory.buffer).slice(dataPtr, dataPtr + sampleSize)
  const importedBytes = new Uint8Array(importedMemory.buffer).slice(dataPtr, dataPtr + sampleSize)

  // If exported memory contains non-zero data and imported doesn't, use exported
  const hasDataInExported = exportedBytes.some(byte => byte !== 0)
  const hasDataInImported = importedBytes.some(byte => byte !== 0)

  return hasDataInExported && !hasDataInImported ? exportedMemory : importedMemory
}

/**
 * Validates memory access bounds to prevent buffer overflows.
 *
 * WebAssembly memory operations must be bounds-checked to prevent security issues
 * and provide meaningful error messages for debugging WASM module issues.
 *
 * @param ptr - Memory pointer to validate
 * @param len - Length of data to access
 * @param memorySize - Total size of available memory
 * @returns True if access is within bounds, false otherwise
 */
function validateMemoryBounds(ptr: number, len: number, memorySize: number): boolean {
  return ptr >= 0 && len >= 0 && ptr + len <= memorySize
}

/**
 * Buffer size limits to prevent browser memory issues with large WASM output.
 */
const OUTPUT_BUFFER_CONFIG = {
  MAX_BUFFER_SIZE: 1024 * 1024,
  TRUNCATE_TO_SIZE: 512 * 1024,
} as const

/**
 * Creates error context for WASM execution failures with comprehensive diagnostic data.
 */
function createWasmErrorContext(
  functionName: string,
  moduleName: string,
  processId: number,
  startTime: number,
  wasmContext: WasmExecutionContext,
  memorySize: number,
): WasmErrorContext {
  return {
    functionName,
    moduleName,
    processId,
    executionTime: Date.now() - startTime,
    memoryUsage: memorySize,
    outputCapture: {
      stdoutLength: wasmContext.stdout.length,
      stderrLength: wasmContext.stderr.length,
      partialStdout: wasmContext.stdout.slice(-100),
      partialStderr: wasmContext.stderr.slice(-100),
    },
  }
}

/**
 * Prevents buffer overflow by truncating output that exceeds browser memory limits.
 */
function appendToOutputBuffer(buffer: string, newText: string, bufferName: string): string {
  // Handle empty or invalid input
  if (!newText) return buffer

  const combinedLength = buffer.length + newText.length

  // If combined length exceeds maximum, truncate the existing buffer
  if (combinedLength > OUTPUT_BUFFER_CONFIG.MAX_BUFFER_SIZE) {
    const truncatedBuffer =
      buffer.length > OUTPUT_BUFFER_CONFIG.TRUNCATE_TO_SIZE
        ? buffer.slice(-OUTPUT_BUFFER_CONFIG.TRUNCATE_TO_SIZE)
        : buffer

    consola.debug(`Output buffer truncated: ${bufferName}`, {
      originalSize: buffer.length,
      newTextSize: newText.length,
      truncatedSize: truncatedBuffer.length,
      finalSize: truncatedBuffer.length + newText.length,
    })

    return truncatedBuffer + newText
  }

  return buffer + newText
}

/**
 * Creates shell import functions for WASM module execution with enhanced output capture.
 *
 * These functions provide the interface between WASM modules and the shell environment,
 * allowing modules to perform I/O operations, access arguments, and interact with
 * the environment. Enhanced with better memory management, output buffering, and
 * error handling for production use.
 */
function createShellImports(
  context: WasmExecutionContext,
  importedMemory: WebAssembly.Memory,
  getInstance?: () => WebAssembly.Instance,
): ShellImports {
  return {
    shell_write_stdout: (dataPtr: number, dataLen: number) => {
      try {
        if (dataLen === 0) return

        const targetMemory = selectTargetMemory(importedMemory, getInstance, dataPtr, dataLen)
        const memoryArray = new Uint8Array(targetMemory.buffer)

        if (!validateMemoryBounds(dataPtr, dataLen, memoryArray.length)) {
          consola.warn('WASM stdout write out of bounds', {dataPtr, dataLen, memorySize: memoryArray.length})
          context.stderr = appendToOutputBuffer(
            context.stderr,
            `[WASM Error] stdout write failed: invalid memory bounds (ptr=${dataPtr}, len=${dataLen})\n`,
            'stderr',
          )
          return
        }

        const bytes = memoryArray.slice(dataPtr, dataPtr + dataLen)

        // UTF-8 decode with fallback for invalid sequences from Zig modules
        let data: string
        try {
          data = new TextDecoder('utf-8', {fatal: true}).decode(bytes)
        } catch {
          data = new TextDecoder('utf-8', {fatal: false}).decode(bytes)
          consola.debug('WASM stdout contained invalid UTF-8, used fallback decoding')
        }

        context.stdout = appendToOutputBuffer(context.stdout, data, 'stdout')
      } catch (error: unknown) {
        const errorMsg = `[WASM Error] stdout write failed: ${error instanceof Error ? error.message : String(error)}\n`
        context.stderr = appendToOutputBuffer(context.stderr, errorMsg, 'stderr')
        consola.error('WASM stdout write failed', {error, dataPtr, dataLen})
      }
    },

    shell_write_stderr: (dataPtr: number, dataLen: number) => {
      try {
        // Handle zero-length writes gracefully
        if (dataLen === 0) return

        const targetMemory = selectTargetMemory(importedMemory, getInstance, dataPtr, dataLen)
        const memoryArray = new Uint8Array(targetMemory.buffer)

        if (!validateMemoryBounds(dataPtr, dataLen, memoryArray.length)) {
          consola.warn('WASM stderr write out of bounds', {dataPtr, dataLen, memorySize: memoryArray.length})
          context.stderr = appendToOutputBuffer(
            context.stderr,
            `[WASM Error] stderr write failed: invalid memory bounds (ptr=${dataPtr}, len=${dataLen})\n`,
            'stderr',
          )
          return
        }

        const bytes = memoryArray.slice(dataPtr, dataPtr + dataLen)

        // Enhanced UTF-8 decoding with error handling
        let data: string
        try {
          data = new TextDecoder('utf-8', {fatal: true}).decode(bytes)
        } catch {
          // Fallback to non-fatal decoding for invalid UTF-8
          data = new TextDecoder('utf-8', {fatal: false}).decode(bytes)
          consola.debug('WASM stderr contained invalid UTF-8, used fallback decoding')
        }

        context.stderr = appendToOutputBuffer(context.stderr, data, 'stderr')
      } catch (error: unknown) {
        const errorMsg = `[WASM Error] stderr write failed: ${error instanceof Error ? error.message : String(error)}\n`
        context.stderr = appendToOutputBuffer(context.stderr, errorMsg, 'stderr')
        consola.error('WASM stderr write failed', {error, dataPtr, dataLen})
      }
    },

    shell_read_stdin: (bufferPtr: number, bufferLen: number) => {
      if (bufferLen <= 0) {
        return 0
      }

      const targetMemory = selectTargetMemory(importedMemory, getInstance, bufferPtr, bufferLen)
      const memoryArray = new Uint8Array(targetMemory.buffer)

      if (!validateMemoryBounds(bufferPtr, bufferLen, memoryArray.length)) {
        consola.warn('WASM stdin read out of bounds', {bufferPtr, bufferLen, memorySize: memoryArray.length})
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
      if (index < 0 || index >= context.args.length || bufferLen <= 0) {
        return 0
      }

      const targetMemory = selectTargetMemory(importedMemory, getInstance, bufferPtr, bufferLen)
      const memoryArray = new Uint8Array(targetMemory.buffer)

      if (!validateMemoryBounds(bufferPtr, bufferLen, memoryArray.length)) {
        consola.warn('WASM get_arg out of bounds', {index, bufferPtr, bufferLen, memorySize: memoryArray.length})
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
      if (bufferLen <= 0) {
        return 0
      }

      const targetMemory = selectTargetMemory(importedMemory, getInstance, keyPtr, keyLen)
      const memoryArray = new Uint8Array(targetMemory.buffer)

      // Read environment variable key
      if (!validateMemoryBounds(keyPtr, keyLen, memoryArray.length)) {
        consola.warn('WASM get_env key read out of bounds', {keyPtr, keyLen, memorySize: memoryArray.length})
        return 0
      }

      const keyBytes = memoryArray.slice(keyPtr, keyPtr + keyLen)
      const key = new TextDecoder('utf-8', {fatal: false}).decode(keyBytes)
      const value = context.env[key] || ''

      // Write environment variable value
      if (!validateMemoryBounds(bufferPtr, bufferLen, memoryArray.length)) {
        consola.warn('WASM get_env value write out of bounds', {bufferPtr, bufferLen, memorySize: memoryArray.length})
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
 * Creates a WASM module loader implementation with caching and security features.
 *
 * This function-based approach provides better composability and follows Sparkle
 * coding guidelines by avoiding ES6 classes. The returned object implements the
 * WasmModuleLoader interface while maintaining encapsulated state through closures.
 *
 * @param cacheSize - Maximum number of modules to cache (default: 10)
 * @returns WasmModuleLoader implementation with the specified cache size
 */
function createWasmModuleLoaderImpl(cacheSize = 10): WasmModuleLoader {
  const cache = createWasmModuleCache(cacheSize)

  return {
    async loadModule(bytes: ArrayBuffer, config: WasmModuleConfig): Promise<WasmModule> {
      const fullConfig = {...DEFAULT_CONFIG, ...config}
      const cacheKey = `${config.name}-${bytes.byteLength}`

      // Check cache first to avoid recompilation
      const cachedModule = cache.get(cacheKey)
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
        cache.set(cacheKey, module)

        return module
      } catch (error: unknown) {
        const cause = error instanceof Error ? error : undefined
        const message = error instanceof Error ? error.message : String(error)

        throw new WasmLoadError(config.name, `Failed to compile or instantiate module: ${message}`, cause)
      }
    },

    async executeFunction(
      module: WasmModule,
      functionName = 'main',
      executionContext: ExecutionContext,
    ): Promise<WasmExecutionResult> {
      const startTime = Date.now()
      const moduleName = 'WASM'

      // Reset execution context for clean state
      module.context.args = executionContext.args ? [functionName, ...executionContext.args] : [functionName]
      module.context.env = {...executionContext.environmentVariables}
      module.context.stdin = executionContext.stdin || ''
      module.context.stdout = ''
      module.context.stderr = ''
      module.context.exitCode = 0
      module.context.workingDirectory = executionContext.workingDirectory
      module.context.processId = executionContext.processId

      // Debug logging for function execution start
      consola.debug(`Executing WASM function: ${moduleName}.${functionName}`, {
        processId: executionContext.processId,
        args: module.context.args,
        workingDirectory: executionContext.workingDirectory,
        stdinLength: (executionContext.stdin || '').length,
      })

      let executionError: Error | undefined
      const initialMemoryUsage = module.memory.buffer.byteLength

      try {
        const exportedFunction = module.exports[functionName]

        if (!exportedFunction || typeof exportedFunction !== 'function') {
          const availableExports = Object.keys(module.exports).filter(key => typeof module.exports[key] === 'function')
          throw new WasmExecutionError(
            moduleName,
            `Function '${functionName}' not found or not callable. Available functions: ${availableExports.length > 0 ? availableExports.join(', ') : 'none'}`,
          )
        }

        // Execute with timeout protection and better error capture
        const timeoutMs = DEFAULT_CONFIG.executionTimeout
        await Promise.race([
          new Promise<void>((resolve, reject) => {
            try {
              const result = exportedFunction()

              // Check if function returned a promise (async function)
              if (result instanceof Promise) {
                result.then(() => resolve()).catch(reject)
              } else {
                resolve()
              }
            } catch (error: unknown) {
              const errorContext = createWasmErrorContext(
                functionName,
                moduleName,
                executionContext.processId,
                startTime,
                module.context,
                module.memory.buffer.byteLength,
              )

              const cause = error instanceof Error ? error : undefined
              const message = error instanceof Error ? error.message : String(error)

              const execError = new WasmExecutionError(
                moduleName,
                `Function '${functionName}' execution failed: ${message}`,
                cause,
                errorContext,
              )

              reject(execError)
            }
          }),
          new Promise<never>((_resolve, reject) => {
            setTimeout(() => {
              reject(new WasmTimeoutError(moduleName, timeoutMs))
            }, timeoutMs)
          }),
        ])

        const executionTime = Date.now() - startTime
        const peakMemoryUsage = Math.max(initialMemoryUsage, module.memory.buffer.byteLength)

        // Debug logging for successful completion
        consola.debug(`WASM function completed successfully: ${moduleName}.${functionName}`, {
          executionTime,
          exitCode: module.context.exitCode,
          stdoutLength: module.context.stdout.length,
          stderrLength: module.context.stderr.length,
          memoryUsage: peakMemoryUsage,
        })

        return {
          processId: executionContext.processId,
          command: functionName,
          stdout: module.context.stdout,
          stderr: module.context.stderr,
          exitCode: module.context.exitCode,
          executionTime,
          moduleName,
          functionName,
          peakMemoryUsage,
        }
      } catch (error: unknown) {
        executionError = error instanceof Error ? error : new Error(String(error))

        // Enhanced error logging with context
        consola.error(`WASM function execution failed: ${moduleName}.${functionName}`, {
          error: executionError.message,
          processId: executionContext.processId,
          executionTime: Date.now() - startTime,
          memoryUsage: module.memory.buffer.byteLength,
          outputCapture: {
            stdoutLength: module.context.stdout.length,
            stderrLength: module.context.stderr.length,
            partialOutput: {
              stdout: module.context.stdout.slice(-50),
              stderr: module.context.stderr.slice(-50),
            },
          },
        })

        // Re-throw specialized WASM errors as-is
        if (error instanceof WasmTimeoutError || error instanceof WasmExecutionError) {
          throw error
        }

        const cause = error instanceof Error ? error : undefined
        const message = error instanceof Error ? error.message : String(error)

        throw new WasmExecutionError(
          moduleName,
          `Unexpected error during '${functionName}' execution: ${message}`,
          cause,
        )
      } finally {
        // Ensure cleanup happens regardless of success or failure
        if (executionError) {
          try {
            // Capture final output state before cleanup
            const finalOutputState = {
              stdout: module.context.stdout,
              stderr: module.context.stderr,
              exitCode: module.context.exitCode,
            }

            // Reset context to prevent contamination of future executions
            module.context.stdout = ''
            module.context.stderr = ''
            module.context.exitCode = 0

            consola.debug('Performed error cleanup for WASM module', {
              error: executionError.message,
              finalOutputState,
              memorySize: module.memory.buffer.byteLength,
            })
          } catch (cleanupError: unknown) {
            // Log cleanup errors but don't throw to avoid masking original error
            consola.warn('WASM error cleanup failed', {
              originalError: executionError.message,
              cleanupError: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
            })
          }
        }
      }
    },

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
    },
  }
}

/**
 * Create a new WASM module loader with the specified cache size.
 *
 * Factory function for creating WASM module loaders following Sparkle's
 * function-based architecture patterns. Provides better composability and
 * testability compared to class-based approaches.
 *
 * @param cacheSize - Maximum number of modules to cache (default: 10)
 * @returns WasmModuleLoader implementation with caching and security features
 */
export function createWasmModuleLoader(cacheSize = 10): WasmModuleLoader {
  return createWasmModuleLoaderImpl(cacheSize)
}
