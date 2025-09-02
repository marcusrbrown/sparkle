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
 * Form control wrapper component with theme-aware styling that handles input focus and validation
 *
 * Uses CSS custom properties from @sparkle/theme for consistent theming
 * across light/dark modes. Primarily a pass-through wrapper for Radix Form.Control.
 */
export const FormControl = React.forwardRef<HTMLInputElement, FormControlProps>((props, ref) => {
  const {className, asChild, size, validationState, disabled, ...rest} = props

  // Theme-aware classes for form control wrapper
  const controlClasses = [
    'theme-transition',
    // Add any additional wrapper styling if needed
  ]

  return <FormPrimitive.Control ref={ref} asChild={asChild} className={cx(...controlClasses, className)} {...rest} />
})

FormControl.displayName = 'FormControl'
