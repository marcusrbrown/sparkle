<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" class="logo" width="120"/>

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
 * @param variant - The visual style of the button
 * @param size - The size of the button
 * @param children - The content to display inside the button
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

[^10]: https://github.com/vitejs/vite-ts-monorepo-rfc

[^11]: https://lirantal.com/blog/introducing-changesets-simplify-project-versioning-with-semantic-releases

[^12]: https://turbo.hector.im/repo/docs/handbook/publishing-packages/versioning-and-publishing

[^13]: https://www.reddit.com/r/typescript/comments/10ebgbs/handling_typescript_in_a_monorepo/

[^14]: https://github.com/byCedric/expo-monorepo-example

[^15]: https://dev.to/bdbchgg/sharing-your-tailwind-configuration-between-monorepo-packages-4o5k

[^16]: https://monorepo.tools/typescript

[^17]: https://docs.expo.dev/build-reference/build-with-monorepos/

[^18]: https://escape.tech/blog/setup-typescript-monorepo/

[^19]: https://nx.dev/blog/step-by-step-guide-to-creating-an-expo-monorepo-with-nx

[^20]: https://nx.dev/blog/managing-ts-packages-in-monorepos

[^21]: https://dev.to/devland/clean-code-principles-for-javascript-and-typescript-developers-3kdn

[^22]: https://community.doppler.com/t/monorepo-best-practices/983

[^23]: https://stackoverflow.com/questions/70002116/sharing-a-typescript-library-in-a-monorepo

[^24]: https://dev.to/mbarzeev/get-your-typescript-coverage-report-5c5p

[^25]: https://nx.dev/blog/typescript-project-references

[^26]: https://dev.to/yugjadvani/how-to-write-better-typescript-code-best-practices-for-clean-effective-and-scalable-code-38d2

[^27]: https://colinhacks.com/essays/live-types-typescript-monorepo

[^28]: https://iws.io/2024/monorepo-part-i

[^29]: https://www.reddit.com/r/javascript/comments/poktr3/askjs_how_should_mono_repo_test_statuscoverage_in/

[^30]: https://github.com/vercel/turborepo/discussions/620

[^31]: https://www.reddit.com/r/node/comments/qtt9ef/how_to_make_typescript_code_more_readable/

[^32]: https://news.ycombinator.com/item?id=32594915

[^33]: https://javascript.plainenglish.io/expo-react-native-working-with-monorepo-c5344db66360

[^34]: https://www.habilelabs.io/blog/react-native-react-web-and-expo-together-in-one-monorepo

[^35]: https://github.com/Marknjo/create-turbo-with-expo

[^36]: https://stackoverflow.com/questions/78875960/how-to-make-a-expo-app-in-a-monorepo-work-on-android

[^37]: https://www.reddit.com/r/reactnative/comments/wc05ry/react_native_with_expo_in_a_mono_repo/

[^38]: https://vercel.com/templates/next.js/turborepo-react-native

[^39]: https://stackoverflow.com/questions/78465647/how-to-create-a-monorepo-with-2-expo-projects-and-an-express

[^40]: https://bundlephobia.com/package/expo-yarn-workspaces

[^41]: https://stackoverflow.com/questions/77123039/versel-turborepo-has-got-a-conflict-with-expo-router-installation

[^42]: https://www.youtube.com/watch?v=iM4NRM2diPc

[^43]: https://www.convex.dev/templates/monorepo

[^44]: https://dev.to/menghif/turborepo-react-native-and-more-2m0h

[^45]: https://turbo.build/repo/docs/guides/tools/storybook

[^46]: https://github.com/axeldelafosse/storybook-rnw-monorepo

[^47]: https://github.com/zsh77/turborepo-starter-with-storybook/

[^48]: https://www.freecodecamp.org/news/how-to-build-a-react-development-playground-using-storybook-667ef9808e9f/

[^49]: https://dev.to/beaolivei/using-storybook-in-an-nx-monorepo-pna

[^50]: https://docs.expo.dev/guides/monorepos/

[^51]: https://vercel.com/templates/react/turborepo-design-system

[^52]: https://github.com/mondaycom/storybook-addon-playground

[^53]: https://storybook.js.org/docs/api/new-frameworks

[^54]: https://dev.to/nx/add-cypress-playwright-and-storybook-to-nx-expo-apps-2ob1

[^55]: https://www.reddit.com/r/nextjs/comments/1blov17/are_the_official_docs_for_using_storybook_with/

[^56]: https://github.com/buildit/storybook-playground

[^57]: https://blog.alec.coffee/monorepo-version-management-with-the-changesets-npm-package

[^58]: https://stackoverflow.com/questions/72129162/styling-issues-in-monorepo-with-turborepo-sveltekit-and-tailwind

[^59]: https://dev.to/oliviarizona88/turborepo-with-tailwind-css-3a3f

[^60]: https://hackernoon.com/how-to-set-up-a-monorepo-with-vite-typescript-and-pnpm-workspaces

[^61]: https://github.com/Binabh/vite-shadcn-turborepo

[^62]: https://infinum.com/handbook/frontend/changesets

[^63]: https://dev.to/kzuraw/compiling-tailwind-css-components-in-monorepo-1ljk

[^64]: https://github.com/cvrlnolan/turborepo-tailwindcss

[^65]: https://stackoverflow.com/questions/75132236/how-to-share-vite-config-in-monorepo

[^66]: https://turbo.build/repo/docs/guides/frameworks/vite

[^67]: https://hackernoon.com/building-a-robust-jsts-monorepo-best-practices-with-yarn-nx-and-changesets

[^68]: https://tailwindcss.com/docs/detecting-classes-in-source-files

[^69]: https://github.com/markozxuu/example-turborepo-changeset

[^70]: https://docs.sourcegraph.com/batch_changes/how-tos/creating_changesets_per_project_in_monorepos

[^71]: https://www.youtube.com/watch?v=vO80X5zM8_Y

[^72]: https://dev.to/jmcdo29/automating-your-package-deployment-in-an-nx-monorepo-with-changeset-4em8

[^73]: https://turbo.build/docs/guides/publishing-libraries

[^74]: https://github.com/changesets/changesets/discussions/922

[^75]: https://www.johno.com/changesets

[^76]: https://www.reddit.com/r/reactjs/comments/v1lcd7/monorepos_for_react_extensive_walkthrough/

[^77]: https://stackoverflow.com/questions/76417690/can-i-publish-only-a-subset-of-packages-in-one-turborepo-using-changesets

[^78]: https://www.christopherbiscardi.com/post/shipping-multipackage-repos-with-github-actions-changesets-and-lerna

[^79]: https://github.com/changesets/changesets/discussions/1042

[^80]: https://stackoverflow.com/questions/78022415/ignoring-import-errors-by-typescript-in-monorepo

[^81]: https://www.reddit.com/r/expo/comments/1fjgh8n/expo_monorepo_setup_in_the_root/

[^82]: https://www.npmjs.com/package/expo-yarn-workspaces

[^83]: https://www.reddit.com/r/reactnative/comments/1do7rsd/are_you_able_to_make_expo_dev_builds_in_monorepos/

[^84]: https://github.com/xiongemi/nx-expo-monorepo

[^85]: https://www.reddit.com/r/reactjs/comments/zqgfu3/how_should_i_use_storybook_in_a_monorepo/

[^86]: https://klaviyo.tech/organizing-and-implementing-storybook-with-chromatic-in-a-monorepo-039add905c83

[^87]: https://nx.dev/nx-api/storybook/documents/best-practices

[^88]: https://www.genspark.ai/spark/monorepo-setup-for-storybook/52c1c7ce-958c-4de8-806d-9986290f9cb3

[^89]: https://storybook.js.org

[^90]: https://github.com/tailwindlabs/tailwindcss/discussions/9890

[^91]: https://www.reddit.com/r/tailwindcss/comments/1gkc1et/sharing_tailwind_css_and_components_across_apps/

[^92]: https://vkblog.hashnode.dev/monorepo-using-turborepo-nextjs

[^93]: https://blog.abrocadabro.com/set-up-a-turborepo-monorepo-with-vite-typescript-tailwind-express-and-react-vue

[^94]: https://github.com/changesets/changesets

[^95]: https://github.com/changesets/changesets/discussions/1136

[^96]: https://pnpm.io/next/using-changesets

[^97]: https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md
