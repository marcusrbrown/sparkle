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
 *
 * @example
 * ```typescript
 * beforeEach(() => {
 *   const mockLocalStorage = createLocalStorageMock()
 *   globalThis.localStorage = mockLocalStorage as unknown as Storage
 * })
 * ```
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
 *
 * @example
 * ```typescript
 * beforeEach(() => {
 *   resetLocalStorageMock(mockLocalStorage)
 * })
 * ```
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
 * Configures localStorage mock to return specific value.
 * Simplifies test setup by providing intention-revealing helper.
 *
 * @param mock - The localStorage mock to configure
 * @param key - Storage key
 * @param value - Value to return, or null to simulate missing item
 *
 * @example
 * ```typescript
 * it('should load saved theme', () => {
 *   setStoredValue(mockLocalStorage, 'theme', 'dark')
 *   expect(mockLocalStorage.getItem('theme')).toBe('dark')
 * })
 * ```
 */
export function setStoredValue(mock: LocalStorageMock, key: string, value: string | null): void {
  if (value === null) {
    mock.getItem.mockReturnValue(null)
  } else {
    mock.getItem.mockImplementation((k: string) => (k === key ? value : null))
  }
}
