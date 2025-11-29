---
title: Theme System Workflow
description: Complete guide to the end-to-end workflow from token definition to component usage in Sparkle's theme system.
---

## Overview

This guide walks through the complete workflow of Sparkle's theme system, from initial token definition to final component implementation. Understanding this workflow will help you effectively use and extend the theme system for your applications.

## Related Pages

- [Theme Overview](./overview) - Introduction to Sparkle's theme system
- [Token Transformation](./token-transformation) - Cross-platform token conversion details
- [Theme Providers](./providers) - Provider setup and configuration
- [Advanced Customization](./advanced) - Enterprise patterns and custom workflows
- [Troubleshooting](./troubleshooting) - Workflow issues and solutions

## Workflow Stages

The Sparkle theme system follows these key stages:

1. **Token Definition** - Define design tokens in TypeScript
2. **Theme Configuration** - Organize tokens into theme variants
3. **Provider Setup** - Configure theme providers for your platform
4. **Token Transformation** - Convert tokens to platform-specific formats
5. **Component Integration** - Use themes in components
6. **Runtime Management** - Handle theme switching and persistence

## Stage 1: Token Definition

### Base Token Structure

Start by understanding the base token structure:

```typescript
// packages/theme/src/tokens/base.ts
import type {ThemeConfig} from '@sparkle/types'

export const baseTokens: ThemeConfig = {
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      // ... color scale
      500: '#3b82f6', // Main brand color
      // ... more colors
      950: '#172554',
    },
    // Semantic colors
    success: {500: '#22c55e'},
    warning: {500: '#f59e0b'},
    error: {500: '#ef4444'},
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['Menlo', 'Monaco', 'monospace'],
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  },
  animation: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
    },
  },
}
```

### Creating Custom Tokens

Extend base tokens for your brand:

```typescript
import type {ThemeConfig} from '@sparkle/types'
// your-app/theme/tokens.ts
import {baseTokens} from '@sparkle/theme'

export const customBaseTokens: ThemeConfig = {
  ...baseTokens,
  colors: {
    ...baseTokens.colors,
    // Override primary brand color
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9', // Your custom blue
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
      950: '#082f49',
    },
    // Add custom semantic colors
    brand: {
      50: '#fef7ff',
      500: '#8b5cf6', // Your secondary brand color
      900: '#581c87',
    },
  },
  // Add custom spacing values
  spacing: {
    ...baseTokens.spacing,
    '2xs': '0.125rem',
    '3xl': '3rem',
    '4xl': '4rem',
  },
  // Custom typography
  typography: {
    ...baseTokens.typography,
    fontFamily: {
      ...baseTokens.typography.fontFamily,
      brand: ['YourCustomFont', 'system-ui', 'sans-serif'],
    },
  },
}
```

## Stage 2: Theme Configuration

### Light and Dark Variants

Create theme variants that extend your base tokens:

```typescript
import type {ThemeConfig} from '@sparkle/types'
// your-app/theme/light.ts
import {customBaseTokens} from './tokens'

export const lightTheme: ThemeConfig = {
  ...customBaseTokens,
  colors: {
    ...customBaseTokens.colors,
    // Semantic colors for light mode
    background: {
      primary: '#ffffff',
      secondary: '#f9fafb',
      tertiary: '#f3f4f6',
    },
    text: {
      primary: '#111827',
      secondary: '#6b7280',
      tertiary: '#9ca3af',
      inverse: '#ffffff',
    },
    border: {
      primary: '#e5e7eb',
      secondary: '#d1d5db',
      focus: customBaseTokens.colors.primary[500],
    },
    surface: {
      primary: '#ffffff',
      elevated: '#f9fafb',
      overlay: 'rgb(0 0 0 / 0.5)',
    },
  },
}
```

```typescript
import type {ThemeConfig} from '@sparkle/types'
// your-app/theme/dark.ts
import {customBaseTokens} from './tokens'

export const darkTheme: ThemeConfig = {
  ...customBaseTokens,
  colors: {
    ...customBaseTokens.colors,
    // Semantic colors for dark mode
    background: {
      primary: '#111827',
      secondary: '#1f2937',
      tertiary: '#374151',
    },
    text: {
      primary: '#f9fafb',
      secondary: '#d1d5db',
      tertiary: '#9ca3af',
      inverse: '#111827',
    },
    border: {
      primary: '#374151',
      secondary: '#4b5563',
      focus: customBaseTokens.colors.primary[400], // Lighter for dark mode
    },
    surface: {
      primary: '#1f2937',
      elevated: '#374151',
      overlay: 'rgb(0 0 0 / 0.8)',
    },
  },
}
```

### Theme Collection

Organize themes into a collection:

```typescript
import type {ThemeCollection} from '@sparkle/theme'
import {darkTheme} from './dark'
// your-app/theme/index.ts
import {lightTheme} from './light'

export const appThemes: ThemeCollection = {
  light: lightTheme,
  dark: darkTheme,
}

// Export individual themes
export {darkTheme, lightTheme}
export * from './tokens'
```

## Stage 3: Provider Setup

### Web Application Setup

```tsx
// your-web-app/App.tsx
import {ThemeProvider} from '@sparkle/theme'
import {appThemes} from './theme'

function App() {
  return (
    <ThemeProvider
      themes={appThemes}
      defaultTheme="system"
      storageKey="your-app-theme"
    >
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App
```

### React Native Application Setup

```tsx
// your-native-app/App.tsx
import {NativeThemeProvider} from '@sparkle/theme'
import {appThemes} from './theme'

function App() {
  return (
    <NativeThemeProvider
      themes={appThemes}
      defaultTheme="system"
      storageKey="your-app-theme"
      updateStatusBar={true}
    >
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </NativeThemeProvider>
  )
}

export default App
```

## Stage 4: Token Transformation

### Understanding Token Formats

Tokens are automatically transformed to platform-appropriate formats:

**Web (CSS Custom Properties):**

```css
:root {
  --color-primary-500: #0ea5e9;
  --spacing-md: 1rem;
  --font-size-base: 1rem;
  --border-radius-md: 0.375rem;
}
```

**React Native (StyleSheet Values):**

```typescript
interface StyleSheetTokens {
  colorPrimary500: '#0ea5e9',
  spacingMd: 16,
  fontSizeBase: 16,
  borderRadiusMd: 6,
}
```

### Manual Token Transformation

When you need direct access to transformed tokens:

```typescript
// Utility for manual transformation
import {TokenTransformer} from '@sparkle/theme'
import {lightTheme} from './theme'

const transformer = new TokenTransformer()

// For web components
export const webTokens = transformer.toWeb(lightTheme)

// For React Native components
export const nativeTokens = transformer.toNative(lightTheme)

// With custom options
export const customWebTokens = transformer.toWeb(lightTheme, {
  prefix: 'app', // Creates --app-color-primary-500
})

export const customNativeTokens = transformer.toNative(lightTheme, {
  baseFontSize: 18, // Uses 18px as base instead of 16px
  flattenColors: true, // Flattens color objects
})
```

## Stage 5: Component Integration

### Web Components

#### Using CSS Custom Properties (Recommended)

```tsx
// components/Button.tsx
import {useTheme} from '@sparkle/theme'
import './Button.css'

interface ButtonProps {
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export function Button({variant = 'primary', size = 'md', children}: ButtonProps) {
  const {theme} = useTheme()

  return (
    <button
      className={`btn btn--${variant} btn--${size}`}
      data-theme={theme.colors.primary[500]} // For debugging
    >
      {children}
    </button>
  )
}
```

```css
/* components/Button.css */
.btn {
  /* Use theme tokens via CSS custom properties */
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--animation-duration-fast) var(--animation-easing-ease);
}

.btn--primary {
  background-color: var(--color-primary-500);
  color: var(--color-text-inverse);
  border-color: var(--color-primary-500);
}

.btn--primary:hover {
  background-color: var(--color-primary-600);
  border-color: var(--color-primary-600);
}

.btn--secondary {
  background-color: var(--color-background-secondary);
  color: var(--color-text-primary);
  border-color: var(--color-border-primary);
}

.btn--sm {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-sm);
}

.btn--lg {
  padding: var(--spacing-md) var(--spacing-lg);
  font-size: var(--font-size-lg);
}
```

#### Using Inline Styles with TokenTransformer

```tsx
// components/Card.tsx
import {TokenTransformer, useTheme} from '@sparkle/theme'
import {useMemo} from 'react'

interface CardProps {
  elevated?: boolean
  children: React.ReactNode
}

export function Card({elevated = false, children}: CardProps) {
  const {theme} = useTheme()

  const styles = useMemo(() => {
    const transformer = new TokenTransformer()
    const tokens = transformer.toWeb(theme)

    return {
      card: {
        backgroundColor: elevated
          ? tokens['--color-surface-elevated']
          : tokens['--color-surface-primary'],
        borderRadius: tokens['--border-radius-lg'],
        padding: tokens['--spacing-lg'],
        boxShadow: elevated ? tokens['--shadow-md'] : tokens['--shadow-sm'],
        border: `1px solid ${tokens['--color-border-primary']}`,
      },
    }
  }, [theme, elevated])

  return (
    <div style={styles.card}>
      {children}
    </div>
  )
}
```

### React Native Components

```tsx
// components/Button.native.tsx
import {TokenTransformer, useTheme} from '@sparkle/theme'
import {Pressable, StyleSheet, Text} from 'react-native'

interface ButtonProps {
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  onPress?: () => void
  children: string
}

export function Button({
  variant = 'primary',
  size = 'md',
  onPress,
  children
}: ButtonProps) {
  const {theme} = useTheme()
  const transformer = new TokenTransformer()
  const tokens = transformer.toNative(theme)

  const styles = StyleSheet.create({
    button: {
      borderRadius: tokens.borderRadiusMd,
      alignItems: 'center',
      justifyContent: 'center',
      ...(size === 'sm' && {
        paddingHorizontal: tokens.spacingSm,
        paddingVertical: tokens.spacingXs,
      }),
      ...(size === 'md' && {
        paddingHorizontal: tokens.spacingMd,
        paddingVertical: tokens.spacingSm,
      }),
      ...(size === 'lg' && {
        paddingHorizontal: tokens.spacingLg,
        paddingVertical: tokens.spacingMd,
      }),
      ...(variant === 'primary' && {
        backgroundColor: tokens.colorPrimary500,
      }),
      ...(variant === 'secondary' && {
        backgroundColor: tokens.colorBackgroundSecondary,
        borderWidth: 1,
        borderColor: tokens.colorBorderPrimary,
      }),
    },
    text: {
      fontWeight: tokens.fontWeightMedium,
      ...(size === 'sm' && {
        fontSize: tokens.fontSizeSm,
      }),
      ...(size === 'md' && {
        fontSize: tokens.fontSizeBase,
      }),
      ...(size === 'lg' && {
        fontSize: tokens.fontSizeLg,
      }),
      ...(variant === 'primary' && {
        color: tokens.colorTextInverse,
      }),
      ...(variant === 'secondary' && {
        color: tokens.colorTextPrimary,
      }),
    },
  })

  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.text}>{children}</Text>
    </Pressable>
  )
}
```

### Shared Component Patterns

Create platform-agnostic component logic:

```typescript
import type {ThemeConfig} from '@sparkle/types'
// components/shared/button-styles.ts
import {TokenTransformer} from '@sparkle/theme'

interface ButtonStyleConfig {
  variant: 'primary' | 'secondary'
  size: 'sm' | 'md' | 'lg'
  theme: ThemeConfig
}

export function createButtonStyles({variant, size, theme}: ButtonStyleConfig) {
  const transformer = new TokenTransformer()
  const tokens = transformer.toNative(theme) // Works for both platforms

  return {
    backgroundColor: variant === 'primary'
      ? tokens.colorPrimary500
      : tokens.colorBackgroundSecondary,
    color: variant === 'primary'
      ? tokens.colorTextInverse
      : tokens.colorTextPrimary,
    padding: {
      sm: {x: tokens.spacingSm, y: tokens.spacingXs},
      md: {x: tokens.spacingMd, y: tokens.spacingSm},
      lg: {x: tokens.spacingLg, y: tokens.spacingMd},
    }[size],
    fontSize: {
      sm: tokens.fontSizeSm,
      md: tokens.fontSizeBase,
      lg: tokens.fontSizeLg,
    }[size],
    borderRadius: tokens.borderRadiusMd,
  }
}
```

## Stage 6: Runtime Management

### Theme Switching Components

```tsx
// components/ThemeToggle.tsx
import {useTheme} from '@sparkle/theme'

export function ThemeToggle() {
  const {activeTheme, setTheme, systemTheme} = useTheme()

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
  }

  return (
    <div className="theme-toggle">
      <label>
        <input
          type="radio"
          name="theme"
          value="light"
          checked={activeTheme === 'light'}
          onChange={() => handleThemeChange('light')}
        />
        Light
      </label>
      <label>
        <input
          type="radio"
          name="theme"
          value="dark"
          checked={activeTheme === 'dark'}
          onChange={() => handleThemeChange('dark')}
        />
        Dark
      </label>
      <label>
        <input
          type="radio"
          name="theme"
          value="system"
          checked={activeTheme === 'system'}
          onChange={() => handleThemeChange('system')}
        />
        System ({systemTheme})
      </label>
    </div>
  )
}
```

### Theme Persistence Handling

```typescript
import {useTheme} from '@sparkle/theme'
// hooks/useThemePersistence.ts
import {useEffect} from 'react'

export function useThemePersistence() {
  const {activeTheme, setTheme, isLoading} = useTheme()

  // Custom persistence logic
  useEffect(() => {
    if (!isLoading) {
      // Theme is automatically persisted by the provider
      console.log('Current theme:', activeTheme)

      // You can add custom analytics or side effects here
      analytics.track('theme_changed', {theme: activeTheme})
    }
  }, [activeTheme, isLoading])

  return {activeTheme, setTheme, isLoading}
}
```

### Dynamic Theme Loading

```typescript
import type {ThemeConfig} from '@sparkle/types'
import {useTheme} from '@sparkle/theme'
// hooks/useDynamicTheme.ts
import {useEffect, useState} from 'react'

export function useDynamicTheme(themeId?: string) {
  const [customTheme, setCustomTheme] = useState<ThemeConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const {setTheme} = useTheme()

  useEffect(() => {
    if (themeId) {
      setLoading(true)

      // Load theme from API or dynamic import
      loadThemeById(themeId)
        .then(theme => {
          setCustomTheme(theme)
          // Apply the custom theme
          setTheme('light') // Or whichever variant
        })
        .catch(error => {
          console.error('Failed to load theme:', error)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [themeId, setTheme])

  return {customTheme, loading}
}

async function loadThemeById(themeId: string): Promise<ThemeConfig> {
  // Implementation depends on your requirements
  const response = await fetch(`/api/themes/${themeId}`)
  return response.json()
}
```

## Best Practices and Organization

### File Structure

Organize your theme files for maintainability:

```
your-app/
├── theme/
│   ├── index.ts              # Main theme exports
│   ├── tokens.ts             # Base token definitions
│   ├── light.ts              # Light theme variant
│   ├── dark.ts               # Dark theme variant
│   └── utils.ts              # Theme utility functions
├── components/
│   ├── Button/
│   │   ├── Button.tsx        # Web component
│   │   ├── Button.native.tsx # Native component
│   │   ├── Button.css        # Web styles (using CSS custom properties)
│   │   └── index.ts          # Component exports
│   └── shared/
│       └── styles.ts         # Shared styling utilities
└── hooks/
    ├── useTheme.ts           # Re-export or extend theme hooks
    └── useThemePersistence.ts # Custom theme hooks
```

### Token Naming Conventions

Follow consistent naming for maintainability:

```css
// ✅ Good - Semantic and scale-based naming
colors: {
  primary: {500: '#0ea5e9'},
  secondary: {500: '#64748b'},
  success: {500: '#22c55e'},
  text: {
    primary: '#111827',
    secondary: '#6b7280',
  },
  background: {
    primary: '#ffffff',
    secondary: '#f9fafb',
  },
}

// ❌ Avoid - Implementation-specific names
colors: {
  blue: '#0ea5e9',
  lightBlue: '#60a5fa',
  buttonColor: '#0ea5e9',
  headerBackground: '#ffffff',
}
```

### Performance Optimization

```tsx
// ✅ Good - Memoize expensive calculations
import {TokenTransformer, useTheme} from '@sparkle/theme'
import {useMemo} from 'react'

function OptimizedComponent() {
  const {theme} = useTheme()

  const styles = useMemo(() => {
    const transformer = new TokenTransformer()
    return transformer.toNative(theme)
  }, [theme])

  return <View style={{backgroundColor: styles.colorPrimary500}} />
}

// ✅ Good - Create transformer instances at module level
const transformer = new TokenTransformer()

function Component() {
  const {theme} = useTheme()
  const styles = transformer.toNative(theme)
  return <View style={{backgroundColor: styles.colorPrimary500}} />
}
```

## Testing Theme Integration

### Unit Testing Components

```tsx
// __tests__/Button.test.tsx
import {ThemeProvider} from '@sparkle/theme'
import {render, screen} from '@testing-library/react'
import {Button} from '../components/Button'
import {lightTheme} from '../theme'

function TestWrapper({children}: {children: React.ReactNode}) {
  return (
    <ThemeProvider themes={{light: lightTheme}} defaultTheme="light">
      {children}
    </ThemeProvider>
  )
}

test('Button renders with theme styles', () => {
  render(
    <Button variant="primary">Click me</Button>,
    {wrapper: TestWrapper}
  )

  const button = screen.getByRole('button', {name: /click me/i})

  // Test that CSS custom properties are applied
  expect(button).toHaveStyle({
    backgroundColor: 'var(--color-primary-500)',
  })
})
```

### Integration Testing

```tsx
// __tests__/theme-integration.test.tsx
import {ThemeProvider, useTheme} from '@sparkle/theme'
import {fireEvent, render, screen} from '@testing-library/react'
import {appThemes} from '../theme'

function ThemeTestComponent() {
  const {activeTheme, setTheme} = useTheme()

  return (
    <div>
      <span data-testid="current-theme">{activeTheme}</span>
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('light')}>Light</button>
    </div>
  )
}

test('Theme switching works correctly', () => {
  render(
    <ThemeProvider themes={appThemes} defaultTheme="light">
      <ThemeTestComponent />
    </ThemeProvider>
  )

  expect(screen.getByTestId('current-theme')).toHaveTextContent('light')

  fireEvent.click(screen.getByText('Dark'))
  expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')

  fireEvent.click(screen.getByText('Light'))
  expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
})
```

## Migration and Maintenance

### Upgrading Themes

When updating theme structures:

```typescript
// utils/theme-migration.ts
import type {ThemeConfig} from '@sparkle/types'

export function migrateThemeV1ToV2(oldTheme: any): ThemeConfig {
  return {
    ...oldTheme,
    // Add new required properties
    animation: {
      duration: {
        fast: '150ms',
        normal: '300ms',
        slow: '500ms',
      },
      easing: {
        ease: 'ease',
        easeIn: 'ease-in',
        easeOut: 'ease-out',
      },
    },
    // Migrate old color structure
    colors: {
      ...oldTheme.colors,
      // Ensure semantic colors exist
      text: oldTheme.colors.text || {
        primary: '#111827',
        secondary: '#6b7280',
      },
    },
  }
}
```

### Theme Validation

```typescript
import type {ThemeConfig} from '@sparkle/types'
// utils/theme-validation.ts
import {validateTheme} from '@sparkle/theme'

export function validateCustomTheme(theme: ThemeConfig): boolean {
  const validation = validateTheme(theme)

  if (!validation.isValid) {
    console.error('Theme validation failed:', validation.errors)
    return false
  }

  return true
}

export function safeApplyTheme(theme: ThemeConfig): ThemeConfig {
  if (validateCustomTheme(theme)) {
    return theme
  }

  // Return fallback theme
  return lightTheme
}
```

This workflow guide provides a comprehensive overview of how to work with Sparkle's theme system from initial setup to production deployment. Each stage builds on the previous ones to create a robust, maintainable theming solution for your applications.
