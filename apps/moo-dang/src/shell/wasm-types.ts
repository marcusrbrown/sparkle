/**
 * WASM module loading and execution interfaces for the moo-dang shell.
 *
 * This module provides types and interfaces for loading, instantiating, and executing
 * WebAssembly modules within the shell environment. It handles the communication
 * protocol between the shell and WASM executables, including I/O operations,
 * argument passing, and environment variable access.
 */

import type {CommandExecutionResult, ExecutionContext} from './types'

export interface WasmModule {
  readonly instance: WebAssembly.Instance
  readonly memory: WebAssembly.Memory
  readonly context: WasmExecutionContext
  readonly exports: WasmExports
  readonly config: Required<Omit<WasmModuleConfig, 'name'>> & Pick<WasmModuleConfig, 'name'>
}

export interface WasmExports {
  main?: () => void
  memory?: WebAssembly.Memory
  [key: string]: WebAssembly.ExportValue | undefined
}

export interface WasmExecutionContext {
  args: string[]
  env: Record<string, string>
  stdin: string
  stdout: string
  stderr: string
  exitCode: number
  workingDirectory: string
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
  readonly name: string
  // Zig-compiled modules require 32MB due to runtime overhead
  readonly maxMemorySize?: number
  readonly executionTimeout?: number
  readonly enableDebugLogging?: boolean
  readonly customImports?: Record<string, Record<string, WebAssembly.ImportValue>>
}

export type WasmModuleOptions = Required<WasmModuleConfig>

export interface WasmExecutionResult extends CommandExecutionResult {
  readonly moduleName: string
  readonly functionName: string
  readonly peakMemoryUsage: number
}

/**
 * Error context for WASM diagnostics and debugging complex runtime issues.
 */
export interface WasmErrorContext {
  readonly processId?: number
  readonly executionTime?: number
  readonly memoryUsage?: number
  readonly functionName?: string
  readonly moduleName?: string
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
 * Creates enhanced stack trace with WASM diagnostic context.
 *
 * Extends error stack traces with contextual information about WASM module
 * execution state to assist with debugging complex WASM runtime issues.
 */
function buildWasmEnhancedStack(
  originalStack: string,
  moduleName: string,
  operation: string,
  context?: WasmErrorContext,
): string {
  if (!context) return originalStack

  const contextLines: string[] = [`    WASM Context:`, `      Module: ${moduleName}`, `      Operation: ${operation}`]

  if (context.processId != null) {
    contextLines.push(`      Process ID: ${context.processId}`)
  }

  if (context.executionTime != null) {
    contextLines.push(`      Execution Time: ${context.executionTime}ms`)
  }

  if (context.memoryUsage != null) {
    contextLines.push(`      Memory Usage: ${context.memoryUsage} bytes`)
  }

  if (context.functionName != null) {
    contextLines.push(`      Function: ${context.functionName}`)
  }

  if (context.args != null && context.args.length > 0) {
    contextLines.push(`      Arguments: ${context.args.join(' ')}`)
  }

  if (context.outputCapture != null) {
    const {stdoutLength, stderrLength, partialStdout, partialStderr} = context.outputCapture
    contextLines.push(`      Output: stdout=${stdoutLength} chars, stderr=${stderrLength} chars`)

    if (partialStdout != null) {
      contextLines.push(`      Last stdout: ${JSON.stringify(partialStdout)}`)
    }

    if (partialStderr != null) {
      contextLines.push(`      Last stderr: ${JSON.stringify(partialStderr)}`)
    }
  }

  return `${originalStack}\n${contextLines.join('\n')}`
}

/**
 * Creates diagnostic information object for WASM errors.
 *
 * Provides structured error context for logging and debugging purposes,
 * including sanitized error cause information to prevent sensitive data exposure.
 */
function createWasmErrorDiagnostics(
  name: string,
  moduleName: string,
  operation: string,
  message: string,
  timestamp: number,
  context?: WasmErrorContext,
  cause?: Error,
): Record<string, unknown> {
  return {
    error: name,
    module: moduleName,
    operation,
    message,
    timestamp: new Date(timestamp).toISOString(),
    context,
    cause:
      cause instanceof Error
        ? {
            name: cause.name,
            message: cause.message,
          }
        : undefined,
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

    if (context != null) {
      this.stack = buildWasmEnhancedStack(this.stack || this.message, moduleName, operation, context)
    }
  }

  getDiagnostics(): Record<string, unknown> {
    return createWasmErrorDiagnostics(
      this.name,
      this.moduleName,
      this.operation,
      this.message,
      this.timestamp,
      this.context,
      this.cause instanceof Error ? this.cause : undefined,
    )
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

  readonly delete: (key: string) => void
  readonly clear: () => void
  readonly size: () => number
}

/**
 * Shell API functions exposed to WASM modules via WebAssembly imports.
 *
 * These functions bridge the gap between WASM modules and the shell environment,
 * allowing WASM executables to behave like native command-line tools.
 */
export interface ShellImports {
  readonly shell_write_stdout: (dataPtr: number, dataLen: number) => void
  readonly shell_write_stderr: (dataPtr: number, dataLen: number) => void
  readonly shell_read_stdin: (bufferPtr: number, bufferLen: number) => number
  readonly shell_get_argc: () => number
  readonly shell_get_arg: (index: number, bufferPtr: number, bufferLen: number) => number
  readonly shell_get_env: (keyPtr: number, keyLen: number, bufferPtr: number, bufferLen: number) => number
  readonly shell_set_exit_code: (code: number) => void
}

export type CreateShellImports = (context: WasmExecutionContext, memory: WebAssembly.Memory) => ShellImports
