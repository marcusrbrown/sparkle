import React from 'react'
import * as FormPrimitive from '@radix-ui/react-form'
import {cx} from '../../utils'
import type {HTMLProperties} from '../../types'

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
 * Form label component with proper accessibility associations and required field indicators
 */
export const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>((props, ref) => {
  const {className, children, required = false, disabled = false, description, ...rest} = props

  return (
    <div className={cx('form-label-container')}>
      <FormPrimitive.Label
        ref={ref}
        className={cx(
          'form-label',
          required && 'form-label-required',
          disabled && 'form-label-disabled',
          className,
        )}
        {...rest}
      >
        {children}
        {required && (
          <span className="form-label-required-indicator" aria-label="required">
            *
          </span>
        )}
      </FormPrimitive.Label>
      {description && (
        <span className={cx('form-label-description', disabled && 'form-label-description-disabled')}>
          {description}
        </span>
      )}
    </div>
  )
})

FormLabel.displayName = 'FormLabel'
