/**
 * React Native integration entry point
 *
 * Exports only React Native-specific theme utilities and providers.
 */

// Context
export {ThemeContext} from '../context/ThemeContext.js'
export type {SystemColorScheme, ThemeCollection, ThemeContextValue, ThemeMode} from '../context/ThemeContext.js'

// Theme hooks (works for both web and native)
export {useColorScheme, useTheme} from '../hooks/index.js'

// Persistence utilities for React Native
export {
  DEFAULT_THEME_STORAGE_KEY,
  nativePersistence,
  persistenceMigration,
  themePersistence,
} from '../persistence/index.js'

// Native-specific providers and utilities
export {NativeThemeProvider} from '../providers/NativeThemeProvider.js'
export type {NativeThemeProviderProps} from '../providers/NativeThemeProvider.js'

// Core tokens for React Native
export {baseTokens} from '../tokens/base.js'
export {darkTokens} from '../tokens/dark.js'
export {lightTokens} from '../tokens/light.js'

// Native styling utilities
export {createNativeStyleUtils, generateNativeTheme, parseNumericValue, parseShadow} from '../tokens/native.js'
export type {NativeShadowStyle, NativeTheme} from '../tokens/native.js'
