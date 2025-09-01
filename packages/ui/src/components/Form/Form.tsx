import type {HTMLProperties} from '../../types'
import * as FormPrimitive from '@radix-ui/react-form'
import React from 'react'
import {cx} from '../../utils'

export interface FormProps extends HTMLProperties<HTMLFormElement> {
  /**
   * Form submission handler
   */
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void
  /**
   * Clear validation state on form reset
   */
  clearOnSubmit?: boolean
  /**
   * Whether to prevent default form submission
   */
  preventDefaultSubmission?: boolean
  /**
   * Form validation handler called before submission
   */
  onValidate?: (formData: FormData) => boolean | Promise<boolean>
  /**
   * Error handler for form submission errors
   */
  onFormError?: (error: Error) => void
  /**
   * Success handler for successful form submission
   */
  onFormSuccess?: (formData: FormData) => void
}

/**
 * Form component with accessible validation and submission handling
 */
export const Form = React.forwardRef<HTMLFormElement, FormProps>((props, ref) => {
  const {
    className,
    children,
    clearOnSubmit,
    preventDefaultSubmission = false,
    onValidate,
    onFormError,
    onFormSuccess,
    onSubmit,
    ...rest
  } = props

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    // Important: Radix UI Form.Root only calls onSubmit if client-side validation passes
    // This means constraint validation (required, email format, etc.) has already succeeded
    // We should only run our custom logic here

    if (preventDefaultSubmission) {
      event.preventDefault()
    }

    try {
      const formData = new FormData(event.currentTarget)

      // Run custom validation if provided (constraint validation already passed)
      if (onValidate) {
        const isValid = await onValidate(formData)
        if (!isValid) {
          event.preventDefault()
          return
        }
      }

      // Call the provided onSubmit handler
      onSubmit?.(event)

      // Call success handler if form submission was not prevented
      if (!event.defaultPrevented) {
        onFormSuccess?.(formData)
      }

      // Clear form if requested
      if (clearOnSubmit && !event.defaultPrevented) {
        event.currentTarget.reset()
      }
    } catch (error) {
      event.preventDefault()
      onFormError?.(error instanceof Error ? error : new Error('Form submission failed'))
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    // Handle Escape key to blur focused elements
    if (event.key === 'Escape') {
      const activeElement = document.activeElement as HTMLElement
      if (activeElement && activeElement.blur) {
        activeElement.blur()
      }
    }
  }

  return (
    <FormPrimitive.Root
      ref={ref}
      role="form"
      className={cx('form', className)}
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {children}
    </FormPrimitive.Root>
  )
})

Form.displayName = 'Form'
