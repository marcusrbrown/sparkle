import type {ThemeConfig} from '@sparkle/types'
import type {ThemeCollection} from '../src/context/ThemeContext'
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {useTheme} from '../src/hooks'
import {DEFAULT_THEME_STORAGE_KEY} from '../src/persistence'
import {ThemeProvider} from '../src/providers/ThemeProvider'

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

// Test component for combined integration testing
function CombinedIntegrationTestComponent() {
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

// Get reference to the mocked localStorage
const mockLocalStorage = window.localStorage as any

// Helper to create a mock MediaQueryList with change simulation
function createMockMediaQueryList(matches: boolean) {
  const listeners: ((event: MediaQueryListEvent) => void)[] = []

  return {
    matches,
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
    // Helper to simulate system theme change
    _triggerChange(newMatches: boolean) {
      this.matches = newMatches
      const event = {matches: newMatches} as MediaQueryListEvent
      listeners.forEach(listener => listener(event))
    },
  }
}

describe('Combined Persistence + System Detection Integration Tests', () => {
  let mockMediaQueryList: ReturnType<typeof createMockMediaQueryList>

  beforeEach(() => {
    // Reset localStorage mock
    mockLocalStorage.getItem.mockReturnValue(null)
    mockLocalStorage.setItem.mockClear()
    mockLocalStorage.removeItem.mockClear()

    // Create fresh mock for each test
    mockMediaQueryList = createMockMediaQueryList(false) // Default to light

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => mockMediaQueryList),
    })
  })

  describe('Priority Resolution: Stored vs System Theme', () => {
    it('should prefer stored theme over system default on initialization', async () => {
      // System is dark, but user has stored light preference
      mockMediaQueryList = createMockMediaQueryList(true) // System is dark
      window.matchMedia = vi.fn().mockImplementation(() => mockMediaQueryList)
      mockLocalStorage.getItem.mockReturnValue('light')

      render(
        <ThemeProvider themes={mockThemes} defaultTheme="system">
          <CombinedIntegrationTestComponent />
        </ThemeProvider>,
      )

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
        expect(screen.getByTestId('system-theme')).toHaveTextContent('dark')
        expect(screen.getByTestId('neutral-color')).toHaveTextContent('#6b7280') // Light theme
        expect(mockLocalStorage.getItem).toHaveBeenCalledWith(DEFAULT_THEME_STORAGE_KEY)
      })
    })

    it('should use system theme when no stored preference exists', async () => {
      // No stored preference, system is dark
      mockMediaQueryList = createMockMediaQueryList(true) // System is dark
      window.matchMedia = vi.fn().mockImplementation(() => mockMediaQueryList)
      mockLocalStorage.getItem.mockReturnValue(null)

      render(
        <ThemeProvider themes={mockThemes} defaultTheme="system">
          <CombinedIntegrationTestComponent />
        </ThemeProvider>,
      )

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
        expect(screen.getByTestId('system-theme')).toHaveTextContent('dark')
        expect(screen.getByTestId('neutral-color')).toHaveTextContent('#9ca3af') // Dark theme
      })
    })

    it('should remove stored preference when switching to system theme', async () => {
      // Start with stored light preference
      mockLocalStorage.getItem.mockReturnValue('light')
      mockMediaQueryList = createMockMediaQueryList(true) // System is dark

      render(
        <ThemeProvider themes={mockThemes}>
          <CombinedIntegrationTestComponent />
        </ThemeProvider>,
      )

      // Initially using stored light theme
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
      })

      // Switch to system theme
      fireEvent.click(screen.getByTestId('switch-to-system'))

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
        expect(screen.getByTestId('system-theme')).toHaveTextContent('dark')
        expect(screen.getByTestId('neutral-color')).toHaveTextContent('#9ca3af')
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(DEFAULT_THEME_STORAGE_KEY)
      })
    })
  })

  describe('System Theme Changes with Persistence Interaction', () => {
    it('should persist manual theme selection even when system theme changes', async () => {
      mockMediaQueryList = createMockMediaQueryList(false) // System starts light
      window.matchMedia = vi.fn().mockImplementation(() => mockMediaQueryList)

      render(
        <ThemeProvider themes={mockThemes} defaultTheme="system">
          <CombinedIntegrationTestComponent />
        </ThemeProvider>,
      )

      // Initially using system light
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
        expect(screen.getByTestId('neutral-color')).toHaveTextContent('#6b7280')
      })

      // Switch to manual dark theme
      fireEvent.click(screen.getByTestId('switch-to-dark'))

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(DEFAULT_THEME_STORAGE_KEY, 'dark')
      })

      // System changes to dark - should not affect manually selected theme
      act(() => {
        mockMediaQueryList._triggerChange(true)
      })

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark') // Still manual
        expect(screen.getByTestId('system-theme')).toHaveTextContent('dark') // System updated
        expect(screen.getByTestId('neutral-color')).toHaveTextContent('#9ca3af') // Still manual dark
      })
    })

    it('should follow system changes when using system theme and persist re-selection', async () => {
      mockMediaQueryList = createMockMediaQueryList(false) // System starts light
      window.matchMedia = vi.fn().mockImplementation(() => mockMediaQueryList)

      render(
        <ThemeProvider themes={mockThemes} defaultTheme="system">
          <CombinedIntegrationTestComponent />
        </ThemeProvider>,
      )

      // Initially system light
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
        expect(screen.getByTestId('neutral-color')).toHaveTextContent('#6b7280')
      })

      // Switch to manual theme then back to system
      fireEvent.click(screen.getByTestId('switch-to-light'))
      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(DEFAULT_THEME_STORAGE_KEY, 'light')
      })

      fireEvent.click(screen.getByTestId('switch-to-system'))
      await waitFor(() => {
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(DEFAULT_THEME_STORAGE_KEY)
      })

      // System changes should now affect theme
      act(() => {
        mockMediaQueryList._triggerChange(true)
      })

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
        expect(screen.getByTestId('system-theme')).toHaveTextContent('dark')
        expect(screen.getByTestId('neutral-color')).toHaveTextContent('#9ca3af')
      })
    })
  })

  describe('Cross-Session System + Persistence Integration', () => {
    it('should restore manual theme across sessions and handle system changes correctly', async () => {
      // First session: system is light, user selects dark manually
      mockMediaQueryList = createMockMediaQueryList(false)
      window.matchMedia = vi.fn().mockImplementation(() => mockMediaQueryList)

      const {unmount} = render(
        <ThemeProvider themes={mockThemes}>
          <CombinedIntegrationTestComponent />
        </ThemeProvider>,
      )

      fireEvent.click(screen.getByTestId('switch-to-dark'))
      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(DEFAULT_THEME_STORAGE_KEY, 'dark')
      })

      unmount()

      // Second session: system changed to dark, user has stored dark preference
      mockMediaQueryList = createMockMediaQueryList(true) // System is now dark
      window.matchMedia = vi.fn().mockImplementation(() => mockMediaQueryList)
      mockLocalStorage.getItem.mockReturnValue('dark')

      render(
        <ThemeProvider themes={mockThemes}>
          <CombinedIntegrationTestComponent />
        </ThemeProvider>,
      )

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
        expect(screen.getByTestId('system-theme')).toHaveTextContent('dark')
        expect(screen.getByTestId('neutral-color')).toHaveTextContent('#9ca3af')
      })
    })

    it('should handle complex cross-session scenario with multiple theme switches', async () => {
      // Session 1: Start with system, change to manual, then back to system
      mockMediaQueryList = createMockMediaQueryList(false) // Light system
      window.matchMedia = vi.fn().mockImplementation(() => mockMediaQueryList)

      const {unmount} = render(
        <ThemeProvider themes={mockThemes} defaultTheme="system">
          <CombinedIntegrationTestComponent />
        </ThemeProvider>,
      )

      // Switch to manual dark
      fireEvent.click(screen.getByTestId('switch-to-dark'))
      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(DEFAULT_THEME_STORAGE_KEY, 'dark')
      })

      // Switch back to system (removes storage)
      fireEvent.click(screen.getByTestId('switch-to-system'))
      await waitFor(() => {
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(DEFAULT_THEME_STORAGE_KEY)
      })

      unmount()

      // Session 2: System changed to dark, no stored preference
      mockMediaQueryList = createMockMediaQueryList(true) // Dark system
      window.matchMedia = vi.fn().mockImplementation(() => mockMediaQueryList)
      mockLocalStorage.getItem.mockReturnValue(null) // No stored preference

      render(
        <ThemeProvider themes={mockThemes} defaultTheme="system">
          <CombinedIntegrationTestComponent />
        </ThemeProvider>,
      )

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
        expect(screen.getByTestId('system-theme')).toHaveTextContent('dark')
        expect(screen.getByTestId('neutral-color')).toHaveTextContent('#9ca3af')
      })
    })
  })

  describe('Initialization Scenarios', () => {
    it('should handle initialization with stored system preference and different actual system', async () => {
      // Stored preference is 'system', actual system is different from when stored
      mockLocalStorage.getItem.mockReturnValue('system')
      mockMediaQueryList = createMockMediaQueryList(true) // System is dark
      window.matchMedia = vi.fn().mockImplementation(() => mockMediaQueryList)

      render(
        <ThemeProvider themes={mockThemes}>
          <CombinedIntegrationTestComponent />
        </ThemeProvider>,
      )

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
        expect(screen.getByTestId('system-theme')).toHaveTextContent('dark')
        expect(screen.getByTestId('neutral-color')).toHaveTextContent('#9ca3af')
      })
    })

    it('should handle initialization when both stored preference and system detection fail', async () => {
      // Storage error and no system detection
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage access denied')
      })
      const originalMatchMedia = window.matchMedia
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: undefined,
      })

      render(
        <ThemeProvider themes={mockThemes} defaultTheme="light">
          <CombinedIntegrationTestComponent />
        </ThemeProvider>,
      )

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
        expect(screen.getByTestId('system-theme')).toHaveTextContent('light') // Fallback
        expect(screen.getByTestId('neutral-color')).toHaveTextContent('#6b7280')
      })
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: originalMatchMedia,
      })
    })
  })

  describe('Storage Error Handling with System Detection', () => {
    it('should continue working with system detection when storage save fails', async () => {
      mockMediaQueryList = createMockMediaQueryList(false)
      window.matchMedia = vi.fn().mockImplementation(() => mockMediaQueryList)

      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      render(
        <ThemeProvider themes={mockThemes} defaultTheme="system">
          <CombinedIntegrationTestComponent />
        </ThemeProvider>,
      )

      // Switch to manual theme (storage will fail)
      fireEvent.click(screen.getByTestId('switch-to-dark'))

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
      })

      // Switch back to system and verify system detection still works
      fireEvent.click(screen.getByTestId('switch-to-system'))

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
      })

      // System detection should still work
      act(() => {
        mockMediaQueryList._triggerChange(true)
      })

      await waitFor(() => {
        expect(screen.getByTestId('system-theme')).toHaveTextContent('dark')
        expect(screen.getByTestId('neutral-color')).toHaveTextContent('#9ca3af')
      })
    })
  })

  describe('Theme Provider Re-mounting with Different System State', () => {
    it('should handle provider re-mount with changed system state and preserved storage', async () => {
      // Initial mount: system light, user selects dark
      mockMediaQueryList = createMockMediaQueryList(false)
      window.matchMedia = vi.fn().mockImplementation(() => mockMediaQueryList)

      const {unmount} = render(
        <ThemeProvider themes={mockThemes}>
          <CombinedIntegrationTestComponent />
        </ThemeProvider>,
      )

      fireEvent.click(screen.getByTestId('switch-to-dark'))
      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(DEFAULT_THEME_STORAGE_KEY, 'dark')
      })

      unmount()

      // Re-mount: system now dark, storage has dark preference
      mockMediaQueryList = createMockMediaQueryList(true)
      window.matchMedia = vi.fn().mockImplementation(() => mockMediaQueryList)
      mockLocalStorage.getItem.mockReturnValue('dark')

      // Fresh render instead of rerender
      render(
        <ThemeProvider themes={mockThemes}>
          <CombinedIntegrationTestComponent />
        </ThemeProvider>,
      )

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
        expect(screen.getByTestId('system-theme')).toHaveTextContent('dark')
        expect(screen.getByTestId('neutral-color')).toHaveTextContent('#9ca3af')
      })

      // Now switch to system - should still be dark due to system state
      fireEvent.click(screen.getByTestId('switch-to-system'))

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
        expect(screen.getByTestId('system-theme')).toHaveTextContent('dark')
        expect(screen.getByTestId('neutral-color')).toHaveTextContent('#9ca3af')
      })
    })
  })
})
