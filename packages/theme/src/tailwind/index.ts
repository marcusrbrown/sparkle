/**
 * Tailwind CSS integration entry point
 *
 * Exports only the Tailwind plugin and related utilities for CSS integration.
 */

// Re-export essential tokens and utilities needed for Tailwind integration
export {baseTokens} from '../tokens/base.js'
export {darkTokens} from '../tokens/dark.js'
export {lightTokens} from '../tokens/light.js'
export {cssVar, generateCSSVariables, generateThemeCSS} from '../tokens/web.js'
export type {CSSCustomProperties} from '../tokens/web.js'

export {createThemePlugin} from './theme-plugin.js'
export type {ThemePluginOptions} from './theme-plugin.js'
