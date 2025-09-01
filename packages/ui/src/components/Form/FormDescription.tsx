import React from 'react'
import {cx} from '../../utils'
import type {HTMLProperties} from '../../types'

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
 */
export const FormDescription = React.forwardRef<HTMLParagraphElement, FormDescriptionProps>((props, ref) => {
  const {className, children, disabled = false, ...rest} = props

  return (
    <p
      ref={ref}
      className={cx('form-description', disabled && 'form-description-disabled', className)}
      {...rest}
    >
      {children}
    </p>
  )
})

FormDescription.displayName = 'FormDescription'
