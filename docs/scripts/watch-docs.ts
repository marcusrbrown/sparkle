import {dirname, join} from 'node:path'
import process from 'node:process'
import {fileURLToPath} from 'node:url'

import {watch} from 'chokidar'

import {DocumentationAutomator} from './automation.js'

const filename = fileURLToPath(import.meta.url)
const scriptDir = dirname(filename)
const projectRoot = join(scriptDir, '../..')

interface WatchOptions {
  /** Verbose logging */
  verbose?: boolean
  /** Debounce delay in milliseconds */
  debounce?: number
  /** Watch only specific packages */
  packages?: string[]
  /** Enable dry run mode (don't actually regenerate docs) */
  dryRun?: boolean
}

/**
 * Development file watcher for automatic documentation regeneration.
 *
 * Monitors source files in @sparkle packages and automatically triggers
 * documentation regeneration when changes are detected. Includes intelligent
 * debouncing, change filtering, and integration with the existing automation system.
 *
 * Features:
 * - Watches TypeScript source files in all @sparkle packages
 * - Debounced regeneration to avoid excessive builds
 * - Smart change detection (ignores build artifacts, tests, etc.)
 * - Graceful error handling and recovery
 * - Development-optimized regeneration (faster, incremental)
 * - Real-time status reporting
 */
export class DocumentationWatcher {
  private automator: DocumentationAutomator
  private options: WatchOptions
  private debounceTimer?: NodeJS.Timeout
  private isRegenerating = false
  private changeQueue = new Set<string>()

  constructor(options: WatchOptions = {}) {
    this.options = {
      verbose: false,
      debounce: 2000, // 2 second debounce by default
      packages: ['ui', 'types', 'utils', 'theme', 'error-testing'],
      dryRun: false,
      ...options,
    }

    this.automator = new DocumentationAutomator({
      dev: true, // Development mode for faster builds
      verbose: this.options.verbose,
    })
  }

  /**
   * Start watching for file changes and set up automated documentation regeneration.
   */
  async start(): Promise<void> {
    const watchPaths = this.getWatchPaths()

    this.log('🔍 Starting documentation file watcher...')
    this.log(`📁 Watching packages: ${this.options.packages?.join(', ')}`)
    this.log(`⏱️  Debounce delay: ${this.options.debounce}ms`)
    this.log(`📂 Watch paths:\n${watchPaths.map(p => `   - ${p}`).join('\n')}`)

    if (this.options.dryRun) {
      this.log('🧪 DRY RUN MODE: Will detect changes but not regenerate documentation')
    }

    const watcher = watch(watchPaths, {
      ignored: this.getIgnorePatterns(),
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    })

    watcher
      .on('change', path => this.handleFileChange('changed', path))
      .on('add', path => this.handleFileChange('added', path))
      .on('unlink', path => this.handleFileChange('removed', path))
      .on('error', error => this.handleError(error as Error))
      .on('ready', () => {
        this.log('✅ File watcher is ready and monitoring for changes')
        this.log('💡 Press Ctrl+C to stop watching')
      })

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.log('\n🛑 Stopping documentation watcher...')
      watcher.close()
      process.exit(0)
    })

    process.on('SIGTERM', () => {
      watcher.close()
      process.exit(0)
    })
  }

  /**
   * Get the paths to watch for changes.
   */
  private getWatchPaths(): string[] {
    const paths: string[] = []

    for (const packageName of this.options.packages || []) {
      const packagePath = join(projectRoot, 'packages', packageName, 'src')
      paths.push(`${packagePath}/**/*.{ts,tsx,js,jsx}`)
    }

    return paths
  }

  /**
   * Get patterns to ignore when watching files.
   */
  private getIgnorePatterns(): (string | RegExp)[] {
    return [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.turbo/**',
      '**/*.test.{ts,tsx,js,jsx}',
      '**/*.spec.{ts,tsx,js,jsx}',
      '**/*.d.ts',
      '**/.DS_Store',
      '**/coverage/**',
      '**/storybook-static/**',
      '**/.next/**',
      // Ignore temporary files and editor artifacts
      '**/*~',
      '**/*.tmp',
      '**/*.swp',
      '**/.#*',
    ]
  }

  /**
   * Handle file change events with debouncing and intelligent filtering.
   */
  private handleFileChange(event: string, filePath: string): void {
    // Filter out irrelevant changes
    if (!this.isRelevantChange(filePath)) {
      this.log(`⏭️  Ignoring ${event}: ${filePath}`, true)
      return
    }

    this.changeQueue.add(filePath)
    this.log(`📝 Detected ${event}: ${filePath}`)

    // Clear existing debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    // Set new debounce timer
    this.debounceTimer = setTimeout(() => {
      this.triggerRegeneration()
    }, this.options.debounce)
  }

  /**
   * Check if a file change is relevant for documentation regeneration.
   */
  private isRelevantChange(filePath: string): boolean {
    // Only process TypeScript/JavaScript files
    if (!/\.(?:ts|tsx|js|jsx)$/.test(filePath)) {
      return false
    }

    // Ignore test files
    if (/\.(?:test|spec)\.(?:ts|tsx|js|jsx)$/.test(filePath)) {
      return false
    }

    // Ignore type definition files
    if (/\.d\.ts$/.test(filePath)) {
      return false
    }

    // Only process files in the watched packages
    const isInWatchedPackage = this.options.packages?.some(pkg => filePath.includes(`/packages/${pkg}/src/`))

    return isInWatchedPackage || false
  }

  /**
   * Trigger documentation regeneration with change tracking.
   */
  private async triggerRegeneration(): Promise<void> {
    if (this.isRegenerating) {
      this.log('⏳ Documentation regeneration already in progress, queueing changes...')
      return
    }

    const changedFiles = Array.from(this.changeQueue)
    this.changeQueue.clear()

    this.log(`\n🔄 Triggering documentation regeneration for ${changedFiles.length} changed file(s):`)
    for (const file of changedFiles) {
      this.log(`   - ${file}`)
    }

    if (this.options.dryRun) {
      this.log('🧪 DRY RUN: Would regenerate documentation now')
      return
    }

    this.isRegenerating = true
    const startTime = Date.now()

    try {
      await this.automator.generateAll()
      const duration = Date.now() - startTime
      this.log(`✅ Documentation regenerated successfully in ${duration}ms`)
    } catch (error) {
      this.log(`❌ Documentation regeneration failed: ${error}`)
      if (this.options.verbose && error instanceof Error) {
        this.log(`Stack trace: ${error.stack}`)
      }
    } finally {
      this.isRegenerating = false
      this.log('👀 Watching for more changes...\n')
    }
  }

  /**
   * Handle file watcher errors.
   */
  private handleError(error: Error): void {
    this.log(`❌ File watcher error: ${error.message}`)
    if (this.options.verbose) {
      this.log(`Stack trace: ${error.stack}`)
    }
  }

  /**
   * Log message with optional verbose filtering.
   */
  private log(message: string, verboseOnly = false): void {
    if (verboseOnly && !this.options.verbose) {
      return
    }
    console.log(message)
  }
}

/**
 * CLI interface for the documentation watcher.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2)

  const options: WatchOptions = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    dryRun: args.includes('--dry-run'),
  }

  // Parse debounce option
  const debounceIndex = args.findIndex(arg => arg.startsWith('--debounce='))
  if (debounceIndex !== -1) {
    const debounceValue = Number.parseInt(args[debounceIndex].split('=')[1], 10)
    if (!Number.isNaN(debounceValue) && debounceValue > 0) {
      options.debounce = debounceValue
    }
  }

  // Parse packages option
  const packagesIndex = args.findIndex(arg => arg.startsWith('--packages='))
  if (packagesIndex !== -1) {
    const packagesValue = args[packagesIndex].split('=')[1]
    options.packages = packagesValue.split(',').map(p => p.trim())
  }

  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Documentation Watcher - Automatic documentation regeneration for development

Usage:
  tsx scripts/watch-docs.ts [options]

Options:
  --verbose, -v           Enable verbose logging
  --dry-run              Detect changes but don't regenerate documentation
  --debounce=<ms>        Set debounce delay in milliseconds (default: 2000)
  --packages=<list>      Comma-separated list of packages to watch (default: ui,types,utils,theme,error-testing)
  --help, -h             Show this help message

Examples:
  tsx scripts/watch-docs.ts --verbose
  tsx scripts/watch-docs.ts --debounce=1000 --packages=ui,theme
  tsx scripts/watch-docs.ts --dry-run --verbose
`)
    process.exit(0)
  }

  const watcher = new DocumentationWatcher(options)
  await watcher.start()
}

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Documentation watcher failed to start:', error)
    process.exit(1)
  })
}
