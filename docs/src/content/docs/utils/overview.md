---
title: Utils Overview
description: Utility functions and React hooks provided by Sparkle.
---

Sparkle provides a collection of utility functions and React hooks designed to enhance development productivity and solve common UI development challenges. All utilities are written in TypeScript, provide full type safety, and are optimized for performance.

## 🪝 React Hooks

The `@sparkle/utils` package includes three essential React hooks for managing common UI patterns:

### State Management & Performance

- **`useDebounce`** - Debounce rapidly changing values to optimize performance and reduce API calls
- **`useAsync`** - Manage asynchronous operations with automatic loading, error, and execution state tracking
- **`useClickOutside`** - Detect clicks outside of elements for modals, dropdowns, and other overlay components

## 🔧 String Utilities

Four powerful string manipulation utilities for common text processing needs:

### Text Transformation

- **`toKebabCase`** - Convert strings to kebab-case format (e.g., "HelloWorld" → "hello-world")
- **`toTitleCase`** - Convert strings to title case format (e.g., "hello world" → "Hello World")
- **`truncate`** - Truncate strings to a maximum length with ellipsis
- **`slugify`** - Generate URL-friendly slugs from any text input

## 📦 Installation

```bash
# Install the utils package
pnpm add @sparkle/utils

# Or install the entire Sparkle ecosystem
pnpm add @sparkle/ui @sparkle/utils @sparkle/theme @sparkle/types
```

## 🚀 Quick Start

```tsx
import { slugify, toKebabCase, useAsync, useDebounce } from '@sparkle/utils'

// React Hooks
function SearchComponent() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)
  const [loading, error, search] = useAsync(searchAPI)

  // Use debounced query for API calls
  useEffect(() => {
    if (debouncedQuery) {
      search(debouncedQuery)
    }
  }, [debouncedQuery])

  return <input onChange={(e) => setQuery(e.target.value)} />
}

// String Utilities
const cssClass = toKebabCase('PrimaryButton')  // 'primary-button'
const urlSlug = slugify('Hello World!')        // 'hello-world'
```

## 🎯 Design Philosophy

### Type Safety First

All utilities are written in TypeScript with comprehensive type definitions. Generic types ensure that your data maintains its type safety throughout transformations.

### Performance Optimized

Hooks use React best practices like `useCallback` and `useMemo` to prevent unnecessary re-renders. String utilities are optimized for both small and large text processing tasks.

### Developer Experience

Clear, consistent APIs with detailed JSDoc comments, comprehensive examples, and helpful error messages for better debugging.

## 📚 Detailed Documentation

Explore the comprehensive documentation for each utility category:

- **[React Hooks](react-hooks)** - Complete guide to all React hooks with examples and best practices
- **[String Utilities](string-utilities)** - Detailed documentation for all string manipulation functions

## 🧪 Testing Support

All utilities include comprehensive test suites and are designed to be easily testable in your applications:

```typescript
import { toKebabCase, useDebounce } from '@sparkle/utils'
import { renderHook } from '@testing-library/react'

// String utilities are pure functions - easy to test
test('toKebabCase converts camelCase', () => {
  expect(toKebabCase('camelCase')).toBe('camel-case')
})

// Hooks work with React Testing Library
test('useDebounce delays value updates', () => {
  const { result, rerender } = renderHook(
    ({ value, delay }) => useDebounce(value, delay),
    { initialProps: { value: 'initial', delay: 100 } }
  )
  // Test implementation...
})
```

## 🔗 Integration with Sparkle

These utilities integrate seamlessly with other Sparkle packages:

- **Theme System**: Use string utilities to generate theme-aware CSS classes
- **UI Components**: Hooks power the interactive behavior of Sparkle components
- **Type System**: Full integration with `@sparkle/types` for comprehensive type safety

Ready to get started? Check out our [Installation Guide](../getting-started/installation) or dive into the [React Hooks documentation](react-hooks).
