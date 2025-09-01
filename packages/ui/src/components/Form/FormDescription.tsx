import type {HTMLProperties} from '../../types'
import * as FormPrimitive from '@radix-ui/react-form'
import React from 'react'
import {cx} from '../../utils'

export interface FormDescriptionProps extends HTMLProperties<HTMLParagraphElement> {
  /**
   * Description text content
   */
  children: React.ReactNode
  /**
   * Whether the description is for a disabled field
   */
  disabled?: boolean
}

/**
 * Form description component for providing additional field context
 * Automatically connects to form controls via aria-describedby
 */
export const FormDescription = React.forwardRef<HTMLParagraphElement, FormDescriptionProps>((props, ref) => {
  const {className, children, disabled = false, ...rest} = props

  return (
    <FormPrimitive.Message
      ref={ref}
      className={cx('form-description', disabled && 'form-description-disabled', className)}
      {...rest}
    >
      {children}
    </FormPrimitive.Message>
  )
})

FormDescription.displayName = 'FormDescription'
