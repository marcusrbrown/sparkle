import type {ReactNode} from 'react'
import type {SystemColorScheme, ThemeCollection, ThemeMode} from '../context/ThemeContext.js'
import {useCallback, useEffect, useMemo, useState} from 'react'

import {ThemeContext} from '../context/ThemeContext.js'
import {darkTokens} from '../tokens/dark.js'
import {lightTokens} from '../tokens/light.js'
import {validateTheme} from '../validators/theme-validator.js'

/**
 * Props for the NativeThemeProvider component
 */
export interface NativeThemeProviderProps {
  /**
   * Child components that will have access to the theme context
   */
  children: ReactNode

  /**
   * Default theme mode to use on first load
   * @default 'system'
   */
  defaultTheme?: ThemeMode

  /**
   * Custom theme configurations to override defaults
   * @default { light: lightTokens, dark: darkTokens }
   */
  themes?: ThemeCollection

  /**
   * Storage key for persisting theme preference
   * @default 'sparkle-theme'
   */
  storageKey?: string

  /**
   * Whether to disable system theme detection
   * @default false
   */
  disableSystemTheme?: boolean

  /**
   * Whether to automatically update StatusBar style based on theme
   * @default true
   */
  updateStatusBar?: boolean
}

/**
 * AsyncStorage key for theme persistence
 */
const DEFAULT_STORAGE_KEY = 'sparkle-theme'

/**
 * Default theme collection with light and dark variants
 */
const DEFAULT_THEMES: ThemeCollection = {
  light: lightTokens,
  dark: darkTokens,
}

/**
 * Detects the current system color scheme preference on React Native
 * Uses React Native's Appearance API when available
 * @returns 'light' or 'dark' based on system appearance
 */
function detectSystemTheme(): SystemColorScheme {
  // Dynamic import to avoid bundling React Native modules on web
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {Appearance} = require('react-native')
    return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'
  } catch {
    // Fallback for non-React Native environments
    return 'light'
  }
}

/**
 * Loads theme preference from AsyncStorage
 * @param storageKey - The key to use for AsyncStorage
 * @returns Promise resolving to the stored theme mode or null if not found
 */
async function loadStoredTheme(storageKey: string): Promise<ThemeMode | null> {
  try {
    // Dynamic import to avoid bundling React Native modules on web
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
    const stored = await AsyncStorage.getItem(storageKey)

    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      return stored as ThemeMode
    }
  } catch (error) {
    console.warn('Failed to load theme from AsyncStorage:', error)
  }

  return null
}

/**
 * Saves theme preference to AsyncStorage
 * @param storageKey - The key to use for AsyncStorage
 * @param theme - The theme mode to save
 */
async function saveTheme(storageKey: string, theme: ThemeMode): Promise<void> {
  try {
    // Dynamic import to avoid bundling React Native modules on web
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
    await AsyncStorage.setItem(storageKey, theme)
  } catch (error) {
    console.warn('Failed to save theme to AsyncStorage:', error)
  }
}

/**
 * Updates StatusBar style based on theme
 * @param isDark - Whether the current theme is dark
 */
function updateStatusBarStyle(isDark: boolean): void {
  try {
    // Dynamic import to avoid bundling React Native modules on web
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {StatusBar} = require('react-native')

    // Set status bar style based on theme
    StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content', true)

    // Set background color if on Android
    if (StatusBar.setBackgroundColor) {
      StatusBar.setBackgroundColor(isDark ? '#000000' : '#ffffff', true)
    }
  } catch (error) {
    console.warn('Failed to update StatusBar style:', error)
  }
}

/**
 * NativeThemeProvider component for React Native applications
 *
 * Provides theme management functionality with:
 * - Automatic system theme detection using Appearance API
 * - AsyncStorage persistence
 * - StatusBar style integration
 * - Theme validation and error handling
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <NativeThemeProvider defaultTheme="system">
 *       <YourAppComponents />
 *     </NativeThemeProvider>
 *   );
 * }
 * ```
 */
export function NativeThemeProvider({
  children,
  defaultTheme = 'system',
  themes = DEFAULT_THEMES,
  storageKey = DEFAULT_STORAGE_KEY,
  disableSystemTheme = false,
  updateStatusBar = true,
}: NativeThemeProviderProps): React.JSX.Element {
  const [activeTheme, setActiveTheme] = useState<ThemeMode>(defaultTheme)
  const [systemTheme, setSystemTheme] = useState<SystemColorScheme>(() =>
    disableSystemTheme ? 'light' : detectSystemTheme(),
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Determine the actual theme to use based on active theme and system preference
  const resolvedTheme = useMemo(() => {
    if (activeTheme === 'system') {
      return systemTheme
    }
    return activeTheme
  }, [activeTheme, systemTheme])

  // Get the current theme configuration
  const currentTheme = useMemo(() => {
    const theme = themes[resolvedTheme]

    // Validate theme configuration
    try {
      const validation = validateTheme(theme)
      if (!validation.isValid) {
        const error = new Error(`Invalid theme configuration: ${validation.errors.join(', ')}`)
        setError(error)
        console.error('Theme validation failed:', validation.errors)
        // Fallback to light theme
        return themes.light
      }
      setError(null)
      return theme
    } catch (validationError) {
      const error = validationError instanceof Error ? validationError : new Error('Theme validation failed')
      setError(error)
      console.error('Theme validation error:', error)
      return themes.light
    }
  }, [resolvedTheme, themes])

  // Initialize theme from storage on mount
  useEffect(() => {
    let isMounted = true

    const initializeTheme = async () => {
      setIsLoading(true)

      try {
        const storedTheme = await loadStoredTheme(storageKey)
        if (isMounted && storedTheme) {
          setActiveTheme(storedTheme)
        }
      } catch (error) {
        console.warn('Failed to initialize theme:', error)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    initializeTheme()

    return () => {
      isMounted = false
    }
  }, [storageKey])

  // Set up system theme change listener
  useEffect(() => {
    if (disableSystemTheme) {
      return
    }

    try {
      // Dynamic import to avoid bundling React Native modules on web
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const {Appearance} = require('react-native')

      const handleChange = (preferences: {colorScheme: 'light' | 'dark' | null}) => {
        setSystemTheme(preferences.colorScheme === 'dark' ? 'dark' : 'light')
      }

      const subscription = Appearance.addChangeListener(handleChange)

      return () => subscription?.remove()
    } catch (error) {
      console.warn('Failed to set up system theme listener:', error)
      return undefined
    }
  }, [disableSystemTheme])

  // Update StatusBar style when theme changes
  useEffect(() => {
    if (updateStatusBar) {
      updateStatusBarStyle(resolvedTheme === 'dark')
    }
  }, [resolvedTheme, updateStatusBar])

  // Theme setter with persistence
  const setTheme = useCallback(
    async (newTheme: ThemeMode) => {
      setActiveTheme(newTheme)
      await saveTheme(storageKey, newTheme)
    },
    [storageKey],
  )

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      theme: currentTheme,
      activeTheme,
      setTheme,
      systemTheme,
      isLoading,
      error,
    }),
    [currentTheme, activeTheme, setTheme, systemTheme, isLoading, error],
  )

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>
}
