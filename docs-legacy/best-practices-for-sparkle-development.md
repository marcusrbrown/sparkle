# Sparkle Best Practices

This comprehensive guide outlines established best practices for TypeScript, mobile development, and developer playground environments within a monorepo structure. The recommendations are tailored for a solo developer using Changesets, Expo, Storybook, Tailwind CSS, Turborepo, and Vite, with a focus on package interoperability, experimentation, code readability, test coverage, and consistent error handling.

## Monorepo Structure and Organization

### Recommended Project Structure

A well-organized monorepo structure is crucial for maintainability and scalability, especially when working as a solo developer.

```
monorepo-root/
├── apps/              # Application code
│   ├── mobile/        # Expo mobile application
│   ├── web/           # Web application
│   └── docs/          # Documentation site
├── packages/          # Shared packages and libraries
│   ├── ui/            # UI component library
│   ├── config/        # Shared configurations
│   ├── utils/         # Utility functions
│   └── types/         # Shared TypeScript types
├── scripts/           # Developer tools and scripts
├── .storybook/        # Storybook configuration
├── package.json       # Root package file
└── turbo.json         # Turborepo configuration
```

This structure provides clear separation of concerns while enabling code sharing between applications. For a solo developer, this organization makes it easier to navigate between different parts of your project and maintain focus on specific tasks[^1].

### Package Management

For managing dependencies across your monorepo, consider using:

1. **Yarn Workspaces**: Provides efficient package management for monorepos[^1].
2. **NPM Workspaces**: An alternative to Yarn that integrates well with the NPM ecosystem[^2].
3. **Changesets**: For versioning and publishing packages with automated CHANGELOG generation.

A proper workspace configuration in your root `package.json` is essential:

```json
{
  "private": true,
  "workspaces": ["apps/*", "packages/*", "scripts"]
}
```

This configuration allows you to install dependencies once at the root level while maintaining separate package definitions[^4].

## TypeScript Configuration for Monorepos

### Project References

TypeScript project references are crucial for maintaining clean dependencies between packages in your monorepo:

1. Create a `tsconfig.json` at the root level with shared compiler options.
2. Create package-specific `tsconfig.json` files that extend the root configuration.
3. Use the `references` field to define dependencies between packages[^1].

```json
// Root tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true
  }
}
```

```json
// Package tsconfig.json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "references": [
    { "path": "../shared-types" }
  ]
}
```

This setup ensures type safety across your monorepo and improves build performance by enabling incremental compilation[^1].

### Path Aliases

Configure path aliases to simplify imports between packages:

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@repo/ui/*": ["packages/ui/src/*"],
      "@repo/utils/*": ["packages/utils/src/*"]
    }
  }
}
```

This allows you to use imports like `import { Button } from "@repo/ui/components"` throughout your monorepo[^1][^2].

## Mobile Development with Expo in a Monorepo

### Expo Configuration

Expo provides specialized support for monorepos starting from SDK 48, with automatic detection and configuration:

1. Place your Expo app within the `apps/` directory.
2. Ensure proper Metro configuration to watch all necessary dependencies.
3. Share UI components and business logic across different apps[^4].

```javascript
const path = require("node:path")
// metro.config.js in your Expo app
const {getDefaultConfig} = require("expo/metro-config")

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, "../..")

const config = getDefaultConfig(projectRoot)

// Watch all files in the monorepo
config.watchFolders = [workspaceRoot]

// Allow importing from workspace packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
]

module.exports = config
```

This configuration enables the Expo app to properly resolve dependencies from workspace packages[^4].

### Performance Considerations

For larger monorepos, you may need to optimize Metro configuration:

1. Be selective about which folders Metro watches to prevent slowdowns.
2. Consider using the `exclude` option to ignore irrelevant packages.
3. Implement caching strategies to improve build times[^4].

## Storybook Integration in a Monorepo

There are three main approaches to integrating Storybook in your monorepo:

### Option 1: Dedicated Storybook App

Create a separate Storybook application in your `apps/` directory that imports components from your shared packages:

```
apps/
  storybook/
    .storybook/
    package.json
    stories/
```

This approach provides a centralized location for all your stories and makes it easier to showcase components from multiple packages[^7].

### Option 2: Package-Specific Storybooks

Add Storybook to individual packages, particularly your UI library:

```
packages/
  ui/
    .storybook/
    src/
      components/
        Button/
          Button.tsx
          Button.stories.tsx
```

This approach is beneficial when you need to focus on developing specific packages in isolation[^5][^7].

### Option 3: Application-Specific Storybooks

Add Storybook to your applications to test components in the context of your app:

```
apps/
  mobile/
    .storybook/
    src/
      components/
```

This is useful for testing application-specific components or testing how shared components integrate with your application[^6][^7].

With Turborepo, you can run multiple Storybooks simultaneously by configuring different ports and adding a `storybook` task to your `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "globalEnv": ["NODE_ENV", "CI"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"],
      "inputs": ["src/**/*.{ts,tsx,js,jsx}", "package.json", "tsconfig.json"]
    },
    "dev": {
      "dependsOn": ["^build"],
      "persistent": true,
      "cache": false
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "inputs": ["src/**/*.{ts,tsx}", "test/**/*.{ts,tsx}", "vitest.config.ts"]
    },
    "lint": {
      "outputs": ["lint-results.json"],
      "inputs": ["src/**/*.{ts,tsx,js,jsx}", ".eslintrc.*"]
    },
    "deploy": {
      "dependsOn": ["build", "test", "lint"],
      "outputs": []
    }
  }
}
```

Run all Storybooks with a single command: `pnpm turbo storybook`[^7].

## Tailwind CSS in a Monorepo

### Shared Configuration

For consistent styling across your monorepo, establish a shared Tailwind configuration:

1. Create a base Tailwind preset in a shared package.
2. Extend this preset in each application or package that uses Tailwind[^8].

```javascript
// packages/config/tailwind/index.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#3490dc",
          secondary: "#ffed4a",
        },
      },
    },
  },
  plugins: [],
}

// apps/mobile/tailwind.config.js
module.exports = {
  presets: [require("../../packages/config/tailwind")],
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
}
```

This approach ensures visual consistency while allowing app-specific customizations[^8][^9].

## Package Interoperability

### Exporting and Consuming Packages

To enable seamless package sharing within your monorepo:

1. Configure each package's `package.json` with proper entry points.
2. Use the `exports` field to define subpath exports.
3. Configure TypeScript path aliases for better developer experience[^2].

```json
// packages/ui/package.json
{
  "name": "@repo/ui",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./components": "./dist/components/index.js"
  }
}
```

This allows for clean imports like `import { Button } from "@repo/ui/components"`[^2].

### Bundling Shared Packages

When sharing UI components:

1. Configure your build process to produce both ESM and CommonJS outputs.
2. Include TypeScript declaration files.
3. Ensure CSS/Tailwind styles are properly extracted and included[^9].

```json
// packages/ui/package.json
{
  "scripts": {
    "build": "vite build &amp;&amp; tsc --emitDeclarationOnly"
  }
}
```

This setup makes your packages compatible with various consumption methods[^9].

## Testing and Coverage Strategy

### Unit Testing Configuration

Set up Jest to work efficiently across your monorepo:

1. Create a base Jest configuration in a shared package.
2. Extend this configuration in each package.
3. Configure path mapping to match TypeScript aliases[^1].

### Aggregated Test Coverage

For a comprehensive view of test coverage across your monorepo:

1. Add a script at the root level to run tests with coverage:

```json
// Root package.json
{
  "scripts": {
    "test": "turbo run test",
    "coverage": "turbo run test -- --coverage"
  }
}
```

2. Configure Jest to output coverage reports in a consistent format.
3. Consider using a tool to aggregate coverage reports from all packages[^3].

This approach provides visibility into overall project health and helps identify areas that need more testing[^3].

## Code Readability and Documentation

### Documentation Strategy

As a solo developer, maintaining comprehensive documentation is crucial:

1. Use JSDoc comments for code documentation.
2. Implement a consistent README structure for each package.
3. Consider using Storybook's docs addon for component documentation.

```typescript
/**
 * Button component with customizable appearance
 * @param props - The button properties
 * @param props.variant - The visual style of the button
 * @param props.size - The size of the button
 * @param props.children - The content to display inside the button
 */
export function Button({variant = "primary", size = "medium", children}: ButtonProps) {
  // Implementation
}
```

This documentation approach helps you maintain context when switching between different parts of your project[^1][^7].

### Coding Standards

Establish consistent coding standards across your monorepo:

1. Share ESLint and Prettier configurations.
2. Set up pre-commit hooks to enforce formatting and linting.
3. Use TypeScript's stricter compiler options to catch potential issues early[^1].

## Error Handling Consistency

### Error Management Pattern

Implement a consistent error handling pattern across your monorepo:

1. Create a shared error handling package with standardized error classes.
2. Define consistent error boundaries for React components.
3. Implement centralized error logging.

```typescript
// packages/errors/src/index.ts
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'APIError';
  }
}
```

This approach ensures errors are handled consistently throughout your applications and makes debugging more straightforward[^1].

## Turborepo Optimization

### Pipeline Configuration

Optimize your development workflow with Turborepo:

1. Define task dependencies in `turbo.json`.
2. Configure caching for faster rebuilds.
3. Use remote caching for even better performance.

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "globalEnv": ["NODE_ENV", "CI"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"],
      "inputs": ["src/**/*.{ts,tsx,js,jsx}", "package.json", "tsconfig.json"]
    },
    "dev": {
      "dependsOn": ["^build"],
      "persistent": true,
      "cache": false
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "inputs": ["src/**/*.{ts,tsx}", "test/**/*.{ts,tsx}", "vitest.config.ts"]
    },
    "lint": {
      "outputs": ["lint-results.json"],
      "inputs": ["src/**/*.{ts,tsx,js,jsx}", ".eslintrc.*"]
    },
    "deploy": {
      "dependsOn": ["build", "test", "lint"],
      "outputs": []
    }
  }
}
```

This configuration ensures tasks run in the correct order while leveraging caching for optimal performance[^7].

## Conclusion

Adopting these best practices for TypeScript, mobile development, and developer playground environments in your monorepo will create a solid foundation for efficient solo development. By focusing on package interoperability, experimentation, code readability, test coverage, and consistent error handling, you'll create a maintainable and scalable codebase that supports innovation and growth.

Remember that monorepos add complexity but provide significant benefits for managing interconnected projects. As a solo developer, invest time in proper setup and automation to maximize productivity and maintain a high-quality codebase.

<div style="text-align: center">⁂</div>

[^1]: https://dev.to/mxro/the-ultimate-guide-to-typescript-monorepos-5ap7

[^2]: https://www.reddit.com/r/typescript/comments/vq8zzi/ive_created_a_typescript_monorepo_template_using/

[^3]: https://dev.to/mbarzeev/aggregating-unit-test-coverage-for-all-monorepos-packages-20c6

[^4]: https://docs.expo.dev/guides/monorepos/

[^5]: https://github.com/vercel/turborepo/discussions/6879

[^6]: https://stackoverflow.com/questions/79144579/how-to-install-storybook-properly-in-expo-project

[^7]: https://www.pronextjs.dev/workshops/next-js-production-project-setup-and-infrastructure-fq4qc/storybook-in-a-turborepo-monorepo-nnwqb

[^8]: https://stackoverflow.com/questions/77126996/tailwind-config-for-packages-in-monorepo

[^9]: https://github.com/vercel/turbo/blob/main/examples/with-tailwind/README.md
