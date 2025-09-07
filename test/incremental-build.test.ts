import {execSync} from 'node:child_process'
import {existsSync, readFileSync, rmSync, statSync, writeFileSync} from 'node:fs'
import {join, resolve} from 'node:path'
import {performance} from 'node:perf_hooks'
import process from 'node:process'

import {afterEach, beforeAll, describe, expect, it} from 'vitest'

/**
 * TEST-003: Incremental build testing to verify TypeScript project references work correctly
 *
 * This test suite validates that TypeScript project references enable proper incremental
 * compilation, ensuring that changes to packages only trigger rebuilds of affected
 * downstream packages while using cached results for unaffected packages.
 */

const WORKSPACE_ROOT = resolve(process.cwd())

interface BuildInfoData {
  program: {
    fileNames: string[]
    fileInfos: Record<string, {version: string; signature: string}>
    options: Record<string, unknown>
    semanticDiagnosticsPerFile?: unknown[]
  }
  version: string
}

interface BuildMetrics {
  duration: number
  buildInfoFilesCreated: string[]
  buildInfoFilesSizes: Record<string, number>
  successfulCompilation: boolean
}

/**
 * Execute TypeScript build and capture timing information
 */
function executeTscBuild(flags: string[] = []): BuildMetrics {
  const start = performance.now()

  try {
    const command = `tsc --build ${flags.join(' ')}`
    execSync(command, {
      encoding: 'utf8',
      cwd: WORKSPACE_ROOT,
      stdio: 'pipe',
    })

    const duration = (performance.now() - start) / 1000
    const buildInfoFiles = findBuildInfoFiles()
    const buildInfoFilesSizes = getBuildInfoFileSizes(buildInfoFiles)

    return {
      duration,
      buildInfoFilesCreated: buildInfoFiles,
      buildInfoFilesSizes,
      successfulCompilation: true,
    }
  } catch {
    const duration = (performance.now() - start) / 1000

    return {
      duration,
      buildInfoFilesCreated: [],
      buildInfoFilesSizes: {},
      successfulCompilation: false,
    }
  }
}

/**
 * Find all .tsbuildinfo files in the workspace
 */
function findBuildInfoFiles(): string[] {
  try {
    const output = execSync('find . -name "*.tsbuildinfo" -type f', {
      encoding: 'utf8',
      cwd: WORKSPACE_ROOT,
    })

    return output.trim().split('\n').filter(Boolean)
  } catch {
    return []
  }
}

/**
 * Get file sizes for build info files
 */
function getBuildInfoFileSizes(files: string[]): Record<string, number> {
  const sizes: Record<string, number> = {}

  files.forEach(file => {
    const fullPath = join(WORKSPACE_ROOT, file)
    if (existsSync(fullPath)) {
      sizes[file] = statSync(fullPath).size
    }
  })

  return sizes
}

/**
 * Parse .tsbuildinfo file content
 */
function parseBuildInfoFile(filePath: string): BuildInfoData | null {
  try {
    const fullPath = join(WORKSPACE_ROOT, filePath)
    const content = readFileSync(fullPath, 'utf8')
    return JSON.parse(content) as BuildInfoData
  } catch {
    return null
  }
}

/**
 * Clean all build artifacts and TypeScript build info
 */
function cleanAllBuildArtifacts(): void {
  // Clean dist directories
  const packages = ['types', 'utils', 'theme', 'config', 'ui', 'storybook', 'error-testing']
  packages.forEach(pkg => {
    const distPath = join(WORKSPACE_ROOT, `packages/${pkg}/dist`)
    if (existsSync(distPath)) {
      rmSync(distPath, {recursive: true, force: true})
    }
  })

  // Clean build info files
  const buildInfoFiles = findBuildInfoFiles()
  buildInfoFiles.forEach(file => {
    const fullPath = join(WORKSPACE_ROOT, file)
    if (existsSync(fullPath)) {
      rmSync(fullPath)
    }
  })
}

/**
 * Modify a file to trigger incremental rebuild
 */
function modifyFileForRebuild(
  packageName: string,
  fileName: string,
  modification: string,
): {originalContent: string; restore: () => void} {
  const filePath = join(WORKSPACE_ROOT, `packages/${packageName}/src/${fileName}`)
  const originalContent = readFileSync(filePath, 'utf8')

  const modifiedContent = `${originalContent}\n${modification}`
  writeFileSync(filePath, modifiedContent)

  const restore = () => {
    writeFileSync(filePath, originalContent)
  }

  return {originalContent, restore}
}

describe('Incremental Build Testing', () => {
  beforeAll(() => {
    // Ensure we start with a clean state
    cleanAllBuildArtifacts()
  })

  afterEach(() => {
    // Clean up any temporary modifications
    cleanAllBuildArtifacts()
  })

  describe('TypeScript Project References Setup', () => {
    it('should have proper project references configured in all packages', () => {
      const packages = ['types', 'utils', 'theme', 'config', 'ui', 'storybook', 'error-testing']

      packages.forEach(pkg => {
        const tsconfigPath = join(WORKSPACE_ROOT, `packages/${pkg}/tsconfig.json`)

        if (!existsSync(tsconfigPath)) {
          console.warn(`Warning: ${pkg} does not have tsconfig.json`)
          return
        }

        const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'))

        // Should have composite: true for project references to work
        expect(tsconfig.compilerOptions?.composite).toBe(true)

        // Should have incremental: true for incremental compilation
        expect(tsconfig.compilerOptions?.incremental).toBe(true)

        // Should have tsBuildInfoFile specified
        expect(tsconfig.compilerOptions?.tsBuildInfoFile).toBeTruthy()
      })
    })

    it('should have root tsconfig.json configured for project references', () => {
      const rootTsconfigPath = join(WORKSPACE_ROOT, 'tsconfig.json')
      expect(existsSync(rootTsconfigPath)).toBe(true)

      const rootTsconfig = JSON.parse(readFileSync(rootTsconfigPath, 'utf8'))

      // Root should have references to all packages
      expect(rootTsconfig.references).toBeDefined()
      expect(rootTsconfig.references.length).toBeGreaterThan(0)

      // Root should be a composite project
      expect(rootTsconfig.compilerOptions?.composite).toBe(true)
    })
  })

  describe('Initial Build Process', () => {
    it('should create build info files on initial compilation', () => {
      cleanAllBuildArtifacts()

      const buildMetrics = executeTscBuild()

      expect(buildMetrics.successfulCompilation).toBe(true)
      expect(buildMetrics.buildInfoFilesCreated.length).toBeGreaterThan(0)

      // Should have build info files for packages with TypeScript
      expect(buildMetrics.buildInfoFilesCreated).toContain('./tsconfig.tsbuildinfo')

      console.warn(`Initial build took ${buildMetrics.duration.toFixed(2)}s`)
      console.warn(`Created ${buildMetrics.buildInfoFilesCreated.length} build info files`)
    })

    it('should generate valid build info file content', () => {
      cleanAllBuildArtifacts()
      executeTscBuild()

      const buildInfoFiles = findBuildInfoFiles()
      expect(buildInfoFiles.length).toBeGreaterThan(0)

      buildInfoFiles.forEach(file => {
        const buildInfo = parseBuildInfoFile(file)

        expect(buildInfo).toBeTruthy()
        expect(buildInfo?.version).toBeTruthy()
        expect(buildInfo?.program).toBeTruthy()
        expect(buildInfo?.program.fileNames).toBeDefined()
        expect(buildInfo?.program.fileNames.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Incremental Compilation Benefits', () => {
    it('should be significantly faster on subsequent builds with no changes', () => {
      cleanAllBuildArtifacts()

      // Initial build
      const initialBuild = executeTscBuild()
      expect(initialBuild.successfulCompilation).toBe(true)

      // Subsequent build should be much faster
      const incrementalBuild = executeTscBuild()
      expect(incrementalBuild.successfulCompilation).toBe(true)

      // Incremental build should be at least 50% faster
      const speedupRatio = initialBuild.duration / incrementalBuild.duration
      expect(speedupRatio).toBeGreaterThan(1.5)

      console.warn(`Initial build: ${initialBuild.duration.toFixed(2)}s`)
      console.warn(`Incremental build: ${incrementalBuild.duration.toFixed(2)}s`)
      console.warn(`Speedup: ${speedupRatio.toFixed(2)}x`)
    })

    it('should only rebuild affected packages when source files change', () => {
      cleanAllBuildArtifacts()

      // Initial build
      const initialBuild = executeTscBuild()
      expect(initialBuild.successfulCompilation).toBe(true)

      // Get initial build info file timestamps
      const initialBuildInfoSizes = initialBuild.buildInfoFilesSizes

      // Modify a file in the types package (affects downstream packages)
      const {restore} = modifyFileForRebuild('types', 'index.ts', '// Incremental test modification')

      try {
        // Build again
        const rebuildMetrics = executeTscBuild()
        expect(rebuildMetrics.successfulCompilation).toBe(true)

        // Should be faster than initial build but slower than no-change build
        expect(rebuildMetrics.duration).toBeLessThan(initialBuild.duration)

        // Build info files should be updated for affected packages
        const newBuildInfoSizes = rebuildMetrics.buildInfoFilesSizes

        let updatedFiles = 0
        Object.keys(initialBuildInfoSizes).forEach(file => {
          if (newBuildInfoSizes[file] !== initialBuildInfoSizes[file]) {
            updatedFiles++
          }
        })

        expect(updatedFiles).toBeGreaterThan(0)
        console.warn(`Affected packages rebuild: ${rebuildMetrics.duration.toFixed(2)}s`)
        console.warn(`Updated ${updatedFiles} build info files`)
      } finally {
        restore()
      }
    })

    it('should handle isolated package changes efficiently', () => {
      cleanAllBuildArtifacts()

      // Initial build
      const initialBuild = executeTscBuild()
      expect(initialBuild.successfulCompilation).toBe(true)

      // Modify a file in a leaf package (ui) that doesn't affect others
      const {restore} = modifyFileForRebuild('ui', 'index.ts', '// Isolated change test')

      try {
        const rebuildMetrics = executeTscBuild()
        expect(rebuildMetrics.successfulCompilation).toBe(true)

        // Should be very fast for isolated changes
        expect(rebuildMetrics.duration).toBeLessThan(initialBuild.duration * 0.5)

        console.warn(`Isolated package change rebuild: ${rebuildMetrics.duration.toFixed(2)}s`)
      } finally {
        restore()
      }
    })
  })

  describe('Build Order and Dependencies', () => {
    it('should respect dependency order in incremental builds', () => {
      cleanAllBuildArtifacts()

      // Build with verbose output to see order
      const command = 'tsc --build --verbose'
      const output = execSync(command, {
        encoding: 'utf8',
        cwd: WORKSPACE_ROOT,
        stdio: 'pipe',
      })

      // Check that dependencies are built before dependents
      expect(output).toMatch(/types.*before.*utils/)
      expect(output).toMatch(/utils.*before.*ui/)
      expect(output).toMatch(/theme.*before.*ui/)
    })

    it('should detect and handle circular references appropriately', () => {
      // TypeScript should detect circular references
      const result = executeTscBuild(['--dry'])

      // Should complete without errors (no circular references in our setup)
      expect(result.successfulCompilation).toBe(true)
    })
  })

  describe('Build Info File Management', () => {
    it('should maintain build info files across builds', () => {
      cleanAllBuildArtifacts()

      // First build
      executeTscBuild()
      const firstBuildFiles = findBuildInfoFiles()
      expect(firstBuildFiles.length).toBeGreaterThan(0)

      // Second build should maintain the same files
      executeTscBuild()
      const secondBuildFiles = findBuildInfoFiles()

      expect(secondBuildFiles.length).toBe(firstBuildFiles.length)
      firstBuildFiles.forEach(file => {
        expect(secondBuildFiles).toContain(file)
      })
    })

    it('should clean build info files when requested', () => {
      cleanAllBuildArtifacts()

      // Create build info files
      executeTscBuild()
      expect(findBuildInfoFiles().length).toBeGreaterThan(0)

      // Clean build should remove build info
      executeTscBuild(['--clean'])

      // After clean, fewer or no build info files should exist
      const remainingFiles = findBuildInfoFiles()
      console.warn(`Files after clean: ${remainingFiles.length}`)
    })

    it('should force rebuild when build info files are deleted', () => {
      cleanAllBuildArtifacts()

      // Initial build
      const initialBuild = executeTscBuild()
      expect(initialBuild.successfulCompilation).toBe(true)

      // Delete build info files
      const buildInfoFiles = findBuildInfoFiles()
      buildInfoFiles.forEach(file => {
        const fullPath = join(WORKSPACE_ROOT, file)
        if (existsSync(fullPath)) {
          rmSync(fullPath)
        }
      })

      // Next build should be closer to initial build time (forced rebuild)
      const forcedRebuild = executeTscBuild()
      expect(forcedRebuild.successfulCompilation).toBe(true)

      const rebuildRatio = forcedRebuild.duration / initialBuild.duration
      expect(rebuildRatio).toBeGreaterThan(0.7) // Should be similar timing

      console.warn(`Forced rebuild ratio: ${rebuildRatio.toFixed(2)}`)
    })
  })

  describe('Error Handling in Incremental Builds', () => {
    it('should handle TypeScript errors without corrupting build info', () => {
      cleanAllBuildArtifacts()

      // Initial successful build
      const initialBuild = executeTscBuild()
      expect(initialBuild.successfulCompilation).toBe(true)

      // Introduce a syntax error
      const {restore} = modifyFileForRebuild('types', 'index.ts', 'const invalidSyntax = }')

      try {
        // Build should fail but not corrupt build info
        const errorBuild = executeTscBuild()
        expect(errorBuild.successfulCompilation).toBe(false)

        // Fix the error
        restore()

        // Should be able to build successfully again
        const recoveryBuild = executeTscBuild()
        expect(recoveryBuild.successfulCompilation).toBe(true)
      } finally {
        restore()
      }
    })
  })

  describe('Performance Validation', () => {
    it('should meet incremental build performance targets', () => {
      cleanAllBuildArtifacts()

      // Initial build
      const initialBuild = executeTscBuild()
      expect(initialBuild.successfulCompilation).toBe(true)

      // No-change incremental build
      const incrementalBuild = executeTscBuild()
      expect(incrementalBuild.successfulCompilation).toBe(true)

      // Performance targets
      expect(incrementalBuild.duration).toBeLessThan(5) // Should be under 5 seconds

      const speedupFactor = initialBuild.duration / incrementalBuild.duration
      expect(speedupFactor).toBeGreaterThan(2) // At least 2x speedup

      console.warn(`Performance validation passed:`)
      console.warn(`  Initial: ${initialBuild.duration.toFixed(2)}s`)
      console.warn(`  Incremental: ${incrementalBuild.duration.toFixed(2)}s`)
      console.warn(`  Speedup: ${speedupFactor.toFixed(2)}x`)
    })
  })
})
