#!/usr/bin/env tsx

/**
 * Enhanced Error Reporter for Sparkle Monorepo
 * Provides improved error formatting and reporting for TypeScript errors, build failures, and cross-package dependency issues
 *
 * Refactored to use functional programming patterns instead of ES6 classes,
 * following project coding standards.
 */

import type {Buffer} from 'node:buffer'
import {spawn} from 'node:child_process'
import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs'
import {relative, resolve} from 'node:path'
import process from 'node:process'
import {consola} from 'consola'

// ANSI color codes for enhanced output formatting
const colors = {
  red: '\u001B[31m',
  green: '\u001B[32m',
  yellow: '\u001B[33m',
  blue: '\u001B[34m',
  magenta: '\u001B[35m',
  cyan: '\u001B[36m',
  white: '\u001B[37m',
  gray: '\u001B[90m',
  reset: '\u001B[0m',
  bold: '\u001B[1m',
  dim: '\u001B[2m',
  underline: '\u001B[4m',
} as const

// Error pattern matchers
const ERROR_PATTERNS = {
  typescript: /error TS(\d+):(.*)/i,
  build: /build failed|compilation failed|failed to compile/i,
  dependency: /cannot resolve module|module not found|cannot find module/i,
  importError: /cannot find name|property '.*' does not exist|module has no exported member/i,
  syntaxError: /syntax error|unexpected token|unexpected identifier/i,
  typeError: /type '.*' is not assignable to type|argument of type '.*' is not assignable/i,
} as const

interface ErrorContext {
  file?: string
  line?: number
  column?: number
  package?: string
  severity: 'error' | 'warning' | 'info'
  category: keyof typeof ERROR_PATTERNS
  code?: string
  message: string
  suggestion?: string
}

interface PackageInfo {
  name: string
  path: string
  dependencies: string[]
}

/**
 * Enhanced error reporter state for tracking packages and error counts.
 */
interface ErrorReporterState {
  packages: Map<string, PackageInfo>
  errorCount: number
  warningCount: number
}

/**
 * Creates initial state for error reporter.
 */
function createErrorReporterState(): ErrorReporterState {
  const state: ErrorReporterState = {
    packages: new Map(),
    errorCount: 0,
    warningCount: 0,
  }

  loadPackageInfo(state)
  return state
}

/**
 * Load package information for cross-package error analysis.
 */
function loadPackageInfo(state: ErrorReporterState): void {
  const rootDir = process.cwd()
  const packagesDir = resolve(rootDir, 'packages')
  const appsDir = resolve(rootDir, 'apps')

  // Load packages from packages/ directory
  if (existsSync(packagesDir)) {
    loadPackagesFromDir(state, packagesDir)
  }

  // Load packages from apps/ directory
  if (existsSync(appsDir)) {
    loadPackagesFromDir(state, appsDir)
  }
}

/**
 * Load package information from a directory.
 */
function loadPackagesFromDir(state: ErrorReporterState, dir: string): void {
  try {
    const entries = readdirSync(dir)

    for (const entry of entries) {
      const packagePath = resolve(dir, entry)
      const packageJsonPath = resolve(packagePath, 'package.json')

      if (statSync(packagePath).isDirectory() && existsSync(packageJsonPath)) {
        try {
          const packageJsonContent = readFileSync(packageJsonPath, 'utf-8')
          const packageJson = JSON.parse(packageJsonContent)

          const dependencies = [
            ...Object.keys(packageJson.dependencies || {}),
            ...Object.keys(packageJson.devDependencies || {}),
            ...Object.keys(packageJson.peerDependencies || {}),
          ]

          state.packages.set(packageJson.name || entry, {
            name: packageJson.name || entry,
            path: packagePath,
            dependencies,
          })
        } catch {
          // Skip invalid package.json files
        }
      }
    }
  } catch {
    // Skip directories that can't be read
  }
}

/**
 * Parse error context from error output.
 */
function parseErrorContext(
  state: ErrorReporterState,
  errorLine: string,
  _previousLines: string[] = [],
): ErrorContext | null {
  // TypeScript error parsing - more specific regex patterns
  const tsMatch = errorLine.match(/^(.+)\((\d+),(\d+)\):\s+(error|warning|info)\s+TS(\d+):\s(.*)$/i)
  if (tsMatch) {
    const [, file, line, column, severity, code, message] = tsMatch
    return {
      file: file.trim(),
      line: Number.parseInt(line, 10),
      column: Number.parseInt(column, 10),
      severity: severity.toLowerCase() as 'error' | 'warning' | 'info',
      category: 'typescript',
      code: `TS${code}`,
      message: message.trim(),
      package: getPackageFromFile(state, file),
      suggestion: generateSuggestion(code, message),
    }
  }

  // Generic error parsing with file reference - more specific regex
  const fileMatch = errorLine.match(/^([^:]+):(\d+):(\d+):\s+(error|warning|info):\s(.*)$/i)
  if (fileMatch) {
    const [, file, line, column, severity, message] = fileMatch
    return {
      file: file.trim(),
      line: Number.parseInt(line, 10),
      column: Number.parseInt(column, 10),
      severity: severity.toLowerCase() as 'error' | 'warning' | 'info',
      category: categorizeError(message),
      message: message.trim(),
      package: getPackageFromFile(state, file),
      suggestion: generateSuggestion(undefined, message),
    }
  }

  // Build error parsing
  if (ERROR_PATTERNS.build.test(errorLine)) {
    return {
      severity: 'error',
      category: 'build',
      message: errorLine.trim(),
      suggestion: 'Check build configuration and dependencies',
    }
  }

  // Dependency error parsing
  if (ERROR_PATTERNS.dependency.test(errorLine)) {
    return {
      severity: 'error',
      category: 'dependency',
      message: errorLine.trim(),
      suggestion: generateDependencySuggestion(errorLine),
    }
  }

  return null
}

/**
 * Categorize error based on message content.
 */
function categorizeError(message: string): keyof typeof ERROR_PATTERNS {
  if (ERROR_PATTERNS.importError.test(message)) return 'importError'
  if (ERROR_PATTERNS.syntaxError.test(message)) return 'syntaxError'
  if (ERROR_PATTERNS.typeError.test(message)) return 'typeError'
  if (ERROR_PATTERNS.dependency.test(message)) return 'dependency'
  return 'typescript'
}

/**
 * Get package name from file path.
 */
function getPackageFromFile(state: ErrorReporterState, filePath: string): string | undefined {
  const normalizedPath = resolve(filePath)
  for (const [name, info] of state.packages) {
    if (normalizedPath.startsWith(info.path)) {
      return name
    }
  }
  return undefined
}

/**
 * Generate helpful suggestions based on error code and message.
 */
function generateSuggestion(code?: string, message?: string, _file?: string): string | undefined {
  if (!code && !message) return undefined

  // TypeScript specific suggestions
  if (code) {
    switch (code) {
      case 'TS2307':
        return 'Check if the module is installed and properly exported. For internal packages, ensure workspace:* protocol is used.'
      case 'TS2345':
        return 'Check argument types and ensure they match the expected parameter types.'
      case 'TS2339':
        return 'Verify that the property exists on the type. Check for typos or missing imports.'
      case 'TS2322':
        return 'Check type compatibility. You may need type assertion or interface adjustment.'
      case 'TS2554':
        return 'Check function call arguments. You may be missing required parameters.'
      case 'TS2531':
        return 'Add null check or use optional chaining (?.) to handle potential null/undefined values.'
      default:
        break
    }
  }

  // Message-based suggestions
  if (message) {
    if (message.includes('Cannot resolve module') || message.includes('Module not found')) {
      return generateDependencySuggestion(message)
    }
    if (message.includes('Property') && message.includes('does not exist')) {
      return 'Check property name spelling and ensure the type definition includes this property.'
    }
    if (message.includes('not assignable to type')) {
      return 'Check type compatibility. Consider using type assertion or updating type definitions.'
    }
  }

  return undefined
}

/**
 * Generate dependency-specific suggestions.
 */
function generateDependencySuggestion(message: string): string {
  if (message.includes('@sparkle/')) {
    return 'Internal package dependency issue. Check that the package is built and uses workspace:* protocol.'
  }
  return 'Check if the dependency is installed with "pnpm install" and properly configured.'
}

/**
 * Format TypeScript errors with enhanced context.
 */
function formatTypeScriptError(context: ErrorContext): void {
  const icon = context.severity === 'error' ? '🚨' : context.severity === 'warning' ? '⚠️' : 'ℹ️'
  const color = context.severity === 'error' ? colors.red : context.severity === 'warning' ? colors.yellow : colors.blue

  consola.error(`${color}${colors.bold}${icon} TypeScript ${context.severity.toUpperCase()}${colors.reset}`)

  if (context.file) {
    const relativePath = relative(process.cwd(), context.file)
    consola.error(`${colors.cyan}📁 File:${colors.reset} ${relativePath}:${context.line}:${context.column}`)
  }

  if (context.package) {
    consola.error(`${colors.magenta}📦 Package:${colors.reset} ${context.package}`)
  }

  if (context.code) {
    consola.error(`${colors.yellow}🔢 Code:${colors.reset} ${context.code}`)
  }

  consola.error(`${colors.white}💬 Message:${colors.reset} ${context.message}`)

  if (context.suggestion) {
    consola.error(`${colors.green}💡 Suggestion:${colors.reset} ${context.suggestion}`)
  }

  consola.error('') // Empty line for readability
}

/**
 * Format build errors with enhanced context.
 */
function formatBuildError(context: ErrorContext): void {
  consola.error(`${colors.red}${colors.bold}🔥 BUILD ERROR${colors.reset}`)

  if (context.package) {
    consola.error(`${colors.magenta}📦 Package:${colors.reset} ${context.package}`)
  }

  consola.error(`${colors.white}💬 Message:${colors.reset} ${context.message}`)

  if (context.suggestion) {
    consola.error(`${colors.green}💡 Suggestion:${colors.reset} ${context.suggestion}`)
  }

  consola.error('') // Empty line for readability
}

/**
 * Format dependency errors with cross-package context.
 */
function formatDependencyError(state: ErrorReporterState, context: ErrorContext): void {
  consola.error(`${colors.yellow}${colors.bold}🔗 DEPENDENCY ERROR${colors.reset}`)

  if (context.package) {
    consola.error(`${colors.magenta}📦 Package:${colors.reset} ${context.package}`)

    // Show package dependencies for context
    const packageInfo = state.packages.get(context.package)
    if (packageInfo) {
      const sparkledeps = packageInfo.dependencies.filter(dep => dep.startsWith('@sparkle/'))
      if (sparkledeps.length > 0) {
        consola.error(`${colors.cyan}🔗 Internal Dependencies:${colors.reset} ${sparkledeps.join(', ')}`)
      }
    }
  }

  consola.error(`${colors.white}💬 Message:${colors.reset} ${context.message}`)

  if (context.suggestion) {
    consola.error(`${colors.green}💡 Suggestion:${colors.reset} ${context.suggestion}`)
  }

  consola.error('') // Empty line for readability
}

/**
 * Process and format errors from command output.
 */
function processErrorLine(state: ErrorReporterState, line: string, previousLines: string[] = []): void {
  const context = parseErrorContext(state, line, previousLines)
  if (!context) return

  // Update counters
  if (context.severity === 'error') {
    state.errorCount++
  } else if (context.severity === 'warning') {
    state.warningCount++
  }

  // Format based on error category
  switch (context.category) {
    case 'typescript':
    case 'importError':
    case 'syntaxError':
    case 'typeError':
      formatTypeScriptError(context)
      break
    case 'build':
      formatBuildError(context)
      break
    case 'dependency':
      formatDependencyError(state, context)
      break
    default:
      // Fallback to basic formatting
      consola.error(line)
      break
  }
}

/**
 * Run command with enhanced error reporting.
 */
function runWithEnhancedErrors(
  state: ErrorReporterState,
  command: string,
  args: string[] = [],
  options: {cwd?: string} = {},
): Promise<number> {
  return new Promise(resolve => {
    const childProcess = spawn(command, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: options.cwd || process.cwd(),
      shell: true,
    })

    const recentLines: string[] = []

    // Process stdout
    childProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString()

      // Pass through normal output but look for errors
      const lines = output.split('\n')
      for (const line of lines) {
        if (line.trim()) {
          consola.log(line)
          processErrorLine(state, line, recentLines)
          recentLines.push(line)
          if (recentLines.length > 5) recentLines.shift()
        }
      }
    })

    // Process stderr with enhanced formatting
    childProcess.stderr?.on('data', (data: Buffer) => {
      const output = data.toString()

      const lines = output.split('\n')
      for (const line of lines) {
        if (line.trim()) {
          processErrorLine(state, line, recentLines)
          recentLines.push(line)
          if (recentLines.length > 5) recentLines.shift()
        }
      }
    })

    childProcess.on('close', (code: number | null) => {
      const exitCode = code || 0

      // Print summary if there were errors
      if (state.errorCount > 0 || state.warningCount > 0) {
        consola.error('')
        consola.error(`${colors.bold}📊 Error Summary${colors.reset}`)
        if (state.errorCount > 0) {
          consola.error(`${colors.red}❌ Errors: ${state.errorCount}${colors.reset}`)
        }
        if (state.warningCount > 0) {
          consola.error(`${colors.yellow}⚠️ Warnings: ${state.warningCount}${colors.reset}`)
        }
        consola.error('')

        if (state.errorCount > 0) {
          consola.error(`${colors.bold}🔧 Next Steps:${colors.reset}`)
          consola.error(`${colors.cyan}• Review the errors above and follow the suggestions${colors.reset}`)
          consola.error(
            `${colors.cyan}• Run ${colors.bold}pnpm check${colors.reset}${colors.cyan} for comprehensive validation${colors.reset}`,
          )
          consola.error(
            `${colors.cyan}• Run ${colors.bold}pnpm health-check${colors.reset}${colors.cyan} to verify environment setup${colors.reset}`,
          )
          consola.error('')
        }
      }

      resolve(exitCode)
    })

    childProcess.on('error', (error: Error) => {
      consola.error(`${colors.red}${colors.bold}🚨 Process Error:${colors.reset} ${error.message}`)
      resolve(1)
    })
  })
}

/**
 * Reset error counters.
 */
function resetErrorCounts(state: ErrorReporterState): void {
  state.errorCount = 0
  state.warningCount = 0
}

/**
 * Get current error and warning counts.
 */
function getErrorCounts(state: ErrorReporterState): {errors: number; warnings: number} {
  return {errors: state.errorCount, warnings: state.warningCount}
}

/**
 * Enhanced error reporter interface for compatibility with existing code.
 * Provides the same interface as the old class but uses functional implementation.
 */
interface EnhancedErrorReporter {
  runWithEnhancedErrors: (command: string, args?: string[], options?: {cwd?: string}) => Promise<number>
  reset: () => void
  getCounts: () => {errors: number; warnings: number}
}

/**
 * Create an enhanced error reporter instance.
 * Uses functional implementation while providing class-like interface for compatibility.
 */
function createEnhancedErrorReporter(): EnhancedErrorReporter {
  const state = createErrorReporterState()

  return {
    runWithEnhancedErrors: (command: string, args: string[] = [], options: {cwd?: string} = {}) =>
      runWithEnhancedErrors(state, command, args, options),
    reset: () => resetErrorCounts(state),
    getCounts: () => getErrorCounts(state),
  }
}

/**
 * CLI interface for enhanced error reporting.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    consola.error(`${colors.red}Usage: enhanced-error-reporter <command> [args...]${colors.reset}`)
    consola.error(`${colors.yellow}Example: enhanced-error-reporter tsc --noEmit${colors.reset}`)
    process.exit(1)
  }

  const reporter = createEnhancedErrorReporter()
  const [command, ...commandArgs] = args

  consola.log(
    `${colors.blue}${colors.bold}🚀 Running with enhanced error reporting:${colors.reset} ${command} ${commandArgs.join(' ')}`,
  )
  consola.log('')

  const exitCode = await reporter.runWithEnhancedErrors(command, commandArgs)
  process.exit(exitCode)
}

// Export for use as module - maintain backward compatibility
export default createEnhancedErrorReporter()

// Run as CLI if executed directly (check for import.meta.main in ES modules)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    consola.error(`${colors.red}${colors.bold}🚨 Fatal Error:${colors.reset} ${error.message}`)
    process.exit(1)
  })
}
