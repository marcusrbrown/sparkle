import {beforeEach, vi} from 'vitest'

import {createLocalStorageMock, createMediaQueryListMock} from './test-utils'

import '@testing-library/jest-dom'
import '@testing-library/react'

/**
 * Global localStorage mock instance.
 * Shared across all tests to maintain consistent state management and enable
 * test isolation through the resetLocalStorageMock utility.
 */
const localStorageMock = createLocalStorageMock()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

/**
 * Global matchMedia mock defaults to light mode preference.
 * Individual tests override this when testing dark mode or system theme switching.
 */
const defaultMatchMedia = vi.fn().mockImplementation(() => createMediaQueryListMock(false))

Object.defineProperty(window, 'matchMedia', {
  value: defaultMatchMedia,
  writable: true,
})

/**
 * Suppresses expected localStorage warnings to reduce test noise.
 * Real issues in application code still surface through other warnings.
 */
const originalConsoleWarn = console.warn

Object.defineProperty(console, 'warn', {
  value: vi.fn((message: string, ...args: unknown[]) => {
    if (
      typeof message === 'string' &&
      (message.includes('localStorage') ||
        message.includes('Failed to load theme') ||
        message.includes('Failed to save theme'))
    ) {
      return
    }
    originalConsoleWarn(message, ...args)
  }),
  writable: true,
})

/**
 * Resets all mocks before each test to prevent state pollution between tests.
 * Individual test files can use setupThemeTestEnvironment() for specific scenarios,
 * but this ensures a clean baseline state for all tests.
 */
beforeEach(() => {
  localStorageMock.getItem.mockClear()
  localStorageMock.getItem.mockReturnValue(null)
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
  localStorageMock.key.mockClear()
  localStorageMock.length = 0

  defaultMatchMedia.mockClear()
  defaultMatchMedia.mockImplementation(() => createMediaQueryListMock(false))
})
