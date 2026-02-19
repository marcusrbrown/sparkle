# @sparkle/utils

Shared utility functions and React hooks for the Sparkle Design System.

## Overview

This package provides reusable utilities and React hooks used across Sparkle packages, promoting code reuse and consistency.

## Installation

```bash
pnpm add @sparkle/utils
```

## Usage

### String Utilities

```typescript
import { capitalize, kebabCase } from '@sparkle/utils/string'

capitalize('hello world') // "Hello world"
kebabCase('HelloWorld') // "hello-world"
```

### React Hooks

```tsx
import { useDebounce, useLocalStorage } from '@sparkle/utils/react'

function SearchComponent() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  // Use debouncedSearch for API calls
}

function ThemeToggle() {
  const [theme, setTheme] = useLocalStorage('theme', 'light')
  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light')

  return <button onClick={toggleTheme}>Toggle Theme</button>
}
```

## Exports

### Main Export (`@sparkle/utils`)

- Core utility functions
- Common helpers used across packages

### String Utilities (`@sparkle/utils/string`)

- `capitalize(str: string): string` - Capitalize first letter
- `kebabCase(str: string): string` - Convert to kebab-case
- `camelCase(str: string): string` - Convert to camelCase
- `pascalCase(str: string): string` - Convert to PascalCase

### React Utilities (`@sparkle/utils/react`)

- `useDebounce<T>(value: T, delay: number): T` - Debounce value changes
- `useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void]` - Persistent state
- `useMediaQuery(query: string): boolean` - Responsive design helper
- `usePrevious<T>(value: T): T | undefined` - Track previous values

## Type Safety

All utilities are fully typed with TypeScript:

```typescript
import type { DebounceOptions } from '@sparkle/utils/react'

// Full type inference and safety
const debouncedValue = useDebounce('search', 300) // Type: string
```

## Development

```bash
# Build package
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint code
pnpm lint
```

## Best Practices

### Use Specific Imports

Import from specific subpaths to enable better tree-shaking:

```typescript
// ❌ Avoid - importing everything
import { capitalize } from '@sparkle/utils'
// ✅ Good - specific import
import { capitalize } from '@sparkle/utils/string'
```

### Type-Safe Hooks

All hooks are designed with TypeScript in mind:

```typescript
// Type is automatically inferred
const [count, setCount] = useLocalStorage('count', 0) // Type: number

// Or explicitly provide types
const [user, setUser] = useLocalStorage<User>('user', null)
```

## Testing

Utilities include comprehensive test coverage:

```bash
# Run tests
pnpm test

# Watch mode
pnpm test --watch

# Coverage report
pnpm test --coverage
```

## Contributing

When adding new utilities:

1. Follow existing naming conventions (camelCase for functions)
2. Add comprehensive JSDoc documentation with examples
3. Include unit tests with good coverage
4. Export from appropriate subpath (string, react, etc.)
5. Ensure functions are pure and side-effect free where possible
6. Run tests before committing: `pnpm test`

## Related Packages

- [`@sparkle/types`](../types/README.md) - Shared TypeScript types
- [`@sparkle/ui`](../ui/README.md) - UI components using these utilities
- [`@sparkle/theme`](../theme/README.md) - Theme system with utility hooks

## Documentation

For complete documentation and interactive examples, visit [sparkle.mrbro.dev](https://sparkle.mrbro.dev)
