import type {HTMLProperties} from '../../types'
import * as FormPrimitive from '@radix-ui/react-form'
import React from 'react'
import {cx} from '../../utils'

export interface FormTextareaProps extends HTMLProperties<HTMLTextAreaElement> {
  /**
   * Size variant for the textarea
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Validation state for styling
   */
  validationState?: 'default' | 'error' | 'success'
  /**
   * Textarea placeholder text
   */
  placeholder?: string
  /**
   * Whether the textarea is disabled
   */
  disabled?: boolean
  /**
   * Whether the textarea is required
   */
  required?: boolean
}

/**
 * Form textarea component with theme-aware styling for multi-line text input
 *
 * Uses CSS custom properties from @sparkle/theme for consistent theming
 * across light/dark modes and supports validation states with semantic colors.
 */
export const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>((props, ref) => {
  const {className, size = 'md', validationState = 'default', disabled = false, required = false, ...rest} = props

  // Base theme-aware classes for all textareas
  const baseClasses = [
    // Layout and appearance
    'w-full',
    'rounded-md',
    'border',
    'resize-y',
    'min-h-[80px]',
    // Typography
    'font-medium',
    'leading-5',
    // Transitions and focus
    'theme-transition',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    // Disabled state
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
    'disabled:bg-theme-surface-disabled',
  ]

  // Size-specific classes
  const sizeClasses = {
    sm: ['px-3', 'py-1.5', 'text-sm'],
    md: ['px-4', 'py-2', 'text-sm'],
    lg: ['px-4', 'py-3', 'text-base'],
  }

  // Validation state classes
  const getValidationClasses = () => {
    const validationClasses = {
      default: [
        'bg-theme-surface-primary',
        'text-theme-text-primary',
        'border-theme-border',
        'placeholder:text-theme-text-secondary',
        'focus:ring-theme-primary-500',
        'focus:border-theme-primary-500',
      ],
      error: [
        'bg-theme-surface-primary',
        'text-theme-text-primary',
        'border-theme-error-500',
        'placeholder:text-theme-text-secondary',
        'focus:ring-theme-error-500',
        'focus:border-theme-error-500',
      ],
      success: [
        'bg-theme-surface-primary',
        'text-theme-text-primary',
        'border-theme-success-500',
        'placeholder:text-theme-text-secondary',
        'focus:ring-theme-success-500',
        'focus:border-theme-success-500',
      ],
    }

    return validationClasses[validationState] || validationClasses.default
  }

  const allClasses = [...baseClasses, ...sizeClasses[size], ...getValidationClasses()]

  return (
    <FormPrimitive.Control asChild>
      <textarea
        ref={ref}
        disabled={disabled}
        required={required}
        aria-invalid={validationState === 'error' ? true : undefined}
        aria-required={required}
        className={cx(...allClasses, className)}
        {...rest}
      />
    </FormPrimitive.Control>
  )
})

FormTextarea.displayName = 'FormTextarea'
