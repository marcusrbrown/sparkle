import type {ThemeConfig} from '@sparkle/types'
import {createContext} from 'react'

/**
 * Theme collection mapping theme modes to their configurations
 */
export interface ThemeCollection {
  light: ThemeConfig
  dark: ThemeConfig
}

/**
 * Theme mode options supporting light/dark themes and system preference
 */
export type ThemeMode = 'light' | 'dark' | 'system'

/**
 * System detected color scheme
 */
export type SystemColorScheme = 'light' | 'dark'

/**
 * Theme context value interface providing complete theme state and controls
 */
export interface ThemeContextValue {
  /**
   * Current active theme configuration with all design tokens
   */
  theme: ThemeConfig

  /**
   * Currently selected theme mode (user preference)
   */
  activeTheme: ThemeMode

  /**
   * Function to change the theme mode
   * Handles persistence and CSS variable updates automatically
   */
  setTheme: (theme: ThemeMode) => void

  /**
   * System detected color scheme (independent of user preference)
   */
  systemTheme: SystemColorScheme

  /**
   * Loading state during theme initialization or transitions
   */
  isLoading: boolean

  /**
   * Error state if theme loading or validation fails
   */
  error: Error | null
}

/**
 * React Context for theme management across the application
 *
 * This context provides access to:
 * - Current theme configuration with design tokens
 * - Theme switching functionality with persistence
 * - System color scheme detection
 * - Loading and error states
 *
 * Must be used within a ThemeProvider or NativeThemeProvider
 *
 * @example
 * ```tsx
 * const { theme, setTheme, activeTheme } = useTheme();
 *
 * // Access theme tokens
 * const primaryColor = theme.colors.primary[500];
 *
 * // Change theme
 * setTheme('dark');
 * ```
 */
export const ThemeContext = createContext<ThemeContextValue | null>(null)

ThemeContext.displayName = 'ThemeContext'
