# Build Pipeline Testing Infrastructure

This directory contains automated test suites that validate the build pipeline performance, correctness, and reliability across the Sparkle monorepo. These tests were implemented as part of TASK-027 from issue #841.

## Test Overview

The testing infrastructure provides comprehensive coverage of build pipeline optimization results from previous phases (TASK-022 through TASK-026):

### Test Suites

1. **`build-pipeline-performance.test.ts`** - TEST-001: Performance benchmarks
2. **`cross-package-types.test.ts`** - TEST-002: Cross-package type validation
3. **`incremental-build.test.ts`** - TEST-003: TypeScript incremental compilation
4. **`workspace-consistency.test.ts`** - TEST-004: Workspace validation
5. **`development-workflow.test.ts`** - TEST-005: Development workflow testing
6. **`build-artifacts-and-cache.test.ts`** - TEST-006 & TEST-007: Artifacts and cache validation

## Usage

### Running Individual Test Suites

```bash
# Performance benchmarks
pnpm test:build-pipeline

# Cross-package type checking
pnpm test:cross-package

# Incremental build validation
pnpm test:incremental

# Workspace consistency checks
pnpm test:workspace

# Development workflow testing
pnpm test:dev-workflow

# Build artifacts and cache validation
pnpm test:artifacts
```

### Running Complete Pipeline Tests

```bash
# Run all build pipeline tests in sequence
pnpm test:pipeline
```

### Running in Watch Mode

```bash
# Run specific test in watch mode
pnpm vitest test/build-pipeline-performance.test.ts --watch

# Run all tests in watch mode
pnpm test:watch
```

## Performance Targets

The tests validate against established performance benchmarks:

- **Full build time**: < 180 seconds
- **Incremental build time**: < 30 seconds
- **Type checking time**: < 10 seconds
- **Cache hit ratio**: > 80%
- **Individual package builds**: < 30 seconds each

## Test Architecture

### Framework and Configuration

- **Vitest**: Primary testing framework with ESM support
- **Extended timeouts**: Build operations use 2-3 minute timeouts
- **Real command execution**: Tests use actual `pnpm` and `tsc` commands
- **Cleanup procedures**: Automated artifact cleanup between tests

### Key Features

1. **Performance Measurement**: Precise timing of build operations using `performance.now()`
2. **Cache Analysis**: Turborepo cache statistics parsing and validation
3. **File System Validation**: Build artifacts and TypeScript build info verification
4. **Error Detection**: Cross-package type errors and dependency issues
5. **Development Workflow**: Watch mode and hot reload testing

### Test Structure

Each test suite follows a consistent pattern:

```typescript
describe('Test Suite Name', () => {
  beforeAll(() => {
    // Setup and cleanup
  }, TEST_TIMEOUT)

  it('should validate specific behavior', () => {
    // Test implementation with proper timing
  }, BUILD_TIMEOUT)

  afterAll(() => {
    // Final cleanup
  })
})
```

## Integration with CI/CD

The test infrastructure is designed to integrate with continuous integration:

### GitHub Actions Integration

```yaml
- name: Run Build Pipeline Tests
  run: pnpm test:pipeline
  timeout-minutes: 10
```

### Quality Gates

Tests serve as quality gates for:

- Performance regression detection
- TypeScript project reference correctness
- Turborepo cache effectiveness
- Workspace dependency consistency
- Build artifact generation

## Troubleshooting

### Common Issues

1. **Timeout Errors**: Increase `BUILD_TIMEOUT` or `TEST_TIMEOUT` constants for slower environments
2. **Build Failures**: Ensure all packages have proper build scripts and dependencies
3. **Cache Issues**: Clear `.turbo` directories if cache state becomes corrupted
4. **Type Errors**: Verify TypeScript project references are correctly configured

### Debug Mode

For detailed output during test runs:

```bash
# Run with verbose output
pnpm vitest test/build-pipeline-performance.test.ts --reporter=verbose

# Run with debug logging
DEBUG=* pnpm test:build-pipeline
```

### Performance Analysis

The test suite outputs detailed performance reports including:

- Individual package build times
- Cache hit ratios
- Type checking duration
- Build consistency metrics

## Maintenance

### Updating Performance Targets

Modify the `PERFORMANCE_TARGETS` constants in each test file:

```typescript
const PERFORMANCE_TARGETS = {
  FULL_BUILD_TIME: 180, // Adjust based on infrastructure
  INCREMENTAL_BUILD_TIME: 30,
  TYPE_CHECK_TIME: 10,
  CACHE_HIT_RATIO: 0.8,
}
```

### Adding New Tests

1. Create new test file following naming convention: `*.test.ts`
2. Add corresponding script to root `package.json`
3. Include in `test:pipeline` script for comprehensive validation
4. Update this documentation

## Dependencies

The test infrastructure relies on:

- **Vitest**: Testing framework
- **Node.js**: File system operations and process execution
- **pnpm**: Package manager and workspace commands
- **Turborepo**: Build orchestration and caching
- **TypeScript**: Type checking and incremental compilation

## Results and Metrics

Tests generate comprehensive metrics including:

- Build duration measurements
- Cache effectiveness statistics
- Type checking performance
- Package-level build times
- Build consistency analysis

All metrics are logged using `console.warn()` for visibility in test output while maintaining ESLint compliance.
