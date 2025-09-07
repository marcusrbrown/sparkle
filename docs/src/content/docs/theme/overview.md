---
title: Theme System Overview
description: Learn about Sparkle's design token system and cross-platform theming capabilities.
---

## Design Token Architecture

Sparkle's theme system is built around design tokens - a unified approach to managing design decisions across platforms. Our token system provides:

- **Cross-platform consistency** between web and React Native
- **Type-safe tokens** with TypeScript definitions
- **Automatic CSS custom properties** generation
- **Dark and light mode** support

## Token Categories

### Colors

Semantic color tokens for consistent branding:

<!-- eslint-disable -->

```typescript
// Primary brand colors
tokens.color.primary.value     // '#3b82f6'
tokens.color.secondary.value   // '#6b7280'

// Semantic colors
tokens.color.success.value     // '#10b981'
tokens.color.warning.value     // '#f59e0b'
tokens.color.error.value       // '#ef4444'
```

### Spacing

Consistent spacing scale for layouts:

<!-- eslint-disable -->

```typescript
// Spacing scale
tokens.spacing.xs.value        // '0.25rem'
tokens.spacing.sm.value        // '0.5rem'
tokens.spacing.md.value        // '1rem'
tokens.spacing.lg.value        // '1.5rem'
tokens.spacing.xl.value        // '2rem'
```

### Typography

Type scale and font definitions:

<!-- eslint-disable -->

```typescript
// Font sizes
tokens.typography.sm.fontSize.value    // '0.875rem'
tokens.typography.base.fontSize.value  // '1rem'
tokens.typography.lg.fontSize.value    // '1.125rem'

// Font weights
tokens.typography.normal.fontWeight.value  // '400'
tokens.typography.medium.fontWeight.value  // '500'
tokens.typography.bold.fontWeight.value    // '700'
```

## Platform-Specific Usage

### Web Applications

```tsx
import { ThemeProvider, useTheme } from '@sparkle/theme'

function App() {
  return (
    <ThemeProvider theme="light">
      <MyComponent />
    </ThemeProvider>
  )
}

function MyComponent() {
  const { tokens } = useTheme()
  return (
    <div style={{
      color: tokens.color.primary.value,
      padding: tokens.spacing.md.value
    }}>
      Themed content
    </div>
  )
}
```

### React Native

```tsx
import { NativeThemeProvider, useNativeTheme } from '@sparkle/theme'

function App() {
  return (
    <NativeThemeProvider theme="dark">
      <MyScreen />
    </NativeThemeProvider>
  )
}

function MyScreen() {
  const { tokens } = useNativeTheme()
  return (
    <View style={{
      backgroundColor: tokens.colorPrimary,
      padding: tokens.spacingMd
    }}>
      <Text>Native themed content</Text>
    </View>
  )
}
```

## Theme Customization

### Custom Theme Creation

```typescript
import { createTheme } from '@sparkle/theme'

const customTheme = createTheme({
  color: {
    primary: { value: '#8b5cf6', type: 'color' },
    secondary: { value: '#ec4899', type: 'color' }
  },
  spacing: {
    xs: { value: '0.125rem', type: 'dimension' }
  }
})
```

### Runtime Theme Switching

```tsx
function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
    >
      Switch to {theme === 'light' ? 'dark' : 'light'} mode
    </Button>
  )
}
```

## CSS Custom Properties

Sparkle automatically generates CSS custom properties for web use:

```css
/* Generated CSS variables */
:root {
  --color-primary: #3b82f6;
  --color-secondary: #6b7280;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
}

[data-theme="dark"] {
  --color-primary: #60a5fa;
  --color-secondary: #9ca3af;
}
```

## Integration with Tailwind CSS

Sparkle tokens integrate seamlessly with Tailwind:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)'
      },
      spacing: {
        'sm': 'var(--spacing-sm)',
        'md': 'var(--spacing-md)'
      }
    }
  }
}
```

## Next Steps

- Learn about [Design Tokens](/theme/design-tokens/)
- Explore [Theme Providers](/theme/providers/)
- See [Customization Guide](/theme/customization/)
