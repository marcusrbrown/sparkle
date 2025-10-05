import type {HTMLProperties} from '../../types'
import * as FormPrimitive from '@radix-ui/react-form'
import React from 'react'
import {cx} from '../../utils'

export interface FormProps extends HTMLProperties<HTMLFormElement> {
  /**
   * Form submission handler called after validation passes
   * @param event - React form event
   */
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void
  /**
   * Whether to clear form fields after successful submission
   * @default false
   */
  clearOnSubmit?: boolean
  /**
   * Whether to prevent default browser form submission
   * @default false
   */
  preventDefaultSubmission?: boolean
  /**
   * Custom validation handler called before submission
   * @param formData - Form data object containing all field values
   * @returns boolean or Promise<boolean> - Return false to prevent submission
   *
   * @remarks
   * This handler is called AFTER built-in HTML5 constraint validation passes.
   * Use this for custom async validation like API calls or complex business logic.
   */
  onValidate?: (formData: FormData) => boolean | Promise<boolean>
  /**
   * Error handler for form submission errors
   * @param error - Error object from failed submission
   */
  onFormError?: (error: Error) => void
  /**
   * Success handler called after successful form submission
   * @param formData - Form data object containing submitted values
   */
  onFormSuccess?: (formData: FormData) => void
}

/**
 * Form component with accessible validation and submission handling
 *
 * @description
 * A comprehensive, accessible form component built on Radix UI Form primitives.
 * Provides robust validation, error handling, and submission management with
 * full WCAG 2.1 AA compliance. Fully integrated with @sparkle/theme system.
 *
 * @features
 * - **Accessibility**: Full WCAG 2.1 AA compliance with ARIA attributes and screen reader support
 * - **Client-Side Validation**: Built-in HTML5 constraint validation (required, email, pattern, etc.)
 * - **Custom Validation**: Support for async validation logic before submission
 * - **Error Handling**: Comprehensive error handling with user-friendly messages
 * - **Submission Control**: Fine-grained control over form submission behavior
 * - **Theme Integration**: Fully integrated with @sparkle/theme system
 * - **Keyboard Navigation**: Complete keyboard support for all form interactions
 *
 * @example Basic form with validation
 * ```tsx
 * import { Form, FormField, FormInput, FormLabel, FormMessage, FormSubmit } from '@sparkle/ui'
 *
 * function ContactForm() {
 *   const handleSubmit = (event: React.FormEvent) => {
 *     const formData = new FormData(event.currentTarget)
 *     console.log('Form submitted:', Object.fromEntries(formData))
 *   }
 *
 *   return (
 *     <Form onSubmit={handleSubmit} preventDefaultSubmission>
 *       <FormField name="email">
 *         <FormLabel>Email</FormLabel>
 *         <FormInput type="email" placeholder="your@email.com" required />
 *         <FormMessage match="valueMissing">Please enter your email</FormMessage>
 *         <FormMessage match="typeMismatch">Please enter a valid email</FormMessage>
 *       </FormField>
 *       <FormSubmit>Send Message</FormSubmit>
 *     </Form>
 *   )
 * }
 * ```
 *
 * @example Form with custom async validation
 * ```tsx
 * function RegistrationForm() {
 *   const handleValidate = async (formData: FormData) => {
 *     const username = formData.get('username') as string
 *     // Check if username is available via API
 *     const isAvailable = await checkUsernameAvailability(username)
 *     if (!isAvailable) {
 *       // Show error message to user
 *       return false
 *     }
 *     return true
 *   }
 *
 *   return (
 *     <Form
 *       onValidate={handleValidate}
 *       onSubmit={handleSubmit}
 *       preventDefaultSubmission
 *     >
 *       <FormField name="username">
 *         <FormLabel>Username</FormLabel>
 *         <FormInput required minLength={3} />
 *       </FormField>
 *       <FormSubmit>Register</FormSubmit>
 *     </Form>
 *   )
 * }
 * ```
 *
 * @example Form with error handling
 * ```tsx
 * function LoginForm() {
 *   const [error, setError] = useState<string | null>(null)
 *
 *   const handleError = (error: Error) => {
 *     setError(error.message)
 *   }
 *
 *   const handleSubmit = async (event: React.FormEvent) => {
 *     setError(null)
 *     // Handle login
 *   }
 *
 *   return (
 *     <>
 *       {error && <Alert variant="error">{error}</Alert>}
 *       <Form
 *         onSubmit={handleSubmit}
 *         onFormError={handleError}
 *         preventDefaultSubmission
 *       >
 *         <FormField name="email">
 *           <FormLabel>Email</FormLabel>
 *           <FormInput type="email" required />
 *         </FormField>
 *         <FormField name="password">
 *           <FormLabel>Password</FormLabel>
 *           <FormPassword required />
 *         </FormField>
 *         <FormSubmit>Sign In</FormSubmit>
 *       </Form>
 *     </>
 *   )
 * }
 * ```
 *
 * @example Form with success handling and auto-clear
 * ```tsx
 * function FeedbackForm() {
 *   const [showSuccess, setShowSuccess] = useState(false)
 *
 *   const handleSuccess = (formData: FormData) => {
 *     setShowSuccess(true)
 *     setTimeout(() => setShowSuccess(false), 5000)
 *   }
 *
 *   return (
 *     <>
 *       {showSuccess && <Alert variant="success">Thank you for your feedback!</Alert>}
 *       <Form
 *         onSubmit={handleSubmit}
 *         onFormSuccess={handleSuccess}
 *         clearOnSubmit
 *         preventDefaultSubmission
 *       >
 *         <FormField name="feedback">
 *           <FormLabel>Feedback</FormLabel>
 *           <FormTextarea required />
 *         </FormField>
 *         <FormSubmit>Submit Feedback</FormSubmit>
 *       </Form>
 *     </>
 *   )
 * }
 * ```
 *
 * @example Multi-step form
 * ```tsx
 * function MultiStepForm() {
 *   const [step, setStep] = useState(1)
 *
 *   const handleStepSubmit = (event: React.FormEvent) => {
 *     event.preventDefault()
 *     if (step < 3) {
 *       setStep(step + 1)
 *     } else {
 *       // Final submission
 *     }
 *   }
 *
 *   return (
 *     <Form onSubmit={handleStepSubmit} preventDefaultSubmission>
 *       {step === 1 && (
 *         <FormField name="name">
 *           <FormLabel>Name</FormLabel>
 *           <FormInput required />
 *         </FormField>
 *       )}
 *       {step === 2 && (
 *         <FormField name="email">
 *           <FormLabel>Email</FormLabel>
 *           <FormInput type="email" required />
 *         </FormField>
 *       )}
 *       {step === 3 && (
 *         <FormField name="message">
 *           <FormLabel>Message</FormLabel>
 *           <FormTextarea required />
 *         </FormField>
 *       )}
 *       <FormSubmit>{step < 3 ? 'Next' : 'Submit'}</FormSubmit>
 *     </Form>
 *   )
 * }
 * ```
 *
 * @validation-states
 * Available HTML5 constraint validation states for FormMessage match prop:
 * - `valueMissing`: Required field is empty
 * - `typeMismatch`: Input doesn't match type (e.g., invalid email)
 * - `patternMismatch`: Input doesn't match pattern attribute
 * - `tooShort`: Input shorter than minLength
 * - `tooLong`: Input longer than maxLength
 * - `rangeUnderflow`: Number input below min
 * - `rangeOverflow`: Number input above max
 * - `stepMismatch`: Number doesn't match step value
 * - `valid`: Field is valid (for success messages)
 *
 * @accessibility
 * - Keyboard navigation: Tab to navigate between fields, Enter to submit
 * - Escape key: Blur current field (cancel input)
 * - Screen readers: Proper ARIA associations between labels, inputs, and errors
 * - Error announcements: Validation errors announced to screen readers
 * - Required fields: Marked with aria-required
 * - Invalid fields: Marked with aria-invalid
 *
 * @theme-tokens
 * - `--theme-surface-primary`: Form background
 * - `--theme-border`: Form border
 * - `--theme-text-primary`: Label text
 * - `--theme-text-secondary`: Description text
 * - `--theme-error-500`: Error messages
 * - `--theme-success-500`: Success messages
 *
 * @best-practices
 * - Use clear, descriptive labels for all form fields
 * - Provide helpful error messages that explain how to fix issues
 * - Include FormDescription for fields that need clarification
 * - Use appropriate input types (email, tel, url, etc.)
 * - Implement loading states for async submissions
 * - Clear sensitive data after submission
 * - Validate on blur and on submit (not on every keystroke)
 *
 * @see {@link https://storybook.sparkle.mrbro.dev/?path=/docs/components-form--docs | Storybook Documentation}
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
      className={cx(
        // Theme-aware form styling
        'bg-theme-surface-primary',
        'border',
        'border-theme-border',
        'rounded-lg',
        'p-6',
        'space-y-4',
        'theme-transition',
        className,
      )}
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {children}
    </FormPrimitive.Root>
  )
})

Form.displayName = 'Form'
