---
title: Installation
description: Step-by-step guide to installing and configuring Sparkle in your project.
---

## Prerequisites

Before installing Sparkle, ensure your development environment meets these requirements:

- **Node.js** 18.0.0 or later ([Download here](https://nodejs.org/))
- **pnpm** 8.0.0 or later (recommended) or npm 8.0.0+
- **TypeScript** 4.8 or later
- **React** 18.0.0 or later

<!-- prettier-ignore-start -->
:::tip[Why pnpm?]
Sparkle is developed with pnpm and optimized for pnpm workspaces. While npm and yarn work, **pnpm provides faster installs** and better dependency resolution for monorepo projects.

Install pnpm: `npm install -g pnpm@latest`
:::
<!-- prettier-ignore-end -->

## Installation Options

Choose the installation approach that fits your project:

### Option 1: Full Design System (Recommended)

Install all core packages for complete design system functionality:

```bash
pnpm add @sparkle/ui @sparkle/theme @sparkle/types
```

This gives you:

- ✅ **Complete component library** (`@sparkle/ui`)
- ✅ **Cross-platform design tokens** (`@sparkle/theme`)
- ✅ **TypeScript definitions** (`@sparkle/types`)

### Option 2: Minimal Setup

Install only what you need for a lightweight setup:

```bash
# Just design tokens for custom components
pnpm add @sparkle/theme @sparkle/types

# Add utilities for React hooks
pnpm add @sparkle/utils

# Add UI components when ready
pnpm add @sparkle/ui
```

### Option 3: Development Setup

For contributing to Sparkle or advanced debugging:

```bash
# Install development tools
pnpm add -D @sparkle/error-testing @sparkle/config

# Core packages
pnpm add @sparkle/ui @sparkle/theme @sparkle/types @sparkle/utils
```

## Configuration

### 1. Theme Provider Setup

Wrap your application with the Sparkle theme provider:

```tsx
import { ThemeProvider } from '@sparkle/theme'
import { App } from './App'

function Root() {
  return (
    <ThemeProvider theme="light">
      <App />
    </ThemeProvider>
  )
}
```

### 2. Import Styles

Import Sparkle's CSS in your main stylesheet or entry point:

```css
/* Import Sparkle base styles */
@import '@sparkle/ui/styles.css';
```

### 3. TypeScript Configuration

Ensure your `tsconfig.json` includes proper module resolution:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "jsx": "react-jsx"
  }
}
```

## Verification

Test your installation with a simple component:

```tsx
import { useTheme } from '@sparkle/theme'
import { Button } from '@sparkle/ui'

function TestComponent() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button
      variant="primary"
      onClick={toggleTheme}
    >
      Current theme: {theme}
    </Button>
  )
}
```

## Framework-Specific Setup

### Next.js

Add to your `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@sparkle/ui', '@sparkle/theme'],
  experimental: {
    esmExternals: true,
  },
}

module.exports = nextConfig
```

### Vite

Add to your `vite.config.ts`:

```typescript
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@sparkle/ui', '@sparkle/theme'],
  },
})
```

### Create React App

CRA requires additional configuration for TypeScript paths and CSS imports. Consider migrating to Vite for better Sparkle support.

## Troubleshooting

### Common Issues

- **Module not found**: Ensure you've installed all required packages
- **Type errors**: Verify TypeScript configuration and @sparkle/types installation
- **Style issues**: Check CSS import order and theme provider placement

### Getting Help

- Check our [GitHub Issues](https://github.com/marcusrbrown/sparkle/issues)
- Join discussions in [GitHub Discussions](https://github.com/marcusrbrown/sparkle/discussions)
- Review our [development guide](/development/contributing)

## Next Steps

Now that Sparkle is installed:

- Explore [UI Components](/components/overview)
- Learn about [Design Tokens](/theme/design-tokens)
- Follow the [Quick Start Guide](quick-start)
