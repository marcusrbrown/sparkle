---
title: Troubleshooting & Best Practices
description: Common issues, debugging strategies, performance optimization, and development best practices for Sparkle's theme system.
---

## Overview

This guide covers common issues you might encounter with Sparkle's theme system, debugging strategies, performance optimization techniques, and development best practices.

## Related Pages

- [Theme Overview](./overview) - Introduction to Sparkle's theme system
- [Theme Providers](./providers) - Provider setup and configuration
- [Token Transformation](./token-transformation) - Cross-platform token conversion
- [Complete Workflow](./workflow) - End-to-end implementation guide
- [Advanced Customization](./advanced) - Enterprise patterns and custom solutions

## Common Issues & Solutions

### Theme Provider Issues

#### Issue: Theme context is `undefined`

**Symptoms:**

```typescript
// Error: Cannot read property 'theme' of undefined
const {theme} = useTheme()
```

**Causes & Solutions:**

1. **Missing ThemeProvider wrapper**:

   ```tsx
   // ❌ Bad: No ThemeProvider
   function App() {
     return <MyComponent />
   }

   // ✅ Good: Proper ThemeProvider setup
   function App() {
     return (
       <ThemeProvider>
         <MyComponent />
       </ThemeProvider>
     )
   }
   ```

2. **Using hook outside provider scope**:

   ```tsx
   // ❌ Bad: Hook used outside provider
   function App() {
     const {theme} = useTheme() // Error!
     return (
       <ThemeProvider>
         <MyComponent />
       </ThemeProvider>
     )
   }

   // ✅ Good: Hook used inside provider
   function App() {
     return (
       <ThemeProvider>
         <MyComponent /> {/* useTheme() works here */}
       </ThemeProvider>
     )
   }
   ```

3. **Multiple providers creating scope issues**:

   ```tsx
   // ❌ Bad: Nested providers can cause confusion
   <ThemeProvider theme="light">
     <SomeComponent />
     <ThemeProvider theme="dark"> {/* Creates separate context */}
       <AnotherComponent />
     </ThemeProvider>
   </ThemeProvider>

   // ✅ Good: Single provider with dynamic theme switching
   function App() {
     const [theme, setTheme] = useState('light')
     return (
       <ThemeProvider theme={theme}>
         <SomeComponent />
         <AnotherComponent />
       </ThemeProvider>
     )
   }
   ```

#### Issue: Platform-specific provider errors

**React Native: "undefined is not an object"**

```tsx
// ❌ Bad: Using web ThemeProvider in React Native
import {ThemeProvider} from '@sparkle/theme'
// ✅ Good: Use platform-specific provider
import {NativeThemeProvider} from '@sparkle/theme'

function App() {
  return (
    <NativeThemeProvider>
      <MyNativeComponent />
    </NativeThemeProvider>
  )
}
```

### Token Transformation Issues

#### Issue: Tokens not updating after transformation

**Cause:** Transform cache not invalidated

```typescript
// ❌ Bad: Cached result not updated
const transformer = new TokenTransformer()
const webTokens = transformer.toWeb(tokens) // Cached
// ... tokens modified ...
const updatedTokens = transformer.toWeb(tokens) // Still cached!

// ✅ Good: Clear cache or disable caching
const transformer = new TokenTransformer({enableCache: false})
// OR
transformer.clearCache()
const updatedTokens = transformer.toWeb(tokens)
```

#### Issue: Performance degradation with large token sets

**Debugging transformation performance:**

```typescript
// Add performance monitoring
const transformer = new TokenTransformer({
  enableCache: true,
  debug: true, // Enables performance logging
})

console.time('Token transformation')
const result = transformer.toWeb(largeTokenSet)
console.timeEnd('Token transformation')

// Check cache effectiveness
console.log('Cache stats:', transformer.getCacheStats())
```

**Optimization strategies:**

```typescript
// 1. Use caching for repeated transformations
const transformer = new TokenTransformer({
  enableCache: true,
  maxCacheSize: 100, // Limit cache size
})

// 2. Transform only necessary tokens
const minimalTokens = {
  colors: fullTokens.colors,
  spacing: fullTokens.spacing,
  // Don't include unused token categories
}

// 3. Use batch transformation for multiple themes
const themes = ['light', 'dark', 'highContrast']
const transformedThemes = transformer.batchTransform(themes, baseTokens)
```

### CSS Custom Properties Issues

#### Issue: CSS variables not updating

**Browser debugging steps:**

1. **Check DevTools Elements panel**:

   ```css
   /* Should see variables in :root */
   :root {
     --color-primary: #3b82f6;
     --spacing-md: 1rem;
   }
   ```

2. **Verify theme application**:

   ```css
   /* Check if theme classes are applied */
   [data-theme="dark"] {
     --color-primary: #60a5fa;
   }
   ```

3. **Test variable resolution**:
   ```css
   /* Test in DevTools console */
   getComputedStyle(document.documentElement).getPropertyValue('--color-primary')
   ```

**Common solutions:**

```typescript
// ✅ Ensure CSS is injected properly
import '@sparkle/ui/styles.css'

// ✅ Force theme update
const {setTheme} = useTheme()
setTheme('dark') // Should trigger CSS variable updates
```

```css
// ✅ Check for CSS specificity issues
.my-component {
  /* Use !important if needed for debugging */
  color: var(--color-primary) !important;
}
```

#### Issue: SSR hydration mismatches

**Symptoms:** Different themes rendered on server vs client

```tsx
// ❌ Bad: No SSR handling
function App() {
  return (
    <ThemeProvider theme="system"> {/* 'system' not available on server */}
      <MyComponent />
    </ThemeProvider>
  )
}

// ✅ Good: SSR-safe theme setup
function App() {
  return (
    <ThemeProvider
      theme="light"
      enableSystem={false} // Disable system detection on SSR
      disableTransitionOnChange // Prevent flash during hydration
    >
      <MyComponent />
    </ThemeProvider>
  )
}

// ✅ Better: Client-side theme detection
function App() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <ThemeProvider theme="light">
        <MyComponent />
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider theme="system">
      <MyComponent />
    </ThemeProvider>
  )
}
```

### TypeScript Issues

#### Issue: Theme token types not recognized

**Symptoms:**

```typescript
// Error: Property 'primary' does not exist on type 'Colors'
const primaryColor = theme.colors.primary[500]
```

**Solutions:**

1. **Ensure proper type imports**:

   ```typescript
   import type {ThemeConfig} from '@sparkle/types'
   ```

2. **Extend theme types for custom tokens**:

   ```typescript
   // types/theme.d.ts
   declare module '@sparkle/types' {
     interface Colors {
       brand: {
         50: string
         100: string
         500: string
         900: string
       }
     }
   }
   ```

3. **Use type assertions for dynamic tokens**:
   ```typescript
   const customColor = (theme.colors as any).customColor?.[500] || '#fallback'
   ```

## Performance Optimization

### Theme Transformation Performance

#### Optimize Token Structure

```typescript
// ❌ Bad: Deeply nested tokens slow transformation
const inefficientTokens = {
  components: {
    button: {
      variants: {
        primary: {
          states: {
            default: {
              background: {
                color: {
                  value: '#3b82f6'
                }
              }
            }
          }
        }
      }
    }
  }
}

// ✅ Good: Flatter structure for better performance
const efficientTokens = {
  colors: {
    buttonPrimary: '#3b82f6',
    buttonSecondary: '#6b7280',
  },
  components: {
    button: {
      primary: 'var(--color-button-primary)',
      secondary: 'var(--color-button-secondary)',
    }
  }
}
```

#### Cache Strategy

```typescript
// Create singleton transformer instance
// Use memoization for expensive operations
import {useMemo} from 'react'

export const globalTransformer = new TokenTransformer({
  enableCache: true,
  maxCacheSize: 50, // Reasonable cache size
})

function useTransformedTokens(tokens: ThemeConfig) {
  return useMemo(() => {
    return globalTransformer.toWeb(tokens)
  }, [tokens])
}
```

### Component Performance

#### Avoid Unnecessary Re-renders

```tsx
// ❌ Bad: Creates new object on every render
function MyComponent() {
  const {theme} = useTheme()
  const styles = {
    color: theme.colors.primary[500],
    padding: theme.spacing.md,
  }
  return <div style={styles}>Content</div>
}

// ✅ Good: Memoized styles
function MyComponent() {
  const {theme} = useTheme()
  const styles = useMemo(() => ({
    color: theme.colors.primary[500],
    padding: theme.spacing.md,
  }), [theme.colors.primary, theme.spacing.md])

  return <div style={styles}>Content</div>
}

// ✅ Better: CSS-in-JS with static classes
function MyComponent() {
  return <div className="text-primary p-md">Content</div>
}
```

#### Optimize Theme Context

```typescript
// ❌ Bad: Large context object causes unnecessary re-renders
const ThemeContext = createContext({
  theme: fullThemeObject, // Huge object
  setTheme: () => {},
  allTokens: [], // Rarely used
  transformedTokens: {}, // Heavy computation
})

// ✅ Good: Split context by usage patterns
const ThemeContext = createContext({
  theme: currentTheme,
  setTheme: () => {},
})

const TokenContext = createContext({
  tokens: transformedTokens,
})

// Use separate hooks
function useTheme() {
  return useContext(ThemeContext)
}

function useTokens() {
  return useContext(TokenContext)
}
```

### Bundle Size Optimization

#### Tree Shaking

```typescript
// ❌ Bad: Imports entire theme package
import * as theme from '@sparkle/theme'
// ✅ Good: Import only what you need
import {TokenTransformer} from '@sparkle/theme'
import {useTheme} from '@sparkle/theme/hooks'
```

#### Lazy Loading

```typescript
// Lazy load platform-specific transformers
const PlatformTransformer = lazy(() =>
  import('@sparkle/theme/transformers/platform')
)

// Conditional imports
const transformer = process.env.NODE_ENV === 'development'
  ? await import('@sparkle/theme/debug')
  : await import('@sparkle/theme/production')
```

## Development Best Practices

### Theme Definition

#### Organize Tokens Logically

```typescript
// ✅ Good: Organized by purpose and scale
export const designTokens = {
  // Primitive tokens (design decisions)
  colors: {
    blue: {
      50: '#eff6ff',
      500: '#3b82f6',
      900: '#1e3a8a',
    },
  },

  // Semantic tokens (usage-based)
  semantic: {
    colors: {
      primary: 'var(--color-blue-500)',
      background: 'var(--color-blue-50)',
      text: 'var(--color-blue-900)',
    },
  },

  // Component tokens (specific usage)
  components: {
    button: {
      background: 'var(--semantic-color-primary)',
      text: 'var(--semantic-color-text)',
    },
  },
}
```

#### Use Consistent Naming

```typescript
// ✅ Good: Consistent naming convention
const tokens = {
  colors: {
    // Scale-based naming
    primary: {50: '...', 100: '...', 500: '...', 900: '...'},
    secondary: {50: '...', 100: '...', 500: '...', 900: '...'},

    // Semantic naming
    text: {
      primary: '...',
      secondary: '...',
      disabled: '...',
    },

    // State-based naming
    success: {light: '...', DEFAULT: '...', dark: '...'},
    error: {light: '...', DEFAULT: '...', dark: '...'},
  },

  spacing: {
    // T-shirt sizing
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
}
```

### Testing Strategies

#### Theme Testing

```tsx
// Test theme transformations
describe('TokenTransformer', () => {
  test('transforms tokens correctly', () => {
    const transformer = new TokenTransformer()
    const result = transformer.toWeb(mockTokens)

    expect(result).toEqual({
      '--color-primary': '#3b82f6',
      '--spacing-md': '1rem',
    })
  })

  test('handles cache correctly', () => {
    const transformer = new TokenTransformer({enableCache: true})
    const firstCall = transformer.toWeb(mockTokens)
    const secondCall = transformer.toWeb(mockTokens)

    expect(firstCall).toBe(secondCall) // Same reference due to cache
  })
})

// Test theme context
describe('ThemeProvider', () => {
  test('provides theme context', () => {
    const TestComponent = () => {
      const {theme} = useTheme()
      return <div data-testid="theme">{theme}</div>
    }

    render(
      <ThemeProvider theme="dark">
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
  })
})
```

#### Visual Testing

```tsx
// Storybook story for theme testing
export const ThemeComparison = () => {
  const themes = ['light', 'dark', 'highContrast']

  return (
    <div style={{display: 'flex', gap: '1rem'}}>
      {themes.map(theme => (
        <div key={theme} data-theme={theme}>
          <h3>{theme}</h3>
          <Button variant="primary">Primary Button</Button>
          <Button variant="secondary">Secondary Button</Button>
        </div>
      ))}
    </div>
  )
}

// Chromatic visual testing
export default {
  title: 'Themes/Comparison',
  component: ThemeComparison,
  parameters: {
    chromatic: {
      // Test multiple themes
      modes: {
        light: {theme: 'light'},
        dark: {theme: 'dark'},
      }
    }
  }
}
```

### Documentation Standards

#### Document Token Purpose

````typescript
/**
 * Primary color palette for brand consistency.
 * Used for primary actions, links, and brand elements.
 *
 * @example
 * ```tsx
 * <Button style={{backgroundColor: 'var(--color-primary-500)'}}>
 *   Primary Action
 * </Button>
 * ```
 */
export const primaryColors = {
  50: '#eff6ff',
  100: '#dbeafe',
  500: '#3b82f6', // Brand primary
  600: '#2563eb', // Hover state
  900: '#1e3a8a',
}
````

#### Provide Usage Examples

````typescript
/**
 * Semantic spacing tokens for consistent layout.
 *
 * @example Layout spacing
 * ```tsx
 * <div style={{
 *   padding: 'var(--spacing-md)',
 *   margin: 'var(--spacing-lg)',
 * }}>
 *   Content with consistent spacing
 * </div>
 * ```
 *
 * @example Component spacing
 * ```tsx
 * <Button style={{
 *   paddingInline: 'var(--spacing-lg)',
 *   paddingBlock: 'var(--spacing-sm)',
 * }}>
 *   Well-spaced button
 * </Button>
 * ```
 */
export const spacing = {
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
}
````

## Debugging Techniques

### Theme Inspector

```typescript
// Debug utility for theme inspection
export function createThemeInspector() {
  if (process.env.NODE_ENV !== 'development') {
    return () => {} // No-op in production
  }

  return {
    logCurrentTheme() {
      const root = document.documentElement
      const theme = root.dataset.theme
      const computedStyles = getComputedStyle(root)

      console.group(`🎨 Current Theme: ${theme}`)

      // Log all CSS custom properties
      const cssVars = {}
      for (const property of computedStyles) {
        if (property.startsWith('--')) {
          cssVars[property] = computedStyles.getPropertyValue(property)
        }
      }

      console.table(cssVars)
      console.groupEnd()
    },

    visualizeTokens(tokens: ThemeConfig) {
      console.group('🎯 Token Structure')
      console.log('Colors:', tokens.colors)
      console.log('Spacing:', tokens.spacing)
      console.log('Typography:', tokens.typography)
      console.groupEnd()
    },

    compareThemes(theme1: ThemeConfig, theme2: ThemeConfig) {
      const differences = []

      function compare(obj1: any, obj2: any, path = '') {
        Object.keys(obj1).forEach(key => {
          const currentPath = path ? `${path}.${key}` : key

          if (obj1[key] !== obj2[key]) {
            differences.push({
              path: currentPath,
              theme1: obj1[key],
              theme2: obj2[key],
            })
          }
        })
      }

      compare(theme1, theme2)
      console.table(differences)
    }
  }
}

// Usage in development
const themeInspector = createThemeInspector()
themeInspector.logCurrentTheme()
```

### Performance Profiling

```tsx
// Performance monitoring hook
export function useThemePerformance() {
  const {theme} = useTheme()
  const [stats, setStats] = useState<{
    renderCount: number
    lastRenderTime: number
    averageRenderTime: number
  }>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
  })

  useEffect(() => {
    const start = performance.now()

    return () => {
      const end = performance.now()
      const renderTime = end - start

      setStats(prev => ({
        renderCount: prev.renderCount + 1,
        lastRenderTime: renderTime,
        averageRenderTime: (prev.averageRenderTime * prev.renderCount + renderTime) / (prev.renderCount + 1),
      }))
    }
  }, [theme])

  return stats
}

// Component usage
function MyComponent() {
  const stats = useThemePerformance()

  if (process.env.NODE_ENV === 'development') {
    console.log('Theme render stats:', stats)
  }

  return <div>Component content</div>
}
```

This troubleshooting guide provides comprehensive coverage of common issues, performance optimization strategies, development best practices, and debugging techniques for Sparkle's theme system.
