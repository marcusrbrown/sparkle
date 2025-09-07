# Sparkle Project Guide

This guide provides an overview of the Sparkle monorepo structure, technologies used, and core development workflows.

## Project Structure

Sparkle is a monorepo managed using pnpm workspaces and Turborepo. The structure follows a standard packages and apps layout:

```
sparkle/
├── packages/          # Shared packages and libraries
│   ├── config/        # Shared configurations (e.g., TypeScript, potentially ESLint, Prettier)
│   ├── error-testing/ # Package for error handling experimentation/setup
│   ├── fro-jive/      # Expo mobile application
│   ├── storybook/     # Storybook setup for component documentation
│   ├── types/         # Shared TypeScript types
│   ├── ui/            # Core UI component library (React, Tailwind)
│   └── utils/         # Shared utility functions (implied)
├── scripts/           # Shared scripts (e.g., for build processes)
├── .changeset/        # Changesets configuration and data
├── .cursor/           # Cursor configuration and rules
├── .github/           # GitHub Actions workflows
├── .turbo/            # Turborepo cache and logs
├── docs/              # Project documentation (including this guide)
├── .gitignore
├── package.json       # Root package file with workspaces config and core scripts
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.json      # Root TypeScript configuration
└── turbo.json         # Turborepo pipeline configuration
```

## Key Technologies

- **Package Manager:** [pnpm](https://pnpm.io/) (v10.9.0)
- **Monorepo Tool:** [Turborepo](https://turbo.build/repo) (v2.5.1)
- **Language:** [TypeScript](https://www.typescriptlang.org/) (v5.8.3)
- **Testing Framework:** [Vitest](https://vitest.dev/) (v3.0.0) - Used in `@sparkle/ui`. Configuration is likely within package.json or default locations.
- **UI Framework:** [React](https://react.dev/) (v18.2.0)
- **Mobile Framework:** [Expo](https://expo.dev/) (in `apps/fro-jive`)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) (v4.0.6) - Configured in `@sparkle/ui` and `@sparkle/storybook`.
- **Component Primitives:** [Radix UI](https://www.radix-ui.com/) (used in `@sparkle/ui`)
- **Component Playground:** [Storybook](https://storybook.js.org/) (in `packages/storybook`)
- **Build Tool (UI):** [Vite](https://vitejs.dev/) (v5.4.18) - Used in `@sparkle/ui`.
- **Versioning:** [Changesets](https://github.com/changesets/changesets)
- **Linting/Formatting:**
  - [Prettier](https://prettier.io/) (using `@bfra.me/prettier-config`)
  - [ESLint](https://eslint.org/) (Implied by `lint` script)
  - [Manypkg](https://github.com/Thinkmill/manypkg) (for monorepo consistency checks)
- **Node Version:** >= 22.13.1

## Core Development Workflows

Scripts are defined in the root `package.json` and primarily orchestrated by Turborepo.

- **Installation:** `pnpm bootstrap` (Installs all dependencies across the workspace)
- **Building:**
  - `pnpm build`: Builds all packages.
  - `pnpm build:types`: Generates type declarations.
  - `pnpm build:watch`: Builds all packages in watch mode.
- **Testing:** `pnpm test` (Runs tests, likely `vitest run`, across relevant packages)
- **Linting:** `pnpm lint` (Runs linters across relevant packages)
  - `pnpm fix:es`: Fixes ESLint issues.
- **Type Checking:** `pnpm check:types` (Runs `tsc --noEmit`)
- **Monorepo Checks:** `pnpm check:monorepo` (Runs `manypkg check`)
- **All Checks:** `pnpm check` (Runs format check, monorepo check, and type check)
- **Development:** `pnpm dev` (Starts development servers/watchers for packages, likely including Vite for UI and Storybook)
- **Cleaning:** `pnpm clean` (Removes `node_modules` and build artifacts)
- **Versioning:**
  1. `pnpm changeset`: Interactively create a new changeset file.
  2. `pnpm changeset version`: Consumes changeset files, updates package versions and changelogs.
  3. Commit the changes.
  4. (After merge) `pnpm publish` (or via CI) to publish updated packages.

## Package Details

- **`@sparkle/ui`:** The core component library built with React, Radix UI, and Tailwind CSS. It uses Vite for building and Vitest for testing.
- **`@sparkle/storybook`:** Houses the Storybook instance, importing components from `@sparkle/ui` for documentation and interactive testing.
- **`@sparkle/fro-jive`:** The Expo mobile application. Likely consumes components from `@sparkle/ui`.
- **`@sparkle/config`:** (Assumed) Likely contains shared configurations like `tsconfig.base.json`, potentially ESLint/Prettier configs if abstracted.
- **`@sparkle/types`:** Contains shared TypeScript type definitions used across different packages.
- **`@sparkle/error-testing`:** Appears to be a dedicated package for developing or testing error handling strategies.
- **`scripts`:** Contains shared build or utility scripts used within the monorepo.

## Configuration

- **TypeScript:** Uses a root `tsconfig.json` likely extended by package-specific `tsconfig.json` files. Path aliases might be configured.
- **Tailwind CSS:** Configuration files exist in `@sparkle/ui` and `@sparkle/storybook`. A shared preset might exist in `packages/config/tailwind`.
- **Turborepo:** Pipelines are defined in `turbo.json` to manage task dependencies and caching.
- **pnpm:** Workspaces are defined in `pnpm-workspace.yaml`.

## Testing Strategy

The project uses Vitest for unit and component testing, primarily configured within the `@sparkle/ui` package currently. Tests are run via Turborepo using `pnpm test`. Coverage can likely be generated using `pnpm test -- --coverage` (passing args to the underlying `vitest run --coverage` command).

## Versioning

Package versioning and publishing are handled using Changesets. See the "Core Development Workflows" section for the process.
