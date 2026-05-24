# ✨ Sparkle

[![TypeScript](https://img.shields.io/badge/TypeScript-blue?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org) [![React](https://img.shields.io/badge/React-blue?style=for-the-badge&logo=react&logoColor=white)](https://reactjs.org) [![React Native](https://img.shields.io/badge/React%20Native-blue?style=for-the-badge&logo=react&logoColor=white)](https://reactnative.dev) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](https://opensource.org/licenses/MIT)

A TypeScript playground monorepo for exploring modern web, mobile, and WASM development patterns. Cross-platform design system, React component library, Expo mobile app, and a WASM-powered web shell — all under one Turborepo + pnpm workspace roof.

<!-- prettier-ignore-start -->
> [!NOTE]
> Sparkle is an experimental playground. APIs and architecture evolve aggressively as new patterns are explored.
<!-- prettier-ignore-end -->

## Features

- **🎨 Design System** — Cross-platform design tokens with light/dark theming via `@sparkle/theme`
- **🧩 Component Library** — Accessible React components built on Radix UI primitives + Tailwind CSS
- **📱 Mobile App** — Expo / React Native application (`fro-jive`) demonstrating cross-platform patterns
- **🐚 WASM Web Shell** — Unix-like terminal in the browser (`moo-dang`) with Zig-compiled WASM executables
- **📚 Docs Site** — Astro Starlight docs with automated JSDoc extraction at <https://sparkle.mrbro.dev>
- **🔧 Developer Experience** — TypeScript-first, Vitest, Storybook, visual regression, and comprehensive tooling

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org) `>=22.13.1` (CI runs Node 24)
- [pnpm](https://pnpm.io) `>=10` (this repo pins via `packageManager` in `package.json`)

### Installation

```bash
git clone https://github.com/marcusrbrown/sparkle.git
cd sparkle
pnpm bootstrap
pnpm dev
```

`pnpm dev` starts the full development environment (UI, Storybook, mobile, docs) via Turborepo.

## Workspace Layout

### Core Libraries

| Package                              | Description                                                   | Status    |
| ------------------------------------ | ------------------------------------------------------------- | --------- |
| [`@sparkle/ui`](./packages/ui)       | Accessible React component library (Radix + Tailwind)         | ✅ Active |
| [`@sparkle/theme`](./packages/theme) | Cross-platform design tokens + theme providers (web + native) | ✅ Active |
| [`@sparkle/types`](./packages/types) | Shared TypeScript type definitions                            | ✅ Active |
| [`@sparkle/utils`](./packages/utils) | Utility functions and React hooks                             | ✅ Active |

### Applications

| Package                                      | Description                                           | Status    |
| -------------------------------------------- | ----------------------------------------------------- | --------- |
| [`apps/fro-jive`](./apps/fro-jive)           | Expo / React Native mobile application                | ✅ Active |
| [`apps/moo-dang`](./apps/moo-dang)           | WASM-powered web shell with Zig executables           | ✅ Active |
| [`packages/storybook`](./packages/storybook) | Component documentation, playground, and visual tests | ✅ Active |
| [`docs/`](./docs)                            | Astro Starlight documentation site                    | ✅ Active |

### Development Tools

| Package | Description | Status |
| --- | --- | --- |
| [`@sparkle/config`](./packages/config) | Shared build, lint, and Tailwind configurations | ✅ Active |
| [`@sparkle/test-utils`](./packages/test-utils) | Factory-based mocks (storage, console, xterm, media queries, etc.) | ✅ Active |
| [`@sparkle/error-testing`](./packages/error-testing) | Fluent error-scenario builder (`TestScenarioBuilder`) | ✅ Active |

## Common Commands

```bash
pnpm bootstrap        # Install all workspace dependencies
pnpm dev              # Start all dev servers (UI, Storybook, mobile, docs)
pnpm build            # Build every package via Turborepo
pnpm build:types:watch # Watch mode for TypeScript declarations
pnpm test             # Run all package test suites
pnpm check            # Format, type-check, and monorepo consistency
pnpm check:monorepo   # manypkg workspace consistency check
pnpm fix              # Auto-fix monorepo + ESLint issues
pnpm health-check     # Comprehensive environment validation
pnpm clean            # Clean build artifacts
```

### Workspace Filtering

```bash
# Add a dep to one package
pnpm add --filter @sparkle/ui react

# Run a script in one package
pnpm --filter @sparkle/ui build

# Run a script in every package
pnpm -r build
```

### Documentation Site

```bash
pnpm --filter @sparkle/docs dev          # Local docs server
pnpm --filter @sparkle/docs build        # Production build
pnpm --filter @sparkle/docs docs:automation # Re-extract JSDoc → Markdown
```

Live site: <https://sparkle.mrbro.dev>

## Architecture

```text
sparkle/
├── apps/
│   ├── fro-jive/        # Expo mobile app
│   └── moo-dang/        # WASM web shell (Zig + xterm.js)
├── packages/
│   ├── ui/              # React component library
│   ├── theme/           # Cross-platform theme system
│   ├── types/           # Shared TypeScript definitions
│   ├── utils/           # Utility functions and hooks
│   ├── config/          # Shared build/lint configs
│   ├── test-utils/      # Test mocks and helpers
│   ├── error-testing/   # Error-scenario testing
│   └── storybook/       # Component docs + visual regression
├── docs/                # Astro Starlight docs site
├── scripts/             # Build and maintenance scripts
├── turbo.json           # Turborepo pipeline
└── pnpm-workspace.yaml  # Workspace definition
```

## Technology Stack

**Languages & Runtimes**: [TypeScript](https://www.typescriptlang.org) · [React](https://reactjs.org) · [React Native](https://reactnative.dev) / [Expo](https://expo.dev) · [Zig](https://ziglang.org) (WASM)

**Build & Workspace**: [Turborepo](https://turbo.build) · [pnpm workspaces](https://pnpm.io/workspaces) · [Vite](https://vitejs.dev) · [tsdown](https://tsdown.vercel.app)

**UI & Styling**: [Tailwind CSS](https://tailwindcss.com) · [Radix UI](https://www.radix-ui.com) · [Storybook](https://storybook.js.org) · [xterm.js](https://xtermjs.org)

**Docs**: [Astro](https://astro.build) · [Starlight](https://starlight.astro.build)

**Testing & Quality**: [Vitest](https://vitest.dev) · [Playwright](https://playwright.dev) (visual regression) · [Testing Library](https://testing-library.com) · [ESLint](https://eslint.org) · [Prettier](https://prettier.io)

## Resources

- 📖 [Documentation site](https://sparkle.mrbro.dev) — Full guides, API reference, and component playground
- 🧩 [Storybook](http://localhost:6006) — Interactive component documentation (run `pnpm dev` first)
- 🤖 [`.github/copilot-instructions.md`](./.github/copilot-instructions.md) — Agent and contributor conventions
- 📝 [Changesets workflow](https://github.com/changesets/changesets) — `pnpm changeset` → `pnpm changeset version` → commit
