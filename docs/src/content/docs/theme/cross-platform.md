---
title: Cross-Platform Usage
description: Using Sparkle's theme system across web and React Native platforms with consistent design tokens.
---

## Platform Compatibility

Sparkle's theme system is designed to work seamlessly across web and React Native platforms, providing a unified design language while respecting platform-specific constraints.

## Web Platform

### CSS Custom Properties

On web platforms, Sparkle automatically converts design tokens to CSS custom properties:

```css
/* Auto-generated CSS custom properties */
:root {
  --colors-primary-500: #3b82f6;
  --colors-secondary-500: #64748b;
  --spacing-md: 1rem;
  --typography-fontSize-base: 1rem;
  --borderRadius-lg: 0.5rem;
}

/* Dark theme overrides */
[data-theme="dark"] {
  --colors-background-primary: #1f2937;
  --colors-text-primary: #f9fafb;
}
```

### React Hook Usage

Access theme tokens in React components:

```tsx
import { useThemeTokens } from '@sparkle/theme'

function WebButton() {
  const tokens = useThemeTokens()

  const styles = {
    backgroundColor: `var(--colors-primary-500)`,
    color: `var(--colors-white)`,
    padding: `var(--spacing-sm) var(--spacing-md)`,
    borderRadius: `var(--borderRadius-md)`,
    fontSize: `var(--typography-fontSize-base)`,
  }

  return <button style={styles}>Web Button</button>
}
```

### CSS-in-JS Integration

Use with popular CSS-in-JS libraries:

```tsx
import { useThemeTokens } from '@sparkle/theme'
import styled from 'styled-components'

const StyledButton = styled.button`
  background-color: var(--colors-primary-500);
  color: var(--colors-white);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--borderRadius-md);
  font-size: var(--typography-fontSize-base);

  &:hover {
    background-color: var(--colors-primary-600);
  }
`
```

## React Native Platform

### StyleSheet Integration

For React Native, tokens are converted to StyleSheet-compatible values:

```tsx
import { useNativeThemeTokens } from '@sparkle/theme'
import { StyleSheet } from 'react-native'

function NativeButton() {
  const tokens = useNativeThemeTokens()

  const styles = StyleSheet.create({
    button: {
      backgroundColor: tokens.colors.primary[500], // '#3b82f6'
      paddingVertical: tokens.spacing.sm,          // 8
      paddingHorizontal: tokens.spacing.md,       // 16
      borderRadius: tokens.borderRadius.md,       // 6
    },
    text: {
      color: tokens.colors.white,                  // '#ffffff'
      fontSize: tokens.typography.fontSize.base,   // 16
      fontWeight: tokens.typography.fontWeight.medium, // '500'
    }
  })

  return (
    <TouchableOpacity style={styles.button}>
      <Text style={styles.text}>Native Button</Text>
    </TouchableOpacity>
  )
}
```

### Theme Provider Setup

```tsx
import { NativeThemeProvider } from '@sparkle/theme'

function App() {
  return (
    <NativeThemeProvider theme="light">
      <NavigationContainer>
        <YourAppScreens />
      </NavigationContainer>
    </NativeThemeProvider>
  )
}
```

## Token Transformation

### Automatic Value Conversion

Sparkle automatically converts token values between platforms:

| Token Type    | Web Value        | React Native Value |
| ------------- | ---------------- | ------------------ |
| Colors        | `#3b82f6`        | `#3b82f6`          |
| Spacing       | `1rem` → `16px`  | `16`               |
| Font Size     | `1rem` → `16px`  | `16`               |
| Font Weight   | `500`            | `'500'`            |
| Border Radius | `0.5rem` → `8px` | `8`                |

### Custom Transformers

Create custom token transformers for specific needs:

```typescript
import { createTokenTransformer } from '@sparkle/theme'

const customTransformer = createTokenTransformer({
  // Convert rem values to dp for Android
  spacing: (value) => {
    if (Platform.OS === 'android') {
      return Number.parseFloat(value) * 16 // Convert rem to dp
    }
    return Number.parseFloat(value) * 16 // Default to pixels
  },

  // Platform-specific font family mapping
  fontFamily: (value) => {
    const fontMap = {
      'Inter': Platform.select({
        ios: 'Inter',
        android: 'Inter-Regular',
        web: 'Inter, system-ui, sans-serif'
      })
    }
    return fontMap[value] || value
  }
})
```

## Responsive Design

### Web Responsive Patterns

Use CSS media queries with Sparkle tokens:

```css
.container {
  padding: var(--spacing-sm);
}

@media (min-width: 768px) {
  .container {
    padding: var(--spacing-md);
  }
}

@media (min-width: 1024px) {
  .container {
    padding: var(--spacing-lg);
  }
}
```

### React Native Responsive Patterns

Use Dimensions API with theme tokens:

```tsx
import { useNativeThemeTokens } from '@sparkle/theme'
import { Dimensions } from 'react-native'

function ResponsiveComponent() {
  const tokens = useNativeThemeTokens()
  const { width } = Dimensions.get('window')

  const isTablet = width >= 768

  const styles = StyleSheet.create({
    container: {
      padding: isTablet ? tokens.spacing.lg : tokens.spacing.md,
      fontSize: isTablet ? tokens.typography.fontSize.lg : tokens.typography.fontSize.base,
    }
  })

  return <View style={styles.container} />
}
```

## Platform-Specific Customization

### Conditional Theme Values

Define platform-specific token values:

```typescript
import { Platform } from 'react-native'

const platformTheme = {
  typography: {
    fontFamily: {
      sans: Platform.select({
        ios: 'San Francisco',
        android: 'Roboto',
        web: 'Inter, system-ui, sans-serif'
      })
    }
  },
  spacing: {
    // iOS uses more generous spacing
    md: Platform.select({
      ios: 20,
      android: 16,
      web: '1rem'
    })
  }
}
```

### Platform Detection

Handle platform differences in components:

```tsx
import { useNativeThemeTokens, useThemeTokens } from '@sparkle/theme'
import { Platform } from 'react-native'

function CrossPlatformButton({ children, ...props }) {
  if (Platform.OS === 'web') {
    const tokens = useThemeTokens()
    return (
      <button
        style={{
          backgroundColor: `var(--colors-primary-500)`,
          padding: `var(--spacing-sm) var(--spacing-md)`
        }}
        {...props}
      >
        {children}
      </button>
    )
  }

  const tokens = useNativeThemeTokens()
  return (
    <TouchableOpacity
      style={{
        backgroundColor: tokens.colors.primary[500],
        paddingVertical: tokens.spacing.sm,
        paddingHorizontal: tokens.spacing.md
      }}
      {...props}
    >
      <Text>{children}</Text>
    </TouchableOpacity>
  )
}
```

## Performance Considerations

### Web Performance

1. **CSS Custom Properties**: Fast runtime theme switching
2. **CSS-in-JS Optimization**: Use static styles when possible
3. **Bundle Splitting**: Load themes on demand
4. **Caching**: Cache computed styles

```tsx
// Optimized web component
const OptimizedButton = memo(styled.button`
  /* Static styles - no runtime computation */
  background-color: var(--colors-primary-500);
  transition: background-color 0.2s ease;

  &:hover {
    background-color: var(--colors-primary-600);
  }
`)
```

### React Native Performance

1. **StyleSheet.create**: Use for better performance
2. **Static Styles**: Compute styles outside render
3. **Memoization**: Cache expensive calculations
4. **Avoid Inline Styles**: Use StyleSheet objects

```tsx
// Optimized React Native component
const styles = StyleSheet.create({
  button: {
    backgroundColor: '#3b82f6', // Static value for performance
    paddingVertical: 8,
    paddingHorizontal: 16,
  }
})

const OptimizedButton = memo(({ children }) => (
  <TouchableOpacity style={styles.button}>
    <Text>{children}</Text>
  </TouchableOpacity>
))
```

## Testing Across Platforms

### Visual Testing

Test components across platforms with consistent tokens:

```tsx
// Shared test component
export const TestButton = ({ platform = 'web' }) => {
  if (platform === 'web') {
    return <WebButton>Test Button</WebButton>
  }
  return <NativeButton>Test Button</NativeButton>
}

// Storybook stories
export default {
  title: 'Cross-Platform/Button',
  component: TestButton,
}

export const Web = {
  args: { platform: 'web' }
}

export const Native = {
  args: { platform: 'native' }
}
```

### Token Consistency Testing

Verify tokens produce consistent results:

```typescript
import { nativeTokens, webTokens } from '@sparkle/theme'

describe('Token Consistency', () => {
  test('color values match across platforms', () => {
    expect(webTokens.colors.primary[500]).toBe('#3b82f6')
    expect(nativeTokens.colors.primary[500]).toBe('#3b82f6')
  })

  test('spacing converts correctly', () => {
    expect(webTokens.spacing.md).toBe('1rem')
    expect(nativeTokens.spacing.md).toBe(16)
  })
})
```

## Migration Strategies

### Existing Web Applications

Gradually migrate to Sparkle themes:

```css
/* Phase 1: Use CSS custom properties alongside existing styles */
.legacy-button {
  background: var(--colors-primary-500, #blue); /* Fallback */
  padding: var(--spacing-md, 16px);
}

/* Phase 2: Full Sparkle integration */
.sparkle-button {
  background: var(--colors-primary-500);
  padding: var(--spacing-md);
}
```

### Existing React Native Applications

Migrate StyleSheet objects:

```tsx
// Before: Hard-coded values
const oldStyles = StyleSheet.create({
  button: {
    backgroundColor: '#3b82f6',
    padding: 16,
  }
})

// After: Sparkle tokens
const newStyles = StyleSheet.create({
  button: {
    backgroundColor: tokens.colors.primary[500],
    padding: tokens.spacing.md,
  }
})
```
