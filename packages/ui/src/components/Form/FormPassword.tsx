import React, {useState} from 'react'
import * as FormPrimitive from '@radix-ui/react-form'
import {cx} from '../../utils'
import type {HTMLProperties} from '../../types'

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
 * Form password component with optional show/hide toggle
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

  return (
    <div className={cx('form-password-container', `form-password-container-${size}`)}>
      <FormPrimitive.Control asChild>
        <input
          ref={ref}
          type={isVisible ? 'text' : 'password'}
          disabled={disabled}
          required={required}
          aria-invalid={validationState === 'error'}
          aria-required={required}
          className={cx(
            'form-password',
            `form-password-${size}`,
            `form-password-${validationState}`,
            disabled && 'form-password-disabled',
            showToggle && 'form-password-with-toggle',
            className,
          )}
          onKeyDown={handleKeyDown}
          {...rest}
        />
      </FormPrimitive.Control>
      {showToggle && (
        <button
          type="button"
          disabled={disabled}
          className={cx(
            'form-password-toggle',
            `form-password-toggle-${size}`,
            disabled && 'form-password-toggle-disabled',
          )}
          onClick={handleToggleVisibility}
          onKeyDown={handleToggleKeyDown}
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          tabIndex={0}
        >
          {isVisible ? (
            <svg className="form-password-toggle-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 9a3 3 0 0 0-3 3a3 3 0 0 0 3 3a3 3 0 0 0 3-3a3 3 0 0 0-3-3m0 8a5 5 0 0 1-5-5a5 5 0 0 1 5-5a5 5 0 0 1 5 5a5 5 0 0 1-5 5m0-12.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5Z" />
            </svg>
          ) : (
            <svg className="form-password-toggle-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.83 9L15 12.16V12a3 3 0 0 0-3-3h-.17zm-4.3.8l1.55 1.55c-.05.21-.08.42-.08.65a3 3 0 0 0 3 3c.22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53a5 5 0 0 1-5-5c0-.79.2-1.53.53-2.2zm-.78-.78C5.38 10.13 4.1 11.36 3.27 13a11.79 11.79 0 0 0 6.69 5.82l1.54-1.54A9.91 9.91 0 0 1 3 13c.847-1.45 2.367-2.627 4.25-3.22l1.27 1.27zm8.38 8.38l-2.83-2.83A9.91 9.91 0 0 0 21 13c-.847 1.45-2.367 2.627-4.25 3.22l-1.27-1.27zM3.27 13a11.79 11.79 0 0 1 13.4-9.17l1.42-1.42A13.99 13.99 0 0 0 3.27 13z" />
            </svg>
          )}
        </button>
      )}
    </div>
  )
})

FormPassword.displayName = 'FormPassword'
