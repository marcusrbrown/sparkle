import type {ThemeCollection} from '../src/context/ThemeContext'
import type {LocalStorageMock} from './test-utils'

import {fireEvent, render, screen, waitFor} from '@testing-library/react'
import {beforeEach, describe, expect, it} from 'vitest'

import {useTheme} from '../src/hooks'
import {DEFAULT_THEME_STORAGE_KEY, webPersistence} from '../src/persistence'
import {ThemeProvider} from '../src/providers/ThemeProvider'
import {createMockThemes, setStoredTheme, setupSystemTheme} from './test-utils'

// Use centralized mock theme fixtures
const mockThemes: ThemeCollection = createMockThemes()

// Test component for persistence integration
function PersistenceTestComponent() {
  const {theme, activeTheme, setTheme, isLoading} = useTheme()

  return (
    <div>
      <span data-testid="current-theme">{activeTheme}</span>
      <span data-testid="primary-color">{theme.colors.primary?.[500]}</span>
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

describe('Theme Persistence Integration Tests', () => {
  beforeEach(() => {
    // Setup baseline: light system theme, no stored preference
    setupSystemTheme(false)
  })

  describe('End-to-End Persistence Flow', () => {
    it('should save theme preference and restore it across provider re-mounts', async () => {
      const {unmount} = render(
        <ThemeProvider themes={mockThemes}>
          <PersistenceTestComponent />
        </ThemeProvider>,
      )

      // Initial state should be light (default when system is light)
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })

      // Switch to dark theme
      fireEvent.click(screen.getByTestId('switch-to-dark'))

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(DEFAULT_THEME_STORAGE_KEY, 'dark')
      })

      // Unmount and remount to simulate page reload
      unmount()

      // Simulate stored theme being available after reload
      setStoredTheme(mockLocalStorage, 'dark')

      // Fresh render instead of rerender
      render(
        <ThemeProvider themes={mockThemes}>
          <PersistenceTestComponent />
        </ThemeProvider>,
      )

      // Should restore dark theme from localStorage
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
        expect(mockLocalStorage.getItem).toHaveBeenCalledWith(DEFAULT_THEME_STORAGE_KEY)
      })
    })

    it('should handle switching between all theme modes with persistence', async () => {
      render(
        <ThemeProvider themes={mockThemes} defaultTheme="light">
          <PersistenceTestComponent />
        </ThemeProvider>,
      )

      // Start with light
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
      })

      // Switch to dark
      fireEvent.click(screen.getByTestId('switch-to-dark'))
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
        expect(mockLocalStorage.setItem).toHaveBeenLastCalledWith(DEFAULT_THEME_STORAGE_KEY, 'dark')
      })

      // Switch to system
      fireEvent.click(screen.getByTestId('switch-to-system'))
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
        expect(mockLocalStorage.removeItem).toHaveBeenLastCalledWith(DEFAULT_THEME_STORAGE_KEY)
      })

      // Switch back to light
      fireEvent.click(screen.getByTestId('switch-to-light'))
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
        expect(mockLocalStorage.setItem).toHaveBeenLastCalledWith(DEFAULT_THEME_STORAGE_KEY, 'light')
      })
    })
  })

  describe('Custom Storage Key Integration', () => {
    it('should use custom storage key for persistence', async () => {
      const customStorageKey = 'custom-theme-key'

      render(
        <ThemeProvider themes={mockThemes} storageKey={customStorageKey}>
          <PersistenceTestComponent />
        </ThemeProvider>,
      )

      // Switch to dark theme
      fireEvent.click(screen.getByTestId('switch-to-dark'))

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(customStorageKey, 'dark')
      })
    })

    it('should load theme from custom storage key on initialization', async () => {
      const customStorageKey = 'custom-theme-key'
      setStoredTheme(mockLocalStorage, 'dark', customStorageKey)

      render(
        <ThemeProvider themes={mockThemes} storageKey={customStorageKey}>
          <PersistenceTestComponent />
        </ThemeProvider>,
      )

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
        expect(mockLocalStorage.getItem).toHaveBeenCalledWith(customStorageKey)
      })
    })
  })

  describe('Storage Error Handling', () => {
    it('should handle localStorage getItem errors gracefully', async () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage access denied')
      })

      render(
        <ThemeProvider themes={mockThemes}>
          <PersistenceTestComponent />
        </ThemeProvider>,
      )

      // Should fallback to default theme when localStorage fails
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
      })
    })

    it('should handle localStorage setItem errors gracefully', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage quota exceeded')
      })

      render(
        <ThemeProvider themes={mockThemes}>
          <PersistenceTestComponent />
        </ThemeProvider>,
      )

      // Should still change theme in memory even if persistence fails
      fireEvent.click(screen.getByTestId('switch-to-dark'))

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
      })
    })

    it('should handle corrupted localStorage data', async () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-theme-value')

      render(
        <ThemeProvider themes={mockThemes}>
          <PersistenceTestComponent />
        </ThemeProvider>,
      )

      // Should fallback to default theme when localStorage contains invalid data
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
      })
    })
  })

  describe('Cross-Session Persistence', () => {
    it('should maintain theme preference across multiple sessions', async () => {
      // Simulate first session (no stored theme initially)
      setStoredTheme(mockLocalStorage, null)

      const {unmount} = render(
        <ThemeProvider themes={mockThemes}>
          <PersistenceTestComponent />
        </ThemeProvider>,
      )

      fireEvent.click(screen.getByTestId('switch-to-dark'))
      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(DEFAULT_THEME_STORAGE_KEY, 'dark')
      })

      unmount()

      // Simulate second session with dark theme stored
      setStoredTheme(mockLocalStorage, 'dark')

      const {unmount: unmount2} = render(
        <ThemeProvider themes={mockThemes}>
          <PersistenceTestComponent />
        </ThemeProvider>,
      )

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
      })

      // Change to light in second session
      fireEvent.click(screen.getByTestId('switch-to-light'))
      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenLastCalledWith(DEFAULT_THEME_STORAGE_KEY, 'light')
      })

      unmount2()

      // Simulate third session with light theme stored
      setStoredTheme(mockLocalStorage, 'light')

      render(
        <ThemeProvider themes={mockThemes}>
          <PersistenceTestComponent />
        </ThemeProvider>,
      )

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
      })
    })
  })

  describe('System Theme Integration with Persistence', () => {
    it('should not persist system theme preference but respect it on reload', async () => {
      render(
        <ThemeProvider themes={mockThemes} defaultTheme="system">
          <PersistenceTestComponent />
        </ThemeProvider>,
      )

      // Should start with system theme (which resolves to dark based on matchMedia mock)
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
      })

      // Switch to system explicitly (should remove any stored preference)
      fireEvent.click(screen.getByTestId('switch-to-system'))

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(DEFAULT_THEME_STORAGE_KEY)
      })
    })

    it('should prefer stored theme over system default', async () => {
      setStoredTheme(mockLocalStorage, 'light')

      render(
        <ThemeProvider themes={mockThemes} defaultTheme="system">
          <PersistenceTestComponent />
        </ThemeProvider>,
      )

      // Should use stored light theme instead of system theme
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
        expect(mockLocalStorage.getItem).toHaveBeenCalledWith(DEFAULT_THEME_STORAGE_KEY)
      })
    })
  })

  describe('Server-Side Rendering (SSR) Compatibility', () => {
    it('should handle undefined window during SSR', async () => {
      // Mock SSR environment
      const originalWindow = globalThis.window
      // @ts-expect-error - Simulating SSR environment
      delete globalThis.window

      // Direct testing of persistence utilities in SSR context
      expect(webPersistence.load()).toBeNull()
      expect(() => webPersistence.save('dark')).not.toThrow()

      // Restore window
      globalThis.window = originalWindow
    })
  })

  describe('Persistence Utility Functions', () => {
    it('should load and save themes correctly via persistence utilities', () => {
      // Test direct persistence utility usage
      expect(webPersistence.load()).toBeNull()

      webPersistence.save('dark')
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(DEFAULT_THEME_STORAGE_KEY, 'dark')

      mockLocalStorage.getItem.mockReturnValue('dark')
      expect(webPersistence.load()).toBe('dark')
    })

    it('should handle custom storage keys in persistence utilities', () => {
      const customKey = 'my-custom-theme-key'

      webPersistence.save('light', customKey)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(customKey, 'light')

      mockLocalStorage.getItem.mockReturnValue('light')
      expect(webPersistence.load(customKey)).toBe('light')
    })
  })
})
