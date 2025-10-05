---
title: Form
description: "Form component with accessible validation and submission handling"
---

# Form

Form component with accessible validation and submission handling

## Import

```tsx
import { Form } from '@sparkle/ui'
```

## Props

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `onSubmit` | `((event: React.FormEvent<HTMLFormElement>) => void) \| undefined` |  | `` | Form submission handler called after validation passes |
| `clearOnSubmit` | `boolean \| undefined` |  | `` | Whether to clear form fields after successful submission |
| `preventDefaultSubmission` | `boolean \| undefined` |  | `` | Whether to prevent default browser form submission |
| `onValidate` | `((formData: FormData) => boolean \| Promise<boolean>) \| undefined` |  | `` | Custom validation handler called before submission |
| `onFormError` | `((error: Error) => void) \| undefined` |  | `` | Error handler for form submission errors |
| `onFormSuccess` | `((formData: FormData) => void) \| undefined` |  | `` | Success handler called after successful form submission |

## Examples

### Basic form with validation

```tsx
import { Form, FormField, FormInput, FormLabel, FormMessage, FormSubmit } from '@sparkle/ui'

function ContactForm() {
  const handleSubmit = (event: React.FormEvent) => {
    const formData = new FormData(event.currentTarget)
    console.log('Form submitted:', Object.fromEntries(formData))
  }

  return (
    <Form onSubmit={handleSubmit} preventDefaultSubmission>
      <FormField name="email">
        <FormLabel>Email</FormLabel>
        <FormInput type="email" placeholder="your@email.com" required />
        <FormMessage match="valueMissing">Please enter your email</FormMessage>
        <FormMessage match="typeMismatch">Please enter a valid email</FormMessage>
      </FormField>
      <FormSubmit>Send Message</FormSubmit>
    </Form>
  )
}
```

### Form with custom async validation

```tsx
function RegistrationForm() {
  const handleValidate = async (formData: FormData) => {
    const username = formData.get('username') as string
    // Check if username is available via API
    const isAvailable = await checkUsernameAvailability(username)
    if (!isAvailable) {
      // Show error message to user
      return false
    }
    return true
  }

  return (
    <Form
      onValidate={handleValidate}
      onSubmit={handleSubmit}
      preventDefaultSubmission
    >
      <FormField name="username">
        <FormLabel>Username</FormLabel>
        <FormInput required minLength={3} />
      </FormField>
      <FormSubmit>Register</FormSubmit>
    </Form>
  )
}
```

### Form with error handling

```tsx
function LoginForm() {
  const [error, setError] = useState<string | null>(null)

  const handleError = (error: Error) => {
    setError(error.message)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    setError(null)
    // Handle login
  }

  return (
    <>
      {error && <Alert variant="error">{error}</Alert>}
      <Form
        onSubmit={handleSubmit}
        onFormError={handleError}
        preventDefaultSubmission
      >
        <FormField name="email">
          <FormLabel>Email</FormLabel>
          <FormInput type="email" required />
        </FormField>
        <FormField name="password">
          <FormLabel>Password</FormLabel>
          <FormPassword required />
        </FormField>
        <FormSubmit>Sign In</FormSubmit>
      </Form>
    </>
  )
}
```

### Form with success handling and auto-clear

```tsx
function FeedbackForm() {
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSuccess = (formData: FormData) => {
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 5000)
  }

  return (
    <>
      {showSuccess && <Alert variant="success">Thank you for your feedback!</Alert>}
      <Form
        onSubmit={handleSubmit}
        onFormSuccess={handleSuccess}
        clearOnSubmit
        preventDefaultSubmission
      >
        <FormField name="feedback">
          <FormLabel>Feedback</FormLabel>
          <FormTextarea required />
        </FormField>
        <FormSubmit>Submit Feedback</FormSubmit>
      </Form>
    </>
  )
}
```

### Multi-step form

```tsx
function MultiStepForm() {
  const [step, setStep] = useState(1)

  const handleStepSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (step < 3) {
      setStep(step + 1)
    } else {
      // Final submission
    }
  }

  return (
    <Form onSubmit={handleStepSubmit} preventDefaultSubmission>
      {step === 1 && (
        <FormField name="name">
          <FormLabel>Name</FormLabel>
          <FormInput required />
        </FormField>
      )}
      {step === 2 && (
        <FormField name="email">
          <FormLabel>Email</FormLabel>
          <FormInput type="email" required />
        </FormField>
      )}
      {step === 3 && (
        <FormField name="message">
          <FormLabel>Message</FormLabel>
          <FormTextarea required />
        </FormField>
      )}
      <FormSubmit>{step < 3 ? 'Next' : 'Submit'}</FormSubmit>
    </Form>
  )
}
```

## Features

**Accessibility**: Full WCAG 2.1 AA compliance with ARIA attributes and screen reader support

- **Client-Side Validation**: Built-in HTML5 constraint validation (required, email, pattern, etc.)
- **Custom Validation**: Support for async validation logic before submission
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Submission Control**: Fine-grained control over form submission behavior
- **Theme Integration**: Fully integrated with @sparkle/theme system
- **Keyboard Navigation**: Complete keyboard support for all form interactions

## Validation States

Available HTML5 constraint validation states for FormMessage match prop:

- `valueMissing`: Required field is empty
- `typeMismatch`: Input doesn't match type (e.g., invalid email)
- `patternMismatch`: Input doesn't match pattern attribute
- `tooShort`: Input shorter than minLength
- `tooLong`: Input longer than maxLength
- `rangeUnderflow`: Number input below min
- `rangeOverflow`: Number input above max
- `stepMismatch`: Number doesn't match step value
- `valid`: Field is valid (for success messages)

## Best Practices

- Use clear, descriptive labels for all form fields
- Provide helpful error messages that explain how to fix issues
- Include FormDescription for fields that need clarification
- Use appropriate input types (email, tel, url, etc.)
- Implement loading states for async submissions
- Clear sensitive data after submission
- Validate on blur and on submit (not on every keystroke)

## Theme Integration

This component uses CSS custom properties from `@sparkle/theme` for consistent styling across light and dark modes.

### Design Tokens Used

- `--theme-surface-primary`: Form background
- `--theme-border`: Form border
- `--theme-text-primary`: Label text
- `--theme-text-secondary`: Description text
- `--theme-error-500`: Error messages
- `--theme-success-500`: Success messages

You can customize the appearance by:

1. **Theme Variables**: Modify theme tokens in your `@sparkle/theme` configuration
2. **CSS Classes**: Apply custom CSS classes via the `className` prop
3. **CSS-in-JS**: Use styled-components or emotion with the component

## Accessibility

Keyboard navigation: Tab to navigate between fields, Enter to submit

- Escape key: Blur current field (cancel input)
- Screen readers: Proper ARIA associations between labels, inputs, and errors
- Error announcements: Validation errors announced to screen readers
- Required fields: Marked with aria-required
- Invalid fields: Marked with aria-invalid

## Related Components

- [FormControl](./form-control)
- [FormDescription](./form-description)
- [FormField](./form-field)
- [FormInput](./form-input)
- [FormLabel](./form-label)
- [FormMessage](./form-message)
- [FormPassword](./form-password)
- [FormSelect](./form-select)
- [FormSelectItem](./form-select-item)
- [FormSubmit](./form-submit)
- [FormTextarea](./form-textarea)

## Additional Resources

- [View source code](https://github.com/marcusrbrown/sparkle/blob/main/packages/ui/src/components/Form/Form.tsx)
- [API Documentation](/api/ui/src#form)
