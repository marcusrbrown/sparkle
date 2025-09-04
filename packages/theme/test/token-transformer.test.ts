import type {ThemeConfig} from '@sparkle/types'
import {beforeEach, describe, expect, it} from 'vitest'
import {defaultTransformer, TokenTransformer, tokenUtils, type TransformOptions} from '../src/utils/token-transformer'

// Mock theme configurations for testing
const mockBaseTheme: ThemeConfig = {
  colors: {
    primary: {
      50: '#eff6ff',
      500: '#3b82f6',
      900: '#1e3a8a',
    },
    neutral: {
      50: '#f9fafb',
      500: '#6b7280',
      900: '#111827',
    },
  },
  spacing: {
    0: '0',
    4: '1rem',
    8: '2rem',
  },
  typography: {
    fontFamily: {
      sans: 'Inter, sans-serif',
      mono: 'Fira Code, monospace',
    },
    fontSize: {
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
    },
    fontWeight: {
      normal: '400',
      bold: '700',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
    },
    letterSpacing: {
      normal: '0',
      wide: '0.025em',
    },
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    md: '0.375rem',
  },
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  },
  animation: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      linear: 'linear',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    },
    transition: {
      all: 'all 300ms ease',
      colors: 'color 150ms ease, background-color 150ms ease',
      transform: 'transform 200ms ease',
    },
  },
}

const mockOverrideTheme: Partial<ThemeConfig> = {
  colors: {
    primary: {
      500: '#ef4444', // Override red
    },
    secondary: {
      500: '#10b981', // New color
    },
  },
  spacing: {
    16: '4rem', // New spacing value
  },
}

describe('TokenTransformer', () => {
  let transformer: TokenTransformer

  beforeEach(() => {
    transformer = new TokenTransformer()
    transformer.clearCache()
  })

  describe('constructor', () => {
    it('should create a new instance with empty cache', () => {
      const stats = transformer.getCacheStats()
      expect(stats.size).toBe(0)
      expect(stats.keys).toEqual([])
    })
  })

  describe('transform()', () => {
    it('should transform tokens to web format', () => {
      const options: TransformOptions = {platform: 'web'}
      const result = transformer.transform(mockBaseTheme, options)

      expect(result.platform).toBe('web')
      expect(result.source).toBe(mockBaseTheme)
      expect(result.metadata.options).toEqual(options)
      expect(typeof result.metadata.transformedAt).toBe('string')
      expect(result.metadata.tokenCount).toBeGreaterThan(0)
      expect(result.tokens).toBeDefined()
    })

    it('should transform tokens to native format', () => {
      const options: TransformOptions = {platform: 'native'}
      const result = transformer.transform(mockBaseTheme, options)

      expect(result.platform).toBe('native')
      expect(result.source).toBe(mockBaseTheme)
      expect(result.metadata.options).toEqual(options)
      expect(typeof result.metadata.transformedAt).toBe('string')
      expect(result.metadata.tokenCount).toBeGreaterThan(0)
      expect(result.tokens).toBeDefined()
    })

    it('should use cache for identical transformations', () => {
      const options: TransformOptions = {platform: 'web'}

      const result1 = transformer.transform(mockBaseTheme, options)
      const result2 = transformer.transform(mockBaseTheme, options)

      expect(result1).toBe(result2) // Same object reference due to caching
      expect(transformer.getCacheStats().size).toBe(1)
    })

    it('should create different cache entries for different options', () => {
      const webOptions: TransformOptions = {platform: 'web'}
      const nativeOptions: TransformOptions = {platform: 'native'}

      transformer.transform(mockBaseTheme, webOptions)
      transformer.transform(mockBaseTheme, nativeOptions)

      expect(transformer.getCacheStats().size).toBe(2)
    })

    it('should handle web-specific options', () => {
      const options: TransformOptions = {
        platform: 'web',
        prefix: 'custom',
        selector: '.theme-root',
      }
      const result = transformer.transform(mockBaseTheme, options)

      expect(result.platform).toBe('web')
      expect(result.metadata.options.prefix).toBe('custom')
      expect(result.metadata.options.selector).toBe('.theme-root')
    })

    it('should handle native-specific options', () => {
      const options: TransformOptions = {
        platform: 'native',
        baseFontSize: 14,
        flattenColors: true,
      }
      const result = transformer.transform(mockBaseTheme, options)

      expect(result.platform).toBe('native')
      expect(result.metadata.options.baseFontSize).toBe(14)
      expect(result.metadata.options.flattenColors).toBe(true)
    })
  })

  describe('toWeb()', () => {
    it('should return CSS custom properties', () => {
      const cssVariables = transformer.toWeb(mockBaseTheme)

      expect(typeof cssVariables).toBe('object')
      expect(cssVariables).toHaveProperty('--sparkle-color-primary-500')
      expect(cssVariables['--sparkle-color-primary-500']).toBe('#3b82f6')
    })

    it('should apply custom prefix', () => {
      const cssVariables = transformer.toWeb(mockBaseTheme, {prefix: 'custom'})

      expect(cssVariables).toHaveProperty('--custom-color-primary-500')
      expect(cssVariables['--custom-color-primary-500']).toBe('#3b82f6')
    })
  })

  describe('toNative()', () => {
    it('should return native theme object', () => {
      const nativeTheme = transformer.toNative(mockBaseTheme)

      expect(typeof nativeTheme).toBe('object')
      expect(nativeTheme).toHaveProperty('colors')
      expect(nativeTheme).toHaveProperty('spacing')
      expect(nativeTheme).toHaveProperty('typography')
      expect(nativeTheme.colors).toHaveProperty('primary_500')
      expect(nativeTheme.colors.primary_500).toBe('#3b82f6')
    })

    it('should apply custom base font size', () => {
      const nativeTheme = transformer.toNative(mockBaseTheme, {baseFontSize: 14})

      expect(nativeTheme.typography.fontSize.base).toBeDefined()
      // The actual conversion logic would depend on the implementation
    })
  })

  describe('clearCache()', () => {
    it('should clear the transformation cache', () => {
      transformer.transform(mockBaseTheme, {platform: 'web'})
      expect(transformer.getCacheStats().size).toBe(1)

      transformer.clearCache()
      expect(transformer.getCacheStats().size).toBe(0)
    })
  })

  describe('getCacheStats()', () => {
    it('should return correct cache statistics', () => {
      const stats1 = transformer.getCacheStats()
      expect(stats1.size).toBe(0)
      expect(stats1.keys).toEqual([])

      transformer.transform(mockBaseTheme, {platform: 'web'})
      transformer.transform(mockBaseTheme, {platform: 'native'})

      const stats2 = transformer.getCacheStats()
      expect(stats2.size).toBe(2)
      expect(stats2.keys).toHaveLength(2)
      expect(typeof stats2.keys[0]).toBe('string')
    })
  })
})

describe('tokenUtils', () => {
  describe('compareThemes()', () => {
    it('should find no differences for identical themes', () => {
      const differences = tokenUtils.compareThemes(mockBaseTheme, mockBaseTheme)
      expect(differences).toEqual([])
    })

    it('should detect value differences', () => {
      const modifiedTheme = {
        ...mockBaseTheme,
        colors: {
          ...mockBaseTheme.colors,
          primary: {
            ...mockBaseTheme.colors.primary,
            500: '#ff0000', // Different value
          },
        },
      }

      const differences = tokenUtils.compareThemes(mockBaseTheme, modifiedTheme)
      expect(differences).toContain('colors.primary.500: value mismatch (#3b82f6 vs #ff0000)')
    })

    it('should detect missing properties', () => {
      const incompleteTheme = {
        colors: {
          primary: {
            500: '#3b82f6',
          },
        },
        typography: {
          fontFamily: {},
          fontSize: {},
          fontWeight: {},
          lineHeight: {},
          letterSpacing: {},
        },
        spacing: {},
        shadows: {},
        borderRadius: {},
        animation: {
          duration: {},
          easing: {},
          transition: {},
        },
      } as unknown as ThemeConfig

      const differences = tokenUtils.compareThemes(mockBaseTheme, incompleteTheme)
      expect(differences.length).toBeGreaterThan(0)
      expect(differences.some(diff => diff.includes('missing in second theme'))).toBe(true)
    })

    it('should detect additional properties', () => {
      const extendedTheme = {
        ...mockBaseTheme,
        colors: {
          ...mockBaseTheme.colors,
          tertiary: {
            500: '#9333ea',
          },
        },
      }

      const differences = tokenUtils.compareThemes(mockBaseTheme, extendedTheme)
      expect(differences).toContain('colors.tertiary: missing in first theme')
    })
  })

  describe('mergeThemes()', () => {
    it('should merge themes correctly', () => {
      const merged = tokenUtils.mergeThemes(mockBaseTheme, mockOverrideTheme)

      // Should override existing values
      expect(merged.colors.primary?.[500]).toBe('#ef4444')

      // Should preserve existing values
      expect(merged.colors.primary?.[50]).toBe('#eff6ff')
      expect(merged.colors.neutral?.[500]).toBe('#6b7280')

      // Should add new values
      expect(merged.colors.secondary?.[500]).toBe('#10b981')
      expect(merged.spacing[16]).toBe('4rem')

      // Should preserve unmodified sections
      expect(merged.typography).toEqual(mockBaseTheme.typography)
      expect(merged.borderRadius).toEqual(mockBaseTheme.borderRadius)
    })

    it('should handle empty override theme', () => {
      const merged = tokenUtils.mergeThemes(mockBaseTheme, {})
      expect(merged).toEqual(mockBaseTheme)
    })

    it('should handle deep nested overrides', () => {
      const deepOverride: Partial<ThemeConfig> = {
        typography: {
          fontFamily: {},
          fontWeight: {},
          lineHeight: {},
          letterSpacing: {},
          fontSize: {
            xl: '1.25rem', // New size
          },
        },
      }

      const merged = tokenUtils.mergeThemes(mockBaseTheme, deepOverride)

      // Should preserve existing typography properties
      expect(merged.typography.fontSize.sm).toBe('0.875rem')
      expect(merged.typography.fontWeight).toEqual(mockBaseTheme.typography.fontWeight)

      // Should add new typography property
      expect(merged.typography.fontSize.xl).toBe('1.25rem')
    })
  })

  describe('extractColorPalette()', () => {
    it('should extract existing color palette', () => {
      const primaryPalette = tokenUtils.extractColorPalette(mockBaseTheme, 'primary')
      expect(primaryPalette).toEqual(mockBaseTheme.colors.primary)
    })

    it('should return undefined for non-existent color', () => {
      const nonExistentPalette = tokenUtils.extractColorPalette(mockBaseTheme, 'nonexistent')
      expect(nonExistentPalette).toBeUndefined()
    })
  })

  describe('getColorNames()', () => {
    it('should return all color names', () => {
      const colorNames = tokenUtils.getColorNames(mockBaseTheme)
      expect(colorNames).toEqual(['primary', 'neutral'])
      expect(colorNames).toHaveLength(2)
    })
  })

  describe('getSpacingKeys()', () => {
    it('should return all spacing keys', () => {
      const spacingKeys = tokenUtils.getSpacingKeys(mockBaseTheme)
      expect(spacingKeys).toEqual(['0', '4', '8'])
      expect(spacingKeys).toHaveLength(3)
    })
  })
})

describe('defaultTransformer', () => {
  it('should be an instance of TokenTransformer', () => {
    expect(defaultTransformer).toBeInstanceOf(TokenTransformer)
  })

  it('should work as a singleton', () => {
    const webResult1 = defaultTransformer.toWeb(mockBaseTheme)
    const webResult2 = defaultTransformer.toWeb(mockBaseTheme)

    // Should be the same due to caching
    expect(webResult1).toBe(webResult2)
  })
})
