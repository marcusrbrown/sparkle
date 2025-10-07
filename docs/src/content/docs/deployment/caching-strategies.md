---
title: Caching Strategies
description: Comprehensive guide to caching strategies for build artifacts, generated documentation, and deployment optimization in the Sparkle documentation site
---

This guide covers all caching strategies implemented in the Sparkle documentation site to optimize build times, reduce resource usage, and improve deployment performance.

## Overview

The documentation site implements multiple layers of caching:

- **Dependency Caching**: pnpm store and node_modules
- **Build Artifact Caching**: Turborepo build outputs
- **Generated Documentation Caching**: API docs and generated content
- **Astro Build Caching**: Incremental build artifacts
- **Remote Caching**: Shared cache across CI runs (optional)
- **Browser/CDN Caching**: Client-side performance optimization

## Dependency Caching

### pnpm Store Cache

The pnpm package manager cache is configured in `.github/actions/setup-ci`:

```yaml
- name: Setup pnpm cache
  uses: actions/cache@v4
  with:
    key: ${{ runner.os }}-pnpm-cache-v${{ year_month }}-${{ hashFiles('**/pnpm-lock.yaml') }}
    path: ${{ pnpm_store_path }}
    restore-keys: |
      ${{ runner.os }}-pnpm-cache-v${{ year_month }}-
```

**Key Structure:**

- `{OS}-pnpm-cache-v{YYYYMM}-{lockfile-hash}`
- Monthly rotation (`v{YYYYMM}`) ensures fresh cache periodically
- Lockfile hash ensures cache invalidation on dependency changes

**Benefits:**

- Reduces dependency installation time by ~80%
- Shared across all workflows in the repository
- Automatic cache eviction after 7 days of non-use (GitHub Actions default)

### Development Cache

Development artifacts are cached to speed up subsequent builds:

```yaml
- name: Restore development caches
  uses: actions/cache@v4
  with:
    key: ${{ runner.os }}-development-cache-${{ hashFiles('**/pnpm-lock.yaml', '**/*.ts', 'turbo.json') }}
    path: |
      .cache
      **/.tsdown
      **/.turbo
      **/coverage
      **/tsconfig.tsbuildinfo
```

**Cached Artifacts:**

- `.tsdown/` - TypeScript build cache
- `.turbo/` - Turborepo local cache
- `tsconfig.tsbuildinfo` - TypeScript incremental compilation info
- `coverage/` - Test coverage reports

**Cache Invalidation:**

- Changes to `pnpm-lock.yaml` (new dependencies)
- Changes to any TypeScript file
- Changes to `turbo.json` (build configuration)

## Build Artifact Caching

### Turborepo Local Cache

Turborepo automatically caches build outputs for tasks defined in `turbo.json`:

```json
{
  "tasks": {
    "docs:automation": {
      "outputs": [
        "src/content/docs/api/**",
        "src/content/docs/components/**",
        "src/generated/**"
      ],
      "cache": true
    }
  }
}
```

**How It Works:**

1. Turborepo computes a hash of task inputs (source files, dependencies)
2. If hash matches a cached build, outputs are restored from cache
3. Task is skipped, saving build time

**Cache Location:**

- Local: `node_modules/.cache/turbo/`
- Remote: GitHub Actions Cache (when configured)

### Turborepo Remote Caching (Optional)

Remote caching allows sharing build artifacts across CI runs and developers:

**Configuration:**

```yaml
# In GitHub Actions workflows
env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ secrets.TURBO_TEAM }}
```

**Setup Options:**

1. **Vercel Remote Cache (Recommended):**
   - Sign up at [Vercel](https://vercel.com/)
   - Create a team and get API token
   - Add secrets to GitHub repository

2. **GitHub Actions Cache:**
   - No additional setup required
   - Uses existing GitHub Actions cache storage
   - Limited to 10GB per repository

**Enable Remote Caching:**

```bash
# Using Vercel
turbo login
turbo link

# Or set environment variables
export TURBO_TOKEN="your-token"
export TURBO_TEAM="your-team"
```

**Benefits:**

- Shared cache across all CI runs
- Faster builds after first run (up to 50% time reduction)
- Reduced network bandwidth and build resources

## Generated Documentation Caching

### Documentation Artifacts Cache

Generated documentation is cached to avoid regeneration when source hasn't changed:

```yaml
- name: Cache generated documentation
  uses: actions/cache@v4
  with:
    key: docs-generated-${{ runner.os }}-${{ hashFiles('packages/*/src/**/*.{ts,tsx}', 'docs/scripts/**/*.ts', 'docs/typedoc.json') }}
    restore-keys: |
      docs-generated-${{ runner.os }}-
    path: |
      docs/src/content/docs/api/**
      docs/src/content/docs/components/**
      docs/src/generated/**
```

**Cache Key Components:**

1. `docs-generated` - Cache identifier
2. `{runner.os}` - Operating system (linux, macOS, windows)
3. Hash of:
   - All package source files (`packages/*/src/**/*.{ts,tsx}`)
   - Documentation generation scripts (`docs/scripts/**/*.ts`)
   - TypeDoc configuration (`docs/typedoc.json`)

**Cache Invalidation:**

- Any change to component source files
- Updates to documentation generation scripts
- TypeDoc configuration changes

**Restore Keys:**

- `docs-generated-{OS}-` - Partial match fallback
- Allows using slightly outdated cache if exact match not found
- Documentation automation will update only changed files

### API Documentation Cache

TypeDoc generates API documentation from TypeScript interfaces:

**Cache Strategy:**

- Included in generated documentation cache (above)
- TypeDoc output directory: `docs/src/content/docs/api/`
- Cached alongside component documentation

**Performance Impact:**

- TypeDoc generation time: ~15-30 seconds
- With cache: <1 second to restore
- **Savings**: ~95% reduction in API doc generation time

## Astro Build Caching

### Astro Framework Cache

Astro's incremental build system is cached to speed up rebuilds:

```yaml
- name: Cache Astro build artifacts
  uses: actions/cache@v4
  with:
    key: astro-build-${{ runner.os }}-${{ hashFiles('docs/**/*.{astro,md,mdx}', 'docs/astro.config.mjs', 'docs/package.json') }}
    restore-keys: |
      astro-build-${{ runner.os }}-
    path: |
      docs/.astro
      docs/node_modules/.astro
      docs/node_modules/.vite
```

**Cached Artifacts:**

- `docs/.astro/` - Astro build metadata and cache
- `docs/node_modules/.astro/` - Astro dependencies cache
- `docs/node_modules/.vite/` - Vite build cache

**Cache Key Components:**

1. `astro-build` - Cache identifier
2. `{runner.os}` - Operating system
3. Hash of:
   - Astro components (`docs/**/*.astro`)
   - Markdown content (`docs/**/*.{md,mdx}`)
   - Astro configuration (`docs/astro.config.mjs`)
   - Package dependencies (`docs/package.json`)

**Cache Invalidation:**

- Content changes (Markdown, MDX files)
- Component modifications (Astro, React components)
- Configuration updates (Astro, Vite)
- Dependency updates

**Performance Impact:**

- First build: ~45-60 seconds
- Cached incremental build: ~15-30 seconds
- **Savings**: ~50% reduction in build time

### Vite Build Cache

Vite (Astro's build tool) maintains its own cache:

**Cache Location:**

- `node_modules/.vite/` - Dependency pre-bundling cache
- Automatically managed by Vite

**Cache Strategy:**

- Cached as part of Astro build cache (above)
- Invalidated when dependencies change

## Cache Monitoring and Reporting

### Cache Hit/Miss Reporting

Both deployment workflows report cache status:

```yaml
- name: Report cache status
  run: |
    echo "### 💾 Cache Status" >> "$GITHUB_STEP_SUMMARY"
    echo "" >> "$GITHUB_STEP_SUMMARY"
    echo "| Cache Type | Status |" >> "$GITHUB_STEP_SUMMARY"
    echo "|------------|--------|" >> "$GITHUB_STEP_SUMMARY"

    if [ "${{ steps.cache-generated-docs.outputs.cache-hit }}" = "true" ]; then
      echo "| Generated Documentation | ✅ Cache Hit |" >> "$GITHUB_STEP_SUMMARY"
    else
      echo "| Generated Documentation | ⚠️ Cache Miss |" >> "$GITHUB_STEP_SUMMARY"
    fi
```

**Where to Find:**

- GitHub Actions workflow run summary
- Visible in each workflow execution

**Interpreting Results:**

- ✅ **Cache Hit**: Cached artifacts restored successfully
- ⚠️ **Cache Miss**: No matching cache found, generating from scratch

### Performance Metrics

Build performance is automatically tracked:

```yaml
- name: Analyze build performance
  run: |
    TOTAL_SIZE=$(du -sb ./docs/dist | cut -f1)
    FILE_COUNT=$(find ./docs/dist -type f | wc -l)

    cat >> "$GITHUB_STEP_SUMMARY" << EOF
    ### 📊 Build Performance Metrics

    | Metric | Value |
    |--------|-------|
    | Total Bundle Size | ${TOTAL_SIZE_MB}MB |
    | Total Files | $FILE_COUNT |
    EOF
```

**Tracked Metrics:**

- Total bundle size
- File count
- JavaScript chunk count
- Largest chunks

**Performance Thresholds:**

| Metric            | Excellent | Good    | Needs Improvement |
| ----------------- | --------- | ------- | ----------------- |
| Build Time        | <60s      | 60-120s | >120s             |
| Total Bundle Size | <20MB     | 20-30MB | >30MB             |
| Cache Hit Rate    | >80%      | 50-80%  | <50%              |

## Cache Invalidation Strategies

### Automatic Invalidation

Caches are automatically invalidated when:

1. **Source File Changes:**
   - Component modifications
   - TypeScript/JavaScript changes
   - Documentation script updates

2. **Configuration Changes:**
   - `turbo.json` updates
   - `astro.config.mjs` modifications
   - `typedoc.json` changes

3. **Dependency Updates:**
   - `pnpm-lock.yaml` changes
   - `package.json` modifications

### Manual Cache Invalidation

**Force Rebuild (Workflow Dispatch):**

```yaml
# deploy-docs.yaml
workflow_dispatch:
  inputs:
    force-rebuild:
      description: Force rebuild documentation (skip cache)
      type: boolean
      default: false
```

**Usage:**

1. Go to **Actions** → **Deploy Documentation**
2. Click **Run workflow**
3. Enable **force-rebuild** option
4. Click **Run workflow**

**Force Regeneration (Workflow Dispatch):**

```yaml
# regenerate-docs.yaml
workflow_dispatch:
  inputs:
    force:
      description: Force regeneration of all documentation
      type: boolean
      default: false
```

**Clear GitHub Actions Cache:**

```bash
# Using GitHub CLI
gh cache list
gh cache delete <cache-id>

# Or delete all caches
gh cache delete --all
```

### Cache Expiration

GitHub Actions automatically manages cache lifecycle:

- **Maximum Cache Size**: 10GB per repository
- **Cache Retention**: 7 days since last access
- **Oldest Caches Evicted First**: When 10GB limit reached

**Best Practices:**

- Keep cache keys specific to avoid pollution
- Use monthly rotation for dependency caches
- Monitor cache usage with `gh cache list`

## Browser and CDN Caching

### Static Asset Caching

Astro generates content-hashed filenames for optimal caching:

**Asset Naming Strategy:**

```text
_astro/button.abc123def.js   # JavaScript
_astro/styles.xyz789uvw.css   # CSS
images/logo.hash.png          # Images
```

**Cache Headers (GitHub Pages):**

- Static assets: `Cache-Control: public, max-age=31536000, immutable`
- HTML pages: `Cache-Control: public, max-age=0, must-revalidate`

### CDN Caching (GitHub Pages)

GitHub Pages uses Fastly CDN:

**Cache Behavior:**

- Assets cached globally across CDN edge nodes
- HTML pages cached with short TTL (5 minutes)
- HTTPS certificates cached and renewed automatically

**Cache Invalidation:**

- Automatic on new deployment
- Content-hashed assets never need invalidation
- HTML pages invalidated within 5 minutes

## Troubleshooting

### Cache Not Restoring

**Symptom:**

- Workflow always shows cache miss
- Build time not improving

**Diagnosis:**

```bash
# Check cache key
echo "Key: ${{ steps.cache.outputs.cache-matched-key }}"

# List available caches
gh cache list
```

**Solutions:**

1. **Verify cache key hash inputs:**
   - Ensure files in `hashFiles()` exist
   - Check file paths are correct
   - Confirm glob patterns match intended files

2. **Check cache size:**
   - GitHub Actions has 10GB cache limit
   - Older caches may be evicted

3. **Review restore keys:**
   - Ensure restore keys provide fallback
   - Check for typos in cache key pattern

### Cache Causing Stale Builds

**Symptom:**

- Documentation not updating after source changes
- Old content in production

**Diagnosis:**

```bash
# Check if source files in cache key
cat .github/workflows/deploy-docs.yaml | grep -A 10 "cache-generated-docs"
```

**Solutions:**

1. **Manual cache invalidation:**

   ```bash
   gh cache delete --all
   ```

2. **Force rebuild:**
   - Use workflow dispatch with `force-rebuild: true`

3. **Review cache key:**
   - Ensure all relevant source files included
   - Add missing paths to `hashFiles()`

### Turborepo Cache Not Working

**Symptom:**

- Tasks rebuilding every time
- No cache hits in Turborepo

**Diagnosis:**

```bash
# Check Turborepo cache
pnpm turbo run build --dry-run

# Verify cache configuration
cat turbo.json | grep -A 5 "cache"
```

**Solutions:**

1. **Check task configuration:**

   ```json
   {
     "tasks": {
       "build": {
         "cache": true,
         "outputs": ["dist/**"]
       }
     }
   }
   ```

2. **Verify inputs are stable:**
   - Ensure no dynamic timestamps in source
   - Check for random values in builds

3. **Remote cache not configured:**
   - Verify `TURBO_TOKEN` and `TURBO_TEAM` secrets
   - Check token validity

### GitHub Actions Cache Full

**Symptom:**

- Warning: "Cache size exceeds 10GB limit"
- Old caches being evicted

**Diagnosis:**

```bash
# List all caches with sizes
gh cache list --json | jq '.[] | {key: .key, size: .sizeInBytes}'

# Calculate total size
gh cache list --json | jq '[.[].sizeInBytes] | add'
```

**Solutions:**

1. **Delete unnecessary caches:**

   ```bash
   # Delete old development caches
   gh cache delete --pattern "*-development-cache-*"

   # Delete specific cache
   gh cache delete "cache-key-here"
   ```

2. **Reduce cache size:**
   - Exclude large, unnecessary files
   - Use more specific cache paths
   - Implement monthly rotation for all caches

3. **Use Turborepo remote cache:**
   - Offload build cache to Vercel
   - Reduces GitHub Actions cache usage

## Best Practices

### Cache Key Design

1. **Use Hierarchical Keys:**

   ```text
   {prefix}-{os}-{specificity}-{hash}
   ```

2. **Include All Relevant Inputs:**
   - Source files that affect output
   - Configuration files
   - Dependencies

3. **Provide Restore Keys:**

   ```yaml
   restore-keys: |
     docs-generated-${{ runner.os }}-
   ```

4. **Implement Rotation:**
   - Monthly for dependency caches
   - Weekly for development caches

### Cache Management

1. **Monitor Cache Usage:**

   ```bash
   gh cache list
   ```

2. **Regular Cleanup:**
   - Delete old caches monthly
   - Remove unused cache patterns

3. **Document Cache Keys:**
   - Explain cache key components
   - Document invalidation triggers

### Performance Optimization

1. **Layer Caches:**
   - Dependencies (changes rarely)
   - Build artifacts (changes occasionally)
   - Generated content (changes frequently)

2. **Parallelize Cache Operations:**
   - Restore multiple caches simultaneously
   - Use separate steps for independent caches

3. **Optimize Cache Paths:**
   - Include only necessary files
   - Exclude large, regeneratable files

## Related Documentation

- [Build Optimization Guide](/deployment/build-optimization) - Comprehensive build performance optimization
- [GitHub Pages Setup](/deployment/github-pages-setup) - Deployment configuration and workflows
- [Custom Domain Setup](/deployment/custom-domain-setup) - DNS and domain configuration
- [Turborepo Documentation](https://turbo.build/repo/docs) - Official Turborepo caching guide
- [GitHub Actions Caching](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows) - Official caching documentation
