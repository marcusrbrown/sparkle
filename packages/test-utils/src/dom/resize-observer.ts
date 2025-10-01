import {vi} from 'vitest'

/**
 * Type-safe ResizeObserver mock interface.
 * Provides standard ResizeObserver API for testing component resizing behavior.
 */
export interface ResizeObserverMock {
  observe: ReturnType<typeof vi.fn<(target: Element) => void>>
  unobserve: ReturnType<typeof vi.fn<(target: Element) => void>>
  disconnect: ReturnType<typeof vi.fn<() => void>>
}

/**
 * Creates ResizeObserver mock factory.
 * Returns a constructor function that creates ResizeObserver mock instances.
 *
 * @returns Mock constructor for ResizeObserver
 *
 * @example
 * ```typescript
 * beforeEach(() => {
 *   globalThis.ResizeObserver = createResizeObserverMock()
 * })
 * ```
 */
export function createResizeObserverMock(): new (callback: ResizeObserverCallback) => ResizeObserverMock {
  return vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
}

/**
 * Configures global ResizeObserver mock.
 * Simplifies test setup by automatically installing mock on globalThis.
 *
 * @example
 * ```typescript
 * beforeEach(() => {
 *   setupResizeObserver()
 * })
 *
 * it('should observe element resizing', () => {
 *   const observer = new ResizeObserver(() => {})
 *   observer.observe(element)
 * })
 * ```
 */
export function setupResizeObserver(): void {
  globalThis.ResizeObserver = createResizeObserverMock() as unknown as typeof ResizeObserver
}
