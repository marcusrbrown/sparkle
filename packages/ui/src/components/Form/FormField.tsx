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
 * Form field wrapper component that manages accessibility and validation
 */
export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>((props, ref) => {
  const {name, className, children, validationState, size, ...rest} = props

  return (
    <FormPrimitive.Field
      ref={ref}
      name={name}
      className={cx(
        'form-field',
        validationState && `form-field-${validationState}`,
        size && `form-field-${size}`,
        className,
      )}
      {...rest}
    >
      {children}
    </FormPrimitive.Field>
  )
})

FormField.displayName = 'FormField'
