/**
 * Console mocking utilities for test output management.
 *
 * Provides type-safe console mocks for capturing and suppressing console output during tests.
 */

export {
  mockConsola,
  restoreConsola,
  suppressConsola,
  type ConsolaLike,
  type ConsolaMethod,
  type ConsolaMocks,
} from './consola-mocks'
export {mockConsole, restoreConsole, suppressConsole, type ConsoleMethod, type ConsoleMocks} from './console-mocks'
