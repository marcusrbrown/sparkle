---
title: Installation
description: Step-by-step guide to installing and configuring Sparkle in your project.
---

## Prerequisites

Before installing Sparkle, ensure you have:

- **Node.js** 18 or later
- **pnpm** (recommended) or npm
- **TypeScript** 4.8 or later
- **React** 18 or later

## Package Installation

Sparkle is distributed as individual packages allowing you to install only what you need:

### Core Packages

```bash
# Install UI components and theme system
pnpm add @sparkle/ui @sparkle/theme

# Install TypeScript types (usually automatic)
pnpm add @sparkle/types
```

### Additional Packages

```bash
# Utility functions and React hooks
pnpm add @sparkle/utils

# Error testing framework (development)
pnpm add -D @sparkle/error-testing
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
@import '@sparkle/theme/styles.css';
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
- Review our [troubleshooting guide](/development/contributing/)

## Next Steps

Now that Sparkle is installed:

- Explore [UI Components](/components/overview/)
- Learn about [Design Tokens](/theme/overview/)
- Follow the [Quick Start Guide](/getting-started/quick-start/)
