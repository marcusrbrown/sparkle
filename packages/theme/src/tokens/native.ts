import type {ThemeConfig} from '@sparkle/types'

/**
 * React Native StyleSheet compatible theme object
 * Numeric values for dimensions, hex/rgb colors for colors
 */
export interface NativeTheme {
  colors: Record<string, string>
  spacing: Record<string, number>
  typography: {
    fontFamily: Record<string, string>
    fontSize: Record<string, number>
    fontWeight: Record<string, string>
    lineHeight: Record<string, number>
    letterSpacing: Record<string, number>
  }
  borderRadius: Record<string, number>
  shadows: Record<string, NativeShadowStyle>
  animation: {
    duration: Record<string, number>
    easing: Record<string, string>
  }
}

/**
 * React Native shadow style properties
 * Platform-specific shadow handling for iOS and Android
 */
export interface NativeShadowStyle {
  // iOS shadow properties
  shadowColor?: string
  shadowOffset?: {width: number; height: number}
  shadowOpacity?: number
  shadowRadius?: number
  // Android elevation
  elevation?: number
}

/**
 * Converts a CSS dimension string to a React Native numeric value
 * Handles rem, px, and numeric values
 *
 * @param value - CSS dimension string (e.g., '1rem', '16px', '1.5')
 * @param baseFontSize - Base font size for rem conversion (default: 16)
 * @returns Numeric value for React Native
 *
 * @example
 * ```typescript
 * parseNumericValue('1rem') // Returns: 16
 * parseNumericValue('24px') // Returns: 24
 * parseNumericValue('1.5') // Returns: 1.5
 * ```
 */
export function parseNumericValue(value: string | number, baseFontSize = 16): number {
  if (typeof value === 'number') {
    return value
  }

  const stringValue = String(value).trim()

  // Handle rem units
  if (stringValue.endsWith('rem')) {
    const numValue = Number.parseFloat(stringValue.replace('rem', ''))
    return numValue * baseFontSize
  }

  // Handle px units
  if (stringValue.endsWith('px')) {
    return Number.parseFloat(stringValue.replace('px', ''))
  }

  // Handle em units (treat as rem for simplicity)
  if (stringValue.endsWith('em')) {
    const numValue = Number.parseFloat(stringValue.replace('em', ''))
    return numValue * baseFontSize
  }

  // Handle unitless values
  const numValue = Number.parseFloat(stringValue)
  return Number.isNaN(numValue) ? 0 : numValue
}

/**
 * Converts CSS box-shadow to React Native shadow properties
 * Attempts to extract shadow values for cross-platform compatibility
 *
 * @param boxShadow - CSS box-shadow string
 * @returns Native shadow style object
 *
 * @example
 * ```typescript
 * parseShadow('0 4px 6px rgba(0, 0, 0, 0.1)')
 * // Returns: { shadowOffset: { width: 0, height: 4 }, shadowRadius: 6, ... }
 * ```
 */
export function parseShadow(boxShadow: string): NativeShadowStyle {
  if (boxShadow === 'none' || !boxShadow) {
    return {elevation: 0}
  }

  // Basic regex to extract shadow values
  // Matches: offsetX offsetY blurRadius (spreadRadius) color
  const shadowRegex = /(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/
  const match = boxShadow.match(shadowRegex)

  if (!match) {
    // Fallback for complex shadows
    return {
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    }
  }

  const offsetX = Number.parseFloat(match[1] || '0')
  const offsetY = Number.parseFloat(match[2] || '0')
  const blurRadius = Number.parseFloat(match[3] || '0')

  // Extract color and opacity from rgba/rgb
  let shadowColor = '#000'
  let shadowOpacity = 0.1

  const colorMatch = boxShadow.match(/rgba?\(([^)]+)\)/)
  if (colorMatch && colorMatch[1]) {
    const colorValues = colorMatch[1].split(',').map(v => v.trim())
    if (colorValues.length >= 3) {
      const r = Math.round(Number.parseFloat(colorValues[0] || '0'))
      const g = Math.round(Number.parseFloat(colorValues[1] || '0'))
      const b = Math.round(Number.parseFloat(colorValues[2] || '0'))
      shadowColor = `rgb(${r}, ${g}, ${b})`

      if (colorValues.length === 4) {
        shadowOpacity = Number.parseFloat(colorValues[3] || '0.1')
      }
    }
  }

  // Calculate elevation for Android (rough approximation)
  const elevation = Math.max(Math.abs(offsetY), blurRadius / 2)

  return {
    shadowColor,
    shadowOffset: {width: offsetX, height: offsetY},
    shadowOpacity,
    shadowRadius: blurRadius,
    elevation: Math.round(elevation),
  }
}

/**
 * Generates React Native StyleSheet compatible theme object from design tokens
 * Converts CSS values to React Native compatible numeric and string values
 *
 * @param tokens - Theme configuration object with design tokens
 * @param options - Configuration options for conversion
 * @param options.baseFontSize - Base font size for rem conversion (default: 16)
 * @param options.flattenColors - Whether to flatten nested color objects (default: true)
 * @returns Native theme object compatible with React Native StyleSheet
 *
 * @example
 * ```typescript
 * const nativeTheme = generateNativeTheme(lightTokens)
 * const styles = StyleSheet.create({
 *   container: {
 *     backgroundColor: nativeTheme.colors.background.primary,
 *     padding: nativeTheme.spacing[4],
 *   }
 * })
 * ```
 */
export function generateNativeTheme(
  tokens: ThemeConfig,
  options: {
    baseFontSize?: number
    flattenColors?: boolean
  } = {},
): NativeTheme {
  const {baseFontSize = 16, flattenColors = true} = options

  /**
   * Helper to flatten nested color objects for easier access
   */
  function flattenObject(obj: Record<string, any>, prefix = '', separator = '_'): Record<string, string> {
    const flattened: Record<string, string> = {}

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}${separator}${key}` : key

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(flattened, flattenObject(value, newKey, separator))
      } else if (typeof value === 'string') {
        flattened[newKey] = value
      }
    }

    return flattened
  }

  /**
   * Convert spacing values to numbers
   */
  const spacingNumbers: Record<string, number> = {}
  for (const [key, value] of Object.entries(tokens.spacing)) {
    spacingNumbers[key] = parseNumericValue(value, baseFontSize)
  }

  /**
   * Convert border radius values to numbers
   */
  const borderRadiusNumbers: Record<string, number> = {}
  for (const [key, value] of Object.entries(tokens.borderRadius)) {
    if (value === '9999px' || value === 'full') {
      // React Native doesn't support '9999px', use a large number
      borderRadiusNumbers[key] = 9999
    } else {
      borderRadiusNumbers[key] = parseNumericValue(value, baseFontSize)
    }
  }

  /**
   * Convert typography values
   */
  const typography = {
    fontFamily: {...tokens.typography.fontFamily},
    fontSize: {} as Record<string, number>,
    fontWeight: {...tokens.typography.fontWeight},
    lineHeight: {} as Record<string, number>,
    letterSpacing: {} as Record<string, number>,
  } as NativeTheme['typography']

  for (const [key, value] of Object.entries(tokens.typography.fontSize)) {
    typography.fontSize[key] = parseNumericValue(value, baseFontSize)
  }

  for (const [key, value] of Object.entries(tokens.typography.lineHeight)) {
    typography.lineHeight[key] = typeof value === 'number' ? value : Number.parseFloat(String(value))
  }

  for (const [key, value] of Object.entries(tokens.typography.letterSpacing)) {
    typography.letterSpacing[key] = parseNumericValue(value, baseFontSize)
  }

  /**
   * Convert shadows to native shadow styles
   */
  const shadows: Record<string, NativeShadowStyle> = {}
  for (const [key, value] of Object.entries(tokens.shadows)) {
    shadows[key] = parseShadow(value)
  }

  /**
   * Convert animation durations to numbers
   */
  const animation = {
    duration: {} as Record<string, number>,
    easing: {...tokens.animation.easing},
  }

  for (const [key, value] of Object.entries(tokens.animation.duration)) {
    animation.duration[key] = parseNumericValue(value.replace('ms', ''))
  }

  return {
    colors: flattenColors ? flattenObject(tokens.colors) : (tokens.colors as unknown as Record<string, string>),
    spacing: spacingNumbers,
    typography,
    borderRadius: borderRadiusNumbers,
    shadows,
    animation,
  }
}

/**
 * Creates a React Native StyleSheet from native theme tokens
 * Convenience function for creating common styles
 *
 * @param nativeTheme - Native theme object
 * @returns Object with common style utilities
 *
 * @example
 * ```typescript
 * const theme = generateNativeTheme(lightTokens)
 * const styleUtils = createNativeStyleUtils(theme)
 *
 * // Use in component
 * <View style={[styleUtils.spacing.p4, styleUtils.colors.bgPrimary]} />
 * ```
 */
export function createNativeStyleUtils(nativeTheme: NativeTheme) {
  return {
    spacing: {
      // Padding utilities
      ...Object.fromEntries(Object.entries(nativeTheme.spacing).map(([key, value]) => [`p${key}`, {padding: value}])),
      // Margin utilities
      ...Object.fromEntries(Object.entries(nativeTheme.spacing).map(([key, value]) => [`m${key}`, {margin: value}])),
    },

    colors: {
      // Background color utilities
      ...Object.fromEntries(
        Object.entries(nativeTheme.colors).map(([key, value]) => [
          `bg${key.charAt(0).toUpperCase()}${key.slice(1)}`,
          {backgroundColor: value},
        ]),
      ),
      // Text color utilities
      ...Object.fromEntries(
        Object.entries(nativeTheme.colors).map(([key, value]) => [
          `text${key.charAt(0).toUpperCase()}${key.slice(1)}`,
          {color: value},
        ]),
      ),
    },

    typography: {
      // Font size utilities
      ...Object.fromEntries(
        Object.entries(nativeTheme.typography.fontSize).map(([key, value]) => [
          `text${key.charAt(0).toUpperCase()}${key.slice(1)}`,
          {fontSize: value},
        ]),
      ),
    },

    borderRadius: {
      // Border radius utilities
      ...Object.fromEntries(
        Object.entries(nativeTheme.borderRadius).map(([key, value]) => [
          `rounded${key.charAt(0).toUpperCase()}${key.slice(1)}`,
          {borderRadius: value},
        ]),
      ),
    },

    shadows: nativeTheme.shadows,
  }
}
