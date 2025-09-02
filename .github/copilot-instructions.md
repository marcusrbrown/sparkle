# Sparkle Development Guide for AI Agents

## Architecture Overview

Sparkle is a TypeScript monorepo playground using **pnpm workspaces** and **Turborepo**. Key architectural decisions:

- **Package Strategy**: Shared libraries (`@sparkle/ui`, `@sparkle/types`, `@sparkle/utils`) with consuming applications (`fro-jive` Expo app)
- **Build System**: Turborepo orchestrates builds with task dependencies (e.g., `build` → `^build` ensures dependencies build first)
- **Type Safety**: Shared types via `@sparkle/types` + TypeScript project references for clean inter-package dependencies
- **Component Architecture**: Radix UI primitives + Tailwind CSS + React forwardRef pattern for accessibility and customization

## Critical Workflows

### Development Commands

```bash
pnpm bootstrap          # Install all workspace dependencies
pnpm dev               # Start all dev servers (UI, Storybook, mobile)
pnpm build:types:watch # Watch mode for TypeScript declarations
pnpm check             # Run all quality checks (format, types, monorepo)
pnpm check:monorepo    # Verify workspace consistency with manypkg
pnpm fix               # Auto-fix monorepo and ESLint issues
```

### Package Development Pattern

1. Work in `packages/ui/src/components/` following the Button component pattern
2. Export via `packages/ui/src/components/index.ts` → `packages/ui/src/index.ts`
3. Test in Storybook (`packages/storybook/`) before integration
4. Use `@sparkle/types` for shared interfaces, `@sparkle/utils` for shared logic

### Mobile Integration (fro-jive)

- Expo app with file-based routing (`app/` directory)
- Uses `@/components/` alias for local components
- Integrates `@sparkle/ui` components (though platform differences may require adaptation)

## Project-Specific Conventions

### Naming Conventions

- **Types/Interfaces**: PascalCase (`ButtonProps`, `ThemeConfig`)
- **Functions/Variables**: camelCase (`createButtonClassName`, `useDebounce`)
- **Components**: PascalCase with explicit return types
- **Files**: kebab-case for config files, PascalCase for components

### Component Architecture Pattern

```tsx
// packages/ui/src/components/Button/Button.tsx
export interface ButtonProps extends HTMLProperties<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline"
  size?: "sm" | "md" | "lg"
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const {variant = "primary", size = "md", className, children, ...rest} = props
  return (
    <button ref={ref} className={cx("btn", `btn-${variant}`, `btn-${size}`, className)} {...rest}>
      {children}
    </button>
  )
})
```

### Error Testing Strategy

- Dedicated `@sparkle/error-testing` package with fluent builder pattern
- Use `TestScenarioBuilder.create()` for type-safe error scenario testing
- Pattern: `TestScenarioBuilder.create<ErrorType, StateType>(description).withErrorType().build()`

### Versioning & Changesets

- Use Changesets for version management: `pnpm changeset` → `pnpm changeset version` → commit
- Create changeset files for all significant changes with proper bump types (major/minor/patch)
- Workspace dependencies use `workspace:*` protocol for internal packages

### ESM Configuration

- All packages use `"type": "module"` for ESM-only builds
- Package exports configure both types and runtime: `"exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } }`
- CSS exports available for UI packages: `"./styles.css": "./dist/styles.css"`

### TypeScript Configuration

- Root `tsconfig.json` with shared compiler options
- Package-specific configs extend root: `"extends": "../../tsconfig.json"`
- Path aliases for imports: `@sparkle/ui/*` → `packages/ui/src/*`

### Turborepo Task Dependencies

- `build` tasks depend on `^build` (dependencies first)
- `dev` and `test` depend on `^build` (need built dependencies)
- Use `persistent: true` for dev servers, `cache: false` for watch modes

### TypeScript Best Practices & Patterns

#### Build Tool Configuration (`tsdown`)

- **Primary Build Tool**: Use `tsdown` for package builds - fast TypeScript-to-ESM transpiler
- **Configuration Pattern**: Each package has `tsdown.config.ts` with `defineConfig({entry: ['./src/index.ts'], outDir: 'dist', dts: true})`
- **Build Scripts**: Package.json uses `"build": "tsdown"` for consistent compilation
- **Type Declarations**: `dts: true` generates TypeScript declaration files automatically

#### Code Style Conventions

- **Avoid ES6 Classes**: Use function declarations and object patterns instead of class syntax
- **Utility Types**: Leverage built-in utility types extensively:
  - `Pick<T, K>` for selecting specific properties
  - `Omit<T, K>` for excluding properties
  - `Partial<T>` for optional properties
  - `Required<T>` for required properties
  - `Record<K, V>` for key-value mappings
- **Type Safety**: Prefer `unknown` over `any` when type is uncertain
- **Const Assertions**: Use `as const` for immutable values and strict literal types

```typescript
// ✅ Good: Using utility types and const assertions
export const buttonVariants = ['primary', 'secondary', 'outline'] as const
export type ButtonVariant = typeof buttonVariants[number]

export interface ButtonProps extends Pick<HTMLButtonElement, 'disabled' | 'type'> {
  variant?: ButtonVariant
  children: React.ReactNode
}

// ✅ Good: Explicit return types
export function createButtonClassName(variant: ButtonVariant): string {
  return `btn btn-${variant}`
}
```

#### Documentation Standards

- **JSDoc Required**: All public APIs must have JSDoc comments explaining purpose and usage
- **Explain "Why" Not "What"**: Comments should explain reasoning, not implementation details
- **Type Documentation**: Document complex types with examples and use cases

```typescript
/**
 * Creates a type-safe form field with validation support.
 *
 * This hook manages form field state and integrates with the parent form's
 * validation system to provide real-time feedback.
 *
 * @param name - Unique identifier for the field within the form
 * @param initialValue - Starting value for the field
 * @returns Object containing field value, validation state, and handlers
 */
export function useFormField<T>(name: string, initialValue: T): FormFieldState<T>
```

#### Error Handling & Logging

- **Meaningful Errors**: Provide specific, actionable error messages
- **Use `consola`**: Replace `console.*` with `consola` package for structured logging
- **Type-Safe Errors**: Create specific error types rather than generic Error instances

```typescript
import {consola} from 'consola'

// ✅ Good: Specific error types with meaningful messages
export class ValidationError extends Error {
  constructor(
    public readonly field: string,
    public readonly value: unknown,
    message: string,
  ) {
    super(`Validation failed for field "${field}": ${message}`)
    this.name = 'ValidationError'
  }
}

// ✅ Good: Structured logging with consola
export function validateField(field: string, value: unknown): ValidationResult {
  if (!value) {
    consola.warn(`Field "${field}" is empty, applying default validation`)
    return {valid: false, error: new ValidationError(field, value, 'Field is required')}
  }
  consola.debug(`Field "${field}" validation passed`)
  return {valid: true}
}
```

#### Testing with Vitest Type-Checking

- **Type-Safe Tests**: Enable Vitest's TypeScript checking in test files
- **Test Type Utilities**: Use `expectTypeOf` for compile-time type assertions
- **Mock Type Safety**: Ensure mocks maintain type safety with original implementations

```typescript
import {describe, expectTypeOf, it, vi} from 'vitest'

describe('Button component', () => {
  it('should accept valid button props', () => {
    expectTypeOf<ButtonProps>().toMatchTypeOf<{variant?: ButtonVariant}>()
  })

  it('should handle click events with correct types', () => {
    const handleClick = vi.fn<[React.MouseEvent<HTMLButtonElement>], void>()
    // Test implementation maintains type safety
  })
})
```

## Integration Points

### Package Boundaries

- `@sparkle/types`: Shared TypeScript definitions (ThemeConfig, BaseProps, HTMLProperties)
- `@sparkle/utils`: React hooks (useDebounce, etc.) and utility functions
- `@sparkle/ui`: Component library consuming types/utils
- `@sparkle/config`: Shared configurations (Tailwind, TypeScript)

### Cross-Platform Considerations

- Web components in `@sparkle/ui` use HTML props (`HTMLButtonElement`)
- Mobile app (`fro-jive`) may need platform-specific adaptations
- Storybook serves as universal component playground

### Development Tools Integration

- Storybook configured for component development/documentation with accessibility testing via `@storybook/addon-a11y`
- Vitest for testing (configured in `@sparkle/ui`) with TypeScript type-checking enabled
- Changesets for versioning workflow: `pnpm changeset` → `pnpm changeset version` → commit
- Prettier + ESLint via Turborepo pipeline with `@bfra.me/prettier-config`
- Manypkg ensures workspace consistency - run `pnpm check:monorepo` before commits
