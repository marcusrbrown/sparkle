import '@testing-library/react'
import '@testing-library/jest-dom'

// Polyfill Pointer Events API methods required by Radix UI components
// Testing environments (JSDOM/happy-dom) don't implement these browser APIs,
// causing "hasPointerCapture is not a function" errors during test execution
if (typeof Element !== 'undefined') {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = function (_pointerId: number): boolean {
      return false
    }
  }

  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = function (_pointerId: number): void {
      // No-op in test environment - pointer capture isn't meaningful without real browser events
    }
  }

  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = function (_pointerId: number): void {
      // No-op in test environment - pointer capture isn't meaningful without real browser events
    }
  }
}
