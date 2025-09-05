# @sparkle/theme

A comprehensive, cross-platform theme management package for the Sparkle Design System.

[![NPM Version](https://img.shields.io/npm/v/@sparkle/theme)](https://www.npmjs.com/package/@sparkle/theme) [![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 🎨 **Design Token System**: Centralized color, typography, spacing, and animation tokens
- 🌗 **Theme Switching**: Light, dark, and system theme support with seamless transitions
- 🔄 **React Context**: Provider-based theme management with hooks for easy consumption
- 🎯 **Tailwind Integration**: CSS custom properties and utility classes with automatic generation
- 📱 **Cross-Platform**: Web and React Native compatibility with platform-specific optimizations
- 🔧 **TypeScript**: Full type safety and IntelliSense support with comprehensive type definitions
- 💾 **Persistence**: Automatic theme preference storage with localStorage (web) and AsyncStorage (mobile)
- 🎭 **Custom Themes**: Easy creation and validation of custom theme configurations
- ⚡ **Performance**: Optimized re-render patterns and memoized calculations
- 🧪 **Testing**: Comprehensive test coverage with utilities for theme testing

## 📦 Installation

```bash
# Using pnpm (recommended)
pnpm add @sparkle/theme @sparkle/types @sparkle/utils

# Using npm
npm install @sparkle/theme @sparkle/types @sparkle/utils

# Using yarn
yarn add @sparkle/theme @sparkle/types @sparkle/utils
```

### Peer Dependencies

```json
{
  "react": ">=18.0.0",
  "react-dom": ">=18.0.0",
  "tailwindcss": ">=4.0.0"
}
```

For React Native projects, additionally install:

```bash
pnpm add @react-native-async-storage/async-storage
```

## 🚀 Quick Start

### Web Application Setup

```tsx
import { darkTokens, lightTokens, ThemeProvider } from '@sparkle/theme'

function App() {
  return (
    <ThemeProvider
      themes={{ light: lightTokens, dark: darkTokens }}
      defaultTheme="system"
    >
      <YourApp />
    </ThemeProvider>
  )
}

export default App
```

### React Native Application Setup

```tsx
import { darkTokens, lightTokens } from '@sparkle/theme'
import { NativeThemeProvider } from '@sparkle/theme/react-native'

function App() {
  return (
    <NativeThemeProvider
      themes={{ light: lightTokens, dark: darkTokens }}
      defaultTheme="system"
    >
      <YourApp />
    </NativeThemeProvider>
  )
}

export default App
```

### Using Themes in Components

```tsx
import { useTheme } from '@sparkle/theme'

function MyComponent() {
  const { theme, activeTheme, setTheme } = useTheme()

  return (
    <div
      className="p-4 rounded-lg"
      style={{
        backgroundColor: theme.colors.primary[500],
        color: theme.colors.neutral[50]
      }}
    >
      <h2>Current theme: {activeTheme}</h2>
      <button
        onClick={() => setTheme(activeTheme === 'light' ? 'dark' : 'light')}
        className="mt-2 px-4 py-2 bg-theme-primary-600 text-theme-neutral-50 rounded"
      >
        Toggle Theme
      </button>
    </div>
  )
}
```

## 🎨 Tailwind CSS Integration

### Configure Tailwind

Add the theme plugin to your `tailwind.config.js`:

```js
import { createThemePlugin } from '@sparkle/theme/tailwind'

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  plugins: [
    createThemePlugin({
      themes: {
        light: lightTokens,
        dark: darkTokens
      },
      defaultTheme: 'light'
    })
  ]
}
```

### Using Theme Classes

The plugin automatically generates utility classes for all theme tokens:

```tsx
function ThemedComponent() {
  return (
    <div className="bg-theme-primary-500 text-theme-neutral-50">
      <h1 className="text-theme-text-primary font-theme-heading-lg">
        Themed Heading
      </h1>
      <p className="text-theme-text-secondary font-theme-body-md">
        Themed paragraph with semantic colors
      </p>
      <button className="bg-theme-secondary-600 hover:bg-theme-secondary-700 px-theme-spacing-md py-theme-spacing-sm rounded-theme-radius-md">
        Themed Button
      </button>
    </div>
  )
}
```

## 📱 React Native Integration

### Styling Components

```tsx
import { useTheme } from '@sparkle/theme'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

function ThemedComponent() {
  const { theme } = useTheme()

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.primary[500],
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md
    },
    title: {
      color: theme.colors.neutral[50],
      fontSize: theme.typography.heading.lg.fontSize,
      fontWeight: theme.typography.heading.lg.fontWeight
    },
    button: {
      backgroundColor: theme.colors.secondary[600],
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
      marginTop: theme.spacing.md
    }
  })

  return (
    <View style={styles.container}>
      <Text style={styles.title}>React Native Themed Component</Text>
      <TouchableOpacity style={styles.button}>
        <Text style={{ color: theme.colors.neutral[50] }}>
          Themed Button
        </Text>
      </TouchableOpacity>
    </View>
  )
}
```

## 🎭 Custom Themes

### Creating Custom Theme Tokens

```tsx
import type { ThemeConfig } from '@sparkle/types'
import { baseTokens } from '@sparkle/theme'

// Extend base tokens with custom values
const customTheme: ThemeConfig = {
  ...baseTokens,
  colors: {
    ...baseTokens.colors,
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9', // Custom primary color
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e'
    },
    // Add custom color scales
    brand: {
      50: '#fdf4ff',
      100: '#fae8ff',
      200: '#f5d0fe',
      300: '#f0abfc',
      400: '#e879f9',
      500: '#d946ef',
      600: '#c026d3',
      700: '#a21caf',
      800: '#86198f',
      900: '#701a75'
    }
  },
  typography: {
    ...baseTokens.typography,
    // Override font families
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace']
    }
  }
}

// Use in your app
function App() {
  return (
    <ThemeProvider
      themes={{
        light: customTheme,
        dark: { ...customTheme, /* dark overrides */ }
      }}
    >
      <YourApp />
    </ThemeProvider>
  )
}
```

### Theme Validation

```tsx
import { isValidTheme, validateTheme } from '@sparkle/theme'

// Validate theme configuration
const validationResult = validateTheme(customTheme)
if (!validationResult.isValid) {
  console.error('Theme validation failed:', validationResult.errors)
}

// Quick validation check
if (isValidTheme(customTheme)) {
  console.log('Theme is valid!')
}
```

## 🎯 Advanced Usage

### Dynamic Theme Loading

```tsx
import { ThemeProvider, type ThemeConfig } from '@sparkle/theme'
import { useEffect, useState } from 'react'

function DynamicThemeApp() {
  const [themes, setThemes] = useState<Record<string, ThemeConfig>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadThemes() {
      try {
        // Load themes from API or files
        const [lightTheme, darkTheme, customTheme] = await Promise.all([
          import('./themes/light.json'),
          import('./themes/dark.json'),
          import('./themes/custom.json')
        ])

        setThemes({
          light: lightTheme.default,
          dark: darkTheme.default,
          custom: customTheme.default
        })
      } catch (error) {
        console.error('Failed to load themes:', error)
      } finally {
        setLoading(false)
      }
    }

    loadThemes()
  }, [])

  if (loading) {
    return <div>Loading themes...</div>
  }

  return (
    <ThemeProvider themes={themes} defaultTheme="system">
      <YourApp />
    </ThemeProvider>
  )
}
```

### System Theme Detection

```tsx
import { useColorScheme } from '@sparkle/theme'

function SystemThemeComponent() {
  const systemScheme = useColorScheme()

  return (
    <div className="p-4">
      <p>System prefers: {systemScheme}</p>
      <p>This component automatically adapts to system preferences</p>
    </div>
  )
}
```

### Theme Persistence Configuration

```tsx
import { ThemeProvider } from '@sparkle/theme'

function App() {
  return (
    <ThemeProvider
      themes={{ light: lightTokens, dark: darkTokens }}
      defaultTheme="system"
      storageKey="my-app-theme" // Custom storage key
      enablePersistence={true}   // Enable/disable persistence
    >
      <YourApp />
    </ThemeProvider>
  )
}
```

## 🧪 Testing

### Testing Components with Themes

```tsx
import { lightTokens, ThemeProvider } from '@sparkle/theme'
import { render, screen } from '@testing-library/react'
import { MyThemedComponent } from './MyThemedComponent'

function renderWithTheme(component: React.ReactElement, theme = lightTokens) {
  return render(
    <ThemeProvider themes={{ light: theme }} defaultTheme="light">
      {component}
    </ThemeProvider>
  )
}

test('renders with theme colors', () => {
  renderWithTheme(<MyThemedComponent />)

  const element = screen.getByRole('button')
  expect(element).toHaveStyle({
    backgroundColor: lightTokens.colors.primary[500]
  })
})
```

### Testing Theme Switching

```tsx
import { darkTokens, lightTokens, ThemeProvider } from '@sparkle/theme'
import { fireEvent, render, screen } from '@testing-library/react'

test('switches themes correctly', async () => {
  render(
    <ThemeProvider
      themes={{ light: lightTokens, dark: darkTokens }}
      defaultTheme="light"
    >
      <ThemeSwitcher />
    </ThemeProvider>
  )

  const toggleButton = screen.getByRole('button', { name: /toggle theme/i })

  // Initial state - light theme
  expect(screen.getByText('Current theme: light')).toBeInTheDocument()

  // Switch to dark theme
  fireEvent.click(toggleButton)
  expect(screen.getByText('Current theme: dark')).toBeInTheDocument()
})
```

## 📚 API Reference

### Hooks

- **`useTheme()`** - Access current theme and theme controls
- **`useColorScheme()`** - Detect system color scheme preference

### Components

- **`ThemeProvider`** - Web theme provider with React Context
- **`NativeThemeProvider`** - React Native theme provider
- **`ThemeShowcase`** - Demo component showing all theme features

### Utilities

- **`validateTheme()`** - Validate theme configuration
- **`createThemePlugin()`** - Tailwind CSS plugin for theme integration
- **`generateCSSVariables()`** - Generate CSS custom properties
- **`generateNativeTheme()`** - Generate React Native StyleSheet objects

For detailed API documentation, see [API.md](./docs/API.md).

## 🔄 Migration Guide

Migrating from a previous theme system? See our comprehensive [Migration Guide](./docs/MIGRATION.md) for step-by-step instructions.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./docs/CONTRIBUTING.md) for details on how to get started.

## 📄 License

MIT © [Marcus R. Brown](https://github.com/marcusrbrown)

## 🔗 Related Packages

- [`@sparkle/ui`](../ui) - Component library using theme system
- [`@sparkle/types`](../types) - Shared TypeScript definitions
- [`@sparkle/utils`](../utils) - Utility functions and hooks
- [`@sparkle/config`](../config) - Shared configurations

---

Happy theming! 🎨
