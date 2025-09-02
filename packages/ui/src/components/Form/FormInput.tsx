import type {HTMLProperties} from '../../types'
import * as FormPrimitive from '@radix-ui/react-form'
import React from 'react'
import {cx} from '../../utils'

export interface FormInputProps extends HTMLProperties<HTMLInputElement> {
  /**
   * Input type
   */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
  /**
   * Size variant for the input
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Validation state for styling
   */
  validationState?: 'default' | 'error' | 'success'
  /**
   * Input placeholder text
   */
  placeholder?: string
  /**
   * Whether the field is disabled
   */
  disabled?: boolean
  /**
   * Whether the field is required
   */
  required?: boolean
  /**
   * Input value
   */
  value?: string
  /**
   * Input change handler
   */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
  /**
   * Input focus handler
   */
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void
  /**
   * Input blur handler
   */
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void
  /**
   * Input key down handler for keyboard navigation
   */
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void
}

/**
 * Form input component with theme-aware styling for different input types with proper accessibility
 *
 * Uses CSS custom properties from @sparkle/theme for consistent theming
 * across light/dark modes and supports validation states with semantic colors.
 */
export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>((props, ref) => {
  const {
    className,
    type = 'text',
    size = 'md',
    validationState = 'default',
    disabled = false,
    required = false,
    onKeyDown,
    ...rest
  } = props

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle keyboard navigation
    if (event.key === 'Enter') {
      // Allow form submission on Enter
      const form = event.currentTarget.form
      if (form) {
        const submitEvent = new Event('submit', {bubbles: true, cancelable: true})
        form.dispatchEvent(submitEvent)
      }
    }

    // Call parent onKeyDown if provided
    onKeyDown?.(event)
  }

  // Base theme-aware classes for all inputs
  const baseClasses = [
    // Layout and appearance
    'w-full',
    'rounded-md',
    'border',
    // Typography
    'font-medium',
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
      <input
        ref={ref}
        type={type}
        disabled={disabled}
        required={required}
        aria-invalid={validationState === 'error' ? true : undefined}
        aria-required={required}
        className={cx(...allClasses, className)}
        onKeyDown={handleKeyDown}
        {...rest}
      />
    </FormPrimitive.Control>
  )
})

FormInput.displayName = 'FormInput'
