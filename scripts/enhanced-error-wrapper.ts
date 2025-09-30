#!/usr/bin/env tsx

/**
 * Enhanced Error Command Wrapper
 * A simple wrapper that applies enhanced error reporting to any command
 */

import process from 'node:process'
import {consola} from 'consola'

import EnhancedErrorReporter from './enhanced-error-reporter.js'

/**
 * Run command with enhanced error reporting wrapper
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    consola.error('Usage: enhanced-error-wrapper <command> [args...]')
    consola.error('Example: enhanced-error-wrapper pnpm build')
    process.exit(1)
  }

  const reporter = EnhancedErrorReporter
  const [command, ...commandArgs] = args

  const exitCode = await reporter.runWithEnhancedErrors(command, commandArgs)
  process.exit(exitCode)
}

main().catch(error => {
  consola.error(`Fatal Error: ${error.message}`)
  process.exit(1)
})
