#!/usr/bin/env tsx

/**
 * Enhanced Error Reporter for Sparkle Monorepo
 * Provides improved error formatting and reporting for TypeScript errors, build failures, and cross-package dependency issues
 */

import type {Buffer} from 'node:buffer'
import {spawn} from 'node:child_process'
import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs'
import {relative, resolve} from 'node:path'
import process from 'node:process'

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
 * Enhanced Error Reporter class for processing and formatting build errors
 */
export class EnhancedErrorReporter {
  private packages: Map<string, PackageInfo> = new Map()
  private errorCount = 0
  private warningCount = 0

  constructor() {
    this.loadPackageInfo()
  }

  /**
   * Load package information for cross-package error analysis
   */
  private loadPackageInfo(): void {
    const rootDir = process.cwd()
    const packagesDir = resolve(rootDir, 'packages')
    const appsDir = resolve(rootDir, 'apps')

    // Load packages from packages/ directory
    if (existsSync(packagesDir)) {
      this.loadPackagesFromDir(packagesDir)
    }

    // Load packages from apps/ directory
    if (existsSync(appsDir)) {
      this.loadPackagesFromDir(appsDir)
    }
  }

  /**
   * Load package information from a directory
   */
  private loadPackagesFromDir(dir: string): void {
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

            this.packages.set(packageJson.name || entry, {
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
   * Parse error context from error output
   */
  private parseErrorContext(errorLine: string, _previousLines: string[] = []): ErrorContext | null {
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
        package: this.getPackageFromFile(file),
        suggestion: this.generateSuggestion(code, message),
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
        category: this.categorizeError(message),
        message: message.trim(),
        package: this.getPackageFromFile(file),
        suggestion: this.generateSuggestion(undefined, message),
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
        suggestion: this.generateDependencySuggestion(errorLine),
      }
    }

    return null
  }

  /**
   * Categorize error based on message content
   */
  private categorizeError(message: string): keyof typeof ERROR_PATTERNS {
    if (ERROR_PATTERNS.importError.test(message)) return 'importError'
    if (ERROR_PATTERNS.syntaxError.test(message)) return 'syntaxError'
    if (ERROR_PATTERNS.typeError.test(message)) return 'typeError'
    if (ERROR_PATTERNS.dependency.test(message)) return 'dependency'
    return 'typescript'
  }

  /**
   * Get package name from file path
   */
  private getPackageFromFile(filePath: string): string | undefined {
    const normalizedPath = resolve(filePath)
    for (const [name, info] of this.packages) {
      if (normalizedPath.startsWith(info.path)) {
        return name
      }
    }
    return undefined
  }

  /**
   * Generate helpful suggestions based on error code and message
   */
  private generateSuggestion(code?: string, message?: string, _file?: string): string | undefined {
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
        return this.generateDependencySuggestion(message)
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
   * Generate dependency-specific suggestions
   */
  private generateDependencySuggestion(message: string): string {
    if (message.includes('@sparkle/')) {
      return 'Internal package dependency issue. Check that the package is built and uses workspace:* protocol.'
    }
    return 'Check if the dependency is installed with "pnpm install" and properly configured.'
  }

  /**
   * Format TypeScript errors with enhanced context
   */
  private formatTypeScriptError(context: ErrorContext): void {
    const icon = context.severity === 'error' ? '🚨' : context.severity === 'warning' ? '⚠️' : 'ℹ️'
    const color =
      context.severity === 'error' ? colors.red : context.severity === 'warning' ? colors.yellow : colors.blue

    console.error(`${color}${colors.bold}${icon} TypeScript ${context.severity.toUpperCase()}${colors.reset}`)

    if (context.file) {
      const relativePath = relative(process.cwd(), context.file)
      console.error(`${colors.cyan}📁 File:${colors.reset} ${relativePath}:${context.line}:${context.column}`)
    }

    if (context.package) {
      console.error(`${colors.magenta}📦 Package:${colors.reset} ${context.package}`)
    }

    if (context.code) {
      console.error(`${colors.yellow}🔢 Code:${colors.reset} ${context.code}`)
    }

    console.error(`${colors.white}💬 Message:${colors.reset} ${context.message}`)

    if (context.suggestion) {
      console.error(`${colors.green}💡 Suggestion:${colors.reset} ${context.suggestion}`)
    }

    console.error('') // Empty line for readability
  }

  /**
   * Format build errors with enhanced context
   */
  private formatBuildError(context: ErrorContext): void {
    console.error(`${colors.red}${colors.bold}🔥 BUILD ERROR${colors.reset}`)

    if (context.package) {
      console.error(`${colors.magenta}📦 Package:${colors.reset} ${context.package}`)
    }

    console.error(`${colors.white}💬 Message:${colors.reset} ${context.message}`)

    if (context.suggestion) {
      console.error(`${colors.green}💡 Suggestion:${colors.reset} ${context.suggestion}`)
    }

    console.error('') // Empty line for readability
  }

  /**
   * Format dependency errors with cross-package context
   */
  private formatDependencyError(context: ErrorContext): void {
    console.error(`${colors.yellow}${colors.bold}🔗 DEPENDENCY ERROR${colors.reset}`)

    if (context.package) {
      console.error(`${colors.magenta}📦 Package:${colors.reset} ${context.package}`)

      // Show package dependencies for context
      const packageInfo = this.packages.get(context.package)
      if (packageInfo) {
        const sparkledeps = packageInfo.dependencies.filter(dep => dep.startsWith('@sparkle/'))
        if (sparkledeps.length > 0) {
          console.error(`${colors.cyan}🔗 Internal Dependencies:${colors.reset} ${sparkledeps.join(', ')}`)
        }
      }
    }

    console.error(`${colors.white}💬 Message:${colors.reset} ${context.message}`)

    if (context.suggestion) {
      console.error(`${colors.green}💡 Suggestion:${colors.reset} ${context.suggestion}`)
    }

    console.error('') // Empty line for readability
  }

  /**
   * Process and format errors from command output
   */
  private processErrorLine(line: string, previousLines: string[] = []): void {
    const context = this.parseErrorContext(line, previousLines)
    if (!context) return

    // Update counters
    if (context.severity === 'error') {
      this.errorCount++
    } else if (context.severity === 'warning') {
      this.warningCount++
    }

    // Format based on error category
    switch (context.category) {
      case 'typescript':
      case 'importError':
      case 'syntaxError':
      case 'typeError':
        this.formatTypeScriptError(context)
        break
      case 'build':
        this.formatBuildError(context)
        break
      case 'dependency':
        this.formatDependencyError(context)
        break
      default:
        // Fallback to basic formatting
        console.error(line)
        break
    }
  }

  /**
   * Run command with enhanced error reporting
   */
  runWithEnhancedErrors(command: string, args: string[] = [], options: {cwd?: string} = {}): Promise<number> {
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
            console.log(line)
            this.processErrorLine(line, recentLines)
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
            this.processErrorLine(line, recentLines)
            recentLines.push(line)
            if (recentLines.length > 5) recentLines.shift()
          }
        }
      })

      childProcess.on('close', (code: number | null) => {
        const exitCode = code || 0

        // Print summary if there were errors
        if (this.errorCount > 0 || this.warningCount > 0) {
          console.error('')
          console.error(`${colors.bold}📊 Error Summary${colors.reset}`)
          if (this.errorCount > 0) {
            console.error(`${colors.red}❌ Errors: ${this.errorCount}${colors.reset}`)
          }
          if (this.warningCount > 0) {
            console.error(`${colors.yellow}⚠️ Warnings: ${this.warningCount}${colors.reset}`)
          }
          console.error('')

          if (this.errorCount > 0) {
            console.error(`${colors.bold}🔧 Next Steps:${colors.reset}`)
            console.error(`${colors.cyan}• Review the errors above and follow the suggestions${colors.reset}`)
            console.error(
              `${colors.cyan}• Run ${colors.bold}pnpm check${colors.reset}${colors.cyan} for comprehensive validation${colors.reset}`,
            )
            console.error(
              `${colors.cyan}• Run ${colors.bold}pnpm health-check${colors.reset}${colors.cyan} to verify environment setup${colors.reset}`,
            )
            console.error('')
          }
        }

        resolve(exitCode)
      })

      childProcess.on('error', (error: Error) => {
        console.error(`${colors.red}${colors.bold}🚨 Process Error:${colors.reset} ${error.message}`)
        resolve(1)
      })
    })
  }

  /**
   * Reset error counters
   */
  reset(): void {
    this.errorCount = 0
    this.warningCount = 0
  }

  /**
   * Get current error and warning counts
   */
  getCounts(): {errors: number; warnings: number} {
    return {errors: this.errorCount, warnings: this.warningCount}
  }
}

/**
 * CLI interface for enhanced error reporting
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error(`${colors.red}Usage: enhanced-error-reporter <command> [args...]${colors.reset}`)
    console.error(`${colors.yellow}Example: enhanced-error-reporter tsc --noEmit${colors.reset}`)
    process.exit(1)
  }

  const reporter = new EnhancedErrorReporter()
  const [command, ...commandArgs] = args

  console.log(
    `${colors.blue}${colors.bold}🚀 Running with enhanced error reporting:${colors.reset} ${command} ${commandArgs.join(' ')}`,
  )
  console.log('')

  const exitCode = await reporter.runWithEnhancedErrors(command, commandArgs)
  process.exit(exitCode)
}

// Export for use as module
export default EnhancedErrorReporter

// Run as CLI if executed directly (check for import.meta.main in ES modules)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(`${colors.red}${colors.bold}🚨 Fatal Error:${colors.reset} ${error.message}`)
    process.exit(1)
  })
}
