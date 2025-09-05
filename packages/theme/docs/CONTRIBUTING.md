# Contributing to @sparkle/theme

Thank you for your interest in contributing to the Sparkle Theme package! This guide will help you get started with contributing to the theme management system.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Contributing Guidelines](#contributing-guidelines)
- [Testing Requirements](#testing-requirements)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

## Development Setup

### Prerequisites

- Node.js 18+ with pnpm package manager
- TypeScript 5.0+
- Git

### Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/marcusrbrown/sparkle.git
   cd sparkle
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Build the theme package**

   ```bash
   pnpm --filter @sparkle/theme build
   ```

4. **Run tests**

   ```bash
   pnpm --filter @sparkle/theme test
   ```

5. **Start development mode**
   ```bash
   pnpm --filter @sparkle/theme dev
   ```

### Development Commands

```bash
# Build the package
pnpm --filter @sparkle/theme build

# Run tests with coverage
pnpm --filter @sparkle/theme test:coverage

# Run tests in watch mode
pnpm --filter @sparkle/theme test:watch

# Type checking
pnpm --filter @sparkle/theme typecheck

# Linting
pnpm --filter @sparkle/theme lint

# Bundle analysis
pnpm --filter @sparkle/theme build:analyze
```

## Project Structure

```
packages/theme/
├── src/
│   ├── context/          # React Context implementation
│   ├── examples/         # Example components and demos
│   ├── hooks/           # React hooks (useTheme, useColorScheme)
│   ├── persistence/     # Theme storage utilities
│   ├── providers/       # Theme provider components
│   ├── react-native/    # React Native specific exports
│   ├── tailwind/        # Tailwind CSS plugin
│   ├── tokens/          # Design token definitions
│   ├── utils/           # Utility functions
│   ├── validators/      # Theme validation logic
│   └── index.ts         # Main package exports
├── test/                # Test files
├── docs/                # Documentation
├── package.json
└── README.md
```

### Key Files

- **`src/index.ts`** - Main package exports and public API
- **`src/tokens/base.ts`** - Foundation design tokens
- **`src/providers/ThemeProvider.tsx`** - Web theme provider
- **`src/providers/NativeThemeProvider.tsx`** - React Native theme provider
- **`src/tailwind/theme-plugin.ts`** - Tailwind CSS plugin implementation
- **`src/validators/theme-validator.ts`** - Theme validation logic

## Contributing Guidelines

### Code Style

We use ESLint and Prettier for code formatting. The configuration follows the Sparkle monorepo standards:

```bash
# Format code
pnpm format

# Check linting
pnpm lint
```

### TypeScript Standards

- Use strict TypeScript configuration
- Provide explicit return types for functions
- Use proper type imports with `import type`
- Avoid `any` types - use `unknown` when type is uncertain
- Document complex types with JSDoc comments

```tsx
// Good: Explicit types and proper imports
import type { ThemeConfig } from '@sparkle/types'

export function validateTheme(theme: ThemeConfig): ValidationResult {
  // Implementation
}

// Bad: Missing types
export function validateTheme(theme) {
  // Implementation
}
```

### Component Patterns

Follow the established patterns in the codebase:

```tsx
// Component pattern
export interface ComponentProps {
  /** JSDoc description for prop */
  propName?: string
}

export function Component({ propName }: ComponentProps) {
  // Implementation
}

// Hook pattern
export function useCustomHook(param: string): ReturnType {
  // Implementation
}
```

### Design Token Structure

When adding new design tokens, follow the established structure:

```tsx
// Color tokens - use 50-950 scale
const colorScale = {
  50: '#f8fafc',   // Lightest
  100: '#f1f5f9',
  // ... progression
  500: '#64748b',  // Base color
  // ... progression
  900: '#0f172a',  // Darkest
  950: '#020617'   // Optional extra dark
}

// Spacing tokens - use consistent scale
const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem'       // 32px
}
```

## Testing Requirements

### Test Coverage

Maintain high test coverage (>90%) for all new code:

- Unit tests for utilities and functions
- Component tests for React components
- Integration tests for theme context
- Visual regression tests for UI changes

### Test Structure

```tsx
// Unit test example
describe('validateTheme', () => {
  it('should validate required properties', () => {
    const theme = createValidTheme()
    const result = validateTheme(theme)
    expect(result.isValid).toBe(true)
  })

  it('should reject invalid color values', () => {
    const theme = createThemeWithInvalidColors()
    const result = validateTheme(theme)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Invalid color format')
  })
})

// Component test example
describe('ThemeProvider', () => {
  it('should provide theme context to children', () => {
    render(
      <ThemeProvider themes={{ light: lightTokens }}>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme-value')).toHaveTextContent('light')
  })
})
```

### Performance Testing

Include performance tests for theme switching:

```tsx
describe('Theme Performance', () => {
  it('should switch themes within performance budget', async () => {
    const { setTheme } = renderThemeProvider()

    const startTime = performance.now()
    setTheme('dark')
    await waitFor(() => {
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
    })
    const endTime = performance.now()

    expect(endTime - startTime).toBeLessThan(100) // 100ms budget
  })
})
```

## Submitting Changes

### Branch Naming

Use descriptive branch names:

- `feature/theme-validation-improvements`
- `fix/dark-theme-contrast-issues`
- `docs/api-reference-updates`
- `test/theme-switching-performance`

### Commit Messages

Follow conventional commit format:

```
feat(theme): add support for custom color spaces
fix(validation): improve contrast ratio calculation
docs(api): update theme configuration examples
test(providers): add integration tests for persistence
```

### Pull Request Guidelines

1. **Create focused PRs** - One feature or fix per PR
2. **Write descriptive titles** - Clearly explain what the PR does
3. **Include tests** - All new functionality must have tests
4. **Update documentation** - Keep docs in sync with changes
5. **Check all CI passes** - Ensure tests, linting, and type checking pass

### PR Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Visual tests added/updated
- [ ] All tests pass

## Documentation
- [ ] README updated
- [ ] API docs updated
- [ ] Migration guide updated (if breaking)

## Performance Impact
- [ ] No performance impact
- [ ] Measured performance impact (include benchmarks)
- [ ] Performance improvement (include benchmarks)
```

## Release Process

### Changesets

We use Changesets for version management. When making changes:

1. **Add a changeset**

   ```bash
   pnpm changeset
   ```

2. **Choose change type**
   - `patch` - Bug fixes, small improvements
   - `minor` - New features, non-breaking changes
   - `major` - Breaking changes

3. **Write clear description**

   ```markdown
   # Example changeset
   ---
   "@sparkle/theme": minor
   ---

   Add support for custom animation tokens in theme configuration
   ```

### Release Notes

Include in your changeset:

- What changed
- Why it changed
- How to use the new feature
- Migration instructions (for breaking changes)

## Architecture Decisions

### Design Principles

When contributing, follow these principles:

1. **Cross-Platform First** - Ensure changes work on both web and React Native
2. **Type Safety** - Maintain strong TypeScript typing
3. **Performance** - Optimize for theme switching performance
4. **Accessibility** - Ensure WCAG compliance for color choices
5. **Developer Experience** - Prioritize ease of use and clear error messages

### Adding New Features

When adding new features:

1. **Start with an issue** - Discuss the feature before implementing
2. **Design the API** - Consider the developer experience
3. **Write tests first** - TDD approach for complex features
4. **Update documentation** - Keep all docs current
5. **Consider breaking changes** - Minimize impact on existing users

### Breaking Changes

For breaking changes:

1. **Justify the need** - Explain why the breaking change is necessary
2. **Provide migration path** - Include clear migration instructions
3. **Update major version** - Use semantic versioning properly
4. **Deprecation period** - When possible, provide deprecation warnings first

## Code Review Process

### Reviewer Guidelines

As a reviewer:

- Check for code quality and consistency
- Verify test coverage and quality
- Ensure documentation is updated
- Test the changes locally
- Provide constructive feedback

### Author Guidelines

As an author:

- Respond to feedback promptly
- Make requested changes clearly
- Ask questions if feedback is unclear
- Update PR description as needed

## Common Issues

### Build Errors

```bash
# Clear build cache
pnpm --filter @sparkle/theme clean

# Rebuild dependencies
pnpm --filter @sparkle/theme build

# Check TypeScript errors
pnpm --filter @sparkle/theme typecheck
```

### Test Failures

```bash
# Run tests with verbose output
pnpm --filter @sparkle/theme test --verbose

# Update snapshots if needed
pnpm --filter @sparkle/theme test --updateSnapshot

# Check test coverage
pnpm --filter @sparkle/theme test:coverage
```

### Import/Export Issues

- Use explicit imports: `import { useTheme } from '@sparkle/theme'`
- Check package.json exports configuration
- Verify TypeScript project references

## Getting Help

### Resources

- **Documentation**: Read the [API Reference](./API.md) and [Examples](./EXAMPLES.md)
- **Storybook**: Run `pnpm storybook` to see components in action
- **Tests**: Look at existing tests for patterns and examples

### Communication

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and general discussion
- **PR Comments**: For code-specific questions during review

### Troubleshooting

Common development issues:

1. **TypeScript errors**: Check project references and ensure packages are built
2. **Test failures**: Make sure all dependencies are installed and built
3. **Import errors**: Verify package exports and build outputs
4. **Performance issues**: Use profiling tools to identify bottlenecks

## License

By contributing to @sparkle/theme, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Sparkle Theme! Your contributions help make the design system better for everyone. 🎨
