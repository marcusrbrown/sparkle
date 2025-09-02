import type {ThemeConfig} from '@sparkle/types'
import plugin from 'tailwindcss/plugin'

export type PluginWithConfig = ReturnType<typeof plugin>

/**
 * Configuration options for the theme plugin
 */
export interface ThemePluginOptions {
  /** Prefix for CSS custom properties (default: 'theme') */
  prefix?: string
  /** Whether to include CSS custom properties in base layer (default: true) */
  includeCSSVariables?: boolean
  /** Selector for CSS custom properties (default: ':root') */
  rootSelector?: string
  /** Whether to include dark mode support (default: true) */
  darkMode?: boolean
}

/**
 * Converts hex color to RGB space-separated values for CSS custom properties
 * This format allows for opacity modifiers in Tailwind utilities
 *
 * @param hex - Hex color string (e.g., '#3b82f6')
 * @returns RGB space-separated string (e.g., '59 130 246')
 */
function hexToRgbSpaceSeparated(hex: string): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '')

  // Parse hex to RGB
  const r = Number.parseInt(cleanHex.slice(0, 2), 16)
  const g = Number.parseInt(cleanHex.slice(2, 4), 16)
  const b = Number.parseInt(cleanHex.slice(4, 6), 16)

  return `${r} ${g} ${b}`
}

/**
 * Processes color values to RGB space-separated format
 * Handles hex colors and passes through other formats
 */
function processColorValue(value: string): string {
  if (typeof value === 'string' && value.startsWith('#')) {
    return hexToRgbSpaceSeparated(value)
  }
  return value
}

/**
 * Recursively processes nested objects to create flat CSS variable names
 */
function flattenObject(
  obj: Record<string | number, any>,
  prefix = '',
  result: Record<string, string> = {},
): Record<string, string> {
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}-${key}` : key

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      flattenObject(value, newKey, result)
    } else if (typeof value === 'string' || typeof value === 'number') {
      result[newKey] = String(value)
    }
  }

  return result
}

/**
 * Generates CSS custom properties from theme configuration
 */
function generateCSSCustomProperties(
  themes: Record<string, ThemeConfig>,
  options: ThemePluginOptions,
): Record<string, Record<string, string>> {
  const {prefix = 'theme'} = options
  const result: Record<string, Record<string, string>> = {}

  for (const [themeName, themeConfig] of Object.entries(themes)) {
    const properties: Record<string, string> = {}

    // Process colors with RGB space-separated format
    const colors = flattenObject(themeConfig.colors)
    for (const [key, value] of Object.entries(colors)) {
      properties[`--${prefix}-${key}`] = processColorValue(value)
    }

    // Process typography
    const fontFamily = flattenObject(themeConfig.typography.fontFamily, 'font-family')
    const fontSize = flattenObject(themeConfig.typography.fontSize, 'font-size')
    const fontWeight = flattenObject(themeConfig.typography.fontWeight, 'font-weight')
    const lineHeight = flattenObject(themeConfig.typography.lineHeight, 'line-height')
    const letterSpacing = flattenObject(themeConfig.typography.letterSpacing, 'letter-spacing')

    for (const [key, value] of Object.entries({
      ...fontFamily,
      ...fontSize,
      ...fontWeight,
      ...lineHeight,
      ...letterSpacing,
    })) {
      properties[`--${prefix}-${key}`] = value
    }

    // Process spacing
    const spacing = flattenObject(themeConfig.spacing, 'spacing')
    for (const [key, value] of Object.entries(spacing)) {
      properties[`--${prefix}-${key}`] = value
    }

    // Process shadows
    const shadows = flattenObject(themeConfig.shadows, 'shadow')
    for (const [key, value] of Object.entries(shadows)) {
      properties[`--${prefix}-${key}`] = value
    }

    // Process border radius
    const borderRadius = flattenObject(themeConfig.borderRadius, 'border-radius')
    for (const [key, value] of Object.entries(borderRadius)) {
      properties[`--${prefix}-${key}`] = value
    }

    // Process animation
    const duration = flattenObject(themeConfig.animation.duration, 'duration')
    const easing = flattenObject(themeConfig.animation.easing, 'easing')
    const transition = flattenObject(themeConfig.animation.transition, 'transition')

    for (const [key, value] of Object.entries({...duration, ...easing, ...transition})) {
      properties[`--${prefix}-${key}`] = value
    }

    result[themeName] = properties
  }

  return result
}

/**
 * Creates a Tailwind CSS plugin for theme integration
 */
export function createThemePlugin(
  themes: Record<string, ThemeConfig>,
  options: ThemePluginOptions = {},
): PluginWithConfig {
  const {prefix = 'theme', includeCSSVariables = true, rootSelector = ':root', darkMode = true} = options

  return plugin(
    ({addBase, addUtilities, addComponents}) => {
      // Generate CSS custom properties
      if (includeCSSVariables) {
        const cssProperties = generateCSSCustomProperties(themes, {prefix})

        // Add base CSS custom properties (usually light theme)
        const themeKeys = Object.keys(cssProperties)
        const defaultKey = themeKeys.includes('light') ? 'light' : themeKeys[0]
        const defaultProperties = defaultKey ? cssProperties[defaultKey] : undefined

        if (defaultProperties) {
          addBase({
            [rootSelector]: defaultProperties,
          })
        }

        // Add dark mode properties if enabled
        if (darkMode && themes.dark && cssProperties.dark) {
          addBase({
            [`${rootSelector}[data-theme="dark"]`]: cssProperties.dark,
          })

          // Add system preference dark mode
          if (rootSelector === ':root') {
            addBase({
              '@media (prefers-color-scheme: dark)': {
                [`${rootSelector}:not([data-theme])`]: cssProperties.dark,
              },
            })
          }
        }

        // Add other theme variants
        for (const [themeName, properties] of Object.entries(cssProperties)) {
          if (themeName !== 'light' && themeName !== 'dark') {
            addBase({
              [`${rootSelector}[data-theme="${themeName}"]`]: properties,
            })
          }
        }
      }

      // Add theme-aware utility classes
      addUtilities({
        // Text colors
        [`.text-${prefix}-primary`]: {
          color: `rgb(var(--${prefix}-text-primary))`,
        },
        [`.text-${prefix}-secondary`]: {
          color: `rgb(var(--${prefix}-text-secondary))`,
        },
        [`.text-${prefix}-tertiary`]: {
          color: `rgb(var(--${prefix}-text-tertiary))`,
        },
        [`.text-${prefix}-inverse`]: {
          color: `rgb(var(--${prefix}-text-inverse))`,
        },

        // Background colors
        [`.bg-${prefix}-primary`]: {
          'background-color': `rgb(var(--${prefix}-background-primary))`,
        },
        [`.bg-${prefix}-secondary`]: {
          'background-color': `rgb(var(--${prefix}-background-secondary))`,
        },
        [`.bg-${prefix}-tertiary`]: {
          'background-color': `rgb(var(--${prefix}-background-tertiary))`,
        },
        [`.bg-${prefix}-inverse`]: {
          'background-color': `rgb(var(--${prefix}-background-inverse))`,
        },

        // Surface colors
        [`.bg-${prefix}-surface`]: {
          'background-color': `rgb(var(--${prefix}-surface-primary))`,
        },
        [`.bg-${prefix}-surface-secondary`]: {
          'background-color': `rgb(var(--${prefix}-surface-secondary))`,
        },
        [`.bg-${prefix}-surface-tertiary`]: {
          'background-color': `rgb(var(--${prefix}-surface-tertiary))`,
        },

        // Border colors
        [`.border-${prefix}-primary`]: {
          'border-color': `rgb(var(--${prefix}-border-primary))`,
        },
        [`.border-${prefix}-secondary`]: {
          'border-color': `rgb(var(--${prefix}-border-secondary))`,
        },
        [`.border-${prefix}-tertiary`]: {
          'border-color': `rgb(var(--${prefix}-border-tertiary))`,
        },

        // Semantic colors
        [`.text-${prefix}-success`]: {
          color: `rgb(var(--${prefix}-success-500))`,
        },
        [`.text-${prefix}-warning`]: {
          color: `rgb(var(--${prefix}-warning-500))`,
        },
        [`.text-${prefix}-error`]: {
          color: `rgb(var(--${prefix}-error-500))`,
        },
        [`.bg-${prefix}-success`]: {
          'background-color': `rgb(var(--${prefix}-success-500))`,
        },
        [`.bg-${prefix}-warning`]: {
          'background-color': `rgb(var(--${prefix}-warning-500))`,
        },
        [`.bg-${prefix}-error`]: {
          'background-color': `rgb(var(--${prefix}-error-500))`,
        },

        // Brand colors
        [`.text-${prefix}-brand`]: {
          color: `rgb(var(--${prefix}-primary-500))`,
        },
        [`.bg-${prefix}-brand`]: {
          'background-color': `rgb(var(--${prefix}-primary-500))`,
        },
        [`.border-${prefix}-brand`]: {
          'border-color': `rgb(var(--${prefix}-primary-500))`,
        },
      })

      // Add component-level theme utilities
      addComponents({
        '.theme-transition': {
          'transition-property': 'color, background-color, border-color, text-decoration-color, fill, stroke',
          'transition-timing-function': 'cubic-bezier(0.4, 0, 0.2, 1)',
          'transition-duration': '150ms',
        },
        '.theme-focus-ring': {
          '&:focus': {
            outline: '2px solid transparent',
            'outline-offset': '2px',
            'box-shadow': `0 0 0 2px rgb(var(--${prefix}-primary-500))`,
          },
        },
      })
    },
    {
      theme: {
        extend: {
          colors: {
            theme: {
              // Primary color scale using CSS variables
              primary: {
                50: `rgb(var(--${prefix}-primary-50) / <alpha-value>)`,
                100: `rgb(var(--${prefix}-primary-100) / <alpha-value>)`,
                200: `rgb(var(--${prefix}-primary-200) / <alpha-value>)`,
                300: `rgb(var(--${prefix}-primary-300) / <alpha-value>)`,
                400: `rgb(var(--${prefix}-primary-400) / <alpha-value>)`,
                500: `rgb(var(--${prefix}-primary-500) / <alpha-value>)`,
                600: `rgb(var(--${prefix}-primary-600) / <alpha-value>)`,
                700: `rgb(var(--${prefix}-primary-700) / <alpha-value>)`,
                800: `rgb(var(--${prefix}-primary-800) / <alpha-value>)`,
                900: `rgb(var(--${prefix}-primary-900) / <alpha-value>)`,
                950: `rgb(var(--${prefix}-primary-950) / <alpha-value>)`,
              },
              // Secondary color scale
              secondary: {
                50: `rgb(var(--${prefix}-secondary-50) / <alpha-value>)`,
                100: `rgb(var(--${prefix}-secondary-100) / <alpha-value>)`,
                200: `rgb(var(--${prefix}-secondary-200) / <alpha-value>)`,
                300: `rgb(var(--${prefix}-secondary-300) / <alpha-value>)`,
                400: `rgb(var(--${prefix}-secondary-400) / <alpha-value>)`,
                500: `rgb(var(--${prefix}-secondary-500) / <alpha-value>)`,
                600: `rgb(var(--${prefix}-secondary-600) / <alpha-value>)`,
                700: `rgb(var(--${prefix}-secondary-700) / <alpha-value>)`,
                800: `rgb(var(--${prefix}-secondary-800) / <alpha-value>)`,
                900: `rgb(var(--${prefix}-secondary-900) / <alpha-value>)`,
                950: `rgb(var(--${prefix}-secondary-950) / <alpha-value>)`,
              },
              // Semantic colors
              success: {
                50: `rgb(var(--${prefix}-success-50) / <alpha-value>)`,
                100: `rgb(var(--${prefix}-success-100) / <alpha-value>)`,
                200: `rgb(var(--${prefix}-success-200) / <alpha-value>)`,
                300: `rgb(var(--${prefix}-success-300) / <alpha-value>)`,
                400: `rgb(var(--${prefix}-success-400) / <alpha-value>)`,
                500: `rgb(var(--${prefix}-success-500) / <alpha-value>)`,
                600: `rgb(var(--${prefix}-success-600) / <alpha-value>)`,
                700: `rgb(var(--${prefix}-success-700) / <alpha-value>)`,
                800: `rgb(var(--${prefix}-success-800) / <alpha-value>)`,
                900: `rgb(var(--${prefix}-success-900) / <alpha-value>)`,
                950: `rgb(var(--${prefix}-success-950) / <alpha-value>)`,
              },
              warning: {
                50: `rgb(var(--${prefix}-warning-50) / <alpha-value>)`,
                100: `rgb(var(--${prefix}-warning-100) / <alpha-value>)`,
                200: `rgb(var(--${prefix}-warning-200) / <alpha-value>)`,
                300: `rgb(var(--${prefix}-warning-300) / <alpha-value>)`,
                400: `rgb(var(--${prefix}-warning-400) / <alpha-value>)`,
                500: `rgb(var(--${prefix}-warning-500) / <alpha-value>)`,
                600: `rgb(var(--${prefix}-warning-600) / <alpha-value>)`,
                700: `rgb(var(--${prefix}-warning-700) / <alpha-value>)`,
                800: `rgb(var(--${prefix}-warning-800) / <alpha-value>)`,
                900: `rgb(var(--${prefix}-warning-900) / <alpha-value>)`,
                950: `rgb(var(--${prefix}-warning-950) / <alpha-value>)`,
              },
              error: {
                50: `rgb(var(--${prefix}-error-50) / <alpha-value>)`,
                100: `rgb(var(--${prefix}-error-100) / <alpha-value>)`,
                200: `rgb(var(--${prefix}-error-200) / <alpha-value>)`,
                300: `rgb(var(--${prefix}-error-300) / <alpha-value>)`,
                400: `rgb(var(--${prefix}-error-400) / <alpha-value>)`,
                500: `rgb(var(--${prefix}-error-500) / <alpha-value>)`,
                600: `rgb(var(--${prefix}-error-600) / <alpha-value>)`,
                700: `rgb(var(--${prefix}-error-700) / <alpha-value>)`,
                800: `rgb(var(--${prefix}-error-800) / <alpha-value>)`,
                900: `rgb(var(--${prefix}-error-900) / <alpha-value>)`,
                950: `rgb(var(--${prefix}-error-950) / <alpha-value>)`,
              },
              // Semantic surface and text colors
              text: {
                primary: `rgb(var(--${prefix}-text-primary) / <alpha-value>)`,
                secondary: `rgb(var(--${prefix}-text-secondary) / <alpha-value>)`,
                tertiary: `rgb(var(--${prefix}-text-tertiary) / <alpha-value>)`,
                inverse: `rgb(var(--${prefix}-text-inverse) / <alpha-value>)`,
              },
              surface: {
                primary: `rgb(var(--${prefix}-background-primary) / <alpha-value>)`,
                secondary: `rgb(var(--${prefix}-background-secondary) / <alpha-value>)`,
                tertiary: `rgb(var(--${prefix}-background-tertiary) / <alpha-value>)`,
                inverse: `rgb(var(--${prefix}-background-inverse) / <alpha-value>)`,
              },
              border: {
                primary: `rgb(var(--${prefix}-border-primary) / <alpha-value>)`,
                secondary: `rgb(var(--${prefix}-border-secondary) / <alpha-value>)`,
                tertiary: `rgb(var(--${prefix}-border-tertiary) / <alpha-value>)`,
              },
            },
          },
          // Extend spacing with CSS variables
          spacing: {
            'theme-xs': `var(--${prefix}-spacing-xs, 0.25rem)`,
            'theme-sm': `var(--${prefix}-spacing-sm, 0.5rem)`,
            'theme-md': `var(--${prefix}-spacing-md, 1rem)`,
            'theme-lg': `var(--${prefix}-spacing-lg, 1.5rem)`,
            'theme-xl': `var(--${prefix}-spacing-xl, 2rem)`,
          },
          // Extend border radius with CSS variables
          borderRadius: {
            'theme-sm': `var(--${prefix}-border-radius-sm, 0.125rem)`,
            theme: `var(--${prefix}-border-radius-base, 0.25rem)`,
            'theme-md': `var(--${prefix}-border-radius-md, 0.375rem)`,
            'theme-lg': `var(--${prefix}-border-radius-lg, 0.5rem)`,
            'theme-xl': `var(--${prefix}-border-radius-xl, 0.75rem)`,
          },
          // Extend shadows with CSS variables
          boxShadow: {
            'theme-sm': `var(--${prefix}-shadow-sm, 0 1px 2px 0 rgb(0 0 0 / 0.05))`,
            theme: `var(--${prefix}-shadow-base, 0 1px 3px 0 rgb(0 0 0 / 0.1))`,
            'theme-md': `var(--${prefix}-shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1))`,
            'theme-lg': `var(--${prefix}-shadow-lg, 0 10px 15px -3px rgb(0 0 0 / 0.1))`,
            'theme-xl': `var(--${prefix}-shadow-xl, 0 20px 25px -5px rgb(0 0 0 / 0.1))`,
          },
        },
      },
    },
  )
}
