import type {Config} from 'tailwindcss'
import {createThemePlugin, darkTokens, lightTokens} from '@sparkle/theme'
import forms from '@tailwindcss/forms'

/**
 * Legacy colors for backward compatibility
 * These will be phased out in favor of theme-aware colors
 */
export const colors = {
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
} as const

export const borderRadius = {
  none: '0px',
  sm: '0.125rem',
  DEFAULT: '0.25rem',
  md: 'var(--radius)',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
} as const

/**
 * Enhanced Tailwind configuration with theme integration
 * Includes the @sparkle/theme plugin for dynamic theme support
 */
export const tailwindConfig: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      // Legacy colors (will be deprecated)
      colors,
      // Enhanced border radius with CSS custom properties
      borderRadius: {
        ...borderRadius,
        // Override DEFAULT to use theme variable with fallback
        DEFAULT: 'var(--theme-border-radius-base, 0.25rem)',
      },
    },
  },
  plugins: [
    forms,
    // Theme plugin with light and dark theme support
    createThemePlugin(
      {
        light: lightTokens,
        dark: darkTokens,
      },
      {
        prefix: 'theme',
        includeCSSVariables: true,
        darkMode: true,
      },
    ),
  ],
}

export default tailwindConfig
