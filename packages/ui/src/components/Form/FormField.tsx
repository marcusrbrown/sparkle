import type {HTMLProperties} from '../../types'
import * as FormPrimitive from '@radix-ui/react-form'
import React from 'react'
import {cx} from '../../utils'

export interface FormFieldProps extends HTMLProperties<HTMLDivElement> {
  /**
   * Field name for form submission and validation
   */
  name: string
  /**
   * Validation state of the field
   */
  validationState?: 'default' | 'error' | 'success'
  /**
   * Size variant for the field
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Field children content
   */
  children: React.ReactNode
}

/**
 * Form field wrapper component with theme-aware styling that manages accessibility and validation
 *
 * Uses CSS custom properties from @sparkle/theme for consistent theming
 * across light/dark modes and provides proper field grouping.
 */
export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>((props, ref) => {
  const {name, className, children, validationState, size, ...rest} = props

  // Theme-aware classes for form field wrapper
  const fieldClasses = [
    'space-y-2',
    'theme-transition',
    // Add validation state styling if needed
    validationState === 'error' && 'form-field-error',
    validationState === 'success' && 'form-field-success',
  ].filter(Boolean)

  return (
    <FormPrimitive.Field ref={ref} name={name} role="group" className={cx(...fieldClasses, className)} {...rest}>
      {children}
    </FormPrimitive.Field>
  )
})

FormField.displayName = 'FormField'
