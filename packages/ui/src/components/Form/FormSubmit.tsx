import React from 'react'
import * as FormPrimitive from '@radix-ui/react-form'
import {cx} from '../../utils'
import type {HTMLProperties} from '../../types'

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
 * Form submit button component with proper form association
 */
export const FormSubmit = React.forwardRef<HTMLButtonElement, FormSubmitProps>((props, ref) => {
  const {className, size = 'md', variant = 'primary', disabled = false, children, ...rest} = props

  return (
    <FormPrimitive.Submit
      ref={ref}
      disabled={disabled}
      className={cx(
        'form-submit',
        `form-submit-${size}`,
        `form-submit-${variant}`,
        disabled && 'form-submit-disabled',
        className,
      )}
      {...rest}
    >
      {children}
    </FormPrimitive.Submit>
  )
})

FormSubmit.displayName = 'FormSubmit'
