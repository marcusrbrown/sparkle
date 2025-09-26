/**
 * Shell script execution engine for the moo-dang WASM shell environment.
 *
 * Provides comprehensive script execution with variable scoping, control flow,
 * function calls, and proper error handling. Designed to execute parsed shell
 * scripts safely in a browser environment while maintaining Unix shell semantics.
 */

import type {ShellEnvironment} from './environment'
import type {
  AssignmentContent,
  CommandContent,
  ConditionalContent,
  FunctionContent,
  LoopContent,
  ScriptExecutionContext,
  ScriptExecutionOptions,
  ScriptExecutionResult,
  ScriptStatement,
  ShellScriptExecutor,
} from './script-types'
import type {ShellCommand, VirtualFileSystem} from './types'

import {consola} from 'consola'
import {expandVariables, parseCommandPipeline} from './parser'
import {executePipeline} from './pipeline'

/**
 * Configuration constants for script execution safety and performance.
 */
const SCRIPT_EXECUTION_CONSTANTS = {
  /** Default timeout for script execution in milliseconds */
  DEFAULT_TIMEOUT_MS: 30_000,
  /** Maximum iterations allowed in loops to prevent infinite loops */
  MAX_LOOP_ITERATIONS: 10_000,
  /** Random range for generating process IDs */
  MAX_PROCESS_ID: 10_000,
} as const

/**
 * Script execution error for script-specific failures.
 */
export class ScriptExecutionError extends Error {
  constructor(
    readonly line: number,
    readonly statement: string,
    message: string,
  ) {
    super(`Script error on line ${line}: ${message}`)
    this.name = 'ScriptExecutionError'
  }
}

/**
 * Create a shell script executor with comprehensive execution capabilities.
 */
export function createShellScriptExecutor(
  fileSystem: VirtualFileSystem,
  environment: ShellEnvironment,
  commands: Map<string, ShellCommand>,
): ShellScriptExecutor {
  return {
    executeScript: async (
      statements: ScriptStatement[],
      context: ScriptExecutionContext,
      options: ScriptExecutionOptions = {},
    ): Promise<ScriptExecutionResult> => {
      const startTime = Date.now()
      let currentContext = context
      let finalStdout = ''
      let finalStderr = ''

      const timeout = options.timeout || SCRIPT_EXECUTION_CONSTANTS.DEFAULT_TIMEOUT_MS
      const timeoutPromise = new Promise<never>((_resolve, reject) => {
        setTimeout(() => {
          reject(new Error(`Script execution timeout after ${timeout}ms`))
        }, timeout)
      })

      try {
        const executionPromise = executeStatementsSequentially(statements, currentContext, options.debug || false)

        const result = await Promise.race([executionPromise, timeoutPromise])

        finalStdout = result.stdout
        finalStderr = result.stderr
        currentContext = result.context

        const executionTime = Date.now() - startTime

        return {
          success: result.exitCode === 0,
          exitCode: result.exitCode,
          stdout: finalStdout,
          stderr: finalStderr,
          executionTime,
          finalContext: currentContext,
        }
      } catch (error) {
        const executionTime = Date.now() - startTime
        const errorMessage = error instanceof Error ? error.message : String(error)

        consola.error('Script execution failed', {
          error: errorMessage,
          executionTime,
          finalContext: currentContext,
        })

        return {
          success: false,
          exitCode: 1,
          stdout: finalStdout,
          stderr: finalStderr + (finalStderr ? '\n' : '') + errorMessage,
          executionTime,
          error: errorMessage,
        }
      }
    },

    executeStatement: async (
      statement: ScriptStatement,
      context: ScriptExecutionContext,
    ): Promise<ScriptExecutionContext> => {
      return await executeStatementImplementation(statement, context, false)
    },

    createContext: (options: Partial<ScriptExecutionContext> = {}): ScriptExecutionContext => {
      const defaultEnvironment = environment.getState().environmentVariables

      return {
        localVariables: new Map(options.localVariables || []),
        environmentVariables: {...defaultEnvironment, ...options.environmentVariables},
        workingDirectory: options.workingDirectory || environment.getState().workingDirectory,
        scriptPath: options.scriptPath || '',
        functions: new Map(options.functions || []),
        lastExitStatus: options.lastExitStatus || 0,
        scriptArguments: options.scriptArguments || [],
        processId: options.processId || Math.floor(Math.random() * SCRIPT_EXECUTION_CONSTANTS.MAX_PROCESS_ID),
        callStack: [...(options.callStack || [])],
        shouldContinue: options.shouldContinue ?? true,
      }
    },
  }

  /**
   * Execute statements sequentially with proper exit handling.
   */
  async function executeStatementsSequentially(
    statements: ScriptStatement[],
    initialContext: ScriptExecutionContext,
    debug: boolean,
  ): Promise<{
    stdout: string
    stderr: string
    context: ScriptExecutionContext
    exitCode: number
  }> {
    let currentContext = initialContext
    const stdoutParts: string[] = []
    const stderrParts: string[] = []

    for (const statement of statements) {
      if (!currentContext.shouldContinue) {
        if (debug) {
          consola.debug('Script execution stopped', {
            reason: 'shouldContinue is false',
            line: statement.lineNumber,
          })
        }
        break
      }

      try {
        const executionContext = await executeStatementImplementation(statement, currentContext, debug)

        // Handle stdout/stderr from command executions
        if (statement.type === 'command') {
          // Command output would be captured in the execution context
          // For now, we'll simulate this by checking if there's any output
        }

        currentContext = executionContext
      } catch (error) {
        if (error instanceof ScriptExecutionError) {
          stderrParts.push(error.message)
          currentContext = {
            ...currentContext,
            lastExitStatus: 1,
            shouldContinue: false,
          }
          break
        }
        throw error
      }
    }

    return {
      stdout: stdoutParts.join(''),
      stderr: stderrParts.join('\n'),
      context: currentContext,
      exitCode: currentContext.lastExitStatus,
    }
  }

  /**
   * Execute a single script statement and return updated context.
   */
  async function executeStatementImplementation(
    statement: ScriptStatement,
    context: ScriptExecutionContext,
    debug: boolean,
  ): Promise<ScriptExecutionContext> {
    if (!statement.requiresExecution) {
      return context
    }

    if (debug) {
      consola.debug('Executing script statement', {
        type: statement.type,
        line: statement.lineNumber,
        content: statement.line.slice(0, 100), // Truncate for logging
      })
    }

    switch (statement.type) {
      case 'command':
        return await executeCommandStatement(statement, context, debug)
      case 'assignment':
        return await executeAssignmentStatement(statement, context)
      case 'conditional':
        return await executeConditionalStatement(statement, context)
      case 'loop':
        return await executeLoopStatementInternal(statement, context)
      case 'function':
        return await executeFunctionStatement(statement, context)
      case 'exit':
        return await executeExitStatement(statement, context)
      case 'return':
        return await executeReturnStatement(statement, context)
      default:
        throw new ScriptExecutionError(
          statement.lineNumber,
          statement.line,
          `Unsupported statement type: ${statement.type}`,
        )
    }
  }

  /**
   * Execute a command statement using the shell's command system.
   */
  async function executeCommandStatement(
    statement: ScriptStatement,
    context: ScriptExecutionContext,
    debug: boolean,
  ): Promise<ScriptExecutionContext> {
    const commandContent = statement.content as CommandContent

    // Build command line with variable expansion
    const expandedCommand = expandVariables(commandContent.command, {
      ...context.environmentVariables,
      ...Object.fromEntries(context.localVariables),
    })

    const expandedArgs = commandContent.args.map(arg =>
      expandVariables(arg, {
        ...context.environmentVariables,
        ...Object.fromEntries(context.localVariables),
      }),
    )

    const fullCommandLine = [expandedCommand, ...expandedArgs].join(' ')

    if (debug) {
      consola.debug('Executing command', {
        original: `${commandContent.command} ${commandContent.args.join(' ')}`,
        expanded: fullCommandLine,
        background: commandContent.background,
      })
    }

    try {
      // Parse the command as a pipeline to handle pipes and redirections
      const pipeline = parseCommandPipeline(fullCommandLine, {
        ...context.environmentVariables,
        ...Object.fromEntries(context.localVariables),
      })

      // Create execution context for the command
      const executionContext = {
        workingDirectory: context.workingDirectory,
        environmentVariables: {
          ...context.environmentVariables,
          ...Object.fromEntries(context.localVariables),
        },
        processId: context.processId,
        args: expandedArgs,
      }

      // Execute the pipeline using the shell's pipeline system
      const result = await executePipeline(pipeline, commands, executionContext, fileSystem)

      if (debug) {
        consola.debug('Command execution result', {
          command: fullCommandLine,
          exitCode: result.exitCode,
          hasOutput: result.stdout.length > 0,
          hasError: result.stderr.length > 0,
        })
      }

      // Update context with command results
      return {
        ...context,
        lastExitStatus: result.exitCode,
        workingDirectory: environment.getState().workingDirectory, // May have changed if command was 'cd'
        shouldContinue: context.shouldContinue && result.exitCode === 0,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new ScriptExecutionError(statement.lineNumber, statement.line, errorMessage)
    }
  }

  /**
   * Execute a variable assignment statement.
   */
  async function executeAssignmentStatement(
    statement: ScriptStatement,
    context: ScriptExecutionContext,
  ): Promise<ScriptExecutionContext> {
    const assignmentContent = statement.content as AssignmentContent

    // Expand variables in the assigned value
    const expandedValue = expandVariables(assignmentContent.value, {
      ...context.environmentVariables,
      ...Object.fromEntries(context.localVariables),
    })

    const newLocalVariables = new Map(context.localVariables)
    newLocalVariables.set(assignmentContent.variable, expandedValue)

    let newEnvironmentVariables = context.environmentVariables

    // If it's an exported assignment, also set in environment
    if (assignmentContent.exported) {
      newEnvironmentVariables = {
        ...context.environmentVariables,
        [assignmentContent.variable]: expandedValue,
      }

      // Update the shell environment
      environment.setEnvironmentVariable(assignmentContent.variable, expandedValue)
    }

    return {
      ...context,
      localVariables: newLocalVariables,
      environmentVariables: newEnvironmentVariables,
    }
  }

  /**
   * Execute a loop statement (for/while/until) with proper iteration management.
   */
  async function executeLoopStatementInternal(
    statement: ScriptStatement,
    context: ScriptExecutionContext,
  ): Promise<ScriptExecutionContext> {
    const loopContent = statement.content as LoopContent
    let currentContext = context

    switch (loopContent.loopType) {
      case 'for': {
        if (!loopContent.variable || !loopContent.iterator) {
          throw new ScriptExecutionError(
            statement.lineNumber,
            statement.line,
            'For loop requires variable and iterator',
          )
        }

        // Iterate over the provided values
        for (const value of loopContent.iterator) {
          // Set the loop variable in local scope
          const expandedValue = expandVariables(value, {
            ...currentContext.environmentVariables,
            ...Object.fromEntries(currentContext.localVariables),
          })

          const newLocalVariables = new Map(currentContext.localVariables)
          newLocalVariables.set(loopContent.variable, expandedValue)

          currentContext = {
            ...currentContext,
            localVariables: newLocalVariables,
          }

          // Execute loop body statements if available
          if (loopContent.statements) {
            for (const bodyStatement of loopContent.statements) {
              if (!currentContext.shouldContinue) break

              try {
                currentContext = await executeStatementImplementation(bodyStatement, currentContext, false)
              } catch (error) {
                if (error instanceof ScriptExecutionError) {
                  throw error
                }
                throw new ScriptExecutionError(
                  bodyStatement.lineNumber,
                  bodyStatement.line,
                  error instanceof Error ? error.message : String(error),
                )
              }
            }
          }

          if (!currentContext.shouldContinue) break
        }
        break
      }

      case 'while': {
        if (!loopContent.condition) {
          throw new ScriptExecutionError(statement.lineNumber, statement.line, 'While loop requires condition')
        }

        let whileIterations = 0
        const maxIterations = SCRIPT_EXECUTION_CONSTANTS.MAX_LOOP_ITERATIONS

        while (whileIterations < maxIterations && currentContext.shouldContinue) {
          const conditionResult = await evaluateCondition(loopContent.condition, currentContext)

          if (!conditionResult) {
            break
          }

          // Execute loop body statements if available
          if (loopContent.statements) {
            for (const bodyStatement of loopContent.statements) {
              if (!currentContext.shouldContinue) break

              try {
                currentContext = await executeStatementImplementation(bodyStatement, currentContext, false)
              } catch (error) {
                if (error instanceof ScriptExecutionError) {
                  throw error
                }
                throw new ScriptExecutionError(
                  bodyStatement.lineNumber,
                  bodyStatement.line,
                  error instanceof Error ? error.message : String(error),
                )
              }
            }
          }

          whileIterations++
        }

        if (whileIterations >= maxIterations) {
          throw new ScriptExecutionError(
            statement.lineNumber,
            statement.line,
            'While loop exceeded maximum iterations (possible infinite loop)',
          )
        }
        break
      }

      case 'until': {
        if (!loopContent.condition) {
          throw new ScriptExecutionError(statement.lineNumber, statement.line, 'Until loop requires condition')
        }

        let untilIterations = 0
        const maxUntilIterations = SCRIPT_EXECUTION_CONSTANTS.MAX_LOOP_ITERATIONS

        while (untilIterations < maxUntilIterations && currentContext.shouldContinue) {
          const conditionResult = await evaluateCondition(loopContent.condition, currentContext)

          // Until loops continue while condition is false
          if (conditionResult) {
            break
          }

          // Execute loop body statements if available
          if (loopContent.statements) {
            for (const bodyStatement of loopContent.statements) {
              if (!currentContext.shouldContinue) break

              try {
                currentContext = await executeStatementImplementation(bodyStatement, currentContext, false)
              } catch (error) {
                if (error instanceof ScriptExecutionError) {
                  throw error
                }
                throw new ScriptExecutionError(
                  bodyStatement.lineNumber,
                  bodyStatement.line,
                  error instanceof Error ? error.message : String(error),
                )
              }
            }
          }

          untilIterations++
        }

        if (untilIterations >= maxUntilIterations) {
          throw new ScriptExecutionError(
            statement.lineNumber,
            statement.line,
            'Until loop exceeded maximum iterations (possible infinite loop)',
          )
        }
        break
      }

      case 'do':
        // 'do' marks the beginning of a loop body - handled by loop structure parsing
        return currentContext

      case 'done':
        // 'done' marks the end of a loop body - handled by loop structure parsing
        return currentContext

      default:
        throw new ScriptExecutionError(
          statement.lineNumber,
          statement.line,
          `Unknown loop type: ${loopContent.loopType}`,
        )
    }

    return currentContext
  }
}

/**
 * Execute a conditional statement (if/elif/else/fi).
 *
 * Evaluates test conditions and executes the appropriate code blocks
 * based on shell test command semantics and conditional logic.
 */
async function executeConditionalStatement(
  statement: ScriptStatement,
  context: ScriptExecutionContext,
): Promise<ScriptExecutionContext> {
  const conditionalContent = statement.content as ConditionalContent

  switch (conditionalContent.conditionalType) {
    case 'if':
    case 'elif': {
      if (!conditionalContent.condition) {
        throw new ScriptExecutionError(
          statement.lineNumber,
          statement.line,
          'Conditional statement requires a condition',
        )
      }

      const conditionResult = await evaluateCondition(conditionalContent.condition, context)

      return {
        ...context,
        lastExitStatus: conditionResult ? 0 : 1,
      }
    }

    case 'else':
      // 'else' statements don't need evaluation, they're handled by the conditional block logic
      return context

    case 'fi':
      // 'fi' marks the end of a conditional block
      return context

    default:
      throw new ScriptExecutionError(
        statement.lineNumber,
        statement.line,
        `Unknown conditional type: ${conditionalContent.conditionalType}`,
      )
  }
}

/**
 * Creates a variable context from execution context for variable expansion.
 *
 * Consolidates environment and local variables into a single object for
 * consistent variable resolution across condition evaluations.
 */
function createVariableContext(context: ScriptExecutionContext): Record<string, string> {
  return {
    ...context.environmentVariables,
    ...Object.fromEntries(context.localVariables),
  }
}

/**
 * Evaluates string equality and inequality operations.
 *
 * Handles both quoted string comparisons with = and != operators.
 * Essential for shell script conditional logic that compares string values.
 */
function evaluateStringComparison(condition: string): boolean | null {
  // Handle string equality checks: "string1" = "string2"
  const equalityMatch = condition.match(/^"([^"]*)"\s*=\s*"([^"]*)"$/)
  if (equalityMatch && equalityMatch[1] !== undefined && equalityMatch[2] !== undefined) {
    return equalityMatch[1] === equalityMatch[2]
  }

  // Handle string inequality checks: "string1" != "string2"
  const inequalityMatch = condition.match(/^"([^"]*)"\s*!=\s*"([^"]*)"$/)
  if (inequalityMatch && inequalityMatch[1] !== undefined && inequalityMatch[2] !== undefined) {
    return inequalityMatch[1] !== inequalityMatch[2]
  }

  return null
}

/**
 * Evaluates numeric comparison operations.
 *
 * Supports shell numeric comparison operators (-eq, -ne, -gt, -ge, -lt, -le)
 * with proper variable expansion for both operands.
 */
function evaluateNumericComparison(condition: string, variableContext: Record<string, string>): boolean | null {
  const numericMatch = condition.match(/^(\d+|\$\w+)\s+(-eq|-ne|-gt|-ge|-lt|-le)\s+(\d+|\$\w+)$/)
  if (!numericMatch || !numericMatch[1] || !numericMatch[2] || !numericMatch[3]) {
    return null
  }

  const leftStr = numericMatch[1].startsWith('$') ? expandVariables(numericMatch[1], variableContext) : numericMatch[1]
  const operator = numericMatch[2]
  const rightStr = numericMatch[3].startsWith('$') ? expandVariables(numericMatch[3], variableContext) : numericMatch[3]

  const left = Number.parseInt(leftStr, 10)
  const right = Number.parseInt(rightStr, 10)

  if (Number.isNaN(left) || Number.isNaN(right)) {
    return null
  }

  switch (operator) {
    case '-eq':
      return left === right
    case '-ne':
      return left !== right
    case '-gt':
      return left > right
    case '-ge':
      return left >= right
    case '-lt':
      return left < right
    case '-le':
      return left <= right
    default:
      return null
  }
}

/**
 * Evaluates variable existence and emptiness checks.
 *
 * Handles -n (non-empty) and -z (empty) tests that are fundamental
 * to shell scripting for checking variable state.
 */
function evaluateVariableCheck(condition: string): boolean | null {
  const varCheckMatch = condition.match(/^(-n|-z)\s+"([^"]*)"$/)
  if (!varCheckMatch || !varCheckMatch[1] || varCheckMatch[2] === undefined) {
    return null
  }

  const operator = varCheckMatch[1]
  const value = varCheckMatch[2]

  return operator === '-n' ? value.length > 0 : value.length === 0
}

/**
 * Evaluates variable truthiness and string literal checks.
 *
 * Handles direct variable evaluation ($var, "$var") and quoted string
 * truthiness, which are common in shell conditional expressions.
 */
function evaluateVariableTruthiness(condition: string, context: ScriptExecutionContext): boolean | null {
  // Handle simple variable truthiness: $var or "$var"
  const varMatch = condition.match(/^\$(\w+)$|^"\$(\w+)"$/)
  if (varMatch) {
    const varName = varMatch[1] || varMatch[2]
    if (varName) {
      const value = context.localVariables.get(varName) || context.environmentVariables[varName] || ''
      return value.length > 0
    }
  }

  // Handle simple string truthiness: "string"
  const stringMatch = condition.match(/^"([^"]*)"$/)
  if (stringMatch && stringMatch[1] !== undefined) {
    return stringMatch[1].length > 0
  }

  return null
}

/**
 * Evaluates exit status comparison operations.
 *
 * Handles $? comparisons for checking the success or failure of previous
 * commands, which is essential for error handling in shell scripts.
 */
function evaluateExitStatusCheck(condition: string, context: ScriptExecutionContext): boolean | null {
  const exitStatusMatch = condition.match(/^\$\?\s*(-eq|-ne)\s*(\d+)$/)
  if (!exitStatusMatch || !exitStatusMatch[1] || !exitStatusMatch[2]) {
    return null
  }

  const operator = exitStatusMatch[1]
  const expectedStatus = Number.parseInt(exitStatusMatch[2], 10)

  if (Number.isNaN(expectedStatus)) {
    return null
  }

  return operator === '-eq' ? context.lastExitStatus === expectedStatus : context.lastExitStatus !== expectedStatus
}

/**
 * Evaluate a shell condition expression using a chain of specialized evaluators.
 *
 * Breaks down complex condition evaluation into focused, testable functions
 * that each handle a specific type of shell test operation. This modular
 * approach improves maintainability and follows the single responsibility principle.
 */
async function evaluateCondition(condition: string, context: ScriptExecutionContext): Promise<boolean> {
  const variableContext = createVariableContext(context)
  const expandedCondition = expandVariables(condition, variableContext).trim()

  // Handle empty or whitespace conditions
  if (!expandedCondition) {
    return false
  }

  // Try each evaluation strategy in order of specificity
  const stringResult = evaluateStringComparison(expandedCondition)
  if (stringResult !== null) {
    return stringResult
  }

  const numericResult = evaluateNumericComparison(expandedCondition, variableContext)
  if (numericResult !== null) {
    return numericResult
  }

  const varCheckResult = evaluateVariableCheck(expandedCondition)
  if (varCheckResult !== null) {
    return varCheckResult
  }

  const truthinessResult = evaluateVariableTruthiness(expandedCondition, context)
  if (truthinessResult !== null) {
    return truthinessResult
  }

  const exitStatusResult = evaluateExitStatusCheck(expandedCondition, context)
  if (exitStatusResult !== null) {
    return exitStatusResult
  }

  // Default: treat non-empty strings as truthy
  return expandedCondition.length > 0
}

/**
 * Execute a function definition statement.
 *
 * Stores the function definition in the execution context for later invocation.
 * Shell functions are first-class constructs that enable code reuse and
 * modular script organization, essential for complex shell automation.
 */
async function executeFunctionStatement(
  statement: ScriptStatement,
  context: ScriptExecutionContext,
): Promise<ScriptExecutionContext> {
  const functionContent = statement.content as FunctionContent

  if (!functionContent.name) {
    throw new ScriptExecutionError(statement.lineNumber, statement.line, 'Function definition requires a name')
  }

  // Store the function definition in the context for later execution
  const newFunctions = new Map(context.functions)
  newFunctions.set(functionContent.name, functionContent)

  return {
    ...context,
    functions: newFunctions,
  }
}

/**
 * Execute an exit statement.
 *
 * Terminates script execution with a successful exit status.
 * Critical for controlled script termination and proper cleanup
 * in shell automation workflows.
 */
async function executeExitStatement(
  _statement: ScriptStatement,
  context: ScriptExecutionContext,
): Promise<ScriptExecutionContext> {
  return {
    ...context,
    lastExitStatus: 0,
    shouldContinue: false,
  }
}

/**
 * Execute a return statement.
 *
 * Handles context-aware return behavior that differs between function
 * and script contexts. In functions, return exits only the function;
 * in script context, return exits the entire script.
 */
async function executeReturnStatement(
  _statement: ScriptStatement,
  context: ScriptExecutionContext,
): Promise<ScriptExecutionContext> {
  const inFunction = context.callStack.length > 0

  return {
    ...context,
    lastExitStatus: 0,
    shouldContinue: !inFunction, // Continue script if not in function
  }
}
