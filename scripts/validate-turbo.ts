#!/usr/bin/env tsx

import {existsSync, readFileSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import process from 'node:process'
import {fileURLToPath} from 'node:url'
import {consola} from 'consola'

const filename = fileURLToPath(import.meta.url)
const DIRNAME = dirname(filename)
const rootDir = resolve(DIRNAME, '..')

// ANSI color codes for output formatting
const colors = {
  red: '\u001B[31m',
  green: '\u001B[32m',
  yellow: '\u001B[33m',
  blue: '\u001B[34m',
  magenta: '\u001B[35m',
  cyan: '\u001B[36m',
  reset: '\u001B[0m',
  bold: '\u001B[1m',
} as const

interface PackageInfo {
  name: string
  path: string
  packageJson: PackageJson
}

interface PackageJson {
  name: string
  version?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  [key: string]: unknown
}

interface TurboTask {
  dependsOn?: string[]
  outputs?: string[]
  inputs?: string[]
  cache?: boolean
  persistent?: boolean
  env?: string[]
  [key: string]: unknown
}

interface TurboConfig {
  $schema?: string
  tasks: Record<string, TurboTask>
  globalEnv?: string[]
  globalDependencies?: string[]
  [key: string]: unknown
}

interface ExpectedTaskConfig {
  dependsOn: string[]
  shouldHaveCache: boolean
  shouldHaveOutputs: boolean
}

type ColorKey = keyof typeof colors

class TurboValidator {
  private errors: string[] = []
  private warnings: string[] = []
  private turboConfig: TurboConfig | null = null
  private packages = new Map<string, PackageInfo>()
  private validPackageNames = new Set<string>()

  log(message: string, color: ColorKey = 'reset'): void {
    consola.log(`${colors[color]}${message}${colors.reset}`)
  }

  error(message: string): void {
    this.errors.push(message)
    this.log(`❌ ERROR: ${message}`, 'red')
  }

  warn(message: string): void {
    this.warnings.push(message)
    this.log(`⚠️  WARNING: ${message}`, 'yellow')
  }

  success(message: string): void {
    this.log(`✅ ${message}`, 'green')
  }

  info(message: string): void {
    this.log(`ℹ️  ${message}`, 'blue')
  }

  async loadTurboConfig(): Promise<boolean> {
    const turboPath = resolve(rootDir, 'turbo.json')
    if (!existsSync(turboPath)) {
      this.error('turbo.json file not found')
      return false
    }

    try {
      const content = readFileSync(turboPath, 'utf8')
      this.turboConfig = JSON.parse(content) as TurboConfig
      this.success('turbo.json loaded successfully')
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.error(`Failed to parse turbo.json: ${errorMessage}`)
      return false
    }
  }

  async loadWorkspacePackages(): Promise<boolean> {
    try {
      // Parse workspace packages from pnpm-workspace.yaml
      const packagePaths = ['packages/*', 'apps/*', 'scripts']

      for (const pattern of packagePaths) {
        if (pattern === 'scripts') continue // Skip scripts directory

        const baseDir = pattern.replace('/*', '')
        const packagesDir = resolve(rootDir, baseDir)

        if (!existsSync(packagesDir)) continue

        // For now, manually add known packages since fs.readdirSync with withFileTypes needs different approach
        const knownPackages = [
          'packages/config',
          'packages/error-testing',
          'packages/storybook',
          'packages/theme',
          'packages/types',
          'packages/ui',
          'packages/utils',
          'apps/fro-jive',
          'docs',
        ]

        for (const pkgPath of knownPackages) {
          const fullPath = resolve(rootDir, pkgPath)
          const packageJsonPath = resolve(fullPath, 'package.json')

          if (existsSync(packageJsonPath)) {
            try {
              const pkgJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as PackageJson
              this.packages.set(pkgJson.name, {
                name: pkgJson.name,
                path: fullPath,
                packageJson: pkgJson,
              })
              this.validPackageNames.add(pkgJson.name)
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error)
              this.warn(`Failed to parse package.json for ${pkgPath}: ${errorMessage}`)
            }
          }
        }
      }

      this.success(`Loaded ${this.packages.size} workspace packages`)
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.error(`Failed to load workspace packages: ${errorMessage}`)
      return false
    }
  }

  validateSchema(): boolean {
    this.info('Validating turbo.json schema...')

    if (!this.turboConfig) {
      this.error('Turbo config not loaded')
      return false
    }

    const config = this.turboConfig

    // Check required top-level fields
    if (!config.$schema) {
      this.error('Missing $schema field')
    } else if (!config.$schema.includes('turbo.build/schema.json')) {
      this.error('Invalid $schema URL - should point to turbo.build/schema.json')
    }

    if (!config.tasks) {
      this.error('Missing tasks field')
      return false
    }

    if (typeof config.tasks !== 'object') {
      this.error('tasks field must be an object')
      return false
    }

    // Check global environment variables
    if (config.globalEnv && !Array.isArray(config.globalEnv)) {
      this.error('globalEnv must be an array')
    }

    // Check global dependencies
    if (config.globalDependencies && !Array.isArray(config.globalDependencies)) {
      this.error('globalDependencies must be an array')
    }

    this.success('Schema validation passed')
    return true
  }

  validateTaskDependencies(): void {
    this.info('Validating task dependencies...')

    if (!this.turboConfig) {
      this.error('Turbo config not loaded')
      return
    }

    const tasks = this.turboConfig.tasks
    const taskNames = Object.keys(tasks)

    for (const [taskName, taskConfig] of Object.entries(tasks)) {
      if (!taskConfig.dependsOn) continue

      for (const dependency of taskConfig.dependsOn) {
        if (dependency.startsWith('^')) {
          // Generic dependency like "^build" - this is valid
          const depTask = dependency.slice(1)
          if (!taskNames.includes(depTask)) {
            this.warn(`Task "${taskName}" depends on "^${depTask}" but task "${depTask}" is not defined`)
          }
        } else if (dependency.includes('#')) {
          // Package-specific dependency like "@sparkle/types#build:types"
          const [packageName, packageTask] = dependency.split('#')

          if (!this.validPackageNames.has(packageName)) {
            this.error(`Task "${taskName}" depends on package "${packageName}" which does not exist`)
          }

          if (!taskNames.includes(packageTask)) {
            this.error(`Task "${taskName}" depends on task "${packageTask}" which is not defined`)
          }
        } else if (!taskNames.includes(dependency)) {
          // Direct task dependency
          this.error(`Task "${taskName}" depends on task "${dependency}" which is not defined`)
        }
      }
    }

    this.success('Task dependency validation completed')
  }

  validatePackageReferences(): void {
    this.info('Validating package references...')

    const expectedPackages = [
      '@sparkle/types',
      '@sparkle/utils',
      '@sparkle/theme',
      '@sparkle/config',
      '@sparkle/ui',
      '@sparkle/storybook',
      '@sparkle/error-testing',
      'fro-jive',
    ]

    for (const expectedPkg of expectedPackages) {
      if (!this.validPackageNames.has(expectedPkg)) {
        this.warn(`Expected package "${expectedPkg}" not found in workspace`)
      }
    }

    this.success('Package reference validation completed')
  }

  validateBuildChainConsistency(): void {
    this.info('Validating build chain consistency...')

    if (!this.turboConfig) {
      this.error('Turbo config not loaded')
      return
    }

    const tasks = this.turboConfig.tasks
    const expectedChains: Record<string, ExpectedTaskConfig> = {
      'build:types': {
        dependsOn: [],
        shouldHaveCache: true,
        shouldHaveOutputs: true,
      },
      'build:utils': {
        dependsOn: ['@sparkle/types#build:types'],
        shouldHaveCache: true,
        shouldHaveOutputs: true,
      },
      'build:theme': {
        dependsOn: ['@sparkle/types#build:types', '@sparkle/utils#build:utils'],
        shouldHaveCache: true,
        shouldHaveOutputs: true,
      },
      'build:config': {
        dependsOn: ['@sparkle/theme#build:theme'],
        shouldHaveCache: true,
        shouldHaveOutputs: true,
      },
      'build:ui': {
        dependsOn: ['@sparkle/config#build:config'],
        shouldHaveCache: true,
        shouldHaveOutputs: true,
      },
      'build:storybook': {
        dependsOn: ['@sparkle/ui#build:ui', '@sparkle/theme#build:theme'],
        shouldHaveCache: true,
        shouldHaveOutputs: true,
      },
    }

    for (const [taskName, expected] of Object.entries(expectedChains)) {
      const task = tasks[taskName]
      if (!task) {
        this.error(`Expected build task "${taskName}" is missing`)
        continue
      }

      // Check dependencies
      const actualDeps = task.dependsOn || []
      for (const expectedDep of expected.dependsOn) {
        if (!actualDeps.includes(expectedDep)) {
          this.error(`Task "${taskName}" should depend on "${expectedDep}"`)
        }
      }

      // Check cache setting
      if (expected.shouldHaveCache && task.cache !== true) {
        this.error(`Task "${taskName}" should have cache: true`)
      }

      // Check outputs
      if (expected.shouldHaveOutputs && (!task.outputs || task.outputs.length === 0)) {
        this.error(`Task "${taskName}" should have outputs defined`)
      }
    }

    this.success('Build chain consistency validation completed')
  }

  validatePersistentTasks(): void {
    this.info('Validating persistent task configuration...')

    if (!this.turboConfig) {
      this.error('Turbo config not loaded')
      return
    }

    const tasks = this.turboConfig.tasks
    const expectedPersistentTasks = ['build:types:watch', 'build:watch', 'dev', 'start', 'test:watch']

    for (const taskName of expectedPersistentTasks) {
      const task = tasks[taskName]
      if (!task) {
        this.warn(`Expected persistent task "${taskName}" is missing`)
        continue
      }

      if (task.persistent !== true) {
        this.error(`Task "${taskName}" should have persistent: true`)
      }

      if (task.cache !== false) {
        this.error(`Task "${taskName}" should have cache: false`)
      }

      if (!task.dependsOn || task.dependsOn.length === 0) {
        this.warn(`Persistent task "${taskName}" should have dependencies`)
      }
    }

    this.success('Persistent task validation completed')
  }

  validateCacheConfiguration(): void {
    this.info('Validating cache configuration...')

    if (!this.turboConfig) {
      this.error('Turbo config not loaded')
      return
    }

    const tasks = this.turboConfig.tasks

    for (const [taskName, task] of Object.entries(tasks)) {
      // Tasks that should never be cached
      const noCacheTasks = ['clean', 'test:visual']
      if (noCacheTasks.includes(taskName) && task.cache !== false) {
        this.error(`Task "${taskName}" should have cache: false`)
      }

      // Persistent tasks should not be cached
      if (task.persistent && task.cache !== false) {
        this.error(`Persistent task "${taskName}" should have cache: false`)
      }

      // Build tasks should be cached
      if (taskName.startsWith('build:') && !task.persistent && task.cache !== true) {
        this.warn(`Build task "${taskName}" should have cache: true`)
      }

      // Test tasks with coverage should have outputs
      if (taskName.includes('coverage') && (!task.outputs || task.outputs.length === 0)) {
        this.error(`Coverage task "${taskName}" should have outputs defined`)
      }
    }

    this.success('Cache configuration validation completed')
  }

  async validate(): Promise<boolean> {
    this.log(`${colors.bold}${colors.cyan}🔍 Validating turbo.json configuration...${colors.reset}`)
    this.log('')

    // Load configuration and packages
    const configLoaded = await this.loadTurboConfig()
    const packagesLoaded = await this.loadWorkspacePackages()

    if (!configLoaded || !packagesLoaded) {
      return false
    }

    this.log('')

    // Run all validations
    this.validateSchema()
    this.validateTaskDependencies()
    this.validatePackageReferences()
    this.validateBuildChainConsistency()
    this.validatePersistentTasks()
    this.validateCacheConfiguration()

    // Print summary
    this.log('')
    this.log(`${colors.bold}📊 Validation Summary:${colors.reset}`)

    if (this.errors.length === 0 && this.warnings.length === 0) {
      this.success('All validations passed! ✨')
      return true
    }

    if (this.errors.length > 0) {
      this.log(`${colors.red}❌ ${this.errors.length} error(s) found${colors.reset}`)
    }

    if (this.warnings.length > 0) {
      this.log(`${colors.yellow}⚠️  ${this.warnings.length} warning(s) found${colors.reset}`)
    }

    return this.errors.length === 0
  }
}

// Run validation
const validator = new TurboValidator()
const success = await validator.validate()

process.exit(success ? 0 : 1)
