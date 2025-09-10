---
title: Token Transformation
description: Learn how to transform design tokens between web and React Native platforms using the TokenTransformer.
---

<!-- eslint-disable @typescript-eslint/no-unused-expressions -->

## Overview

The `TokenTransformer` is a core component of Sparkle's theme system that enables cross-platform token transformation. It converts design tokens between web format (CSS custom properties) and React Native format (StyleSheet values) while maintaining type safety and performance through intelligent caching.

## Related Pages

- [Theme Overview](./overview) - Introduction to Sparkle's theme system
- [Theme Providers](./providers) - Setup and configuration guides
- [Complete Workflow](./workflow) - End-to-end implementation guide
- [Advanced Customization](./advanced) - Enterprise patterns and custom transformers
- [Troubleshooting](./troubleshooting) - Common issues and performance optimization

## Core Concepts

### Platform-Specific Formats

Design tokens need different formats for different platforms:

**Web Format (CSS Custom Properties):**

```css
:root {
  --color-primary-500: #3b82f6;
  --spacing-md: 1rem;
  --font-size-base: 1rem;
}
```

**React Native Format (StyleSheet Values):**

```typescript
// Example of transformed native tokens
const nativeTokens = {
  colorPrimary500: '#3b82f6',
  spacingMd: 16,
  fontSizeBase: 16,
}
```

### TokenTransformer Class

The `TokenTransformer` handles the conversion between these formats automatically:

```typescript
import {lightTokens, TokenTransformer} from '@sparkle/theme'

const transformer = new TokenTransformer()

// Transform to web format
const webTokens = transformer.toWeb(lightTokens)
// Result: { '--color-primary-500': '#3b82f6', '--spacing-md': '1rem', ... }

// Transform to React Native format
const nativeTokens = transformer.toNative(lightTokens)
// Result: { colorPrimary500: '#3b82f6', spacingMd: 16, ... }
```

## Basic Usage

### Web Applications

For web applications, transform tokens to CSS custom properties:

```typescript
import {lightTokens, TokenTransformer} from '@sparkle/theme'

const transformer = new TokenTransformer()

// Basic transformation
const cssVariables = transformer.toWeb(lightTokens)

// With custom prefix
const prefixedVariables = transformer.toWeb(lightTokens, {prefix: 'sparkle'})
// Result: { '--sparkle-color-primary-500': '#3b82f6', ... }
```

### React Native Applications

For React Native, transform tokens to native StyleSheet values:

```typescript
import {lightTokens, TokenTransformer} from '@sparkle/theme'

const transformer = new TokenTransformer()

// Basic transformation
const nativeTheme = transformer.toNative(lightTokens)

// With custom base font size (affects rem calculations)
const customNativeTheme = transformer.toNative(lightTokens, {
  baseFontSize: 18,
})

// With flattened color structure for easier access
const flattenedTheme = transformer.toNative(lightTokens, {
  flattenColors: true,
})
```

## Advanced Usage

### Full Transformation Control

Use the main `transform` method for complete control:

```typescript
import {lightTokens, TokenTransformer} from '@sparkle/theme'

const transformer = new TokenTransformer()

// Web transformation with metadata
const webResult = transformer.transform(lightTokens, {
  platform: 'web',
  prefix: 'app',
})

console.log(webResult.platform) // 'web'
console.log(webResult.tokens) // CSS custom properties object
console.log(webResult.metadata.tokenCount) // Number of generated tokens
console.log(webResult.metadata.transformedAt) // ISO timestamp

// Native transformation with options
const nativeResult = transformer.transform(lightTokens, {
  platform: 'native',
  baseFontSize: 16,
  flattenColors: false,
})
```

### Caching and Performance

The `TokenTransformer` includes intelligent caching to improve performance:

```typescript
import {darkTokens, lightTokens, TokenTransformer} from '@sparkle/theme'

const transformer = new TokenTransformer()

// First call - performs transformation and caches result
const result1 = transformer.toWeb(lightTokens)

// Second call with same tokens - returns cached result instantly
const result2 = transformer.toWeb(lightTokens)

// Different tokens - performs new transformation
const result3 = transformer.toWeb(darkTokens)

// Check cache statistics
const stats = transformer.getCacheStats()
console.log(`Cache size: ${stats.size}`)
console.log(`Cache keys: ${stats.keys}`)

// Clear cache when needed (e.g., after token updates)
transformer.clearCache()
```

### Transformation Options

#### Web Platform Options

```typescript
interface WebTransformOptions {
  platform: 'web'
  /** CSS custom property prefix (default: no prefix) */
  prefix?: string
}

// Examples
transformer.toWeb(tokens, {prefix: 'sparkle'})
// → '--sparkle-color-primary-500': '#3b82f6'

transformer.toWeb(tokens, {prefix: 'theme'})
// → '--theme-color-primary-500': '#3b82f6'
```

#### React Native Platform Options

```typescript
interface NativeTransformOptions {
  platform: 'native'
  /** Base font size for rem calculations (default: 16) */
  baseFontSize?: number
  /** Whether to flatten color objects for easier access (default: false) */
  flattenColors?: boolean
}

// Examples
transformer.toNative(tokens, {baseFontSize: 18})
// → Converts 1rem to 18 instead of 16

transformer.toNative(tokens, {flattenColors: true})
// → { primary500: '#3b82f6' } instead of { primary: { 500: '#3b82f6' } }
```

## Token Utilities

The package also includes utility functions for common token operations:

```typescript
import {lightTokens, tokenUtils} from '@sparkle/theme'

// Compare two themes
const differences = tokenUtils.compareThemes(lightTokens, darkTokens)
console.log(differences) // Array of changed token paths

// Extract color palette
const colors = tokenUtils.extractColorPalette(lightTokens)
console.log(colors) // Object with all color values

// Get semantic color names
const colorNames = tokenUtils.getColorNames(lightTokens)
console.log(colorNames) // ['primary', 'secondary', 'success', ...]

// Get spacing scale keys
const spacingKeys = tokenUtils.getSpacingKeys(lightTokens)
console.log(spacingKeys) // ['xs', 'sm', 'md', 'lg', ...]

// Merge themes with overrides
const customTheme = tokenUtils.mergeThemes(lightTokens, {
  colors: {
    primary: {500: '#custom-color'},
  },
})
```

## Integration Patterns

### Web Component Integration

<!-- eslint-disable -->

```tsx
import {useTheme} from '@sparkle/theme'
import {TokenTransformer} from '@sparkle/theme'

function ThemedButton({children}: {children: React.ReactNode}) {
  const {theme} = useTheme()

  // Method 1: Use CSS custom properties (recommended)
  const buttonStyle = {
    backgroundColor: 'var(--color-primary-500)',
    color: 'var(--color-text-inverse)',
    padding: 'var(--spacing-md)',
  }

  return <button style={buttonStyle}>{children}</button>

  // Method 2: Transform tokens manually
  const transformer = new TokenTransformer()
  const cssVars = transformer.toWeb(theme)

  return <button style={{backgroundColor: cssVars['--color-primary-500']}}>{children}</button>
}
```

### React Native Component Integration

<!-- eslint-disable -->

```tsx
import {StyleSheet, Text, TouchableOpacity} from 'react-native'

import {TokenTransformer, useTheme} from '@sparkle/theme'

function ThemedButton({children}: {children: string}) {
  const {theme} = useTheme()
  const transformer = new TokenTransformer()
  const nativeTokens = transformer.toNative(theme)

  const styles = StyleSheet.create({
    button: {
      backgroundColor: nativeTokens.colorPrimary500,
      paddingHorizontal: nativeTokens.spacingMd,
      paddingVertical: nativeTokens.spacingSm,
      borderRadius: nativeTokens.borderRadiusMd,
    },
    text: {
      color: nativeTokens.colorTextInverse,
      fontSize: nativeTokens.fontSizeBase,
      fontWeight: nativeTokens.fontWeightMedium,
    },
  })

  return (
    <TouchableOpacity style={styles.button}>
      <Text style={styles.text}>{children}</Text>
    </TouchableOpacity>
  )
}
```

### Theme Provider Integration

The `TokenTransformer` is used internally by theme providers but can also be used directly:

<!-- eslint-disable -->

```tsx
// Web - CSS variables are automatically injected
import {ThemeProvider} from '@sparkle/theme'

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <YourComponents />
    </ThemeProvider>
  )
}

// React Native - Use transformer to convert tokens as needed
import {NativeThemeProvider} from '@sparkle/theme'

function NativeApp() {
  return (
    <NativeThemeProvider defaultTheme="light">
      <YourComponents />
    </NativeThemeProvider>
  )
}
```

## Best Practices

### 1. Use Singleton Pattern for Better Performance

```typescript
// Create a single transformer instance and reuse it
const globalTransformer = new TokenTransformer()

export {globalTransformer as transformer}
```

### 2. Cache Transformed Tokens

```typescript
import {TokenTransformer, useTheme} from '@sparkle/theme'

import {useMemo} from 'react'

function useNativeTokens() {
  const {theme} = useTheme()

  return useMemo(() => {
    const transformer = new TokenTransformer()
    return transformer.toNative(theme)
  }, [theme])
}
```

### 3. Type-Safe Token Access

```typescript
import {lightTokens, TokenTransformer} from '@sparkle/theme'

const transformer = new TokenTransformer()
const tokens = transformer.toNative(lightTokens)

// TypeScript will provide autocomplete and type checking
const primaryColor = tokens.colorPrimary500 // ✅ Type-safe
const invalidKey = tokens.nonExistentKey // ❌ TypeScript error
```

### 4. Error Handling

```typescript
import {TokenTransformer} from '@sparkle/theme'

function transformTokensSafely(tokens: ThemeConfig) {
  try {
    const transformer = new TokenTransformer()
    return transformer.toWeb(tokens)
  } catch (error) {
    console.error('Token transformation failed:', error)
    // Return fallback or throw appropriate error
    return {}
  }
}
```

## Troubleshooting

### Common Issues

#### Issue: Tokens not updating after theme change

```typescript
// Solution: Clear cache after token updates
transformer.clearCache()
const newTokens = transformer.toWeb(updatedTheme)
```

#### Issue: Performance problems with frequent transformations

```typescript
// Solution: Use memoization and caching
const tokens = useMemo(() => transformer.toNative(theme), [theme]) // Only recalculate when theme changes
```

#### Issue: Different font sizes between web and native

```typescript
// Solution: Adjust base font size for native platform
const nativeTokens = transformer.toNative(theme, {baseFontSize: 18})
```

### Performance Tips

1. **Reuse transformer instances** - Don't create new instances repeatedly
2. **Leverage caching** - Let the transformer cache results automatically
3. **Use memoization** - Combine with React hooks to prevent unnecessary recalculations
4. **Clear cache appropriately** - Only clear when tokens actually change

## API Reference

For complete API documentation, see the [TokenTransformer API reference](../api/theme/src#tokentransformer).
