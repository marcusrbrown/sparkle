---
title: Testing Strategies
description: Comprehensive testing strategies for error handling, recovery mechanisms, and resilient application development.
---

## Error Testing Philosophy

Effective error testing goes beyond just catching exceptions. It involves systematically testing error conditions, recovery strategies, user experience during failures, and system resilience.

## Types of Error Testing

### Unit Testing Errors

Test individual functions and components for error handling:

```typescript
import { TestScenarioBuilder } from '@sparkle/error-testing'

describe('User Service', () => {
  test('handles invalid user ID gracefully', async () => {
    const userService = new UserService(mockApi)

    const scenario = TestScenarioBuilder
      .create<ValidationError>('Invalid user ID')
      .withErrorType(ValidationError)
      .withSetup(async (context) => {
        context.services.api = {
          getUser: jest.fn().mockRejectedValue(
            new ValidationError('Invalid user ID format', 'userId', 'invalid-123')
          )
        }
      })
      .build()

    await expect(userService.getUser('invalid-123')).rejects.toThrow(ValidationError)
  })
})
```

### Integration Testing

Test error propagation across multiple system components:

```typescript
describe('User Profile Integration', () => {
  test('handles database connection errors', async () => {
    const scenario = TestScenarioBuilder
      .create<DatabaseError>('Database connection failure')
      .withErrorType(DatabaseError)
      .withSetup(async (context) => {
        // Simulate database connection failure
        context.services.database = createMockDatabase({
          connectionError: true
        })
      })
      .withRecovery({
        canHandle: (error): error is DatabaseError => error instanceof DatabaseError,
        handle: async (error, context) => {
          // Should fallback to cache or show appropriate error
          if (error) {
            console.error('Database connection error:', error)
          }
          context.state.useCacheData = true
        }
      })
      .build()

    const result = await scenario.execute({
      state: { useCacheData: false },
      services: {}
    })

    expect(result.recoverySucceeded).toBe(true)
  })
})
```

### End-to-End Error Testing

Test complete user workflows including error scenarios:

```typescript
import { expect, test } from '@playwright/test'

test('user login with network errors', async ({ page }) => {
  // Simulate network failure
  await page.route('**/api/auth/login', route => {
    route.abort('failed')
  })

  await page.goto('/login')
  await page.fill('[data-testid="email"]', 'user@example.com')
  await page.fill('[data-testid="password"]', 'password123')
  await page.click('[data-testid="login-button"]')

  // Should show error message
  await expect(page.locator('[data-testid="error-message"]')).toContainText(
    'Network error. Please check your connection and try again.'
  )

  // Should allow retry
  await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
})
```

## Error Boundary Testing

### React Error Boundary Testing

Test error boundaries catch and handle component errors:

```tsx
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  test('catches and displays error fallback', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    render(
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.queryByText('No error')).not.toBeInTheDocument()

    consoleSpy.mockRestore()
  })

  test('renders children when no error occurs', () => {
    render(
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })
})
```

### Error Boundary with Recovery

Test error boundaries that attempt recovery:

```tsx
class RecoverableErrorBoundary extends React.Component {
  state = { hasError: false, retryCount: 0, error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    // Preserve the error in state so it is explicitly handled by the boundary
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState((prevState: any) => ({
      hasError: false,
      retryCount: prevState.retryCount + 1,
      error: null
    }))
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h2>Something went wrong</h2>
          <button onClick={this.handleRetry}>
            Try again ({3 - this.state.retryCount} attempts left)
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// Test the recovery mechanism
test('error boundary allows retry', async () => {
  let shouldThrow = true
  const ToggleError = () => {
    if (shouldThrow) {
      throw new Error('Recoverable error')
    }
    return <div>Success!</div>
  }

  render(
    <RecoverableErrorBoundary>
      <ToggleError />
    </RecoverableErrorBoundary>
  )

  // Should show error state
  expect(screen.getByText('Something went wrong')).toBeInTheDocument()

  // Simulate recovery
  shouldThrow = false
  fireEvent.click(screen.getByText(/Try again/))

  // Should show success state
  await waitFor(() => {
    expect(screen.getByText('Success!')).toBeInTheDocument()
  })
})
```

## Network Error Testing

### API Error Testing

Test various API error conditions:

```typescript
describe('API Error Handling', () => {
  const mockFetch = jest.fn()
  globalThis.fetch = mockFetch

  beforeEach(() => {
    mockFetch.mockClear()
  })

  test('handles 404 errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'User not found' })
    })

    const scenario = TestScenarioBuilder
      .create<NotFoundError>('User not found')
      .withErrorType(NotFoundError)
      .withRecovery({
        canHandle: (error): error is NotFoundError => error instanceof NotFoundError,
        handle: async (context) => {
          context.state.showNotFoundMessage = true
        }
      })
      .build()

    await expect(fetchUser('nonexistent')).rejects.toThrow(NotFoundError)
  })

  test('handles network timeouts', async () => {
    mockFetch.mockImplementation(() =>
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Network timeout')), 100)
      )
    )

    const scenario = TestScenarioBuilder
      .create<NetworkTimeoutError>('Network timeout')
      .withErrorType(NetworkTimeoutError)
      .withRecovery({
        canHandle: (error): error is NetworkTimeoutError =>
          error instanceof NetworkTimeoutError,
        handle: async (context) => {
          // Implement retry with exponential backoff
          context.state.retryAttempts += 1
          if (context.state.retryAttempts < 3) {
            await new Promise(resolve =>
              setTimeout(resolve, 2**context.state.retryAttempts * 1000)
            )
          }
        }
      })
      .build()

    const context = {
      state: { retryAttempts: 0 },
      services: { api: mockApi }
    }

    const result = await scenario.execute(context)
    expect(result.recoveryAttempted).toBe(true)
  })
})
```

### Offline Testing

Test application behavior when network is unavailable:

```typescript
describe('Offline Behavior', () => {
  test('handles offline state gracefully', async () => {
    // Simulate offline state
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    })

    const scenario = TestScenarioBuilder
      .create<OfflineError>('Application offline')
      .withErrorType(OfflineError)
      .withSetup(async (context) => {
        context.services.networkMonitor = {
          isOnline: () => false,
          onOnline: jest.fn(),
          onOffline: jest.fn()
        }
      })
      .withRecovery({
        canHandle: (error): error is OfflineError => error instanceof OfflineError,
        handle: async (error, context) => {
          // Queue operations for when online
          context.state.pendingOperations.push({
            type: 'api_call',
            payload: error.originalRequest
          })

          // Show offline indicator
          context.state.isOffline = true
        }
      })
      .build()

    const result = await scenario.execute({
      state: { pendingOperations: [], isOffline: false },
      services: {}
    })

    expect(result.recoverySucceeded).toBe(true)
  })
})
```

## Form Validation Testing

### Real-time Validation

Test validation errors as users type:

```tsx
describe('Form Validation', () => {
  test('validates email format in real-time', async () => {
    render(<LoginForm />)

    const emailInput = screen.getByLabelText('Email')

    // Test invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.blur(emailInput)

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    })

    // Test valid email
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } })

    await waitFor(() => {
      expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument()
    })
  })

  test('handles server validation errors', async () => {
    const mockSubmit = jest.fn().mockRejectedValue({
      validationErrors: {
        email: 'Email already exists',
        password: 'Password too weak'
      }
    })

    render(<RegistrationForm onSubmit={mockSubmit} />)

    fireEvent.click(screen.getByRole('button', { name: 'Register' }))

    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeInTheDocument()
      expect(screen.getByText('Password too weak')).toBeInTheDocument()
    })
  })
})
```

### Form Recovery Patterns

Test form state recovery after errors:

```typescript
const formRecoveryScenario = TestScenarioBuilder
  .create<ValidationError, FormState>('Form validation with recovery')
  .withErrorType(ValidationError)
  .withSetup(async (context) => {
    context.state.values = {
      name: 'John Doe',
      email: 'invalid-email',
      password: 'weak'
    }
    context.state.errors = {}
    context.state.touchedFields = new Set()
  })
  .withRecovery({
    canHandle: (error): error is ValidationError => error instanceof ValidationError,
    handle: async (error, context) => {
      // Set field-specific error
      context.state.errors[error.field] = error.message

      // Mark field as touched
      context.state.touchedFields.add(error.field)

      // Keep other valid values
      const validFields = Object.keys(context.state.values).filter(
        field => field !== error.field
      )
      validFields.forEach(field => {
        delete context.state.errors[field]
      })
    }
  })
  .build()
```

## Performance Error Testing

### Memory Leak Testing

Test for memory leaks in error scenarios:

```typescript
describe('Memory Management', () => {
  test('cleans up resources after errors', async () => {
    const resourceTracker = new WeakMap()

    const scenario = TestScenarioBuilder
      .create<OutOfMemoryError>('Memory leak prevention')
      .withErrorType(OutOfMemoryError)
      .withSetup(async (context) => {
        // Allocate resources
        context.services.resources = Array.from({length: 1000}).fill(null).map(() => {
          const resource = { id: Math.random(), data: new ArrayBuffer(1024) }
          resourceTracker.set(resource, true)
          return resource
        })
      })
      .withTeardown(async (context) => {
        // Ensure resources are cleaned up
        context.services.resources?.forEach(resource => {
          if (resourceTracker.has(resource)) {
            resourceTracker.delete(resource)
          }
        })
        context.services.resources = null
      })
      .build()

    await scenario.execute({ state: {}, services: {} })

    // Force garbage collection (if available)
    if (typeof globalThis !== 'undefined' && typeof (globalThis as any).gc === 'function') {
      (globalThis as any).gc()
    }

    // Check that resources were cleaned up
    // In real tests, you might use memory profiling tools
  })
})
```

### Timeout Testing

Test operations that might hang or timeout:

```typescript
describe('Operation Timeouts', () => {
  test('handles slow operations with timeout', async () => {
    const scenario = TestScenarioBuilder
      .create<TimeoutError>('Operation timeout')
      .withErrorType(TimeoutError)
      .withSetup(async (context) => {
        context.services.slowOperation = () =>
          new Promise(resolve => setTimeout(resolve, 10000)) // 10 second operation
      })
      .withRecovery({
        canHandle: (error): error is TimeoutError => error instanceof TimeoutError,
        handle: async (context) => {
          // Cancel ongoing operation and show timeout message
          context.state.operationCancelled = true
          context.state.showTimeoutMessage = true
        }
      })
      .build()

    // Use Jest fake timers for testing
    jest.useFakeTimers()

    const executePromise = scenario.execute({
      state: { operationCancelled: false, showTimeoutMessage: false },
      services: {}
    })

    // Fast-forward past timeout
    jest.advanceTimersByTime(5000)

    const result = await executePromise
    expect(result.recoveryAttempted).toBe(true)

    jest.useRealTimers()
  })
})
```

## Error Reporting and Monitoring

### Error Tracking Integration

Test integration with error tracking services:

```typescript
describe('Error Reporting', () => {
  const mockErrorTracker = {
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    setContext: jest.fn()
  }

  test('reports errors to tracking service', async () => {
    const scenario = TestScenarioBuilder
      .create<ApplicationError>('Error reporting')
      .withErrorType(ApplicationError)
      .withRecovery({
        canHandle: (error): error is ApplicationError => error instanceof ApplicationError,
        handle: async (error, context) => {
          // Report error with context
          context.services.errorTracker.captureException(error, {
            user: context.state.user,
            action: context.state.currentAction,
            timestamp: new Date().toISOString()
          })
        }
      })
      .build()

    const context = {
      state: {
        user: { id: '123', email: 'test@example.com' },
        currentAction: 'user_login'
      },
      services: { errorTracker: mockErrorTracker }
    }

    await scenario.execute(context)

    expect(mockErrorTracker.captureException).toHaveBeenCalledWith(
      expect.any(ApplicationError),
      expect.objectContaining({
        user: context.state.user,
        action: 'user_login'
      })
    )
  })
})
```

## Best Practices

### Error Test Organization

```typescript
// Organize tests by error type and recovery strategy
describe('Error Handling', () => {
  describe('Network Errors', () => {
    describe('Retry Strategy', () => {
      test('retries with exponential backoff')
      test('gives up after max attempts')
      test('succeeds on retry')
    })

    describe('Fallback Strategy', () => {
      test('uses cached data when available')
      test('shows offline message when no cache')
    })
  })

  describe('Validation Errors', () => {
    describe('Field Validation', () => {
      test('shows field-specific errors')
      test('clears errors on valid input')
    })

    describe('Form Validation', () => {
      test('prevents submission with errors')
      test('highlights invalid fields')
    })
  })
})
```

### Error Test Utilities

Create reusable utilities for common error testing patterns:

```typescript
// Utility for creating network error scenarios
export function createNetworkErrorScenario(
  statusCode: number,
  message: string
) {
  return TestScenarioBuilder
    .create<NetworkError>(`Network error ${statusCode}`)
    .withErrorType(NetworkError)
    .withSetup(async (context) => {
      context.services.api = mockApiWithError(statusCode, message)
    })
}

// Utility for creating validation error scenarios
export function createValidationErrorScenario(
  field: string,
  value: unknown,
  message: string
) {
  return TestScenarioBuilder
    .create<ValidationError>(`Validation error for ${field}`)
    .withErrorType(ValidationError)
    .withSetup(async (context) => {
      context.state.formData = { [field]: value }
    })
}
```
