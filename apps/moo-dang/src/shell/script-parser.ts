/**
 * Shell script parser for parsing .sh files in the moo-dang shell environment.
 *
 * Provides robust parsing of shell script syntax including comments, variable assignments,
 * commands with arguments and redirections, and basic control structures. Designed to
 * handle common shell scripting patterns while maintaining security in browser execution.
 */

import type {
  AssignmentContent,
  CommandContent,
  CommentContent,
  ConditionalContent,
  EmptyContent,
  ExitContent,
  FunctionContent,
  LoopContent,
  ReturnContent,
  ScriptParseResult,
  ScriptRedirection,
  ScriptStatement,
  ScriptStatementContent,
  ScriptStatementType,
  ShellScriptParser,
} from './script-types'

import {consola} from 'consola'
import {parseCommand} from './parser'

/**
 * Parse comment statement content.
 */
function parseCommentContent(line: string): CommentContent {
  return {
    text: line.startsWith('#') ? line.slice(1).trim() : line,
  }
}

/**
 * Parse variable assignment statement content.
 */
function parseAssignmentContent(line: string): AssignmentContent {
  const exported = line.startsWith('export ')
  const assignmentPart = exported ? line.slice(7).trim() : line

  const equalIndex = assignmentPart.indexOf('=')
  if (equalIndex === -1) {
    throw new TypeError('Invalid assignment syntax: missing =')
  }

  const variable = assignmentPart.slice(0, equalIndex).trim()
  const value = assignmentPart.slice(equalIndex + 1)

  // Validate variable name
  if (!/^[a-z_]\w*$/i.test(variable)) {
    throw new TypeError(`Invalid variable name: ${variable}`)
  }

  return {
    variable,
    value,
    exported,
  }
}

/**
 * Parse conditional statement content (if/elif/else/fi).
 */
function parseConditionalContent(line: string): ConditionalContent {
  if (line.startsWith('if ')) {
    const condition = line.slice(3).trim()
    if (condition.startsWith('[') && condition.endsWith(']')) {
      return {
        conditionalType: 'if',
        condition: condition.slice(1, -1).trim(),
      }
    }
    return {
      conditionalType: 'if',
      condition,
    }
  }

  if (line.startsWith('elif ')) {
    const condition = line.slice(5).trim()
    if (condition.startsWith('[') && condition.endsWith(']')) {
      return {
        conditionalType: 'elif',
        condition: condition.slice(1, -1).trim(),
      }
    }
    return {
      conditionalType: 'elif',
      condition,
    }
  }

  if (line === 'else') {
    return {
      conditionalType: 'else',
    }
  }

  if (line === 'fi') {
    return {
      conditionalType: 'fi',
    }
  }

  throw new TypeError(`Invalid conditional statement: ${line}`)
}

/**
 * Parse loop statement content (for/while/until/do/done).
 */
function parseLoopContent(line: string): LoopContent {
  if (line.startsWith('for ')) {
    const forContent = line.slice(4).trim()
    const inIndex = forContent.indexOf(' in ')

    if (inIndex === -1) {
      throw new TypeError('Invalid for loop syntax: missing "in"')
    }

    const variable = forContent.slice(0, inIndex).trim()
    const iteratorPart = forContent.slice(inIndex + 4).trim()
    const iterator = parseCommand(iteratorPart)

    return {
      loopType: 'for',
      variable,
      iterator,
    }
  }

  if (line.startsWith('while ')) {
    const condition = line.slice(6).trim()
    return {
      loopType: 'while',
      condition,
    }
  }

  if (line.startsWith('until ')) {
    const condition = line.slice(6).trim()
    return {
      loopType: 'until',
      condition,
    }
  }

  if (line === 'do') {
    return {
      loopType: 'do',
    }
  }

  if (line === 'done') {
    return {
      loopType: 'done',
    }
  }

  throw new TypeError(`Invalid loop statement: ${line}`)
}

/**
 * Parse function definition statement content.
 */
function parseFunctionContent(line: string): FunctionContent {
  // Handle both "function name()" and "name()" syntax
  let functionMatch

  if (line.startsWith('function ')) {
    functionMatch = line.match(/^function\s+([a-z_]\w*)\s*\(\s*\)/i)
  } else {
    functionMatch = line.match(/^([a-z_]\w*)\s*\(\s*\)/i)
  }

  if (!functionMatch || !functionMatch[1]) {
    throw new TypeError(`Invalid function syntax: ${line}`)
  }

  return {
    name: functionMatch[1],
    parameters: [], // Simple functions without parameters for now
    body: [], // Function body will be parsed separately
  }
}

/**
 * Parse exit statement content.
 */
function parseExitContent(line: string): ExitContent {
  const parts = parseCommand(line)
  const code = parts.length > 1 && parts[1] ? Number.parseInt(parts[1], 10) : 0

  if (Number.isNaN(code)) {
    throw new TypeError(`Invalid exit code: ${parts[1]}`)
  }

  return {
    code,
  }
}

/**
 * Parse return statement content.
 */
function parseReturnContent(line: string): ReturnContent {
  const parts = parseCommand(line)
  const code = parts.length > 1 && parts[1] ? Number.parseInt(parts[1], 10) : 0

  if (Number.isNaN(code)) {
    throw new TypeError(`Invalid return code: ${parts[1]}`)
  }

  return {
    code,
  }
}

/**
 * Parse empty line content.
 */
function parseEmptyContent(): EmptyContent {
  return {
    placeholder: null,
  }
}

/**
 * Check if a line represents a variable assignment.
 */
function isAssignmentStatement(line: string): boolean {
  const cleanLine = line.startsWith('export ') ? line.slice(7).trim() : line
  return /^[a-z_]\w*=/i.test(cleanLine)
}

/**
 * Check if a line represents a conditional statement.
 */
function isConditionalStatement(line: string): boolean {
  return line.startsWith('if ') || line.startsWith('elif ') || line === 'else' || line === 'fi'
}

/**
 * Check if a line represents a loop statement.
 */
function isLoopStatement(line: string): boolean {
  return (
    line.startsWith('for ') ||
    line.startsWith('while ') ||
    line.startsWith('until ') ||
    line === 'do' ||
    line === 'done'
  )
}

/**
 * Check if a line represents a function definition.
 */
function isFunctionStatement(line: string): boolean {
  return line.startsWith('function ') || /^[a-z_]\w*\s*\(\s*\)/i.test(line)
}

/**
 * Determine the type of a shell script statement based on its content.
 */
function determineStatementType(line: string): ScriptStatementType {
  // Empty lines
  if (line.length === 0) {
    return 'empty'
  }

  // Comments
  if (line.startsWith('#')) {
    return 'comment'
  }

  // Variable assignments (including export)
  if (isAssignmentStatement(line)) {
    return 'assignment'
  }

  // Control structures
  if (isConditionalStatement(line)) {
    return 'conditional'
  }

  if (isLoopStatement(line)) {
    return 'loop'
  }

  if (isFunctionStatement(line)) {
    return 'function'
  }

  // Exit and return statements
  if (line.startsWith('exit')) {
    return 'exit'
  }

  if (line.startsWith('return')) {
    return 'return'
  }

  // Default to command execution
  return 'command'
}

/**
 * Parse command statement content with arguments and redirections.
 */
function parseCommandContent(line: string): CommandContent {
  const background = line.endsWith(' &')
  const cleanLine = background ? line.slice(0, -1).trim() : line

  // Parse redirections
  const redirections = extractRedirections(cleanLine)
  const commandLine = removeRedirections(cleanLine)

  // Parse command and arguments using existing parser
  const parts = parseCommand(commandLine)
  const command = parts[0] || ''
  const args = parts.slice(1)

  return {
    command,
    args,
    background,
    redirections,
  }
}

/**
 * Extract redirection operators from a command line.
 */
function extractRedirections(line: string): ScriptRedirection[] {
  const redirections: ScriptRedirection[] = []
  const redirectionPattern = /\s*(>>|>|<|2>|&>)\s*(\S+)/g
  const matches = Array.from(line.matchAll(redirectionPattern))

  for (const match of matches) {
    const operator = match[1]
    const target = match[2]

    if (operator && target) {
      redirections.push({
        operator: operator as ScriptRedirection['operator'],
        target,
      })
    }
  }

  return redirections
}

/**
 * Remove redirection operators from a command line.
 */
function removeRedirections(line: string): string {
  return line.replaceAll(/\s*(>>|>|<|2>|&>)\s*\S+/g, '').trim()
}

/**
 * Count statement types for debugging and logging.
 */
function countStatementTypes(statements: ScriptStatement[]): Record<string, number> {
  const counts: Record<string, number> = {}

  for (const statement of statements) {
    counts[statement.type] = (counts[statement.type] || 0) + 1
  }

  return counts
}

/**
 * Parse statement content based on its determined type.
 */
function parseStatementContent(line: string, type: ScriptStatementType): ScriptStatementContent {
  switch (type) {
    case 'command':
      return parseCommandContent(line)
    case 'comment':
      return parseCommentContent(line)
    case 'assignment':
      return parseAssignmentContent(line)
    case 'conditional':
      return parseConditionalContent(line)
    case 'loop':
      return parseLoopContent(line)
    case 'function':
      return parseFunctionContent(line)
    case 'exit':
      return parseExitContent(line)
    case 'return':
      return parseReturnContent(line)
    case 'empty':
      return parseEmptyContent()
    default:
      throw new TypeError(`Unknown statement type: ${type}`)
  }
}

/**
 * Parse a single line of shell script into a structured statement.
 */
function parseLine(line: string, lineNumber: number): ScriptStatement {
  const trimmed = line.trim()

  // Determine statement type and parse accordingly
  const statementType = determineStatementType(trimmed)
  const content = parseStatementContent(trimmed, statementType)

  return {
    type: statementType,
    line,
    lineNumber,
    content,
    requiresExecution: statementType !== 'comment' && statementType !== 'empty',
  }
}

/**
 * Shell script parser implementation with comprehensive syntax support.
 *
 * Handles common shell scripting constructs while maintaining security boundaries
 * appropriate for browser-based execution. Provides detailed error reporting and
 * graceful handling of syntax errors for interactive script development.
 */
export function createShellScriptParser(): ShellScriptParser {
  return {
    parseScript: (content: string, scriptPath = ''): ScriptParseResult => {
      try {
        const lines = content.split('\n')
        const statements: ScriptStatement[] = []

        for (const [index, line] of lines.entries()) {
          try {
            const statement = parseLine(line, index + 1)
            statements.push(statement)
          } catch (error) {
            consola.error('Script parsing error', {
              line: index + 1,
              content: line,
              scriptPath,
              error: error instanceof Error ? error.message : String(error),
            })

            return {
              success: false,
              error: `Syntax error on line ${index + 1}: ${error instanceof Error ? error.message : String(error)}`,
              errorLine: index + 1,
            }
          }
        }

        consola.debug('Script parsed successfully', {
          scriptPath,
          totalLines: lines.length,
          statements: statements.length,
          types: countStatementTypes(statements),
        })

        return {
          success: true,
          statements,
        }
      } catch (error) {
        consola.error('Script parsing failed', {
          scriptPath,
          error: error instanceof Error ? error.message : String(error),
        })

        return {
          success: false,
          error: `Parsing failed: ${error instanceof Error ? error.message : String(error)}`,
        }
      }
    },

    parseLine,

    validateSyntax: (content: string): ScriptParseResult => {
      // For now, syntax validation is the same as parsing
      // In a more sophisticated implementation, this could do lighter validation
      return createShellScriptParser().parseScript(content, '<validation>')
    },
  }
}
