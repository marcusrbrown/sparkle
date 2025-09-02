/**
 * @sparkle/theme - Cross-platform theme management package
 *
 * Provides unified theme management across web and mobile platforms with
 * design token system compatible with Tailwind CSS and React Native StyleSheet.
 */

/**
 * Theme context (Phase 3)
 */
export * from './context/ThemeContext'
/**
 * Theme context and providers (Phase 3)
 */
export {ThemeContext} from './context/ThemeContext.js'

export type {SystemColorScheme, ThemeCollection, ThemeContextValue, ThemeMode} from './context/ThemeContext.js'

/**
 * Theme hooks (Phase 3)
 */
export {useColorScheme, useTheme} from './hooks'

/**
 * Theme persistence utilities (Phase 3)
 */
export {
  DEFAULT_THEME_STORAGE_KEY,
  nativePersistence,
  persistenceMigration,
  themePersistence,
  webPersistence,
} from './persistence/index.js'

/**
 * Theme providers (Phase 3)
 */
export {NativeThemeProvider} from './providers/NativeThemeProvider.js'
export type {NativeThemeProviderProps} from './providers/NativeThemeProvider.js'

export {ThemeProvider} from './providers/ThemeProvider.js'
export type {ThemeProviderProps} from './providers/ThemeProvider.js'

/**
 * Tailwind CSS plugin (Phase 4)
 */
export {createThemePlugin} from './tailwind/theme-plugin.js'

export type {ThemePluginOptions} from './tailwind/theme-plugin.js'
/**
 * Design tokens (Phase 2)
 */
export {baseTokens} from './tokens/base.js'

export {darkTokens} from './tokens/dark.js'

export {lightTokens} from './tokens/light.js'

/**
 * Platform-specific exports (Phase 2 & 4)
 */
export {createNativeStyleUtils, generateNativeTheme, parseNumericValue, parseShadow} from './tokens/native.js'

export type {NativeShadowStyle, NativeTheme} from './tokens/native.js'

export {cssPropertiesToString, cssVar, generateCSSVariables, generateThemeCSS} from './tokens/web.js'

export type {CSSCustomProperties} from './tokens/web.js'

/**
 * Cross-platform token transformation utilities (Phase 2)
 */
export {defaultTransformer, TokenTransformer, tokenUtils} from './utils/token-transformer.js'

export type {Platform, TransformOptions, TransformResult} from './utils/token-transformer.js'

/**
 * Theme validation (Phase 2)
 */
export {isValidTheme, ThemeValidator, validateTheme} from './validators/theme-validator.js'

export type {ValidationError, ValidationOptions, ValidationResult} from './validators/theme-validator.js'

// Export theme configuration types
export type {
  AnimationScale,
  BorderRadiusScale,
  ColorScale,
  ShadowScale,
  SpacingScale,
  ThemeConfig,
  TypographyScale,
} from '@sparkle/types'

// For now, export a placeholder to ensure the package builds
export const THEME_PACKAGE_VERSION = '0.1.0' as const
