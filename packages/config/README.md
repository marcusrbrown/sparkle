# @sparkle/config

Shared configuration files for the Sparkle Design System monorepo.

## Overview

This package provides shared configuration for tools used across all Sparkle packages, ensuring consistency in build processes, linting, and styling.

## Installation

This package is typically used as a dependency of other Sparkle packages and doesn't need to be installed directly.

```bash
pnpm add @sparkle/config
```

## Usage

### Tailwind Configuration

Import the base Tailwind configuration:

```javascript
// tailwind.config.ts
import { tailwindConfig } from '@sparkle/config/tailwind'

export default {
  ...tailwindConfig,
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    // Add your content paths
  ],
  theme: {
    extend: {
      ...tailwindConfig.theme?.extend,
      // Add your custom theme extensions
    },
  },
}
```

## Exports

### Main Export (`@sparkle/config`)

- Core configuration utilities
- Shared build configurations

### Tailwind Config (`@sparkle/config/tailwind`)

- Base Tailwind CSS configuration
- Sparkle design system theme presets
- Consistent spacing, colors, and typography scales

## Configurations Included

### Tailwind CSS

Provides:

- Design system color palette
- Spacing scale
- Typography presets
- Border radius values
- Shadow utilities
- Animation configurations

## Development

```bash
# Build package
pnpm build

# Type check
pnpm typecheck

# Lint code
pnpm lint
```

## Extending Configurations

### Tailwind Extension Example

```tsx
import type { Config } from 'tailwindcss'

import { tailwindConfig } from '@sparkle/config/tailwind'

export default {
  ...tailwindConfig,
  theme: {
    extend: {
      ...tailwindConfig.theme?.extend,
      colors: {
        brand: {
          primary: '#3b82f6',
          secondary: '#8b5cf6',
        },
      },
    },
  },
} satisfies Config
```

## Best Practices

1. **Extend, don't replace**: Always extend the base configurations rather than replacing them
2. **Maintain consistency**: Use shared configurations to ensure consistent tooling across packages
3. **Version alignment**: Keep tool versions aligned with the configuration package

## Contributing

When updating configurations:

1. Ensure backward compatibility for existing packages
2. Document breaking changes clearly
3. Test configurations in all consuming packages
4. Run type checks: `pnpm typecheck`
5. Update documentation as needed

## Related Packages

- [`@sparkle/theme`](../theme/README.md) - Theme system using Tailwind configuration
- [`@sparkle/ui`](../ui/README.md) - UI components using shared configs
- [`@sparkle/storybook`](../storybook/README.md) - Storybook using Tailwind configuration

## Documentation

For complete documentation, visit [sparkle.mrbro.dev](https://sparkle.mrbro.dev)
