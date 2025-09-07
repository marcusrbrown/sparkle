import {execSync} from 'node:child_process'
import {existsSync, readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs'
import {join, resolve} from 'node:path'
import process from 'node:process'

import {beforeAll, describe, expect, it} from 'vitest'

/**
 * TEST-006: Build artifact validation ensuring proper package exports and type declarations
 * TEST-007: Turborepo cache effectiveness testing for task optimization
 *
 * Combined test suite for build artifacts validation and Turborepo cache optimization
 * to ensure build outputs are correct and caching is effective.
 */

const WORKSPACE_ROOT = resolve(process.cwd())

interface PackageArtifacts {
  name: string
  distPath: string
  hasIndexJs: boolean
  hasIndexDts: boolean
  hasPackageJson: boolean
  packageJsonExports: Record<string, unknown>
  typesExport: string | undefined
  filesizes: {
    indexJs: number
    indexDts: number
  }
}

interface TurboCacheStats {
  totalTasks: number
  cacheHits: number
  cacheMisses: number
  cacheHitRatio: number
  executionTime: number
}

/**
 * Execute command and measure timing
 */
function executeWithTiming(command: string): {
  success: boolean
  output: string
  duration: number
  error?: string
} {
  const start = performance.now()

  try {
    const output = execSync(command, {
      encoding: 'utf8',
      cwd: WORKSPACE_ROOT,
      stdio: 'pipe',
    })

    return {
      success: true,
      output,
      duration: (performance.now() - start) / 1000,
    }
  } catch (error) {
    const output = error instanceof Error && 'stdout' in error ? (error as any).stdout || '' : ''
    const stderr = error instanceof Error && 'stderr' in error ? (error as any).stderr || '' : String(error)

    return {
      success: false,
      output,
      error: stderr,
      duration: (performance.now() - start) / 1000,
    }
  }
}

/**
 * Parse Turborepo output for cache statistics
 */
function parseTurboStats(output: string): TurboCacheStats {
  // Parse patterns like: "6 successful, 5 total, 4 cached"
  const totalMatch = output.match(/(\d+)\s+total/)
  const cachedMatch = output.match(/(\d+)\s+cached/)

  const total = totalMatch ? Number.parseInt(totalMatch[1], 10) : 0
  const cached = cachedMatch ? Number.parseInt(cachedMatch[1], 10) : 0

  const cacheHits = cached
  const cacheMisses = total - cached
  const cacheHitRatio = total > 0 ? (cacheHits / total) * 100 : 0

  return {
    totalTasks: total,
    cacheHits,
    cacheMisses,
    cacheHitRatio,
    executionTime: 0, // Will be filled by caller
  }
}

/**
 * Analyze package build artifacts
 */
function analyzePackageArtifacts(packageName: string): PackageArtifacts {
  const packagePath = join(WORKSPACE_ROOT, `packages/${packageName}`)
  const distPath = join(packagePath, 'dist')
  const packageJsonPath = join(packagePath, 'package.json')

  const indexJsPath = join(distPath, 'index.js')
  const indexDtsPath = join(distPath, 'index.d.ts')

  const hasIndexJs = existsSync(indexJsPath)
  const hasIndexDts = existsSync(indexDtsPath)
  const hasPackageJson = existsSync(packageJsonPath)

  let packageJsonExports = {}
  let typesExport: string | undefined

  if (hasPackageJson) {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
    packageJsonExports = packageJson.exports || {}
    typesExport = packageJson.types || packageJson.typings
  }

  return {
    name: packageName,
    distPath,
    hasIndexJs,
    hasIndexDts,
    hasPackageJson,
    packageJsonExports,
    typesExport,
    filesizes: {
      indexJs: hasIndexJs ? statSync(indexJsPath).size : 0,
      indexDts: hasIndexDts ? statSync(indexDtsPath).size : 0,
    },
  }
}

/**
 * Clean all build artifacts and cache
 */
function cleanAllArtifacts(): void {
  executeWithTiming('pnpm clean')
  executeWithTiming('rm -rf .turbo')
}

describe('Build Artifacts and Cache Validation', () => {
  beforeAll(() => {
    // Ensure we have a clean build for testing
    cleanAllArtifacts()
    const buildResult = executeWithTiming('pnpm build')
    expect(buildResult.success).toBe(true)
  })

  describe('TEST-006: Build Artifact Validation', () => {
    const packages = ['types', 'utils', 'theme', 'config', 'ui', 'error-testing']

    it('should generate proper JavaScript and TypeScript declaration files', () => {
      packages.forEach(pkg => {
        const artifacts = analyzePackageArtifacts(pkg)

        expect(artifacts.hasIndexJs, `${pkg} should have index.js`).toBe(true)
        expect(artifacts.hasIndexDts, `${pkg} should have index.d.ts`).toBe(true)

        // Files should not be empty
        expect(artifacts.filesizes.indexJs).toBeGreaterThan(0)
        expect(artifacts.filesizes.indexDts).toBeGreaterThan(0)

        console.warn(`${pkg}: JS=${artifacts.filesizes.indexJs}b, DTS=${artifacts.filesizes.indexDts}b`)
      })
    })

    it('should have proper package.json exports configuration', () => {
      packages.forEach(pkg => {
        const artifacts = analyzePackageArtifacts(pkg)

        expect(artifacts.hasPackageJson).toBe(true)

        // Should have exports field
        expect(artifacts.packageJsonExports).toBeTruthy()

        // Should have types export
        expect(artifacts.typesExport).toBeTruthy()
        expect(artifacts.typesExport).toMatch(/\\.d\\.ts$/)
      })
    })

    it('should validate ES module compatibility', () => {
      packages.forEach(pkg => {
        const indexJsPath = join(WORKSPACE_ROOT, `packages/${pkg}/dist/index.js`)

        if (existsSync(indexJsPath)) {
          const content = readFileSync(indexJsPath, 'utf8')

          // Should use ES module syntax (export/import) not CommonJS (module.exports/require)
          expect(content).toMatch(/export|import/)
          expect(content).not.toMatch(/module\.exports|require\(/)
        }
      })
    })

    it('should generate valid TypeScript declaration files', () => {
      packages.forEach(pkg => {
        const indexDtsPath = join(WORKSPACE_ROOT, `packages/${pkg}/dist/index.d.ts`)

        if (existsSync(indexDtsPath)) {
          const content = readFileSync(indexDtsPath, 'utf8')

          // Should contain TypeScript declaration syntax
          expect(content).toMatch(/export|declare|interface|type/)

          // Should not contain implementation code
          expect(content).not.toMatch(/console\.log|function.*\{/)
        }
      })
    })

    it('should have consistent build output structure', () => {
      packages.forEach(pkg => {
        const distPath = join(WORKSPACE_ROOT, `packages/${pkg}/dist`)
        expect(existsSync(distPath), `${pkg} dist directory should exist`).toBe(true)

        // Check for expected files
        const expectedFiles = ['index.js', 'index.d.ts']
        expectedFiles.forEach(file => {
          const filePath = join(distPath, file)
          expect(existsSync(filePath), `${pkg} should have ${file}`).toBe(true)
        })
      })
    })

    it('should validate Storybook build artifacts', () => {
      const storybookStaticPath = join(WORKSPACE_ROOT, 'packages/storybook/storybook-static')
      expect(existsSync(storybookStaticPath)).toBe(true)

      // Essential Storybook files
      const essentialFiles = ['index.html', 'iframe.html']
      essentialFiles.forEach(file => {
        const filePath = join(storybookStaticPath, file)
        expect(existsSync(filePath), `Storybook should have ${file}`).toBe(true)
        expect(statSync(filePath).size).toBeGreaterThan(0)
      })

      console.warn(`Storybook static build size: ${statSync(storybookStaticPath).size} bytes`)
    })
  })

  describe('TEST-007: Turborepo Cache Effectiveness', () => {
    it('should achieve high cache hit ratio on subsequent builds', () => {
      // Clean state
      cleanAllArtifacts()

      // First build (no cache)
      const firstBuild = executeWithTiming('pnpm turbo run build')
      expect(firstBuild.success).toBe(true)

      const firstStats = parseTurboStats(firstBuild.output)
      firstStats.executionTime = firstBuild.duration

      // Second build (should use cache)
      const secondBuild = executeWithTiming('pnpm turbo run build')
      expect(secondBuild.success).toBe(true)

      const secondStats = parseTurboStats(secondBuild.output)
      secondStats.executionTime = secondBuild.duration

      // Cache hit ratio should be high (>80%)
      expect(secondStats.cacheHitRatio).toBeGreaterThan(80)

      // Second build should be significantly faster
      const speedupRatio = firstStats.executionTime / secondStats.executionTime
      expect(speedupRatio).toBeGreaterThan(2)

      console.warn(`Cache effectiveness:`)
      console.warn(`  First build: ${firstStats.executionTime.toFixed(2)}s (${firstStats.totalTasks} tasks)`)
      console.warn(
        `  Second build: ${secondStats.executionTime.toFixed(2)}s (${secondStats.cacheHits}/${secondStats.totalTasks} cached)`,
      )
      console.warn(`  Cache hit ratio: ${secondStats.cacheHitRatio.toFixed(1)}%`)
      console.warn(`  Speedup: ${speedupRatio.toFixed(2)}x`)
    })

    it('should cache individual package builds effectively', () => {
      const testPackages = ['types', 'utils', 'theme']

      testPackages.forEach(pkg => {
        // Clean build for package
        executeWithTiming(`pnpm turbo run build --filter=@sparkle/${pkg}`)

        // Second build should use cache
        const cachedBuild = executeWithTiming(`pnpm turbo run build --filter=@sparkle/${pkg}`)
        expect(cachedBuild.success).toBe(true)

        const stats = parseTurboStats(cachedBuild.output)
        expect(stats.cacheHitRatio).toBeGreaterThan(90) // Single package should have very high cache hit

        console.warn(`${pkg} cache hit ratio: ${stats.cacheHitRatio.toFixed(1)}%`)
      })
    })

    it('should invalidate cache when source files change', () => {
      // Initial build
      executeWithTiming('pnpm turbo run build --filter=@sparkle/types')

      // Modify source file
      const typesIndexPath = join(WORKSPACE_ROOT, 'packages/types/src/index.ts')
      const originalContent = readFileSync(typesIndexPath, 'utf8')
      const modifiedContent = `${originalContent}\n// Cache invalidation test`

      try {
        // Write modification
        writeFileSync(typesIndexPath, modifiedContent)

        // Build again - should not use cache for modified package
        const buildAfterChange = executeWithTiming('pnpm turbo run build --filter=@sparkle/types')
        expect(buildAfterChange.success).toBe(true)

        const stats = parseTurboStats(buildAfterChange.output)
        // Should have cache misses due to file changes
        expect(stats.cacheMisses).toBeGreaterThan(0)

        console.warn(`Cache invalidation: ${stats.cacheMisses} tasks rebuilt after source change`)
      } finally {
        // Restore original content
        writeFileSync(typesIndexPath, originalContent)
      }
    })

    it('should respect cache dependencies between packages', () => {
      // Build all packages
      executeWithTiming('pnpm build')

      // Modify types package (affects downstream packages)
      const typesIndexPath = join(WORKSPACE_ROOT, 'packages/types/src/index.ts')
      const originalContent = readFileSync(typesIndexPath, 'utf8')
      const modifiedContent = `${originalContent}\n// Dependency cache test`

      try {
        writeFileSync(typesIndexPath, modifiedContent)

        // Build ui package (depends on types)
        const buildResult = executeWithTiming('pnpm turbo run build --filter=@sparkle/ui')
        expect(buildResult.success).toBe(true)

        // Should rebuild types and ui due to dependency chain
        const stats = parseTurboStats(buildResult.output)
        expect(stats.totalTasks).toBeGreaterThan(1) // Should build multiple packages

        console.warn(`Dependency cache: ${stats.totalTasks} tasks in dependency chain`)
      } finally {
        writeFileSync(typesIndexPath, originalContent)
      }
    })

    it('should validate cache storage and retrieval', () => {
      cleanAllArtifacts()

      // Build and check for cache directory creation
      const buildResult = executeWithTiming('pnpm build')
      expect(buildResult.success).toBe(true)

      const turboCachePath = join(WORKSPACE_ROOT, '.turbo/cache')
      expect(existsSync(turboCachePath), 'Turbo cache directory should be created').toBe(true)

      // Check cache directory has content
      const cacheContent = readdirSync(turboCachePath)
      expect(cacheContent.length).toBeGreaterThan(0)

      console.warn(`Turbo cache contains ${cacheContent.length} entries`)
    })

    it('should maintain cache consistency across different build commands', () => {
      // Test different ways of building and ensure cache consistency
      const buildCommands = ['pnpm build', 'pnpm turbo run build', 'pnpm turbo run build --parallel']

      cleanAllArtifacts()

      // First build
      const firstResult = executeWithTiming(buildCommands[0])
      expect(firstResult.success).toBe(true)

      // Subsequent builds with different commands should use cache
      for (let i = 1; i < buildCommands.length; i++) {
        const result = executeWithTiming(buildCommands[i])
        expect(result.success).toBe(true)

        const stats = parseTurboStats(result.output)
        expect(stats.cacheHitRatio).toBeGreaterThan(70) // Should have good cache utilization

        console.warn(`${buildCommands[i]}: ${stats.cacheHitRatio.toFixed(1)}% cache hit`)
      }
    })
  })

  describe('Integration Testing', () => {
    it('should validate complete build pipeline with artifacts and cache', () => {
      cleanAllArtifacts()

      // Full build pipeline
      const pipelineResult = executeWithTiming('pnpm build')
      expect(pipelineResult.success).toBe(true)

      // Validate all artifacts exist
      const packages = ['types', 'utils', 'theme', 'config', 'ui', 'error-testing']
      packages.forEach(pkg => {
        const artifacts = analyzePackageArtifacts(pkg)
        expect(artifacts.hasIndexJs).toBe(true)
        expect(artifacts.hasIndexDts).toBe(true)
      })

      // Validate cache was populated
      const cacheResult = executeWithTiming('pnpm build')
      expect(cacheResult.success).toBe(true)

      const cacheStats = parseTurboStats(cacheResult.output)
      expect(cacheStats.cacheHitRatio).toBeGreaterThan(80)

      console.warn(`Complete pipeline validation:`)
      console.warn(`  Build time: ${pipelineResult.duration.toFixed(2)}s`)
      console.warn(`  Cache efficiency: ${cacheStats.cacheHitRatio.toFixed(1)}%`)
      console.warn(`  Artifacts: ${packages.length} packages built successfully`)
    })
  })
})
