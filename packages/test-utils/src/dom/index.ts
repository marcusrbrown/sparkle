/**
 * DOM mocking utilities for browser API testing.
 *
 * Provides type-safe mocks for:
 * - localStorage - browser storage API
 * - MediaQueryList - CSS media query matching
 * - ResizeObserver - element resize observation
 */

export {createLocalStorageMock, resetLocalStorageMock, setStoredValue, type LocalStorageMock} from './local-storage'
export {createMediaQueryListMock, type MediaQueryListMock} from './media-query'
export {createResizeObserverMock, setupResizeObserver, type ResizeObserverMock} from './resize-observer'
