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
        // @ts-expect-error - React Native Appearance global check
        if (typeof globalThis !== 'undefined' && globalThis.RNAppearance) {
          // @ts-expect-error - React Native Appearance API
          const Appearance = globalThis.RNAppearance

          // Set initial color scheme
          const initialScheme = Appearance.getColorScheme()
          setColorScheme(initialScheme === 'dark' ? 'dark' : 'light')

          // Set up listener
          const handleChange = (preferences: any) => {
            const scheme = preferences.colorScheme
            setColorScheme(scheme === 'dark' ? 'dark' : 'light')
          }

          const subscription = Appearance.addChangeListener(handleChange)
          return () => subscription?.remove()
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
