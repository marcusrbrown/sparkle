import type {HTMLProperties} from '../../types'
import * as FormPrimitive from '@radix-ui/react-form'
import React, {useState} from 'react'
import {cx} from '../../utils'

export interface FormPasswordProps extends Omit<HTMLProperties<HTMLInputElement>, 'type'> {
  /**
   * Size variant for the password input
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Validation state for styling
   */
  validationState?: 'default' | 'error' | 'success'
  /**
   * Password placeholder text
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
   * Whether to show the toggle button to reveal/hide password
   */
  showToggle?: boolean
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
 * Form password component with theme-aware styling and optional show/hide toggle
 *
 * Uses CSS custom properties from @sparkle/theme for consistent theming
 * across light/dark modes and supports validation states with semantic colors.
 */
export const FormPassword = React.forwardRef<HTMLInputElement, FormPasswordProps>((props, ref) => {
  const {
    className,
    size = 'md',
    validationState = 'default',
    disabled = false,
    required = false,
    showToggle = false,
    onKeyDown,
    ...rest
  } = props

  const [isVisible, setIsVisible] = useState(false)

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

  const handleToggleVisibility = () => {
    setIsVisible(!isVisible)
  }

  const handleToggleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleToggleVisibility()
    }
  }

  // Base theme-aware classes for password input
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
    sm: ['text-sm'],
    md: ['text-sm'],
    lg: ['text-base'],
  }

  // Adjust padding based on whether toggle is shown
  const paddingClasses = showToggle
    ? {
        sm: ['pl-3', 'pr-10', 'py-1.5'],
        md: ['pl-4', 'pr-12', 'py-2'],
        lg: ['pl-4', 'pr-14', 'py-3'],
      }
    : {
        sm: ['px-3', 'py-1.5'],
        md: ['px-4', 'py-2'],
        lg: ['px-4', 'py-3'],
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

  const inputClasses = [...baseClasses, ...sizeClasses[size], ...paddingClasses[size], ...getValidationClasses()]

  // Container classes
  const containerClasses = ['relative', 'w-full']

  // Toggle button classes
  const toggleBaseClasses = [
    'absolute',
    'inset-y-0',
    'right-0',
    'flex',
    'items-center',
    'justify-center',
    'theme-transition',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    'focus:ring-theme-primary-500',
    'rounded-r-md',
    'border-l',
    'border-theme-border',
    'bg-theme-surface-secondary',
    'text-theme-text-secondary',
    'hover:bg-theme-surface-hover',
    'hover:text-theme-text-primary',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
  ]

  const toggleSizeClasses = {
    sm: ['w-8', 'px-2'],
    md: ['w-10', 'px-2'],
    lg: ['w-12', 'px-3'],
  }

  const iconSizeClasses = {
    sm: ['w-4', 'h-4'],
    md: ['w-5', 'h-5'],
    lg: ['w-6', 'h-6'],
  }

  const toggleClasses = [...toggleBaseClasses, ...toggleSizeClasses[size]]

  return (
    <div className={cx(...containerClasses)}>
      <FormPrimitive.Control asChild>
        <input
          ref={ref}
          type={isVisible ? 'text' : 'password'}
          disabled={disabled}
          required={required}
          autoComplete="current-password"
          aria-invalid={validationState === 'error' ? true : undefined}
          aria-required={required}
          className={cx(...inputClasses, className)}
          onKeyDown={handleKeyDown}
          {...rest}
        />
      </FormPrimitive.Control>
      {showToggle && (
        <button
          type="button"
          disabled={disabled}
          className={cx(...toggleClasses)}
          onClick={handleToggleVisibility}
          onKeyDown={handleToggleKeyDown}
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          tabIndex={0}
        >
          {isVisible ? (
            <svg className={cx(...iconSizeClasses[size])} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 9a3 3 0 0 0-3 3a3 3 0 0 0 3 3a3 3 0 0 0 3-3a3 3 0 0 0-3-3m0 8a5 5 0 0 1-5-5a5 5 0 0 1 5-5a5 5 0 0 1 5 5a5 5 0 0 1-5 5m0-12.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5Z" />
            </svg>
          ) : (
            <svg className={cx(...iconSizeClasses[size])} viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.83 9L15 12.16V12a3 3 0 0 0-3-3h-.17zm-4.3.8l1.55 1.55c-.05.21-.08.42-.08.65a3 3 0 0 0 3 3c.22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53a5 5 0 0 1-5-5c0-.79.2-1.53.53-2.2zm-.78-.78C5.38 10.13 4.1 11.36 3.27 13a11.79 11.79 0 0 0 6.69 5.82l1.54-1.54A9.91 9.91 0 0 1 3 13c.847-1.45 2.367-2.627 4.25-3.22l1.27 1.27zm8.38 8.38l-2.83-2.83A9.91 9.91 0 0 0 21 13c-.847 1.45-2.367 2.627-4.25 3.22l-1.27-1.27zM3.27 13a11.79 11.79 0 0 1 13.4-9.17l1.42-1.42A13.99 13.99 0 0 0 3.27 13z" />
            </svg>
          )}
        </button>
      )}
    </div>
  )
})

FormPassword.displayName = 'FormPassword'
