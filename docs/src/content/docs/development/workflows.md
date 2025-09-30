---
title: Development Workflows
description: Optimized development workflows and best practices for the Sparkle monorepo.
prev:
  link: /development/contributing/
  label: Contributing Guide
next:
  link: /development/troubleshooting/
  label: Troubleshooting Guide
---

This guide documents the optimized development workflows implemented in Sparkle, providing enhanced developer experience with faster feedback loops, comprehensive validation, and robust error handling.

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

### Fast Development Startup

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

### Enhanced Build Process

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

### Incremental TypeScript Compilation

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

### Comprehensive Health Check

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

### Workspace Consistency

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

### Continuous Quality Checks

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

### Build Pipeline Performance Testing

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

### Real-time Performance Monitoring

**Monitor build performance during development:**

```bash
# Build with timing information
time pnpm build

# Watch mode with performance feedback
pnpm build:types:watch  # Shows incremental compilation times
```

### Cache Effectiveness

**Turborepo caching optimization:**

```bash
# Build with cache summary
pnpm build --summarize

# Clear cache if needed
turbo prune
```

## Enhanced Error Reporting

### Error Categories

**The enhanced error reporting system categorizes errors:**

- 🚨 **TypeScript Errors**: Type checking failures with suggested fixes
- 🔥 **Build Errors**: Compilation and bundling failures
- 🔗 **Dependency Errors**: Workspace and package dependency issues
- 📦 **Import Errors**: Module resolution failures
- ⚡ **Syntax Errors**: Code syntax issues

### Error Suggestions

**Common error patterns and automatic suggestions:**

- **TS2307** (Module not found): Workspace protocol recommendations
- **TS2322** (Type incompatibility): Type assertion suggestions
- **TS2339** (Property not found): Typo detection and alternatives
- **TS2531** (Null/undefined): Optional chaining recommendations

### Cross-Package Error Context

**Enhanced context for monorepo errors:**

- File path to package name mapping
- Internal dependency relationship display
- Workspace-specific guidance for @sparkle/\* packages
- Distinction between internal and external dependency issues

## Advanced Development Patterns

### Package-Specific Development

**Focus on specific packages:**

```bash
# Build specific package
turbo run build --filter=@sparkle/ui

# Development for specific package
turbo run dev --filter=@sparkle/storybook

# Test specific package
turbo run test --filter=@sparkle/theme
```

### Dependency Analysis

**Understand package relationships:**

```bash
# Validate dependencies
pnpm check:dependencies

# View dependency graph
pnpm list --depth=1

# Check for circular dependencies
pnpm check:monorepo
```

### Build Optimization

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

### File Changes Workflow

**Recommended workflow for code changes:**

1. Start watch mode: `pnpm build:types:watch`
2. Make your changes
3. Watch for immediate TypeScript feedback
4. Run quality checks: `pnpm check`
5. Test changes: `pnpm test`

### Error Resolution Workflow

**When encountering errors:**

1. Use enhanced error reporting: `pnpm check:enhanced`
2. Follow specific suggestions provided
3. Run health check if environment issues: `pnpm health-check`
4. Validate workspace consistency: `pnpm check:monorepo`

### Performance Monitoring

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

## Next Steps

- Review the [Troubleshooting Guide](/development/troubleshooting/) for solutions to common issues
- Explore [Contributing Guidelines](/development/contributing/) for code contribution workflows
- Check the [Project Structure](/getting-started/project-structure/) documentation for architecture details
