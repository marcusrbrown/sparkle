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
  /**
   * Whether to announce the message to screen readers
   */
  announce?: boolean
  /**
   * Type of message for styling
   */
  type?: 'error' | 'success' | 'info'
}

/**
 * Form message component for displaying validation feedback
 */
export const FormMessage = React.forwardRef<HTMLSpanElement, FormMessageProps>((props, ref) => {
  const {className, match, children, announce = true, type = 'error', ...rest} = props

  return (
    <FormPrimitive.Message
      ref={ref}
      match={match}
      className={cx('form-message', `form-message-${type}`, className)}
      aria-live={announce ? 'polite' : undefined}
      role={type === 'error' ? 'alert' : undefined}
      {...rest}
    >
      {children}
    </FormPrimitive.Message>
  )
})

FormMessage.displayName = 'FormMessage'
