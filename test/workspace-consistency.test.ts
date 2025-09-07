import {execSync} from 'node:child_process'
import {existsSync, readFileSync} from 'node:fs'
import {join, resolve} from 'node:path'
import process from 'node:process'

import {describe, expect, it} from 'vitest'

/**
 * TEST-004: Workspace consistency validation using manypkg check command
 *
 * This test suite validates workspace consistency by testing manypkg validation
 * rules, dependency validation, and workspace protocol enforcement to ensure
 * the monorepo maintains proper structure and dependencies.
 */

const WORKSPACE_ROOT = resolve(process.cwd())

interface PackageJson {
  name: string
  version: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  exports?: Record<string, string | Record<string, string>>
  types?: string
  typings?: string
  license?: string
  repository?: string | {type: string; url: string}
  publishConfig?: Record<string, unknown>
  manypkg?: {
    ignoredRules: string[]
    workspaceProtocol: string
    rootPackageNamesInDependencies: boolean
    requiresPublishConfig: boolean
    requiresLicense: boolean
    defaultBranch: string
  }
}

interface WorkspacePackage {
  name: string
  path: string
  packageJson: PackageJson
}

/**
 * Execute command and return success status and output
 */
function executeCommand(command: string): {success: boolean; output: string; error?: string} {
  try {
    const output = execSync(command, {
      encoding: 'utf8',
      cwd: WORKSPACE_ROOT,
      stdio: 'pipe',
    })

    return {success: true, output}
  } catch (error) {
    const output = error instanceof Error && 'stdout' in error ? (error as any).stdout || '' : ''
    const stderr = error instanceof Error && 'stderr' in error ? (error as any).stderr || '' : String(error)

    return {success: false, output, error: stderr}
  }
}

/**
 * Get all workspace packages
 */
function getWorkspacePackages(): WorkspacePackage[] {
  const packages: WorkspacePackage[] = []

  // Add root package
  const rootPackageJsonPath = join(WORKSPACE_ROOT, 'package.json')
  if (existsSync(rootPackageJsonPath)) {
    const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, 'utf8'))
    packages.push({
      name: rootPackageJson.name || 'root',
      path: WORKSPACE_ROOT,
      packageJson: rootPackageJson,
    })
  }

  // Add workspace packages
  const workspacePackages = [
    'packages/types',
    'packages/utils',
    'packages/theme',
    'packages/config',
    'packages/ui',
    'packages/storybook',
    'packages/error-testing',
    'apps/fro-jive',
    'scripts',
  ]

  workspacePackages.forEach(pkgPath => {
    const packageJsonPath = join(WORKSPACE_ROOT, pkgPath, 'package.json')
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
      packages.push({
        name: packageJson.name || pkgPath,
        path: join(WORKSPACE_ROOT, pkgPath),
        packageJson,
      })
    }
  })

  return packages
}

/**
 * Get all internal @sparkle/* dependencies from a package
 */
function getInternalDependencies(pkg: WorkspacePackage): {name: string; version: string; type: string}[] {
  const deps: {name: string; version: string; type: string}[] = []

  const depTypes = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']

  depTypes.forEach(depType => {
    const depsObj = pkg.packageJson[depType as keyof PackageJson] as Record<string, string> | undefined
    if (depsObj) {
      Object.entries(depsObj).forEach(([name, version]) => {
        if (name.startsWith('@sparkle/')) {
          deps.push({name, version, type: depType})
        }
      })
    }
  })

  return deps
}

describe('Workspace Consistency Validation', () => {
  describe('Manypkg Integration Tests', () => {
    it('should pass manypkg check validation', () => {
      const result = executeCommand('pnpm check:monorepo')

      if (!result.success) {
        console.warn('Manypkg check output:', result.output)
        console.warn('Manypkg check error:', result.error)
      }

      expect(result.success).toBe(true)
      expect(result.output).toMatch(/success|valid/i)
    })

    it('should have manypkg configuration in root package.json', () => {
      const rootPackage = getWorkspacePackages().find(pkg => pkg.name === 'sparkle' || pkg.path === WORKSPACE_ROOT)
      expect(rootPackage).toBeTruthy()

      const manypkgConfig = rootPackage?.packageJson.manypkg
      expect(manypkgConfig).toBeDefined()

      // Verify key configuration options
      expect(manypkgConfig).toMatchObject({
        workspaceProtocol: 'require',
        rootPackageNamesInDependencies: false,
        requiresLicense: true,
        defaultBranch: 'main',
      })
    })

    it('should have no ignored manypkg rules', () => {
      const rootPackage = getWorkspacePackages().find(pkg => pkg.name === 'sparkle' || pkg.path === WORKSPACE_ROOT)
      const manypkgConfig = rootPackage?.packageJson.manypkg

      expect(manypkgConfig?.ignoredRules).toEqual([])
    })
  })

  describe('Workspace Protocol Enforcement', () => {
    it('should use workspace:* protocol for all internal dependencies', () => {
      const packages = getWorkspacePackages()
      const violations: string[] = []

      packages.forEach(pkg => {
        const internalDeps = getInternalDependencies(pkg)

        internalDeps.forEach(dep => {
          if (!dep.version.startsWith('workspace:')) {
            violations.push(`${pkg.name}: ${dep.name} (${dep.type}) uses "${dep.version}" instead of workspace:*`)
          }
        })
      })

      if (violations.length > 0) {
        console.warn('Workspace protocol violations:')
        violations.forEach(violation => console.warn(`  ${violation}`))
      }

      expect(violations).toHaveLength(0)
    })

    it('should validate dependency validation script works correctly', () => {
      const result = executeCommand('pnpm check:dependencies')

      if (!result.success) {
        console.warn('Dependency validation output:', result.output)
        console.warn('Dependency validation error:', result.error)
      }

      expect(result.success).toBe(true)
      expect(result.output).toMatch(/All workspace dependencies valid|✅/)
    })
  })

  describe('Package Consistency Rules', () => {
    it('should have consistent license fields across all packages', () => {
      const packages = getWorkspacePackages()
      const licenses = new Set<string>()
      const packagesWithoutLicense: string[] = []

      packages.forEach(pkg => {
        if (pkg.packageJson.license) {
          licenses.add(pkg.packageJson.license)
        } else {
          packagesWithoutLicense.push(pkg.name)
        }
      })

      // Should have license field in all packages or inherit from root
      if (packagesWithoutLicense.length > 0) {
        console.warn('Packages without license field:', packagesWithoutLicense)
      }

      // All explicit licenses should be the same
      expect(licenses.size).toBeLessThanOrEqual(1)

      if (licenses.size === 1) {
        expect([...licenses][0]).toBe('MIT')
      }
    })

    it('should have proper repository field format', () => {
      const packages = getWorkspacePackages()

      packages.forEach(pkg => {
        if (pkg.packageJson.repository) {
          const repo = pkg.packageJson.repository

          if (typeof repo === 'string') {
            expect(repo).toMatch(/github\\.com|git\\+https/)
          } else {
            expect(repo.type).toBe('git')
            expect(repo.url).toMatch(/github\\.com|git\\+https/)
          }
        }
      })
    })

    it('should have consistent package naming convention', () => {
      const packages = getWorkspacePackages()
      const sparklePackages = packages.filter(pkg => pkg.name.startsWith('@sparkle/'))

      sparklePackages.forEach(pkg => {
        // Package names should follow @sparkle/package-name format
        expect(pkg.name).toMatch(/^@sparkle\/[a-z-]+$/)

        // Package names should be lowercase with hyphens
        expect(pkg.name).not.toMatch(/[A-Z_]/)
      })
    })

    it('should have proper TypeScript declaration exports', () => {
      const packages = getWorkspacePackages()
      const sparklePackages = packages.filter(pkg => pkg.name.startsWith('@sparkle/'))

      sparklePackages.forEach(pkg => {
        const hasTypeExport = Boolean(
          pkg.packageJson.types ||
            pkg.packageJson.typings ||
            (pkg.packageJson.exports?.['.'] &&
              typeof pkg.packageJson.exports['.'] === 'object' &&
              'types' in pkg.packageJson.exports['.']),
        )

        // All @sparkle packages should export types
        expect(hasTypeExport).toBe(true)
      })
    })
  })

  describe('Dependency Graph Validation', () => {
    it('should have valid dependency relationships without cycles', () => {
      const packages = getWorkspacePackages()
      const sparklePackages = packages.filter(pkg => pkg.name.startsWith('@sparkle/'))

      // Build dependency graph
      const dependencyGraph = new Map<string, Set<string>>()

      sparklePackages.forEach(pkg => {
        const deps = getInternalDependencies(pkg)
        const depNames = deps.map(dep => dep.name)
        dependencyGraph.set(pkg.name, new Set(depNames))
      })

      // Check for cycles using DFS
      function hasCycle(node: string, visited: Set<string>, recursionStack: Set<string>): boolean {
        visited.add(node)
        recursionStack.add(node)

        const neighbors = dependencyGraph.get(node) || new Set()
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            if (hasCycle(neighbor, visited, recursionStack)) {
              return true
            }
          } else if (recursionStack.has(neighbor)) {
            return true
          }
        }

        recursionStack.delete(node)
        return false
      }

      const visited = new Set<string>()
      let hasCycles = false

      for (const pkg of sparklePackages) {
        if (!visited.has(pkg.name) && hasCycle(pkg.name, visited, new Set())) {
          hasCycles = true
          break
        }
      }

      expect(hasCycles).toBe(false)
    })

    it('should have proper dependency hierarchy levels', () => {
      const packages = getWorkspacePackages()
      const sparklePackages = packages.filter(pkg => pkg.name.startsWith('@sparkle/'))

      // Expected dependency levels (packages can only depend on lower levels)
      const expectedLevels: Record<string, number> = {
        '@sparkle/types': 0,
        '@sparkle/utils': 1,
        '@sparkle/theme': 2,
        '@sparkle/config': 1,
        '@sparkle/error-testing': 1,
        '@sparkle/ui': 3,
        '@sparkle/storybook': 4,
      }

      sparklePackages.forEach(pkg => {
        if (!(pkg.name in expectedLevels)) return

        const pkgLevel = expectedLevels[pkg.name]
        const deps = getInternalDependencies(pkg)

        deps.forEach(dep => {
          if (dep.name in expectedLevels) {
            const depLevel = expectedLevels[dep.name]
            expect(depLevel).toBeLessThan(pkgLevel)
          }
        })
      })
    })
  })

  describe('Workspace File Structure Validation', () => {
    it('should have proper pnpm workspace configuration', () => {
      const workspaceConfigPath = join(WORKSPACE_ROOT, 'pnpm-workspace.yaml')
      expect(existsSync(workspaceConfigPath)).toBe(true)

      const workspaceConfig = readFileSync(workspaceConfigPath, 'utf8')
      expect(workspaceConfig).toMatch(/packages/)
      expect(workspaceConfig).toMatch(/apps/)
    })

    it('should have package.json in all workspace directories', () => {
      const expectedPackages = [
        'packages/types',
        'packages/utils',
        'packages/theme',
        'packages/config',
        'packages/ui',
        'packages/storybook',
        'packages/error-testing',
        'apps/fro-jive',
        'scripts',
      ]

      expectedPackages.forEach(pkgPath => {
        const packageJsonPath = join(WORKSPACE_ROOT, pkgPath, 'package.json')
        expect(existsSync(packageJsonPath), `${pkgPath}/package.json should exist`).toBe(true)
      })
    })

    it('should have valid package.json syntax in all packages', () => {
      const packages = getWorkspacePackages()

      packages.forEach(pkg => {
        // If we got here, JSON.parse succeeded in getWorkspacePackages()
        expect(pkg.packageJson.name).toBeTruthy()
        expect(pkg.packageJson.version).toBeTruthy()
      })
    })
  })

  describe('External Dependency Consistency', () => {
    it('should have consistent versions for shared external dependencies', () => {
      const packages = getWorkspacePackages()
      const externalDependencies = new Map<string, Map<string, string[]>>() // dep -> version -> packages

      packages.forEach(pkg => {
        const allDeps = {
          ...pkg.packageJson.dependencies,
          ...pkg.packageJson.devDependencies,
        }

        Object.entries(allDeps || {}).forEach(([name, version]) => {
          if (!name.startsWith('@sparkle/')) {
            if (!externalDependencies.has(name)) {
              externalDependencies.set(name, new Map())
            }

            const versionMap = externalDependencies.get(name)
            if (versionMap) {
              if (!versionMap.has(version)) {
                versionMap.set(version, [])
              }

              const packages = versionMap.get(version)
              if (packages) {
                packages.push(pkg.name)
              }
            }
          }
        })
      })

      // Find dependencies with version conflicts
      const conflicts: string[] = []

      externalDependencies.forEach((versions, depName) => {
        if (versions.size > 1) {
          const versionInfo = Array.from(versions.entries())
            .map(([version, packages]) => `${version} (${packages.join(', ')})`)
            .join('; ')

          conflicts.push(`${depName}: ${versionInfo}`)
        }
      })

      if (conflicts.length > 0) {
        console.warn('External dependency version conflicts:')
        conflicts.forEach(conflict => console.warn(`  ${conflict}`))
      }

      // Allow some flexibility for dev dependencies and specific cases
      expect(conflicts.length).toBeLessThan(5)
    })
  })

  describe('Turbo Configuration Consistency', () => {
    it('should have valid turbo.json configuration', () => {
      const turboConfigPath = join(WORKSPACE_ROOT, 'turbo.json')
      expect(existsSync(turboConfigPath)).toBe(true)

      const turboConfig = JSON.parse(readFileSync(turboConfigPath, 'utf8'))

      expect(turboConfig.tasks).toBeDefined()
      expect(turboConfig.tasks.build).toBeDefined()
      expect(turboConfig.tasks.test).toBeDefined()

      // Should have proper dependency chains
      expect(turboConfig.tasks.build.dependsOn).toContain('^build')
    })

    it('should validate turbo configuration with validation script', () => {
      const result = executeCommand('pnpm check:turbo')

      if (!result.success) {
        console.warn('Turbo validation output:', result.output)
        console.warn('Turbo validation error:', result.error)
      }

      expect(result.success).toBe(true)
    })
  })
})
