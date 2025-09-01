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
 * Form input component for different input types with proper accessibility
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

  return (
    <FormPrimitive.Control asChild>
      <input
        ref={ref}
        type={type}
        disabled={disabled}
        required={required}
        aria-invalid={validationState === 'error'}
        aria-required={required}
        className={cx(
          'form-input',
          `form-input-${size}`,
          `form-input-${validationState}`,
          disabled && 'form-input-disabled',
          className,
        )}
        onKeyDown={handleKeyDown}
        {...rest}
      />
    </FormPrimitive.Control>
  )
})

FormInput.displayName = 'FormInput'
