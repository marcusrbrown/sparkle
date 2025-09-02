import type {HTMLProperties} from '../../types'
import React from 'react'
import {cx} from '../../utils'

export interface ButtonProps extends HTMLProperties<HTMLButtonElement> {
  /**
   * The variant style of the button
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  /**
   * The size of the button
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * The semantic color variant for contextual styling
   */
  semantic?: 'default' | 'success' | 'warning' | 'error'
}

/**
 * Button component with theme-aware styling and semantic color variants
 *
 * Uses CSS custom properties from @sparkle/theme for consistent theming
 * across light/dark modes and supports semantic color variants for
 * contextual actions (success, warning, error).
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const {variant = 'primary', size = 'md', semantic = 'default', className, children, ...rest} = props

  // Base theme-aware classes for all buttons
  const baseClasses = [
    // Transition and focus states
    'theme-transition',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    'focus:ring-theme-primary-500',
    // Typography and layout
    'font-medium',
    'rounded-md',
    'inline-flex',
    'items-center',
    'justify-center',
    // Disabled state
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
  ]

  // Size-specific classes
  const sizeClasses = {
    sm: ['px-3', 'py-1.5', 'text-sm'],
    md: ['px-4', 'py-2', 'text-sm'],
    lg: ['px-6', 'py-3', 'text-base'],
  }

  // Semantic color overrides for non-default variants
  const getSemanticClasses = () => {
    if (semantic === 'default') return []

    const semanticColors = {
      success: {
        primary: ['bg-theme-success-500', 'text-white', 'hover:bg-theme-success-600', 'focus:ring-theme-success-500'],
        secondary: [
          'bg-theme-success-50',
          'text-theme-success-700',
          'hover:bg-theme-success-100',
          'focus:ring-theme-success-500',
        ],
        outline: [
          'border-theme-success-500',
          'text-theme-success-600',
          'hover:bg-theme-success-50',
          'focus:ring-theme-success-500',
        ],
        ghost: ['text-theme-success-600', 'hover:bg-theme-success-50', 'focus:ring-theme-success-500'],
      },
      warning: {
        primary: ['bg-theme-warning-500', 'text-white', 'hover:bg-theme-warning-600', 'focus:ring-theme-warning-500'],
        secondary: [
          'bg-theme-warning-50',
          'text-theme-warning-700',
          'hover:bg-theme-warning-100',
          'focus:ring-theme-warning-500',
        ],
        outline: [
          'border-theme-warning-500',
          'text-theme-warning-600',
          'hover:bg-theme-warning-50',
          'focus:ring-theme-warning-500',
        ],
        ghost: ['text-theme-warning-600', 'hover:bg-theme-warning-50', 'focus:ring-theme-warning-500'],
      },
      error: {
        primary: ['bg-theme-error-500', 'text-white', 'hover:bg-theme-error-600', 'focus:ring-theme-error-500'],
        secondary: [
          'bg-theme-error-50',
          'text-theme-error-700',
          'hover:bg-theme-error-100',
          'focus:ring-theme-error-500',
        ],
        outline: [
          'border-theme-error-500',
          'text-theme-error-600',
          'hover:bg-theme-error-50',
          'focus:ring-theme-error-500',
        ],
        ghost: ['text-theme-error-600', 'hover:bg-theme-error-50', 'focus:ring-theme-error-500'],
      },
    }

    return semanticColors[semantic]?.[variant] || []
  }

  // Default variant classes (when semantic is 'default')
  const getDefaultVariantClasses = () => {
    if (semantic !== 'default') return []

    const variantClasses = {
      primary: ['bg-theme-primary-500', 'text-white', 'hover:bg-theme-primary-600', 'focus:ring-theme-primary-500'],
      secondary: [
        'bg-theme-secondary-100',
        'text-theme-secondary-900',
        'hover:bg-theme-secondary-200',
        'focus:ring-theme-secondary-500',
      ],
      outline: [
        'border',
        'border-theme-primary-500',
        'text-theme-primary-600',
        'hover:bg-theme-primary-50',
        'focus:ring-theme-primary-500',
      ],
      ghost: ['text-theme-primary-600', 'hover:bg-theme-primary-50', 'focus:ring-theme-primary-500'],
    }

    return variantClasses[variant] || []
  }

  const allClasses = [...baseClasses, ...sizeClasses[size], ...getDefaultVariantClasses(), ...getSemanticClasses()]

  return (
    <button ref={ref} className={cx(...allClasses, className)} {...rest}>
      {children}
    </button>
  )
})

// Re-export needed utilities
