/**
 * Generate CSS custom properties for Starlight theme customization
 * from Sparkle Design System tokens
 */

import process from 'node:process'

import {darkTokens, lightTokens} from '@sparkle/theme'

/**
 * Maps Sparkle theme tokens to Starlight CSS custom properties
 * @see https://starlight.astro.build/guides/css-and-tailwind/#custom-css-properties
 */
function generateStarlightThemeCSS(): string {
  const css = `/* Sparkle Design System - Starlight Theme Customization */
/* Generated from @sparkle/theme tokens */

:root {
  /* === STARLIGHT COLORS MAPPED FROM SPARKLE THEME === */

  /* Brand/Accent Colors */
  --sl-color-accent-low: ${lightTokens.colors.primary[200]};
  --sl-color-accent: ${lightTokens.colors.primary[500]};
  --sl-color-accent-high: ${lightTokens.colors.primary[600]};

  /* Background Colors */
  --sl-color-white: ${lightTokens.colors.background?.primary || '#fafafa'};
  --sl-color-gray-1: ${lightTokens.colors.background?.secondary || '#f5f5f5'};
  --sl-color-gray-2: ${lightTokens.colors.background?.tertiary || '#e5e5e5'};
  --sl-color-gray-3: ${lightTokens.colors.border?.primary || '#e5e5e5'};
  --sl-color-gray-4: ${lightTokens.colors.border?.secondary || '#d4d4d4'};
  --sl-color-gray-5: ${lightTokens.colors.text?.secondary || '#525252'};
  --sl-color-gray-6: ${lightTokens.colors.text?.primary || '#171717'};
  --sl-color-black: ${lightTokens.colors.background?.inverse || '#171717'};

  /* Text Colors */
  --sl-color-text: ${lightTokens.colors.text?.primary || '#171717'};
  --sl-color-text-accent: ${lightTokens.colors.interactive?.primary || '#3b82f6'};

  /* Status Colors */
  --sl-color-green: ${lightTokens.colors.success[500]};
  --sl-color-orange: ${lightTokens.colors.warning[500]};
  --sl-color-red: ${lightTokens.colors.error[500]};

  /* === SPARKLE DESIGN TOKENS === */

  /* Typography */
  --sparkle-font-family-sans: ${lightTokens.typography.fontFamily.sans};
  --sparkle-font-family-mono: ${lightTokens.typography.fontFamily.mono};

  /* Font Sizes */
  --sparkle-font-size-xs: ${lightTokens.typography.fontSize.xs};
  --sparkle-font-size-sm: ${lightTokens.typography.fontSize.sm};
  --sparkle-font-size-base: ${lightTokens.typography.fontSize.base};
  --sparkle-font-size-lg: ${lightTokens.typography.fontSize.lg};
  --sparkle-font-size-xl: ${lightTokens.typography.fontSize.xl};
  --sparkle-font-size-2xl: ${lightTokens.typography.fontSize['2xl']};
  --sparkle-font-size-3xl: ${lightTokens.typography.fontSize['3xl']};

  /* Spacing */
  --sparkle-spacing-xs: ${lightTokens.spacing['1']};
  --sparkle-spacing-sm: ${lightTokens.spacing['2']};
  --sparkle-spacing-md: ${lightTokens.spacing['4']};
  --sparkle-spacing-lg: ${lightTokens.spacing['6']};
  --sparkle-spacing-xl: ${lightTokens.spacing['8']};

  /* Border Radius */
  --sparkle-border-radius-sm: ${lightTokens.borderRadius.sm};
  --sparkle-border-radius-md: ${lightTokens.borderRadius.md};
  --sparkle-border-radius-lg: ${lightTokens.borderRadius.lg};
  --sparkle-border-radius-full: ${lightTokens.borderRadius.full};

  /* Shadows */
  --sparkle-shadow-sm: ${lightTokens.shadows.sm};
  --sparkle-shadow-md: ${lightTokens.shadows.base};
  --sparkle-shadow-lg: ${lightTokens.shadows.lg};
}

/* === DARK THEME OVERRIDES === */
[data-theme='dark'] {
  /* Brand/Accent Colors for Dark Mode */
  --sl-color-accent-low: ${darkTokens.colors.primary[300]};
  --sl-color-accent: ${darkTokens.colors.primary[400]};
  --sl-color-accent-high: ${darkTokens.colors.primary[300]};

  /* Background Colors for Dark Mode */
  --sl-color-white: ${darkTokens.colors.background?.primary || '#171717'};
  --sl-color-gray-1: ${darkTokens.colors.background?.secondary || '#262626'};
  --sl-color-gray-2: ${darkTokens.colors.background?.tertiary || '#404040'};
  --sl-color-gray-3: ${darkTokens.colors.border?.primary || '#404040'};
  --sl-color-gray-4: ${darkTokens.colors.border?.secondary || '#525252'};
  --sl-color-gray-5: ${darkTokens.colors.text?.secondary || '#d4d4d4'};
  --sl-color-gray-6: ${darkTokens.colors.text?.primary || '#fafafa'};
  --sl-color-black: ${darkTokens.colors.background?.inverse || '#fafafa'};

  /* Text Colors for Dark Mode */
  --sl-color-text: ${darkTokens.colors.text?.primary || '#fafafa'};
  --sl-color-text-accent: ${darkTokens.colors.interactive?.primary || '#60a5fa'};

  /* Status Colors for Dark Mode (slightly lighter) */
  --sl-color-green: ${darkTokens.colors.success[400]};
  --sl-color-orange: ${darkTokens.colors.warning[400]};
  --sl-color-red: ${darkTokens.colors.error[400]};
}

/* === SPARKLE CUSTOM COMPONENTS === */

/* Enhanced typography with Sparkle design tokens */
.sl-markdown-content h1 {
  background: linear-gradient(135deg, var(--sl-color-accent), var(--sl-color-accent-high));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 700;
  font-family: var(--sparkle-font-family-sans);
}

.sl-markdown-content h2,
.sl-markdown-content h3,
.sl-markdown-content h4,
.sl-markdown-content h5,
.sl-markdown-content h6 {
  font-family: var(--sparkle-font-family-sans);
  color: var(--sl-color-text);
}

/* Enhanced code blocks with Sparkle styling */
.sl-markdown-content pre {
  border: 1px solid var(--sl-color-gray-3);
  border-radius: var(--sparkle-border-radius-md);
  background: var(--sl-color-gray-1);
  box-shadow: var(--sparkle-shadow-sm);
}

.sl-markdown-content code {
  font-family: var(--sparkle-font-family-mono);
  background: var(--sl-color-gray-2);
  border-radius: var(--sparkle-border-radius-sm);
  padding: 0.125rem 0.25rem;
}

/* Component showcase styling with Sparkle design tokens */
.component-showcase {
  border: 1px solid var(--sl-color-gray-3);
  border-radius: var(--sparkle-border-radius-lg);
  padding: var(--sparkle-spacing-lg);
  margin: var(--sparkle-spacing-md) 0;
  background: var(--sl-color-white);
  box-shadow: var(--sparkle-shadow-md);
}

.component-showcase-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--sparkle-spacing-md);
  padding-bottom: var(--sparkle-spacing-sm);
  border-bottom: 1px solid var(--sl-color-gray-3);
}

/* Interactive playground styles with Sparkle spacing */
.playground-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sparkle-spacing-md);
  margin: var(--sparkle-spacing-md) 0;
}

@media (max-width: 768px) {
  .playground-container {
    grid-template-columns: 1fr;
  }
}

/* Badge styling with Sparkle colors and design tokens */
.status-badge {
  padding: var(--sparkle-spacing-xs) var(--sparkle-spacing-sm);
  border-radius: var(--sparkle-border-radius-sm);
  font-size: var(--sparkle-font-size-xs);
  font-weight: 600;
  font-family: var(--sparkle-font-family-sans);
  text-transform: uppercase;
}

.status-badge--stable {
  background: var(--sl-color-green);
  color: white;
}

.status-badge--beta {
  background: var(--sl-color-orange);
  color: white;
}

.status-badge--experimental {
  background: var(--sl-color-red);
  color: white;
}

/* Navigation enhancements with Sparkle brand colors */
.sl-sidebar-item[data-current-page] > a {
  background: linear-gradient(135deg, var(--sl-color-accent-low), var(--sl-color-accent));
  color: white;
  font-weight: 600;
  border-radius: var(--sparkle-border-radius-sm);
}

/* Search enhancements with Sparkle focus styles */
.pagefind-ui__search-input {
  border: 2px solid var(--sl-color-gray-3);
  border-radius: var(--sparkle-border-radius-sm);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  font-family: var(--sparkle-font-family-sans);
}

.pagefind-ui__search-input:focus {
  border-color: var(--sl-color-accent);
  outline: none;
  box-shadow: 0 0 0 3px rgb(from var(--sl-color-accent) r g b / 0.1);
}

/* Button styling with Sparkle design patterns */
.sl-link-button,
.sl-button {
  background: var(--sl-color-accent);
  border: none;
  border-radius: var(--sparkle-border-radius-md);
  padding: var(--sparkle-spacing-sm) var(--sparkle-spacing-md);
  font-family: var(--sparkle-font-family-sans);
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: var(--sparkle-shadow-sm);
}

.sl-link-button:hover,
.sl-button:hover {
  background: var(--sl-color-accent-high);
  transform: translateY(-1px);
  box-shadow: var(--sparkle-shadow-md);
}

/* Table styling with Sparkle design tokens */
.sl-markdown-content table {
  border-radius: var(--sparkle-border-radius-md);
  overflow: hidden;
  box-shadow: var(--sparkle-shadow-sm);
  border: 1px solid var(--sl-color-gray-3);
}

.sl-markdown-content th {
  background: var(--sl-color-gray-2);
  font-family: var(--sparkle-font-family-sans);
  font-weight: 600;
  padding: var(--sparkle-spacing-sm) var(--sparkle-spacing-md);
}

.sl-markdown-content td {
  padding: var(--sparkle-spacing-sm) var(--sparkle-spacing-md);
  border-top: 1px solid var(--sl-color-gray-3);
}

/* Accessibility enhancements */
:focus-visible {
  outline: 2px solid var(--sl-color-accent);
  outline-offset: 2px;
  border-radius: var(--sparkle-border-radius-sm);
}

/* High contrast support */
@media (prefers-contrast: high) {
  .sl-markdown-content h1 {
    background: none;
    -webkit-text-fill-color: initial;
    color: var(--sl-color-text);
  }

  .sl-sidebar-item[data-current-page] > a {
    background: var(--sl-color-accent);
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .sl-link-button,
  .sl-button,
  .pagefind-ui__search-input {
    transition: none;
  }

  .sl-link-button:hover,
  .sl-button:hover {
    transform: none;
  }
}
`

  return css
}

// Generate and export the CSS
export const starlightThemeCSS = generateStarlightThemeCSS()

// For command line usage
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(starlightThemeCSS)
}
