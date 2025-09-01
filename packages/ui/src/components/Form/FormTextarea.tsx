import React from 'react'
import * as FormPrimitive from '@radix-ui/react-form'
import {cx} from '../../utils'
import type {HTMLProperties} from '../../types'

export interface FormTextareaProps extends HTMLProperties<HTMLTextAreaElement> {
  /**
   * Size variant for the textarea
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Validation state for styling
   */
  validationState?: 'default' | 'error' | 'success'
  /**
   * Textarea placeholder text
   */
  placeholder?: string
}

/**
 * Form textarea component for multi-line text input
 */
export const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>((props, ref) => {
  const {className, size = 'md', validationState = 'default', ...rest} = props

  return (
    <FormPrimitive.Control asChild>
      <textarea
        ref={ref}
        className={cx('form-textarea', `form-textarea-${size}`, `form-textarea-${validationState}`, className)}
        {...rest}
      />
    </FormPrimitive.Control>
  )
})

FormTextarea.displayName = 'FormTextarea'
