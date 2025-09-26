/**
 * WASM executable command implementation for the shell environment.
 *
 * This module provides shell command functionality for executing WebAssembly modules
 * within the shell environment, integrating with the existing command system and
 * providing proper argument passing, I/O handling, and error management.
 */

import type {CommandExecutionResult, ExecutionContext, ShellCommand} from './types'
import type {WasmExecutableName, WasmModuleLoader} from './wasm-types'
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

      try {
        // Load WASM file
        const response = await fetch(wasmPath)
        if (!response.ok) {
          throw new Error(`Failed to load WASM file: ${response.status} ${response.statusText}`)
        }

        const wasmBytes = await response.arrayBuffer()

        // Load the WASM module
        const wasmModule = await wasmLoader.loadModule(wasmBytes, {
          name: wasmName,
          maxMemorySize: WASM_COMMAND_CONFIG.MAX_MEMORY_SIZE,
          executionTimeout: WASM_COMMAND_CONFIG.EXECUTION_TIMEOUT,
          enableDebugLogging: false,
        })

        // Determine which function to call based on arguments
        let functionName = 'main'
        let actualArgs = args

        // Check if first argument is a function name (if it exists as export)
        if (args.length > 0 && args[0] && wasmModule.exports[args[0]]) {
          functionName = args[0]
          actualArgs = args.slice(1)
        }

        // Create execution context for WASM with proper arguments
        const wasmExecutionContext: ExecutionContext = {
          ...context,
          args: actualArgs,
        }

        // Execute the WASM function
        const result = await wasmLoader.executeFunction(wasmModule, functionName, wasmExecutionContext)

        // Clean up the module
        wasmLoader.unloadModule(wasmModule)

        return {
          processId: context.processId,
          command: `${wasmName} ${args.join(' ')}`,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          executionTime: Date.now() - startTime,
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        consola.error(`WASM execution failed: ${wasmName}`, {error: errorMessage, args})

        return {
          processId: context.processId,
          command: `${wasmName} ${args.join(' ')}`,
          stdout: '',
          stderr: `${wasmName}: ${errorMessage}`,
          exitCode: 1,
          executionTime: Date.now() - startTime,
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
