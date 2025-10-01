import {vi} from 'vitest'

/**
 * Mock interface for consola logger.
 * Tracks all consola logging methods as Vitest mocks.
 */
export interface ConsolaMocks {
  log: ReturnType<typeof vi.fn>
  info: ReturnType<typeof vi.fn>
  warn: ReturnType<typeof vi.fn>
  error: ReturnType<typeof vi.fn>
  debug: ReturnType<typeof vi.fn>
  success: ReturnType<typeof vi.fn>
  fail: ReturnType<typeof vi.fn>
  [key: string]: ReturnType<typeof vi.fn>
}

/**
 * Consola method names that can be mocked.
 */
export type ConsolaMethod = 'log' | 'info' | 'warn' | 'error' | 'debug' | 'success' | 'fail'

/**
 * Type-safe interface for consola-like objects.
 * Allows mocking any object with logging methods without complex type assertions.
 */
export interface ConsolaLike {
  [key: string]: unknown
}

/**
 * Creates consola method mocks for capturing output in tests.
 * Useful for suppressing expected error/warning logs during test execution.
 *
 * @param consolaInstance - The consola instance to mock (from `import {consola} from 'consola'`)
 * @param options - Configuration options
 * @param options.methods - Specific methods to mock (default: all)
 * @param options.suppress - Whether to suppress output (default: true)
 * @returns Object containing all consola mocks
 *
 * @example
 * ```typescript
 * import {consola} from 'consola'
 * import {mockConsola, restoreConsola} from '@sparkle/test-utils/console'
 *
 * describe('WASM tests', () => {
 *   let consolaMocks: ConsolaMocks
 *
 *   beforeEach(() => {
 *     consolaMocks = mockConsola(consola, {methods: ['error', 'warn']})
 *   })
 *
 *   afterEach(() => {
 *     restoreConsola(consolaMocks)
 *   })
 *
 *   it('should handle errors without noise', () => {
 *     // Expected errors won't clutter test output
 *     someCodeThatLogsErrors()
 *     expect(consolaMocks.error).toHaveBeenCalled()
 *   })
 * })
 * ```
 */
export function mockConsola(
  consolaInstance: ConsolaLike,
  options?: {methods?: ConsolaMethod[]; suppress?: boolean},
): ConsolaMocks {
  const {methods = ['log', 'info', 'warn', 'error', 'debug', 'success', 'fail'], suppress = true} = options ?? {}

  const mocks: Record<string, ReturnType<typeof vi.fn>> = {}

  for (const method of methods) {
    const spy = vi.spyOn(consolaInstance as Record<string, () => void>, method) as ReturnType<typeof vi.fn>
    if (suppress) {
      spy.mockImplementation(() => {})
    }
    mocks[method] = spy
  }

  return mocks as ConsolaMocks
}

/**
 * Restores consola methods to original implementations.
 * Essential for cleanup to prevent test interdependence.
 *
 * @param mocks - The consola mocks to restore
 *
 * @example
 * ```typescript
 * afterEach(() => {
 *   restoreConsola(consolaMocks)
 * })
 * ```
 */
export function restoreConsola(mocks: ConsolaMocks): void {
  Object.values(mocks).forEach(mock => mock.mockRestore())
}

/**
 * Suppresses specific consola methods without assertion tracking.
 * Useful for silencing expected warnings/errors during test execution.
 *
 * @param consolaInstance - The consola instance to suppress
 * @param methods - Consola methods to suppress (default: error and warn)
 * @returns Cleanup function to restore consola methods
 *
 * @example
 * ```typescript
 * import {consola} from 'consola'
 * import {suppressConsola} from '@sparkle/test-utils/console'
 *
 * it('should handle WASM error gracefully', () => {
 *   const cleanup = suppressConsola(consola, ['error', 'warn'])
 *   // Test code that logs expected errors
 *   cleanup()
 * })
 * ```
 */
export function suppressConsola(
  consolaInstance: ConsolaLike,
  methods: ConsolaMethod[] = ['error', 'warn'],
): () => void {
  const mocks = mockConsola(consolaInstance, {methods, suppress: true})
  return () => restoreConsola(mocks)
}
