/**
 * @sparkle/theme - Cross-platform theme management package
 *
 * Provides unified theme management across web and mobile platforms with
 * design token system compatible with Tailwind CSS and React Native StyleSheet.
 */

// Export theme configuration types
export type {ThemeConfig} from '@sparkle/types'

// Placeholder exports for theme system components
// These will be implemented in subsequent phases

/**
 * Theme context and providers (Phase 3)
 */
// export {ThemeProvider} from './providers/ThemeProvider'
// export {NativeThemeProvider} from './providers/NativeThemeProvider'

/**
 * Design tokens (Phase 2)
 */
// export {baseTokens} from './tokens/base'
// export {lightTokens} from './tokens/light'
// export {darkTokens} from './tokens/dark'

/**
 * Platform-specific exports (Phase 2 & 4)
 */
// export {webTokens} from './tokens/web'
// export {nativeTokens} from './tokens/native'

/**
 * Theme hooks (Phase 3)
 */
// Re-export from @sparkle/utils when implemented
// export {useTheme} from '@sparkle/utils/react'
// export {useColorScheme} from '@sparkle/utils/react'

/**
 * Utilities (Phase 2 & 6)
 */
// export {validateTheme} from './validators/theme-validator'
// export {transformTokens} from './utils/token-transformer'

// For now, export a placeholder to ensure the package builds
export const THEME_PACKAGE_VERSION = '0.1.0' as const
