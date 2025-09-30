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
