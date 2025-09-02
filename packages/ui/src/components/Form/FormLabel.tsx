import type {HTMLProperties} from '../../types'
import * as FormPrimitive from '@radix-ui/react-form'
import React from 'react'
import {cx} from '../../utils'

export interface FormLabelProps extends HTMLProperties<HTMLLabelElement> {
  /**
   * Label children content
   */
  children: React.ReactNode
  /**
   * Whether the field is required
   */
  required?: boolean
  /**
   * Whether the field is disabled
   */
  disabled?: boolean
  /**
   * Optional description text for the field
   */
  description?: string
}

/**
 * Form label component with theme-aware styling and proper accessibility associations and required field indicators
 *
 * Uses CSS custom properties from @sparkle/theme for consistent theming
 * across light/dark modes and supports disabled states.
 */
export const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>((props, ref) => {
  const {className, children, required = false, disabled = false, description, ...rest} = props

  // Base theme-aware classes for labels
  const baseClasses = ['block', 'text-sm', 'font-medium', 'mb-2', 'theme-transition']

  // State-specific classes
  const getStateClasses = () => {
    if (disabled) {
      return ['text-theme-text-disabled', 'cursor-not-allowed']
    }
    return ['text-theme-text-primary', 'cursor-pointer']
  }

  const labelClasses = [...baseClasses, ...getStateClasses()]

  return (
    <div className="form-label-container">
      <FormPrimitive.Label ref={ref} className={cx(...labelClasses, className)} {...rest}>
        {children}
        {required && (
          <span
            className={cx(
              'ml-1',
              'text-theme-error-500',
              'text-sm',
              'font-bold',
              disabled && 'text-theme-text-disabled',
            )}
            aria-label="required"
          >
            *
          </span>
        )}
      </FormPrimitive.Label>
      {description && (
        <span
          className={cx(
            'block',
            'text-xs',
            'mt-1',
            'theme-transition',
            disabled ? 'text-theme-text-disabled' : 'text-theme-text-secondary',
          )}
        >
          {description}
        </span>
      )}
    </div>
  )
})

FormLabel.displayName = 'FormLabel'
