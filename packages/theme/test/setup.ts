import {beforeEach, vi} from 'vitest'

import {createLocalStorageMock, createMediaQueryListMock} from './test-utils'

import '@testing-library/jest-dom'
import '@testing-library/react'

/**
 * Global localStorage mock instance.
 * Tests can access and manipulate this directly if needed.
 */
const localStorageMock = createLocalStorageMock()

// Set up localStorage mock
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

/**
 * Global matchMedia mock.
 * Defaults to light mode (matches: false).
 * Tests should override this per-test if they need different behavior.
 */
const defaultMatchMedia = vi.fn().mockImplementation(() => createMediaQueryListMock(false))

// Set up matchMedia mock
Object.defineProperty(window, 'matchMedia', {
  value: defaultMatchMedia,
  writable: true,
})

/**
 * Mock console.warn to suppress expected localStorage errors during testing.
 * Only suppresses localStorage-related warnings, letting other warnings through.
 */
const originalConsoleWarn = console.warn

Object.defineProperty(console, 'warn', {
  value: vi.fn((message: string, ...args: unknown[]) => {
    // Only suppress localStorage-related warnings
    if (
      typeof message === 'string' &&
      (message.includes('localStorage') ||
        message.includes('Failed to load theme') ||
        message.includes('Failed to save theme'))
    ) {
      return
    }
    // Let other warnings through
    originalConsoleWarn(message, ...args)
  }),
  writable: true,
})

/**
 * Reset all mocks to default state before each test.
 * This ensures tests start with clean, predictable state.
 */
beforeEach(() => {
  // Reset localStorage mock to default state
  localStorageMock.getItem.mockClear()
  localStorageMock.getItem.mockReturnValue(null)
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
  localStorageMock.key.mockClear()
  localStorageMock.length = 0

  // Reset matchMedia mock to default (light mode)
  defaultMatchMedia.mockClear()
  defaultMatchMedia.mockImplementation(() => createMediaQueryListMock(false))
})
