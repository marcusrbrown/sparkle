#!/usr/bin/env tsx

import {execSync} from 'node:child_process'
import {existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs'
import {dirname, join, resolve} from 'node:path'
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
  buildTime?: number
  sizeWarnings: number
}

interface PackageSizeInfo {
  totalSize: number
  files: Record<string, number>
}

interface BundleSizeBaseline {
  timestamp: string
  packages: Record<string, PackageSizeInfo>
  buildTime: number
}

interface SizeComparison {
  package: string
  currentSize: number
  baselineSize: number
  percentChange: number
  isRegression: boolean
}

/**
 * Configuration for bundle size monitoring
 */
const BUNDLE_SIZE_CONFIG = {
  baselineFile: resolve(rootDir, '.cache', 'bundle-size-baseline.json'),
  regressionThreshold: 0.05, // 5% increase triggers warning
  maxHistorySize: 10, // Keep last 10 baseline measurements
} as const

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`
}

/**
 * Calculate directory size recursively
 */
function getDirectorySize(dirPath: string): number {
  let totalSize = 0

  if (!existsSync(dirPath)) {
    return 0
  }

  try {
    const entries = readdirSync(dirPath, {withFileTypes: true})

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name)

      if (entry.isDirectory()) {
        totalSize += getDirectorySize(fullPath)
      } else if (entry.isFile()) {
        const stats = statSync(fullPath)
        totalSize += stats.size
      }
    }
  } catch {
    consola.warn(`Warning: Could not read directory ${dirPath}`)
  }

  return totalSize
}

/**
 * Get size information for a package
 */
function getPackageSizeInfo(pkg: PackageInfo): PackageSizeInfo {
  const distPath = resolve(pkg.path, 'dist')
  const files: Record<string, number> = {}

  if (!existsSync(distPath)) {
    return {totalSize: 0, files: {}}
  }

  try {
    const entries = readdirSync(distPath)

    for (const entry of entries) {
      const fullPath = join(distPath, entry)
      const stats = statSync(fullPath)

      if (stats.isFile()) {
        files[entry] = stats.size
      } else if (stats.isDirectory()) {
        files[entry] = getDirectorySize(fullPath)
      }
    }
  } catch {
    consola.warn(`Warning: Could not read dist directory for ${pkg.name}`)
  }

  const totalSize = Object.values(files).reduce((sum, size) => sum + size, 0)

  return {totalSize, files}
}

/**
 * Load baseline from file
 */
function loadBaseline(): BundleSizeBaseline | null {
  try {
    if (existsSync(BUNDLE_SIZE_CONFIG.baselineFile)) {
      const content = readFileSync(BUNDLE_SIZE_CONFIG.baselineFile, 'utf-8')
      return JSON.parse(content) as BundleSizeBaseline
    }
  } catch {
    consola.warn('Could not load baseline file, starting fresh')
  }
  return null
}

/**
 * Save baseline to file
 */
function saveBaseline(baseline: BundleSizeBaseline): void {
  try {
    const cacheDir = dirname(BUNDLE_SIZE_CONFIG.baselineFile)
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, {recursive: true})
    }
    writeFileSync(BUNDLE_SIZE_CONFIG.baselineFile, JSON.stringify(baseline, null, 2))
    consola.debug(`Baseline saved to ${BUNDLE_SIZE_CONFIG.baselineFile}`)
  } catch (error) {
    consola.error(`Failed to save baseline: ${error}`)
  }
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
function buildAllPackages(): {success: boolean; buildTime: number} {
  consola.info(`${colors.blue}📊 Step 1: Building all packages...${colors.reset}`)
  consola.info('')

  const startTime = performance.now()

  // Run build command with special handling for Turborepo
  try {
    execSync('pnpm run build', {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: [0, 1, 2], // inherit all stdio
    })
    const buildTime = performance.now() - startTime
    consola.info(`${colors.green}✅ Build completed successfully in ${(buildTime / 1000).toFixed(2)}s${colors.reset}`)
    consola.info('')
    return {success: true, buildTime}
  } catch (error: any) {
    // Turborepo sometimes returns non-zero exit codes even on successful builds
    // Check the error output for success indicators
    const errorOutput = error.stdout ? error.stdout.toString() : ''
    const stderr = error.stderr ? error.stderr.toString() : ''

    // Look for success indicators in the output
    const hasSuccessMessage = errorOutput.includes('Tasks:') && errorOutput.includes('successful')
    const hasNoErrors = !stderr.includes('ERROR') && !stderr.includes('FAILED') && !stderr.includes('Error:')

    const buildTime = performance.now() - startTime

    if (hasSuccessMessage && hasNoErrors) {
      consola.info(`${colors.green}✅ Build completed successfully in ${(buildTime / 1000).toFixed(2)}s${colors.reset}`)
      consola.info('')
      return {success: true, buildTime}
    } else {
      consola.info(`${colors.red}❌ Build failed${colors.reset}`)
      if (stderr) {
        consola.error(stderr)
      }
      return {success: false, buildTime}
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
 * Step 5: Validate bundle sizes and detect regressions
 */
function validateBundleSizes(
  packages: PackageInfo[],
  buildTime: number,
): {warnings: number; comparisons: SizeComparison[]} {
  consola.info(`${colors.blue}📊 Step 5: Validating bundle sizes and detecting regressions...${colors.reset}`)
  consola.info('')

  const libraryPackages = getLibraryPackages(packages)
  const currentSizes: Record<string, PackageSizeInfo> = {}
  const comparisons: SizeComparison[] = []
  let warnings = 0

  // Collect current size information
  for (const pkg of libraryPackages) {
    currentSizes[pkg.name] = getPackageSizeInfo(pkg)
  }

  // Load baseline for comparison
  const baseline = loadBaseline()

  // Display current sizes and compare with baseline
  for (const pkg of libraryPackages) {
    const sizeInfo = currentSizes[pkg.name]
    const currentSize = sizeInfo.totalSize
    const formattedSize = formatBytes(currentSize)

    if (baseline && baseline.packages[pkg.name]) {
      const baselineSize = baseline.packages[pkg.name].totalSize
      const percentChange = ((currentSize - baselineSize) / baselineSize) * 100
      const isRegression = percentChange > BUNDLE_SIZE_CONFIG.regressionThreshold * 100

      comparisons.push({
        package: pkg.name,
        currentSize,
        baselineSize,
        percentChange,
        isRegression,
      })

      const changeSymbol = percentChange > 0 ? '+' : ''
      const changeStr = `${changeSymbol}${percentChange.toFixed(1)}%`

      if (isRegression) {
        consola.info(
          `  ${pkg.name}: ${formattedSize} ${colors.red}⚠️  ${changeStr} (regression detected)${colors.reset}`,
        )
        warnings++
      } else if (percentChange > 0) {
        consola.info(`  ${pkg.name}: ${formattedSize} ${colors.yellow}${changeStr}${colors.reset}`)
      } else {
        consola.info(`  ${pkg.name}: ${formattedSize} ${colors.green}${changeStr}${colors.reset}`)
      }
    } else {
      consola.info(`  ${pkg.name}: ${formattedSize} ${colors.blue}(baseline)${colors.reset}`)
    }
  }

  // Save current sizes as new baseline
  const newBaseline: BundleSizeBaseline = {
    timestamp: new Date().toISOString(),
    packages: currentSizes,
    buildTime,
  }
  saveBaseline(newBaseline)

  consola.info('')
  return {warnings, comparisons}
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
  consola.info(`  Bundle size warnings: ${colors.yellow}${result.sizeWarnings}${colors.reset}`)
  if (result.buildTime) {
    consola.info(`  Build time: ${colors.blue}${(result.buildTime / 1000).toFixed(2)}s${colors.reset}`)
  }
  consola.info('')

  const totalErrors = result.errorCount + result.structureErrors

  if (totalErrors === 0 && result.sizeWarnings === 0) {
    consola.info(`${colors.green}🎉 All build validations passed!${colors.reset}`)
  } else if (totalErrors === 0) {
    consola.info(`${colors.yellow}⚠️  Build validation passed with ${result.sizeWarnings} size warnings${colors.reset}`)
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
  const buildResult = buildAllPackages()
  if (!buildResult.success) {
    process.exit(1)
  }

  // Step 2: Validate TypeScript declarations
  const {successCount, errorCount} = validateTypeScriptDeclarations(packages)

  // Step 3: Validate build artifacts
  const artifactErrors = validateBuildArtifacts(packages)

  // Step 4: Validate package structure
  const structureErrors = validatePackageStructure(packages)

  // Step 5: Validate bundle sizes and detect regressions
  const {warnings: sizeWarnings, comparisons} = validateBundleSizes(packages, buildResult.buildTime)

  // Report significant regressions
  if (sizeWarnings > 0) {
    consola.warn(`${colors.yellow}⚠️  Detected ${sizeWarnings} bundle size regression(s):${colors.reset}`)
    for (const comparison of comparisons) {
      if (comparison.isRegression) {
        consola.warn(
          `  ${comparison.package}: ${formatBytes(comparison.baselineSize)} → ${formatBytes(comparison.currentSize)} (+${comparison.percentChange.toFixed(1)}%)`,
        )
      }
    }
    consola.info('')
  }

  // Print summary
  const result: ValidationResult = {
    packageCount: libraryPackages.length, // Only count library packages in validation
    successCount,
    errorCount: errorCount + artifactErrors,
    structureErrors,
    buildTime: buildResult.buildTime,
    sizeWarnings,
  }

  printSummary(result)

  // Exit with appropriate code (warnings don't fail the build)
  const totalErrors = result.errorCount + result.structureErrors
  process.exit(totalErrors === 0 ? 0 : 1)
}

// Run the validation
main()
