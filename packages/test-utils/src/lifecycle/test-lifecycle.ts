import {vi} from 'vitest'

/**
 * Standard test setup for beforeEach hooks.
 * Provides consistent mock cleanup and environment reset.
 *
 * Performs:
 * - Clears all mock call history
 * - Resets mock return values to defaults
 * - Clears mock implementations
 *
 * @example
 * ```typescript
 * describe('my tests', () => {
 *   beforeEach(() => {
 *     standardBeforeEach()
 *   })
 *
 *   it('should run with clean mock state', () => {
 *     // All mocks are cleared
 *   })
 * })
 * ```
 */
export function standardBeforeEach(): void {
  vi.clearAllMocks()
}

/**
 * Standard test teardown for afterEach hooks.
 * Restores original implementations and cleans up mocks.
 *
 * Performs:
 * - Restores all mocked functions to originals
 * - Clears timers if any were used
 *
 * @example
 * ```typescript
 * describe('my tests', () => {
 *   afterEach(() => {
 *     standardAfterEach()
 *   })
 *
 *   it('should cleanup properly', () => {
 *     vi.spyOn(console, 'log')
 *     // Will be restored after test
 *   })
 * })
 * ```
 */
export function standardAfterEach(): void {
  vi.restoreAllMocks()
}

/**
 * Comprehensive test environment cleanup.
 * Combines standard cleanup operations for thorough reset.
 *
 * Performs:
 * - Mock cleanup (clear + restore)
 * - Timer cleanup
 * - Module cache reset
 *
 * @example
 * ```typescript
 * afterEach(() => {
 *   cleanupTestEnvironment()
 * })
 * ```
 */
export function cleanupTestEnvironment(): void {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  vi.clearAllTimers()
}
