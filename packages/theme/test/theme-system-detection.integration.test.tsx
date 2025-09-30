import type {ThemeConfig} from '@sparkle/types'

import type {ThemeCollection} from '../src/context/ThemeContext'
import type {LocalStorageMock, MediaQueryListMock} from './test-utils'

import {act, fireEvent, render, screen, waitFor} from '@testing-library/react'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {useTheme} from '../src/hooks'
import {ThemeProvider} from '../src/providers/ThemeProvider'
import {createMediaQueryListMock, resetLocalStorageMock} from './test-utils'

// Mock theme configurations
const mockLightTheme: ThemeConfig = {
  colors: {
    primary: {500: '#3b82f6'},
    neutral: {500: '#6b7280'},
  },
  spacing: {4: '1rem'},
  typography: {
    fontFamily: {sans: 'Inter'},
    fontSize: {base: '1rem'},
    fontWeight: {normal: 400},
    lineHeight: {normal: 1.5},
    letterSpacing: {normal: '0'},
  },
  borderRadius: {md: '0.375rem'},
  shadows: {sm: '0 1px 2px rgba(0,0,0,0.1)'},
  animation: {
    duration: {normal: '300ms'},
    easing: {ease: 'ease'},
    transition: {all: 'all 300ms ease'},
  },
}

const mockDarkTheme: ThemeConfig = {
  ...mockLightTheme,
  colors: {
    primary: {500: '#3b82f6'},
    neutral: {500: '#9ca3af'},
  },
}

const mockThemes: ThemeCollection = {
  light: mockLightTheme,
  dark: mockDarkTheme,
}

// Test component for system detection integration
function SystemDetectionTestComponent() {
  const {theme, activeTheme, setTheme, systemTheme, isLoading} = useTheme()

  return (
    <div>
      <span data-testid="current-theme">{activeTheme}</span>
      <span data-testid="system-theme">{systemTheme}</span>
      <span data-testid="primary-color">{theme.colors.primary?.[500]}</span>
      <span data-testid="neutral-color">{theme.colors.neutral?.[500]}</span>
      <span data-testid="loading">{isLoading ? 'loading' : 'loaded'}</span>
      <button data-testid="switch-to-light" onClick={() => setTheme('light')}>
        Light
      </button>
      <button data-testid="switch-to-dark" onClick={() => setTheme('dark')}>
        Dark
      </button>
      <button data-testid="switch-to-system" onClick={() => setTheme('system')}>
        System
      </button>
    </div>
  )
}

// Get reference to the global localStorage mock from setup
const mockLocalStorage = window.localStorage as unknown as LocalStorageMock

describe('System Detection Integration Tests', () => {
  let mockMediaQueryList: MediaQueryListMock

  beforeEach(() => {
    // Reset localStorage mock to default state
    resetLocalStorageMock(mockLocalStorage)

    // Create fresh MediaQueryList mock for each test
    mockMediaQueryList = createMediaQueryListMock(false) // Default to light
    mockMediaQueryList = createMediaQueryListMock(false) // Default to light

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => mockMediaQueryList),
    })
  })

  describe('System Theme Detection on Mount', () => {
    it('should detect light system theme correctly', async () => {
      mockMediaQueryList = createMediaQueryListMock(false)
      window.matchMedia = vi.fn().mockImplementation(() => mockMediaQueryList)

      render(
        <ThemeProvider themes={mockThemes} defaultTheme="system">
          <SystemDetectionTestComponent />
        </ThemeProvider>,
      )

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
        expect(screen.getByTestId('system-theme')).toHaveTextContent('light')
        expect(screen.getByTestId('neutral-color')).toHaveTextContent('#6b7280') // Light theme color
      })
    })

    it('should detect dark system theme correctly', async () => {
      mockMediaQueryList = createMediaQueryListMock(true)
      window.matchMedia = vi.fn().mockImplementation(() => mockMediaQueryList)

      render(
        <ThemeProvider themes={mockThemes} defaultTheme="system">
          <SystemDetectionTestComponent />
        </ThemeProvider>,
      )

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
        expect(screen.getByTestId('system-theme')).toHaveTextContent('dark')
        expect(screen.getByTestId('neutral-color')).toHaveTextContent('#9ca3af') // Dark theme color
      })
    })
  })

  describe('Runtime System Theme Changes', () => {
    it('should update theme when system preference changes from light to dark', async () => {
      mockMediaQueryList = createMediaQueryListMock(false) // Start with light
      window.matchMedia = vi.fn().mockImplementation(() => mockMediaQueryList)

      render(
        <ThemeProvider themes={mockThemes} defaultTheme="system">
          <SystemDetectionTestComponent />
        </ThemeProvider>,
      )

      // Initially light
      await waitFor(() => {
        expect(screen.getByTestId('system-theme')).toHaveTextContent('light')
        expect(screen.getByTestId('neutral-color')).toHaveTextContent('#6b7280')
      })

      // Simulate system theme change to dark
      act(() => {
        mockMediaQueryList._triggerChange(true)
      })

      await waitFor(() => {
        expect(screen.getByTestId('system-theme')).toHaveTextContent('dark')
        expect(screen.getByTestId('neutral-color')).toHaveTextContent('#9ca3af')
      })
    })

    it('should update theme when system preference changes from dark to light', async () => {
      mockMediaQueryList = createMediaQueryListMock(true) // Start with dark
      window.matchMedia = vi.fn().mockImplementation(() => mockMediaQueryList)

      render(
        <ThemeProvider themes={mockThemes} defaultTheme="system">
          <SystemDetectionTestComponent />
        </ThemeProvider>,
      )

      // Initially dark
      await waitFor(() => {
        expect(screen.getByTestId('system-theme')).toHaveTextContent('dark')
        expect(screen.getByTestId('neutral-color')).toHaveTextContent('#9ca3af')
      })

      // Simulate system theme change to light
      act(() => {
        mockMediaQueryList._triggerChange(false)
      })

      await waitFor(() => {
        expect(screen.getByTestId('system-theme')).toHaveTextContent('light')
        expect(screen.getByTestId('neutral-color')).toHaveTextContent('#6b7280')
      })
    })

    it('should not affect theme when user has manually selected non-system theme', async () => {
      mockMediaQueryList = createMediaQueryListMock(false) // Start with light
      window.matchMedia = vi.fn().mockImplementation(() => mockMediaQueryList)

      render(
        <ThemeProvider themes={mockThemes} defaultTheme="system">
          <SystemDetectionTestComponent />
        </ThemeProvider>,
      )

      // Switch to manual dark theme
      fireEvent.click(screen.getByTestId('switch-to-dark'))

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
        expect(screen.getByTestId('neutral-color')).toHaveTextContent('#9ca3af')
      })

      // Simulate system theme change - should not affect manually selected theme
      act(() => {
        mockMediaQueryList._triggerChange(true)
      })

      await waitFor(() => {
        // Theme should remain manually selected dark, not changed by system
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
        expect(screen.getByTestId('system-theme')).toHaveTextContent('dark') // System updated
        expect(screen.getByTestId('neutral-color')).toHaveTextContent('#9ca3af') // Still manual dark
      })
    })

    it('should respond to system changes when switched back to system theme', async () => {
      mockMediaQueryList = createMediaQueryListMock(false) // Start with light
      window.matchMedia = vi.fn().mockImplementation(() => mockMediaQueryList)

      render(
        <ThemeProvider themes={mockThemes} defaultTheme="system">
          <SystemDetectionTestComponent />
        </ThemeProvider>,
      )

      // Switch to manual theme first
      fireEvent.click(screen.getByTestId('switch-to-light'))
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
      })

      // Switch back to system
      fireEvent.click(screen.getByTestId('switch-to-system'))
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
      })

      // Now system changes should affect the theme
      act(() => {
        mockMediaQueryList._triggerChange(true)
      })
      await waitFor(() => {
        expect(screen.getByTestId('system-theme')).toHaveTextContent('dark')
        expect(screen.getByTestId('neutral-color')).toHaveTextContent('#9ca3af')
      })
    })
  })

  describe('System Detection Fallback Behavior', () => {
    it('should fallback to light theme when matchMedia is unavailable', async () => {
      // Remove matchMedia to simulate older browsers
      const originalMatchMedia = window.matchMedia
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: undefined,
      })

      render(
        <ThemeProvider themes={mockThemes} defaultTheme="system">
          <SystemDetectionTestComponent />
        </ThemeProvider>,
      )

      await waitFor(() => {
        expect(screen.getByTestId('system-theme')).toHaveTextContent('light')
        expect(screen.getByTestId('neutral-color')).toHaveTextContent('#6b7280')
      })

      // Restore matchMedia
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: originalMatchMedia,
      })
    })

    it('should handle matchMedia errors gracefully', async () => {
      const originalMatchMedia = window.matchMedia
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(() => {
          throw new Error('matchMedia not supported')
        }),
      })

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Should not throw during render
      render(
        <ThemeProvider themes={mockThemes} defaultTheme="light">
          <SystemDetectionTestComponent />
        </ThemeProvider>,
      )

      await waitFor(() => {
        // Should still render properly with fallback
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })

      consoleError.mockRestore()
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: originalMatchMedia,
      })
    })
  })

  describe('System Detection Disabled', () => {
    it('should not detect system theme when disabled', async () => {
      mockMediaQueryList = createMediaQueryListMock(true) // System is dark
      window.matchMedia = vi.fn().mockImplementation(() => mockMediaQueryList)

      render(
        <ThemeProvider themes={mockThemes} defaultTheme="system" disableSystemTheme>
          <SystemDetectionTestComponent />
        </ThemeProvider>,
      )

      await waitFor(() => {
        // Should use light as fallback when system detection is disabled
        expect(screen.getByTestId('system-theme')).toHaveTextContent('light')
        expect(screen.getByTestId('neutral-color')).toHaveTextContent('#6b7280')
      })
    })

    it('should not respond to system changes when disabled', async () => {
      mockMediaQueryList = createMediaQueryListMock(false)
      window.matchMedia = vi.fn().mockImplementation(() => mockMediaQueryList)

      render(
        <ThemeProvider themes={mockThemes} defaultTheme="system" disableSystemTheme>
          <SystemDetectionTestComponent />
        </ThemeProvider>,
      )

      await waitFor(() => {
        expect(screen.getByTestId('system-theme')).toHaveTextContent('light')
      })

      // Simulate system change - should be ignored
      act(() => {
        mockMediaQueryList._triggerChange(true)
      })

      // Give it time to potentially update
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(screen.getByTestId('system-theme')).toHaveTextContent('light')
    })
  })

  describe('Cross-Platform System Detection', () => {
    it('should handle SSR environment without system detection', async () => {
      // Mock SSR environment by removing matchMedia
      const originalMatchMedia = window.matchMedia
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: undefined,
      })

      render(
        <ThemeProvider themes={mockThemes} defaultTheme="light">
          <SystemDetectionTestComponent />
        </ThemeProvider>,
      )

      await waitFor(() => {
        expect(screen.getByTestId('system-theme')).toHaveTextContent('light')
      })

      // Restore
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: originalMatchMedia,
      })
    })

    it('should handle React Native environment gracefully', async () => {
      // Mock React Native Appearance API in global context
      const mockAppearance = {
        getColorScheme: vi.fn().mockReturnValue('dark'),
        addChangeListener: vi.fn().mockReturnValue({remove: vi.fn()}),
      }

      // @ts-expect-error - Mocking React Native global
      globalThis.RNAppearance = mockAppearance

      // Disable web matchMedia
      const originalMatchMedia = window.matchMedia
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: undefined,
      })

      render(
        <ThemeProvider themes={mockThemes} defaultTheme="light">
          <SystemDetectionTestComponent />
        </ThemeProvider>,
      )

      await waitFor(() => {
        // Should fallback to light when web matchMedia is not available
        // Real React Native integration would be tested in a React Native environment
        expect(screen.getByTestId('system-theme')).toHaveTextContent('light')
      })

      // Clean up mocks
      // @ts-expect-error - Cleaning up React Native mock
      delete globalThis.RNAppearance
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: originalMatchMedia,
      })
    })
  })

  describe('System Detection with Multiple Theme Switches', () => {
    it('should correctly handle rapid theme switches including system', async () => {
      mockMediaQueryList = createMediaQueryListMock(false) // Start with light
      window.matchMedia = vi.fn().mockImplementation(() => mockMediaQueryList)

      const {unmount} = render(
        <ThemeProvider themes={mockThemes} defaultTheme="system">
          <SystemDetectionTestComponent />
        </ThemeProvider>,
      )

      // Start with system (light)
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
        expect(screen.getByTestId('neutral-color')).toHaveTextContent('#6b7280')
      })

      // Switch to dark manually
      fireEvent.click(screen.getByTestId('switch-to-dark'))
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
      })

      // Switch to light manually
      fireEvent.click(screen.getByTestId('switch-to-light'))
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
      })

      // Switch back to system
      fireEvent.click(screen.getByTestId('switch-to-system'))
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
      })

      // System changes to dark
      act(() => {
        mockMediaQueryList._triggerChange(true)
      })
      await waitFor(() => {
        expect(screen.getByTestId('system-theme')).toHaveTextContent('dark')
        expect(screen.getByTestId('neutral-color')).toHaveTextContent('#9ca3af')
      })

      unmount()
    })
  })

  describe('Event Listener Management', () => {
    it('should properly clean up event listeners on unmount', async () => {
      mockMediaQueryList = createMediaQueryListMock(false)
      const addEventListenerSpy = vi.spyOn(mockMediaQueryList, 'addEventListener')
      const removeEventListenerSpy = vi.spyOn(mockMediaQueryList, 'removeEventListener')

      window.matchMedia = vi.fn().mockImplementation(() => mockMediaQueryList)

      const {unmount} = render(
        <ThemeProvider themes={mockThemes} defaultTheme="system">
          <SystemDetectionTestComponent />
        </ThemeProvider>,
      )

      // Should have added event listener
      expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function))

      unmount()

      // Should have removed event listener
      expect(removeEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function))
    })

    it('should handle legacy addListener/removeListener methods', async () => {
      // Create mock without modern addEventListener
      const legacyMockMediaQueryList = {
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }

      window.matchMedia = vi.fn().mockImplementation(() => legacyMockMediaQueryList)

      const {unmount} = render(
        <ThemeProvider themes={mockThemes} defaultTheme="system">
          <SystemDetectionTestComponent />
        </ThemeProvider>,
      )

      // Should have used legacy addListener
      expect(legacyMockMediaQueryList.addListener).toHaveBeenCalledWith(expect.any(Function))

      unmount()

      // Should have used legacy removeListener
      expect(legacyMockMediaQueryList.removeListener).toHaveBeenCalledWith(expect.any(Function))
    })
  })
})
