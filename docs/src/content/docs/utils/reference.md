---
title: Utility Reference
description: Complete API reference for all utilities in the Sparkle Design System Utils package.
---

Complete TypeScript API reference for all utilities provided by `@sparkle/utils`.

## 📱 React Hooks

### useDebounce<T>

Debounces a rapidly changing value to limit how often it updates.

#### useDebounce Signature

```typescript
function useDebounce<T>(value: T, delay: number): T
```

#### useDebounce Generic Parameters

- `T` - The type of the value being debounced

#### useDebounce Parameters

| Parameter | Type     | Description               |
| --------- | -------- | ------------------------- |
| `value`   | `T`      | The value to debounce     |
| `delay`   | `number` | The delay in milliseconds |

#### useDebounce Returns

- `T` - The debounced value

#### useDebounce Implementation Details

- Uses `useState` and `useEffect` internally
- Automatically cleans up timers on unmount
- Updates only after the specified delay period has passed without new values
- Preserves the exact type of the input value

---

### useClickOutside<T>

Detects clicks outside of a specified element and executes a callback function.

#### useClickOutside Signature

```typescript
function useClickOutside<T extends HTMLElement>(
  handler: () => void
): React.RefObject<T | null>
```

#### useClickOutside Generic Parameters

- `T extends HTMLElement` - The type of HTML element to monitor (defaults to `HTMLElement`)

#### useClickOutside Parameters

| Parameter | Type         | Description                                        |
| --------- | ------------ | -------------------------------------------------- |
| `handler` | `() => void` | Callback function to execute when clicking outside |

#### useClickOutside Returns

- `React.RefObject<T \| null>` - A ref object to attach to the target element

#### useClickOutside Implementation Details

- Listens for both `mousedown` and `touchstart` events
- Automatically removes event listeners on cleanup
- Uses `useRef` and `useEffect` for efficient event management
- Checks if the clicked element is contained within the ref element

---

### useAsync<T>

Manages the state of asynchronous operations with loading, error, and execution tracking.

#### useAsync Signature

```typescript
function useAsync<T extends (...args: any[]) => Promise<any>>(
  asyncFn: T
): [boolean, Error | null, (...args: Parameters<T>) => Promise<ReturnType<T>>]
```

#### useAsync Generic Parameters

- `T extends (...args: any[]) => Promise<any>` - The type of the async function

#### useAsync Parameters

| Parameter | Type | Description                  |
| --------- | ---- | ---------------------------- |
| `asyncFn` | `T`  | The async function to manage |

#### useAsync Returns

Tuple containing:

1. `boolean` - Loading state (true when operation is in progress)
2. `Error \| null` - Error state (null if no error occurred)
3. `(...args: Parameters<T>) => Promise<ReturnType<T>>` - Memoized execution function

#### useAsync Implementation Details

- Uses `useState` for loading and error state management
- Uses `useCallback` to memoize the execution function
- Automatically handles error catching and state updates
- Preserves the exact signature and return type of the input function
- Resets error state on new execution attempts

## 🔤 String Utilities

### toKebabCase

Converts a string to kebab-case format (lowercase with hyphens).

#### toKebabCase Signature

```typescript
function toKebabCase(str: string): string
```

#### toKebabCase Parameters

| Parameter | Type     | Description                 |
| --------- | -------- | --------------------------- |
| `str`     | `string` | The input string to convert |

#### toKebabCase Returns

- `string` - The kebab-cased string

#### toKebabCase Implementation Details

- Converts camelCase boundaries to hyphens (e.g., `camelCase` → `camel-case`)
- Replaces spaces and underscores with hyphens
- Converts the entire string to lowercase
- Handles multiple consecutive separators correctly

#### toKebabCase Transformation Rules

| Input Type | Example Input       | Example Output       |
| ---------- | ------------------- | -------------------- |
| camelCase  | `camelCaseString`   | `camel-case-string`  |
| PascalCase | `PascalCaseString`  | `pascal-case-string` |
| snake_case | `snake_case_string` | `snake-case-string`  |
| Spaces     | `Multiple   Spaces` | `multiple-spaces`    |
| Mixed      | `Mixed_Case-String` | `mixed-case-string`  |

---

### truncate

Truncates a string to a specified maximum length and adds ellipsis if needed.

#### truncate Signature

```typescript
function truncate(str: string, maxLength: number): string
```

#### truncate Parameters

| Parameter   | Type     | Description                           |
| ----------- | -------- | ------------------------------------- |
| `str`       | `string` | The input string to truncate          |
| `maxLength` | `number` | The maximum length including ellipsis |

#### truncate Returns

- `string` - The truncated string with ellipsis if needed

#### truncate Implementation Details

- Returns the original string if it's shorter than or equal to `maxLength`
- Subtracts 3 characters from `maxLength` to account for ellipsis (`...`)
- Always preserves the ellipsis length in the final result
- Does not break words (truncates at character level)

#### truncate Examples

| Input           | Max Length | Output          |
| --------------- | ---------- | --------------- |
| `"Hello World"` | `15`       | `"Hello World"` |
| `"Hello World"` | `8`        | `"Hello..."`    |
| `"Hi"`          | `10`       | `"Hi"`          |

---

### slugify

Converts a string to a URL-friendly slug format.

#### slugify Signature

```typescript
function slugify(str: string): string
```

#### slugify Parameters

| Parameter | Type     | Description                 |
| --------- | -------- | --------------------------- |
| `str`     | `string` | The input string to slugify |

#### slugify Returns

- `string` - The URL-friendly slug

#### slugify Implementation Details

- Converts to lowercase
- Removes leading and trailing whitespace
- Removes special characters (keeps only word characters, spaces, and hyphens)
- Replaces spaces, underscores, and multiple hyphens with single hyphens
- Removes leading and trailing hyphens

#### slugify Transformation Rules

| Input              | Output          | Rule Applied                             |
| ------------------ | --------------- | ---------------------------------------- |
| `"Hello World!"`   | `"hello-world"` | Special chars removed, spaces to hyphens |
| `"  JavaScript  "` | `"javascript"`  | Trimmed and lowercased                   |
| `"API & REST"`     | `"api-rest"`    | Special chars removed                    |
| `"Multi---Dash"`   | `"multi-dash"`  | Multiple hyphens collapsed               |

---

### toTitleCase

Converts a string to title case (first letter of each word capitalized).

#### toTitleCase Signature

```typescript
function toTitleCase(str: string): string
```

#### toTitleCase Parameters

| Parameter | Type     | Description                 |
| --------- | -------- | --------------------------- |
| `str`     | `string` | The input string to convert |

#### toTitleCase Returns

- `string` - The title-cased string

#### toTitleCase Implementation Details

- Converts the entire string to lowercase first
- Splits on spaces to identify words
- Capitalizes the first character of each word
- Preserves the spacing between words
- Does not handle complex title case rules (articles, prepositions, etc.)

#### toTitleCase Examples

| Input                    | Output                   |
| ------------------------ | ------------------------ |
| `"hello world"`          | `"Hello World"`          |
| `"JAVASCRIPT DEVELOPER"` | `"Javascript Developer"` |
| `"mixed CaSe text"`      | `"Mixed Case Text"`      |

## 🔍 Type Information

### Hook Return Types

```typescript
// useDebounce
type UseDebouncedValue<T> = T

// useClickOutside
type UseClickOutsideReturn<T extends HTMLElement> = React.RefObject<T | null>

// useAsync
type UseAsyncReturn<T extends (...args: any[]) => Promise<any>> = [
  boolean,                                              // loading
  Error | null,                                        // error
  (...args: Parameters<T>) => Promise<ReturnType<T>>   // execute
]
```

### Utility Function Types

```typescript
// String utilities
type StringTransformer = (str: string) => string
type StringTruncator = (str: string, maxLength: number) => string

// All string utilities follow the StringTransformer pattern except truncate
type ToKebabCase = StringTransformer
type Slugify = StringTransformer
type ToTitleCase = StringTransformer
type Truncate = StringTruncator
```

## 🧪 Testing Types

All utilities can be tested using standard TypeScript testing patterns:

```typescript
import type { expectTypeOf } from 'vitest'
import { toKebabCase, useDebounce } from '@sparkle/utils'

// String utilities are pure functions with predictable types
expectTypeOf(toKebabCase).toEqualTypeOf<(str: string) => string>()

// Hooks maintain generic type safety
expectTypeOf(useDebounce<string>).toEqualTypeOf<(value: string, delay: number) => string>()
expectTypeOf(useDebounce<number>).toEqualTypeOf<(value: number, delay: number) => number>()
```

## 📦 Package Exports

The `@sparkle/utils` package exports all utilities through named exports:

```typescript
// All available exports
export {
  slugify,
  toKebabCase,
  toTitleCase,
  truncate,
  useAsync,
  useClickOutside,
  useDebounce
} from '@sparkle/utils'
```

## 💡 Advanced Usage Patterns

### Type-Safe Hook Composition

```typescript
import { useAsync, useDebounce } from '@sparkle/utils'

// Compose hooks with full type safety
function useAsyncSearch(
  searchFn: (query: string) => Promise<SearchResult[]>,
  delay = 300
) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, delay)
  const [loading, error, search] = useAsync(searchFn)

  useEffect(() => {
    if (debouncedQuery) {
      search(debouncedQuery)
    }
  }, [debouncedQuery, search])

  return { query, setQuery, loading, error }
}
```

### String Utility Composition

```typescript
import { slugify, toKebabCase, truncate } from '@sparkle/utils'

// Create specialized utility functions
const createUrlSlug = (title: string, maxLength = 50): string =>
  truncate(slugify(title), maxLength)

const createCssClass = (component: string, variant?: string): string =>
  variant ? `${toKebabCase(component)} ${toKebabCase(component)}--${toKebabCase(variant)}` : toKebabCase(component)
```
