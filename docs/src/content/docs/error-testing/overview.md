---
title: Error Testing Overview
description: Fluent builder pattern for type-safe error scenario testing.
---

The Sparkle error testing framework provides a fluent API for creating comprehensive error scenarios and validation tests.

## Test Scenario Builder

Create type-safe error scenarios using the fluent builder pattern:

```typescript
import { TestScenarioBuilder } from '@sparkle/error-testing'

const scenario = TestScenarioBuilder
  .create<ValidationError, FormState>('Email validation')
  .withErrorType('VALIDATION_ERROR')
  .withState({ email: 'invalid-email' })
  .build()
```

## Error Patterns

Common error testing patterns:

- **Validation Errors** - Form and input validation
- **Network Errors** - API and connectivity issues
- **Authentication Errors** - Login and permission failures
- **Runtime Errors** - Unexpected application errors

## Best Practices

- Use descriptive scenario names
- Test both error and success paths
- Leverage TypeScript for type safety
- Group related scenarios together
