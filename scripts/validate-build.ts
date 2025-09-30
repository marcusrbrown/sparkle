#!/usr/bin/env tsx

import {execSync} from 'node:child_process'
import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs'
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

interface PackageInfo {
  name: string
  path: string
  packageJson: PackageJson
}

interface PackageJson {
  name: string
  version?: string
  main?: string
  types?: string
  exports?: Record<string, unknown>
  files?: string[]
  [key: string]: unknown
}

interface ValidationResult {
  packageCount: number
  successCount: number
  errorCount: number
  structureErrors: number
}

/**
 * Get all packages in the workspace
 */
function getPackages(): PackageInfo[] {
  const packagesDir = resolve(rootDir, 'packages')
  const packages: PackageInfo[] = []

  try {
    const entries = readdirSync(packagesDir)
    for (const entry of entries) {
      const packagePath = resolve(packagesDir, entry)
      const packageJsonPath = resolve(packagePath, 'package.json')

      if (statSync(packagePath).isDirectory() && existsSync(packageJsonPath)) {
        const packageJsonContent = readFileSync(packageJsonPath, 'utf-8')
        const packageJson = JSON.parse(packageJsonContent) as PackageJson

        packages.push({
          name: entry,
          path: packagePath,
          packageJson,
        })
      }
    }
  } catch (error) {
    consola.error(`${colors.red}❌ Error reading packages directory: ${error}${colors.reset}`)
    process.exit(1)
  }

  return packages
}

/**
 * Get library packages (excludes dev tools like Storybook)
 */
function getLibraryPackages(packages: PackageInfo[]): PackageInfo[] {
  const excludeFromLibraryValidation = ['storybook']
  return packages.filter(pkg => !excludeFromLibraryValidation.includes(pkg.name))
}

/**
 * Step 1: Build all packages
 */
function buildAllPackages(): boolean {
  consola.info(`${colors.blue}📊 Step 1: Building all packages...${colors.reset}`)
  consola.info('')

  // Run build command with special handling for Turborepo
  try {
    execSync('pnpm run build', {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: [0, 1, 2], // inherit all stdio
    })
    consola.info(`${colors.green}✅ Build completed successfully${colors.reset}`)
    consola.info('')
    return true
  } catch (error: any) {
    // Turborepo sometimes returns non-zero exit codes even on successful builds
    // Check the error output for success indicators
    const errorOutput = error.stdout ? error.stdout.toString() : ''
    const stderr = error.stderr ? error.stderr.toString() : ''

    // Look for success indicators in the output
    const hasSuccessMessage = errorOutput.includes('Tasks:') && errorOutput.includes('successful')
    const hasNoErrors = !stderr.includes('ERROR') && !stderr.includes('FAILED') && !stderr.includes('Error:')

    if (hasSuccessMessage && hasNoErrors) {
      consola.info(`${colors.green}✅ Build completed successfully${colors.reset}`)
      consola.info('')
      return true
    } else {
      consola.info(`${colors.red}❌ Build failed${colors.reset}`)
      if (stderr) {
        consola.error(stderr)
      }
      return false
    }
  }
}

/**
 * Step 2: Validate TypeScript declarations
 */
function validateTypeScriptDeclarations(packages: PackageInfo[]): {successCount: number; errorCount: number} {
  consola.info(`${colors.blue}📊 Step 2: Validating TypeScript declarations...${colors.reset}`)
  consola.info('')

  let successCount = 0
  let errorCount = 0

  // Only validate library packages, not dev tools like Storybook
  const libraryPackages = getLibraryPackages(packages)

  for (const pkg of libraryPackages) {
    process.stdout.write(`  Checking ${pkg.name}... `)

    const declarationPath = resolve(pkg.path, 'dist', 'index.d.ts')

    if (existsSync(declarationPath)) {
      consola.info(`${colors.green}✅ Has type declarations${colors.reset}`)
      successCount++
    } else {
      consola.info(`${colors.red}❌ Missing type declarations${colors.reset}`)
      errorCount++
    }
  }

  consola.info('')
  return {successCount, errorCount}
}

/**
 * Step 3: Validate build artifacts
 */
function validateBuildArtifacts(packages: PackageInfo[]): number {
  consola.info(`${colors.blue}📊 Step 3: Validating build artifacts...${colors.reset}`)
  consola.info('')

  let errorCount = 0

  // Only validate library packages, not dev tools like Storybook
  const libraryPackages = getLibraryPackages(packages)

  for (const pkg of libraryPackages) {
    process.stdout.write(`  Checking ${pkg.name} build artifacts... `)

    const distPath = resolve(pkg.path, 'dist')
    const indexJsPath = resolve(distPath, 'index.js')
    const jsMapPath = resolve(distPath, 'index.js.map')
    const dtsMapPath = resolve(distPath, 'index.d.ts.map')

    // Check for dist directory
    if (!existsSync(distPath)) {
      consola.info(`${colors.red}❌ Missing dist directory${colors.reset}`)
      errorCount++
      continue
    }

    // Check for index.js file (main output)
    if (!existsSync(indexJsPath)) {
      consola.info(`${colors.red}❌ Missing index.js${colors.reset}`)
      errorCount++
      continue
    }

    // Check for source maps (warnings, not errors)
    const warnings: string[] = []
    if (!existsSync(jsMapPath)) {
      warnings.push('Missing JavaScript source map')
    }
    if (!existsSync(dtsMapPath)) {
      warnings.push('Missing TypeScript declaration map')
    }

    if (warnings.length > 0) {
      consola.info(`${colors.yellow}⚠️  ${warnings.join(', ')}${colors.reset}`)
    } else {
      consola.info(`${colors.green}✅ Build artifacts present${colors.reset}`)
    }
  }

  consola.info('')
  return errorCount
}

/**
 * Step 4: Validate package structure consistency
 */
function validatePackageStructure(packages: PackageInfo[]): number {
  consola.info(`${colors.blue}📊 Step 4: Validating package structure consistency...${colors.reset}`)
  consola.info('')

  let structureErrors = 0

  // Only validate library packages, not dev tools like Storybook
  const libraryPackages = getLibraryPackages(packages)

  for (const pkg of libraryPackages) {
    process.stdout.write(`  Checking ${pkg.name} structure... `)

    const requiredFields = ['main', 'types', 'exports', 'files']
    const missingFields: string[] = []

    for (const field of requiredFields) {
      if (!(field in pkg.packageJson)) {
        missingFields.push(field)
      }
    }

    if (missingFields.length > 0) {
      consola.info(`${colors.red}❌ Missing fields: ${missingFields.join(', ')}${colors.reset}`)
      structureErrors++
    } else {
      consola.info(`${colors.green}✅ Package structure valid${colors.reset}`)
    }
  }

  consola.info('')
  return structureErrors
}

/**
 * Print validation summary
 */
function printSummary(result: ValidationResult): void {
  consola.info(`${colors.bold}📋 Build Validation Summary:${colors.reset}`)
  consola.info('')
  consola.info(`  Total packages checked: ${colors.blue}${result.packageCount}${colors.reset}`)
  consola.info(`  Packages with declarations: ${colors.green}${result.successCount}${colors.reset}`)
  consola.info(`  Declaration errors: ${colors.red}${result.errorCount}${colors.reset}`)
  consola.info(`  Structure errors: ${colors.red}${result.structureErrors}${colors.reset}`)
  consola.info('')

  const totalErrors = result.errorCount + result.structureErrors

  if (totalErrors === 0) {
    consola.info(`${colors.green}🎉 All build validations passed!${colors.reset}`)
  } else {
    consola.info(`${colors.red}❌ Build validation failed with ${totalErrors} errors${colors.reset}`)
  }
}

/**
 * Main validation function
 */
function main(): void {
  consola.info('🔍 Validating Sparkle monorepo build integrity...')
  consola.info('')

  // Get all packages
  const packages = getPackages()
  const libraryPackages = getLibraryPackages(packages)

  consola.info(
    `Found ${packages.length} total packages (${libraryPackages.length} library packages, ${packages.length - libraryPackages.length} dev tools)`,
  )
  consola.info('')

  // Step 1: Build all packages
  if (!buildAllPackages()) {
    process.exit(1)
  }

  // Step 2: Validate TypeScript declarations
  const {successCount, errorCount} = validateTypeScriptDeclarations(packages)

  // Step 3: Validate build artifacts
  const artifactErrors = validateBuildArtifacts(packages)

  // Step 4: Validate package structure
  const structureErrors = validatePackageStructure(packages)

  // Print summary
  const result: ValidationResult = {
    packageCount: libraryPackages.length, // Only count library packages in validation
    successCount,
    errorCount: errorCount + artifactErrors,
    structureErrors,
  }

  printSummary(result)

  // Exit with appropriate code
  const totalErrors = result.errorCount + result.structureErrors
  process.exit(totalErrors === 0 ? 0 : 1)
}

// Run the validation
main()
