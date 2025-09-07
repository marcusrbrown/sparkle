import {execSync} from 'node:child_process'
import {existsSync, readFileSync, rmSync, statSync, writeFileSync} from 'node:fs'
import {join, resolve} from 'node:path'
import {performance} from 'node:perf_hooks'
import process from 'node:process'

import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest'

/**
 * TEST-001: Automated build pipeline performance benchmarks
 *
 * This test suite measures and validates build pipeline performance across
 * the entire Sparkle monorepo, ensuring optimizations are effective and
 * monitoring for performance regressions.
 */

interface PerformanceMetrics {
  fullBuildTime: number
  incrementalBuildTime: number
  cleanBuildTime: number
  typeCheckTime: number
  packageBuildTimes: Map<string, number>
  cacheHitRatio: number
}

interface BuildResult {
  success: boolean
  duration: number
  output: string
  error?: string
}

// Performance thresholds and constants
const PERFORMANCE_TARGETS = {
  FULL_BUILD_TIME: 180, // seconds
  INCREMENTAL_BUILD_TIME: 30, // seconds
  TYPE_CHECK_TIME: 10, // seconds
  CACHE_HIT_RATIO: 0.8, // 80%
}

// Test timeouts for long-running operations
const BUILD_TIMEOUT = 120000 // 2 minutes
const TEST_TIMEOUT = 180000 // 3 minutes

// Global metrics collection
let metrics: PerformanceMetrics | null = null

/**
 * Execute a command with timing measurement
 */
function executeWithTiming(command: string): BuildResult {
  const startTime = performance.now()

  try {
    const output = execSync(command, {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: BUILD_TIMEOUT,
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      stdio: ['inherit', 'pipe', 'pipe'],
    })

    const endTime = performance.now()
    const duration = (endTime - startTime) / 1000 // Convert to seconds

    return {
      success: true,
      duration,
      output: String(output),
    }
  } catch (error) {
    const endTime = performance.now()
    const duration = (endTime - startTime) / 1000

    const errorMessage = error instanceof Error ? error.message : String(error)

    return {
      success: false,
      duration,
      output: '',
      error: errorMessage,
    }
  }
}

/**
 * Clean all build artifacts to ensure fresh builds
 */
function cleanBuildArtifacts(): void {
  const artifactPaths = [
    'packages/*/dist',
    'packages/*/.turbo',
    'packages/storybook/storybook-static',
    'apps/*/dist',
    'apps/*/.turbo',
    '.turbo',
    'node_modules/.turbo',
  ]

  for (const artifactPath of artifactPaths) {
    try {
      if (existsSync(artifactPath)) {
        rmSync(artifactPath, {recursive: true, force: true})
      }
    } catch (error) {
      console.warn(`Failed to clean ${artifactPath}:`, error)
    }
  }
}

/**
 * Parse Turborepo cache statistics from build output
 */
function parseCacheStatistics(output: string): number {
  // Look for cache hit information in Turborepo output
  const cacheHitMatch = output.match(/(\d+) cached/i)
  const totalTasksMatch = output.match(/(\d+) tasks?/i)

  if (cacheHitMatch && totalTasksMatch) {
    const cacheHits = Number.parseInt(cacheHitMatch[1], 10)
    const totalTasks = Number.parseInt(totalTasksMatch[1], 10)
    return totalTasks > 0 ? cacheHits / totalTasks : 0
  }

  return 0
}

/**
 * Measure individual package build times
 */
function measurePackageBuildTimes(): Record<string, number> {
  const packageTimes: Record<string, number> = {}

  const packages = ['types', 'utils', 'theme', 'config', 'ui', 'storybook', 'error-testing']

  for (const pkg of packages) {
    const result = executeWithTiming(`pnpm --filter @sparkle/${pkg} build`)
    if (result.success) {
      packageTimes[pkg] = result.duration
    }
  }

  return packageTimes
}

describe('Build Pipeline Performance Tests', () => {
  // Clean up before and after all tests
  beforeAll(() => {
    cleanBuildArtifacts()
    metrics = {
      fullBuildTime: 0,
      incrementalBuildTime: 0,
      cleanBuildTime: 0,
      typeCheckTime: 0,
      packageBuildTimes: new Map(),
      cacheHitRatio: 0,
    }
  }, TEST_TIMEOUT)

  afterAll(() => {
    cleanBuildArtifacts()

    // Report final metrics
    if (metrics) {
      // Use console.warn for test output (allowed by ESLint)
      console.warn('\n📊 Build Pipeline Performance Report:')
      console.warn(
        `⏱️  Full build time: ${metrics.fullBuildTime.toFixed(2)}s (target: ${PERFORMANCE_TARGETS.FULL_BUILD_TIME}s)`,
      )
      console.warn(
        `⚡ Incremental build time: ${metrics.incrementalBuildTime.toFixed(2)}s (target: ${PERFORMANCE_TARGETS.INCREMENTAL_BUILD_TIME}s)`,
      )
      console.warn(
        `🔧 Type checking time: ${metrics.typeCheckTime.toFixed(2)}s (target: ${PERFORMANCE_TARGETS.TYPE_CHECK_TIME}s)`,
      )
      console.warn(
        `💾 Cache hit ratio: ${(metrics.cacheHitRatio * 100).toFixed(1)}% (target: ${PERFORMANCE_TARGETS.CACHE_HIT_RATIO * 100}%)`,
      )
      console.warn('\n📦 Package Build Times:')
      for (const [pkg, time] of metrics.packageBuildTimes) {
        console.warn(`   ${pkg}: ${time.toFixed(2)}s`)
      }
    }
  }, TEST_TIMEOUT)

  describe('Clean Build Performance', () => {
    beforeEach(() => {
      cleanBuildArtifacts()
    })

    it(
      'should complete full clean build within performance target',
      () => {
        const result = executeWithTiming('pnpm build')

        expect(result.success).toBe(true)
        expect(result.duration).toBeLessThan(PERFORMANCE_TARGETS.FULL_BUILD_TIME)

        if (metrics) {
          metrics.fullBuildTime = result.duration
        }
      },
      BUILD_TIMEOUT,
    )

    it(
      'should build all packages in correct dependency order',
      () => {
        const result = executeWithTiming('pnpm --dry-run build')

        expect(result.success).toBe(true)
        // Check that dependent packages come after their dependencies
        expect(result.output).toMatch(
          /@sparkle\/types.*@sparkle\/utils.*@sparkle\/theme.*@sparkle\/config.*@sparkle\/ui/s,
        )
      },
      BUILD_TIMEOUT,
    )

    it(
      'should measure individual package build performance',
      () => {
        const packageBuildTimes = measurePackageBuildTimes()

        expect(Object.keys(packageBuildTimes)).toHaveLength(7)

        // Verify each package builds reasonably quickly
        for (const [pkg, time] of Object.entries(packageBuildTimes)) {
          expect(time).toBeLessThan(30) // 30 seconds per package max
          console.warn(`📦 ${pkg}: ${time.toFixed(2)}s`)
        }

        if (metrics) {
          metrics.packageBuildTimes = new Map(Object.entries(packageBuildTimes))
        }
      },
      BUILD_TIMEOUT,
    )
  })

  describe('Incremental Build Performance', () => {
    beforeAll(() => {
      // Ensure we have a built state for incremental testing
      cleanBuildArtifacts()
      const initialBuild = executeWithTiming('pnpm build')
      expect(initialBuild.success).toBe(true)
    }, BUILD_TIMEOUT)

    it(
      'should perform incremental builds with minimal time',
      () => {
        // Run build again without changes - should be very fast
        const result = executeWithTiming('pnpm build')

        expect(result.success).toBe(true)
        expect(result.duration).toBeLessThan(PERFORMANCE_TARGETS.INCREMENTAL_BUILD_TIME)

        if (metrics) {
          metrics.incrementalBuildTime = result.duration
        }
      },
      BUILD_TIMEOUT,
    )

    it(
      'should achieve high cache hit ratio on subsequent builds',
      () => {
        const result = executeWithTiming('pnpm build')

        expect(result.success).toBe(true)

        const cacheHitRatio = parseCacheStatistics(result.output)
        expect(cacheHitRatio).toBeGreaterThanOrEqual(PERFORMANCE_TARGETS.CACHE_HIT_RATIO)

        if (metrics) {
          metrics.cacheHitRatio = cacheHitRatio
        }
      },
      BUILD_TIMEOUT,
    )

    it(
      'should handle partial rebuilds efficiently when files change',
      () => {
        // Make a small change to a utility package
        const utilsIndexPath = resolve(process.cwd(), 'packages/utils/src/index.ts')
        const originalContent = readFileSync(utilsIndexPath, 'utf8')

        try {
          // Add a comment to trigger rebuild
          writeFileSync(utilsIndexPath, `${originalContent}\n// Test comment`)

          const result = executeWithTiming('pnpm build')
          expect(result.success).toBe(true)

          // Should be faster than full clean build but slower than no-change build
          expect(result.duration).toBeLessThan(metrics?.fullBuildTime || PERFORMANCE_TARGETS.FULL_BUILD_TIME)
        } finally {
          // Restore original content
          writeFileSync(utilsIndexPath, originalContent)
        }
      },
      BUILD_TIMEOUT,
    )
  })

  describe('TypeScript Compilation Performance', () => {
    it(
      'should complete type checking within performance target',
      () => {
        const result = executeWithTiming('pnpm check:types')

        expect(result.success).toBe(true)
        expect(result.duration).toBeLessThan(PERFORMANCE_TARGETS.TYPE_CHECK_TIME)

        if (metrics) {
          metrics.typeCheckTime = result.duration
        }
      },
      BUILD_TIMEOUT,
    )

    it(
      'should compile TypeScript with incremental compilation benefits',
      () => {
        // First run
        const firstRun = executeWithTiming('pnpm check:types')
        expect(firstRun.success).toBe(true)

        // Second run should be faster due to incremental compilation
        const secondRun = executeWithTiming('pnpm check:types')
        expect(secondRun.success).toBe(true)
        expect(secondRun.duration).toBeLessThanOrEqual(firstRun.duration)
      },
      BUILD_TIMEOUT,
    )

    it(
      'should validate TypeScript build info files are created for incremental compilation',
      () => {
        executeWithTiming('pnpm check:types')

        // Check that build info files are created
        const buildInfoFiles = [
          'tsconfig.tsbuildinfo',
          'packages/types/tsconfig.tsbuildinfo',
          'packages/utils/tsconfig.tsbuildinfo',
          'packages/theme/tsconfig.tsbuildinfo',
        ]

        for (const buildInfoFile of buildInfoFiles) {
          const fullPath = resolve(process.cwd(), buildInfoFile)
          expect(existsSync(fullPath)).toBe(true)

          const stats = statSync(fullPath)
          expect(stats.isFile()).toBe(true)
          expect(stats.size).toBeGreaterThan(0)
        }
      },
      BUILD_TIMEOUT,
    )
  })

  describe('Build Output Validation', () => {
    beforeAll(() => {
      cleanBuildArtifacts()
      const buildResult = executeWithTiming('pnpm build')
      expect(buildResult.success).toBe(true)
    }, BUILD_TIMEOUT)

    it('should generate expected build outputs for all packages', () => {
      const expectedOutputs = [
        'packages/types/dist/index.js',
        'packages/types/dist/index.d.ts',
        'packages/utils/dist/index.js',
        'packages/utils/dist/index.d.ts',
        'packages/theme/dist/index.js',
        'packages/theme/dist/index.d.ts',
        'packages/config/dist/index.js',
        'packages/config/dist/index.d.ts',
        'packages/ui/dist/index.js',
        'packages/ui/dist/index.d.ts',
      ]

      for (const outputPath of expectedOutputs) {
        const fullPath = resolve(process.cwd(), outputPath)
        expect(existsSync(fullPath)).toBe(true)

        const stats = statSync(fullPath)
        expect(stats.isFile()).toBe(true)
        expect(stats.size).toBeGreaterThan(0)
      }
    })

    it('should generate Storybook static build output', () => {
      const storybookOutputPath = resolve(process.cwd(), 'packages/storybook/storybook-static')

      if (existsSync(storybookOutputPath)) {
        const indexPath = join(storybookOutputPath, 'index.html')
        expect(existsSync(indexPath)).toBe(true)
      }
    })
  })

  describe('Performance Regression Detection', () => {
    it(
      'should maintain consistent performance across multiple runs',
      () => {
        const runs = 3
        const buildTimes: number[] = []

        for (let i = 0; i < runs; i++) {
          if (i > 0) cleanBuildArtifacts() // Clean between runs except first
          const result = executeWithTiming('pnpm build')
          expect(result.success).toBe(true)
          buildTimes.push(result.duration)
        }

        // Calculate coefficient of variation
        const mean = buildTimes.reduce((sum, time) => sum + time, 0) / buildTimes.length
        const variance = buildTimes.reduce((sum, time) => sum + (time - mean) ** 2, 0) / buildTimes.length
        const standardDeviation = Math.sqrt(variance)
        const coefficientOfVariation = standardDeviation / mean

        // Performance should be consistent (CV < 0.2)
        expect(coefficientOfVariation).toBeLessThan(0.2)

        console.warn(`📊 Build time consistency: mean=${mean.toFixed(2)}s, cv=${coefficientOfVariation.toFixed(3)}`)
      },
      TEST_TIMEOUT,
    )
  })
})
