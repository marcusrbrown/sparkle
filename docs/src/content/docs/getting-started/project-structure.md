---
title: Project Structure
description: Understanding the Sparkle monorepo organization and architecture.
---

Sparkle is organized as a TypeScript monorepo with focused packages and clear separation of concerns.

## Workspace Structure

```text
sparkle/
├── packages/           # Core Sparkle packages
│   ├── ui/            # React component library
│   ├── theme/         # Design tokens and providers
│   ├── types/         # TypeScript definitions
│   ├── utils/         # Utility functions
│   ├── error-testing/ # Testing framework
│   └── config/        # Shared configurations
├── apps/              # Example applications
│   └── fro-jive/      # Expo mobile app
├── docs/              # Documentation site
└── scripts/           # Build and utility scripts
```

## Package Dependencies

```text
@sparkle/ui
├── @sparkle/theme
├── @sparkle/types
└── @sparkle/utils

@sparkle/theme
└── @sparkle/types

@sparkle/utils
└── @sparkle/types
```

## Build System

- **pnpm workspaces** for dependency management
- **Turborepo** for task orchestration and caching
- **TypeScript project references** for incremental builds
- **Changesets** for version management

## Development Tools

- **Storybook** for component development
- **Vitest** for unit testing
- **Playwright** for visual regression testing
- **ESLint** and **Prettier** for code quality
