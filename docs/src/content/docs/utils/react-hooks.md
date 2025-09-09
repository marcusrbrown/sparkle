---
title: React Hooks
description: Collection of custom React hooks provided by Sparkle for common UI patterns and state management.
---

## Overview

Sparkle provides a collection of custom React hooks that solve common UI development challenges. These hooks are designed to be reusable, performant, and type-safe.

## useDebounce

Debounces a rapidly changing value to limit how often it updates.

```typescript
function useDebounce<T>(value: T, delay: number): T
```

### Parameters

- `value: T` - The value to debounce
- `delay: number` - The delay in milliseconds

### Returns

- `T` - The debounced value

### Example

```tsx
import { useDebounce } from '@sparkle/utils'

function SearchInput() {
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  // This effect will only run when the debounced value changes
  useEffect(() => {
    if (debouncedSearchTerm) {
      // Perform search with debounced value
      searchApi(debouncedSearchTerm)
    }
  }, [debouncedSearchTerm])

  return (
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search..."
    />
  )
}
```

### Use Cases

- **Search inputs**: Prevent API calls on every keystroke
- **Form validation**: Delay validation until user stops typing
- **Auto-save**: Reduce frequency of save operations
- **Resize handlers**: Limit window resize event processing

---

## useClickOutside

Detects clicks outside of a specified element and executes a callback function.

```typescript
function useClickOutside<T extends HTMLElement>(
  handler: () => void
): React.RefObject<T | null>
```

### Parameters

- `handler: () => void` - Callback function to execute on outside click

### Returns

- `React.RefObject<T | null>` - Ref to attach to the target element

### Example

```tsx
import { useClickOutside } from '@sparkle/utils'

function Dropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useClickOutside<HTMLDivElement>(() => {
    setIsOpen(false)
  })

  return (
    <div ref={dropdownRef} className="dropdown">
      <button onClick={() => setIsOpen(!isOpen)}>
        Toggle Dropdown
      </button>
      {isOpen && (
        <ul className="dropdown-menu">
          <li>Option 1</li>
          <li>Option 2</li>
          <li>Option 3</li>
        </ul>
      )}
    </div>
  )
}
```

### Use Cases

- **Dropdown menus**: Close when clicking outside
- **Modal dialogs**: Close on backdrop click
- **Tooltip dismissal**: Hide tooltips when clicking elsewhere
- **Context menus**: Close context menus automatically

---

## useAsync

Manages the state of asynchronous operations with loading, error, and execution tracking.

```typescript
function useAsync<T extends (...args: any[]) => Promise<any>>(
  asyncFn: T
): [boolean, Error | null, (...args: Parameters<T>) => Promise<ReturnType<T>>]
```

### Parameters

- `asyncFn: T` - The async function to manage

### Returns

Tuple containing:

- `boolean` - Loading state
- `Error | null` - Error state (null if no error)
- `Function` - Memoized execution function

### Example

```tsx
import { useAsync } from '@sparkle/utils'

async function fetchUser(id: string) {
  const response = await fetch(`/api/users/${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch user')
  }
  return response.json()
}

function UserProfile({ userId }: { userId: string }) {
  const [loading, error, executeAsync] = useAsync(fetchUser)
  const [user, setUser] = useState(null)

  useEffect(() => {
    executeAsync(userId)
      .then(setUser)
      .catch(() => {
        // Error is automatically managed by the hook
        console.log('Error fetching user')
      })
  }, [userId, executeAsync])

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  if (!user) return <div>No user found</div>

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  )
}
```

### Advanced Example with Manual Trigger

```tsx
function CreateUserForm() {
  const [loading, error, createUser] = useAsync(async (userData) => {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    })

    if (!response.ok) {
      throw new Error('Failed to create user')
    }

    return response.json()
  })

  const handleSubmit = async (formData) => {
    try {
      const newUser = await createUser(formData)
      console.log('User created:', newUser)
      // Handle success (e.g., redirect, show success message)
    } catch {
      // Error is handled by the hook
      console.log('User creation failed')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create User'}
      </button>
      {error && (
        <div className="error">
          Error: {error.message}
        </div>
      )}
    </form>
  )
}
```

### Use Cases

- **API requests**: Manage loading and error states for data fetching
- **Form submissions**: Handle async form submission with feedback
- **File uploads**: Track upload progress and handle errors
- **Background operations**: Manage any async operations with state

## Hook Composition Patterns

### Combining Multiple Hooks

```tsx
function SearchableUserList() {
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const [loading, error, searchUsers] = useAsync(fetchUsers)
  const [users, setUsers] = useState([])

  // Search when debounced term changes
  useEffect(() => {
    if (debouncedSearchTerm) {
      searchUsers(debouncedSearchTerm)
        .then(setUsers)
        .catch(() => setUsers([]))
    } else {
      setUsers([])
    }
  }, [debouncedSearchTerm, searchUsers])

  return (
    <div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search users..."
      />

      {loading && <div>Searching...</div>}
      {error && <div>Error: {error.message}</div>}

      <ul>
        {users.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  )
}
```

### Custom Hook Creation

Build custom hooks using Sparkle's utilities:

```tsx
function useModal() {
  const [isOpen, setIsOpen] = useState(false)
  const modalRef = useClickOutside<HTMLDivElement>(() => setIsOpen(false))

  const openModal = useCallback(() => setIsOpen(true), [])
  const closeModal = useCallback(() => setIsOpen(false), [])

  return {
    isOpen,
    openModal,
    closeModal,
    modalRef
  }
}

// Usage
function App() {
  const { isOpen, openModal, closeModal, modalRef } = useModal()

  return (
    <div>
      <button onClick={openModal}>Open Modal</button>
      {isOpen && (
        <div className="modal-overlay">
          <div ref={modalRef} className="modal">
            <h2>Modal Content</h2>
            <button onClick={closeModal}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
```

## Performance Considerations

### useDebounce Optimization

```tsx
// ✅ Good: Stable delay value
const debouncedValue = useDebounce(searchTerm, 500)

// ❌ Avoid: Dynamic delay creates new timers
const debouncedValue = useDebounce(searchTerm, Math.random() * 1000)

// ✅ Good: Extract delay to constant if it needs to be dynamic
const SEARCH_DELAY = useMemo(() =>
  isSlowNetwork ? 1000 : 300,
  [isSlowNetwork]
)
const debouncedValue = useDebounce(searchTerm, SEARCH_DELAY)
```

### useAsync Best Practices

```tsx
// ✅ Good: Memoize async function
const fetchUser = useCallback(async (id) => {
  // async operation
}, [])

const [loading, error, execute] = useAsync(fetchUser)

// ❌ Avoid: Creating new function on every render
const [loading, error, execute] = useAsync(async (id) => {
  // This creates a new function every render
})
```

### useClickOutside Optimization

```tsx
// ✅ Good: Stable handler function
const handleClickOutside = useCallback(() => {
  setIsOpen(false)
}, [])

const ref = useClickOutside(handleClickOutside)

// ❌ Avoid: Inline function creates new handler every render
const ref = useClickOutside(() => setIsOpen(false))
```

## Testing Hooks

### Testing useDebounce

```tsx
import { useDebounce } from '@sparkle/utils'
import { act, renderHook } from '@testing-library/react'

test('useDebounce delays value updates', async () => {
  jest.useFakeTimers()

  const { result, rerender } = renderHook(
    ({ value, delay }) => useDebounce(value, delay),
    { initialProps: { value: 'initial', delay: 500 } }
  )

  expect(result.current).toBe('initial')

  // Update the value
  rerender({ value: 'updated', delay: 500 })

  // Value should not update immediately
  expect(result.current).toBe('initial')

  // Fast-forward time
  act(() => {
    jest.advanceTimersByTime(500)
  })

  // Now value should be updated
  expect(result.current).toBe('updated')

  jest.useRealTimers()
})
```

### Testing useAsync

```tsx
import { useAsync } from '@sparkle/utils'
import { act, renderHook } from '@testing-library/react'

test('useAsync manages loading and error states', async () => {
  const mockAsyncFn = jest.fn()

  const { result } = renderHook(() => useAsync(mockAsyncFn))

  const [initialLoading, initialError, execute] = result.current
  expect(initialLoading).toBe(false)
  expect(initialError).toBe(null)

  // Start async operation
  mockAsyncFn.mockResolvedValueOnce('success')

  await act(async () => {
    await execute('test-arg')
  })

  const [finalLoading, finalError] = result.current
  expect(finalLoading).toBe(false)
  expect(finalError).toBe(null)
  expect(mockAsyncFn).toHaveBeenCalledWith('test-arg')
})
```
