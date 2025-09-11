---
title: Project Structure
description: Understanding the Sparkle monorepo organization and architecture.
prev:
  link: /getting-started/quick-start/
  label: Quick Start Guide
next:
  link: /components/overview/
  label: Explore Components
---

Sparkle is organized as a TypeScript monorepo with focused packages and clear separation of concerns.

## Overview

```text
sparkle/
├── 📦 packages/           # Core Sparkle packages
│   ├── 🎨 ui/            # React component library
│   ├── 🌈 theme/         # Design tokens and providers
│   ├── 📝 types/         # TypeScript definitions
│   ├── 🔧 utils/         # Utility functions
│   ├── 🧪 error-testing/ # Testing framework
│   └── ⚙️ config/        # Shared configurations
├── 📱 apps/              # Example applications
│   └── fro-jive/         # Expo mobile app
├── 📚 docs/              # Documentation site (you're here!)
├── 🔨 scripts/           # Build and utility scripts
├── 🏗️ infrastructure files # Package configs, CI/CD, etc.
```

<!-- prettier-ignore-start -->
:::tip[Monorepo Benefits]
This structure provides:

- 🚀 **Faster Development** - Shared tooling and immediate feedback loops
- 🔄 **Consistent Versioning** - Coordinated releases across packages
- 🧪 **Better Testing** - Integration testing across package boundaries
- 📚 **Unified Documentation** - Single source of truth for all packages

:::
<!-- prettier-ignore-end -->

## Package Architecture

### Dependency Graph

Understanding how packages relate to each other:

```text
@sparkle/ui ← Main component library
├── @sparkle/theme     # ← Design tokens & theming
├── @sparkle/types     # ← TypeScript definitions
└── @sparkle/utils     # ← Shared utilities

@sparkle/theme ← Design system foundation
└── @sparkle/types     # ← Core type definitions

@sparkle/utils ← React hooks & utilities
└── @sparkle/types     # ← Type safety everywhere

@sparkle/error-testing ← Development tools
└── @sparkle/types     # ← Consistent type usage
```

This **bottom-up architecture** means:

- ✅ **No circular dependencies** - Clean, predictable imports
- ✅ **Incremental adoption** - Use just what you need
- ✅ **Independent versioning** - Packages can evolve separately
- ✅ **Clear boundaries** - Each package has distinct responsibilities

## Package Deep Dive

### 🎨 `@sparkle/ui`

The **main component library** containing all React components:

```text
packages/ui/
├── src/
│   ├── components/         # Individual components
│   │   ├── Button/        # Button component + stories
│   │   ├── Form/          # Form components
│   │   └── ...            # Other components
│   ├── hooks/             # Component-specific hooks
│   ├── utils/             # UI utilities
│   └── index.ts           # Public API exports
├── dist/                  # Built JavaScript + CSS
├── styles.css             # Component styles
└── package.json
```

**Key Features:**

- 🎯 **Accessible by default** - WCAG 2.1 AA compliant
- 🔧 **Highly customizable** - CSS custom properties + Tailwind
- 📚 **Storybook integration** - Interactive component playground
- 🧪 **Comprehensive testing** - Unit, integration, and visual regression

### 🌈 `@sparkle/theme`

**Design token management** and theme providers:

```text
packages/theme/
├── src/
│   ├── tokens/            # Design token definitions
│   │   ├── base.ts       # Core tokens (colors, spacing, etc.)
│   │   ├── light.ts      # Light theme overrides
│   │   └── dark.ts       # Dark theme overrides
│   ├── providers/         # Theme context providers
│   │   ├── ThemeProvider.tsx      # Web theme provider
│   │   └── NativeThemeProvider.tsx # React Native provider
│   ├── utils/             # Token transformation utilities
│   └── index.ts           # Public exports
├── styles.css             # Generated CSS custom properties
└── package.json
```

**Key Features:**

- 🔄 **Cross-platform tokens** - Web CSS + React Native StyleSheet
- 🎨 **Dynamic theming** - Runtime theme switching
- 🔧 **Token transformation** - Automatic format conversion
- 📱 **Mobile support** - React Native compatible

### 📝 `@sparkle/types`

**Shared TypeScript definitions** used across all packages:

```text
packages/types/
├── src/
│   ├── components/        # Component prop types
│   ├── theme/            # Theme-related types
│   ├── utils/            # Utility types
│   └── index.ts          # Re-exports
└── package.json
```

### 🔧 `@sparkle/utils`

**Utility functions and React hooks**:

```text
packages/utils/
├── src/
│   ├── hooks/            # React hooks
│   │   ├── useDebounce.ts
│   │   ├── useClickOutside.ts
│   │   └── useAsync.ts
│   ├── functions/        # Pure utility functions
│   └── index.ts
└── package.json
```

### 🧪 `@sparkle/error-testing`

**Error testing framework** for development:

```text
packages/error-testing/
├── src/
│   ├── builders/         # Test scenario builders
│   ├── fixtures/         # Test data fixtures
│   ├── utils/           # Testing utilities
│   └── index.ts
└── package.json
```

## Build System

Sparkle uses modern tooling for efficient development:

### 🏗️ **Turborepo**

Orchestrates builds across packages with intelligent caching:

```bash
# Build all packages (with dependency order)
pnpm build

# Build only changed packages
pnpm build --filter=...[HEAD~1]

# Parallel development mode
pnpm dev
```

### 📦 **pnpm Workspaces**

Manages dependencies with workspace linking:

```bash
# Install dependency in specific package
pnpm add --filter @sparkle/ui react

# Install dev dependency globally
pnpm add -Dw typescript

# Run command in all packages
pnpm -r build
```

### ⚡ **tsdown**

Fast TypeScript compilation for packages:

```javascript
// tsdown.config.ts
export default defineConfig({
  entry: ['./src/index.ts'],
  outDir: 'dist',
  dts: true,        // Generate .d.ts files
  clean: true,      // Clean dist/ before build
})
```

## Development Workflow

### 🔄 **Hot Reload Development**

Start all development servers:

```bash
# Terminal 1: Type checking in watch mode
pnpm build:types:watch

# Terminal 2: All development servers
pnpm dev
```

This starts:

- 📚 **Storybook** at `http://localhost:6006`
- 📝 **Documentation** at `http://localhost:4321`
- 📱 **Mobile app** via Expo CLI
- 🔧 **Package builds** in watch mode

### 🧪 **Testing Strategy**

Comprehensive testing at multiple levels:

```bash
# Unit tests with Vitest
pnpm test

# Visual regression tests with Playwright
pnpm test:visual

# Type checking
pnpm check:types

# Full quality check
pnpm check
```

### 📦 **Release Management**

Using Changesets for coordinated releases:

```bash
# Create changeset for your changes
pnpm changeset

# Version packages based on changesets
pnpm changeset version

# Publish to npm (CI only)
pnpm changeset publish
```

## Configuration Files

Key configuration files and their purposes:

| File                     | Purpose                        |
| ------------------------ | ------------------------------ |
| `turbo.json`             | Task orchestration and caching |
| `pnpm-workspace.yaml`    | Workspace package definitions  |
| `tsconfig.json`          | Root TypeScript configuration  |
| `eslint.config.ts`       | ESLint rules for all packages  |
| `.changeset/config.json` | Release configuration          |

## Next Steps

Now that you understand the structure:

- **[Explore Components](../components/overview)** - Browse the component library
- **[Learn Theming](../theme/design-tokens)** - Understand design tokens
- **[Development Guide](../development/contributing)** - Contribute to Sparkle
- **[Quick Start](quick-start)** - Build your first component

<!-- prettier-ignore-start -->
:::tip[Contributing]
Understanding this structure is key to effective contribution. Each package has clear responsibilities, making it easier to know where to add features or fix bugs.
:::
<!-- prettier-ignore-end -->
