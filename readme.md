# ✨ Sparkle

[![TypeScript](https://img.shields.io/badge/TypeScript-blue?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org) [![React](https://img.shields.io/badge/React-blue?style=for-the-badge&logo=react&logoColor=white)](https://reactjs.org) [![React Native](https://img.shields.io/badge/React%20Native-blue?style=for-the-badge&logo=react&logoColor=white)](https://reactnative.dev) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](https://opensource.org/licenses/MIT)

A modern TypeScript playground and monorepo showcasing cutting-edge web and mobile development technologies. Built with React, React Native, and a comprehensive suite of tools for building production-ready applications.

<!-- prettier-ignore-start -->
> [!NOTE]
> This is an experimental playground project focused on exploring modern development patterns, monorepo architecture, and cross-platform solutions.
<!-- prettier-ignore-end -->

## Features

- **🎨 Design System**: Comprehensive theme management with design tokens, light/dark modes, and cross-platform support
- **🧩 Component Library**: Modern, accessible React components built with Radix UI primitives and Tailwind CSS
- **📱 Mobile App**: Expo/React Native application demonstrating cross-platform development
- **📚 Documentation**: Interactive Storybook environment for component development and testing
- **🔧 Developer Experience**: TypeScript-first development with comprehensive tooling and testing
- **⚡ Modern Tooling**: Turborepo, pnpm workspaces, Vite, and automated workflows

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org) v22.13.1 or higher
- [pnpm](https://pnpm.io) v9.15.4 or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/marcusrbrown/sparkle.git
cd sparkle

# Install dependencies
pnpm bootstrap

# Start the development environment
pnpm dev
```

This will start:

- Storybook at <http://localhost:6006>
- Mobile app with Expo (follow CLI instructions)
- Component library in watch mode

## Packages

### Core Libraries

| Package                              | Description                                        | Status    |
| ------------------------------------ | -------------------------------------------------- | --------- |
| [`@sparkle/ui`](./packages/ui)       | Modern, accessible React component library         | ✅ Active |
| [`@sparkle/theme`](./packages/theme) | Cross-platform theme management with design tokens | ✅ Active |
| [`@sparkle/types`](./packages/types) | Shared TypeScript type definitions                 | ✅ Active |
| [`@sparkle/utils`](./packages/utils) | Utility functions and React hooks                  | ✅ Active |

### Applications

| Package                                      | Description                                         | Status    |
| -------------------------------------------- | --------------------------------------------------- | --------- |
| [`packages/storybook`](./packages/storybook) | Component documentation and development environment | ✅ Active |
| [`apps/fro-jive`](./apps/fro-jive)           | Expo/React Native mobile application                | ✅ Active |

### Development Tools

| Package                                              | Description                                | Status    |
| ---------------------------------------------------- | ------------------------------------------ | --------- |
| [`@sparkle/config`](./packages/config)               | Shared build and linting configurations    | ✅ Active |
| [`@sparkle/error-testing`](./packages/error-testing) | Error handling utilities and testing tools | ✅ Active |

## Development

### Common Commands

```bash
# Install dependencies
pnpm bootstrap

# Start development servers
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test

# Type checking
pnpm check:types

# Linting and formatting
pnpm lint
pnpm check

# Clean build artifacts
pnpm clean
```

### Package Management

This monorepo uses [pnpm workspaces](https://pnpm.io/workspaces) and [Turborepo](https://turbo.build) for efficient package management and build orchestration:

```bash
# Add dependency to specific package
pnpm add --filter @sparkle/ui react

# Run command in specific package
pnpm --filter @sparkle/ui build

# Run command in all packages
pnpm -r build
```

### Creating Components

```tsx
// packages/ui/src/components/NewComponent/NewComponent.tsx
import {forwardRef} from 'react'

export interface NewComponentProps {
  children: React.ReactNode
  variant?: 'default' | 'accent'
}

export const NewComponent = forwardRef<HTMLDivElement, NewComponentProps>(
  ({children, variant = 'default', ...props}, ref) => {
    return (
      <div ref={ref} className={`new-component new-component--${variant}`} {...props}>
        {children}
      </div>
    )
  }
)

NewComponent.displayName = 'NewComponent'
```

## Technology Stack

### Core Technologies

- [TypeScript](https://www.typescriptlang.org) - Type-safe JavaScript
- [React](https://reactjs.org) - UI library for web applications
- [React Native](https://reactnative.dev) - Cross-platform mobile development
- [Expo](https://expo.dev) - Mobile app development platform

### Build Tools

- [Turborepo](https://turbo.build) - High-performance build system
- [pnpm](https://pnpm.io) - Fast, disk space efficient package manager
- [Vite](https://vitejs.dev) - Lightning-fast build tool
- [tsdown](https://tsdown.vercel.app) - TypeScript bundler

### UI & Styling

- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS framework
- [Radix UI](https://www.radix-ui.com) - Unstyled, accessible components
- [Storybook](https://storybook.js.org) - Component development environment

### Testing & Quality

- [Vitest](https://vitest.dev) - Fast testing framework
- [Testing Library](https://testing-library.com) - Simple testing utilities
- [ESLint](https://eslint.org) - JavaScript linter
- [Prettier](https://prettier.io) - Code formatter

## Architecture

```text
sparkle/
├── packages/
│   ├── ui/              # React component library
│   ├── theme/           # Cross-platform theme system
│   ├── types/           # Shared TypeScript definitions
│   ├── utils/           # Utility functions and hooks
│   ├── config/          # Build and lint configurations
│   ├── storybook/       # Component documentation
│   ├── fro-jive/        # Mobile application
│   └── error-testing/   # Error handling utilities
├── docs/                # Project documentation
├── scripts/             # Build and maintenance scripts
└── ...config files
```

## Resources

- [Project Guide](./docs/project-guide.md) - Comprehensive development guide
- [Best Practices](./docs/best-practices-for-sparkle-development.md) - Development standards and guidelines
- [Storybook](http://localhost:6006) - Interactive component documentation (when running locally)
