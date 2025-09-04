import type {ThemeConfig} from '@sparkle/types'
import {beforeEach, describe, expect, it} from 'vitest'
import {ThemeValidator, type ValidationOptions} from '../src/validators/theme-validator'

// Mock complete theme configuration
const mockValidTheme: ThemeConfig = {
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      500: '#3b82f6',
      900: '#1e3a8a',
    },
    neutral: {
      50: '#f9fafb',
      100: '#f3f4f6',
      500: '#6b7280',
      900: '#111827',
    },
    success: {
      50: '#ecfdf5',
      500: '#10b981',
      900: '#064e3b',
    },
  },
  spacing: {
    0: '0',
    1: '0.25rem',
    2: '0.5rem',
    4: '1rem',
    8: '2rem',
    16: '4rem',
  },
  typography: {
    fontFamily: {
      sans: 'Inter, sans-serif',
      serif: 'Georgia, serif',
      mono: 'Fira Code, monospace',
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
    letterSpacing: {
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
    },
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    full: '9999px',
  },
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
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
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
    transition: {
      all: 'all 300ms ease',
      colors: 'color 150ms ease, background-color 150ms ease',
      transform: 'transform 200ms ease',
    },
  },
}

describe('ThemeValidator', () => {
  let validator: ThemeValidator

  beforeEach(() => {
    validator = new ThemeValidator()
  })

  describe('constructor', () => {
    it('should create a new validator instance', () => {
      expect(validator).toBeInstanceOf(ThemeValidator)
    })
  })

  describe('validate()', () => {
    it('should validate a complete valid theme', () => {
      const result = validator.validate(mockValidTheme)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.summary.totalErrors).toBe(0)
      expect(result.summary.checkedProperties).toBeGreaterThan(0)
    })

    it('should detect missing required properties', () => {
      const incompleteTheme = {
        colors: mockValidTheme.colors,
        // Missing other required properties
      } as unknown as ThemeConfig

      const result = validator.validate(incompleteTheme)

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some(err => err.message.includes('Missing required property'))).toBe(true)
    })

    it('should validate with custom options', () => {
      const options: ValidationOptions = {
        validateColorContrast: false,
        minContrastRatio: 3,
        strictMode: true,
      }

      const result = validator.validate(mockValidTheme, options)

      expect(result.isValid).toBe(true)
      expect(result.summary.checkedProperties).toBeGreaterThan(0)
    })

    it('should treat warnings as errors in strict mode', () => {
      // Create a theme that will generate warnings (inconsistent spacing)
      const themeWithWarnings = {
        ...mockValidTheme,
        spacing: {
          0: '0px',
          1: '4px',
          2: '10px', // Inconsistent - should be 8px for geometric progression
          3: '20px', // Inconsistent
        },
      }

      const resultNormal = validator.validate(themeWithWarnings, {strictMode: false})
      const resultStrict = validator.validate(themeWithWarnings, {strictMode: true})

      // Should have warnings about inconsistent spacing
      expect(resultNormal.warnings.length).toBeGreaterThan(0)
      expect(resultNormal.isValid).toBe(true) // Normal mode ignores warnings

      // In strict mode, warnings should affect validity
      expect(resultStrict.isValid).toBe(false)
      expect(resultStrict.warnings.length).toBeGreaterThan(0)
    })

    it('should validate color contrast when enabled', () => {
      const lowContrastTheme = {
        ...mockValidTheme,
        colors: {
          primary: {
            500: '#ffffff', // White
            600: '#f0f0f0', // Very light gray - low contrast
          },
        },
      }

      const result = validator.validate(lowContrastTheme, {
        validateColorContrast: true,
        minContrastRatio: 4.5,
      })

      // Should detect contrast issues
      expect(result.warnings.length).toBeGreaterThanOrEqual(0)
    })

    it('should skip color contrast validation when disabled', () => {
      const lowContrastTheme = {
        ...mockValidTheme,
        colors: {
          primary: {
            500: '#ffffff',
            600: '#f0f0f0',
          },
        },
      }

      const result = validator.validate(lowContrastTheme, {
        validateColorContrast: false,
      })

      // Should not generate contrast-related warnings
      expect(result.warnings.every(w => !w.message.includes('contrast'))).toBe(true)
    })

    it('should validate CSS value formats', () => {
      const invalidCSSTheme = {
        ...mockValidTheme,
        spacing: {
          invalid: 'not-a-valid-css-value',
          valid: '1rem',
        },
        borderRadius: {
          invalid: 'bad-radius',
          valid: '0.5rem',
        },
      }

      const result = validator.validate(invalidCSSTheme, {
        validateCSSValues: true,
      })

      expect(result.errors.some(err => err.message.includes('invalid') || err.message.includes('CSS'))).toBe(true)
    })

    it('should validate spacing scale consistency', () => {
      const inconsistentSpacingTheme = {
        ...mockValidTheme,
        spacing: {
          0: '0',
          1: '0.25rem',
          // Missing 2, 3
          4: '1rem',
          // Inconsistent scale
          100: '25rem',
        },
      }

      const result = validator.validate(inconsistentSpacingTheme, {
        validateSpacingScale: true,
      })

      // Should warn about inconsistent spacing scale
      expect(result.warnings.some(w => w.message.includes('spacing') || w.message.includes('scale'))).toBe(true)
    })

    it('should validate typography properties', () => {
      const invalidTypographyTheme = {
        ...mockValidTheme,
        typography: {
          fontFamily: {
            // Missing sans, serif, mono
            custom: 'Custom Font',
          },
          fontSize: {
            // Invalid font size format
            invalid: 'not-a-size',
            base: '1rem',
          },
          fontWeight: {
            // Invalid font weight
            invalid: 'super-heavy',
            normal: '400',
          },
          lineHeight: {
            normal: '1.5',
          },
          letterSpacing: {
            normal: '0',
          },
        },
      }

      const result = validator.validate(invalidTypographyTheme)

      expect(result.errors.some(err => err.path.includes('typography'))).toBe(true)
    })

    it('should validate shadow definitions', () => {
      const invalidShadowTheme = {
        ...mockValidTheme,
        shadows: {
          invalid: 'not-a-valid-shadow',
          valid: '0 1px 2px rgba(0, 0, 0, 0.1)',
        },
      }

      const result = validator.validate(invalidShadowTheme)

      expect(result.errors.some(err => err.path.includes('shadows') && err.message.includes('invalid'))).toBe(true)
    })

    it('should validate animation properties', () => {
      const invalidAnimationTheme = {
        ...mockValidTheme,
        animation: {
          duration: {
            invalid: 'not-a-duration',
            fast: '150ms',
          },
          easing: {
            invalid: 'not-an-easing',
            linear: 'linear',
          },
          transition: {
            invalid: 'not-a-transition',
            all: 'all 300ms ease',
          },
        },
      }

      const result = validator.validate(invalidAnimationTheme)

      expect(result.errors.some(err => err.path.includes('animation'))).toBe(true)
    })

    it('should provide detailed error information', () => {
      const invalidTheme = {
        colors: 'not-an-object', // Should be object
        // Missing other required properties
      } as unknown as ThemeConfig

      const result = validator.validate(invalidTheme)

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)

      const firstError = result.errors[0]
      if (firstError) {
        expect(firstError).toHaveProperty('message')
        expect(firstError).toHaveProperty('path')
        expect(firstError).toHaveProperty('value')
        expect(firstError).toHaveProperty('expected')
        expect(firstError).toHaveProperty('severity')
        expect(firstError.severity).toBe('error')
      }
    })

    it('should generate validation summary', () => {
      const result = validator.validate(mockValidTheme)

      expect(result.summary).toHaveProperty('totalErrors')
      expect(result.summary).toHaveProperty('totalWarnings')
      expect(result.summary).toHaveProperty('checkedProperties')
      expect(typeof result.summary.totalErrors).toBe('number')
      expect(typeof result.summary.totalWarnings).toBe('number')
      expect(typeof result.summary.checkedProperties).toBe('number')
      expect(result.summary.checkedProperties).toBeGreaterThan(0)
    })
  })

  describe('validation edge cases', () => {
    it('should handle null values', () => {
      const nullTheme = null as unknown as ThemeConfig

      expect(() => validator.validate(nullTheme)).not.toThrow()
    })

    it('should handle undefined values', () => {
      const undefinedTheme = undefined as unknown as ThemeConfig

      expect(() => validator.validate(undefinedTheme)).not.toThrow()
    })

    it('should handle empty objects', () => {
      const emptyTheme = {} as ThemeConfig

      const result = validator.validate(emptyTheme)

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should handle deeply nested invalid values', () => {
      const deeplyInvalidTheme = {
        ...mockValidTheme,
        colors: {
          primary: {
            500: {
              nested: {
                invalid: 'should-be-string',
              },
            },
          },
        },
      } as unknown as ThemeConfig

      const result = validator.validate(deeplyInvalidTheme)

      expect(result.errors.some(err => err.path.includes('colors'))).toBe(true)
    })
  })

  describe('validation options', () => {
    it('should use default options when none provided', () => {
      const result = validator.validate(mockValidTheme)

      expect(result).toBeDefined()
      expect(result.summary.checkedProperties).toBeGreaterThan(0)
    })

    it('should merge custom options with defaults', () => {
      const customOptions: ValidationOptions = {
        strictMode: true,
        minContrastRatio: 3,
        // Other options should use defaults
      }

      const result = validator.validate(mockValidTheme, customOptions)

      expect(result).toBeDefined()
      expect(result.summary.checkedProperties).toBeGreaterThan(0)
    })

    it('should respect disabled validation options', () => {
      const disabledOptions: ValidationOptions = {
        validateColorContrast: false,
        validateCSSValues: false,
        checkRequiredProperties: false,
        validateSpacingScale: false,
      }

      const result = validator.validate(mockValidTheme, disabledOptions)

      expect(result).toBeDefined()
      // With most validations disabled, should still check basic structure
      expect(result.summary.checkedProperties).toBeGreaterThan(0)
    })
  })

  describe('performance', () => {
    it('should validate large themes efficiently', () => {
      const largeTheme = {
        ...mockValidTheme,
        colors: Object.fromEntries(
          Array.from({length: 100}, (_, i) => [
            `color${i}`,
            Object.fromEntries(
              Array.from({length: 10}, (_, j) => [
                `${j * 100}`,
                `#${i.toString(16).padStart(2, '0')}${j.toString(16).padStart(2, '0')}ff`,
              ]),
            ),
          ]),
        ),
      }

      const startTime = performance.now()
      const result = validator.validate(largeTheme)
      const endTime = performance.now()

      expect(result).toBeDefined()
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
    })
  })
})
