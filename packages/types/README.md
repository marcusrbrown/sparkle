# @sparkle/types

Shared TypeScript type definitions for the Sparkle Design System.

## Overview

This package provides core type definitions used across all Sparkle packages, ensuring type safety and consistency throughout the monorepo.

## Installation

This package is typically used as a dependency of other Sparkle packages and doesn't need to be installed directly in most cases.

```bash
pnpm add @sparkle/types
```

## Usage

Import shared types in your packages:

```typescript
import type { BaseProps, HTMLProperties, ThemeConfig } from '@sparkle/types'

// Use in your component definitions
interface ButtonProps extends HTMLProperties<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}
```

## Exported Types

### Base Types

- `BaseProps` - Common properties for all components
- `HTMLProperties<T>` - Extended HTML element properties with proper type inference

### Theme Types

- `ThemeConfig` - Configuration for theme systems
- `ThemeMode` - Available theme modes (`'light'` | `'dark'` | `'system'`)
- `ThemeTokens` - Design token structure

### Component Types

- Component-specific prop types
- Event handler types
- State management types

## Type Safety

All types in this package follow strict TypeScript conventions:

- No use of `any` types
- Proper generic constraints
- Comprehensive JSDoc documentation
- Exported utility types for common patterns

## Development

```bash
# Build types
pnpm build

# Type check
pnpm typecheck

# Lint code
pnpm lint
```

## Dependencies

This package has minimal dependencies to keep the type footprint small:

- `@types/react` - React type definitions (dev dependency)

## Contributing

When adding new types:

1. Follow existing naming conventions (PascalCase for types, camelCase for utility functions)
2. Add comprehensive JSDoc documentation
3. Export types from the main index file
4. Ensure backward compatibility for public APIs
5. Run type checks before committing: `pnpm typecheck`

## Related Packages

- [`@sparkle/ui`](../ui/README.md) - UI components using these types
- [`@sparkle/theme`](../theme/README.md) - Theme system with type definitions
- [`@sparkle/utils`](../utils/README.md) - Utility functions with type support

## Documentation

For complete documentation, visit [sparkle.mrbro.dev](https://sparkle.mrbro.dev)
