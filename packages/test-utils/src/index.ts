/**
 * Shared test utilities and mocking helpers for Sparkle monorepo.
 *
 * Provides reusable testing patterns organized by concern:
 * - `@sparkle/test-utils/dom` - Browser API mocks (localStorage, MediaQueryList, ResizeObserver)
 * - `@sparkle/test-utils/react` - React testing utilities with theme provider wrappers
 * - `@sparkle/test-utils/console` - Console method mocking and output suppression
 * - `@sparkle/test-utils/terminal` - XTerm.js mocking for terminal component tests
 * - `@sparkle/test-utils/lifecycle` - Standard test setup/teardown patterns
 *
 * @packageDocumentation
 */

// Re-export all utilities from submodules
export * from './console/index.js'
export * from './dom/index.js'
export * from './lifecycle/index.js'
export * from './react/index.js'
export * from './terminal/index.js'
