# Migration Guide

This guide helps you migrate from previous theme implementations to the new `@sparkle/theme` package.

## Table of Contents

- [Overview](#overview)
- [Breaking Changes](#breaking-changes)
- [Migration Steps](#migration-steps)
- [Updated Patterns](#updated-patterns)
- [Common Issues](#common-issues)
- [Migration Examples](#migration-examples)

## Overview

The new `@sparkle/theme` package provides:

- **Unified API**: Single package for web and React Native theming
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Performance**: Optimized theme switching and CSS custom property updates
- **Design Tokens**: Systematic approach to color, typography, and spacing
- **Cross-Platform**: Consistent theming across web and mobile platforms

## Breaking Changes

### 1. Package Structure

**Before:**

```tsx
import { ThemeProvider } from '@sparkle/ui/providers'
import { theme } from '@sparkle/ui/theme'
```

**After:**

```tsx
import { darkTokens, lightTokens, ThemeProvider } from '@sparkle/theme'
```

### 2. CSS Custom Properties

**Before:**

```css
:root {
  --primary-color: #3b82f6;
  --text-color: #1f2937;
}

.button {
  background-color: var(--primary-color);
  color: var(--text-color);
}
```

**After:**

```css
:root {
  --theme-primary-500: 59 130 246; /* RGB space-separated */
  --theme-text-primary: 31 41 55;
}

.button {
  background-color: rgb(var(--theme-primary-500));
  color: rgb(var(--theme-text-primary));
}
```

### 3. Theme Context API

**Before:**

```tsx
const { currentTheme, setTheme } = useContext(ThemeContext)
```

**After:**

```tsx
const { theme, activeTheme, setTheme } = useTheme()
```

### 4. Component Theme Props

**Before:**

```tsx
<Button theme="dark" variant="primary" />
```

**After:**

```tsx
// Theme is provided via context - no theme prop needed
<Button variant="primary" />
```

### 5. Tailwind Configuration

**Before:**

```js
module.exports = {
  theme: {
    colors: {
      primary: '#3b82f6',
      secondary: '#6b7280'
    }
  }
}
```

**After:**

```js
import { darkTokens, lightTokens } from '@sparkle/theme'
import { createThemePlugin } from '@sparkle/theme/tailwind'

export default {
  plugins: [
    createThemePlugin({
      themes: { light: lightTokens, dark: darkTokens }
    })
  ]
}
```

## Migration Steps

### Step 1: Install New Package

```bash
# Remove old theme dependencies (if any)
pnpm remove @sparkle/ui/theme

# Install new theme package
pnpm add @sparkle/theme @sparkle/types @sparkle/utils
```

### Step 2: Update Imports

Replace old theme imports with new ones:

```tsx
// After
import { darkTokens, lightTokens, ThemeProvider, useTheme } from '@sparkle/theme'
// Before
import { theme, ThemeProvider } from '@sparkle/ui'
import { useTheme } from '@sparkle/ui/hooks'
```

### Step 3: Update Theme Provider

**Before:**

```tsx
function App() {
  return (
    <ThemeProvider theme="light">
      <YourApp />
    </ThemeProvider>
  )
}
```

**After:**

```tsx
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
```

### Step 4: Update CSS Custom Properties

Update your CSS files to use the new naming convention:

```bash
# Use find and replace across your project
find ./src -name "*.css" -type f -exec sed -i '' 's/--primary-color/--theme-primary-500/g' {} +
find ./src -name "*.css" -type f -exec sed -i '' 's/--text-color/--theme-text-primary/g' {} +
```

### Step 5: Update Component Styles

**Before:**

```tsx
function Button({ theme, ...props }) {
  const styles = {
    backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
    color: theme === 'dark' ? '#f9fafb' : '#111827'
  }

  return <button style={styles} {...props} />
}
```

**After:**

```tsx
function Button(props) {
  const { theme } = useTheme()

  const styles = {
    backgroundColor: theme.colors.neutral[100],
    color: theme.colors.neutral[900]
  }

  return <button style={styles} {...props} />
}
```

### Step 6: Update Tailwind Classes

**Before:**

```tsx
<div className="bg-primary text-white">
  <h1 className="text-2xl font-bold">Title</h1>
</div>
```

**After:**

```tsx
<div className="bg-theme-primary-500 text-theme-neutral-50">
  <h1 className="text-theme-heading-xl font-theme-heading-bold">Title</h1>
</div>
```

### Step 7: Update React Native Styles

**Before:**

```tsx
const styles = StyleSheet.create({
  container: {
    backgroundColor: Platform.OS === 'dark' ? '#1f2937' : '#f9fafb'
  }
})
```

**After:**

```tsx
function Component() {
  const { theme } = useTheme()

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.neutral[50]
    }
  })

  return <View style={styles.container} />
}
```

## Updated Patterns

### Theme-Aware Components

**Before:**

```tsx
interface ButtonProps {
  theme?: 'light' | 'dark'
  variant?: 'primary' | 'secondary'
}

function Button({ theme = 'light', variant = 'primary', ...props }: ButtonProps) {
  const getBackgroundColor = () => {
    if (variant === 'primary') {
      return theme === 'dark' ? '#3b82f6' : '#2563eb'
    }
    return theme === 'dark' ? '#6b7280' : '#9ca3af'
  }

  return (
    <button
      style={{ backgroundColor: getBackgroundColor() }}
      {...props}
    />
  )
}
```

**After:**

```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary'
}

function Button({ variant = 'primary', ...props }: ButtonProps) {
  const { theme } = useTheme()

  const getBackgroundColor = () => {
    if (variant === 'primary') {
      return theme.colors.primary[600]
    }
    return theme.colors.secondary[500]
  }

  return (
    <button
      style={{ backgroundColor: getBackgroundColor() }}
      {...props}
    />
  )
}
```

### Dynamic Theme Creation

**Before:**

```tsx
const createCustomTheme = (primaryColor: string) => ({
  primary: primaryColor,
  secondary: '#6b7280',
  background: '#ffffff',
  text: '#111827'
})
```

**After:**

```tsx
import type { ThemeConfig } from '@sparkle/types'
import { baseTokens } from '@sparkle/theme'

const createCustomTheme = (primaryColor: string): ThemeConfig => ({
  ...baseTokens,
  colors: {
    ...baseTokens.colors,
    primary: {
      ...baseTokens.colors.primary,
      500: primaryColor
    }
  }
})
```

### Theme Persistence

**Before:**

```tsx
const [theme, setTheme] = useState(() => {
  return localStorage.getItem('theme') || 'light'
})

useEffect(() => {
  localStorage.setItem('theme', theme)
}, [theme])
```

**After:**

```tsx
// Persistence is handled automatically by ThemeProvider
function App() {
  return (
    <ThemeProvider
      themes={{ light: lightTokens, dark: darkTokens }}
      defaultTheme="system"
      enablePersistence={true}
    >
      <YourApp />
    </ThemeProvider>
  )
}
```

## Common Issues

### Issue 1: CSS Custom Property Format

**Problem:**

```css
/* This won't work with opacity modifiers */
background-color: rgb(var(--theme-primary-500) / 0.5);
```

**Solution:**

```css
/* Use space-separated RGB values */
background-color: rgb(var(--theme-primary-500) / 0.5);
/* The plugin generates: --theme-primary-500: 59 130 246; */
```

### Issue 2: Missing Theme Context

**Problem:**

```tsx
// Component not wrapped in ThemeProvider
function Component() {
  const { theme } = useTheme() // Error: Cannot read properties of undefined
}
```

**Solution:**

```tsx
// Wrap your app with ThemeProvider
function App() {
  return (
    <ThemeProvider themes={{ light: lightTokens, dark: darkTokens }}>
      <Component />
    </ThemeProvider>
  )
}
```

### Issue 3: TypeScript Errors

**Problem:**

```tsx
// TypeScript can't infer theme token types
const color = theme.colors.primary.invalidShade // Type error
```

**Solution:**

```tsx
// Use proper TypeScript types
import type { ThemeConfig } from '@sparkle/types'

const color: string = theme.colors.primary[500] // Type-safe
```

### Issue 4: React Native Platform Differences

**Problem:**

```tsx
// Web-specific imports don't work in React Native
import { ThemeProvider } from '@sparkle/theme'
```

**Solution:**

```tsx
// Use platform-specific imports
import { NativeThemeProvider } from '@sparkle/theme/react-native'
```

### Issue 5: Tailwind Class Names

**Problem:**

```css
/* Old class names don't exist */
.bg-primary { /* Not generated */ }
```

**Solution:**

```css
/* Use new theme-prefixed classes */
.bg-theme-primary-500 { /* Generated by plugin */ }
```

## Migration Examples

### Complete Component Migration

**Before:**

```tsx
interface CardProps {
  theme?: 'light' | 'dark'
  children: React.ReactNode
}

function Card({ theme = 'light', children }: CardProps) {
  const cardStyles = {
    backgroundColor: theme === 'light' ? '#ffffff' : '#1f2937',
    border: `1px solid ${theme === 'light' ? '#e5e7eb' : '#374151'}`,
    borderRadius: '8px',
    padding: '16px',
    color: theme === 'light' ? '#111827' : '#f9fafb'
  }

  return (
    <div style={cardStyles}>
      {children}
    </div>
  )
}

// Usage
<Card theme="dark">Content</Card>
```

**After:**

```tsx
interface CardProps {
  children: React.ReactNode
}

function Card({ children }: CardProps) {
  const { theme } = useTheme()

  const cardStyles = {
    backgroundColor: theme.colors.neutral[50],
    border: `1px solid ${theme.colors.neutral[200]}`,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.neutral[900]
  }

  return (
    <div style={cardStyles}>
      {children}
    </div>
  )
}

// Usage - theme comes from context
<Card>Content</Card>
```

### Tailwind CSS Migration

**Before:**

```tsx
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: '#6b7280'
      }
    }
  }
}

// Component
function Hero() {
  return (
    <div className="bg-primary text-white p-8">
      <h1 className="text-4xl font-bold">Welcome</h1>
    </div>
  )
}
```

**After:**

```tsx
import { darkTokens, lightTokens } from '@sparkle/theme'
// tailwind.config.js
import { createThemePlugin } from '@sparkle/theme/tailwind'

export default {
  plugins: [
    createThemePlugin({
      themes: { light: lightTokens, dark: darkTokens }
    })
  ]
}

// Component
function Hero() {
  return (
    <div className="bg-theme-primary-500 text-theme-neutral-50 p-theme-spacing-lg">
      <h1 className="text-theme-heading-xl font-theme-heading-bold">Welcome</h1>
    </div>
  )
}
```

### React Native Migration

**Before:**

```tsx
function NativeCard({ isDark, children }: { isDark: boolean; children: React.ReactNode }) {
  const styles = StyleSheet.create({
    card: {
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      borderRadius: 8,
      padding: 16,
      margin: 8
    },
    text: {
      color: isDark ? '#f9fafb' : '#111827'
    }
  })

  return (
    <View style={styles.card}>
      <Text style={styles.text}>{children}</Text>
    </View>
  )
}
```

**After:**

```tsx
function NativeCard({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()

  const styles = StyleSheet.create({
    card: {
      backgroundColor: theme.colors.neutral[50],
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      margin: theme.spacing.sm
    },
    text: {
      color: theme.colors.neutral[900],
      fontSize: theme.typography.fontSize.base
    }
  })

  return (
    <View style={styles.card}>
      <Text style={styles.text}>{children}</Text>
    </View>
  )
}
```

## Migration Checklist

- [ ] Install `@sparkle/theme` package
- [ ] Remove old theme dependencies
- [ ] Update imports to use new package
- [ ] Replace ThemeProvider usage
- [ ] Update CSS custom property names
- [ ] Update Tailwind configuration
- [ ] Update component theme props
- [ ] Update CSS class names
- [ ] Update React Native StyleSheet usage
- [ ] Test theme switching functionality
- [ ] Verify accessibility contrast ratios
- [ ] Update TypeScript types
- [ ] Run tests and fix any issues
- [ ] Update documentation

## Getting Help

If you encounter issues during migration:

1. **Check the [API Reference](./API.md)** for detailed usage information
2. **Review [Common Issues](#common-issues)** for known problems and solutions
3. **Look at [Migration Examples](#migration-examples)** for complete component transformations
4. **Open an issue** in the repository if you find bugs or need additional help

## Post-Migration Benefits

After completing the migration, you'll have:

- ✅ **Type Safety**: Full TypeScript support for all theme tokens
- ✅ **Performance**: Optimized theme switching with minimal re-renders
- ✅ **Consistency**: Unified theming across web and mobile platforms
- ✅ **Accessibility**: Built-in contrast validation and WCAG compliance
- ✅ **Developer Experience**: Better IntelliSense and error catching
- ✅ **Maintainability**: Centralized theme management and validation
- ✅ **Flexibility**: Easy custom theme creation and validation
