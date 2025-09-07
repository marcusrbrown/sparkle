# Sparkle Troubleshooting Guide

This guide provides solutions to common development issues in the Sparkle monorepo, leveraging the enhanced error reporting and validation tools implemented in the Infrastructure Build Pipeline Optimization project.

## Quick Diagnostics

### First Steps for Any Issue

```bash
# Run comprehensive health check
pnpm health-check

# Check workspace consistency
pnpm check:monorepo

# Validate development environment
pnpm check:enhanced
```

These commands will identify most common issues and provide specific guidance for resolution.

## Common Issues and Solutions

### TypeScript Compilation Errors

#### Issue: "Cannot find module" errors (TS2307)

**Symptoms:**

```
error TS2307: Cannot find module '@sparkle/ui' or its corresponding type declarations.
```

**Solutions:**

1. **Check workspace protocol usage:**

   ```bash
   pnpm check:dependencies
   ```

2. **Verify project references:**

   ```bash
   tsc --build --dry
   ```

3. **Rebuild with clean state:**

   ```bash
   pnpm clean
   pnpm build
   ```

4. **Check package.json dependencies:**
   - Internal packages should use `workspace:*`
   - External packages should have consistent versions

#### Issue: Incremental compilation not working

**Symptoms:**

- TypeScript watch mode rebuilds everything
- `.tsbuildinfo` files not created
- Slow compilation times

**Solutions:**

1. **Verify TypeScript configuration:**

   ```bash
   # Check tsconfig.json has incremental: true
   grep -r "incremental" tsconfig.json packages/*/tsconfig.json
   ```

2. **Clean and restart incremental compilation:**

   ```bash
   rm -rf packages/*/.tsbuildinfo tsconfig.tsbuildinfo
   pnpm build:types:watch
   ```

3. **Check project references are properly configured:**
   ```bash
   pnpm health-check  # Validates project references
   ```

#### Issue: Type errors across package boundaries

**Symptoms:**

- Types not found in dependent packages
- Circular dependency errors
- IntelliSense not working across packages

**Solutions:**

1. **Verify build order:**

   ```bash
   turbo run build --dry  # Should show correct dependency order
   ```

2. **Check TypeScript project references:**

   ```bash
   # Each package's tsconfig.json should reference its dependencies
   pnpm check:enhanced  # Provides detailed error analysis
   ```

3. **Rebuild type declarations:**
   ```bash
   pnpm build:types
   ```

### Build Pipeline Issues

#### Issue: Turborepo cache issues

**Symptoms:**

- Unexpected cache misses
- Stale build outputs
- Cache-related build failures

**Solutions:**

1. **Clear Turbo cache:**

   ```bash
   turbo prune
   pnpm build
   ```

2. **Check cache configuration:**

   ```bash
   pnpm check:turbo  # Validates turbo.json configuration
   ```

3. **Verify inputs/outputs configuration:**

   ```bash
   turbo run build --dry  # Shows cache configuration
   ```

4. **Disable cache temporarily:**
   ```bash
   turbo run build --force
   ```

#### Issue: Build artifacts missing or corrupted

**Symptoms:**

- Import errors for built packages
- Missing `.d.ts` files
- Incorrect build outputs

**Solutions:**

1. **Validate build artifacts:**

   ```bash
   pnpm test:artifacts  # Comprehensive artifact validation
   ```

2. **Clean and rebuild:**

   ```bash
   pnpm clean
   pnpm build
   ```

3. **Check package export configuration:**
   ```bash
   # Verify package.json exports field is correct
   node scripts/validate-exports.ts
   ```

### Workspace Consistency Issues

#### Issue: Package dependency protocol violations

**Symptoms:**

- manypkg validation failures
- Inconsistent dependency versions
- Workspace installation issues

**Solutions:**

1. **Auto-fix workspace issues:**

   ```bash
   pnpm fix:monorepo
   ```

2. **Validate dependency protocols:**

   ```bash
   pnpm check:dependencies
   ```

3. **Manual dependency fixing:**
   ```bash
   # Change internal dependencies to workspace:*
   # In package.json:
   # "@sparkle/ui": "workspace:*"
   pnpm install
   ```

#### Issue: Version mismatches across packages

**Symptoms:**

- External dependencies with different versions
- Package installation conflicts
- Runtime compatibility issues

**Solutions:**

1. **Check dependency consistency:**

   ```bash
   pnpm check:monorepo
   ```

2. **Update dependencies consistently:**

   ```bash
   pnpm update --recursive
   ```

3. **Use exact versions for external dependencies:**
   ```bash
   # In package.json, use exact versions:
   # "react": "18.2.0" instead of "^18.2.0"
   ```

### Development Server Issues

#### Issue: Development server startup failures

**Symptoms:**

- `pnpm dev` fails to start
- Port conflicts
- Module resolution errors

**Solutions:**

1. **Check health status first:**

   ```bash
   pnpm health-check
   ```

2. **Start servers individually:**

   ```bash
   # Debug by starting each server separately
   turbo run dev --filter=@sparkle/ui
   turbo run dev --filter=@sparkle/storybook
   ```

3. **Clear ports and restart:**
   ```bash
   # Kill processes on common ports
   lsof -ti:3000,6006,5173 | xargs kill -9
   pnpm dev
   ```

#### Issue: Hot reload not working

**Symptoms:**

- Changes not reflected automatically
- Manual refresh required
- Watch mode not detecting changes

**Solutions:**

1. **Check TypeScript watch mode:**

   ```bash
   # Ensure watch mode is running
   pnpm build:types:watch
   ```

2. **Verify file watching configuration:**

   ```bash
   # Check if file system watching is working
   pnpm test:dev-workflow  # Tests watch functionality
   ```

3. **Restart development servers:**
   ```bash
   # Kill and restart development processes
   pkill -f "turbo run dev"
   pnpm dev
   ```

### Performance Issues

#### Issue: Slow build times

**Symptoms:**

- Builds taking longer than expected
- Poor cache hit rates
- Excessive compilation times

**Solutions:**

1. **Run performance benchmarks:**

   ```bash
   pnpm test:build-pipeline  # Identifies performance bottlenecks
   ```

2. **Check cache effectiveness:**

   ```bash
   turbo run build --summarize  # Shows cache statistics
   ```

3. **Optimize TypeScript configuration:**

   ```bash
   # Ensure incremental compilation is enabled
   grep -r "incremental.*true" tsconfig.json packages/*/tsconfig.json
   ```

4. **Analyze build dependencies:**
   ```bash
   turbo run build --dry  # Shows build dependency graph
   ```

#### Issue: Memory usage during builds

**Symptoms:**

- Out of memory errors
- System slowdowns during builds
- Build process crashes

**Solutions:**

1. **Increase Node.js memory limit:**

   ```bash
   export NODE_OPTIONS="--max-old-space-size=8192"
   pnpm build
   ```

2. **Build packages sequentially:**

   ```bash
   turbo run build --concurrency=1
   ```

3. **Clear memory-intensive processes:**
   ```bash
   # Clear TypeScript build info and restart
   rm -rf packages/*/.tsbuildinfo
   pnpm build:types
   ```

### Error Reporting Issues

#### Issue: Enhanced error reporting not working

**Symptoms:**

- Plain error messages without enhancement
- Missing suggestions or context
- Error formatting issues

**Solutions:**

1. **Verify enhanced error reporter setup:**

   ```bash
   # Test enhanced error reporting directly
   tsx scripts/enhanced-error-reporter.ts tsc --noEmit
   ```

2. **Use enhanced commands:**

   ```bash
   # Use enhanced versions for better error reporting
   pnpm check:enhanced
   pnpm build:enhanced
   ```

3. **Check script configuration:**
   ```bash
   # Verify scripts are properly configured in package.json
   cat package.json | grep -A5 -B5 "enhanced"
   ```

## Environment Setup Issues

### Node.js Version Issues

**Symptoms:**

- Compatibility warnings
- Build failures with version-specific errors
- Package installation issues

**Solutions:**

1. **Check Node.js version:**

   ```bash
   node --version  # Should be >= 22.13.1
   ```

2. **Update Node.js if needed:**

   ```bash
   # Use nvm or similar tool
   nvm install 22.13.1
   nvm use 22.13.1
   ```

3. **Verify environment:**
   ```bash
   pnpm health-check  # Validates all tool versions
   ```

### Package Manager Issues

**Symptoms:**

- pnpm installation failures
- Workspace resolution issues
- Lock file conflicts

**Solutions:**

1. **Clear pnpm cache:**

   ```bash
   pnpm store prune
   pnpm install
   ```

2. **Reset workspace:**

   ```bash
   rm -rf node_modules packages/*/node_modules
   rm pnpm-lock.yaml
   pnpm install
   ```

3. **Verify pnpm configuration:**
   ```bash
   pnpm --version  # Should be >= 10.9.0
   cat pnpm-workspace.yaml  # Should include packages/* and apps/*
   ```

## Advanced Troubleshooting

### Deep Debugging Techniques

#### Enable verbose logging

```bash
# TypeScript verbose compilation
tsc --build --verbose

# Turbo verbose output
turbo run build --verbosity=2

# pnpm verbose installation
pnpm install --loglevel=verbose
```

#### Analyze build artifacts

```bash
# Test build artifacts comprehensively
pnpm test:artifacts

# Check package exports
node scripts/validate-exports.ts

# Validate build outputs
node scripts/validate-build.ts
```

#### Monitor file system changes

```bash
# Test development workflow thoroughly
pnpm test:dev-workflow

# Watch file changes manually
npx chokidar "packages/*/src/**" --command "echo {path} changed"
```

### Integration Issues

#### IDE TypeScript Issues

**Solutions:**

1. **Reload TypeScript in VS Code:**
   - Command Palette → "TypeScript: Reload Project"

2. **Verify workspace TypeScript version:**

   ```bash
   npx tsc --version  # Should match project version
   ```

3. **Check TypeScript project references:**
   ```bash
   # Ensure IDE can find project references
   tsc --build --dry
   ```

#### Git Hooks Issues

**Solutions:**

1. **Reinstall git hooks:**

   ```bash
   pnpm postinstall
   ```

2. **Verify hook configuration:**

   ```bash
   cat package.json | grep -A10 "simple-git-hooks"
   ```

3. **Test hooks manually:**
   ```bash
   pnpm exec nano-staged
   ```

## Recovery Procedures

### Complete Environment Reset

If multiple issues persist, perform a complete reset:

```bash
# 1. Clear all build artifacts and dependencies
pnpm clean
rm -rf node_modules packages/*/node_modules apps/*/node_modules
rm pnpm-lock.yaml

# 2. Clear TypeScript build info
rm -rf packages/*/.tsbuildinfo tsconfig.tsbuildinfo

# 3. Clear Turbo cache
turbo prune

# 4. Reinstall and rebuild
pnpm bootstrap
pnpm build

# 5. Verify environment
pnpm health-check
pnpm check
```

### Selective Package Reset

For issues with specific packages:

```bash
# Reset specific package
rm -rf packages/{package-name}/node_modules
rm -rf packages/{package-name}/dist
rm -rf packages/{package-name}/.tsbuildinfo

# Rebuild specific package
turbo run build --filter={package-name}

# Test specific package
turbo run test --filter={package-name}
```

## Getting Help

### Diagnostic Information to Collect

When reporting issues or seeking help:

1. **Environment information:**

   ```bash
   pnpm health-check  # Provides complete environment status
   ```

2. **Error details:**

   ```bash
   pnpm check:enhanced  # Enhanced error reporting with context
   ```

3. **Build performance:**
   ```bash
   pnpm test:build-pipeline  # Performance metrics and analysis
   ```

### Useful Commands for Issue Reporting

```bash
# Complete diagnostic suite
pnpm health-check
pnpm check:enhanced
pnpm test:pipeline
pnpm check:monorepo

# Version information
node --version
pnpm --version
npx tsc --version
npx turbo --version

# Workspace status
pnpm list --depth=0
turbo run build --dry
```

## Prevention Best Practices

### Regular Maintenance

```bash
# Daily development routine
pnpm health-check     # Start with environment validation
pnpm check           # Regular quality validation
pnpm test:pipeline   # Weekly performance validation

# Weekly maintenance
pnpm update          # Keep dependencies current
turbo prune          # Clear unnecessary cache
pnpm store prune     # Clean pnpm store
```

### Code Quality Practices

1. **Use enhanced error reporting:** Always use `pnpm check:enhanced` for better diagnostics
2. **Monitor performance:** Run `pnpm test:build-pipeline` regularly
3. **Validate workspace:** Include `pnpm check:monorepo` in routine checks
4. **Leverage incremental builds:** Use `pnpm build:types:watch` during development

This troubleshooting guide should resolve most issues encountered in the Sparkle development environment. For additional support, the enhanced error reporting system provides context-specific guidance for resolving complex issues.
