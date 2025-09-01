import React from 'react'
import * as FormPrimitive from '@radix-ui/react-form'
import {cx} from '../../utils'
import type {HTMLProperties} from '../../types'

export interface FormLabelProps extends HTMLProperties<HTMLLabelElement> {
  /**
   * Label children content
   */
  children: React.ReactNode
}

/**
 * Form label component with proper accessibility associations
 */
export const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>((props, ref) => {
  const {className, children, ...rest} = props

  return (
    <FormPrimitive.Label ref={ref} className={cx('form-label', className)} {...rest}>
      {children}
    </FormPrimitive.Label>
  )
})

FormLabel.displayName = 'FormLabel'
