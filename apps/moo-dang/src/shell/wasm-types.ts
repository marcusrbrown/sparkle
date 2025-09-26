/**
 * WASM module loading and execution interfaces for the moo-dang shell.
 *
 * This module provides types and interfaces for loading, instantiating, and executing
 * WebAssembly modules within the shell environment. It handles the communication
 * protocol between the shell and WASM executables, including I/O operations,
 * argument passing, and environment variable access.
 */

import type {CommandExecutionResult, ExecutionContext} from './types'

/**
 * WASM module instance with managed execution context and imports.
 */
export interface WasmModule {
  /** WebAssembly instance with exported functions */
  readonly instance: WebAssembly.Instance
  /** Module memory for reading/writing data */
  readonly memory: WebAssembly.Memory
  /** Execution context for this module instance */
  readonly context: WasmExecutionContext
  /** Available exported functions from the module */
  readonly exports: WasmExports
}

/**
 * Available exports from a WASM module.
 */
export interface WasmExports {
  /** Main entry point function */
  main?: () => void
  /** Memory export for data access */
  memory?: WebAssembly.Memory
  /** Additional exported functions by name */
  [key: string]: WebAssembly.ExportValue | undefined
}

/**
 * Execution context for WASM module instances.
 */
export interface WasmExecutionContext {
  /** Command-line arguments passed to the executable */
  args: string[]
  /** Environment variables available to the module */
  env: Record<string, string>
  /** Standard input data for the module */
  stdin: string
  /** Standard output buffer */
  stdout: string
  /** Standard error buffer */
  stderr: string
  /** Exit code set by the module */
  exitCode: number
  /** Working directory for file operations */
  workingDirectory: string
  /** Process ID for this execution */
  processId: number
}

/**
 * WASM executable names supported by the shell.
 */
export const WASM_EXECUTABLES = ['hello', 'echo', 'cat', 'template'] as const
export type WasmExecutableName = (typeof WASM_EXECUTABLES)[number]

/**
 * Configuration for WASM module loading and execution.
 */
export interface WasmModuleConfig {
  /** Module name for debugging and error reporting */
  readonly name: string
  /** Maximum memory size in bytes (default: 32MB for Zig modules) */
  readonly maxMemorySize?: number
  /** Execution timeout in milliseconds (default: 15s) */
  readonly executionTimeout?: number
  /** Enable debug logging for module execution */
  readonly enableDebugLogging?: boolean
  /** Custom import functions to provide to the module */
  readonly customImports?: Record<string, Record<string, WebAssembly.ImportValue>>
}

/**
 * Required subset of WasmModuleConfig with defaults applied.
 */
export type WasmModuleOptions = Required<WasmModuleConfig>

/**
 * Result of WASM module execution.
 */
export interface WasmExecutionResult extends CommandExecutionResult {
  /** Name of the WASM module that was executed */
  readonly moduleName: string
  /** Function name that was called (e.g., 'main', 'hello_name') */
  readonly functionName: string
  /** Peak memory usage during execution in bytes */
  readonly peakMemoryUsage: number
}

/**
 * Enhanced error context for WASM operations diagnostics.
 */
export interface WasmErrorContext {
  readonly processId?: number
  readonly executionTime?: number
  readonly memoryUsage?: number
  readonly functionName?: string
  readonly args?: string[]
  readonly outputCapture?: {
    readonly stdoutLength: number
    readonly stderrLength: number
    readonly partialStdout?: string
    readonly partialStderr?: string
  }
  readonly moduleInfo?: {
    readonly exports: string[]
    readonly memorySize: number
    readonly compilationTime?: number
  }
}

/**
 * Error types for WASM module operations with enhanced diagnostics.
 */
export class WasmModuleError extends Error {
  readonly moduleName: string
  readonly operation: string
  readonly context?: WasmErrorContext
  readonly timestamp: number

  constructor(moduleName: string, operation: string, message: string, cause?: Error, context?: WasmErrorContext) {
    super(`WASM module '${moduleName}' ${operation}: ${message}`)
    this.name = 'WasmModuleError'
    this.moduleName = moduleName
    this.operation = operation
    this.context = context
    this.timestamp = Date.now()
    this.cause = cause

    // Enhance stack trace with WASM-specific information
    if (context) {
      this.stack = this.buildEnhancedStack(this.stack || this.message)
    }
  }

  private buildEnhancedStack(originalStack: string): string {
    if (!this.context) return originalStack

    const contextLines: string[] = [
      `    WASM Context:`,
      `      Module: ${this.moduleName}`,
      `      Operation: ${this.operation}`,
    ]

    if (this.context.processId) {
      contextLines.push(`      Process ID: ${this.context.processId}`)
    }

    if (this.context.executionTime) {
      contextLines.push(`      Execution Time: ${this.context.executionTime}ms`)
    }

    if (this.context.memoryUsage) {
      contextLines.push(`      Memory Usage: ${this.context.memoryUsage} bytes`)
    }

    if (this.context.functionName) {
      contextLines.push(`      Function: ${this.context.functionName}`)
    }

    if (this.context.args && this.context.args.length > 0) {
      contextLines.push(`      Arguments: ${this.context.args.join(' ')}`)
    }

    if (this.context.outputCapture) {
      const {stdoutLength, stderrLength, partialStdout, partialStderr} = this.context.outputCapture
      contextLines.push(`      Output: stdout=${stdoutLength} chars, stderr=${stderrLength} chars`)

      if (partialStdout) {
        contextLines.push(`      Last stdout: ${JSON.stringify(partialStdout)}`)
      }

      if (partialStderr) {
        contextLines.push(`      Last stderr: ${JSON.stringify(partialStderr)}`)
      }
    }

    return `${originalStack}\n${contextLines.join('\n')}`
  }

  /**
   * Get diagnostic information for debugging.
   */
  getDiagnostics(): Record<string, unknown> {
    return {
      error: this.name,
      module: this.moduleName,
      operation: this.operation,
      message: this.message,
      timestamp: new Date(this.timestamp).toISOString(),
      context: this.context,
      cause:
        this.cause instanceof Error
          ? {
              name: this.cause.name,
              message: this.cause.message,
            }
          : undefined,
    }
  }
}

export class WasmLoadError extends WasmModuleError {
  constructor(moduleName: string, message: string, cause?: Error, context?: WasmErrorContext) {
    super(moduleName, 'load failed', message, cause, context)
    this.name = 'WasmLoadError'
  }
}

export class WasmExecutionError extends WasmModuleError {
  constructor(moduleName: string, message: string, cause?: Error, context?: WasmErrorContext) {
    super(moduleName, 'execution failed', message, cause, context)
    this.name = 'WasmExecutionError'
  }
}

export class WasmTimeoutError extends WasmModuleError {
  readonly timeoutMs: number

  constructor(moduleName: string, timeoutMs: number, context?: WasmErrorContext) {
    super(moduleName, 'execution timeout', `Execution exceeded ${timeoutMs}ms timeout`, undefined, context)
    this.name = 'WasmTimeoutError'
    this.timeoutMs = timeoutMs
  }
}

export class WasmMemoryError extends WasmModuleError {
  readonly requestedSize?: number
  readonly availableSize?: number

  constructor(
    moduleName: string,
    message: string,
    requestedSize?: number,
    availableSize?: number,
    context?: WasmErrorContext,
  ) {
    super(moduleName, 'memory error', message, undefined, context)
    this.name = 'WasmMemoryError'
    this.requestedSize = requestedSize
    this.availableSize = availableSize
  }
}

/**
 * WASM module loader interface for loading and managing WebAssembly modules.
 */
export interface WasmModuleLoader {
  /**
   * Load a WASM module from bytes with the given configuration.
   *
   * @param bytes - WebAssembly module bytes
   * @param config - Module configuration and limits
   * @returns Promise resolving to loaded WASM module
   */
  readonly loadModule: (bytes: ArrayBuffer, config: WasmModuleConfig) => Promise<WasmModule>

  /**
   * Execute a function in a WASM module with the given execution context.
   *
   * @param module - Loaded WASM module to execute
   * @param functionName - Name of exported function to call (default: 'main')
   * @param executionContext - Shell execution context for the module
   * @returns Promise resolving to execution result
   */
  readonly executeFunction: (
    module: WasmModule,
    functionName: string | undefined,
    executionContext: ExecutionContext,
  ) => Promise<WasmExecutionResult>

  /**
   * Unload a WASM module and free its resources.
   *
   * @param module - WASM module to unload
   */
  readonly unloadModule: (module: WasmModule) => void
}

/**
 * Cache for loaded WASM modules to avoid recompilation.
 */
export interface WasmModuleCache {
  /**
   * Get a cached module by path/name.
   *
   * @param key - Module cache key (usually file path)
   * @returns Cached module or undefined if not found
   */
  readonly get: (key: string) => WasmModule | undefined

  /**
   * Store a module in the cache.
   *
   * @param key - Module cache key (usually file path)
   * @param module - WASM module to cache
   */
  readonly set: (key: string, module: WasmModule) => void

  /**
   * Remove a module from the cache.
   *
   * @param key - Module cache key to remove
   */
  readonly delete: (key: string) => void

  /**
   * Clear all cached modules.
   */
  readonly clear: () => void

  /**
   * Get current cache size (number of modules).
   */
  readonly size: () => number
}

/**
 * Shell imports provided to WASM modules for system interaction.
 */
export interface ShellImports {
  /** Write data to stdout */
  readonly shell_write_stdout: (dataPtr: number, dataLen: number) => void
  /** Write data to stderr */
  readonly shell_write_stderr: (dataPtr: number, dataLen: number) => void
  /** Read data from stdin */
  readonly shell_read_stdin: (bufferPtr: number, bufferLen: number) => number
  /** Get number of command-line arguments */
  readonly shell_get_argc: () => number
  /** Get command-line argument by index */
  readonly shell_get_arg: (index: number, bufferPtr: number, bufferLen: number) => number
  /** Get environment variable value */
  readonly shell_get_env: (keyPtr: number, keyLen: number, bufferPtr: number, bufferLen: number) => number
  /** Set exit code for the module */
  readonly shell_set_exit_code: (code: number) => void
}

/**
 * Factory function type for creating shell imports for a WASM execution context.
 */
export type CreateShellImports = (context: WasmExecutionContext, memory: WebAssembly.Memory) => ShellImports
