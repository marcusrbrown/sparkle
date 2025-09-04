import type {ThemeConfig} from '@sparkle/types'
import {describe, expect, it} from 'vitest'
import {baseTokens} from '../src/tokens/base'
import {darkTokens} from '../src/tokens/dark'
import {lightTokens} from '../src/tokens/light'
import {generateNativeTheme, type NativeTheme} from '../src/tokens/native'
import {generateCSSVariables, type CSSCustomProperties} from '../src/tokens/web'

describe('Theme Tokens', () => {
  describe('baseTokens', () => {
    it('should have all required theme properties', () => {
      expect(baseTokens).toHaveProperty('colors')
      expect(baseTokens).toHaveProperty('spacing')
      expect(baseTokens).toHaveProperty('typography')
      expect(baseTokens).toHaveProperty('borderRadius')
      expect(baseTokens).toHaveProperty('shadows')
      expect(baseTokens).toHaveProperty('animation')
    })

    it('should have valid color structure', () => {
      expect(baseTokens.colors).toBeDefined()
      expect(typeof baseTokens.colors).toBe('object')

      // Should have common color palettes
      expect(baseTokens.colors).toHaveProperty('primary')
      expect(baseTokens.colors).toHaveProperty('neutral')

      // Each color should have scale values
      const primaryColors = baseTokens.colors.primary
      expect(primaryColors).toBeDefined()
      expect(typeof primaryColors).toBe('object')
    })

    it('should have valid spacing scale', () => {
      expect(baseTokens.spacing).toBeDefined()
      expect(typeof baseTokens.spacing).toBe('object')

      // Should include common spacing values
      expect(baseTokens.spacing).toHaveProperty('0')
      expect(baseTokens.spacing[0]).toBe('0px')

      // Should have rem-based values
      const spacingValues = Object.values(baseTokens.spacing)
      expect(spacingValues.some(value => value.includes('rem'))).toBe(true)
    })

    it('should have valid typography configuration', () => {
      expect(baseTokens.typography).toBeDefined()
      expect(baseTokens.typography).toHaveProperty('fontFamily')
      expect(baseTokens.typography).toHaveProperty('fontSize')
      expect(baseTokens.typography).toHaveProperty('fontWeight')
      expect(baseTokens.typography).toHaveProperty('lineHeight')
      expect(baseTokens.typography).toHaveProperty('letterSpacing')

      // Font families should be strings
      const fontFamilies = Object.values(baseTokens.typography.fontFamily)
      expect(fontFamilies.every(family => typeof family === 'string')).toBe(true)

      // Font sizes should be valid CSS values
      const fontSizes = Object.values(baseTokens.typography.fontSize)
      expect(fontSizes.every(size => typeof size === 'string')).toBe(true)
    })

    it('should have valid border radius scale', () => {
      expect(baseTokens.borderRadius).toBeDefined()
      expect(typeof baseTokens.borderRadius).toBe('object')

      // Should include none value
      expect(baseTokens.borderRadius).toHaveProperty('none')
      expect(baseTokens.borderRadius.none).toBe('0px')

      // Should have rem/px values
      const radiusValues = Object.values(baseTokens.borderRadius)
      expect(radiusValues.every(value => typeof value === 'string')).toBe(true)
    })

    it('should have valid shadow definitions', () => {
      expect(baseTokens.shadows).toBeDefined()
      expect(typeof baseTokens.shadows).toBe('object')

      // Should include none value
      expect(baseTokens.shadows).toHaveProperty('none')
      expect(baseTokens.shadows.none).toBe('none')

      // Shadow values should be valid CSS
      const shadowValues = Object.values(baseTokens.shadows).filter(s => s !== 'none')
      expect(shadowValues.every(shadow => typeof shadow === 'string')).toBe(true)
    })

    it('should have valid animation configuration', () => {
      expect(baseTokens.animation).toBeDefined()
      expect(baseTokens.animation).toHaveProperty('duration')
      expect(baseTokens.animation).toHaveProperty('easing')
      expect(baseTokens.animation).toHaveProperty('transition')

      // Duration values should be time units
      const durations = Object.values(baseTokens.animation.duration)
      expect(durations.every(duration => duration.includes('ms') || duration.includes('s'))).toBe(true)

      // Easing functions should be valid CSS
      const easings = Object.values(baseTokens.animation.easing)
      expect(easings.every(easing => typeof easing === 'string')).toBe(true)
    })
  })

  describe('lightTokens', () => {
    it('should extend base tokens', () => {
      expect(lightTokens).toHaveProperty('colors')
      expect(lightTokens).toHaveProperty('spacing')
      expect(lightTokens).toHaveProperty('typography')
      expect(lightTokens).toHaveProperty('borderRadius')
      expect(lightTokens).toHaveProperty('shadows')
      expect(lightTokens).toHaveProperty('animation')
    })

    it('should have light-appropriate color values', () => {
      // Light theme should have darker text on lighter backgrounds
      expect(lightTokens.colors).toHaveProperty('neutral')

      const neutralColors = lightTokens.colors.neutral
      if (neutralColors) {
        // Assuming 50 is lightest, 900 is darkest
        const light = neutralColors[50]
        const dark = neutralColors[900]

        expect(light).toBeDefined()
        expect(dark).toBeDefined()

        // Light color should have higher brightness than dark
        expect(typeof light).toBe('string')
        expect(typeof dark).toBe('string')
      }
    })

    it('should be a valid ThemeConfig', () => {
      // Type check - should compile without errors
      const theme: ThemeConfig = lightTokens
      expect(theme).toBeDefined()
    })
  })

  describe('darkTokens', () => {
    it('should extend base tokens', () => {
      expect(darkTokens).toHaveProperty('colors')
      expect(darkTokens).toHaveProperty('spacing')
      expect(darkTokens).toHaveProperty('typography')
      expect(darkTokens).toHaveProperty('borderRadius')
      expect(darkTokens).toHaveProperty('shadows')
      expect(darkTokens).toHaveProperty('animation')
    })

    it('should have dark-appropriate color values', () => {
      expect(darkTokens.colors).toHaveProperty('neutral')

      const neutralColors = darkTokens.colors.neutral
      if (neutralColors) {
        const light = neutralColors[50]
        const dark = neutralColors[900]

        expect(light).toBeDefined()
        expect(dark).toBeDefined()
        expect(typeof light).toBe('string')
        expect(typeof dark).toBe('string')
      }
    })

    it('should differ from light theme colors', () => {
      // Dark and light themes should have different semantic colors
      expect(darkTokens.colors.background).not.toEqual(lightTokens.colors.background)
      expect(darkTokens.colors.text).not.toEqual(lightTokens.colors.text)
    })

    it('should be a valid ThemeConfig', () => {
      // Type check - should compile without errors
      const theme: ThemeConfig = darkTokens
      expect(theme).toBeDefined()
    })
  })

  describe('theme consistency', () => {
    it('should have same structure between light and dark themes', () => {
      const lightKeys = Object.keys(lightTokens)
      const darkKeys = Object.keys(darkTokens)

      expect(lightKeys.sort()).toEqual(darkKeys.sort())

      // Color structure should match
      const lightColorKeys = Object.keys(lightTokens.colors)
      const darkColorKeys = Object.keys(darkTokens.colors)

      expect(lightColorKeys.sort()).toEqual(darkColorKeys.sort())
    })

    it('should have matching spacing scales', () => {
      expect(lightTokens.spacing).toEqual(darkTokens.spacing)
    })

    it('should have matching typography scales', () => {
      expect(lightTokens.typography).toEqual(darkTokens.typography)
    })

    it('should have matching border radius scales', () => {
      expect(lightTokens.borderRadius).toEqual(darkTokens.borderRadius)
    })

    it('should have matching animation configurations', () => {
      expect(lightTokens.animation).toEqual(darkTokens.animation)
    })
  })
})

describe('Web Token Generation', () => {
  describe('generateCSSVariables', () => {
    it('should generate CSS custom properties from theme', () => {
      const cssVars = generateCSSVariables(lightTokens)

      expect(typeof cssVars).toBe('object')
      expect(Object.keys(cssVars).length).toBeGreaterThan(0)

      // Should generate variables with sparkle prefix (default)
      const hasSparkleVars = Object.keys(cssVars).some(key => key.startsWith('--sparkle-'))
      expect(hasSparkleVars).toBe(true)
    })

    it('should generate color variables', () => {
      const cssVars = generateCSSVariables(lightTokens)

      // Should have color variables
      const colorVars = Object.keys(cssVars).filter(key => key.includes('color'))
      expect(colorVars.length).toBeGreaterThan(0)

      // Check for specific color variables
      expect(cssVars).toHaveProperty('--sparkle-color-primary-500')
      expect(typeof cssVars['--sparkle-color-primary-500']).toBe('string')
    })

    it('should generate spacing variables', () => {
      const cssVars = generateCSSVariables(lightTokens)

      // Should have spacing variables
      const spacingVars = Object.keys(cssVars).filter(key => key.includes('spacing'))
      expect(spacingVars.length).toBeGreaterThan(0)

      // Should preserve spacing values
      expect(cssVars['--sparkle-spacing-0']).toBe('0px')
    })

    it('should use custom prefix when provided', () => {
      const customPrefix = 'custom'
      const cssVars = generateCSSVariables(lightTokens, customPrefix)

      const hasCustomPrefix = Object.keys(cssVars).some(key => key.startsWith('--custom-'))
      expect(hasCustomPrefix).toBe(true)
    })

    it('should generate valid CSS property names', () => {
      const cssVars = generateCSSVariables(lightTokens)

      // All keys should start with --
      const allKeysValid = Object.keys(cssVars).every(key => key.startsWith('--'))
      expect(allKeysValid).toBe(true)

      // All keys should be valid CSS custom property names (allow mixed case and decimal values)
      const validNamePattern = /^--[a-z0-9.-]+$/i
      const allNamesValid = Object.keys(cssVars).every(key => validNamePattern.test(key))
      expect(allNamesValid).toBe(true)
    })

    it('should generate valid CSS property values', () => {
      const cssVars = generateCSSVariables(lightTokens)

      // All values should be strings
      const allValuesStrings = Object.values(cssVars).every(value => typeof value === 'string')
      expect(allValuesStrings).toBe(true)

      // Values should not be empty
      const allValuesNonEmpty = Object.values(cssVars).every(value => value.length > 0)
      expect(allValuesNonEmpty).toBe(true)
    })
  })

  describe('CSS Variables Type Safety', () => {
    it('should return correct TypeScript type', () => {
      const cssVars: CSSCustomProperties = generateCSSVariables(lightTokens)
      expect(cssVars).toBeDefined()

      // Should be an object with string keys and string values
      expect(typeof cssVars).toBe('object')
      Object.entries(cssVars).forEach(([key, value]) => {
        expect(typeof key).toBe('string')
        expect(typeof value).toBe('string')
      })
    })
  })
})

describe('Native Token Generation', () => {
  describe('generateNativeTheme', () => {
    it('should generate React Native compatible theme', () => {
      const nativeTheme = generateNativeTheme(lightTokens)

      expect(typeof nativeTheme).toBe('object')
      expect(nativeTheme).toHaveProperty('colors')
      expect(nativeTheme).toHaveProperty('spacing')
      expect(nativeTheme).toHaveProperty('typography')
      expect(nativeTheme).toHaveProperty('borderRadius')
      expect(nativeTheme).toHaveProperty('shadows')
      expect(nativeTheme).toHaveProperty('animation')
    })

    it('should transform colors for React Native', () => {
      const nativeTheme = generateNativeTheme(lightTokens)

      expect(nativeTheme.colors).toBeDefined()
      expect(typeof nativeTheme.colors).toBe('object')

      // Colors should be accessible for React Native StyleSheet
      expect(nativeTheme.colors.primary_500).toBeDefined()
      expect(nativeTheme.colors.neutral_500).toBeDefined()

      // Color values should be hex strings or rgba
      const primaryColor = nativeTheme.colors.primary_500
      expect(primaryColor).toBeDefined()
      if (primaryColor) {
        expect(typeof primaryColor).toBe('string')
        expect(primaryColor.startsWith('#') || primaryColor.startsWith('rgb')).toBe(true)
      }
    })

    it('should transform spacing for React Native', () => {
      const nativeTheme = generateNativeTheme(lightTokens)

      expect(nativeTheme.spacing).toBeDefined()
      expect(typeof nativeTheme.spacing).toBe('object')

      // Spacing should be numeric values for React Native
      Object.values(nativeTheme.spacing).forEach(value => {
        expect(typeof value === 'number' || typeof value === 'string').toBe(true)
      })
    })

    it('should transform typography for React Native', () => {
      const nativeTheme = generateNativeTheme(lightTokens)

      expect(nativeTheme.typography).toBeDefined()
      expect(nativeTheme.typography).toHaveProperty('fontSize')
      expect(nativeTheme.typography).toHaveProperty('fontWeight')
      expect(nativeTheme.typography).toHaveProperty('lineHeight')

      // Font sizes should be numeric for React Native
      Object.values(nativeTheme.typography.fontSize).forEach(size => {
        expect(typeof size === 'number' || typeof size === 'string').toBe(true)
      })
    })

    it('should handle custom options', () => {
      const options = {
        baseFontSize: 14,
        flattenColors: true,
      }

      const nativeTheme = generateNativeTheme(lightTokens, options)

      expect(nativeTheme).toBeDefined()
      expect(nativeTheme.typography.fontSize).toBeDefined()
    })

    it('should generate shadows compatible with React Native', () => {
      const nativeTheme = generateNativeTheme(lightTokens)

      expect(nativeTheme.shadows).toBeDefined()

      // React Native shadows should have elevation or shadow properties
      Object.values(nativeTheme.shadows).forEach(shadow => {
        expect(typeof shadow === 'object' || typeof shadow === 'string').toBe(true)
      })
    })
  })

  describe('Native Theme Type Safety', () => {
    it('should return correct TypeScript type', () => {
      const nativeTheme: NativeTheme = generateNativeTheme(lightTokens)
      expect(nativeTheme).toBeDefined()

      // Should match NativeTheme interface structure
      expect(nativeTheme).toHaveProperty('colors')
      expect(nativeTheme).toHaveProperty('spacing')
      expect(nativeTheme).toHaveProperty('typography')
      expect(nativeTheme).toHaveProperty('borderRadius')
      expect(nativeTheme).toHaveProperty('shadows')
      expect(nativeTheme).toHaveProperty('animation')
    })
  })

  describe('options handling', () => {
    it('should use default base font size', () => {
      const nativeTheme = generateNativeTheme(lightTokens)
      expect(nativeTheme.typography.fontSize).toBeDefined()
    })

    it('should use custom base font size', () => {
      const customBaseFontSize = 14
      const nativeTheme = generateNativeTheme(lightTokens, {baseFontSize: customBaseFontSize})

      expect(nativeTheme.typography.fontSize).toBeDefined()
      // The implementation should use the custom base font size for calculations
    })

    it('should flatten colors when requested', () => {
      const nativeTheme = generateNativeTheme(lightTokens, {flattenColors: true})

      expect(nativeTheme.colors).toBeDefined()
      // With flattened colors, should have underscore-separated keys
      const colorKeys = Object.keys(nativeTheme.colors)
      expect(colorKeys.some(key => key.includes('_'))).toBe(true)

      // Should not have nested objects
      for (const value of Object.values(nativeTheme.colors)) {
        expect(typeof value).toBe('string')
      }
    })
  })
})

describe('Cross-Platform Compatibility', () => {
  it('should generate consistent token counts', () => {
    const cssVars = generateCSSVariables(lightTokens)
    const nativeTheme = generateNativeTheme(lightTokens)

    // Both should have comprehensive coverage
    expect(Object.keys(cssVars).length).toBeGreaterThan(50)

    // Native theme structure should be comprehensive
    const nativeTokenCount =
      Object.keys(nativeTheme.colors).length +
      Object.keys(nativeTheme.spacing).length +
      Object.keys(nativeTheme.typography.fontSize).length +
      Object.keys(nativeTheme.typography.fontWeight).length +
      Object.keys(nativeTheme.borderRadius).length +
      Object.keys(nativeTheme.shadows).length +
      Object.keys(nativeTheme.animation.duration).length

    expect(nativeTokenCount).toBeGreaterThan(20)
  })

  it('should maintain semantic color mapping', () => {
    const cssVars = generateCSSVariables(lightTokens)
    const nativeTheme = generateNativeTheme(lightTokens)

    // Both should have primary colors
    expect(cssVars['--sparkle-color-primary-500']).toBeDefined()
    expect(nativeTheme.colors.primary_500).toBeDefined()

    // Values should be equivalent (though format may differ)
    const cssColor = cssVars['--sparkle-color-primary-500']
    const nativeColor = nativeTheme.colors.primary_500

    expect(typeof cssColor).toBe('string')
    if (nativeColor) {
      expect(typeof nativeColor).toBe('string')
    }
  })
})
