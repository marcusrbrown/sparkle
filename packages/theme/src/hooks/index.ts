import {useContext, useEffect, useState} from 'react'
import {ThemeContext} from '../context/ThemeContext'

/**
 * Custom hook for consuming theme context
 * @returns Theme context value with current theme and controls
 * @throws Error if used outside of ThemeProvider or NativeThemeProvider
 */
export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider or NativeThemeProvider')
  }

  return context
}

/**
 * Minimal shape of React Native's Appearance change event payload.
 * Declared locally so we can type-check the optional global without
 * depending on `react-native` types from this cross-platform package.
 */
interface RNAppearancePreferences {
  colorScheme: 'light' | 'dark' | null
}

/**
 * Minimal shape of React Native's global `Appearance` API that this hook
 * relies on. Only the members actually used below are declared.
 */
interface RNAppearanceApi {
  getColorScheme: () => 'light' | 'dark' | null
  addChangeListener: (listener: (preferences: RNAppearancePreferences) => void) => {remove?: () => void} | undefined
}

/**
 * Global scope shape when running under React Native, where a global
 * `RNAppearance` bridge may be injected by the host environment.
 */
interface GlobalWithRNAppearance {
  RNAppearance?: RNAppearanceApi
}

/**
 * Custom hook for detecting system color scheme preference
 * Works on both web (via matchMedia) and React Native (via Appearance API)
 * @returns Current system color scheme ('light' or 'dark')
 */
export function useColorScheme(): 'light' | 'dark' {
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>(() => {
    // Web environment check
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }

    // Default to light for React Native (will be updated in effect)
    return 'light'
  })

  useEffect(() => {
    // Web listener
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

      const handleChange = (event: MediaQueryListEvent) => {
        setColorScheme(event.matches ? 'dark' : 'light')
      }

      // Modern browsers
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange)
        return () => mediaQuery.removeEventListener('change', handleChange)
      }

      // Legacy browsers
      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    }

    // React Native - check if Appearance is available in global context
    const setupReactNativeListener = () => {
      try {
        const globalWithRNAppearance = globalThis as GlobalWithRNAppearance
        const Appearance = globalWithRNAppearance.RNAppearance

        if (typeof globalThis !== 'undefined' && Appearance) {
          // Set initial color scheme
          const initialScheme = Appearance.getColorScheme()
          setColorScheme(initialScheme === 'dark' ? 'dark' : 'light')

          // Set up listener
          const handleChange = (preferences: RNAppearancePreferences) => {
            const scheme = preferences.colorScheme
            setColorScheme(scheme === 'dark' ? 'dark' : 'light')
          }

          const subscription = Appearance.addChangeListener(handleChange)
          return () => subscription?.remove?.()
        }
      } catch {
        // React Native not available, no cleanup needed
      }
      return undefined
    }

    return setupReactNativeListener()
  }, [])

  return colorScheme
}
