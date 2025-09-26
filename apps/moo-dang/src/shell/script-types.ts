/**
 * Shell scripting types for parsing and executing .sh files.
 *
 * Provides structured types for shell script parsing, execution context,
 * and control flow handling in the moo-dang WASM shell environment.
 */

/**
 * Types of shell script statements for parsing and execution.
 */
export type ScriptStatementType =
  | 'command' // Standard command execution: echo "hello"
  | 'comment' // Comment lines: # This is a comment
  | 'assignment' // Variable assignment: VAR=value
  | 'conditional' // if/else/elif/fi statements
  | 'loop' // for/while/until loops
  | 'function' // Function definitions
  | 'exit' // Script exit with code
  | 'return' // Function return
  | 'empty' // Empty lines (whitespace only)

/**
 * Conditional statement types for if/else control structures.
 */
export type ConditionalType = 'if' | 'elif' | 'else' | 'fi'

/**
 * Loop statement types for iterative control structures.
 */
export type LoopType = 'for' | 'while' | 'until' | 'do' | 'done'

/**
 * Parsed shell script statement with type information and content.
 */
export interface ScriptStatement {
  /** Type of the statement for execution routing */
  readonly type: ScriptStatementType
  /** Original line content for debugging and error reporting */
  readonly line: string
  /** Line number in the original script file */
  readonly lineNumber: number
  /** Parsed content specific to the statement type */
  readonly content: ScriptStatementContent
  /** Whether this statement requires execution in script context */
  readonly requiresExecution: boolean
}

/**
 * Statement content union type for different statement types.
 */
export type ScriptStatementContent =
  | CommandContent
  | CommentContent
  | AssignmentContent
  | ConditionalContent
  | LoopContent
  | FunctionContent
  | ExitContent
  | ReturnContent
  | EmptyContent

/**
 * Command execution statement content.
 */
export interface CommandContent {
  /** Command name */
  readonly command: string
  /** Command arguments */
  readonly args: string[]
  /** Whether command should run in background (&) */
  readonly background: boolean
  /** Input/output redirections */
  readonly redirections: ScriptRedirection[]
}

/**
 * Comment statement content for documentation.
 */
export interface CommentContent {
  /** Comment text without the # prefix */
  readonly text: string
}

/**
 * Variable assignment statement content.
 */
export interface AssignmentContent {
  /** Variable name */
  readonly variable: string
  /** Assigned value (may contain variable references) */
  readonly value: string
  /** Whether this is an export assignment (export VAR=value) */
  readonly exported: boolean
}

/**
 * Conditional statement content for if/else blocks.
 */
export interface ConditionalContent {
  /** Type of conditional statement */
  readonly conditionalType: ConditionalType
  /** Condition expression for if/elif statements */
  readonly condition?: string
  /** Statements within this conditional block */
  readonly statements?: ScriptStatement[]
}

/**
 * Loop statement content for iterative structures.
 */
export interface LoopContent {
  /** Type of loop statement */
  readonly loopType: LoopType
  /** Loop variable name for 'for' loops */
  readonly variable?: string
  /** Iterator values for 'for' loops or condition for 'while'/'until' */
  readonly iterator?: string[]
  /** Condition expression for 'while'/'until' loops */
  readonly condition?: string
  /** Statements within the loop body */
  readonly statements?: ScriptStatement[]
}

/**
 * Function definition statement content.
 */
export interface FunctionContent {
  /** Function name */
  readonly name: string
  /** Function parameter names */
  readonly parameters: string[]
  /** Function body statements */
  readonly body: ScriptStatement[]
}

/**
 * Script exit statement content.
 */
export interface ExitContent {
  /** Exit code (defaults to 0) */
  readonly code: number
}

/**
 * Function return statement content.
 */
export interface ReturnContent {
  /** Return code (defaults to 0) */
  readonly code: number
}

/**
 * Empty line statement content.
 */
export interface EmptyContent {
  /** Always empty for empty lines */
  readonly placeholder: null
}

/**
 * I/O redirection information for script commands.
 */
export interface ScriptRedirection {
  /** Redirection operator */
  readonly operator: '>' | '<' | '>>' | '2>' | '&>'
  /** Target file path */
  readonly target: string
}

/**
 * Script execution context with variables and state.
 */
export interface ScriptExecutionContext {
  /** Script-local variables (separate from environment variables) */
  readonly localVariables: Map<string, string>
  /** Environment variables accessible to the script */
  readonly environmentVariables: Record<string, string>
  /** Current working directory for the script */
  readonly workingDirectory: string
  /** Script file path (for relative includes) */
  readonly scriptPath: string
  /** Function definitions available in this script */
  readonly functions: Map<string, FunctionContent>
  /** Exit status of the last executed command */
  readonly lastExitStatus: number
  /** Script arguments ($0, $1, $2, ...) */
  readonly scriptArguments: string[]
  /** Process ID for script execution */
  readonly processId: number
  /** Call stack for function execution tracking */
  readonly callStack: ScriptCallFrame[]
  /** Whether script execution should continue (for exit/return handling) */
  readonly shouldContinue: boolean
}

/**
 * Call frame information for function call tracking.
 */
export interface ScriptCallFrame {
  /** Function name being executed */
  readonly functionName: string
  /** Local variables at this call level */
  readonly localScope: Map<string, string>
  /** Function parameters and arguments */
  readonly parameters: Record<string, string>
  /** Line number where function was called */
  readonly callLine: number
}

/**
 * Result of script parsing operation.
 */
export interface ScriptParseResult {
  /** Whether parsing was successful */
  readonly success: boolean
  /** Parsed statements if successful */
  readonly statements?: ScriptStatement[]
  /** Error message if parsing failed */
  readonly error?: string
  /** Line number where error occurred */
  readonly errorLine?: number
}

/**
 * Result of script execution operation.
 */
export interface ScriptExecutionResult {
  /** Whether execution completed successfully */
  readonly success: boolean
  /** Final exit code of the script */
  readonly exitCode: number
  /** Standard output from the script */
  readonly stdout: string
  /** Standard error from the script */
  readonly stderr: string
  /** Execution time in milliseconds */
  readonly executionTime: number
  /** Final script context (for debugging) */
  readonly finalContext?: ScriptExecutionContext
  /** Error message if execution failed */
  readonly error?: string
}

/**
 * Configuration options for script execution.
 */
export interface ScriptExecutionOptions {
  /** Maximum execution time in milliseconds */
  readonly timeout?: number
  /** Whether to enable debug logging */
  readonly debug?: boolean
  /** Initial environment variables */
  readonly environment?: Record<string, string>
  /** Script arguments to pass */
  readonly args?: string[]
  /** Working directory for script execution */
  readonly workingDirectory?: string
}

/**
 * Interface for shell script parser implementations.
 */
export interface ShellScriptParser {
  /** Parse a shell script from string content */
  readonly parseScript: (content: string, scriptPath?: string) => ScriptParseResult
  /** Parse a single script line */
  readonly parseLine: (line: string, lineNumber: number) => ScriptStatement
  /** Validate script syntax without execution */
  readonly validateSyntax: (content: string) => ScriptParseResult
}

/**
 * Interface for shell script execution engine.
 */
export interface ShellScriptExecutor {
  /** Execute a parsed script with the given context */
  readonly executeScript: (
    statements: ScriptStatement[],
    context: ScriptExecutionContext,
    options?: ScriptExecutionOptions,
  ) => Promise<ScriptExecutionResult>
  /** Execute a single statement */
  readonly executeStatement: (
    statement: ScriptStatement,
    context: ScriptExecutionContext,
  ) => Promise<ScriptExecutionContext>
  /** Create a new execution context */
  readonly createContext: (options: Partial<ScriptExecutionContext>) => ScriptExecutionContext
}
