import type {ThemeConfig} from '@sparkle/types'
import {baseTokens} from './base.js'

/**
 * Light theme tokens extending the base design system
 * Optimized for light mode interfaces with appropriate contrast ratios
 */
export const lightTokens: ThemeConfig = {
  ...baseTokens,

  /**
   * Light theme color overrides
   * Focus on semantic colors for text, backgrounds, and UI elements
   */
  colors: {
    ...baseTokens.colors,

    // Light theme semantic colors
    background: {
      primary: '#fafafa', // Main background (neutral-50)
      secondary: '#f5f5f5', // Secondary surfaces (neutral-100)
      tertiary: '#e5e5e5', // Elevated surfaces (neutral-200)
      inverse: '#171717', // Dark backgrounds for contrast (neutral-900)
    },

    text: {
      primary: '#171717', // Primary text (neutral-900)
      secondary: '#525252', // Secondary text (neutral-600)
      tertiary: '#737373', // Tertiary text (neutral-500)
      inverse: '#fafafa', // Text on dark backgrounds (neutral-50)
      disabled: '#a3a3a3', // Disabled text (neutral-400)
    },

    border: {
      primary: '#e5e5e5', // Primary borders (neutral-200)
      secondary: '#d4d4d4', // Secondary borders (neutral-300)
      focus: '#3b82f6', // Focus rings (primary-500)
      error: '#ef4444', // Error borders (error-500)
    },

    surface: {
      primary: '#fafafa', // Card backgrounds (neutral-50)
      secondary: '#f5f5f5', // Secondary surfaces (neutral-100)
      elevated: '#e5e5e5', // Elevated components (neutral-200)
      overlay: 'rgb(0 0 0 / 0.5)', // Modal overlays
    },

    // Interactive states for light theme
    interactive: {
      primary: '#3b82f6', // primary-500
      'primary-hover': '#2563eb', // primary-600
      'primary-active': '#1d4ed8', // primary-700
      'primary-disabled': '#d4d4d4', // neutral-300

      secondary: '#64748b', // secondary-500
      'secondary-hover': '#475569', // secondary-600
      'secondary-active': '#334155', // secondary-700
      'secondary-disabled': '#d4d4d4', // neutral-300
    },
  },

  /**
   * Light theme shadow overrides
   * Adjusted for light backgrounds
   */
  shadows: {
    ...baseTokens.shadows,

    // Light theme specific shadows with appropriate opacity
    card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    dropdown: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    modal: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    tooltip: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  },
} as const
