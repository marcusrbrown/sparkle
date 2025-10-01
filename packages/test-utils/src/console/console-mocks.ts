import {vi} from 'vitest'

/**
 * Type-safe console mocks interface.
 * Tracks all standard console methods as Vitest mocks.
 */
export interface ConsoleMocks {
  log: ReturnType<typeof vi.fn>
  info: ReturnType<typeof vi.fn>
  warn: ReturnType<typeof vi.fn>
  error: ReturnType<typeof vi.fn>
  debug: ReturnType<typeof vi.fn>
  [key: string]: ReturnType<typeof vi.fn>
}

/**
 * Console method names that can be mocked.
 */
export type ConsoleMethod = 'log' | 'info' | 'warn' | 'error' | 'debug'

/**
 * Creates console method mocks for capturing output in tests.
 * By default, console calls are suppressed (mockImplementation with empty function).
 * Pass `suppress: false` to allow console output while still tracking calls.
 *
 * @param options - Configuration options
 * @param options.methods - Specific methods to mock (default: all)
 * @param options.suppress - Whether to suppress console output (default: true)
 * @returns Object containing all console mocks
 *
 * @example
 * ```typescript
 * describe('logging tests', () => {
 *   let consoleMocks: ConsoleMocks
 *
 *   beforeEach(() => {
 *     consoleMocks = mockConsole()
 *   })
 *
 *   afterEach(() => {
 *     restoreConsole(consoleMocks)
 *   })
 *
 *   it('should log messages', () => {
 *     console.log('test')
 *     expect(consoleMocks.log).toHaveBeenCalledWith('test')
 *   })
 * })
 * ```
 */
export function mockConsole(options?: {methods?: ConsoleMethod[]; suppress?: boolean}): ConsoleMocks {
  const {methods = ['log', 'info', 'warn', 'error', 'debug'], suppress = true} = options ?? {}

  const mocks: Record<string, ReturnType<typeof vi.fn>> = {}

  for (const method of methods) {
    const spy = vi.spyOn(console, method)
    if (suppress) {
      spy.mockImplementation(() => {})
    }
    mocks[method] = spy as unknown as ReturnType<typeof vi.fn>
  }

  return mocks as ConsoleMocks
}

/**
 * Restores console methods to original implementations.
 * Essential for cleanup to prevent test interdependence.
 *
 * @param mocks - The console mocks to restore
 *
 * @example
 * ```typescript
 * afterEach(() => {
 *   restoreConsole(consoleMocks)
 * })
 * ```
 */
export function restoreConsole(mocks: ConsoleMocks): void {
  Object.values(mocks).forEach(mock => mock.mockRestore())
}

/**
 * Suppresses specific console methods without assertion tracking.
 * Useful for silencing expected warnings/errors in tests.
 *
 * @param methods - Console methods to suppress (default: all)
 * @returns Cleanup function to restore console methods
 *
 * @example
 * ```typescript
 * it('should handle error gracefully', () => {
 *   const cleanup = suppressConsole(['error', 'warn'])
 *   // Test code that logs errors
 *   cleanup()
 * })
 * ```
 */
export function suppressConsole(methods: ConsoleMethod[] = ['log', 'info', 'warn', 'error', 'debug']): () => void {
  const mocks = mockConsole({methods, suppress: true})
  return () => restoreConsole(mocks)
}
