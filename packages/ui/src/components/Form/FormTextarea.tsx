import type {HTMLProperties} from '../../types'
import * as FormPrimitive from '@radix-ui/react-form'
import React from 'react'
import {cx} from '../../utils'

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
  /**
   * Whether the textarea is disabled
   */
  disabled?: boolean
  /**
   * Whether the textarea is required
   */
  required?: boolean
}

/**
 * Form textarea component for multi-line text input
 */
export const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>((props, ref) => {
  const {className, size = 'md', validationState = 'default', disabled = false, required = false, ...rest} = props

  return (
    <FormPrimitive.Control asChild>
      <textarea
        ref={ref}
        disabled={disabled}
        required={required}
        aria-invalid={validationState === 'error'}
        aria-required={required}
        className={cx(
          'form-textarea',
          `form-textarea-${size}`,
          `form-textarea-${validationState}`,
          disabled && 'form-textarea-disabled',
          className,
        )}
        {...rest}
      />
    </FormPrimitive.Control>
  )
})

FormTextarea.displayName = 'FormTextarea'
