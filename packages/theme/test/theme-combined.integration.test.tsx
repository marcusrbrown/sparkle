import type {ThemeCollection} from '../src/context/ThemeContext'
import type {LocalStorageMock, MediaQueryListMock} from './test-utils'

import {act, fireEvent, render, screen, waitFor} from '@testing-library/react'
import {beforeEach, describe, expect, it} from 'vitest'

import {useTheme} from '../src/hooks'
import {DEFAULT_THEME_STORAGE_KEY} from '../src/persistence'
import {ThemeProvider} from '../src/providers/ThemeProvider'
import {createMockThemes, setStoredTheme, setupSystemTheme} from './test-utils'

// Use centralized mock theme fixtures
const mockThemes: ThemeCollection = createMockThemes()

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

const mockLocalStorage = window.localStorage as unknown as LocalStorageMock

describe('Combined Persistence + System Detection Integration Tests', () => {
  let mockMediaQueryList: MediaQueryListMock

  beforeEach(() => {
    // Setup baseline: light system theme
    mockMediaQueryList = setupSystemTheme(false)
  })

  describe('Priority Resolution: Stored vs System Theme', () => {
    it('should prefer stored theme over system default on initialization', async () => {
      // Setup: dark system theme, but light theme stored in localStorage
      mockMediaQueryList = setupSystemTheme(true)
      setStoredTheme(mockLocalStorage, 'light')

      render(
        <ThemeProvider themes={mockThemes} defaultTheme="system">
          <CombinedIntegrationTestComponent />
        </ThemeProvider>,
      )

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
        expect(screen.getByTestId('system-theme')).toHaveTextContent('dark')
        expect(screen.getByTestId('neutral-color')).toHaveTextContent('#6b7280')
        expect(mockLocalStorage.getItem).toHaveBeenCalledWith(DEFAULT_THEME_STORAGE_KEY)
      })
    })

    it('should use system theme when no stored preference exists', async () => {
      // Setup: dark system theme, no stored theme
      mockMediaQueryList = setupSystemTheme(true)
      setStoredTheme(mockLocalStorage, null)

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

    it('should remove stored preference when switching to system theme', async () => {
      // Setup: dark system theme, light theme stored
      setStoredTheme(mockLocalStorage, 'light')
      mockMediaQueryList = setupSystemTheme(true)

      render(
        <ThemeProvider themes={mockThemes}>
          <CombinedIntegrationTestComponent />
        </ThemeProvider>,
      )

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
      })

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
      // Setup: light system theme initially
      mockMediaQueryList = setupSystemTheme(false)

      render(
        <ThemeProvider themes={mockThemes} defaultTheme="system">
          <CombinedIntegrationTestComponent />
        </ThemeProvider>,
      )

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
        expect(screen.getByTestId('neutral-color')).toHaveTextContent('#6b7280')
      })

      fireEvent.click(screen.getByTestId('switch-to-dark'))

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(DEFAULT_THEME_STORAGE_KEY, 'dark')
      })

      act(() => {
        mockMediaQueryList._triggerChange(true)
      })

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
        expect(screen.getByTestId('system-theme')).toHaveTextContent('dark')
        expect(screen.getByTestId('neutral-color')).toHaveTextContent('#9ca3af')
      })
    })

    it('should follow system changes when using system theme and persist re-selection', async () => {
      // Setup: light system theme initially
      mockMediaQueryList = setupSystemTheme(false)

      render(
        <ThemeProvider themes={mockThemes} defaultTheme="system">
          <CombinedIntegrationTestComponent />
        </ThemeProvider>,
      )

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
        expect(screen.getByTestId('neutral-color')).toHaveTextContent('#6b7280')
      })

      fireEvent.click(screen.getByTestId('switch-to-light'))
      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(DEFAULT_THEME_STORAGE_KEY, 'light')
      })

      fireEvent.click(screen.getByTestId('switch-to-system'))
      await waitFor(() => {
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(DEFAULT_THEME_STORAGE_KEY)
      })

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
      // Setup: light system theme initially
      mockMediaQueryList = setupSystemTheme(false)

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

      // After reload: dark system theme, dark theme stored
      mockMediaQueryList = setupSystemTheme(true)
      setStoredTheme(mockLocalStorage, 'dark')

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
      // Setup: light system theme initially
      mockMediaQueryList = setupSystemTheme(false)

      const {unmount} = render(
        <ThemeProvider themes={mockThemes} defaultTheme="system">
          <CombinedIntegrationTestComponent />
        </ThemeProvider>,
      )

      fireEvent.click(screen.getByTestId('switch-to-dark'))
      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(DEFAULT_THEME_STORAGE_KEY, 'dark')
      })

      fireEvent.click(screen.getByTestId('switch-to-system'))
      await waitFor(() => {
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(DEFAULT_THEME_STORAGE_KEY)
      })

      unmount()

      // After reload: dark system theme, no stored theme
      mockMediaQueryList = setupSystemTheme(true)
      setStoredTheme(mockLocalStorage, null)

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
      // Setup: dark system theme, 'system' stored
      setStoredTheme(mockLocalStorage, 'system')
      mockMediaQueryList = setupSystemTheme(true)

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
        expect(screen.getByTestId('system-theme')).toHaveTextContent('light')
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
      // Setup: light system theme, storage will fail
      mockMediaQueryList = setupSystemTheme(false)

      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      render(
        <ThemeProvider themes={mockThemes} defaultTheme="system">
          <CombinedIntegrationTestComponent />
        </ThemeProvider>,
      )

      fireEvent.click(screen.getByTestId('switch-to-dark'))

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
      })

      fireEvent.click(screen.getByTestId('switch-to-system'))

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
      })

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
      // Setup: light system theme initially
      mockMediaQueryList = setupSystemTheme(false)

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

      // After reload: dark system theme, dark theme stored
      mockMediaQueryList = setupSystemTheme(true)
      setStoredTheme(mockLocalStorage, 'dark')

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

      fireEvent.click(screen.getByTestId('switch-to-system'))

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
        expect(screen.getByTestId('system-theme')).toHaveTextContent('dark')
        expect(screen.getByTestId('neutral-color')).toHaveTextContent('#9ca3af')
      })
    })
  })
})
