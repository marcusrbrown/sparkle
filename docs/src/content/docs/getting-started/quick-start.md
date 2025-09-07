---
title: Quick Start Guide
description: Build your first component with Sparkle in minutes.
---

Get up and running with Sparkle quickly by following this step-by-step guide.

## Step 1: Install Sparkle

```bash
pnpm add @sparkle/ui @sparkle/theme @sparkle/types
```

## Step 2: Set Up Theme Provider

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

## Step 3: Use Components

```tsx
import { Button } from '@sparkle/ui'

function App() {
  return (
    <div>
      <h1>My Sparkle App</h1>
      <Button variant="primary">
        Click me!
      </Button>
    </div>
  )
}
```

## Next Steps

- Explore more [components](/components/overview/)
- Learn about [theming](/theme/overview/)
- Check out the full [installation guide](/getting-started/installation/)
