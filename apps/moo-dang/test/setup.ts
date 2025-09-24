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

// Mock Worker for Web Worker testing
class MockWorker extends EventTarget {
  constructor(_url: string | URL) {
    super()
    // Mock constructor - don't actually create a worker in tests
  }

  postMessage(message: any): void {
    // Mock message posting - emit back to main thread after short delay
    setTimeout(() => {
      this.dispatchEvent(
        new MessageEvent('message', {
          data: {type: 'mock-response', originalMessage: message},
        }),
      )
    }, 10)
  }

  terminate(): void {
    // Mock termination - no-op in tests
  }

  addEventListener(type: string, listener: EventListener): void {
    super.addEventListener(type, listener)
  }

  removeEventListener(type: string, listener: EventListener): void {
    super.removeEventListener(type, listener)
  }
}

// Replace global Worker with mock in test environment
if (globalThis.Worker === undefined) {
  globalThis.Worker = MockWorker as any
}
