import type {ThemeConfig} from '@sparkle/types'
import {vi} from 'vitest'

/**
 * Type-safe localStorage mock interface.
 * Ensures test mocks maintain API compatibility with browser localStorage.
 */
export interface LocalStorageMock {
  getItem: ReturnType<typeof vi.fn<(key: string) => string | null>>
  setItem: ReturnType<typeof vi.fn<(key: string, value: string) => void>>
  removeItem: ReturnType<typeof vi.fn<(key: string) => void>>
  clear: ReturnType<typeof vi.fn<() => void>>
  length: number
  key: ReturnType<typeof vi.fn<(index: number) => string | null>>
}

/**
 * Creates a fresh localStorage mock instance.
 * Using factory functions prevents mock state pollution between test files.
 *
 * @returns A new localStorage mock with all methods as Vitest mocks
 */
export function createLocalStorageMock(): LocalStorageMock {
  return {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(() => null),
  }
}

/**
 * Resets localStorage mock to clean state.
 * Essential for beforeEach hooks to prevent test interdependence.
 *
 * @param mock - The localStorage mock to reset
 */
export function resetLocalStorageMock(mock: LocalStorageMock): void {
  mock.getItem.mockClear()
  mock.getItem.mockReturnValue(null)
  mock.setItem.mockClear()
  mock.removeItem.mockClear()
  mock.clear.mockClear()
  mock.key.mockClear()
  mock.length = 0
}

/**
 * Type-safe MediaQueryList mock interface.
 * Includes _triggerChange helper for simulating system theme changes.
 */
export interface MediaQueryListMock {
  matches: boolean
  media: string
  onchange: ((event: MediaQueryListEvent) => void) | null
  addListener: ReturnType<typeof vi.fn<(listener: (event: MediaQueryListEvent) => void) => void>>
  removeListener: ReturnType<typeof vi.fn<(listener: (event: MediaQueryListEvent) => void) => void>>
  addEventListener: ReturnType<typeof vi.fn<(event: string, listener: (event: MediaQueryListEvent) => void) => void>>
  removeEventListener: ReturnType<typeof vi.fn<(event: string, listener: (event: MediaQueryListEvent) => void) => void>>
  dispatchEvent: ReturnType<typeof vi.fn<(event: Event) => boolean>>
  _triggerChange: (newMatches: boolean) => void
}

/**
 * Creates MediaQueryList mock with theme change simulation.
 * The _triggerChange method allows tests to simulate OS theme preference changes
 * without actually modifying system settings.
 *
 * @param initialMatches - Whether the media query initially matches (true for dark mode)
 * @returns Mock with helper method to trigger system theme changes
 */
export function createMediaQueryListMock(initialMatches: boolean): MediaQueryListMock {
  const listeners: ((event: MediaQueryListEvent) => void)[] = []

  const mock: MediaQueryListMock = {
    matches: initialMatches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addListener: vi.fn((listener: (event: MediaQueryListEvent) => void) => {
      listeners.push(listener)
    }),
    removeListener: vi.fn((listener: (event: MediaQueryListEvent) => void) => {
      const index = listeners.indexOf(listener)
      if (index !== -1) {
        listeners.splice(index, 1)
      }
    }),
    addEventListener: vi.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
      if (event === 'change') {
        listeners.push(listener)
      }
    }),
    removeEventListener: vi.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
      if (event === 'change') {
        const index = listeners.indexOf(listener)
        if (index !== -1) {
          listeners.splice(index, 1)
        }
      }
    }),
    dispatchEvent: vi.fn(),
    _triggerChange(newMatches: boolean) {
      this.matches = newMatches
      const event = {matches: newMatches} as MediaQueryListEvent
      listeners.forEach(listener => listener(event))
    },
  }

  return mock
}

/**
 * Standard mock theme configurations used across test suites.
 * Centralizing these fixtures eliminates duplication and ensures consistency.
 */
export const mockThemeFixtures = {
  light: {
    colors: {
      primary: {500: '#3b82f6'},
      neutral: {500: '#6b7280'},
    },
    spacing: {4: '1rem'},
    typography: {
      fontFamily: {sans: 'Inter'},
      fontSize: {base: '1rem'},
      fontWeight: {normal: 400},
      lineHeight: {normal: 1.5},
      letterSpacing: {normal: '0'},
    },
    borderRadius: {md: '0.375rem'},
    shadows: {sm: '0 1px 2px rgba(0,0,0,0.1)'},
    animation: {
      duration: {normal: '300ms'},
      easing: {ease: 'ease'},
      transition: {all: 'all 300ms ease'},
    },
  } as ThemeConfig,
  dark: {
    colors: {
      primary: {500: '#3b82f6'},
      neutral: {500: '#9ca3af'},
    },
    spacing: {4: '1rem'},
    typography: {
      fontFamily: {sans: 'Inter'},
      fontSize: {base: '1rem'},
      fontWeight: {normal: 400},
      lineHeight: {normal: 1.5},
      letterSpacing: {normal: '0'},
    },
    borderRadius: {md: '0.375rem'},
    shadows: {sm: '0 1px 2px rgba(0,0,0,0.1)'},
    animation: {
      duration: {normal: '300ms'},
      easing: {ease: 'ease'},
      transition: {all: 'all 300ms ease'},
    },
  } as ThemeConfig,
}

/**
 * Creates a theme collection from standard fixtures.
 * Provides consistent theme configurations for testing theme switching behavior.
 *
 * @returns Theme collection with light and dark theme configurations
 */
export function createMockThemes(): {light: ThemeConfig; dark: ThemeConfig} {
  return {
    light: mockThemeFixtures.light,
    dark: mockThemeFixtures.dark,
  }
}

/**
 * Configures localStorage mock to return a specific stored theme.
 * Simplifies test setup for persistence scenarios.
 *
 * @param mock - The localStorage mock instance
 * @param theme - Theme name to return from storage ('light', 'dark', 'system', or null)
 * @param storageKey - Optional custom storage key (defaults to 'sparkle-theme')
 */
export function setStoredTheme(mock: LocalStorageMock, theme: string | null, storageKey = 'sparkle-theme'): void {
  if (theme === null) {
    mock.getItem.mockReturnValue(null)
  } else {
    mock.getItem.mockImplementation((key: string) => (key === storageKey ? theme : null))
  }
}

/**
 * Configures matchMedia mock for a specific system theme preference.
 * Eliminates boilerplate of creating and assigning matchMedia mocks in tests.
 *
 * @param isDark - Whether system prefers dark mode (true) or light mode (false)
 * @returns The configured MediaQueryList mock
 */
export function setupSystemTheme(isDark: boolean): MediaQueryListMock {
  const mockMediaQueryList = createMediaQueryListMock(isDark)
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => mockMediaQueryList),
  })
  return mockMediaQueryList
}

/**
 * Complete test environment setup for theme testing scenarios.
 * Combines localStorage and system theme configuration in one call.
 *
 * @param options - Configuration for the test environment
 * @param options.storedTheme - Theme stored in localStorage (null for no stored theme)
 * @param options.systemTheme - System theme preference ('light' or 'dark')
 * @param options.storageKey - Custom storage key (optional)
 * @returns Object containing configured mocks
 */
export function setupThemeTestEnvironment(options: {
  storedTheme?: string | null
  systemTheme?: 'light' | 'dark'
  storageKey?: string
}): {
  localStorage: LocalStorageMock
  mediaQueryList: MediaQueryListMock
} {
  const {storedTheme = null, systemTheme = 'light', storageKey = 'sparkle-theme'} = options

  const mockLocalStorage = window.localStorage as unknown as LocalStorageMock
  resetLocalStorageMock(mockLocalStorage)
  setStoredTheme(mockLocalStorage, storedTheme, storageKey)

  const mockMediaQueryList = setupSystemTheme(systemTheme === 'dark')

  return {
    localStorage: mockLocalStorage,
    mediaQueryList: mockMediaQueryList,
  }
}
