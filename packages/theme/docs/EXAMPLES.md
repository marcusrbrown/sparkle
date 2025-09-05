# Advanced Examples

This document provides comprehensive examples for advanced usage patterns of the `@sparkle/theme` package.

## Table of Contents

- [Custom Theme Creation](#custom-theme-creation)
- [Dynamic Theme Loading](#dynamic-theme-loading)
- [Cross-Platform Components](#cross-platform-components)
- [Theme Validation](#theme-validation)
- [Performance Optimization](#performance-optimization)
- [Testing Strategies](#testing-strategies)

## Custom Theme Creation

### Brand-Specific Theme

Create a custom theme that matches your brand identity:

```tsx
// themes/brand-theme.ts
import type { ThemeConfig } from '@sparkle/types'
import { baseTokens } from '@sparkle/theme'

export const brandTheme: ThemeConfig = {
  ...baseTokens,
  colors: {
    ...baseTokens.colors,
    // Custom brand colors
    primary: {
      50: '#fef7ee',
      100: '#fdeed3',
      200: '#fbd9a5',
      300: '#f8be6d',
      400: '#f49833',
      500: '#f17b0b', // Brand orange
      600: '#e25d06',
      700: '#bb4509',
      800: '#95370f',
      900: '#792f10'
    },
    // Custom accent color
    accent: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e', // Brand green
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d'
    }
  },
  typography: {
    ...baseTokens.typography,
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      serif: ['Merriweather', 'serif'],
      mono: ['JetBrains Mono', 'monospace'],
      // Custom brand font
      brand: ['Poppins', 'system-ui', 'sans-serif']
    }
  }
}

// Usage in app
function App() {
  return (
    <ThemeProvider
      themes={{
        light: brandTheme,
        dark: { ...brandTheme, /* dark overrides */ }
      }}
    >
      <YourApp />
    </ThemeProvider>
  )
}
```

### Seasonal Theme Variations

Create seasonal themes that change based on the time of year:

```tsx
// themes/seasonal-themes.ts
import type { ThemeConfig } from '@sparkle/types'
import { baseTokens } from '@sparkle/theme'

const createSeasonalTheme = (season: 'spring' | 'summer' | 'autumn' | 'winter'): ThemeConfig => {
  const seasonalColors = {
    spring: {
      primary: { 500: '#22c55e' }, // Green
      accent: { 500: '#f59e0b' }   // Warm yellow
    },
    summer: {
      primary: { 500: '#06b6d4' }, // Cyan
      accent: { 500: '#f97316' }   // Orange
    },
    autumn: {
      primary: { 500: '#ea580c' }, // Orange
      accent: { 500: '#dc2626' }   // Red
    },
    winter: {
      primary: { 500: '#3b82f6' }, // Blue
      accent: { 500: '#8b5cf6' }   // Purple
    }
  }

  return {
    ...baseTokens,
    colors: {
      ...baseTokens.colors,
      primary: {
        ...baseTokens.colors.primary,
        ...seasonalColors[season].primary
      },
      accent: {
        ...baseTokens.colors.secondary,
        ...seasonalColors[season].accent
      }
    }
  }
}

// Auto-detect current season
function getCurrentSeason(): 'spring' | 'summer' | 'autumn' | 'winter' {
  const month = new Date().getMonth()
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  if (month >= 8 && month <= 10) return 'autumn'
  return 'winter'
}

// Usage with automatic seasonal switching
function SeasonalApp() {
  const [currentSeason] = useState(getCurrentSeason())
  const seasonalTheme = useMemo(() => createSeasonalTheme(currentSeason), [currentSeason])

  return (
    <ThemeProvider themes={{ seasonal: seasonalTheme }}>
      <YourApp />
    </ThemeProvider>
  )
}
```

## Dynamic Theme Loading

### API-Based Theme Loading

Load themes from a remote API or CMS:

```tsx
import type { ThemeConfig } from '@sparkle/types'
import { validateTheme } from '@sparkle/theme'
// hooks/use-dynamic-themes.ts
import { useEffect, useState } from 'react'

interface ThemeResponse {
  id: string
  name: string
  config: ThemeConfig
  version: string
}

export function useDynamicThemes() {
  const [themes, setThemes] = useState<Record<string, ThemeConfig>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadThemes() {
      try {
        const response = await fetch('/api/themes')
        const data: ThemeResponse[] = await response.json()

        const validatedThemes: Record<string, ThemeConfig> = {}

        for (const themeData of data) {
          const validation = validateTheme(themeData.config)

          if (validation.isValid) {
            validatedThemes[themeData.id] = themeData.config
          } else {
            console.warn(`Theme ${themeData.name} validation failed:`, validation.errors)
          }
        }

        setThemes(validatedThemes)
      } catch (error_) {
        setError(error_ instanceof Error ? error_.message : 'Failed to load themes')
      } finally {
        setLoading(false)
      }
    }

    loadThemes()
  }, [])

  return { themes, loading, error }
}

// Usage in app
function DynamicThemeApp() {
  const { themes, loading, error } = useDynamicThemes()

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />

  return (
    <ThemeProvider themes={themes} defaultTheme="default">
      <YourApp />
    </ThemeProvider>
  )
}
```

### User-Generated Themes

Allow users to create and share custom themes:

```tsx
import type { ThemeConfig } from '@sparkle/types'
import { darkTokens, isValidTheme, lightTokens } from '@sparkle/theme'
// components/theme-editor.tsx
import { useState } from 'react'

interface ThemeEditorProps {
  onSave: (theme: ThemeConfig) => void
  initialTheme?: ThemeConfig
}

export function ThemeEditor({ onSave, initialTheme = lightTokens }: ThemeEditorProps) {
  const [theme, setTheme] = useState<ThemeConfig>(initialTheme)
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light')

  const updateColor = (path: string, value: string) => {
    const pathArray = path.split('.')
    const newTheme = { ...theme }

    // Navigate to the nested property and update it
    let current: any = newTheme
    for (let i = 0; i < pathArray.length - 1; i++) {
      current = current[pathArray[i]]
    }
    current[pathArray.at(-1)] = value

    setTheme(newTheme)
  }

  const handleSave = () => {
    if (isValidTheme(theme)) {
      onSave(theme)
    } else {
      alert('Theme validation failed. Please check your color values.')
    }
  }

  return (
    <div className="theme-editor">
      <div className="controls">
        <h3>Theme Editor</h3>

        {/* Color palette editor */}
        <div className="color-section">
          <h4>Primary Colors</h4>
          {Object.entries(theme.colors.primary).map(([shade, color]) => (
            <div key={shade} className="color-input">
              <label>{shade}</label>
              <input
                type="color"
                value={color}
                onChange={(e) => updateColor(`colors.primary.${shade}`, e.target.value)}
              />
              <input
                type="text"
                value={color}
                onChange={(e) => updateColor(`colors.primary.${shade}`, e.target.value)}
              />
            </div>
          ))}
        </div>

        {/* Preview mode toggle */}
        <div className="preview-controls">
          <button
            onClick={() => setPreviewMode('light')}
            className={previewMode === 'light' ? 'active' : ''}
          >
            Light Preview
          </button>
          <button
            onClick={() => setPreviewMode('dark')}
            className={previewMode === 'dark' ? 'active' : ''}
          >
            Dark Preview
          </button>
        </div>

        <button onClick={handleSave}>Save Theme</button>
      </div>

      {/* Live preview */}
      <div className="preview">
        <ThemeProvider
          themes={{
            custom: theme,
            light: lightTokens,
            dark: darkTokens
          }}
          defaultTheme={previewMode}
        >
          <ThemePreview />
        </ThemeProvider>
      </div>
    </div>
  )
}

function ThemePreview() {
  const { theme } = useTheme()

  return (
    <div style={{ backgroundColor: theme.colors.neutral[50], padding: '2rem' }}>
      <h1 style={{ color: theme.colors.primary[600] }}>Theme Preview</h1>
      <p style={{ color: theme.colors.neutral[700] }}>
        This is how your theme will look in the application.
      </p>
      <button style={{
        backgroundColor: theme.colors.primary[500],
        color: theme.colors.neutral[50],
        padding: '0.5rem 1rem',
        border: 'none',
        borderRadius: theme.borderRadius.md
      }}>
        Primary Button
      </button>
    </div>
  )
}
```

## Cross-Platform Components

### Universal Button Component

Create components that work seamlessly across web and React Native:

```tsx
// components/universal-button.tsx
import type { ReactNode } from 'react'
import { useTheme } from '@sparkle/theme'
import { Platform } from 'react-native'

interface UniversalButtonProps {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  onPress?: () => void
  disabled?: boolean
}

export function UniversalButton({
  children,
  variant = 'primary',
  size = 'md',
  onPress,
  disabled = false
}: UniversalButtonProps) {
  const { theme } = useTheme()

  // Base styles that work across platforms
  const baseStyles = {
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing[size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'],
    paddingVertical: theme.spacing[size === 'sm' ? 'xs' : size === 'lg' ? 'md' : 'sm'],
    opacity: disabled ? 0.6 : 1
  }

  // Variant-specific styles
  const variantStyles = {
    primary: {
      backgroundColor: theme.colors.primary[500],
      borderColor: theme.colors.primary[500],
      borderWidth: 1
    },
    secondary: {
      backgroundColor: theme.colors.secondary[500],
      borderColor: theme.colors.secondary[500],
      borderWidth: 1
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: theme.colors.primary[500],
      borderWidth: 1
    }
  }

  const textStyles = {
    color: variant === 'outline' ? theme.colors.primary[500] : theme.colors.neutral[50],
    fontSize: theme.typography.fontSize[size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'base'],
    fontWeight: theme.typography.fontWeight.medium,
    textAlign: 'center' as const
  }

  const combinedStyles = {
    ...baseStyles,
    ...variantStyles[variant]
  }

  if (Platform.OS === 'web') {
    return (
      <button
        style={{
          ...combinedStyles,
          cursor: disabled ? 'not-allowed' : 'pointer',
          border: `${combinedStyles.borderWidth}px solid ${combinedStyles.borderColor}`,
          outline: 'none'
        }}
        onClick={onPress}
        disabled={disabled}
      >
        <span style={textStyles}>{children}</span>
      </button>
    )
  }

  // React Native implementation
  const { TouchableOpacity, Text } = require('react-native')

  return (
    <TouchableOpacity
      style={combinedStyles}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={textStyles}>{children}</Text>
    </TouchableOpacity>
  )
}
```

### Responsive Theme System

Create themes that adapt to screen size and device capabilities:

```tsx
import type { ThemeConfig } from '@sparkle/types'
// hooks/use-responsive-theme.ts
import { useEffect, useState } from 'react'
import { Dimensions, Platform } from 'react-native'

interface ResponsiveThemeConfig extends ThemeConfig {
  breakpoints: {
    mobile: ThemeConfig
    tablet: ThemeConfig
    desktop: ThemeConfig
  }
}

export function useResponsiveTheme(baseTheme: ResponsiveThemeConfig) {
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(baseTheme)

  useEffect(() => {
    const updateTheme = () => {
      if (Platform.OS === 'web') {
        const width = window.innerWidth
        if (width < 768) {
          setCurrentTheme(baseTheme.breakpoints.mobile)
        } else if (width < 1024) {
          setCurrentTheme(baseTheme.breakpoints.tablet)
        } else {
          setCurrentTheme(baseTheme.breakpoints.desktop)
        }
      } else {
        const { width } = Dimensions.get('window')
        if (width < 768) {
          setCurrentTheme(baseTheme.breakpoints.mobile)
        } else {
          setCurrentTheme(baseTheme.breakpoints.tablet)
        }
      }
    }

    updateTheme()

    if (Platform.OS === 'web') {
      window.addEventListener('resize', updateTheme)
      return () => window.removeEventListener('resize', updateTheme)
    } else {
      const subscription = Dimensions.addEventListener('change', updateTheme)
      return () => subscription?.remove()
    }
  }, [baseTheme])

  return currentTheme
}

// Usage example
const responsiveTheme: ResponsiveThemeConfig = {
  ...baseTokens,
  breakpoints: {
    mobile: {
      ...baseTokens,
      spacing: {
        ...baseTokens.spacing,
        // Smaller spacing on mobile
        md: '0.75rem',
        lg: '1rem'
      }
    },
    tablet: {
      ...baseTokens,
      spacing: {
        ...baseTokens.spacing,
        // Medium spacing on tablet
        md: '1rem',
        lg: '1.5rem'
      }
    },
    desktop: {
      ...baseTokens,
      spacing: {
        ...baseTokens.spacing,
        // Larger spacing on desktop
        md: '1.5rem',
        lg: '2rem'
      }
    }
  }
}
```

## Theme Validation

### Advanced Validation Rules

Implement custom validation rules for your themes:

```tsx
// utils/theme-validator.ts
import type { ThemeConfig } from '@sparkle/types'

interface ValidationRule {
  name: string
  validate: (theme: ThemeConfig) => { isValid: boolean; message?: string }
}

const contrastRule: ValidationRule = {
  name: 'contrast',
  validate: (theme) => {
    const checkContrast = (color1: string, color2: string) => {
      // Simplified contrast calculation
      // In a real implementation, you'd use a proper contrast ratio calculation
      const rgb1 = hexToRgb(color1)
      const rgb2 = hexToRgb(color2)

      if (!rgb1 || !rgb2) return false

      const luminance1 = calculateLuminance(rgb1)
      const luminance2 = calculateLuminance(rgb2)

      const contrast = (Math.max(luminance1, luminance2) + 0.05) /
                       (Math.min(luminance1, luminance2) + 0.05)

      return contrast >= 4.5 // WCAG AA standard
    }

    // Check primary text on neutral background
    const primaryOnNeutral = checkContrast(
      theme.colors.primary[600],
      theme.colors.neutral[50]
    )

    if (!primaryOnNeutral) {
      return {
        isValid: false,
        message: 'Primary color does not have sufficient contrast with neutral background'
      }
    }

    return { isValid: true }
  }
}

const consistencyRule: ValidationRule = {
  name: 'consistency',
  validate: (theme) => {
    // Check that color scales are properly ordered (lighter to darker)
    const checkColorScale = (scale: Record<string, string>) => {
      const shades = Object.keys(scale).map(Number).sort((a, b) => a - b)

      for (let i = 0; i < shades.length - 1; i++) {
        const currentShade = scale[shades[i]]
        const nextShade = scale[shades[i + 1]]

        const currentLum = calculateLuminance(hexToRgb(currentShade)!)
        const nextLum = calculateLuminance(hexToRgb(nextShade)!)

        if (currentLum <= nextLum) {
          return false
        }
      }

      return true
    }

    if (!checkColorScale(theme.colors.primary)) {
      return {
        isValid: false,
        message: 'Primary color scale is not properly ordered from light to dark'
      }
    }

    return { isValid: true }
  }
}

export class AdvancedThemeValidator {
  private rules: ValidationRule[] = [contrastRule, consistencyRule]

  addRule(rule: ValidationRule) {
    this.rules.push(rule)
  }

  validate(theme: ThemeConfig) {
    const errors: string[] = []

    for (const rule of this.rules) {
      const result = rule.validate(theme)
      if (!result.isValid && result.message) {
        errors.push(`${rule.name}: ${result.message}`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

// Helper functions
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: Number.parseInt(result[1], 16),
    g: Number.parseInt(result[2], 16),
    b: Number.parseInt(result[3], 16)
  } : null
}

function calculateLuminance(rgb: { r: number; g: number; b: number }): number {
  const { r, g, b } = rgb
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055)**2.4
  })

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}
```

## Performance Optimization

### Memoized Theme Components

Optimize component re-renders when themes change:

```tsx
import { useTheme } from '@sparkle/theme'
// components/optimized-themed-component.tsx
import { memo, useMemo } from 'react'

interface ThemedCardProps {
  title: string
  content: string
  variant?: 'primary' | 'secondary'
}

// Memoize the component to prevent unnecessary re-renders
export const ThemedCard = memo(({
  title,
  content,
  variant = 'primary'
}: ThemedCardProps) => {
  const { theme } = useTheme()

  // Memoize computed styles to avoid recalculation
  const styles = useMemo(() => ({
    card: {
      backgroundColor: theme.colors.neutral[50],
      borderColor: theme.colors[variant][200],
      borderWidth: '1px',
      borderStyle: 'solid' as const,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      boxShadow: theme.shadows.md
    },
    title: {
      color: theme.colors[variant][600],
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      marginBottom: theme.spacing.md
    },
    content: {
      color: theme.colors.neutral[700],
      fontSize: theme.typography.fontSize.base,
      lineHeight: theme.typography.lineHeight.relaxed
    }
  }), [theme, variant])

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>{title}</h3>
      <p style={styles.content}>{content}</p>
    </div>
  )
})

// Theme-aware hook with selective updates
export function useThemeColors(colorKeys: string[]) {
  const { theme } = useTheme()

  return useMemo(() => {
    const colors: Record<string, string> = {}

    colorKeys.forEach(key => {
      const [category, shade] = key.split('.')
      if (theme.colors[category] && theme.colors[category][shade]) {
        colors[key] = theme.colors[category][shade]
      }
    })

    return colors
  }, [theme, colorKeys])
}

// Usage with selective color updates
function OptimizedComponent() {
  const colors = useThemeColors(['primary.500', 'neutral.50', 'neutral.900'])

  return (
    <div style={{
      backgroundColor: colors['neutral.50'],
      color: colors['neutral.900'],
      borderColor: colors['primary.500']
    }}>
      Optimized component with selective color updates
    </div>
  )
}
```

### Lazy Theme Loading

Load theme resources only when needed:

```tsx
import type { ThemeConfig } from '@sparkle/types'
// hooks/use-lazy-theme.ts
import { lazy, Suspense, useState } from 'react'

// Lazy load theme configurations
const LazyDarkTheme = lazy(() => import('../themes/dark-theme.js').then(m => ({ default: m.darkTheme })))
const LazyLightTheme = lazy(() => import('../themes/light-theme.js').then(m => ({ default: m.lightTheme })))

export function useLazyTheme() {
  const [loadedThemes, setLoadedThemes] = useState<Record<string, ThemeConfig>>({})
  const [loading, setLoading] = useState(false)

  const loadTheme = async (themeName: string) => {
    if (loadedThemes[themeName]) {
      return loadedThemes[themeName]
    }

    setLoading(true)

    try {
      let theme: ThemeConfig

      switch (themeName) {
        case 'dark':
          theme = (await import('../themes/dark-theme.js')).darkTheme
          break
        case 'light':
          theme = (await import('../themes/light-theme.js')).lightTheme
          break
        default:
          throw new Error(`Unknown theme: ${themeName}`)
      }

      setLoadedThemes(prev => ({ ...prev, [themeName]: theme }))
      return theme
    } finally {
      setLoading(false)
    }
  }

  return { loadedThemes, loadTheme, loading }
}

// Lazy theme provider
export function LazyThemeProvider({ children }: { children: React.ReactNode }) {
  const { loadedThemes, loadTheme, loading } = useLazyTheme()
  const [currentTheme, setCurrentTheme] = useState<string>('light')

  const changeTheme = async (themeName: string) => {
    await loadTheme(themeName)
    setCurrentTheme(themeName)
  }

  if (loading) {
    return <div>Loading theme...</div>
  }

  return (
    <ThemeProvider
      themes={loadedThemes}
      defaultTheme={currentTheme}
    >
      {children}
    </ThemeProvider>
  )
}
```

## Testing Strategies

### Theme-Aware Testing Utilities

Create utilities for testing themed components:

```tsx
import type { ThemeConfig } from '@sparkle/types'
import type { ReactElement } from 'react'
import { darkTokens, lightTokens, ThemeProvider } from '@sparkle/theme'
// test-utils/theme-testing.tsx
import { render, type RenderOptions } from '@testing-library/react'

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  theme?: ThemeConfig
  themeName?: string
}

// Custom render function with theme provider
export function renderWithTheme(
  ui: ReactElement,
  { theme = lightTokens, themeName = 'light', ...renderOptions }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ThemeProvider
        themes={{ [themeName]: theme }}
        defaultTheme={themeName}
      >
        {children}
      </ThemeProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Test both light and dark themes
export function renderWithBothThemes(ui: ReactElement) {
  const lightResult = renderWithTheme(ui, { theme: lightTokens, themeName: 'light' })
  const darkResult = renderWithTheme(ui, { theme: darkTokens, themeName: 'dark' })

  return { light: lightResult, dark: darkResult }
}

// Mock theme hook for testing
export function mockUseTheme(theme: ThemeConfig, activeTheme = 'light') {
  return {
    theme,
    activeTheme,
    setTheme: jest.fn(),
    themes: { [activeTheme]: theme }
  }
}

// Example tests
describe('ThemedButton', () => {
  it('renders with correct theme colors', () => {
    const { getByRole } = renderWithTheme(<ThemedButton>Click me</ThemedButton>)

    const button = getByRole('button')
    expect(button).toHaveStyle({
      backgroundColor: lightTokens.colors.primary[500]
    })
  })

  it('adapts to dark theme', () => {
    const { getByRole } = renderWithTheme(
      <ThemedButton>Click me</ThemedButton>,
      { theme: darkTokens, themeName: 'dark' }
    )

    const button = getByRole('button')
    expect(button).toHaveStyle({
      backgroundColor: darkTokens.colors.primary[500]
    })
  })

  it('renders consistently across themes', () => {
    const { light, dark } = renderWithBothThemes(<ThemedButton>Click me</ThemedButton>)

    const lightButton = light.getByRole('button')
    const darkButton = dark.getByRole('button')

    // Both should have the same structure
    expect(lightButton.textContent).toBe(darkButton.textContent)
    expect(lightButton.tagName).toBe(darkButton.tagName)
  })
})
```

### Visual Regression Testing

Test theme changes with visual regression testing:

```tsx
import { expect, test } from '@playwright/test'
// tests/visual-regression.test.ts
import { chromium } from 'playwright'

test.describe('Theme Visual Regression', () => {
  test('button appearance in light theme', async ({ page }) => {
    await page.goto('/storybook/iframe.html?id=button--primary&args=theme:light')

    const button = page.locator('[data-testid="button"]')
    await expect(button).toHaveScreenshot('button-light-theme.png')
  })

  test('button appearance in dark theme', async ({ page }) => {
    await page.goto('/storybook/iframe.html?id=button--primary&args=theme:dark')

    const button = page.locator('[data-testid="button"]')
    await expect(button).toHaveScreenshot('button-dark-theme.png')
  })

  test('theme switching animation', async ({ page }) => {
    await page.goto('/theme-demo')

    // Take screenshot of initial light theme
    await expect(page).toHaveScreenshot('theme-light.png')

    // Switch to dark theme
    await page.click('[data-testid="theme-toggle"]')

    // Wait for animation to complete
    await page.waitForTimeout(300)

    // Take screenshot of dark theme
    await expect(page).toHaveScreenshot('theme-dark.png')
  })
})
```

These advanced examples demonstrate sophisticated usage patterns for the `@sparkle/theme` package, showing how to create custom themes, optimize performance, ensure cross-platform compatibility, and implement comprehensive testing strategies.
