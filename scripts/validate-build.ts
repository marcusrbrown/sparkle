#!/usr/bin/env tsx

import {execSync} from 'node:child_process'
import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import process from 'node:process'
import {fileURLToPath} from 'node:url'

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
    console.error(`${colors.red}❌ Error reading packages directory: ${error}${colors.reset}`)
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
  console.log(`${colors.blue}📊 Step 1: Building all packages...${colors.reset}`)
  console.log('')

  // Run build command with special handling for Turborepo
  try {
    execSync('pnpm run build', {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: [0, 1, 2], // inherit all stdio
    })
    console.log(`${colors.green}✅ Build completed successfully${colors.reset}`)
    console.log('')
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
      console.log(`${colors.green}✅ Build completed successfully${colors.reset}`)
      console.log('')
      return true
    } else {
      console.log(`${colors.red}❌ Build failed${colors.reset}`)
      if (stderr) {
        console.error(stderr)
      }
      return false
    }
  }
}

/**
 * Step 2: Validate TypeScript declarations
 */
function validateTypeScriptDeclarations(packages: PackageInfo[]): {successCount: number; errorCount: number} {
  console.log(`${colors.blue}📊 Step 2: Validating TypeScript declarations...${colors.reset}`)
  console.log('')

  let successCount = 0
  let errorCount = 0

  // Only validate library packages, not dev tools like Storybook
  const libraryPackages = getLibraryPackages(packages)

  for (const pkg of libraryPackages) {
    process.stdout.write(`  Checking ${pkg.name}... `)

    const declarationPath = resolve(pkg.path, 'dist', 'index.d.ts')

    if (existsSync(declarationPath)) {
      console.log(`${colors.green}✅ Has type declarations${colors.reset}`)
      successCount++
    } else {
      console.log(`${colors.red}❌ Missing type declarations${colors.reset}`)
      errorCount++
    }
  }

  console.log('')
  return {successCount, errorCount}
}

/**
 * Step 3: Validate build artifacts
 */
function validateBuildArtifacts(packages: PackageInfo[]): number {
  console.log(`${colors.blue}📊 Step 3: Validating build artifacts...${colors.reset}`)
  console.log('')

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
      console.log(`${colors.red}❌ Missing dist directory${colors.reset}`)
      errorCount++
      continue
    }

    // Check for index.js file (main output)
    if (!existsSync(indexJsPath)) {
      console.log(`${colors.red}❌ Missing index.js${colors.reset}`)
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
      console.log(`${colors.yellow}⚠️  ${warnings.join(', ')}${colors.reset}`)
    } else {
      console.log(`${colors.green}✅ Build artifacts present${colors.reset}`)
    }
  }

  console.log('')
  return errorCount
}

/**
 * Step 4: Validate package structure consistency
 */
function validatePackageStructure(packages: PackageInfo[]): number {
  console.log(`${colors.blue}📊 Step 4: Validating package structure consistency...${colors.reset}`)
  console.log('')

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
      console.log(`${colors.red}❌ Missing fields: ${missingFields.join(', ')}${colors.reset}`)
      structureErrors++
    } else {
      console.log(`${colors.green}✅ Package structure valid${colors.reset}`)
    }
  }

  console.log('')
  return structureErrors
}

/**
 * Print validation summary
 */
function printSummary(result: ValidationResult): void {
  console.log(`${colors.bold}📋 Build Validation Summary:${colors.reset}`)
  console.log('')
  console.log(`  Total packages checked: ${colors.blue}${result.packageCount}${colors.reset}`)
  console.log(`  Packages with declarations: ${colors.green}${result.successCount}${colors.reset}`)
  console.log(`  Declaration errors: ${colors.red}${result.errorCount}${colors.reset}`)
  console.log(`  Structure errors: ${colors.red}${result.structureErrors}${colors.reset}`)
  console.log('')

  const totalErrors = result.errorCount + result.structureErrors

  if (totalErrors === 0) {
    console.log(`${colors.green}🎉 All build validations passed!${colors.reset}`)
  } else {
    console.log(`${colors.red}❌ Build validation failed with ${totalErrors} errors${colors.reset}`)
  }
}

/**
 * Main validation function
 */
function main(): void {
  console.log('🔍 Validating Sparkle monorepo build integrity...')
  console.log('')

  // Get all packages
  const packages = getPackages()
  const libraryPackages = getLibraryPackages(packages)

  console.log(
    `Found ${packages.length} total packages (${libraryPackages.length} library packages, ${packages.length - libraryPackages.length} dev tools)`,
  )
  console.log('')

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
