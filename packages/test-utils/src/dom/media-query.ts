import {vi} from 'vitest'

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
 *
 * @example
 * ```typescript
 * const mockMediaQuery = createMediaQueryListMock(true) // dark mode
 * window.matchMedia = vi.fn(() => mockMediaQuery)
 *
 * // Simulate system theme change
 * mockMediaQuery._triggerChange(false) // switch to light mode
 * expect(mockMediaQuery.matches).toBe(false)
 * ```
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
    dispatchEvent: vi.fn((event: Event) => {
      if (event.type === 'change') {
        listeners.forEach(listener => listener(event as MediaQueryListEvent))
      }
      return true
    }),
    _triggerChange(newMatches: boolean): void {
      mock.matches = newMatches
      const event = {
        matches: newMatches,
        media: mock.media,
        type: 'change',
        target: mock,
      } as unknown as MediaQueryListEvent

      if (mock.onchange != null) {
        mock.onchange(event)
      }

      listeners.forEach(listener => listener(event))
    },
  }

  return mock
}
