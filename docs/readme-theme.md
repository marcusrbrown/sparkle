# Sparkle Design System - Starlight Theme Integration

This document explains how the Sparkle Design System is integrated with Astro Starlight for consistent branding and design across the documentation site.

## Overview

The documentation site uses a custom theme that automatically generates CSS custom properties from Sparkle Design System tokens, ensuring perfect brand consistency between components and documentation.

## Theme Architecture

### Generated Theme CSS

The theme is generated from `scripts/generate-theme-css.ts` which:

1. **Imports Sparkle tokens** from `@sparkle/theme` (both light and dark variants)
2. **Maps tokens to Starlight CSS custom properties** for seamless integration
3. **Generates comprehensive CSS** with proper light/dark theme support
4. **Includes custom component styling** using Sparkle design tokens

### Key Theme Features

- **Brand Colors**: Primary blue (#3b82f6) with proper light/dark variants
- **Typography**: System font stack with consistent sizing scale
- **Spacing**: Geometric progression spacing system (0.25rem, 0.5rem, 1rem, etc.)
- **Border Radius**: Consistent corner radius values
- **Shadows**: Material Design inspired elevation system
- **Status Colors**: Success (green), warning (orange), error (red)

## File Structure

```text
docs/
├── src/styles/
│   ├── sparkle-theme.css          # Generated theme CSS (do not edit manually)
│   └── custom.css                 # Legacy CSS (replaced by sparkle-theme.css)
├── scripts/
│   └── generate-theme-css.ts      # Theme generation script
└── astro.config.mjs              # Starlight configuration
```

## Theme Generation

### Automatic Generation

The theme CSS is automatically generated from Sparkle Design System tokens:

```bash
# Generate theme CSS from tokens
pnpm run theme:generate

# This runs: tsx scripts/generate-theme-css.ts >| src/styles/sparkle-theme.css
```

### Integration Points

The generated CSS provides:

1. **Starlight CSS Custom Properties**
   - `--sl-color-accent`: Primary brand color
   - `--sl-color-text`: Text colors for light/dark themes
   - `--sl-color-gray-*`: Background and border colors

2. **Sparkle Design Tokens**
   - `--sparkle-font-family-*`: Typography system
   - `--sparkle-spacing-*`: Spacing scale
   - `--sparkle-border-radius-*`: Corner radius values
   - `--sparkle-shadow-*`: Elevation system

3. **Custom Component Styles**
   - Enhanced typography with gradient headings
   - Styled code blocks and tables
   - Interactive elements with hover states
   - Accessibility enhancements

## Theme Customization

### Colors

Colors are automatically derived from Sparkle tokens:

```css
/* Light theme */
:root {
  --sl-color-accent: #3b82f6;        /* lightTokens.colors.primary[500] */
  --sl-color-text: #171717;          /* lightTokens.colors.text.primary */
  --sl-color-white: #fafafa;         /* lightTokens.colors.background.primary */
}

/* Dark theme */
[data-theme='dark'] {
  --sl-color-accent: #60a5fa;        /* darkTokens.colors.primary[400] */
  --sl-color-text: #fafafa;          /* darkTokens.colors.text.primary */
  --sl-color-white: #171717;         /* darkTokens.colors.background.primary */
}
```

### Typography

Typography uses Sparkle's system font stack:

```css
--sparkle-font-family-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
--sparkle-font-family-mono: Menlo, Monaco, "Cascadia Code", "Segoe UI Mono", "Roboto Mono", ...;
```

### Component Styling

Custom components use Sparkle design tokens:

```css
.component-showcase {
  border-radius: var(--sparkle-border-radius-lg);
  padding: var(--sparkle-spacing-lg);
  box-shadow: var(--sparkle-shadow-md);
}
```

## Accessibility Features

The theme includes comprehensive accessibility enhancements:

- **Focus visible styles** with consistent focus rings
- **High contrast mode support** with simplified gradients
- **Reduced motion support** for users with motion sensitivities
- **Proper color contrast ratios** meeting WCAG AA guidelines

## Starlight Configuration

The theme is integrated through `astro.config.mjs`:

```javascript
starlight({
  title: 'Sparkle Design System',
  logo: {
    src: './src/assets/sparkle-logo.svg',
    replacesTitle: false,
  },
  customCss: [
    './src/styles/sparkle-theme.css',  // Generated Sparkle theme
  ],
  head: [
    {
      tag: 'meta',
      attrs: {
        name: 'theme-color',
        content: '#3b82f6',  // Sparkle brand color
      },
    },
  ],
})
```

## Development Workflow

### Making Theme Changes

1. **Modify tokens** in `packages/theme/src/tokens/`
2. **Regenerate theme CSS**:

   ```bash
   cd docs
   pnpm run theme:generate
   ```

3. **Preview changes** in development:

   ```bash
   pnpm run dev
   ```

### Updating Theme Logic

To modify how tokens are mapped to CSS:

1. **Edit** `docs/scripts/generate-theme-css.ts`
2. **Regenerate** the theme CSS
3. **Test** across light/dark themes

### Validation

Ensure theme changes work across:

- **Light and dark themes**
- **Different viewport sizes**
- **Various component states**
- **Accessibility requirements**

## Best Practices

### Token Usage

- **Always use tokens** instead of hardcoded values
- **Maintain semantic meaning** (primary, secondary, success, etc.)
- **Test in both light and dark themes**

### CSS Custom Properties

- **Use Starlight properties** for integration with existing components
- **Use Sparkle properties** for custom components
- **Maintain consistent naming** conventions

### Accessibility

- **Test focus states** for keyboard navigation
- **Verify color contrast** ratios
- **Support reduced motion** preferences
- **Test with screen readers**

## Troubleshooting

### Theme Not Loading

1. **Check CSS path** in `astro.config.mjs`
2. **Verify generation** ran successfully
3. **Clear browser cache**

### Colors Not Updating

1. **Regenerate theme CSS** after token changes
2. **Check dark theme overrides**
3. **Verify CSS custom property usage**

### Build Issues

1. **Ensure dependencies** are properly installed
2. **Check TypeScript compilation**
3. **Verify import paths** in generation script

## Future Enhancements

Planned improvements to the theme system:

1. **Automatic regeneration** on token changes
2. **Component-specific themes** for complex components
3. **Animation token integration** for consistent motion
4. **Advanced color manipulation** utilities
5. **Theme validation** and consistency checks

## Contributing

When contributing to the theme:

1. **Follow token-first approach** - always use design tokens
2. **Test accessibility** across different modes
3. **Document changes** in this README
4. **Generate theme CSS** before committing
5. **Test in multiple browsers** and viewports
