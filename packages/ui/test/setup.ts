import '@testing-library/react'
import '@testing-library/jest-dom'

// Polyfill for Radix UI Pointer Events API requirements
// JSDOM and happy-dom don't implement hasPointerCapture/releasePointerCapture
// which are used by Radix UI Select and other components for pointer event handling
if (typeof Element !== 'undefined') {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = function (_pointerId: number): boolean {
      return false
    }
  }

  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = function (_pointerId: number): void {
      // No-op in test environment
    }
  }

  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = function (_pointerId: number): void {
      // No-op in test environment
    }
  }
}
