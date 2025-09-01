import type {HTMLProperties} from '../../types'
import * as FormPrimitive from '@radix-ui/react-form'
import React from 'react'
import {cx} from '../../utils'

export interface FormControlProps extends HTMLProperties<HTMLElement> {
  /**
   * Use the child component as the control element
   */
  asChild?: boolean
  /**
   * Size variant for the control
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Validation state for styling
   */
  validationState?: 'default' | 'error' | 'success'
  /**
   * Whether the control is disabled
   */
  disabled?: boolean
}

/**
 * Form control wrapper that handles input focus and validation
 */
export const FormControl = React.forwardRef<HTMLInputElement, FormControlProps>((props, ref) => {
  const {className, asChild, size = 'md', validationState = 'default', disabled = false, ...rest} = props

  return (
    <FormPrimitive.Control
      ref={ref}
      asChild={asChild}
      className={cx(
        'form-control',
        `form-control-${size}`,
        `form-control-${validationState}`,
        disabled && 'form-control-disabled',
        className,
      )}
      {...rest}
    />
  )
})

FormControl.displayName = 'FormControl'
