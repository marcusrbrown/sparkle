import React from 'react'
import * as FormPrimitive from '@radix-ui/react-form'
import {cx} from '../../utils'
import type {HTMLProperties} from '../../types'

export interface FormProps extends HTMLProperties<HTMLFormElement> {
  /**
   * Form submission handler
   */
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void
  /**
   * Clear validation state on form reset
   */
  clearOnSubmit?: boolean
}

/**
 * Form component with accessible validation and submission handling
 */
export const Form = React.forwardRef<HTMLFormElement, FormProps>((props, ref) => {
  const {className, children, clearOnSubmit, ...rest} = props

  return (
    <FormPrimitive.Root ref={ref} className={cx('form', className)} {...rest}>
      {children}
    </FormPrimitive.Root>
  )
})

Form.displayName = 'Form'
