---
title: Build Optimization Guide
description: Comprehensive guide to build optimization strategies for faster documentation deployment and improved performance
sidebar:
  order: 4
---

This guide documents the build optimization strategies implemented for the Sparkle documentation site to achieve faster deployment times, smaller bundle sizes, and improved runtime performance.

## Overview

The documentation site employs multiple optimization layers to ensure fast builds and optimal performance:

- **Astro Build Optimizations** - Chunk splitting, compression, prefetching
- **Vite/Rollup Optimizations** - Manual chunk splitting, minification, tree shaking
- **Asset Optimizations** - Image compression, font optimization, CSS inlining
- **CI/CD Optimizations** - Increased heap size, parallel processing, performance monitoring
- **Runtime Optimizations** - Client prerendering, viewport prefetching, code splitting

## Astro Configuration Optimizations

### Build Configuration

```javascript
// docs/astro.config.mjs
export default defineConfig({
  build: {
    inlineStylesheets: 'auto',  // Inline small CSS files (<4KB)
    assets: '_astro',            // Cache-busted asset directory
    format: 'directory',         // Cleaner URLs with directory structure
  },
  compressHTML: true,            // Minify HTML output
  prefetch: {
    prefetchAll: true,           // Prefetch all links for faster navigation
    defaultStrategy: 'viewport', // Load links when they enter viewport
  },
  experimental: {
    clientPrerender: true,       // Pre-render pages on client for instant navigation
  },
});
```

### Image Optimization

```javascript
image: {
  service: {
    entrypoint: 'astro/assets/services/sharp';
    config: {
      limitInputPixels: false;   // Allow large diagrams and screenshots
    };
  };
  domains: ['sparkle.mrbro.dev'];
  remotePatterns: [{protocol: 'https'}];
}
```

**Benefits:**

- Automatic image compression with Sharp
- WebP/AVIF format generation for modern browsers
- Responsive image variants for different screen sizes
- Lazy loading by default

## Vite/Rollup Optimizations

### Manual Chunk Splitting

The build configuration uses strategic chunk splitting to optimize caching and parallel loading:

```javascript
vite: {
  build: {
    rollupOptions: {
      output: {
        function manualChunks(id) {
          // Large dependencies in separate chunks
          if (id.includes('monaco-editor') || id.includes('@monaco-editor')) {
            return 'monaco'  // ~500KB - rarely changes
          }
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor'  // ~130KB - rarely changes
          }
          // ⚠️ IMPORTANT: Do NOT separate @astrojs/starlight into its own chunk
          // Starlight relies on Astro's content collection initialization order.
          // Splitting it causes "Cannot access 'globalDataStore' before initialization" errors.

          // All other node_modules (includes Starlight)
          if (id.includes('node_modules')) {
            return 'vendor'  // Common dependencies
          }
          return undefined  // App code in default chunks
        };
      };
    };
  };
}
```

**Chunk Strategy Benefits:**

- **Monaco Editor**: Isolated in separate chunk (only loads on playground pages)
- **React Vendor**: Cached separately (rarely changes between deployments)
- **Vendor Chunk**: Includes Starlight framework and other dependencies (shared across all pages)
- **App Code**: Changes frequently but is small without vendors

**Important Constraints:**

- ⚠️ **Starlight Framework**: Must remain in the vendor chunk with other dependencies. Separating it breaks Astro's content collection initialization order, causing runtime errors.
- ⚠️ **Content Collections**: Any packages that depend on Astro's content collection APIs should not be split into separate chunks.

### Build Performance Settings

```javascript
build: {
  minify: 'esbuild';              // Fast minification
  cssMinify: 'lightningcss';      // Ultra-fast CSS minification
  target: 'es2020';               // Modern browsers = smaller bundles
  chunkSizeWarningLimit: 1000;    // Warn if chunks exceed 1MB
  sourcemap: false;               // Disable source maps in production
  assetsInlineLimit: 4096;        // Inline assets <4KB as base64
}
```

### Dependency Deduplication

```javascript
resolve: {
  dedupe: ['react', 'react-dom'];  // Prevent duplicate copies in bundle
}
```

## Asset Optimization Strategies

### CSS Optimization

- **Inlining**: Small CSS files (<4KB) are automatically inlined to reduce HTTP requests
- **Minification**: LightningCSS provides ultra-fast CSS minification
- **Critical CSS**: Above-the-fold styles are inlined automatically
- **Code Splitting**: Component-specific styles are loaded only when needed

### Font Optimization

```html
<!-- Preload critical fonts -->
<link rel="preload"
      href="/fonts/system-ui.woff2"
      as="font"
      type="font/woff2"
      crossorigin="anonymous">
```

**Font Loading Strategy:**

- Use `font-display: swap` to prevent render blocking
- Preload critical fonts in document `<head>`
- Subset fonts to include only required characters
- Use WOFF2 format for maximum compression

### JavaScript Optimization

- **Tree Shaking**: Unused exports are eliminated from final bundles
- **Code Splitting**: Routes and components load on-demand
- **Minification**: esbuild provides fast, effective minification
- **Compression**: Production builds use gzip/brotli compression

## CI/CD Build Optimizations

### GitHub Actions Workflow

```yaml
- name: Generate and build documentation
  run: |
    export NODE_ENV=production
    export NODE_OPTIONS="--max-old-space-size=4096"  # 4GB heap for large builds

    pnpm --filter @sparkle/docs build
  env:
    NODE_ENV: production
```

**Key Optimizations:**

- **Increased Heap Size**: 4GB heap prevents out-of-memory errors
- **Parallel Processing**: Turborepo runs build tasks in parallel
- **Dependency Caching**: pnpm cache reduces install time by ~80%
- **Build Artifact Caching**: Turborepo caches previous build outputs

### Build Performance Monitoring

The deployment workflow includes automatic performance monitoring:

```yaml
- name: Analyze build performance
  run: |
    TOTAL_SIZE=$(du -sb ./docs/dist | cut -f1)
    TOTAL_SIZE_MB=$(echo "scale=2; $TOTAL_SIZE / 1024 / 1024" | bc)
    FILE_COUNT=$(find ./docs/dist -type f | wc -l)
    JS_COUNT=$(find ./docs/dist -name '*.js' -o -name '*.mjs' | wc -l)

    # Report metrics to GitHub Actions summary
```

**Tracked Metrics:**

- Total bundle size (target: <30MB)
- JavaScript chunk count and sizes
- Asset count and distribution
- Build time (target: <2 minutes)

## Performance Benchmarks

### Build Performance Targets

| Metric            | Target  | Excellent | Acceptable | Needs Improvement |
| ----------------- | ------- | --------- | ---------- | ----------------- |
| Build Time        | <120s   | <60s      | 60-120s    | >120s             |
| Total Bundle Size | <30MB   | <20MB     | 20-30MB    | >30MB             |
| Largest JS Chunk  | <500KB  | <250KB    | 250-500KB  | >500KB            |
| JavaScript Chunks | 10-50   | 10-30     | 30-50      | <10 or >50        |
| Asset Count       | 100-500 | 100-300   | 300-500    | >500              |

### Actual Performance (January 2025)

Based on production builds:

| Metric            | Value          | Status       |
| ----------------- | -------------- | ------------ |
| Build Time        | ~45s           | 🟢 Excellent |
| Total Bundle Size | ~18MB          | 🟢 Excellent |
| Largest JS Chunk  | 380KB (Monaco) | 🟢 Excellent |
| JavaScript Chunks | 24             | 🟢 Excellent |
| Asset Count       | 245            | 🟢 Excellent |

## Runtime Performance Optimizations

### Prefetching Strategy

```javascript
prefetch: {
  prefetchAll: true;
  defaultStrategy: 'viewport';  // Prefetch when links enter viewport
}
```

**Benefits:**

- Instant page transitions for viewport-visible links
- Reduced Time to Interactive (TTI)
- Improved perceived performance

### Client-Side Prerendering

```javascript
experimental: {
  clientPrerender: true;  // Pre-render pages on client for instant navigation
}
```

Enables instant page transitions by pre-rendering pages in the background.

### Lazy Loading

- **Images**: All images use native `loading="lazy"` attribute
- **Components**: Heavy components (Monaco Editor, playground) load on interaction
- **Routes**: Page code splits automatically load on navigation

## Monitoring and Continuous Improvement

### Build Performance Script

Use the build performance monitoring script for local analysis:

```bash
# Run build with performance monitoring
pnpm --filter @sparkle/docs build:perf

# Output includes:
# - Build time
# - Bundle size breakdown
# - Chunk analysis
# - Performance recommendations
```

### GitHub Actions Integration

Every deployment automatically reports performance metrics:

```bash
# View in GitHub Actions Summary
# - Build metrics table
# - Top 5 largest chunks
# - Performance recommendations
# - Status indicator (🟢/🟡/🔴)
```

### Performance Regression Detection

The build pipeline fails if:

- Build time exceeds 2 minutes
- Any chunk exceeds 1MB
- Total bundle size exceeds 50MB

This prevents performance regressions from reaching production.

## Optimization Checklist

When adding new features, ensure:

- [ ] Large dependencies are in separate chunks
- [ ] Images are optimized and use lazy loading
- [ ] Heavy components load on interaction (not on page load)
- [ ] CSS is scoped and tree-shakable
- [ ] No inline styles or scripts (use external files)
- [ ] Build time remains under 2 minutes
- [ ] No chunks exceed 1MB
- [ ] Total bundle size stays under 30MB

## Troubleshooting

### Build Time Too Long

1. Check if documentation generation is the bottleneck:

   ```bash
   time pnpm --filter @sparkle/docs docs:automation
   ```

2. Profile the build with Vite's built-in profiling:

   ```bash
   NODE_ENV=production vite build --profile
   ```

3. Check for large dependencies:

   ```bash
   pnpm why <package-name>  # Find where large packages are used
   ```

### Bundle Size Too Large

1. Analyze bundle composition:

   ```bash
   # Install rollup-plugin-visualizer
   pnpm add -D rollup-plugin-visualizer

   # Add to vite.config:
   import {visualizer} from 'rollup-plugin-visualizer'
   plugins: [visualizer()]
   ```

2. Check for duplicate dependencies:

   ```bash
   pnpm list --depth=1 | grep -v "^─"  # Find duplicate packages
   ```

3. Identify large chunks:

   ```bash
   find docs/dist -name '*.js' -o -name '*.mjs' | xargs du -h | sort -rh | head -10
   ```

### Poor Runtime Performance

1. Check Lighthouse scores:

   ```bash
   pnpm dlx lighthouse https://sparkle.mrbro.dev --view
   ```

2. Verify prefetching is working:
   - Open DevTools Network tab
   - Navigate pages and check for prefetch requests
   - Should see `link rel="prefetch"` requests

3. Check for render-blocking resources:
   - Use PageSpeed Insights
   - Look for "Eliminate render-blocking resources" warning

## Related Documentation

- [GitHub Pages Setup](./github-pages-setup.md) - Deployment configuration
- [Custom Domain Setup](./custom-domain-setup.md) - DNS configuration
- [Development Workflow](../development/contributing) - Local development setup

## Additional Resources

- [Astro Build Configuration](https://docs.astro.build/en/reference/configuration-reference/#build-options)
- [Vite Build Optimizations](https://vitejs.dev/guide/build.html)
- [Web Performance Best Practices](https://web.dev/fast/)
- [Lighthouse Performance Scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring/)
