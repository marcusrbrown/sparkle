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
  overflow-x: auto;
  font-size: var(--sparkle-font-size-sm);
}

/* Enhanced code blocks with responsive behavior */
.sl-markdown-content code {
  font-family: var(--sparkle-font-family-mono);
  background: var(--sl-color-gray-2);
  border-radius: var(--sparkle-border-radius-sm);
  padding: 0.125rem 0.25rem;
  font-size: 0.9em;
  word-break: break-word;
}

/* Mobile: better inline code wrapping */
@media (max-width: 768px) {
  .sl-markdown-content code {
    font-size: 0.85em;
    word-break: break-all;
  }
}

/* Mobile: smaller code blocks with better scrolling */
@media (max-width: 768px) {
  .sl-markdown-content pre {
    margin-left: calc(-1 * var(--sparkle-responsive-padding));
    margin-right: calc(-1 * var(--sparkle-responsive-padding));
    border-radius: 0;
    border-left: none;
    border-right: none;
    font-size: var(--sparkle-font-size-xs);
  }

  .sl-markdown-content pre code {
    padding: var(--sparkle-spacing-md);
    display: block;
  }
}

/* Component showcase styling with responsive design */
.component-showcase {
  border: 1px solid var(--sl-color-gray-3);
  border-radius: var(--sparkle-border-radius-lg);
  padding: var(--sparkle-responsive-padding);
  margin: var(--sparkle-spacing-md) 0;
  background: var(--sl-color-white);
  box-shadow: var(--sparkle-shadow-md);
}

.component-showcase-header {
  display: flex;
  flex-direction: column;
  gap: var(--sparkle-spacing-sm);
  margin-bottom: var(--sparkle-spacing-md);
  padding-bottom: var(--sparkle-spacing-sm);
  border-bottom: 1px solid var(--sl-color-gray-3);
}

/* Tablet and up: horizontal layout for showcase header */
@media (min-width: 768px) {
  .component-showcase-header {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: var(--sparkle-spacing-md);
  }
}

/* Interactive playground styles with mobile-first responsive design */
.playground-container {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sparkle-spacing-sm);
  margin: var(--sparkle-spacing-md) 0;
  padding: var(--sparkle-responsive-padding);
}

/* Tablet and up: side-by-side layout */
@media (min-width: 768px) {
  .playground-container {
    grid-template-columns: 1fr 1fr;
    gap: var(--sparkle-spacing-md);
  }
}

/* Large desktop: more generous spacing */
@media (min-width: 1280px) {
  .playground-container {
    gap: var(--sparkle-spacing-lg);
  }
}

/* Badge styling with responsive design */
.status-badge {
  padding: var(--sparkle-spacing-xs) var(--sparkle-spacing-sm);
  border-radius: var(--sparkle-border-radius-sm);
  font-size: var(--sparkle-font-size-xs);
  font-weight: 600;
  font-family: var(--sparkle-font-family-sans);
  text-transform: uppercase;
  white-space: nowrap;
}

/* Mobile: smaller badges */
@media (max-width: 768px) {
  .status-badge {
    font-size: calc(var(--sparkle-font-size-xs) * 0.9);
    padding: calc(var(--sparkle-spacing-xs) * 0.75) var(--sparkle-spacing-xs);
  }
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

/* Navigation enhancements with responsive design and Sparkle brand colors */
.sl-sidebar-item[data-current-page] > a {
  background: linear-gradient(135deg, var(--sl-color-accent-low), var(--sl-color-accent));
  color: white;
  font-weight: 600;
  border-radius: var(--sparkle-border-radius-sm);
}

/* Mobile: better touch targets for navigation */
@media (max-width: 768px) {
  .sl-sidebar-item > a {
    padding: var(--sparkle-spacing-sm) var(--sparkle-spacing-md);
    min-height: 44px;
    display: flex;
    align-items: center;
  }

  .sl-sidebar-item[data-current-page] > a {
    margin: var(--sparkle-spacing-xs) 0;
  }
}

/* Search enhancements with responsive behavior and Sparkle focus styles */
.pagefind-ui__search-input {
  border: 2px solid var(--sl-color-gray-3);
  border-radius: var(--sparkle-border-radius-sm);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  font-family: var(--sparkle-font-family-sans);
  min-height: 44px;
  font-size: var(--sparkle-font-size-base);
}

.pagefind-ui__search-input:focus {
  border-color: var(--sl-color-accent);
  outline: none;
  box-shadow: 0 0 0 3px rgb(from var(--sl-color-accent) r g b / 0.1);
}

/* Mobile: full-width search with larger touch target */
@media (max-width: 768px) {
  .pagefind-ui__search-input {
    width: 100%;
    min-height: 48px;
    font-size: var(--sparkle-font-size-lg);
    padding: var(--sparkle-spacing-md);
  }

  .pagefind-ui {
    width: 100%;
  }
}

/* Button styling with responsive design and Sparkle design patterns */
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
  font-size: var(--sparkle-font-size-base);
  min-height: 44px; /* iOS touch target minimum */
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.sl-link-button:hover,
.sl-button:hover {
  background: var(--sl-color-accent-high);
  transform: translateY(-1px);
  box-shadow: var(--sparkle-shadow-md);
}

/* Mobile: larger touch targets and better spacing */
@media (max-width: 768px) {
  .sl-link-button,
  .sl-button {
    min-height: 48px; /* Larger touch target for mobile */
    padding: var(--sparkle-spacing-md) var(--sparkle-spacing-lg);
    font-size: var(--sparkle-font-size-base);
    width: 100%; /* Full width buttons on mobile when appropriate */
  }

  /* Don't make inline buttons full width */
  .sl-markdown-content .sl-link-button,
  .sl-markdown-content .sl-button {
    width: auto;
    display: inline-flex;
  }
}

/* Table styling with mobile-first responsive behavior */
.sl-markdown-content table {
  border-radius: var(--sparkle-border-radius-md);
  overflow: hidden;
  box-shadow: var(--sparkle-shadow-sm);
  border: 1px solid var(--sl-color-gray-3);
  width: 100%;
  font-size: var(--sparkle-font-size-sm);
}

/* Mobile: horizontal scroll for tables */
@media (max-width: 768px) {
  .sl-markdown-content table {
    display: block;
    overflow-x: auto;
    white-space: nowrap;
    border-radius: 0;
    margin-left: calc(-1 * var(--sparkle-responsive-padding));
    margin-right: calc(-1 * var(--sparkle-responsive-padding));
    border-left: none;
    border-right: none;
  }

  .sl-markdown-content thead,
  .sl-markdown-content tbody,
  .sl-markdown-content tr {
    display: table;
    table-layout: fixed;
    width: 100%;
  }
}

.sl-markdown-content th {
  background: var(--sl-color-gray-2);
  font-family: var(--sparkle-font-family-sans);
  font-weight: 600;
  padding: var(--sparkle-spacing-sm) var(--sparkle-spacing-md);
  text-align: left;
}

.sl-markdown-content td {
  padding: var(--sparkle-spacing-sm) var(--sparkle-spacing-md);
  border-top: 1px solid var(--sl-color-gray-3);
}

/* Mobile: smaller table padding */
@media (max-width: 768px) {
  .sl-markdown-content th,
  .sl-markdown-content td {
    padding: var(--sparkle-spacing-xs) var(--sparkle-spacing-sm);
    font-size: var(--sparkle-font-size-xs);
  }
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

/* === RESPONSIVE BREAKPOINTS === */
/* Mobile-first approach with Sparkle design tokens */

/* Small mobile (320px and up) */
@media (min-width: 320px) {
  :root {
    --sparkle-responsive-padding: var(--sparkle-spacing-sm);
    --sparkle-responsive-font-scale: 0.9;
  }
}

/* Large mobile (480px and up) */
@media (min-width: 480px) {
  :root {
    --sparkle-responsive-padding: var(--sparkle-spacing-md);
    --sparkle-responsive-font-scale: 0.95;
  }
}

/* Tablet (768px and up) */
@media (min-width: 768px) {
  :root {
    --sparkle-responsive-padding: var(--sparkle-spacing-lg);
    --sparkle-responsive-font-scale: 1;
  }
}

/* Desktop (1024px and up) */
@media (min-width: 1024px) {
  :root {
    --sparkle-responsive-padding: var(--sparkle-spacing-xl);
    --sparkle-responsive-font-scale: 1;
  }
}

/* Large desktop (1280px and up) */
@media (min-width: 1280px) {
  :root {
    --sparkle-responsive-padding: var(--sparkle-spacing-xl);
    --sparkle-responsive-font-scale: 1.05;
  }
}

/* === RESPONSIVE TYPOGRAPHY === */
/* Scale typography based on screen size */
.sl-markdown-content h1 {
  font-size: calc(var(--sparkle-font-size-3xl) * var(--sparkle-responsive-font-scale, 1));
}

.sl-markdown-content h2 {
  font-size: calc(var(--sparkle-font-size-2xl) * var(--sparkle-responsive-font-scale, 1));
}

.sl-markdown-content h3 {
  font-size: calc(var(--sparkle-font-size-xl) * var(--sparkle-responsive-font-scale, 1));
}

.sl-markdown-content h4 {
  font-size: calc(var(--sparkle-font-size-lg) * var(--sparkle-responsive-font-scale, 1));
}

/* === RESPONSIVE LAYOUT UTILITIES === */
/* Content width constraints for better readability */
.sl-markdown-content {
  max-width: 100%;
}

/* Responsive images and media */
.sl-markdown-content img {
  max-width: 100%;
  height: auto;
  border-radius: var(--sparkle-border-radius-md);
}

/* Responsive video embeds */
.sl-markdown-content iframe {
  max-width: 100%;
  border-radius: var(--sparkle-border-radius-md);
}

/* Mobile: full-bleed content for better space usage */
@media (max-width: 768px) {
  .sl-markdown-content img,
  .sl-markdown-content iframe {
    width: 100%;
    margin-left: calc(-1 * var(--sparkle-responsive-padding));
    margin-right: calc(-1 * var(--sparkle-responsive-padding));
    border-radius: 0;
  }
}

/* === RESPONSIVE STORYBOOK EMBEDS === */
/* Enhanced responsive behavior for Storybook iframe embeds */
.storybook-embed-wrapper {
  width: 100%;
  margin: var(--sparkle-spacing-md) 0;
  border-radius: var(--sparkle-border-radius-lg);
  overflow: hidden;
  box-shadow: var(--sparkle-shadow-md);
  border: 1px solid var(--sl-color-gray-3);
}

.storybook-embed-wrapper iframe {
  width: 100%;
  border: none;
  display: block;
}

/* Mobile: smaller margins and full-width */
@media (max-width: 768px) {
  .storybook-embed-wrapper {
    margin: var(--sparkle-spacing-sm) calc(-1 * var(--sparkle-responsive-padding));
    border-radius: 0;
    border-left: none;
    border-right: none;
  }
}

/* Tablet: restore some margins */
@media (min-width: 768px) and (max-width: 1024px) {
  .storybook-embed-wrapper {
    margin: var(--sparkle-spacing-md) calc(-1 * var(--sparkle-spacing-sm));
  }
}

/* === RESPONSIVE CONTENT SPACING === */
/* Adjust content spacing based on screen size */
.sl-markdown-content > * + * {
  margin-top: var(--sparkle-spacing-md);
}

@media (max-width: 768px) {
  .sl-markdown-content > * + * {
    margin-top: var(--sparkle-spacing-sm);
  }

  .sl-markdown-content h1 + *,
  .sl-markdown-content h2 + *,
  .sl-markdown-content h3 + * {
    margin-top: var(--sparkle-spacing-md);
  }
}

/* === RESPONSIVE UTILITY CLASSES === */
/* Utility classes for responsive behavior */
.mobile-hidden {
  display: block;
}

@media (max-width: 768px) {
  .mobile-hidden {
    display: none;
  }
}

.mobile-only {
  display: none;
}

@media (max-width: 768px) {
  .mobile-only {
    display: block;
  }
}

.tablet-hidden {
  display: block;
}

@media (min-width: 768px) and (max-width: 1024px) {
  .tablet-hidden {
    display: none;
  }
}

/* Responsive text alignment */
.text-center-mobile {
  text-align: left;
}

@media (max-width: 768px) {
  .text-center-mobile {
    text-align: center;
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
