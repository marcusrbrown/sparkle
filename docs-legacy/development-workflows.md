# Sparkle Development Workflows Guide

This guide documents the optimized development workflows implemented as part of the Infrastructure Build Pipeline Optimization project. These workflows provide enhanced developer experience with faster feedback loops, comprehensive validation, and robust error handling.

## Quick Start

### Initial Setup

```bash
# Clone and setup the repository
git clone https://github.com/marcusrbrown/sparkle.git
cd sparkle

# Install dependencies and validate environment
pnpm bootstrap
pnpm health-check
```

### Core Development Commands

```bash
# Start all development servers
pnpm dev

# Watch TypeScript compilation with fast incremental builds
pnpm build:types:watch

# Run comprehensive quality checks
pnpm check

# Enhanced error reporting for any command
pnpm check:enhanced
```

## Optimized Development Workflows

### 1. Fast Development Startup

**Recommended startup sequence for maximum productivity:**

```bash
# Terminal 1: Start TypeScript watch mode
pnpm build:types:watch

# Terminal 2: Start development servers
pnpm dev

# Terminal 3: Optional - Monitor health and run checks
pnpm health-check
pnpm check
```

**Performance metrics achieved:**

- TypeScript watch mode startup: ~2 seconds
- Incremental compilation: <1 second
- Development server startup: ~15 seconds
- Health check validation: ~30 seconds

### 2. Enhanced Build Process

**Standard build with enhanced error reporting:**

```bash
# Regular build
pnpm build

# Build with enhanced error reporting
pnpm build:enhanced

# Type checking with enhanced errors
pnpm check:enhanced
```

**Features:**

- Colorized error output with context
- Cross-package dependency error analysis
- Actionable suggestions for fixing issues
- Performance timing information

### 3. Incremental TypeScript Compilation

**Optimized TypeScript workflow leverages incremental compilation:**

```bash
# Start incremental watch mode
pnpm build:types:watch

# Manual incremental build
pnpm build:types
```

**Key optimizations implemented:**

- `.tsbuildinfo` files for incremental state tracking
- TypeScript project references for proper build order
- Watch mode with `--preserveWatchOutput` for cleaner logs
- Optimized `tsconfig.json` with `assumeChangesOnlyAffectDirectDependencies`

**Build order enforced:** `types → utils → theme → config → error-testing → ui → storybook`

## Workspace Validation & Health Checks

### 1. Comprehensive Health Check

**Run complete environment validation:**

```bash
pnpm health-check
```

**Validates:**

- ✅ Workspace consistency (manypkg)
- ✅ Package dependencies (workspace:\* protocol)
- ✅ TypeScript project references
- ✅ Build pipeline integrity
- ✅ Development environment setup
- ✅ Tool versions (Node.js, pnpm, TypeScript, Turbo)

### 2. Workspace Consistency

**Validate and fix workspace issues:**

```bash
# Check workspace consistency
pnpm check:monorepo

# Auto-fix workspace issues
pnpm fix:monorepo

# Validate dependency protocols
pnpm check:dependencies
```

**manypkg validation features:**

- Enforces `workspace:*` protocol for internal dependencies
- Validates package naming conventions
- Checks dependency version consistency
- Ensures proper repository field configuration

### 3. Continuous Quality Checks

**Run all quality validations:**

```bash
# Standard quality pipeline
pnpm check

# Enhanced quality pipeline with better error reporting
pnpm check:enhanced
```

**Quality pipeline includes:**

- Workspace consistency validation
- TypeScript type checking
- Turbo configuration validation
- Package dependency validation
- ESLint linting

## Performance Monitoring

### 1. Build Pipeline Performance Testing

**Automated performance validation:**

```bash
# Run performance benchmarks
pnpm test:build-pipeline

# Run all pipeline tests
pnpm test:pipeline
```

**Performance targets validated:**

- Full build time: <180 seconds (currently ~18 seconds)
- Incremental build time: <30 seconds (currently ~1 second)
- Type checking time: <10 seconds (currently ~0.5 seconds)
- Cache hit ratio: >80%

### 2. Real-time Performance Monitoring

**Monitor build performance during development:**

```bash
# Build with timing information
time pnpm build

# Watch mode with performance feedback
pnpm build:types:watch  # Shows incremental compilation times
```

### 3. Cache Effectiveness

**Turborepo caching optimization:**

```bash
# Build with cache summary
pnpm build --summarize

# Clear cache if needed
turbo prune
```

## Testing Infrastructure

### 1. Automated Testing

**Comprehensive test suite for build pipeline:**

```bash
# Individual test suites
pnpm test:build-pipeline     # Performance benchmarks
pnpm test:cross-package      # Type validation
pnpm test:incremental        # Incremental builds
pnpm test:workspace          # Workspace consistency
pnpm test:dev-workflow       # Development workflows
pnpm test:artifacts          # Build artifacts and cache

# Run all pipeline tests
pnpm test:pipeline

# Run all tests across packages
pnpm test
```

### 2. Test Coverage

**Current test coverage includes:**

- Build pipeline performance and correctness
- Cross-package type checking validation
- Incremental compilation optimization
- Workspace consistency enforcement
- Development workflow automation
- Build artifact validation
- Turborepo cache effectiveness
- Component unit and integration tests
- Theme persistence and configuration tests
- WASM integration tests

### 3. Testing Best Practices

**Factory-Based Mock Patterns** _(Implemented Oct 2025)_:

The Sparkle project uses factory-based mock patterns to prevent test state pollution and ensure reliable test execution.

```typescript
// ✅ GOOD: Factory function creates clean mock per test
import {createLocalStorageMock, standardAfterEach, standardBeforeEach} from '@sparkle/test-utils'

describe('MyComponent', () => {
  beforeEach(standardBeforeEach) // Clean setup
  afterEach(standardAfterEach)   // Proper cleanup

  it('should work correctly', () => {
    const mockStorage = createLocalStorageMock() // Fresh state
    globalThis.localStorage = mockStorage as unknown as Storage
    // ... test implementation
  })
})

// ❌ BAD: Shared mock instance (state pollution)
const mockStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
}
// State accumulates across tests!
```

**Available Test Utilities** (`@sparkle/test-utils` package):

**DOM Mocks**:

- `createLocalStorageMock()` - Clean localStorage factory
- `createMediaQueryListMock(initialMatches)` - Media query mocking

**Console Mocks**:

- `mockConsole({suppress})` - Console function mocking
- `mockConsola(consolaInstance)` - Consola library mocking

**Terminal Mocks** (for moo-dang):

- `createTerminalMock()` - xterm.js Terminal instance
- `createFitAddonMock()` - FitAddon functionality
- `setupXTermMocks()` - Complete xterm setup

**Lifecycle Helpers**:

- `standardBeforeEach()` - Consistent test setup and mock clearing
- `standardAfterEach()` - Proper cleanup and restoration

**Test Quality Metrics** _(As of Oct 2025)_:

- Pass rate: **100%** (647/647 passing, 1 intentionally skipped)
- False positives: **0**
- Flaky tests: **0**
- Execution time: **~16 seconds** (64% improvement from previous)

## Enhanced Error Reporting

### 1. Error Categories

**The enhanced error reporting system categorizes errors:**

- 🚨 **TypeScript Errors**: Type checking failures with suggested fixes
- 🔥 **Build Errors**: Compilation and bundling failures
- 🔗 **Dependency Errors**: Workspace and package dependency issues
- 📦 **Import Errors**: Module resolution failures
- ⚡ **Syntax Errors**: Code syntax issues

### 2. Error Suggestions

**Common error patterns and automatic suggestions:**

- **TS2307** (Module not found): Workspace protocol recommendations
- **TS2322** (Type incompatibility): Type assertion suggestions
- **TS2339** (Property not found): Typo detection and alternatives
- **TS2531** (Null/undefined): Optional chaining recommendations

### 3. Cross-Package Error Context

**Enhanced context for monorepo errors:**

- File path to package name mapping
- Internal dependency relationship display
- Workspace-specific guidance for @sparkle/\* packages
- Distinction between internal and external dependency issues

## Development Environment Requirements

### Tool Versions

- **Node.js**: >= 22.13.1
- **pnpm**: >= 10.9.0
- **TypeScript**: >= 5.8.3
- **Turbo**: >= 2.5.1

### Environment Validation

**Verify your environment meets requirements:**

```bash
# Check all tool versions and environment
pnpm health-check

# Manual version checks
node --version    # Should be >= 22.13.1
pnpm --version    # Should be >= 10.9.0
npx tsc --version # Should be >= 5.8.3
npx turbo --version # Should be >= 2.5.1
```

## Advanced Development Patterns

### 1. Package-Specific Development

**Focus on specific packages:**

```bash
# Build specific package
turbo run build --filter=@sparkle/ui

# Development for specific package
turbo run dev --filter=@sparkle/storybook

# Test specific package
turbo run test --filter=@sparkle/theme
```

### 2. Dependency Analysis

**Understand package relationships:**

```bash
# Validate dependencies
pnpm check:dependencies

# View dependency graph
pnpm list --depth=1

# Check for circular dependencies
pnpm check:monorepo
```

### 3. Build Optimization

**Optimize build performance:**

```bash
# Use Turbo cache effectively
pnpm build  # Uses cache when possible

# Force rebuild without cache
turbo run build --force

# Analyze build dependencies
turbo run build --dry
```

## Development Best Practices

### 1. File Changes Workflow

**Recommended workflow for code changes:**

1. Start watch mode: `pnpm build:types:watch`
2. Make your changes
3. Watch for immediate TypeScript feedback
4. Run quality checks: `pnpm check`
5. Test changes: `pnpm test`

### 2. Error Resolution Workflow

**When encountering errors:**

1. Use enhanced error reporting: `pnpm check:enhanced`
2. Follow specific suggestions provided
3. Run health check if environment issues: `pnpm health-check`
4. Validate workspace consistency: `pnpm check:monorepo`

### 3. Performance Monitoring

**Regular performance validation:**

1. Run performance tests: `pnpm test:build-pipeline`
2. Monitor build times during development
3. Check cache effectiveness with `--summarize`
4. Use incremental compilation for fast feedback

## Integration with IDEs

### VS Code Configuration

**Recommended settings for optimal TypeScript experience:**

```json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "typescript.preferences.useAliasesForRenames": false,
  "typescript.suggest.includeCompletionsForModuleExports": true
}
```

### TypeScript Project Support

**Project references enable:**

- Faster IDE type checking
- Go-to-definition across packages
- Accurate IntelliSense for cross-package imports
- Proper build order enforcement

## Security and Quality Gates

### 1. Security Dependency Management _(Implemented Oct 2025)_

**Regular security audits are essential:**

```bash
# Check for security vulnerabilities
pnpm audit

# View dependency tree for specific package
pnpm why <package-name>

# Check for outdated packages
pnpm outdated
```

**Security best practices established:**

- **Zero tolerance policy** for known vulnerabilities
- **Automated monitoring** with Dependabot or similar tools
- **pnpm overrides** for transitive dependency patches
- **Regular audits** before every commit recommended

**Example override for security patches** (`pnpm-workspace.yaml`):

```yaml
packageExtensions:
  overrides:
    # Patch vulnerable versions of tmp package
    tmp@<0.2.4: ^0.2.4
```

### 2. Quality Gates Checklist

**Pre-commit validation** (should pass before committing):

```bash
pnpm lint                  # Linting (0 errors required)
pnpm exec tsc --noEmit     # Type checking (0 errors required)
pnpm check:monorepo        # Workspace consistency
```

**Pre-push validation** (should pass before pushing):

```bash
pnpm test                  # Tests (100% pass rate required)
pnpm build                 # Build (successful completion required)
pnpm health-check          # Environment validation
```

**Release validation** (should pass before releases):

```bash
pnpm audit                 # Security (0 vulnerabilities required)
pnpm test:build-pipeline   # Performance (no regressions)
pnpm check                 # Full quality pipeline
```

### 3. Automated Quality Monitoring

**Bundle size regression detection:**

The `test:build-pipeline` script monitors bundle sizes and alerts on regressions:

```bash
# Run bundle size validation
pnpm test:build-pipeline

# Output includes:
# - Build time tracking
# - Bundle size comparison against baseline
# - 5% regression threshold alerting
# - TypeScript declaration validation
# - Package structure validation
```

**Current performance baselines** _(As of Oct 2025)_:

- Build time: ~1.3s with FULL TURBO cache
- All packages: 0.0% bundle size change from baseline
- TypeScript declarations: 100% coverage (7/7 packages)

## Continuous Integration

### CI/CD Pipeline Integration

**Scripts designed for CI environments:**

```bash
# CI build validation
pnpm check        # Full quality pipeline
pnpm build        # Production build
pnpm test:pipeline # Complete test suite
pnpm health-check # Environment validation
pnpm audit        # Security validation
```

**All scripts provide proper exit codes for CI/CD integration.**

**Recommended CI/CD workflow:**

1. **Environment Setup**: Validate Node.js, pnpm versions
2. **Health Check**: `pnpm health-check` to validate workspace
3. **Linting**: `pnpm lint` for code quality
4. **Type Checking**: `pnpm exec tsc --noEmit` for type safety
5. **Testing**: `pnpm test` for functionality validation
6. **Security**: `pnpm audit` for vulnerability scanning
7. **Build**: `pnpm build` for production artifacts
8. **Performance**: `pnpm test:build-pipeline` for regression detection

## Migration from Previous Workflows

### Key Changes

**If migrating from previous development workflows:**

1. **New command**: `pnpm health-check` for environment validation
2. **Enhanced commands**: `pnpm check:enhanced` for better error reporting
3. **Performance commands**: `pnpm test:build-pipeline` for monitoring
4. **Dependency validation**: `pnpm check:dependencies` for workspace protocol

### Backward Compatibility

**All existing commands continue to work:**

- `pnpm dev` - Still starts all development servers
- `pnpm build` - Still builds all packages
- `pnpm check` - Still runs all quality checks
- `pnpm test` - Still runs all tests

**New commands provide enhanced functionality on top of existing workflows.**

---

## Quick Reference

### Essential Daily Commands

```bash
pnpm health-check          # Validate development environment
pnpm dev                   # Start development servers
pnpm build:types:watch     # Fast TypeScript compilation
pnpm check                 # Quality validation
pnpm check:enhanced        # Enhanced error reporting
pnpm test:pipeline         # Performance validation
```

### Troubleshooting Commands

```bash
pnpm health-check          # Diagnose environment issues
pnpm check:monorepo        # Fix workspace consistency
pnpm check:dependencies    # Validate dependency protocols
pnpm fix:monorepo          # Auto-fix workspace issues
pnpm check:enhanced        # Get detailed error analysis
```

This guide provides the foundation for productive development with the optimized Sparkle monorepo build pipeline. For specific troubleshooting scenarios, see the [Troubleshooting Guide](troubleshooting-guide.md).
