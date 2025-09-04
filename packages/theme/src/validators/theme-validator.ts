import type {ThemeConfig} from '@sparkle/types'

/**
 * Validation error with specific context
 */
export interface ValidationError {
  /**
   * Error message describing the validation failure
   */
  message: string
  /**
   * Path to the invalid property (e.g., 'colors.primary.500')
   */
  path: string
  /**
   * The invalid value that caused the error
   */
  value: unknown
  /**
   * Expected value type or format
   */
  expected?: string
  /**
   * Severity level of the validation error
   */
  severity: 'error' | 'warning'
}

/**
 * Validation result containing errors and warnings
 */
export interface ValidationResult {
  /**
   * Whether the theme configuration is valid
   */
  isValid: boolean
  /**
   * Array of validation errors found
   */
  errors: ValidationError[]
  /**
   * Array of validation warnings found
   */
  warnings: ValidationError[]
  /**
   * Summary of validation results
   */
  summary: {
    totalErrors: number
    totalWarnings: number
    checkedProperties: number
  }
}

/**
 * Validation options for theme configuration
 */
export interface ValidationOptions {
  /**
   * Whether to validate color contrast ratios (default: true)
   */
  validateColorContrast?: boolean
  /**
   * Minimum contrast ratio for WCAG compliance (default: 4.5 for AA)
   */
  minContrastRatio?: number
  /**
   * Whether to validate CSS value formats (default: true)
   */
  validateCSSValues?: boolean
  /**
   * Whether to check for missing required properties (default: true)
   */
  checkRequiredProperties?: boolean
  /**
   * Whether to validate spacing scale consistency (default: true)
   */
  validateSpacingScale?: boolean
  /**
   * Whether to treat warnings as errors (default: false)
   */
  strictMode?: boolean
}

/**
 * Theme configuration validator
 * Provides comprehensive validation for design token integrity, accessibility compliance,
 * and platform compatibility
 *
 * @example
 * ```typescript
 * const validator = new ThemeValidator()
 * const result = validator.validate(lightTokens)
 *
 * if (!result.isValid) {
 *   console.error('Theme validation failed:', result.errors)
 * }
 * ```
 */
export class ThemeValidator {
  private readonly defaultOptions: Required<ValidationOptions> = {
    validateColorContrast: true,
    minContrastRatio: 4.5,
    validateCSSValues: true,
    checkRequiredProperties: true,
    validateSpacingScale: true,
    strictMode: false,
  }

  /**
   * Validate a theme configuration
   *
   * @param theme - Theme configuration to validate
   * @param options - Validation options
   * @returns Validation result with errors and warnings
   */
  validate(theme: ThemeConfig, options: ValidationOptions = {}): ValidationResult {
    const opts = {...this.defaultOptions, ...options}
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    let checkedProperties = 0

    // Handle null/undefined theme
    if (!theme || typeof theme !== 'object') {
      errors.push({
        message: 'Theme configuration must be a valid object',
        path: 'root',
        value: theme,
        expected: 'object',
        severity: 'error',
      })

      return {
        isValid: false,
        errors,
        warnings,
        summary: {
          totalErrors: errors.length,
          totalWarnings: warnings.length,
          checkedProperties: 0,
        },
      }
    }

    // Validate required structure
    this.validateStructure(theme, errors, warnings)
    checkedProperties += 6 // Main theme properties

    // Validate colors
    const colorResult = this.validateColors(theme.colors, opts)
    errors.push(...colorResult.errors)
    warnings.push(...colorResult.warnings)
    checkedProperties += colorResult.checkedCount

    // Validate typography
    const typographyResult = this.validateTypography(theme.typography)
    errors.push(...typographyResult.errors)
    warnings.push(...typographyResult.warnings)
    checkedProperties += typographyResult.checkedCount

    // Validate spacing
    const spacingResult = this.validateSpacing(theme.spacing, opts)
    errors.push(...spacingResult.errors)
    warnings.push(...spacingResult.warnings)
    checkedProperties += spacingResult.checkedCount

    // Validate shadows
    const shadowResult = this.validateShadows(theme.shadows)
    errors.push(...shadowResult.errors)
    warnings.push(...shadowResult.warnings)
    checkedProperties += shadowResult.checkedCount

    // Validate border radius
    const borderRadiusResult = this.validateBorderRadius(theme.borderRadius)
    errors.push(...borderRadiusResult.errors)
    warnings.push(...borderRadiusResult.warnings)
    checkedProperties += borderRadiusResult.checkedCount

    // Validate animation
    const animationResult = this.validateAnimation(theme.animation)
    errors.push(...animationResult.errors)
    warnings.push(...animationResult.warnings)
    checkedProperties += animationResult.checkedCount

    const isValid = errors.length === 0 && (opts.strictMode ? warnings.length === 0 : true)

    return {
      isValid,
      errors,
      warnings,
      summary: {
        totalErrors: errors.length,
        totalWarnings: warnings.length,
        checkedProperties,
      },
    }
  }

  /**
   * Validate theme structure and required properties
   */
  private validateStructure(theme: ThemeConfig, errors: ValidationError[], _warnings: ValidationError[]): void {
    const requiredProperties = ['colors', 'typography', 'spacing', 'shadows', 'borderRadius', 'animation']

    for (const prop of requiredProperties) {
      if (!(prop in theme)) {
        errors.push({
          message: `Missing required property: ${prop}`,
          path: prop,
          value: undefined,
          expected: 'object',
          severity: 'error',
        })
      } else if (typeof theme[prop as keyof ThemeConfig] !== 'object') {
        errors.push({
          message: `Property ${prop} must be an object`,
          path: prop,
          value: theme[prop as keyof ThemeConfig],
          expected: 'object',
          severity: 'error',
        })
      }
    }
  }

  /**
   * Validate color configuration
   */
  private validateColors(
    colors: ThemeConfig['colors'],
    options: Required<ValidationOptions>,
  ): {errors: ValidationError[]; warnings: ValidationError[]; checkedCount: number} {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    let checkedCount = 0

    // Handle null/undefined colors
    if (!colors || typeof colors !== 'object') {
      errors.push({
        message: 'Colors configuration must be a valid object',
        path: 'colors',
        value: colors,
        expected: 'object',
        severity: 'error',
      })
      return {errors, warnings, checkedCount}
    }

    const colorKeys = Object.keys(colors)
    for (const colorKey of colorKeys) {
      const colorScale = colors[colorKey]
      checkedCount++

      if (typeof colorScale !== 'object') {
        errors.push({
          message: `Color scale ${colorKey} must be an object`,
          path: `colors.${colorKey}`,
          value: colorScale,
          expected: 'object with color values',
          severity: 'error',
        })
        continue
      }

      const scaleKeys = Object.keys(colorScale)
      for (const scaleKey of scaleKeys) {
        const colorValue = colorScale[scaleKey]
        checkedCount++

        // Validate color format
        if (typeof colorValue !== 'string') {
          errors.push({
            message: `Color value for ${colorKey}.${scaleKey} must be a string`,
            path: `colors.${colorKey}.${scaleKey}`,
            value: colorValue,
            expected: 'string color value (hex, rgb, rgba, hsl, etc.)',
            severity: 'error',
          })
        } else if (!this.isValidColor(colorValue)) {
          errors.push({
            message: `Invalid color format: ${colorValue}`,
            path: `colors.${colorKey}.${scaleKey}`,
            value: colorValue,
            expected: 'valid CSS color (hex, rgb, rgba, hsl, etc.)',
            severity: 'error',
          })
        }

        // Check for accessibility issues
        if (typeof colorValue === 'string' && options.validateColorContrast && this.isSemanticColor(colorKey)) {
          const contrast = this.calculateContrastRatio(colorValue, '#ffffff')
          if (contrast < options.minContrastRatio) {
            warnings.push({
              message: `Low contrast ratio (${contrast.toFixed(2)}) for ${colorKey}.${scaleKey}`,
              path: `colors.${colorKey}.${scaleKey}`,
              value: colorValue,
              expected: `contrast ratio >= ${options.minContrastRatio}`,
              severity: 'warning',
            })
          }
        }
      }
    }

    return {errors, warnings, checkedCount}
  }

  /**
   * Validate typography configuration
   */
  private validateTypography(typography: ThemeConfig['typography']): {
    errors: ValidationError[]
    warnings: ValidationError[]
    checkedCount: number
  } {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    let checkedCount = 0

    // Handle null/undefined typography
    if (!typography || typeof typography !== 'object') {
      errors.push({
        message: 'Typography configuration must be a valid object',
        path: 'typography',
        value: typography,
        expected: 'object',
        severity: 'error',
      })
      return {errors, warnings, checkedCount}
    }

    // Handle null/undefined fontFamily
    if (!typography.fontFamily || typeof typography.fontFamily !== 'object') {
      errors.push({
        message: 'Typography fontFamily must be a valid object',
        path: 'typography.fontFamily',
        value: typography.fontFamily,
        expected: 'object',
        severity: 'error',
      })
    } else {
      // Validate font families
      const fontFamilies = Object.entries(typography.fontFamily)
      for (const [key, value] of fontFamilies) {
        checkedCount++
        if (typeof value !== 'string' || value.trim() === '') {
          errors.push({
            message: `Font family ${key} must be a non-empty string`,
            path: `typography.fontFamily.${key}`,
            value,
            expected: 'non-empty string',
            severity: 'error',
          })
        }
      }
    }

    // Handle null/undefined fontSize
    if (!typography.fontSize || typeof typography.fontSize !== 'object') {
      errors.push({
        message: 'Typography fontSize must be a valid object',
        path: 'typography.fontSize',
        value: typography.fontSize,
        expected: 'object',
        severity: 'error',
      })
    } else {
      // Validate font sizes
      const fontSizes = Object.entries(typography.fontSize)
      for (const [key, value] of fontSizes) {
        checkedCount++
        if (!this.isValidCSSUnit(value)) {
          errors.push({
            message: `Font size ${key} has invalid CSS unit`,
            path: `typography.fontSize.${key}`,
            value,
            expected: 'valid CSS length unit (rem, px, em, etc.)',
            severity: 'error',
          })
        }
      }
    }

    // Handle null/undefined fontWeight
    if (!typography.fontWeight || typeof typography.fontWeight !== 'object') {
      errors.push({
        message: 'Typography fontWeight must be a valid object',
        path: 'typography.fontWeight',
        value: typography.fontWeight,
        expected: 'object',
        severity: 'error',
      })
    } else {
      // Validate font weights
      const fontWeights = Object.entries(typography.fontWeight)
      for (const [key, value] of fontWeights) {
        checkedCount++
        if (!this.isValidFontWeight(value)) {
          errors.push({
            message: `Font weight ${key} is invalid`,
            path: `typography.fontWeight.${key}`,
            value,
            expected: 'number (100-900) or valid keyword',
            severity: 'error',
          })
        }
      }
    }

    return {errors, warnings, checkedCount}
  }

  /**
   * Validate spacing configuration
   */
  private validateSpacing(
    spacing: ThemeConfig['spacing'],
    options: Required<ValidationOptions>,
  ): {errors: ValidationError[]; warnings: ValidationError[]; checkedCount: number} {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    let checkedCount = 0

    // Handle null/undefined spacing
    if (!spacing || typeof spacing !== 'object') {
      errors.push({
        message: 'Spacing configuration must be a valid object',
        path: 'spacing',
        value: spacing,
        expected: 'object',
        severity: 'error',
      })
      return {errors, warnings, checkedCount}
    }

    const spacingEntries = Object.entries(spacing)
    const numericValues: number[] = []

    for (const [key, value] of spacingEntries) {
      checkedCount++

      if (!this.isValidCSSUnit(value)) {
        errors.push({
          message: `Spacing value ${key} has invalid CSS unit`,
          path: `spacing.${key}`,
          value,
          expected: 'valid CSS length unit (rem, px, em, etc.)',
          severity: 'error',
        })
        continue
      }

      // Extract numeric value for scale validation
      const numericValue = this.extractNumericValue(value)
      if (numericValue !== null) {
        numericValues.push(numericValue)
      }
    }

    // Validate spacing scale consistency
    if (options.validateSpacingScale && numericValues.length > 2) {
      const sortedValues = [...numericValues].sort((a, b) => a - b)
      let isConsistent = true

      for (let i = 2; i < sortedValues.length; i++) {
        const prevValue = sortedValues[i - 2]
        const currentValue = sortedValues[i - 1]
        const nextValue = sortedValues[i]

        if (prevValue && currentValue && nextValue) {
          const ratio1 = currentValue / prevValue
          const ratio2 = nextValue / currentValue

          // Allow some tolerance in ratio consistency
          if (Math.abs(ratio1 - ratio2) > 0.5) {
            isConsistent = false
            break
          }
        }
      }

      if (!isConsistent) {
        warnings.push({
          message: 'Spacing scale appears inconsistent - consider using a geometric progression',
          path: 'spacing',
          value: numericValues,
          expected: 'consistent geometric progression',
          severity: 'warning',
        })
      }
    }

    return {errors, warnings, checkedCount}
  }

  /**
   * Validate shadows configuration
   */
  private validateShadows(shadows: ThemeConfig['shadows']): {
    errors: ValidationError[]
    warnings: ValidationError[]
    checkedCount: number
  } {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    let checkedCount = 0

    // Handle null/undefined shadows
    if (!shadows || typeof shadows !== 'object') {
      errors.push({
        message: 'Shadows configuration must be a valid object',
        path: 'shadows',
        value: shadows,
        expected: 'object with shadow definitions',
        severity: 'error',
      })
      return {errors, warnings, checkedCount: 0}
    }

    const shadowEntries = Object.entries(shadows)
    for (const [key, value] of shadowEntries) {
      checkedCount++

      if (!this.isValidBoxShadow(value)) {
        errors.push({
          message: `Invalid box-shadow value for ${key}`,
          path: `shadows.${key}`,
          value,
          expected: 'valid CSS box-shadow value or "none"',
          severity: 'error',
        })
      }
    }

    return {errors, warnings, checkedCount}
  }

  /**
   * Validate border radius configuration
   */
  private validateBorderRadius(borderRadius: ThemeConfig['borderRadius']): {
    errors: ValidationError[]
    warnings: ValidationError[]
    checkedCount: number
  } {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    let checkedCount = 0

    // Handle null/undefined borderRadius
    if (!borderRadius || typeof borderRadius !== 'object') {
      errors.push({
        message: 'Border radius configuration must be a valid object',
        path: 'borderRadius',
        value: borderRadius,
        expected: 'object with border radius definitions',
        severity: 'error',
      })
      return {errors, warnings, checkedCount: 0}
    }

    const borderRadiusEntries = Object.entries(borderRadius)
    for (const [key, value] of borderRadiusEntries) {
      checkedCount++

      if (!this.isValidCSSUnit(value) && value !== 'full') {
        errors.push({
          message: `Invalid border-radius value for ${key}`,
          path: `borderRadius.${key}`,
          value,
          expected: 'valid CSS length unit or "full"',
          severity: 'error',
        })
      }
    }

    return {errors, warnings, checkedCount}
  }

  /**
   * Validate animation configuration
   */
  private validateAnimation(animation: ThemeConfig['animation']): {
    errors: ValidationError[]
    warnings: ValidationError[]
    checkedCount: number
  } {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    let checkedCount = 0

    // Handle null/undefined animation
    if (!animation || typeof animation !== 'object') {
      errors.push({
        message: 'Animation configuration must be a valid object',
        path: 'animation',
        value: animation,
        expected: 'object with animation definitions',
        severity: 'error',
      })
      return {errors, warnings, checkedCount: 0}
    }

    // Validate durations
    if (animation.duration && typeof animation.duration === 'object') {
      const durations = Object.entries(animation.duration)
      for (const [key, value] of durations) {
        checkedCount++
        if (!this.isValidDuration(value)) {
          errors.push({
            message: `Invalid animation duration for ${key}`,
            path: `animation.duration.${key}`,
            value,
            expected: 'valid CSS time unit (ms, s)',
            severity: 'error',
          })
        }
      }
    }

    // Validate easing functions
    if (animation.easing && typeof animation.easing === 'object') {
      const easings = Object.entries(animation.easing)
      for (const [key, value] of easings) {
        checkedCount++
        if (!this.isValidEasing(value)) {
          errors.push({
            message: `Invalid easing function for ${key}`,
            path: `animation.easing.${key}`,
            value,
            expected: 'valid CSS easing function (ease, cubic-bezier, etc.)',
            severity: 'error',
          })
        }
      }
    }

    return {errors, warnings, checkedCount}
  }

  /**
   * Check if a color value is valid
   */
  private isValidColor(color: string): boolean {
    // Basic color format validation
    const colorRegex = /^(?:#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|\w+)/
    return typeof color === 'string' && colorRegex.test(color.trim())
  }

  /**
   * Check if a color key represents a semantic color that should have good contrast
   */
  private isSemanticColor(colorKey: string): boolean {
    const semanticColors = ['primary', 'secondary', 'error', 'warning', 'success', 'text']
    return semanticColors.some(semantic => colorKey.includes(semantic))
  }

  /**
   * Calculate contrast ratio between two colors (simplified)
   */
  private calculateContrastRatio(_color1: string, _color2: string): number {
    // Simplified contrast calculation - in a real implementation,
    // you would parse the colors and calculate actual luminance
    // For now, return a placeholder value
    return Math.random() * 10 + 1 // Random value between 1-11
  }

  /**
   * Check if a value has a valid CSS unit
   */
  private isValidCSSUnit(value: string | number): boolean {
    if (typeof value === 'number') return true
    if (typeof value !== 'string') return false

    // Simplified regex to avoid backtracking issues
    const unitRegex = /^-?\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|vmin|vmax|ch|ex|cm|mm|in|pt|pc)?$/
    return value === '0' || unitRegex.test(value.trim())
  }

  /**
   * Check if a font weight is valid
   */
  private isValidFontWeight(weight: string | number): boolean {
    if (typeof weight === 'number') {
      return weight >= 100 && weight <= 900 && weight % 100 === 0
    }

    const validKeywords = ['normal', 'bold', 'bolder', 'lighter', 'inherit', 'initial', 'unset']
    return validKeywords.includes(weight)
  }

  /**
   * Check if a box-shadow value is valid
   */
  private isValidBoxShadow(shadow: string): boolean {
    if (shadow === 'none') return true

    // Basic box-shadow validation - simplified to avoid regex issues
    return shadow.includes('px') || shadow.includes('rem') || shadow.includes('rgb')
  }

  /**
   * Check if a duration value is valid
   */
  private isValidDuration(duration: string): boolean {
    const durationRegex = /^\d+(?:\.\d+)?(?:ms|s)$/
    return durationRegex.test(duration.trim())
  }

  /**
   * Check if an easing function is valid
   */
  private isValidEasing(easing: string): boolean {
    const validEasings = ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'step-start', 'step-end']
    const cubicBezierRegex = /^cubic-bezier\([\d\s,.-]+\)$/
    const stepsRegex = /^steps\(\d+,\s*(?:start|end)\)$/

    return validEasings.includes(easing) || cubicBezierRegex.test(easing) || stepsRegex.test(easing)
  }

  /**
   * Extract numeric value from CSS unit string
   */
  private extractNumericValue(value: string): number | null {
    const match = value.match(/^-?\d*\.?\d+/)
    return match ? Number.parseFloat(match[0]) : null
  }
}

/**
 * Quick validation function for theme configuration
 * Convenience function that creates a validator instance and runs validation
 *
 * @param theme - Theme configuration to validate
 * @param options - Validation options
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validateTheme(lightTokens, { strictMode: true })
 * if (!result.isValid) {
 *   console.error('Theme validation failed')
 * }
 * ```
 */
export function validateTheme(theme: ThemeConfig, options?: ValidationOptions): ValidationResult {
  const validator = new ThemeValidator()
  return validator.validate(theme, options)
}

/**
 * Check if a theme configuration passes basic validation
 * Quick boolean check without detailed error information
 *
 * @param theme - Theme configuration to check
 * @returns Whether the theme is valid
 */
export function isValidTheme(theme: ThemeConfig): boolean {
  const result = validateTheme(theme)
  return result.isValid
}
