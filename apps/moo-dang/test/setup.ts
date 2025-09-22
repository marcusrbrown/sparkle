import '@testing-library/jest-dom'

/**
 * Test setup configuration for moo-dang WASM web shell.
 *
 * This file configures the testing environment with necessary polyfills
 * and setup for React Testing Library and Vitest.
 */

// Mock DOM methods that might not be available in the test environment
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
})

// Mock ResizeObserver for components that might use it
globalThis.ResizeObserver = class ResizeObserver {
  observe() {
    // Mock implementation
  }

  unobserve() {
    // Mock implementation
  }

  disconnect() {
    // Mock implementation
  }
}
