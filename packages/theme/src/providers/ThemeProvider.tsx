import type {ThemeConfig} from '@sparkle/types'
import type {ReactNode} from 'react'
import type {SystemColorScheme, ThemeCollection, ThemeMode} from '../context/ThemeContext.js'
import {useCallback, useEffect, useMemo, useState} from 'react'

import {ThemeContext} from '../context/ThemeContext.js'
import {darkTokens} from '../tokens/dark.js'
import {lightTokens} from '../tokens/light.js'
import {generateCSSVariables} from '../tokens/web.js'
import {validateTheme} from '../validators/theme-validator.js'

/**
 * Props for the ThemeProvider component
 */
export interface ThemeProviderProps {
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
   * CSS selector for injecting CSS variables
   * @default ':root'
   */
  cssSelector?: string
}

/**
 * Local storage key for theme persistence
 */
const DEFAULT_STORAGE_KEY = 'sparkle-theme'

/**
 * CSS selector for root-level CSS variable injection
 */
const DEFAULT_CSS_SELECTOR = ':root'

/**
 * Default theme collection with light and dark variants
 */
const DEFAULT_THEMES: ThemeCollection = {
  light: lightTokens,
  dark: darkTokens,
}

/**
 * Detects the current system color scheme preference
 * @returns 'light' or 'dark' based on prefers-color-scheme media query
 */
function detectSystemTheme(): SystemColorScheme {
  if (typeof window === 'undefined' || !window.matchMedia) {
    // SSR fallback or unsupported browser
    return 'light'
  }

  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    // Fallback for environments where matchMedia throws
    return 'light'
  }
}

/**
 * Loads theme preference from localStorage
 * @param storageKey - The key to use for localStorage
 * @returns The stored theme mode or null if not found
 */
function loadStoredTheme(storageKey: string): ThemeMode | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const stored = window.localStorage.getItem(storageKey)
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      return stored as ThemeMode
    }
  } catch (error) {
    console.warn('Failed to load theme from localStorage:', error)
  }

  return null
}

/**
 * Saves theme preference to localStorage
 * @param storageKey - The key to use for localStorage
 * @param theme - The theme mode to save
 */
function saveTheme(storageKey: string, theme: ThemeMode): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    if (theme === 'system') {
      // Remove stored preference for system theme - let it follow system
      window.localStorage.removeItem(storageKey)
    } else {
      window.localStorage.setItem(storageKey, theme)
    }
  } catch (error) {
    console.warn('Failed to save theme to localStorage:', error)
  }
}

/**
 * Injects CSS variables into the document for theme styling
 * @param theme - The theme configuration to convert to CSS variables
 * @param selector - The CSS selector to target for variable injection
 */
function injectCSSVariables(theme: ThemeConfig, selector: string): void {
  if (typeof document === 'undefined') {
    return
  }

  try {
    const cssVariables = generateCSSVariables(theme)

    // Find or create a style element for theme variables
    let styleElement = document.querySelector('#sparkle-theme-vars') as HTMLStyleElement

    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.id = 'sparkle-theme-vars'
      document.head.append(styleElement)
    }

    // Update the CSS content with new variables
    styleElement.textContent = `${selector} {\n${cssVariables}\n}`
  } catch (error) {
    console.error('Failed to inject CSS variables:', error)
  }
}

/**
 * ThemeProvider component for web applications
 *
 * Provides theme management functionality with:
 * - Automatic system theme detection
 * - localStorage persistence
 * - CSS variable injection
 * - Theme validation and error handling
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <ThemeProvider defaultTheme="system">
 *       <YourAppComponents />
 *     </ThemeProvider>
 *   );
 * }
 * ```
 */
export function ThemeProvider({
  children,
  defaultTheme = 'system',
  themes = DEFAULT_THEMES,
  storageKey = DEFAULT_STORAGE_KEY,
  disableSystemTheme = false,
  cssSelector = DEFAULT_CSS_SELECTOR,
}: ThemeProviderProps): React.JSX.Element {
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
    setIsLoading(true)

    const storedTheme = loadStoredTheme(storageKey)
    if (storedTheme) {
      setActiveTheme(storedTheme)
    }

    setIsLoading(false)
  }, [storageKey])

  // Set up system theme change listener
  useEffect(() => {
    if (disableSystemTheme || typeof window === 'undefined' || !window.matchMedia) {
      return
    }

    try {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

      const handleChange = (event: MediaQueryListEvent) => {
        setSystemTheme(event.matches ? 'dark' : 'light')
      }

      // Modern browsers
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange)
        return () => mediaQuery.removeEventListener('change', handleChange)
      }

      // Legacy browsers
      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    } catch {
      // Gracefully handle any errors with matchMedia
      return undefined
    }
  }, [disableSystemTheme])

  // Inject CSS variables when theme changes
  useEffect(() => {
    injectCSSVariables(currentTheme, cssSelector)
  }, [currentTheme, cssSelector])

  // Theme setter with persistence
  const setTheme = useCallback(
    (newTheme: ThemeMode) => {
      setActiveTheme(newTheme)
      saveTheme(storageKey, newTheme)
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
