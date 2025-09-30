# @sparkle/error-testing

A fluent, type-safe error testing framework for the Sparkle Design System.

## Overview

This package provides a builder-pattern API for creating and testing error scenarios with full TypeScript type safety, making error handling tests more readable and maintainable.

## Installation

```bash
pnpm add @sparkle/error-testing
```

## Usage

### Basic Error Testing

```typescript
import { TestScenarioBuilder } from '@sparkle/error-testing'

// Define error type
interface ValidationError {
  message: string
  field: string
}

// Create test scenario
const scenario = TestScenarioBuilder.create<ValidationError>(
  'validates required email field'
)
  .withErrorType()
  .withInitialState({ email: '' })
  .withExpectedError({
    message: 'Email is required',
    field: 'email',
  })
  .build()

// Use in tests
test(scenario.description, () => {
  const result = validateForm(scenario.initialState)
  expect(result.error).toEqual(scenario.expectedError)
})
```

### Complex State Testing

```typescript
interface FormState {
  username: string
  email: string
  password: string
}

interface FormError {
  message: string
  field: keyof FormState
}

const scenario = TestScenarioBuilder.create<FormError, FormState>(
  'validates password strength'
)
  .withErrorType()
  .withInitialState({
    username: 'testuser',
    email: 'test@example.com',
    password: '123', // Too weak
  })
  .withExpectedError({
    message: 'Password must be at least 8 characters',
    field: 'password',
  })
  .build()
```

## API Reference

### `TestScenarioBuilder.create<ErrorType, StateType>(description)`

Creates a new test scenario builder.

**Type Parameters:**

- `ErrorType` - The error object type
- `StateType` - The initial state type (optional)

**Parameters:**

- `description` - Human-readable test description

### Builder Methods

- `.withErrorType()` - Marks this scenario as expecting an error
- `.withInitialState(state: StateType)` - Sets the initial state for the test
- `.withExpectedError(error: ErrorType)` - Defines the expected error object
- `.build()` - Builds and returns the complete test scenario

### Built Scenario

The built scenario object contains:

```typescript
interface TestScenario<ErrorType, StateType> {
  description: string
  initialState?: StateType
  expectedError?: ErrorType
  expectsError: boolean
}
```

## Type Safety

The builder pattern ensures type safety at compile time:

```typescript
// ✅ Type-safe - all properties match defined types
const scenario = TestScenarioBuilder.create<ValidationError, FormData>('test')
  .withErrorType()
  .withInitialState({ email: 'test@example.com' }) // Must match FormData
  .withExpectedError({ message: 'Error', field: 'email' }) // Must match ValidationError
  .build()

// ❌ Compile error - initialState doesn't match FormData type
const badScenario = TestScenarioBuilder.create<ValidationError, FormData>('test')
  .withInitialState({ wrongField: 'value' }) // TypeScript error!
```

## Benefits

### Fluent API

Readable, chainable method calls that express intent clearly:

```typescript
TestScenarioBuilder.create('user registration validation')
  .withErrorType()
  .withInitialState(invalidUserData)
  .withExpectedError(expectedValidationError)
  .build()
```

### Type Safety

Full TypeScript inference prevents runtime errors:

- Initial state must match defined state type
- Expected errors must match defined error type
- Build-time validation of all properties

### Maintainability

Centralized error testing patterns:

- Consistent error testing across the codebase
- Easy to refactor and update
- Self-documenting test scenarios

## Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test --watch

# Coverage report
pnpm test --coverage
```

## Development

```bash
# Build package
pnpm build

# Type check
pnpm typecheck

# Lint code
pnpm lint
```

## Best Practices

1. **Use descriptive scenario names**: Make test intent clear
2. **Define specific error types**: Avoid generic Error types
3. **Test edge cases**: Create scenarios for all error conditions
4. **Maintain type safety**: Don't use `any` or type assertions

## Example Test Suite

```tsx
import { TestScenarioBuilder } from '@sparkle/error-testing'
import { describe, expect, test } from 'vitest'

describe('Form Validation', () => {
  const scenarios = [
    TestScenarioBuilder.create<ValidationError, FormData>('empty email')
      .withErrorType()
      .withInitialState({ email: '' })
      .withExpectedError({ message: 'Email required', field: 'email' })
      .build(),

    TestScenarioBuilder.create<ValidationError, FormData>('invalid email format')
      .withErrorType()
      .withInitialState({ email: 'invalid' })
      .withExpectedError({ message: 'Invalid email', field: 'email' })
      .build(),
  ]

  scenarios.forEach((scenario) => {
    test(scenario.description, () => {
      const result = validateForm(scenario.initialState)
      expect(result.error).toEqual(scenario.expectedError)
    })
  })
})
```

## Contributing

When adding features:

1. Maintain backward compatibility
2. Add comprehensive tests
3. Update documentation
4. Follow TypeScript best practices
5. Run tests before committing: `pnpm test`

## Related Packages

- [`@sparkle/types`](../types/README.md) - Shared TypeScript types
- [`@sparkle/ui`](../ui/README.md) - UI components with error handling

## Documentation

For complete documentation, visit [sparkle.mrbro.dev](https://sparkle.mrbro.dev)
