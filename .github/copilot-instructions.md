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

### TypeScript Configuration

- Root `tsconfig.json` with shared compiler options
- Package-specific configs extend root: `"extends": "../../tsconfig.json"`
- Path aliases for imports: `@sparkle/ui/*` → `packages/ui/src/*`

### Turborepo Task Dependencies

- `build` tasks depend on `^build` (dependencies first)
- `dev` and `test` depend on `^build` (need built dependencies)
- Use `persistent: true` for dev servers, `cache: false` for watch modes

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

- Storybook configured for component development/documentation
- Vitest for testing (configured in `@sparkle/ui`)
- Changesets for versioning workflow: `pnpm changeset` → `pnpm changeset version` → commit
- Prettier + ESLint via Turborepo pipeline
