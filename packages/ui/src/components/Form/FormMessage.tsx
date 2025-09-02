import type {HTMLProperties} from '../../types'
import * as FormPrimitive from '@radix-ui/react-form'
import React from 'react'
import {cx} from '../../utils'

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
 * Form message component with theme-aware styling for displaying validation feedback
 *
 * Uses CSS custom properties from @sparkle/theme for consistent theming
 * across light/dark modes and supports semantic colors for different message types.
 */
export const FormMessage = React.forwardRef<HTMLSpanElement, FormMessageProps>((props, ref) => {
  const {className, match, children, announce = true, type = 'error', ...rest} = props

  // Base theme-aware classes for all messages
  const baseClasses = ['block', 'text-xs', 'mt-1', 'font-medium', 'theme-transition']

  // Type-specific classes using semantic colors
  const getTypeClasses = () => {
    const typeClasses = {
      error: ['text-theme-error-600', 'dark:text-theme-error-400'],
      success: ['text-theme-success-600', 'dark:text-theme-success-400'],
      info: ['text-theme-primary-600', 'dark:text-theme-primary-400'],
    }

    return typeClasses[type] || typeClasses.error
  }

  const allClasses = [...baseClasses, ...getTypeClasses()]

  return (
    <FormPrimitive.Message
      ref={ref}
      match={match}
      className={cx(...allClasses, className)}
      aria-live={announce ? 'polite' : undefined}
      role={type === 'error' ? 'alert' : undefined}
      {...rest}
    >
      {children}
    </FormPrimitive.Message>
  )
})

FormMessage.displayName = 'FormMessage'
