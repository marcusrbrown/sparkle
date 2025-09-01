import React from 'react'
import * as FormPrimitive from '@radix-ui/react-form'
import {cx} from '../../utils'
import type {HTMLProperties} from '../../types'

export interface FormMessageProps extends HTMLProperties<HTMLSpanElement> {
  /**
   * Built-in validation constraint to match
   */
  match?:
    | 'valueMissing'
    | 'typeMismatch'
    | 'patternMismatch'
    | 'tooLong'
    | 'tooShort'
    | 'rangeUnderflow'
    | 'rangeOverflow'
    | 'stepMismatch'
    | 'badInput'
    | 'valid'
  /**
   * Message children content
   */
  children: React.ReactNode
}

/**
 * Form message component for displaying validation feedback
 */
export const FormMessage = React.forwardRef<HTMLSpanElement, FormMessageProps>((props, ref) => {
  const {className, match, children, ...rest} = props

  return (
    <FormPrimitive.Message ref={ref} match={match} className={cx('form-message', className)} {...rest}>
      {children}
    </FormPrimitive.Message>
  )
})

FormMessage.displayName = 'FormMessage'
