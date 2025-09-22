---
title: Quick Start Guide
description: Build your first component with Sparkle in minutes.
---

Get up and running with Sparkle quickly by following this step-by-step guide. In just **5 minutes**, you'll have a working Sparkle component in your application.

<!-- prettier-ignore-start -->
:::tip[Already have a React project?]
Skip to [Step 2](#step-2-set-up-theme-provider) if you already have a React application set up.
:::
<!-- prettier-ignore-end -->

## Step 1: Install Sparkle

Choose your package manager and install the core Sparkle packages:

```bash
# Using pnpm (recommended)
pnpm add @sparkle/ui @sparkle/theme @sparkle/types

# Using npm
npm install @sparkle/ui @sparkle/theme @sparkle/types

# Using yarn
yarn add @sparkle/ui @sparkle/theme @sparkle/types
```

## Step 2: Set Up Theme Provider

Wrap your application with Sparkle's theme provider to enable design tokens and theming:

```tsx
import { ThemeProvider } from '@sparkle/theme'
// main.tsx or App.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

// Import Sparkle styles
import '@sparkle/ui/styles.css'

const root = createRoot(document.querySelector('#root') as HTMLElement)

root.render(
  <StrictMode>
    <ThemeProvider theme="light">
      <App />
    </ThemeProvider>
  </StrictMode>
)
```

## Step 3: Use Your First Component

Now you can use any Sparkle component in your application:

```tsx
// App.tsx
import { useTheme } from '@sparkle/theme'
import { Button } from '@sparkle/ui'

function App() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Welcome to Sparkle! ✨</h1>
      <p>Current theme: <strong>{theme}</strong></p>

      <Button
        variant="primary"
        onClick={toggleTheme}
      >
        Toggle Theme
      </Button>

      <Button
        variant="secondary"
        onClick={() => alert('Hello from Sparkle!')}
      >
        Say Hello
      </Button>
    </div>
  )
}

export default App
```

## Step 4: Verify Everything Works

Start your development server and verify Sparkle is working:

```bash
# Start your development server
pnpm dev   # or npm start, yarn dev, etc.
```

You should see:

- ✅ A page with "Welcome to Sparkle!" heading
- ✅ Two buttons with Sparkle styling
- ✅ Theme toggle functionality working
- ✅ No console errors

<!-- prettier-ignore-start -->
:::tip[Success! 🎉]
If you see the buttons and theme toggle working, **congratulations!** You've successfully integrated Sparkle into your project.
:::
<!-- prettier-ignore-end -->

## Next Steps

Now that you have Sparkle working, explore more features:

### 🎨 **Explore More Components**

Sparkle includes many more components:

```tsx
import {
  Button,
  Form,
  FormInput,
  FormLabel,
  FormSelect
} from '@sparkle/ui'

function ContactForm() {
  return (
    <Form onSubmit={(data) => console.log(data)}>
      <FormLabel htmlFor="name">Name</FormLabel>
      <FormInput id="name" name="name" required />

      <FormLabel htmlFor="role">Role</FormLabel>
      <FormSelect id="role" name="role">
        <option value="developer">Developer</option>
        <option value="designer">Designer</option>
        <option value="manager">Manager</option>
      </FormSelect>

      <Button type="submit" variant="primary">
        Submit
      </Button>
    </Form>
  )
}
```

### 🌈 **Customize Your Theme**

Create custom themes with design tokens:

```tsx
import { ThemeProvider } from '@sparkle/theme'

const customTheme = {
  colors: {
    primary: '#6366f1',    // Indigo
    secondary: '#ec4899',  // Pink
  },
  spacing: {
    lg: '2rem',
  }
}

function App() {
  return (
    <ThemeProvider theme="light" customTokens={customTheme}>
      {/* Your app */}
    </ThemeProvider>
  )
}
```

### 🔧 **Use Helpful Utilities**

Sparkle includes useful React hooks:

```tsx
import { useClickOutside, useDebounce } from '@sparkle/utils'
import { useRef, useState } from 'react'

function SearchBox() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)
  const menuRef = useRef(null)

  useClickOutside(menuRef, () => {
    // Close search dropdown
  })

  // debouncedQuery will update 300ms after user stops typing
  return (
    <div ref={menuRef}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      {/* Search results based on debouncedQuery */}
    </div>
  )
}
```

## What's Next?

Continue your Sparkle journey:

- **[Components Overview](../components/overview)** - Explore all available components
- **[Theme System](../theme/design-tokens)** - Learn about design tokens and theming
- **[Installation Guide](installation)** - Framework-specific setup instructions
- **[Project Structure](project-structure)** - Understand the monorepo architecture

<!-- prettier-ignore-start -->
:::tip[Need Help?]

- 🐛 **Found an issue?** [Report it on GitHub](https://github.com/marcusrbrown/sparkle/issues)
- 💬 **Have questions?** [Join the discussion](https://github.com/marcusrbrown/sparkle/discussions)
- 📚 **Want to contribute?** Check our [development guide](../development/contributing)

:::
<!-- prettier-ignore-end -->
