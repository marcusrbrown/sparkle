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
 * Form description component with theme-aware styling for providing additional field context
 *
 * Automatically connects to form controls via aria-describedby
 * Uses CSS custom properties from @sparkle/theme for consistent theming.
 */
export const FormDescription = React.forwardRef<HTMLParagraphElement, FormDescriptionProps>((props, ref) => {
  const {className, children, disabled = false, ...rest} = props

  // Base theme-aware classes
  const baseClasses = ['block', 'text-xs', 'mt-1', 'leading-5', 'theme-transition']

  // State-specific classes
  const getStateClasses = () => {
    if (disabled) {
      return ['text-theme-text-disabled']
    }
    return ['text-theme-text-secondary']
  }

  const allClasses = [...baseClasses, ...getStateClasses()]

  return (
    <FormPrimitive.Message ref={ref} className={cx(...allClasses, className)} {...rest}>
      {children}
    </FormPrimitive.Message>
  )
})

FormDescription.displayName = 'FormDescription'
