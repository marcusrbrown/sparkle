# API Reference

Complete API documentation for `@sparkle/theme` package.

## Table of Contents

- [Hooks](#hooks)
- [Components](#components)
- [Utilities](#utilities)
- [Types](#types)
- [Token System](#token-system)
- [Validation](#validation)

## Hooks

### useTheme()

Access the current theme configuration and theme management functions.

```tsx
import { useTheme } from '@sparkle/theme'

const {
  theme,        // Current theme configuration
  activeTheme,  // Current theme name ('light', 'dark', etc.)
  setTheme,     // Function to change theme
  themes        // Available theme configurations
} = useTheme()
```

#### Returns

```tsx
interface ThemeContextValue {
  /** Current active theme configuration */
  theme: ThemeConfig

  /** Name of the currently active theme */
  activeTheme: string

  /** Available theme configurations */
  themes: ThemeCollection

  /** Function to change the active theme */
  setTheme: (themeName: ThemeMode) => void

  /** Whether theme switching is in progress */
  isLoading?: boolean
}
```

#### Example Usage

```tsx
function ThemeToggle() {
  const { activeTheme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(activeTheme === 'light' ? 'dark' : 'light')
  }

  return (
    <button onClick={toggleTheme}>
      Switch to {activeTheme === 'light' ? 'dark' : 'light'} theme
    </button>
  )
}
```

### useColorScheme()

Detect the system's preferred color scheme.

```tsx
import { useColorScheme } from '@sparkle/theme'

const colorScheme = useColorScheme() // 'light' | 'dark' | 'no-preference'
```

#### Returns

```tsx
type SystemColorScheme = 'light' | 'dark' | 'no-preference'
```

#### Example Usage

```tsx
function SystemThemeIndicator() {
  const systemScheme = useColorScheme()

  return (
    <div>
      System prefers: {systemScheme}
    </div>
  )
}
```

#### Platform Support

- **Web**: Uses `window.matchMedia('(prefers-color-scheme: dark)')`
- **React Native**: Uses `Appearance.getColorScheme()` and `Appearance.addChangeListener()`

## Components

### ThemeProvider

Web-specific theme provider using React Context.

```tsx
import { ThemeProvider } from '@sparkle/theme'
```

#### Props

```tsx
interface ThemeProviderProps {
  /** Child components that will have access to the theme context */
  children: ReactNode

  /** Default theme mode to use on first load */
  defaultTheme?: ThemeMode

  /** Custom theme configurations to override defaults */
  themes?: ThemeCollection

  /** Whether to persist theme selection to localStorage */
  enablePersistence?: boolean

  /** Custom storage key for theme persistence */
  storageKey?: string

  /** Whether to detect and use system theme preference */
  enableSystemDetection?: boolean
}
```

#### Example Usage

```tsx
import { darkTokens, lightTokens, ThemeProvider } from '@sparkle/theme'

function App() {
  return (
    <ThemeProvider
      themes={{ light: lightTokens, dark: darkTokens }}
      defaultTheme="system"
      enablePersistence={true}
      storageKey="my-app-theme"
    >
      <YourApp />
    </ThemeProvider>
  )
}
```

### NativeThemeProvider

React Native-specific theme provider with platform optimizations.

```tsx
import { NativeThemeProvider } from '@sparkle/theme/react-native'
```

#### Props

```tsx
interface NativeThemeProviderProps {
  /** Child components that will have access to the theme context */
  children: ReactNode

  /** Default theme mode to use on first load */
  defaultTheme?: ThemeMode

  /** Custom theme configurations to override defaults */
  themes?: ThemeCollection

  /** Whether to persist theme selection to AsyncStorage */
  enablePersistence?: boolean

  /** Custom storage key for theme persistence */
  storageKey?: string

  /** Whether to detect and use system theme preference */
  enableSystemDetection?: boolean
}
```

#### Example Usage

```tsx
import { darkTokens, lightTokens, NativeThemeProvider } from '@sparkle/theme'

function App() {
  return (
    <NativeThemeProvider
      themes={{ light: lightTokens, dark: darkTokens }}
      defaultTheme="system"
      enablePersistence={true}
    >
      <YourNativeApp />
    </NativeThemeProvider>
  )
}
```

### ThemeShowcase

Demo component displaying all theme features and color palettes.

```tsx
import { ThemeShowcase } from '@sparkle/theme'
```

#### Props

```tsx
interface ThemeShowcaseProps {
  /** Whether to show the color palette demonstration */
  showColorPalette?: boolean

  /** Whether to show component demonstrations */
  showComponents?: boolean

  /** Whether to show semantic color demonstrations */
  showSemanticColors?: boolean

  /** Additional CSS classes for the showcase container */
  className?: string
}
```

#### Example Usage

```tsx
function DocumentationPage() {
  return (
    <div>
      <h1>Theme Documentation</h1>
      <ThemeShowcase
        showColorPalette={true}
        showComponents={true}
        showSemanticColors={true}
      />
    </div>
  )
}
```

## Utilities

### validateTheme()

Validate a theme configuration object for completeness and correctness.

```tsx
import { validateTheme } from '@sparkle/theme'

const result = validateTheme(themeConfig, options)
```

#### Parameters

```tsx
function validateTheme(
  theme: unknown,
  options?: ValidationOptions
): ValidationResult
```

```tsx
interface ValidationOptions {
  /** Whether to validate color contrast ratios */
  checkContrast?: boolean

  /** Whether to validate typography scales */
  checkTypography?: boolean

  /** Whether to validate spacing consistency */
  checkSpacing?: boolean

  /** Minimum contrast ratio for WCAG compliance */
  minContrastRatio?: number
}

interface ValidationResult {
  /** Whether the theme passes validation */
  isValid: boolean

  /** Array of validation errors */
  errors: ValidationError[]

  /** Array of validation warnings */
  warnings: string[]
}
```

#### Example Usage

```tsx
import { validateTheme } from '@sparkle/theme'

const customTheme = {
  colors: { /* theme colors */ },
  typography: { /* typography config */ }
  // ... other theme properties
}

const result = validateTheme(customTheme, {
  checkContrast: true,
  minContrastRatio: 4.5
})

if (!result.isValid) {
  console.error('Theme validation failed:', result.errors)
}
```

### isValidTheme()

Quick validation check that returns a boolean.

```tsx
import { isValidTheme } from '@sparkle/theme'

const isValid = isValidTheme(themeConfig)
```

#### Example Usage

```tsx
if (isValidTheme(customTheme)) {
  console.log('Theme is valid!')
} else {
  console.error('Theme validation failed')
}
```

### createThemePlugin()

Create a Tailwind CSS plugin that integrates theme tokens.

```tsx
import { createThemePlugin } from '@sparkle/theme/tailwind'
```

#### Parameters

```tsx
function createThemePlugin(options: ThemePluginOptions): TailwindPlugin

interface ThemePluginOptions {
  /** Theme configurations to integrate */
  themes: ThemeCollection

  /** Default theme for CSS variable generation */
  defaultTheme?: string

  /** Prefix for CSS custom properties */
  cssPrefix?: string

  /** Whether to generate utility classes */
  generateUtilities?: boolean

  /** Whether to generate component classes */
  generateComponents?: boolean
}
```

#### Example Usage

```tsx
import { darkTokens, lightTokens } from '@sparkle/theme'
import { createThemePlugin } from '@sparkle/theme/tailwind'

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  plugins: [
    createThemePlugin({
      themes: {
        light: lightTokens,
        dark: darkTokens
      },
      defaultTheme: 'light',
      cssPrefix: 'theme',
      generateUtilities: true
    })
  ]
}
```

### generateCSSVariables()

Generate CSS custom properties from theme tokens.

```tsx
import { generateCSSVariables } from '@sparkle/theme'
```

#### Parameters

```tsx
function generateCSSVariables(
  theme: ThemeConfig,
  options?: CSSGenerationOptions
): CSSCustomProperties

interface CSSGenerationOptions {
  /** Prefix for CSS custom properties */
  prefix?: string

  /** Whether to include RGB space-separated values */
  includeRGB?: boolean

  /** Format for color values */
  colorFormat?: 'hex' | 'rgb' | 'hsl'
}
```

#### Example Usage

```tsx
import { generateCSSVariables, lightTokens } from '@sparkle/theme'

const cssVars = generateCSSVariables(lightTokens, {
  prefix: 'theme',
  includeRGB: true,
  colorFormat: 'rgb'
})

// Result: { '--theme-primary-500': '59 130 246', ... }
```

### generateNativeTheme()

Generate React Native StyleSheet objects from theme tokens.

```tsx
import { generateNativeTheme } from '@sparkle/theme/react-native'
```

#### Parameters

```tsx
function generateNativeTheme(theme: ThemeConfig): NativeTheme

interface NativeTheme {
  colors: Record<string, string>
  typography: Record<string, TextStyle>
  spacing: Record<string, number>
  borderRadius: Record<string, number>
  shadows: Record<string, NativeShadowStyle>
}
```

#### Example Usage

```tsx
import { generateNativeTheme, lightTokens } from '@sparkle/theme'
import { StyleSheet } from 'react-native'

const nativeTheme = generateNativeTheme(lightTokens)

const styles = StyleSheet.create({
  container: {
    backgroundColor: nativeTheme.colors.primary500,
    padding: nativeTheme.spacing.md,
    borderRadius: nativeTheme.borderRadius.md
  }
})
```

## Types

### ThemeConfig

Core theme configuration interface from `@sparkle/types`.

```tsx
interface ThemeConfig {
  /** Color system with semantic and primitive scales */
  colors: {
    primary: ColorScale
    secondary: ColorScale
    neutral: ColorScale
    success: ColorScale
    warning: ColorScale
    error: ColorScale
    info: ColorScale
  }

  /** Typography system with font families and scale */
  typography: {
    fontFamily: {
      sans: string[]
      serif: string[]
      mono: string[]
    }
    fontSize: TypographyScale
    fontWeight: Record<string, number>
    lineHeight: Record<string, number>
    letterSpacing: Record<string, string>
  }

  /** Spacing scale for margins, padding, and layout */
  spacing: SpacingScale

  /** Border radius scale for rounded corners */
  borderRadius: BorderRadiusScale

  /** Shadow system for depth and elevation */
  shadows: ShadowScale

  /** Animation timing and easing functions */
  animation: AnimationScale
}
```

### ColorScale

Color scale definition with numbered stops.

```tsx
interface ColorScale {
  50: string   // Lightest shade
  100: string
  200: string
  300: string
  400: string
  500: string  // Base color
  600: string
  700: string
  800: string
  900: string  // Darkest shade
  950?: string // Extra dark (optional)
}
```

### ThemeMode

Supported theme modes.

```tsx
type ThemeMode = 'light' | 'dark' | 'system' | string
```

### ThemeCollection

Collection of theme configurations.

```tsx
type ThemeCollection = Record<string, ThemeConfig>
```

## Token System

### Base Tokens

Foundation tokens that other themes extend.

```tsx
import { baseTokens } from '@sparkle/theme'

// Contains default values for:
// - Color scales with neutral grays
// - Typography system with modern font stacks
// - Spacing scale based on 4px grid
// - Border radius scale
// - Shadow definitions
// - Animation timing functions
```

### Light Tokens

Default light theme configuration.

```tsx
import { lightTokens } from '@sparkle/theme'

// Extends baseTokens with:
// - Light color palette
// - High contrast ratios for accessibility
// - Optimized for light backgrounds
```

### Dark Tokens

Default dark theme configuration.

```tsx
import { darkTokens } from '@sparkle/theme'

// Extends baseTokens with:
// - Dark color palette
// - Reduced contrast for comfort
// - Optimized for dark backgrounds
```

### Token Structure

```tsx
// Example token structure
const tokens = {
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      // ... more shades
      500: '#3b82f6', // Base color
      // ... darker shades
      900: '#1e3a8a'
    }
  },

  spacing: {
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem'      // 32px
  },

  typography: {
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem'
    }
  }
}
```

## Validation

### Theme Validator

Class-based validator for complex validation scenarios.

```tsx
import { ThemeValidator } from '@sparkle/theme'

const validator = new ThemeValidator({
  checkContrast: true,
  minContrastRatio: 4.5
})

const result = validator.validate(themeConfig)
```

### Validation Errors

```tsx
interface ValidationError {
  /** Error code for programmatic handling */
  code: string

  /** Human-readable error message */
  message: string

  /** Path to the problematic property */
  path: string[]

  /** Current value that failed validation */
  value: unknown
}
```

### Common Validation Rules

1. **Required Properties**: All theme sections must be present
2. **Color Format**: Colors must be valid hex, rgb, or hsl values
3. **Contrast Ratios**: Text/background combinations must meet WCAG standards
4. **Typography Scale**: Font sizes should follow a consistent scale
5. **Spacing Consistency**: Spacing values should use consistent units
6. **Border Radius**: Values should be valid CSS length units

## Error Handling

### Theme Loading Errors

```tsx
try {
  const theme = await loadTheme('custom-theme')
  validateTheme(theme)
} catch (error) {
  if (error instanceof ThemeValidationError) {
    console.error('Theme validation failed:', error.errors)
  } else {
    console.error('Failed to load theme:', error.message)
  }
}
```

### Runtime Error Recovery

```tsx
function ErrorBoundaryWithTheme({ children }) {
  const { setTheme } = useTheme()

  const handleError = (error) => {
    if (error.message.includes('theme')) {
      // Fallback to default theme
      setTheme('light')
    }
  }

  return (
    <ErrorBoundary onError={handleError}>
      {children}
    </ErrorBoundary>
  )
}
```

## Performance Considerations

### Theme Switching Performance

- Theme changes trigger CSS custom property updates
- React context updates are batched for performance
- Components using theme values will re-render when theme changes

### Bundle Size Impact

- Core theme utilities: ~5KB gzipped
- React providers: ~8KB gzipped
- Tailwind plugin: ~3KB gzipped
- Full package with all features: ~15KB gzipped

### Optimization Tips

1. **Selective Imports**: Import only needed functions
2. **Theme Memoization**: Use React.memo for theme-dependent components
3. **CSS Custom Properties**: Leverage browser optimization for variable updates
4. **Lazy Loading**: Load theme configurations dynamically when needed

```tsx
// Good: Selective imports
import { useTheme } from '@sparkle/theme'
// Better: Tree-shakeable imports
import { useTheme } from '@sparkle/theme/hooks'

// Best: Memoized theme-dependent components
const ThemedComponent = React.memo(() => {
  const { theme } = useTheme()
  return <div style={{ color: theme.colors.primary[500] }}>Themed content</div>
})
```
