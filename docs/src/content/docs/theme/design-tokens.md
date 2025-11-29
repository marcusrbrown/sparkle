---
title: Design Tokens
description: Comprehensive guide to Sparkle's design token system and how to use tokens across platforms.
---

## Token Architecture

Sparkle's design token system follows the [Design Tokens Community Group specification](https://design-tokens.github.io/community-group/) and provides a unified approach to design decisions across web and mobile platforms.

### Token Categories

#### Colors

Color tokens use a numeric scale from 50 (lightest) to 950 (darkest) for consistent color progression:

```typescript
// Primary brand colors
tokens.colors.primary[500]  // Main brand color: '#3b82f6'
tokens.colors.primary[600]  // Darker variant: '#2563eb'
tokens.colors.primary[400]  // Lighter variant: '#60a5fa'

// Secondary colors
tokens.colors.secondary[500]  // Main secondary: '#64748b'
tokens.colors.secondary[600]  // Darker variant: '#475569'

// Semantic colors
tokens.colors.success[500]    // Success green: '#22c55e'
tokens.colors.warning[500]    // Warning amber: '#f59e0b'
tokens.colors.error[500]      // Error red: '#ef4444'
tokens.colors.info[500]       // Info blue: '#06b6d4'
```

#### Spacing

Consistent spacing scale for layouts and components:

```typescript
// Spacing tokens
tokens.spacing.xs     // 0.25rem (4px)
tokens.spacing.sm     // 0.5rem (8px)
tokens.spacing.md     // 1rem (16px)
tokens.spacing.lg     // 1.5rem (24px)
tokens.spacing.xl     // 2rem (32px)
tokens.spacing['2xl'] // 2.5rem (40px)
tokens.spacing['3xl'] // 3rem (48px)
```

#### Typography

Font families, sizes, weights, and line heights:

```typescript
// Font families
tokens.typography.fontFamily.sans     // Inter, system-ui, sans-serif
tokens.typography.fontFamily.mono     // Menlo, Monaco, monospace

// Font sizes
tokens.typography.fontSize.xs         // 0.75rem
tokens.typography.fontSize.sm         // 0.875rem
tokens.typography.fontSize.base       // 1rem
tokens.typography.fontSize.lg         // 1.125rem
tokens.typography.fontSize.xl         // 1.25rem

// Font weights
tokens.typography.fontWeight.normal   // 400
tokens.typography.fontWeight.medium   // 500
tokens.typography.fontWeight.semibold // 600
tokens.typography.fontWeight.bold     // 700
```

#### Border Radius

Consistent border radius values for rounded corners:

```typescript
// Border radius tokens
tokens.borderRadius.none     // 0
tokens.borderRadius.sm       // 0.125rem (2px)
tokens.borderRadius.md       // 0.375rem (6px)
tokens.borderRadius.lg       // 0.5rem (8px)
tokens.borderRadius.xl       // 0.75rem (12px)
tokens.borderRadius.full     // 9999px (circular)
```

#### Shadows

Elevation and depth with consistent shadow system:

```typescript
// Shadow tokens
tokens.shadow.sm    // Subtle shadow for cards
tokens.shadow.md    // Standard component shadow
tokens.shadow.lg    // Elevated elements
tokens.shadow.xl    // High elevation (modals, dropdowns)
```

## Cross-Platform Usage

### Web Implementation

On web platforms, tokens are automatically converted to CSS custom properties:

```css
/* Generated CSS custom properties */
:root {
  --colors-primary-500: #3b82f6;
  --colors-secondary-500: #64748b;
  --spacing-md: 1rem;
  --typography-fontSize-base: 1rem;
}

/* Usage in CSS */
.button {
  background-color: var(--colors-primary-500);
  padding: var(--spacing-md);
  font-size: var(--typography-fontSize-base);
}
```

### React Native Implementation

For React Native, tokens are converted to StyleSheet-compatible values:

```tsx
import { useThemeTokens } from '@sparkle/theme'

function MyComponent() {
  const tokens = useThemeTokens()

  const styles = StyleSheet.create({
    button: {
      backgroundColor: tokens.colors.primary[500], // '#3b82f6'
      padding: tokens.spacing.md,                  // 16
      fontSize: tokens.typography.fontSize.base,   // 16
    }
  })

  return <View style={styles.button} />
}
```

## Theme Variants

### Light and Dark Themes

Sparkle provides built-in light and dark theme variants:

```typescript
// Light theme values
lightTheme.colors.background.primary    // '#ffffff'
lightTheme.colors.text.primary         // '#1f2937'

// Dark theme values
darkTheme.colors.background.primary     // '#1f2937'
darkTheme.colors.text.primary          // '#f9fafb'
```

### Custom Theme Creation

Create custom themes by extending base tokens:

```typescript
import { baseTokens } from '@sparkle/theme'

const customTheme = {
  ...baseTokens,
  colors: {
    ...baseTokens.colors,
    primary: {
      ...baseTokens.colors.primary,
      500: '#8b5cf6', // Custom purple primary
    }
  }
}
```

## Token Usage Patterns

### Component Styling

Use tokens consistently in component styling:

```typescript
// ✅ Good: Using tokens
const buttonStyles = {
  backgroundColor: tokens.colors.primary[500],
  padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
  borderRadius: tokens.borderRadius.md,
  fontSize: tokens.typography.fontSize.base,
}

// ❌ Avoid: Hard-coded values
const buttonStyles = {
  backgroundColor: '#3b82f6',
  padding: '8px 16px',
  borderRadius: '6px',
  fontSize: '16px',
}
```

### Responsive Design

Use spacing tokens for consistent responsive breakpoints:

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

### Color Accessibility

Follow accessibility guidelines when using color tokens:

```typescript
// ✅ Good: Sufficient contrast
const styles = {
  backgroundColor: tokens.colors.primary[500],  // #3b82f6
  color: tokens.colors.white,                   // #ffffff (4.5:1 contrast)
}

// ✅ Good: Semantic color usage
const errorStyles = {
  backgroundColor: tokens.colors.error[50],     // Light red background
  color: tokens.colors.error[800],              // Dark red text
  borderColor: tokens.colors.error[500],        // Medium red border
}
```

## Token Naming Conventions

### Structure

Tokens follow a hierarchical naming structure:

```text
{category}.{property}.{variant}

Examples:
- colors.primary.500
- spacing.md
- typography.fontSize.lg
- borderRadius.xl
```

### Categories

- **colors**: Color values (brand, semantic, neutral)
- **spacing**: Layout spacing and padding values
- **typography**: Font-related properties
- **borderRadius**: Corner radius values
- **shadow**: Elevation and depth effects
- **animation**: Timing and easing functions

### Variants

- **Numeric scale**: 50-950 for colors, xs-3xl for sizes
- **Semantic names**: primary, secondary, success, warning, error
- **Descriptive names**: base, large, small, none, full

## Best Practices

### Token Selection

1. **Use semantic tokens** when the meaning is more important than the specific value
2. **Use scale tokens** when you need specific design control
3. **Prefer design system tokens** over component-specific values
4. **Consider accessibility** when choosing color combinations

### Performance

1. **Use CSS custom properties** for dynamic theming on web
2. **Pre-compute values** for React Native StyleSheet objects
3. **Minimize token transformations** at runtime
4. **Cache compiled theme objects** when possible

### Maintenance

1. **Update tokens centrally** rather than in individual components
2. **Use semantic naming** that survives design changes
3. **Document token relationships** and dependencies
4. **Version token changes** using semantic versioning

## Migration Guide

### From Hard-coded Values

```typescript
// Before: Hard-coded styles
const oldStyles = {
  color: '#1f2937',
  fontSize: '16px',
  padding: '12px 16px',
  borderRadius: '8px',
}

// After: Token-based styles
const newStyles = {
  color: tokens.colors.text.primary,
  fontSize: tokens.typography.fontSize.base,
  padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
  borderRadius: tokens.borderRadius.lg,
}
```

### From CSS Variables

```css
/* Before: Custom CSS variables */
.component {
  background: var(--blue-500);
  padding: var(--space-4);
}

/* After: Sparkle tokens */
.component {
  background: var(--colors-primary-500);
  padding: var(--spacing-md);
}
```
