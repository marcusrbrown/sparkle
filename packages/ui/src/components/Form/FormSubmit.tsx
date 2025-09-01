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
   * Submit button children content
   */
  children: React.ReactNode
}

/**
 * Form submit button component with proper form association
 */
export const FormSubmit = React.forwardRef<HTMLButtonElement, FormSubmitProps>((props, ref) => {
  const {className, size = 'md', variant = 'primary', children, ...rest} = props

  return (
    <FormPrimitive.Submit
      ref={ref}
      className={cx(
        'form-submit',
        `form-submit-${size}`,
        `form-submit-${variant}`,
        className,
      )}
      {...rest}
    >
      {children}
    </FormPrimitive.Submit>
  )
})

FormSubmit.displayName = 'FormSubmit'
