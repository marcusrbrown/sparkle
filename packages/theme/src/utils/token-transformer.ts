import type {ThemeConfig} from '@sparkle/types'
import {generateNativeTheme, type NativeTheme} from '../tokens/native.js'
import {generateCSSVariables, type CSSCustomProperties} from '../tokens/web.js'

/**
 * Platform target for token transformation
 */
export type Platform = 'web' | 'native'

/**
 * Token transformation options
 */
export interface TransformOptions {
  /**
   * Target platform for transformation
   */
  platform: Platform
  /**
   * Optional prefix for CSS variables (web only)
   */
  prefix?: string
  /**
   * Base font size for rem calculations (default: 16)
   */
  baseFontSize?: number
  /**
   * Whether to flatten nested color objects for easier access (native only)
   */
  flattenColors?: boolean
  /**
   * CSS selector for CSS variables (web only, default: ':root')
   */
  selector?: string
}

/**
 * Result of token transformation
 */
export interface TransformResult {
  /**
   * Target platform
   */
  platform: Platform
  /**
   * Transformed tokens (CSS variables for web, native theme for mobile)
   */
  tokens: CSSCustomProperties | NativeTheme
  /**
   * Original theme configuration
   */
  source: ThemeConfig
  /**
   * Transformation metadata
   */
  metadata: {
    transformedAt: string
    options: TransformOptions
    tokenCount: number
  }
}

/**
 * Cross-platform token transformer
 * Converts design tokens between web (CSS custom properties) and native (React Native StyleSheet) formats
 *
 * @example
 * ```typescript
 * const transformer = new TokenTransformer()
 *
 * // Transform to web format
 * const webResult = transformer.transform(lightTokens, { platform: 'web' })
 *
 * // Transform to native format
 * const nativeResult = transformer.transform(lightTokens, { platform: 'native' })
 * ```
 */
export class TokenTransformer {
  private cache = new Map<string, TransformResult>()

  /**
   * Transform design tokens to target platform format
   *
   * @param tokens - Source theme configuration
   * @param options - Transformation options
   * @returns Transformation result with platform-specific tokens
   */
  transform(tokens: ThemeConfig, options: TransformOptions): TransformResult {
    const cacheKey = this.generateCacheKey(tokens, options)

    // Check cache first
    const cachedResult = this.cache.get(cacheKey)
    if (cachedResult) {
      return cachedResult
    }

    const result = this.performTransformation(tokens, options)

    // Cache the result
    this.cache.set(cacheKey, result)

    return result
  }

  /**
   * Transform tokens to web format (CSS custom properties)
   *
   * @param tokens - Source theme configuration
   * @param options - Web-specific options
   * @returns CSS custom properties object
   */
  toWeb(tokens: ThemeConfig, options: Omit<TransformOptions, 'platform'> = {}): CSSCustomProperties {
    const result = this.transform(tokens, {...options, platform: 'web'})
    return result.tokens as CSSCustomProperties
  }

  /**
   * Transform tokens to native format (React Native StyleSheet)
   *
   * @param tokens - Source theme configuration
   * @param options - Native-specific options
   * @returns Native theme object
   */
  toNative(tokens: ThemeConfig, options: Omit<TransformOptions, 'platform'> = {}): NativeTheme {
    const result = this.transform(tokens, {...options, platform: 'native'})
    return result.tokens as NativeTheme
  }

  /**
   * Clear transformation cache
   * Useful when tokens have been updated
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {size: number; keys: string[]} {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }

  /**
   * Perform the actual transformation
   */
  private performTransformation(tokens: ThemeConfig, options: TransformOptions): TransformResult {
    const transformedAt = new Date().toISOString()

    let transformedTokens: CSSCustomProperties | NativeTheme
    let tokenCount: number

    if (options.platform === 'web') {
      transformedTokens = generateCSSVariables(tokens, options.prefix)
      tokenCount = Object.keys(transformedTokens).length
    } else {
      transformedTokens = generateNativeTheme(tokens, {
        baseFontSize: options.baseFontSize,
        flattenColors: options.flattenColors,
      })
      tokenCount = this.countNativeTokens(transformedTokens)
    }

    return {
      platform: options.platform,
      tokens: transformedTokens,
      source: tokens,
      metadata: {
        transformedAt,
        options,
        tokenCount,
      },
    }
  }

  /**
   * Generate cache key for transformation
   */
  private generateCacheKey(tokens: ThemeConfig, options: TransformOptions): string {
    // Simple hash of tokens and options for caching
    const tokenHash = this.simpleHash(JSON.stringify(tokens))
    const optionsHash = this.simpleHash(JSON.stringify(options))
    return `${tokenHash}-${optionsHash}`
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Count tokens in native theme object
   */
  private countNativeTokens(nativeTheme: NativeTheme): number {
    let count = 0
    count += Object.keys(nativeTheme.colors).length
    count += Object.keys(nativeTheme.spacing).length
    count += Object.keys(nativeTheme.typography.fontSize).length
    count += Object.keys(nativeTheme.typography.fontWeight).length
    count += Object.keys(nativeTheme.borderRadius).length
    count += Object.keys(nativeTheme.shadows).length
    count += Object.keys(nativeTheme.animation.duration).length
    return count
  }
}

/**
 * Utility functions for common token transformations
 */
export const tokenUtils = {
  /**
   * Compare two theme configurations for differences
   *
   * @param theme1 - First theme configuration
   * @param theme2 - Second theme configuration
   * @returns Array of differences found
   */
  compareThemes(theme1: ThemeConfig, theme2: ThemeConfig): string[] {
    const differences: string[] = []

    // Simple deep comparison for differences
    const compare = (obj1: any, obj2: any, path = ''): void => {
      if (typeof obj1 !== typeof obj2) {
        differences.push(`${path}: type mismatch`)
        return
      }

      if (typeof obj1 === 'object' && obj1 !== null) {
        const keys1 = Object.keys(obj1)
        const keys2 = Object.keys(obj2)

        for (const key of keys1) {
          if (Object.prototype.hasOwnProperty.call(obj2, key)) {
            compare(obj1[key], obj2[key], path ? `${path}.${key}` : key)
          } else {
            differences.push(`${path}.${key}: missing in second theme`)
          }
        }

        for (const key of keys2) {
          if (Object.prototype.hasOwnProperty.call(obj1, key)) {
            // Already processed above
          } else {
            differences.push(`${path}.${key}: missing in first theme`)
          }
        }
      } else if (obj1 !== obj2) {
        differences.push(`${path}: value mismatch (${obj1} vs ${obj2})`)
      }
    }

    compare(theme1, theme2)
    return differences
  },

  /**
   * Merge two theme configurations with the second overriding the first
   *
   * @param baseTheme - Base theme configuration
   * @param overrideTheme - Theme configuration to merge on top
   * @returns Merged theme configuration
   */
  mergeThemes(baseTheme: ThemeConfig, overrideTheme: Partial<ThemeConfig>): ThemeConfig {
    // Deep merge implementation
    const deepMerge = (target: any, source: any): any => {
      const result = {...target}

      const sourceKeys = Object.keys(source)
      for (const key of sourceKeys) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = deepMerge(target[key] || {}, source[key])
        } else {
          result[key] = source[key]
        }
      }

      return result
    }

    return deepMerge(baseTheme, overrideTheme)
  },

  /**
   * Extract specific color palette from theme
   *
   * @param theme - Theme configuration
   * @param colorKey - Color key to extract (e.g., 'primary', 'neutral')
   * @returns Color scale object
   */
  extractColorPalette(theme: ThemeConfig, colorKey: string): Record<string | number, string> | undefined {
    return theme.colors[colorKey]
  },

  /**
   * Get all semantic color names from theme
   *
   * @param theme - Theme configuration
   * @returns Array of color names
   */
  getColorNames(theme: ThemeConfig): string[] {
    return Object.keys(theme.colors)
  },

  /**
   * Get all spacing scale keys
   *
   * @param theme - Theme configuration
   * @returns Array of spacing keys
   */
  getSpacingKeys(theme: ThemeConfig): (string | number)[] {
    return Object.keys(theme.spacing)
  },
}

/**
 * Default transformer instance for convenience
 */
export const defaultTransformer = new TokenTransformer()
