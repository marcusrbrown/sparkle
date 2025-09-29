/**
 * WASM executable command implementation for the shell environment.
 *
 * This module provides shell command functionality for executing WebAssembly modules
 * within the shell environment, integrating with the existing command system and
 * providing proper argument passing, I/O handling, and error management.
 */

import type {CommandExecutionResult, ExecutionContext, ShellCommand} from './types'
import type {WasmExecutableName, WasmModule, WasmModuleLoader} from './wasm-types'
import {consola} from 'consola'

import {WASM_EXECUTABLES} from './wasm-types'

/**
 * Configuration constants for WASM executable commands.
 *
 * These values match the WASM loader defaults to ensure consistency
 * across the execution pipeline.
 */
const WASM_COMMAND_CONFIG = {
  /** Memory limit for WASM modules (32MB for Zig compatibility) */
  MAX_MEMORY_SIZE: 32 * 1024 * 1024,
  /** Execution timeout for WASM commands */
  EXECUTION_TIMEOUT: 15000,
} as const

/**
 * Mapping of WASM executable names to their file paths.
 */
const WASM_EXECUTABLE_PATHS: Record<WasmExecutableName, string> = {
  hello: '/wasm/hello.wasm',
  echo: '/wasm/echo.wasm',
  cat: '/wasm/cat.wasm',
  template: '/wasm/template.wasm',
} as const

/**
 * Creates a WASM executable command that can load and execute WebAssembly modules.
 */
export function createWasmExecutableCommand(
  wasmName: string,
  wasmPath: string,
  wasmLoader: WasmModuleLoader,
): ShellCommand {
  return {
    name: wasmName,
    description: `WASM executable: ${wasmName}`,
    execute: async (args: string[], context: ExecutionContext): Promise<CommandExecutionResult> => {
      const startTime = Date.now()
      let wasmModule: WasmModule | null = null
      let loadedSuccessfully = false

      consola.debug(`Starting WASM command execution: ${wasmName}`, {
        processId: context.processId,
        args,
        wasmPath,
        workingDirectory: context.workingDirectory,
      })

      try {
        let response: Response
        try {
          response = await fetch(wasmPath)
        } catch (fetchError: unknown) {
          throw new Error(
            `Network error loading WASM file '${wasmPath}': ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
          )
        }

        if (!response.ok) {
          throw new Error(`Failed to load WASM file '${wasmPath}': HTTP ${response.status} ${response.statusText}`)
        }

        const wasmBytes = await response.arrayBuffer()
        consola.debug(`Loaded WASM file: ${wasmName}`, {
          filePath: wasmPath,
          fileSize: wasmBytes.byteLength,
          processId: context.processId,
        })

        wasmModule = await wasmLoader.loadModule(wasmBytes, {
          name: wasmName,
          maxMemorySize: WASM_COMMAND_CONFIG.MAX_MEMORY_SIZE,
          executionTimeout: WASM_COMMAND_CONFIG.EXECUTION_TIMEOUT,
          enableDebugLogging: true,
        })
        loadedSuccessfully = true

        // Support calling specific functions: "hello hello_name John"
        let functionName = 'main'
        let actualArgs = args

        // Allow first argument to override function if it exists as export
        if (args.length > 0 && args[0] && wasmModule.exports[args[0]]) {
          functionName = args[0]
          actualArgs = args.slice(1)
          consola.debug(`Using custom WASM function: ${functionName}`, {wasmName, actualArgs})
        }

        const wasmExecutionContext: ExecutionContext = {
          ...context,
          args: actualArgs,
        }

        consola.debug(`Executing WASM function: ${wasmName}.${functionName}`, {
          processId: context.processId,
          memorySize: wasmModule.memory.buffer.byteLength,
          availableExports: Object.keys(wasmModule.exports),
        })

        const result = await wasmLoader.executeFunction(wasmModule, functionName, wasmExecutionContext)

        consola.debug(`WASM execution completed: ${wasmName}.${functionName}`, {
          processId: context.processId,
          exitCode: result.exitCode,
          executionTime: result.executionTime,
          stdoutLength: result.stdout.length,
          stderrLength: result.stderr.length,
          peakMemoryUsage: result.peakMemoryUsage,
        })

        return {
          processId: context.processId,
          command: args.length > 0 ? `${wasmName} ${args.join(' ')}` : wasmName,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          executionTime: Date.now() - startTime,
        }
      } catch (error: unknown) {
        const executionTime = Date.now() - startTime

        // Create comprehensive error context
        const errorContext = {
          wasmName,
          wasmPath,
          args,
          processId: context.processId,
          executionTime,
          loadedSuccessfully,
          moduleInfo: wasmModule
            ? {
                memorySize: wasmModule.memory?.buffer?.byteLength,
                exports: Object.keys(wasmModule.exports || {}),
              }
            : null,
        }

        // Format error message based on error type
        let errorMessage: string
        let detailedError: string

        if (error instanceof Error) {
          errorMessage = error.message
          detailedError = error.stack || error.message

          // Add specific error context for known error types
          if (error.name === 'WasmLoadError') {
            errorMessage = `Module loading failed: ${error.message}`
          } else if (error.name === 'WasmExecutionError') {
            errorMessage = `Execution failed: ${error.message}`
          } else if (error.name === 'WasmTimeoutError') {
            errorMessage = `Execution timeout: ${error.message}`
          }
        } else {
          errorMessage = String(error)
          detailedError = String(error)
        }

        // Log comprehensive error information
        consola.error(`WASM command failed: ${wasmName}`, {
          ...errorContext,
          error: errorMessage,
          detailedError,
        })

        // Create user-friendly error output
        const userErrorMessage = `${wasmName}: ${errorMessage}`
        const debugInfo = loadedSuccessfully
          ? `\nDebug: Module loaded successfully but execution failed.`
          : `\nDebug: Module failed to load from '${wasmPath}'.`

        return {
          processId: context.processId,
          command: `${wasmName} ${args.join(' ')}`,
          stdout: '',
          stderr: userErrorMessage + debugInfo,
          exitCode: 1,
          executionTime,
        }
      } finally {
        // Ensure proper cleanup regardless of success or failure
        if (wasmModule && loadedSuccessfully) {
          try {
            wasmLoader.unloadModule(wasmModule)
            consola.debug(`Cleaned up WASM module: ${wasmName}`)
          } catch (cleanupError: unknown) {
            consola.warn(`Failed to clean up WASM module: ${wasmName}`, {
              error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
            })
          }
        }
      }
    },
  }
}

/**
 * Creates a collection of WASM executable commands for all available WASM files.
 */
export function createWasmExecutableCommands(wasmLoader: WasmModuleLoader): Map<string, ShellCommand> {
  const commands = new Map<string, ShellCommand>()

  for (const name of WASM_EXECUTABLES) {
    const path = WASM_EXECUTABLE_PATHS[name]
    const command = createWasmExecutableCommand(name, path, wasmLoader)
    commands.set(name, command)
  }

  return commands
}

/**
 * Checks if a command name corresponds to a WASM executable.
 *
 * @param commandName - Name of the command to check
 * @returns True if the command is a known WASM executable
 */
export function isWasmExecutable(commandName: string): commandName is WasmExecutableName {
  return WASM_EXECUTABLES.includes(commandName as WasmExecutableName)
}

/**
 * Resolves a WASM executable path from a command name.
 *
 * @param commandName - Name of the WASM command
 * @returns Path to the WASM file or undefined if not found
 */
export function resolveWasmExecutablePath(commandName: string): string | undefined {
  if (isWasmExecutable(commandName)) {
    return WASM_EXECUTABLE_PATHS[commandName]
  }
  return undefined
}
