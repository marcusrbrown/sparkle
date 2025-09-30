import {vi} from 'vitest'

/**
 * Type-safe localStorage mock for testing
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
 * Creates a fresh localStorage mock instance for testing.
 * This provides a clean, predictable mock without global state pollution.
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
 * Resets a localStorage mock to its default state.
 * This is useful for beforeEach hooks to ensure clean test state.
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
 * Type-safe MediaQueryList mock for testing
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
 * Creates a mock MediaQueryList with the ability to simulate theme changes.
 * This is useful for testing system theme detection.
 *
 * @param initialMatches - Whether the media query initially matches (true for dark mode)
 * @returns A mock MediaQueryList with helper method to trigger changes
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
