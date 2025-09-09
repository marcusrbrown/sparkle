---
title: Test Builder Patterns
description: Learn how to use Sparkle's error testing framework for creating type-safe error scenarios and recovery strategies.
---

## Overview

Sparkle's error testing framework provides a fluent builder pattern for creating type-safe error test scenarios. It helps you systematically test error conditions, recovery strategies, and error boundaries in your applications.

## TestScenarioBuilder

The core class for building error test scenarios with type safety and fluent API.

### Basic Usage

```typescript
import { TestScenarioBuilder } from '@sparkle/error-testing'

// Create a simple error test scenario
const scenario = TestScenarioBuilder
  .create<TypeError>('Should handle type errors gracefully')
  .withErrorType(TypeError)
  .build()
```

### Complete Builder Pattern

```typescript
import { TestScenarioBuilder } from '@sparkle/error-testing'

interface AppState {
  user: User | null
  loading: boolean
}

const scenario = TestScenarioBuilder
  .create<NetworkError, AppState>('Network error during user fetch')
  .withErrorType(NetworkError)
  .withSetup(async (context) => {
    context.state.loading = true
    context.services.api = mockApiService
  })
  .withRecovery({
    canHandle: (error): error is NetworkError => error instanceof NetworkError,
    handle: async (context) => {
      context.state.loading = false
      context.state.user = null
      // Retry logic or fallback behavior
    }
  })
  .withTeardown(async (context) => {
    context.state.loading = false
  })
  .build()
```

## Core Types

### TestContext

Provides type-safe context for test scenarios:

```typescript
interface TestContext<TState = unknown> {
  state: TState
  services: Record<string, unknown>
}
```

### ErrorRecoveryStrategy

Defines how to handle specific error types:

```typescript
interface ErrorRecoveryStrategy<TError extends Error = Error, TState = unknown> {
  readonly canHandle: (error: Error) => error is TError
  readonly handle: (error: TError, context: TestContext<TState>) => Promise<void>
}
```

### TestResult

Contains the results of test execution:

```typescript
interface TestResult<TError extends Error = Error> {
  success: boolean
  error?: TError
  recoveryAttempted: boolean
  recoverySucceeded?: boolean
}
```

## Error Types and Recovery

### Custom Error Types

Define specific error types for your application:

```typescript
class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: unknown
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

class NetworkError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public endpoint: string
  ) {
    super(message)
    this.name = 'NetworkError'
  }
}

class AuthenticationError extends Error {
  constructor(message = 'Authentication failed') {
    super(message)
    this.name = 'AuthenticationError'
  }
}
```

### Recovery Strategies

Implement recovery strategies for different error types:

```typescript
// Network error recovery with retry logic
const networkRecovery: ErrorRecoveryStrategy<NetworkError, AppState> = {
  canHandle: (error): error is NetworkError => error instanceof NetworkError,
  handle: async (error, context) => {
    if (error.statusCode >= 500) {
      // Retry for server errors
      await retryWithBackoff(() => context.services.api.retry())
    } else if (error.statusCode === 401) {
      // Redirect to login for auth errors
      context.services.router.navigate('/login')
    } else {
      // Show user-friendly error message
      context.services.notifications.show({
        type: 'error',
        message: 'Network request failed. Please try again.'
      })
    }
  }
}

// Validation error recovery
const validationRecovery: ErrorRecoveryStrategy<ValidationError, FormState> = {
  canHandle: (error): error is ValidationError => error instanceof ValidationError,
  handle: async (error, context) => {
    // Set field-specific error message
    context.state.errors[error.field] = error.message
    context.state.isValid = false

    // Focus the problematic field
    const fieldElement = document.querySelector(`#${error.field}`)
    ;(fieldElement as HTMLElement | null)?.focus()
  }
}
```

## Testing Patterns

### React Component Error Testing

Test error boundaries and error handling in React components:

```typescript
import { TestScenarioBuilder } from '@sparkle/error-testing'
import { render, screen } from '@testing-library/react'

describe('UserProfile Component', () => {
  test('handles API errors gracefully', async () => {
    const scenario = TestScenarioBuilder
      .create<NetworkError, { user: User | null }>('API fetch error')
      .withErrorType(NetworkError)
      .withSetup(async (context) => {
        context.services.userApi = {
          fetchUser: jest.fn().mockRejectedValue(
            new NetworkError('Failed to fetch user', 500, '/api/user')
          )
        }
      })
      .withRecovery({
        canHandle: (error): error is NetworkError => error instanceof NetworkError,
        handle: async (error, context) => {
          context.state.user = null
          if (error) {
            // Show error message to user
            console.error('API fetch error:', error)
          }
        }
      })
      .build()

    const context = {
      state: { user: null },
      services: {}
    }

    const result = await scenario.execute(context)

    expect(result.success).toBe(true)
    expect(result.recoveryAttempted).toBe(true)
    expect(result.recoverySucceeded).toBe(true)
  })
})
```

### Async Operation Testing

Test error handling in async operations:

```typescript
async function testAsyncOperation() {
  const scenario = TestScenarioBuilder
    .create<Error, AsyncState>('Async operation failure')
    .withErrorType(Error)
    .withSetup(async (context) => {
      context.state.loading = true
      context.state.error = null
    })
    .withRecovery({
      canHandle: (error): error is Error => error instanceof Error,
      handle: async (error, context) => {
        context.state.loading = false
        context.state.error = error.message
        context.state.retryCount += 1

        if (context.state.retryCount < 3) {
          // Retry the operation
          setTimeout(() => retryOperation(context), 1000)
        }
      }
    })
    .withTeardown(async (context) => {
      context.state.loading = false
    })
    .build()

  const context = {
    state: { loading: false, error: null, retryCount: 0 },
    services: { api: mockApi }
  }

  return scenario.execute(context)
}
```

### Form Validation Testing

Test form validation error handling:

```typescript
interface FormState {
  values: Record<string, string>
  errors: Record<string, string>
  isValid: boolean
}

function createValidationTest(field: string, value: string, expectedError: string) {
  return TestScenarioBuilder
    .create<ValidationError, FormState>(`Validation error for ${field}`)
    .withErrorType(ValidationError)
    .withSetup(async (context) => {
      context.state.values[field] = value
      context.state.errors = {}
      context.state.isValid = true
    })
    .withRecovery({
      canHandle: (error): error is ValidationError => error instanceof ValidationError,
      handle: async (error, context) => {
        context.state.errors[error.field] = error.message
        context.state.isValid = false
      }
    })
    .build()
}

// Usage
const emailValidationTest = createValidationTest(
  'email',
  'invalid-email',
  'Please enter a valid email address'
)
```

## Advanced Patterns

### Chained Error Recovery

Handle multiple error types with fallback strategies:

```typescript
class PrimaryRecoveryError extends Error {
  constructor(message: string, public originalError: Error) {
    super(message)
    this.name = 'PrimaryRecoveryError'
  }
}

const chainedRecovery: ErrorRecoveryStrategy<NetworkError, AppState> = {
  canHandle: (error): error is NetworkError => error instanceof NetworkError,
  handle: async (error, context) => {
    try {
      // Try primary recovery
      await primaryRecoveryStrategy.handle(error, context)
    } catch (primaryError) {
      try {
        // Try secondary recovery
        await secondaryRecoveryStrategy.handle(error, context)
      } catch {
        // Final fallback
        throw new PrimaryRecoveryError(
          'All recovery strategies failed',
          primaryError as Error
        )
      }
    }
  }
}
```

### Conditional Recovery

Apply different recovery strategies based on context:

```typescript
const conditionalRecovery: ErrorRecoveryStrategy<NetworkError, AppState> = {
  canHandle: (error): error is NetworkError => error instanceof NetworkError,
  handle: async (error, context) => {
    const isProduction = context.services.env === 'production'
    const userRole = context.state.user?.role

    if (isProduction && userRole === 'admin') {
      // Show detailed error information for admins in production
      context.services.notifications.show({
        type: 'error',
        message: `Network error: ${error.message} (${error.statusCode})`,
        details: error.endpoint
      })
    } else {
      // Show generic error message for regular users
      context.services.notifications.show({
        type: 'error',
        message: 'Something went wrong. Please try again.'
      })
    }
  }
}
```

### Batch Error Testing

Test multiple error scenarios efficiently:

```typescript
async function runBatchErrorTests() {
  const scenarios = [
    TestScenarioBuilder.create<NetworkError>('Network timeout'),
    TestScenarioBuilder.create<ValidationError>('Invalid input'),
    TestScenarioBuilder.create<AuthenticationError>('Unauthorized access')
  ]

  const results = await Promise.all(
    scenarios.map(async (builder, index) => {
      const scenario = builder
        .withErrorType([NetworkError, ValidationError, AuthenticationError][index])
        .withRecovery(getRecoveryStrategy(index))
        .build()

      const context = createTestContext(index)
      return scenario.execute(context)
    })
  )

  // Analyze batch results
  const successRate = results.filter(r => r.success).length / results.length
  const recoveryRate = results.filter(r => r.recoverySucceeded).length / results.length

  return { successRate, recoveryRate, results }
}
```

## Error Boundary Integration

### ErrorBoundaryConfig

Configure error boundaries with type safety:

```tsx
interface ErrorBoundaryConfig<TError extends Error = Error> {
  readonly name: string
  readonly errorTypes: readonly (new (...args: any[]) => TError)[]
  readonly fallback?: ComponentType<{error: TError}>
}

const apiErrorBoundary: ErrorBoundaryConfig<NetworkError> = {
  name: 'ApiErrorBoundary',
  errorTypes: [NetworkError],
  fallback: ({ error }) => (
    <div className="error-fallback">
      <h2>Network Error</h2>
      <p>Failed to load data: {error.message}</p>
      <button onClick={() => window.location.reload()}>
        Retry
      </button>
    </div>
  )
}
```

### Testing Error Boundaries

```typescript
function testErrorBoundary() {
  return TestScenarioBuilder
    .create<NetworkError>('Error boundary catches network errors')
    .withErrorType(NetworkError)
    .withSetup(async (context) => {
      context.services.errorBoundary = apiErrorBoundary
    })
    .withRecovery({
      canHandle: (error): error is NetworkError =>
        apiErrorBoundary.errorTypes.some(errorType => error instanceof errorType),
      handle: async (error, context) => {
        // Error boundary should render fallback UI
        expect(screen.getByText('Network Error')).toBeInTheDocument()
        expect(screen.getByText(`Failed to load data: ${error.message}`)).toBeInTheDocument()
      }
    })
    .build()
}
```

## Best Practices

### Type Safety

1. **Use specific error types** instead of generic Error
2. **Define proper type parameters** for TestScenarioBuilder
3. **Implement type guards** in recovery strategies
4. **Use discriminated unions** for error handling

### Error Recovery

1. **Keep recovery strategies focused** on specific error types
2. **Implement graceful degradation** when recovery fails
3. **Log error details** for debugging and monitoring
4. **Provide user feedback** for recoverable errors

### Testing Strategy

1. **Test both happy path and error scenarios**
2. **Verify recovery mechanisms work correctly**
3. **Test error boundary integration**
4. **Mock external dependencies** for consistent testing

### Performance

1. **Avoid heavy operations** in recovery strategies
2. **Use debouncing** for retry mechanisms
3. **Implement exponential backoff** for network retries
4. **Cache recovery results** when appropriate
