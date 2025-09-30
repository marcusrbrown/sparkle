import {beforeEach, vi} from 'vitest'
import '@testing-library/react'
import '@testing-library/jest-dom'

/**
 * Mock localStorage for theme persistence testing
 */
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}

// Set up localStorage mock
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

/**
 * Mock matchMedia for system theme detection testing
 */
const matchMediaMock = vi.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(), // deprecated
  removeListener: vi.fn(), // deprecated
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}))

// Set up matchMedia mock
Object.defineProperty(window, 'matchMedia', {
  value: matchMediaMock,
  writable: true,
})

/**
 * Mock console.warn to suppress expected localStorage errors during testing
 */
const originalConsoleWarn = console.warn

// Suppress localStorage-related warnings in test environment
Object.defineProperty(console, 'warn', {
  value: vi.fn((message: string, ...args: any[]) => {
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
 * Reset mocks before each test
 */
beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks()
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()

  // Reset matchMedia mock
  matchMediaMock.mockClear()
  matchMediaMock.mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
})

// Reset mocks before each test
beforeEach(() => {
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
})
