#!/usr/bin/env tsx

import {readdirSync, readFileSync, statSync} from 'node:fs'
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
  reset: '\u001B[0m',
  bold: '\u001B[1m',
} as const

interface PackageJson {
  name: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  [key: string]: unknown
}

interface ValidationError {
  packageName: string
  dependencyName: string
  currentVersion: string
  dependencyType: 'dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies'
}

/**
 * Get all packages in the workspace
 */
function getWorkspacePackages(): {name: string; path: string; packageJson: PackageJson}[] {
  const packagesDir = resolve(rootDir, 'packages')
  const packages: {name: string; path: string; packageJson: PackageJson}[] = []

  try {
    const entries = readdirSync(packagesDir)
    for (const entry of entries) {
      const packagePath = resolve(packagesDir, entry)
      const packageJsonPath = resolve(packagePath, 'package.json')

      // Skip if not a directory or no package.json
      if (!statSync(packagePath).isDirectory()) continue
      try {
        statSync(packageJsonPath)
      } catch {
        continue
      }

      try {
        const packageJsonContent = readFileSync(packageJsonPath, 'utf8')
        const packageJson = JSON.parse(packageJsonContent) as PackageJson
        packages.push({
          name: packageJson.name,
          path: packagePath,
          packageJson,
        })
      } catch (error) {
        consola.error(`${colors.red}Error reading package.json for ${entry}:${colors.reset}`, error)
      }
    }
  } catch (error) {
    consola.error(`${colors.red}Error reading packages directory:${colors.reset}`, error)
    process.exit(1)
  }

  return packages
}

/**
 * Check if a dependency name is an internal @sparkle package
 */
function isInternalDependency(dependencyName: string): boolean {
  return dependencyName.startsWith('@sparkle/')
}

/**
 * Check if a dependency version uses the workspace protocol
 */
function usesWorkspaceProtocol(version: string): boolean {
  return version.startsWith('workspace:')
}

/**
 * Validate workspace dependencies for a single package
 */
function validatePackageDependencies(pkg: {name: string; packageJson: PackageJson}): ValidationError[] {
  const errors: ValidationError[] = []
  const dependencyTypes: (keyof Pick<
    PackageJson,
    'dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies'
  >)[] = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']

  for (const depType of dependencyTypes) {
    const dependencies = pkg.packageJson[depType]
    if (!dependencies || typeof dependencies !== 'object') continue

    for (const [depName, depVersion] of Object.entries(dependencies)) {
      if (isInternalDependency(depName) && !usesWorkspaceProtocol(depVersion)) {
        errors.push({
          packageName: pkg.name,
          dependencyName: depName,
          currentVersion: depVersion,
          dependencyType: depType,
        })
      }
    }
  }

  return errors
}

/**
 * Validate all workspace dependencies
 */
function validateWorkspaceDependencies(): ValidationError[] {
  consola.info(`${colors.blue}${colors.bold}🔗 Validating workspace dependencies...${colors.reset}`)

  const packages = getWorkspacePackages()
  const allErrors: ValidationError[] = []

  consola.info(`${colors.blue}Found ${packages.length} workspace packages${colors.reset}`)

  for (const pkg of packages) {
    const errors = validatePackageDependencies(pkg)
    allErrors.push(...errors)
  }

  return allErrors
}

/**
 * Format and display validation errors
 */
function displayValidationResults(errors: ValidationError[]): void {
  if (errors.length === 0) {
    consola.success(`${colors.green}${colors.bold}✅ All workspace dependencies valid${colors.reset}`)
    consola.success(`${colors.green}All internal @sparkle/* dependencies use workspace:* protocol${colors.reset}`)
    return
  }

  consola.error(`${colors.red}${colors.bold}❌ Workspace dependency validation failed${colors.reset}`)
  consola.error(`${colors.red}Found ${errors.length} violation(s):${colors.reset}\n`)

  // Group errors by package for better readability
  const errorsByPackage = new Map<string, ValidationError[]>()
  for (const error of errors) {
    if (!errorsByPackage.has(error.packageName)) {
      errorsByPackage.set(error.packageName, [])
    }
    const packageErrors = errorsByPackage.get(error.packageName)
    if (packageErrors) {
      packageErrors.push(error)
    }
  }

  for (const [packageName, packageErrors] of errorsByPackage) {
    consola.log(`${colors.yellow}📦 Package: ${colors.bold}${packageName}${colors.reset}`)
    for (const error of packageErrors) {
      consola.log(
        `  ${colors.red}•${colors.reset} ${colors.red}${error.dependencyName}${colors.reset} in ${colors.yellow}${error.dependencyType}${colors.reset}`,
      )
      consola.log(`    Current: ${colors.red}"${error.currentVersion}"${colors.reset}`)
      consola.log(`    Expected: ${colors.green}"workspace:*"${colors.reset}`)
    }
    consola.log('')
  }

  consola.info(`${colors.yellow}${colors.bold}💡 How to fix:${colors.reset}`)
  consola.info(`${colors.yellow}  1. Change internal dependency versions to "workspace:*"${colors.reset}`)
  consola.info(`${colors.yellow}  2. Run "pnpm install" to update lockfile${colors.reset}`)
  consola.info(`${colors.yellow}  3. Or run "pnpm fix:monorepo" to auto-fix with manypkg${colors.reset}`)
}

/**
 * Main function
 */
function main(): void {
  try {
    const errors = validateWorkspaceDependencies()
    displayValidationResults(errors)

    if (errors.length > 0) {
      process.exit(1)
    }
  } catch (error) {
    consola.error(`${colors.red}${colors.bold}💥 Validation failed with error:${colors.reset}`, error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
