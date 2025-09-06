#!/usr/bin/env tsx

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

interface PackageJson {
  name: string
  main?: string
  types?: string
  exports?: Record<string, unknown>
  files?: string[]
  [key: string]: unknown
}

interface ExportValidationResult {
  packageName: string
  success: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Get all library packages (excludes dev tools like Storybook)
 */
function getLibraryPackages(): {name: string; path: string; packageJson: PackageJson}[] {
  const packagesDir = resolve(rootDir, 'packages')
  const packages: {name: string; path: string; packageJson: PackageJson}[] = []
  const excludeFromValidation = ['storybook']

  try {
    const entries = readdirSync(packagesDir)
    for (const entry of entries) {
      if (excludeFromValidation.includes(entry)) continue

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
 * Validate a single export path
 */
function validateExportPath(packagePath: string, exportPath: string): {exists: boolean; resolvedPath: string} {
  // Handle different export path formats
  let resolvedPath: string

  if (exportPath.startsWith('./')) {
    // Relative path from package root
    resolvedPath = resolve(packagePath, exportPath.slice(2))
  } else if (exportPath.startsWith('/')) {
    // Absolute path (shouldn't happen in package exports)
    resolvedPath = exportPath
  } else {
    // Assume it's a relative path without ./
    resolvedPath = resolve(packagePath, exportPath)
  }

  return {
    exists: existsSync(resolvedPath),
    resolvedPath,
  }
}

/**
 * Validate package exports field
 */
function validatePackageExports(
  packageName: string,
  packagePath: string,
  packageJson: PackageJson,
): ExportValidationResult {
  const result: ExportValidationResult = {
    packageName,
    success: true,
    errors: [],
    warnings: [],
  }

  // Check main field
  if (packageJson.main) {
    const mainValidation = validateExportPath(packagePath, packageJson.main)
    if (!mainValidation.exists) {
      result.errors.push(`Main field points to non-existent file: ${packageJson.main}`)
      result.success = false
    }
  }

  // Check types field
  if (packageJson.types) {
    const typesValidation = validateExportPath(packagePath, packageJson.types)
    if (!typesValidation.exists) {
      result.errors.push(`Types field points to non-existent file: ${packageJson.types}`)
      result.success = false
    }
  }

  // Check exports field
  if (packageJson.exports) {
    validateExportsField(packagePath, packageJson.exports, result)
  }

  // Check files field
  if (packageJson.files) {
    for (const filePath of packageJson.files) {
      const fileValidation = validateExportPath(packagePath, filePath)
      if (!fileValidation.exists) {
        result.errors.push(`Files field includes non-existent path: ${filePath}`)
        result.success = false
      }
    }
  }

  return result
}

/**
 * Recursively validate exports field
 */
function validateExportsField(
  packagePath: string,
  exports: Record<string, unknown>,
  result: ExportValidationResult,
): void {
  for (const [key, value] of Object.entries(exports)) {
    if (typeof value === 'string') {
      // Direct export path
      const exportValidation = validateExportPath(packagePath, value)
      if (!exportValidation.exists) {
        result.errors.push(`Export "${key}" points to non-existent file: ${value}`)
        result.success = false
      }
    } else if (typeof value === 'object' && value !== null) {
      // Nested export object (conditional exports)
      if ('import' in value || 'require' in value || 'types' in value || 'default' in value) {
        // This is a conditional export
        for (const [condition, conditionValue] of Object.entries(value)) {
          if (typeof conditionValue === 'string') {
            const exportValidation = validateExportPath(packagePath, conditionValue)
            if (!exportValidation.exists) {
              result.errors.push(
                `Export "${key}" condition "${condition}" points to non-existent file: ${conditionValue}`,
              )
              result.success = false
            }
          }
        }
      } else {
        // Nested export paths
        validateExportsField(packagePath, value as Record<string, unknown>, result)
      }
    }
  }
}

/**
 * Validate all packages
 */
function validateAllPackages(): ExportValidationResult[] {
  const packages = getLibraryPackages()
  const results: ExportValidationResult[] = []

  console.log(`${colors.blue}🔍 Validating package exports for ${packages.length} library packages...${colors.reset}`)
  console.log('')

  for (const pkg of packages) {
    process.stdout.write(`  Validating ${pkg.name}... `)

    const result = validatePackageExports(pkg.name, pkg.path, pkg.packageJson)
    results.push(result)

    if (result.success) {
      if (result.warnings.length > 0) {
        console.log(`${colors.yellow}⚠️  ${result.warnings.length} warnings${colors.reset}`)
        for (const warning of result.warnings) {
          console.log(`    ${colors.yellow}⚠️  ${warning}${colors.reset}`)
        }
      } else {
        console.log(`${colors.green}✅ All exports valid${colors.reset}`)
      }
    } else {
      console.log(`${colors.red}❌ ${result.errors.length} errors${colors.reset}`)
      for (const error of result.errors) {
        console.log(`    ${colors.red}❌ ${error}${colors.reset}`)
      }
    }
  }

  return results
}

/**
 * Print validation summary
 */
function printSummary(results: ExportValidationResult[]): void {
  console.log('')
  console.log(`${colors.bold}📋 Package Exports Validation Summary:${colors.reset}`)
  console.log('')

  const totalPackages = results.length
  const successfulPackages = results.filter(r => r.success).length
  const failedPackages = totalPackages - successfulPackages
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0)
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0)

  console.log(`  Total packages checked: ${colors.blue}${totalPackages}${colors.reset}`)
  console.log(`  Packages with valid exports: ${colors.green}${successfulPackages}${colors.reset}`)
  console.log(`  Packages with export errors: ${colors.red}${failedPackages}${colors.reset}`)
  console.log(`  Total errors: ${colors.red}${totalErrors}${colors.reset}`)
  console.log(`  Total warnings: ${colors.yellow}${totalWarnings}${colors.reset}`)
  console.log('')

  if (failedPackages === 0) {
    console.log(`${colors.green}🎉 All package exports are valid!${colors.reset}`)
  } else {
    console.log(`${colors.red}❌ Export validation failed for ${failedPackages} packages${colors.reset}`)
  }
}

/**
 * Main validation function
 */
function main(): void {
  console.log('🔍 Validating Sparkle monorepo package exports...')
  console.log('')

  const results = validateAllPackages()
  printSummary(results)

  // Exit with appropriate code
  const hasErrors = results.some(r => !r.success)
  process.exit(hasErrors ? 1 : 0)
}

// Run the validation
main()
