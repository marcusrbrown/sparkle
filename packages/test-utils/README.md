# @sparkle/test-utils

Shared test utilities and mocking helpers for the Sparkle monorepo. Provides consistent, reusable testing patterns to reduce code duplication and improve test maintainability across all packages.

## Features

- **DOM Mocking**: localStorage, MediaQueryList, ResizeObserver, and other browser APIs
- **React Testing**: Theme provider wrappers, custom render utilities, and component testing helpers
- **Console Mocking**: Type-safe console method mocking for capturing logs in tests
- **Terminal Mocking**: XTerm.js mock factories for terminal component testing
- **Test Lifecycle**: Standardized setup/teardown utilities and mock cleanup helpers

## Installation

This package is part of the Sparkle monorepo and uses workspace dependencies:

```json
{
  "devDependencies": {
    "@sparkle/test-utils": "workspace:*"
  }
}
```

## Usage

### DOM Mocking

#### localStorage Mock

```typescript
import {createLocalStorageMock, resetLocalStorageMock, setStoredValue} from '@sparkle/test-utils/dom'

describe('localStorage tests', () => {
  let mockLocalStorage: LocalStorageMock

  beforeEach(() => {
    mockLocalStorage = createLocalStorageMock()
    globalThis.localStorage = mockLocalStorage as unknown as Storage
  })

  it('should store and retrieve values', () => {
    setStoredValue(mockLocalStorage, 'theme', 'dark')
    expect(mockLocalStorage.getItem('theme')).toBe('dark')
  })
})
```

#### MediaQueryList Mock

```typescript
import {createMediaQueryListMock} from '@sparkle/test-utils/dom'

it('should respond to system theme changes', () => {
  const mockMediaQuery = createMediaQueryListMock(true) // dark mode
  window.matchMedia = vi.fn(() => mockMediaQuery)

  // Simulate system theme change
  mockMediaQuery._triggerChange(false) // switch to light mode
  expect(mockMediaQuery.matches).toBe(false)
})
```

#### ResizeObserver Mock

```typescript
import {setupResizeObserver} from '@sparkle/test-utils/dom'

beforeEach(() => {
  setupResizeObserver()
})

it('should observe element resizing', () => {
  // ResizeObserver is now mocked globally
  const observer = new ResizeObserver(() => {})
  observer.observe(element)
})
```

### React Testing

#### Theme Provider Wrapper

```tsx
import {renderWithTheme} from '@sparkle/test-utils/react'

it('should render with theme', () => {
  const {container} = renderWithTheme(<MyComponent />, {theme: 'dark'})
  expect(container).toBeInTheDocument()
})
```

#### Custom Render Utilities

```tsx
import {renderWithProviders} from '@sparkle/test-utils/react'

it('should render with all providers', () => {
  const {getByText} = renderWithProviders(<MyComponent />, {
    themeConfig: {mode: 'light'},
  })
  expect(getByText('Hello')).toBeInTheDocument()
})
```

### Console Mocking

```typescript
import {mockConsole, restoreConsole} from '@sparkle/test-utils/console'

describe('console tests', () => {
  let consoleMocks: ConsoleMocks

  beforeEach(() => {
    consoleMocks = mockConsole()
  })

  afterEach(() => {
    restoreConsole(consoleMocks)
  })

  it('should capture console output', () => {
    console.log('test message')
    expect(consoleMocks.log).toHaveBeenCalledWith('test message')
  })
})
```

### Terminal Mocking

```typescript
import {createFitAddonMock, createTerminalMock, setupXTermMocks} from '@sparkle/test-utils/terminal'

beforeEach(() => {
  setupXTermMocks()
})

it('should create terminal with mocks', () => {
  const mockTerminal = createTerminalMock()
  mockTerminal.write('hello')
  expect(mockTerminal.write).toHaveBeenCalledWith('hello')
})
```

### Test Lifecycle

```typescript
import {standardAfterEach, standardBeforeEach} from '@sparkle/test-utils/lifecycle'

describe('my tests', () => {
  beforeEach(() => {
    standardBeforeEach()
  })

  afterEach(() => {
    standardAfterEach()
  })

  it('should run with clean mock state', () => {
    // All mocks are cleared/reset
  })
})
```

## API Reference

### DOM Module (`@sparkle/test-utils/dom`)

- `createLocalStorageMock()` - Creates fresh localStorage mock
- `resetLocalStorageMock(mock)` - Resets mock to clean state
- `setStoredValue(mock, key, value)` - Helper to configure stored values
- `createMediaQueryListMock(initialMatches)` - Creates MediaQueryList mock with change simulation
- `setupResizeObserver()` - Configures global ResizeObserver mock

### React Module (`@sparkle/test-utils/react`)

- `renderWithTheme(component, options)` - Renders component with ThemeProvider
- `renderWithProviders(component, options)` - Renders with all standard providers
- `createTestWrapper(options)` - Creates reusable wrapper component with providers

### Console Module (`@sparkle/test-utils/console`)

- `mockConsole(methods?)` - Mocks console methods (default: all)
- `restoreConsole(mocks)` - Restores original console methods
- `suppressConsole(methods?)` - Suppress console output without assertions

### Terminal Module (`@sparkle/test-utils/terminal`)

- `createTerminalMock()` - Creates XTerm Terminal mock
- `createFitAddonMock()` - Creates FitAddon mock
- `setupXTermMocks()` - Configures global @xterm/xterm and @xterm/addon-fit mocks

### Lifecycle Module (`@sparkle/test-utils/lifecycle`)

- `standardBeforeEach()` - Standard test setup (clear mocks, reset modules)
- `standardAfterEach()` - Standard test teardown (restore mocks)
- `cleanupTestEnvironment()` - Comprehensive cleanup utility

## Best Practices

1. **Import Specific Modules**: Use subpath imports (`@sparkle/test-utils/dom`) to optimize tree-shaking
2. **Reset Mocks**: Always reset mocks in `beforeEach` to prevent test interdependence
3. **Type Safety**: All utilities maintain full TypeScript type safety
4. **Vitest Integration**: Utilities designed for Vitest but compatible with other test frameworks

## Contributing

When adding new test utilities:

1. Place utility in appropriate module (`dom/`, `react/`, etc.)
2. Export from module's `index.ts` and main `src/index.ts`
3. Add comprehensive JSDoc comments explaining purpose and usage
4. Include TypeScript types for all parameters and return values
5. Add unit tests for the utility itself
6. Update this README with usage examples

## Related Packages

- `@sparkle/theme` - Theme system with testing utilities
- `@testing-library/react` - React component testing
- `vitest` - Test framework and mocking utilities

## License

MIT © Marcus R. Brown
