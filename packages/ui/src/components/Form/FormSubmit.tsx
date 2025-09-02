import type {HTMLProperties} from '../../types'
import * as FormPrimitive from '@radix-ui/react-form'
import React from 'react'
import {cx} from '../../utils'

export interface FormSubmitProps extends HTMLProperties<HTMLButtonElement> {
  /**
   * Size variant for the submit button
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Visual variant for the submit button
   */
  variant?: 'primary' | 'secondary' | 'outline'
  /**
   * Whether the submit button is disabled
   */
  disabled?: boolean
  /**
   * Submit button children content
   */
  children: React.ReactNode
}

/**
 * Form submit button component with theme-aware styling and proper form association
 *
 * Uses CSS custom properties from @sparkle/theme for consistent theming
 * across light/dark modes and follows the same patterns as the Button component.
 */
export const FormSubmit = React.forwardRef<HTMLButtonElement, FormSubmitProps>((props, ref) => {
  const {className, size = 'md', variant = 'primary', disabled = false, children, ...rest} = props

  // Base theme-aware classes for all submit buttons
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

  // Variant classes using theme tokens
  const getVariantClasses = () => {
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
        'bg-transparent',
      ],
    }

    return variantClasses[variant] || variantClasses.primary
  }

  const allClasses = [...baseClasses, ...sizeClasses[size], ...getVariantClasses()]

  return (
    <FormPrimitive.Submit ref={ref} disabled={disabled} className={cx(...allClasses, className)} {...rest}>
      {children}
    </FormPrimitive.Submit>
  )
})

FormSubmit.displayName = 'FormSubmit'
