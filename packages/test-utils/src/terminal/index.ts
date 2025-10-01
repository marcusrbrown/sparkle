/**
 * Terminal mocking utilities for XTerm.js component testing.
 *
 * Provides mocks for @xterm/xterm and @xterm/addon-fit to test terminal components
 * without actual terminal initialization.
 */

export {
  createFitAddonMock,
  createTerminalMock,
  setupXTermMocks,
  type MockFitAddon,
  type MockTerminal,
} from './xterm-mocks'
