import type {ThemeConfig} from '@sparkle/types'
import {baseTokens} from './base.js'

/**
 * Dark theme tokens extending the base design system
 * Optimized for dark mode interfaces with appropriate contrast ratios
 * Following WCAG AA guidelines for accessibility
 */
export const darkTokens: ThemeConfig = {
  ...baseTokens,

  /**
   * Dark theme color overrides
   * Inverted color semantics for optimal dark mode experience
   */
  colors: {
    ...baseTokens.colors,

    // Dark theme semantic colors
    background: {
      primary: '#171717', // Main background (neutral-900)
      secondary: '#262626', // Secondary surfaces (neutral-800)
      tertiary: '#404040', // Elevated surfaces (neutral-700)
      inverse: '#fafafa', // Light backgrounds for contrast (neutral-50)
    },

    text: {
      primary: '#fafafa', // Primary text (neutral-50)
      secondary: '#d4d4d4', // Secondary text (neutral-300)
      tertiary: '#a3a3a3', // Tertiary text (neutral-400)
      inverse: '#171717', // Text on light backgrounds (neutral-900)
      disabled: '#525252', // Disabled text (neutral-600)
    },

    border: {
      primary: '#404040', // Primary borders (neutral-700)
      secondary: '#525252', // Secondary borders (neutral-600)
      focus: '#60a5fa', // Focus rings (primary-400 - lighter for dark mode)
      error: '#f87171', // Error borders (error-400 - lighter for dark mode)
    },

    surface: {
      primary: '#262626', // Card backgrounds (neutral-800)
      secondary: '#404040', // Secondary surfaces (neutral-700)
      elevated: '#525252', // Elevated components (neutral-600)
      overlay: 'rgb(0 0 0 / 0.8)', // Modal overlays (darker for dark mode)
    },

    // Interactive states for dark theme
    interactive: {
      primary: '#60a5fa', // primary-400
      'primary-hover': '#93c5fd', // primary-300
      'primary-active': '#3b82f6', // primary-500
      'primary-disabled': '#404040', // neutral-700

      secondary: '#94a3b8', // secondary-400
      'secondary-hover': '#cbd5e1', // secondary-300
      'secondary-active': '#64748b', // secondary-500
      'secondary-disabled': '#404040', // neutral-700
    },
  },

  /**
   * Dark theme shadow overrides
   * Adjusted for dark backgrounds with lighter shadows
   */
  shadows: {
    ...baseTokens.shadows,

    // Dark theme specific shadows with adjusted opacity
    card: '0 1px 3px 0 rgb(255 255 255 / 0.1), 0 1px 2px -1px rgb(255 255 255 / 0.1)',
    dropdown: '0 10px 15px -3px rgb(255 255 255 / 0.1), 0 4px 6px -4px rgb(255 255 255 / 0.1)',
    modal: '0 25px 50px -12px rgb(255 255 255 / 0.25)',
    tooltip: '0 4px 6px -1px rgb(255 255 255 / 0.1), 0 2px 4px -2px rgb(255 255 255 / 0.1)',
  },
} as const
