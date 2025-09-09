---
title: Theme Customization
description: Learn how to customize and extend Sparkle's theme system for your brand and design requirements.
---

## Custom Theme Creation

Sparkle's theme system is designed to be easily customizable while maintaining consistency and accessibility.

### Creating a Custom Theme

Start by extending the base tokens with your brand colors and design decisions:

```typescript
import { baseTokens, createTheme } from '@sparkle/theme'

const myCustomTheme = createTheme({
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
      500: '#0ea5e9', // Your brand blue
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
      950: '#082f49',
    },
    // Add custom semantic colors
    brand: {
      light: '#e0f2fe',
      main: '#0ea5e9',
      dark: '#0369a1',
    }
  },
  spacing: {
    ...baseTokens.spacing,
    // Add custom spacing values
    '4xl': '4rem',
    '5xl': '5rem',
  }
})
```

### Theme Provider Setup

#### Web Application

```tsx
import { ThemeProvider } from '@sparkle/theme'
import { myCustomTheme } from './theme'

function App() {
  return (
    <ThemeProvider theme={myCustomTheme}>
      <YourAppContent />
    </ThemeProvider>
  )
}
```

#### React Native Application

```tsx
import { NativeThemeProvider } from '@sparkle/theme'
import { myCustomTheme } from './theme'

function App() {
  return (
    <NativeThemeProvider theme={myCustomTheme}>
      <YourAppContent />
    </NativeThemeProvider>
  )
}
```

## Theme Modes

### Light and Dark Mode Support

Sparkle automatically handles light and dark mode variations:

```tsx
import { useTheme } from '@sparkle/theme'

function ThemedComponent() {
  const { theme, mode, setMode } = useTheme()

  // Access current theme values
  const backgroundColor = theme.colors.background.primary
  const textColor = theme.colors.text.primary

  // Toggle theme mode
  const toggleMode = () => {
    setMode(mode === 'light' ? 'dark' : 'light')
  }

  return (
    <div style={{ backgroundColor, color: textColor }}>
      <button onClick={toggleMode}>
        Switch to {mode === 'light' ? 'dark' : 'light'} mode
      </button>
    </div>
  )
}
```

### System Preference Detection

Automatically detect user's system color scheme preference:

```tsx
import { useSystemColorScheme } from '@sparkle/theme'

function App() {
  const systemScheme = useSystemColorScheme()

  return (
    <ThemeProvider mode={systemScheme}>
      <YourAppContent />
    </ThemeProvider>
  )
}
```

## Advanced Customization

### Component-Specific Themes

Create themed variants for specific components:

```typescript
const buttonTheme = {
  variants: {
    primary: {
      backgroundColor: 'var(--colors-primary-500)',
      color: 'var(--colors-white)',
      borderColor: 'var(--colors-primary-500)',
    },
    secondary: {
      backgroundColor: 'var(--colors-secondary-100)',
      color: 'var(--colors-secondary-900)',
      borderColor: 'var(--colors-secondary-300)',
    },
    danger: {
      backgroundColor: 'var(--colors-error-500)',
      color: 'var(--colors-white)',
      borderColor: 'var(--colors-error-500)',
    }
  },
  sizes: {
    sm: {
      padding: 'var(--spacing-xs) var(--spacing-sm)',
      fontSize: 'var(--typography-fontSize-sm)',
    },
    md: {
      padding: 'var(--spacing-sm) var(--spacing-md)',
      fontSize: 'var(--typography-fontSize-base)',
    },
    lg: {
      padding: 'var(--spacing-md) var(--spacing-lg)',
      fontSize: 'var(--typography-fontSize-lg)',
    }
  }
}
```

### Dynamic Theme Switching

Implement dynamic theme switching with persistence:

```tsx
import { useTheme, useThemePersistence } from '@sparkle/theme'

function ThemeSwitcher() {
  const { mode, setMode } = useTheme()

  // Persist theme preference
  useThemePersistence('theme-preference')

  const themes = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' }
  ]

  return (
    <select
      value={mode}
      onChange={(e) => setMode(e.target.value)}
    >
      {themes.map(theme => (
        <option key={theme.value} value={theme.value}>
          {theme.label}
        </option>
      ))}
    </select>
  )
}
```

## CSS Integration

### CSS Custom Properties

Sparkle automatically generates CSS custom properties for all tokens:

```css
/* Available CSS custom properties */
:root {
  /* Colors */
  --colors-primary-50: #eff6ff;
  --colors-primary-500: #3b82f6;
  --colors-primary-950: #172554;

  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;

  /* Typography */
  --typography-fontSize-base: 1rem;
  --typography-fontWeight-medium: 500;
}

/* Dark mode overrides */
[data-theme="dark"] {
  --colors-background-primary: #1f2937;
  --colors-text-primary: #f9fafb;
}
```

### Tailwind CSS Integration

Use Sparkle tokens with Tailwind CSS:

```javascript
// tailwind.config.js
const { createTailwindTheme } = require('@sparkle/theme')

module.exports = {
  theme: {
    extend: createTailwindTheme()
  }
}
```

```html
<!-- Use tokens via Tailwind classes -->
<div class="bg-primary-500 text-white p-md rounded-lg">
  Themed with Sparkle tokens
</div>
```

## Responsive Theming

### Breakpoint-Aware Tokens

Define responsive token variations:

```typescript
const responsiveTheme = {
  spacing: {
    container: {
      mobile: '1rem',
      tablet: '2rem',
      desktop: '3rem',
    }
  },
  typography: {
    fontSize: {
      heading: {
        mobile: '1.5rem',
        tablet: '2rem',
        desktop: '2.5rem',
      }
    }
  }
}
```

### Media Query Integration

Use responsive tokens in CSS:

```css
.container {
  padding: var(--spacing-container-mobile);
}

@media (min-width: 768px) {
  .container {
    padding: var(--spacing-container-tablet);
  }
}

@media (min-width: 1024px) {
  .container {
    padding: var(--spacing-container-desktop);
  }
}
```

## Theme Validation

### Runtime Validation

Validate theme configuration at runtime:

```typescript
import { validateTheme } from '@sparkle/theme'

const customTheme = {
  colors: {
    primary: { 500: '#3b82f6' }
  }
}

try {
  const validatedTheme = validateTheme(customTheme)
  console.log('Theme is valid:', validatedTheme)
} catch (error) {
  console.error('Theme validation failed:', error.message)
}
```

### TypeScript Integration

Get full TypeScript support for your custom themes:

```typescript
import type { ThemeConfig } from '@sparkle/theme'

// TypeScript will validate your theme structure
const myTheme: ThemeConfig = {
  colors: {
    primary: {
      500: '#3b82f6' // TypeScript ensures this follows the correct structure
    }
  }
}
```

## Performance Optimization

### Theme Precompilation

Precompile themes for better performance:

```tsx
import { compileTheme } from '@sparkle/theme'

// Build time
const compiledTheme = compileTheme(myCustomTheme)

// Runtime - use compiled theme
const App = () => (
  <ThemeProvider theme={compiledTheme}>
    <App />
  </ThemeProvider>
)
```

### Lazy Theme Loading

Load themes on demand for better initial load performance:

```tsx
import { lazy } from 'react'

const LazyThemedComponent = lazy(async () => {
  const { darkTheme } = await import('./themes/dark')
  return { default: () => <ThemedComponent theme={darkTheme} /> }
})
```

## Best Practices

### Token Organization

1. **Group related tokens** together (colors, spacing, typography)
2. **Use consistent naming** across all token categories
3. **Define semantic tokens** for common use cases
4. **Document token relationships** and dependencies

### Performance

1. **Minimize runtime calculations** by precompiling themes
2. **Use CSS custom properties** for dynamic values on web
3. **Cache compiled themes** to avoid repeated processing
4. **Lazy load** theme variants when not immediately needed

### Accessibility

1. **Ensure sufficient contrast** ratios for all color combinations
2. **Test themes** with accessibility tools and screen readers
3. **Provide high contrast** alternatives when needed
4. **Consider motion preferences** in animation tokens

### Maintenance

1. **Version theme changes** using semantic versioning
2. **Document breaking changes** and migration paths
3. **Test themes** across all supported platforms
4. **Maintain backwards compatibility** when possible
