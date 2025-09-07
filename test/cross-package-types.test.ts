import {execSync} from 'node:child_process'
import {existsSync, readFileSync, unlinkSync, writeFileSync} from 'node:fs'
import {join, resolve} from 'node:path'
import process from 'node:process'

import {afterEach, beforeAll, describe, expect, it} from 'vitest'

/**
 * TEST-002: Cross-package type checking validation ensuring proper error detection across boundaries
 *
 * This test suite validates that TypeScript type checking works correctly across
 * package boundaries, ensuring that type errors are properly detected and reported
 * when packages have invalid cross-package type relationships.
 */

interface PackageInfo {
  name: string
  path: string
  dependencies: string[]
  exports: string[]
}

const WORKSPACE_ROOT = resolve(process.cwd())

// Package dependency graph for validation
const PACKAGE_DEPENDENCIES: Record<string, string[]> = {
  types: [],
  utils: ['@sparkle/types'],
  theme: ['@sparkle/types', '@sparkle/utils'],
  config: ['@sparkle/types'],
  'error-testing': ['@sparkle/types'],
  ui: ['@sparkle/types', '@sparkle/utils', '@sparkle/theme'],
  storybook: ['@sparkle/ui', '@sparkle/theme'],
}

/**
 * Execute TypeScript compilation and capture detailed output
 */
function runTypeCheck(): {success: boolean; output: string; errors: string[]} {
  try {
    const output = execSync('tsc --noEmit --pretty false', {
      encoding: 'utf8',
      cwd: WORKSPACE_ROOT,
      stdio: 'pipe',
    })

    return {success: true, output, errors: []}
  } catch (error) {
    const output = error instanceof Error && 'stdout' in error ? (error as any).stdout : ''
    const stderr = error instanceof Error && 'stderr' in error ? (error as any).stderr : String(error)

    // Parse TypeScript errors
    const errorLines = stderr.split('\n').filter(line => line.includes('error TS'))

    return {success: false, output, errors: errorLines}
  }
}

/**
 * Parse TypeScript errors to extract file, line, and error code information
 */
function parseTypeScriptErrors(errors: string[]): {
  file: string
  line: number
  column: number
  code: string
  message: string
}[] {
  return errors.map(error => {
    // TypeScript error format: file(line,column): error TSxxxx: message
    // eslint-disable-next-line regexp/no-super-linear-backtracking
    const match = error.match(/^(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s*(.+)$/)

    if (match) {
      return {
        file: match[1],
        line: Number.parseInt(match[2], 10),
        column: Number.parseInt(match[3], 10),
        code: match[4],
        message: match[5],
      }
    }

    // Fallback for different error formats
    return {
      file: 'unknown',
      line: 0,
      column: 0,
      code: 'unknown',
      message: error,
    }
  })
}

/**
 * Create a temporary file with type errors for testing
 */
function createTempTypeErrorFile(
  packageName: string,
  fileName: string,
  content: string,
): {filePath: string; cleanup: () => void} {
  const packagePath = join(WORKSPACE_ROOT, `packages/${packageName}`)
  const filePath = join(packagePath, 'src', fileName)
  const originalContent = existsSync(filePath) ? readFileSync(filePath, 'utf8') : null

  writeFileSync(filePath, content)

  const cleanup = () => {
    if (originalContent !== null) {
      writeFileSync(filePath, originalContent)
    } else if (existsSync(filePath)) {
      unlinkSync(filePath)
    }
  }

  return {filePath, cleanup}
}

/**
 * Get package information including dependencies and exports
 */
function getPackageInfo(packageName: string): PackageInfo {
  const packagePath = join(WORKSPACE_ROOT, `packages/${packageName}`)
  const packageJsonPath = join(packagePath, 'package.json')

  if (!existsSync(packageJsonPath)) {
    throw new Error(`Package ${packageName} not found`)
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
  const dependencies = Object.keys({
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }).filter(dep => dep.startsWith('@sparkle/'))

  // Try to get exports from package.json or index file
  let exports: string[] = []
  if (packageJson.exports) {
    exports = Object.keys(packageJson.exports).filter(exp => exp !== '.')
  }

  return {
    name: packageName,
    path: packagePath,
    dependencies,
    exports,
  }
}

describe('Cross-Package Type Checking Validation', () => {
  let cleanupFunctions: (() => void)[] = []

  afterEach(() => {
    // Clean up any temporary files created during tests
    cleanupFunctions.forEach(cleanup => cleanup())
    cleanupFunctions = []
  })

  beforeAll(() => {
    // Ensure packages are built before running type checks
    const buildResult = execSync('pnpm build', {encoding: 'utf8', cwd: WORKSPACE_ROOT})
    expect(buildResult).toBeTruthy()
  })

  describe('Valid Type Relationships', () => {
    it('should pass type checking with valid cross-package imports', () => {
      const result = runTypeCheck()

      if (!result.success) {
        // If there are errors, they should not be related to cross-package imports
        const parsedErrors = parseTypeScriptErrors(result.errors)
        const crossPackageErrors = parsedErrors.filter(
          error => error.code === 'TS2307' && error.message.includes('@sparkle/'),
        )

        expect(crossPackageErrors.length).toBe(0)
        console.warn('Note: Non-cross-package TypeScript errors detected:', parsedErrors.length)
      }
    })

    it('should correctly resolve types from dependency packages', () => {
      // Test that ui package can import types from its dependencies
      const testContent = `
import type {HTMLProperties} from '@sparkle/types'
import {useDebounce} from '@sparkle/utils'
import {useTheme} from '@sparkle/theme'

// Valid usage that should type check correctly
export function TestComponent(props: HTMLProperties<HTMLDivElement>) {
  const debouncedValue = useDebounce('test', 300)
  const {theme} = useTheme()

  return null
}
`

      const {cleanup} = createTempTypeErrorFile('ui', 'test-valid-imports.ts', testContent)
      cleanupFunctions.push(cleanup)

      const result = runTypeCheck()

      if (!result.success) {
        const parsedErrors = parseTypeScriptErrors(result.errors)
        const testFileErrors = parsedErrors.filter(error => error.file.includes('test-valid-imports.ts'))

        // Should not have any errors in the test file
        expect(testFileErrors.length).toBe(0)
      }
    })

    it('should properly handle re-exported types across packages', () => {
      // Test that storybook can import types that are re-exported through ui from types
      const testContent = `
import type {ButtonProps} from '@sparkle/ui'
import {Button} from '@sparkle/ui'

// Should work with re-exported types
export function StoryComponent(): ButtonProps {
  return {
    children: 'Test Button',
    variant: 'primary'
  }
}
`

      const {cleanup} = createTempTypeErrorFile('storybook', 'test-reexports.ts', testContent)
      cleanupFunctions.push(cleanup)

      const result = runTypeCheck()

      if (!result.success) {
        const parsedErrors = parseTypeScriptErrors(result.errors)
        const testFileErrors = parsedErrors.filter(error => error.file.includes('test-reexports.ts'))

        expect(testFileErrors.length).toBe(0)
      }
    })
  })

  describe('Invalid Type Relationships Detection', () => {
    it('should detect when package imports from non-dependency package', () => {
      // Types package should not be able to import from utils package
      const testContent = `
// This should cause a TypeScript error
import {useDebounce} from '@sparkle/utils'

export const invalidImport = useDebounce
`

      const {cleanup} = createTempTypeErrorFile('types', 'test-invalid-import.ts', testContent)
      cleanupFunctions.push(cleanup)

      const result = runTypeCheck()

      expect(result.success).toBe(false)

      const parsedErrors = parseTypeScriptErrors(result.errors)
      const moduleErrors = parsedErrors.filter(
        error => error.code === 'TS2307' && error.message.includes('@sparkle/utils'),
      )

      expect(moduleErrors.length).toBeGreaterThan(0)
    })

    it('should detect circular dependency type errors', () => {
      // Create a circular dependency scenario: utils importing from ui
      const testContent = `
// This should cause a module resolution error due to circular dependency
import type {ButtonProps} from '@sparkle/ui'

export function invalidCircularFunction(): ButtonProps {
  return {children: 'test'}
}
`

      const {cleanup} = createTempTypeErrorFile('utils', 'test-circular.ts', testContent)
      cleanupFunctions.push(cleanup)

      const result = runTypeCheck()

      expect(result.success).toBe(false)

      const parsedErrors = parseTypeScriptErrors(result.errors)
      const circularErrors = parsedErrors.filter(
        error =>
          error.file.includes('test-circular.ts') && (error.code === 'TS2307' || error.message.includes('@sparkle/ui')),
      )

      expect(circularErrors.length).toBeGreaterThan(0)
    })

    it('should detect type incompatibility across packages', () => {
      // Create type incompatibility
      const testContent = `
import type {HTMLProperties} from '@sparkle/types'

// This should cause a type error
export function typeIncompatibilityTest(): HTMLProperties<HTMLDivElement> {
  // Returning wrong type should cause TS2322 error
  return "this is not the right type"
}
`

      const {cleanup} = createTempTypeErrorFile('ui', 'test-type-incompatibility.ts', testContent)
      cleanupFunctions.push(cleanup)

      const result = runTypeCheck()

      expect(result.success).toBe(false)

      const parsedErrors = parseTypeScriptErrors(result.errors)
      const typeErrors = parsedErrors.filter(
        error => error.file.includes('test-type-incompatibility.ts') && error.code === 'TS2322',
      )

      expect(typeErrors.length).toBeGreaterThan(0)
    })

    it('should detect missing export errors across packages', () => {
      // Try to import something that doesn't exist
      const testContent = `
// This should cause a module resolution error
import {NonExistentFunction} from '@sparkle/utils'

export const test = NonExistentFunction
`

      const {cleanup} = createTempTypeErrorFile('ui', 'test-missing-export.ts', testContent)
      cleanupFunctions.push(cleanup)

      const result = runTypeCheck()

      expect(result.success).toBe(false)

      const parsedErrors = parseTypeScriptErrors(result.errors)
      const importErrors = parsedErrors.filter(
        error =>
          error.file.includes('test-missing-export.ts') &&
          (error.code === 'TS2305' || error.code === 'TS2614' || error.message.includes('NonExistentFunction')),
      )

      expect(importErrors.length).toBeGreaterThan(0)
    })
  })

  describe('Package Dependency Validation', () => {
    it('should validate package dependency graph consistency', () => {
      // Check that each package only depends on packages lower in the dependency hierarchy
      const dependencyLevels = {
        types: 0,
        utils: 1,
        theme: 2,
        config: 1,
        'error-testing': 1,
        ui: 3,
        storybook: 4,
      }

      Object.entries(PACKAGE_DEPENDENCIES).forEach(([pkg, deps]) => {
        const packageLevel = dependencyLevels[pkg as keyof typeof dependencyLevels]

        deps.forEach(dep => {
          const depName = dep.replace('@sparkle/', '')
          const depLevel = dependencyLevels[depName as keyof typeof dependencyLevels]

          expect(depLevel).toBeLessThan(packageLevel)
        })
      })
    })

    it('should validate that all packages have correct TypeScript project references', () => {
      Object.entries(PACKAGE_DEPENDENCIES).forEach(([pkg, deps]) => {
        const packagePath = join(WORKSPACE_ROOT, `packages/${pkg}`)
        const tsconfigPath = join(packagePath, 'tsconfig.json')

        if (!existsSync(tsconfigPath)) return

        const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'))

        if (deps.length > 0) {
          expect(tsconfig.references).toBeDefined()

          const referencePaths = tsconfig.references?.map((ref: {path: string}) => ref.path) || []

          deps.forEach(dep => {
            const depName = dep.replace('@sparkle/', '')
            const expectedPath = `../${depName}`

            expect(referencePaths).toContain(expectedPath)
          })
        }
      })
    })

    it('should ensure workspace protocol is used for all internal dependencies', () => {
      Object.keys(PACKAGE_DEPENDENCIES).forEach(pkg => {
        const packageInfo = getPackageInfo(pkg)

        packageInfo.dependencies.forEach(dep => {
          const packageJsonPath = join(packageInfo.path, 'package.json')
          const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))

          const allDeps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies,
          }

          if (allDeps[dep]) {
            expect(allDeps[dep]).toMatch(/^workspace:/)
          }
        })
      })
    })
  })

  describe('Type Declaration Validation', () => {
    it('should validate that all packages generate proper TypeScript declarations', () => {
      Object.keys(PACKAGE_DEPENDENCIES).forEach(pkg => {
        const distPath = join(WORKSPACE_ROOT, `packages/${pkg}/dist`)
        const declarationFile = join(distPath, 'index.d.ts')

        expect(existsSync(declarationFile), `${pkg} should have index.d.ts`).toBe(true)

        const content = readFileSync(declarationFile, 'utf8')
        expect(content.length).toBeGreaterThan(0)

        // Should contain proper TypeScript declaration syntax
        expect(content).toMatch(/export|declare|interface|type/)
      })
    })

    it('should validate that type declarations are properly exported in package.json', () => {
      Object.keys(PACKAGE_DEPENDENCIES).forEach(pkg => {
        const packageJsonPath = join(WORKSPACE_ROOT, `packages/${pkg}/package.json`)
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))

        // Should have types field or exports with types
        expect(
          packageJson.types ||
            packageJson.typings ||
            (packageJson.exports && packageJson.exports['.'] && packageJson.exports['.'].types),
        ).toBeTruthy()
      })
    })
  })
})
