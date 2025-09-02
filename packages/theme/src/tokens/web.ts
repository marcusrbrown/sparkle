import type {ThemeConfig} from '@sparkle/types'

/**
 * Type for CSS custom properties object
 */
export interface CSSCustomProperties {
  [key: string]: string
}

/**
 * Generates CSS custom properties (CSS variables) from design tokens
 * for web platform integration with Tailwind CSS and other frameworks
 *
 * @param tokens - Theme configuration object with design tokens
 * @param prefix - Optional prefix for CSS variable names (default: 'sparkle')
 * @returns Object of CSS custom properties that can be applied to :root
 *
 * @example
 * ```typescript
 * const cssVars = generateCSSVariables(lightTokens)
 * // Returns: { '--sparkle-color-primary-500': '#3b82f6', ... }
 * ```
 */
export function generateCSSVariables(tokens: ThemeConfig, prefix = 'sparkle'): CSSCustomProperties {
  const cssVariables: CSSCustomProperties = {}

  /**
   * Helper to create CSS variable name with prefix
   */
  function createVarName(category: string, ...parts: (string | number)[]): string {
    return `--${prefix}-${category}-${parts.join('-')}`
  }

  /**
   * Helper to recursively process nested objects and create CSS variables
   */
  function processNestedObject(obj: Record<string | number, any>, category: string, parentKey = ''): void {
    for (const [key, value] of Object.entries(obj)) {
      const currentKey = parentKey ? `${parentKey}-${key}` : key

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Recursively process nested objects
        processNestedObject(value, category, currentKey)
      } else if (typeof value === 'string' || typeof value === 'number') {
        // Create CSS variable for primitive values
        cssVariables[createVarName(category, currentKey)] = String(value)
      }
    }
  }

  // Process colors
  processNestedObject(tokens.colors, 'color')

  // Process typography
  processNestedObject(tokens.typography.fontFamily, 'font', 'family')
  processNestedObject(tokens.typography.fontSize, 'font', 'size')
  processNestedObject(tokens.typography.fontWeight, 'font', 'weight')
  processNestedObject(tokens.typography.lineHeight, 'line', 'height')
  processNestedObject(tokens.typography.letterSpacing, 'letter', 'spacing')

  // Process spacing
  processNestedObject(tokens.spacing, 'spacing')

  // Process shadows
  processNestedObject(tokens.shadows, 'shadow')

  // Process border radius
  processNestedObject(tokens.borderRadius, 'border', 'radius')

  // Process animation
  processNestedObject(tokens.animation.duration, 'duration')
  processNestedObject(tokens.animation.easing, 'easing')
  processNestedObject(tokens.animation.transition, 'transition')

  return cssVariables
}

/**
 * Converts CSS custom properties object to CSS string
 * for injection into stylesheets or CSS-in-JS
 *
 * @param cssVariables - Object of CSS custom properties
 * @param selector - CSS selector to apply variables to (default: ':root')
 * @returns CSS string with custom properties
 *
 * @example
 * ```typescript
 * const cssString = cssPropertiesToString(cssVars)
 * // Returns: ':root { --sparkle-color-primary-500: #3b82f6; }'
 * ```
 */
export function cssPropertiesToString(cssVariables: CSSCustomProperties, selector = ':root'): string {
  const properties = Object.entries(cssVariables)
    .map(([property, value]) => `  ${property}: ${value};`)
    .join('\n')

  return `${selector} {\n${properties}\n}`
}

/**
 * Generates CSS custom properties string directly from theme tokens
 * Convenience function that combines generateCSSVariables and cssPropertiesToString
 *
 * @param tokens - Theme configuration object
 * @param options - Configuration options
 * @param options.prefix - Optional prefix for CSS variable names (default: 'sparkle')
 * @param options.selector - CSS selector to apply variables to (default: ':root')
 * @returns CSS string ready for injection
 *
 * @example
 * ```typescript
 * const css = generateThemeCSS(lightTokens, { prefix: 'app' })
 * document.querySelector('style')?.appendChild(document.createTextNode(css))
 * ```
 */
export function generateThemeCSS(
  tokens: ThemeConfig,
  options: {
    prefix?: string
    selector?: string
  } = {},
): string {
  const {prefix = 'sparkle', selector = ':root'} = options
  const cssVariables = generateCSSVariables(tokens, prefix)
  return cssPropertiesToString(cssVariables, selector)
}

/**
 * Creates CSS variable reference string for use in other CSS
 *
 * @param category - Token category (e.g., 'color', 'spacing')
 * @param key - Token key path (e.g., 'primary-500', 'md')
 * @param fallback - Optional fallback value
 * @param prefix - Optional prefix (default: 'sparkle')
 * @returns CSS var() function string
 *
 * @example
 * ```typescript
 * cssVar('color', 'primary-500')
 * // Returns: 'var(--sparkle-color-primary-500)'
 *
 * cssVar('spacing', 'md', '1rem', 'app')
 * // Returns: 'var(--app-spacing-md, 1rem)'
 * ```
 */
export function cssVar(category: string, key: string, fallback?: string, prefix = 'sparkle'): string {
  const varName = `--${prefix}-${category}-${key}`
  return fallback ? `var(${varName}, ${fallback})` : `var(${varName})`
}
