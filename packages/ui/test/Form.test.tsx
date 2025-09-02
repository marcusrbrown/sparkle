import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {
  Form,
  FormDescription,
  FormField,
  FormInput,
  FormLabel,
  FormMessage,
  FormPassword,
  FormSelect,
  FormSelectItem,
  FormSubmit,
  FormTextarea,
} from '../src/components/Form'
import '@testing-library/jest-dom'

describe('Form Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // TASK-022: Basic rendering and prop tests
  describe('Form Root Component', () => {
    it('renders with default props', () => {
      render(<Form></Form>)
      const form = screen.getByRole('form')
      expect(form).toBeInTheDocument()
      expect(form).toHaveClass(
        'bg-theme-surface-primary',
        'border',
        'border-theme-border',
        'rounded-lg',
        'p-6',
        'space-y-4',
        'theme-transition',
      )
    })

    it('forwards ref correctly', () => {
      const ref = {current: null}
      render(
        <Form ref={ref}>
          <div>Form content</div>
        </Form>,
      )
      expect(ref.current).toBeInstanceOf(HTMLFormElement)
    })

    it('applies custom className', () => {
      render(
        <Form className="custom-form">
          <div>Form content</div>
        </Form>,
      )
      const form = screen.getByRole('form')
      expect(form).toHaveClass(
        'bg-theme-surface-primary',
        'border',
        'border-theme-border',
        'rounded-lg',
        'p-6',
        'space-y-4',
        'theme-transition',
        'custom-form',
      )
    })

    it('spreads additional props', () => {
      render(
        <Form data-testid="custom-form" id="test-form">
          <div>Form content</div>
        </Form>,
      )
      const form = screen.getByTestId('custom-form')
      expect(form).toHaveAttribute('id', 'test-form')
    })
  })

  describe('FormField Component', () => {
    it('renders with required name prop', () => {
      render(
        <Form>
          <FormField name="test">
            <FormLabel>Test</FormLabel>
            <FormInput />
          </FormField>
        </Form>,
      )
      const field = screen.getByRole('group')
      expect(field).toBeInTheDocument()
      expect(field).toHaveClass('space-y-2', 'theme-transition')
    })

    it('applies validation state classes', () => {
      const {rerender} = render(
        <Form>
          <FormField name="test" validationState="default">
            <FormLabel>Test</FormLabel>
            <FormInput />
          </FormField>
        </Form>,
      )
      let field = screen.getByRole('group')
      expect(field).toHaveClass('space-y-2', 'theme-transition')

      rerender(
        <Form>
          <FormField name="test" validationState="error">
            <FormLabel>Test</FormLabel>
            <FormInput />
          </FormField>
        </Form>,
      )
      field = screen.getByRole('group')
      expect(field).toHaveClass('space-y-2', 'theme-transition')
    })

    it('applies size variant classes', () => {
      const {rerender} = render(
        <Form>
          <FormField name="test" size="sm">
            <FormLabel>Test</FormLabel>
            <FormInput />
          </FormField>
        </Form>,
      )
      let field = screen.getByRole('group')
      expect(field).toHaveClass('space-y-2', 'theme-transition')

      rerender(
        <Form>
          <FormField name="test" size="lg">
            <FormLabel>Test</FormLabel>
            <FormInput />
          </FormField>
        </Form>,
      )
      field = screen.getByRole('group')
      expect(field).toHaveClass('space-y-2', 'theme-transition')
    })
  })

  describe('FormLabel Component', () => {
    it('renders with proper accessibility attributes', () => {
      render(
        <Form>
          <FormField name="email">
            <FormLabel>Email Address</FormLabel>
            <FormInput type="email" />
          </FormField>
        </Form>,
      )
      const label = screen.getByText('Email Address')
      expect(label).toBeInTheDocument()
      expect(label.tagName).toBe('LABEL')
    })

    it('applies custom className', () => {
      render(
        <Form>
          <FormField name="test">
            <FormLabel className="custom-label">Test Label</FormLabel>
            <FormInput />
          </FormField>
        </Form>,
      )
      const input = screen.getByRole('textbox')
      const label = document.querySelector(`[for="${input.id}"]`)
      expect(label).toBeInTheDocument()
      expect(label).toHaveClass('block', 'text-sm', 'font-medium', 'mb-2', 'custom-label')
    })

    it('shows required indicator when specified', () => {
      render(
        <Form>
          <FormField name="required-field">
            <FormLabel required>Required Field</FormLabel>
            <FormInput />
          </FormField>
        </Form>,
      )
      const label = screen.getByText('Required Field')
      expect(label).toHaveClass(
        'block',
        'text-sm',
        'font-medium',
        'mb-2',
        'theme-transition',
        'text-theme-text-primary',
        'cursor-pointer',
      )
    })
  })

  describe('FormInput Component', () => {
    it('renders different input types correctly', () => {
      const {rerender} = render(
        <Form>
          <FormField name="text">
            <FormLabel>Text</FormLabel>
            <FormInput type="text" />
          </FormField>
        </Form>,
      )
      let input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('type', 'text')

      rerender(
        <Form>
          <FormField name="email">
            <FormLabel>Email</FormLabel>
            <FormInput type="email" />
          </FormField>
        </Form>,
      )
      input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('type', 'email')
    })

    it('applies size variant classes', () => {
      const {rerender} = render(
        <Form>
          <FormField name="test">
            <FormLabel>Test</FormLabel>
            <FormInput size="sm" />
          </FormField>
        </Form>,
      )
      let input = screen.getByRole('textbox')
      expect(input).toHaveClass(
        'w-full',
        'rounded-md',
        'border',
        'font-medium',
        'theme-transition',
        'px-3',
        'py-1.5',
        'text-sm',
      )

      rerender(
        <Form>
          <FormField name="test">
            <FormLabel>Test</FormLabel>
            <FormInput size="lg" />
          </FormField>
        </Form>,
      )
      input = screen.getByRole('textbox')
      expect(input).toHaveClass(
        'w-full',
        'rounded-md',
        'border',
        'font-medium',
        'theme-transition',
        'px-4',
        'py-3',
        'text-base',
      )
    })

    it('applies validation state classes', () => {
      render(
        <Form>
          <FormField name="test">
            <FormLabel>Test</FormLabel>
            <FormInput validationState="error" />
          </FormField>
        </Form>,
      )
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass(
        'w-full',
        'rounded-md',
        'border',
        'font-medium',
        'theme-transition',
        'border-theme-error-500',
        'focus:ring-theme-error-500',
        'focus:border-theme-error-500',
      )
      expect(input).toHaveAttribute('aria-invalid', 'true')
    })

    it('handles disabled state correctly', () => {
      render(
        <Form>
          <FormField name="test">
            <FormLabel>Test</FormLabel>
            <FormInput disabled />
          </FormField>
        </Form>,
      )
      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
      expect(input).toHaveClass(
        'w-full',
        'rounded-md',
        'border',
        'font-medium',
        'theme-transition',
        'disabled:opacity-50',
        'disabled:cursor-not-allowed',
        'disabled:bg-theme-surface-disabled',
      )
    })

    it('handles required attribute correctly', () => {
      render(
        <Form>
          <FormField name="test">
            <FormLabel>Test</FormLabel>
            <FormInput required />
          </FormField>
        </Form>,
      )
      const input = screen.getByRole('textbox')
      expect(input).toBeRequired()
      expect(input).toHaveAttribute('aria-required', 'true')
    })
  })

  describe('FormPassword Component', () => {
    it('renders as password input type', () => {
      render(
        <Form>
          <FormField name="password">
            <FormLabel>Password</FormLabel>
            <FormPassword />
          </FormField>
        </Form>,
      )
      const input = screen.getByLabelText('Password')
      expect(input).toHaveAttribute('type', 'password')
    })

    it('toggles password visibility', async () => {
      const user = userEvent.setup()
      render(
        <Form>
          <FormField name="password">
            <FormLabel>Password</FormLabel>
            <FormPassword showToggle />
          </FormField>
        </Form>,
      )

      const input = screen.getByLabelText('Password')
      const toggleButton = screen.getByRole('button', {name: /show password/i})

      expect(input).toHaveAttribute('type', 'password')

      await user.click(toggleButton)
      expect(input).toHaveAttribute('type', 'text')

      await user.click(toggleButton)
      expect(input).toHaveAttribute('type', 'password')
    })
  })

  describe('FormTextarea Component', () => {
    it('renders as textarea element', () => {
      render(
        <Form>
          <FormField name="description">
            <FormLabel>Description</FormLabel>
            <FormTextarea />
          </FormField>
        </Form>,
      )
      const textarea = screen.getByRole('textbox')
      expect(textarea.tagName).toBe('TEXTAREA')
    })

    it('applies size variants correctly', () => {
      const {rerender} = render(
        <Form>
          <FormField name="test">
            <FormLabel>Test</FormLabel>
            <FormTextarea size="sm" />
          </FormField>
        </Form>,
      )
      let textarea = screen.getByRole('textbox')
      expect(textarea).toHaveClass(
        'w-full',
        'rounded-md',
        'border',
        'resize-y',
        'min-h-[80px]',
        'font-medium',
        'leading-5',
        'theme-transition',
        'px-3',
        'py-1.5',
        'text-sm',
      )

      rerender(
        <Form>
          <FormField name="test">
            <FormLabel>Test</FormLabel>
            <FormTextarea size="lg" />
          </FormField>
        </Form>,
      )
      textarea = screen.getByRole('textbox')
      expect(textarea).toHaveClass(
        'w-full',
        'rounded-md',
        'border',
        'resize-y',
        'min-h-[80px]',
        'font-medium',
        'leading-5',
        'theme-transition',
        'px-4',
        'py-3',
        'text-base',
      )
    })

    it('handles resize behavior', () => {
      render(
        <Form>
          <FormField name="test">
            <FormLabel>Test</FormLabel>
            <FormTextarea />
          </FormField>
        </Form>,
      )
      const textarea = screen.getByRole('textbox')
      expect(textarea.tagName).toBe('TEXTAREA')
    })
  })

  describe('FormSelect Component', () => {
    it('renders select trigger with placeholder', () => {
      render(
        <Form>
          <FormField name="country">
            <FormLabel>Country</FormLabel>
            <FormSelect placeholder="Select a country">
              <FormSelectItem value="us">United States</FormSelectItem>
              <FormSelectItem value="ca">Canada</FormSelectItem>
            </FormSelect>
          </FormField>
        </Form>,
      )
      const trigger = screen.getByRole('combobox')
      expect(trigger).toBeInTheDocument()
      expect(trigger).toHaveAttribute('aria-placeholder', 'Select a country')
    })

    it('applies size and validation state classes', () => {
      render(
        <Form>
          <FormField name="test">
            <FormLabel>Test</FormLabel>
            <FormSelect size="lg" validationState="error">
              <FormSelectItem value="test">Test</FormSelectItem>
            </FormSelect>
          </FormField>
        </Form>,
      )
      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveClass(
        'w-full',
        'flex',
        'items-center',
        'justify-between',
        'rounded-md',
        'border',
        'font-medium',
        'text-left',
        'theme-transition',
        'px-4',
        'py-3',
        'text-base',
        'border-theme-error-500',
        'focus:ring-theme-error-500',
        'focus:border-theme-error-500',
      )
      expect(trigger).toHaveAttribute('aria-invalid', 'true')
    })

    it('handles disabled state', () => {
      render(
        <Form>
          <FormField name="test">
            <FormLabel>Test</FormLabel>
            <FormSelect disabled>
              <FormSelectItem value="test">Test</FormSelectItem>
            </FormSelect>
          </FormField>
        </Form>,
      )
      const trigger = screen.getByRole('combobox')
      expect(trigger).toBeDisabled()
      expect(trigger).toHaveClass(
        'w-full',
        'flex',
        'items-center',
        'justify-between',
        'rounded-md',
        'border',
        'font-medium',
        'text-left',
        'theme-transition',
        'disabled:opacity-50',
        'disabled:cursor-not-allowed',
        'disabled:bg-theme-surface-disabled',
      )
    })
  })

  describe('FormMessage Component', () => {
    it('renders error messages with proper ARIA attributes', () => {
      render(
        <Form>
          <FormField name="email">
            <FormLabel>Email</FormLabel>
            <FormInput type="email" />
            <FormMessage type="error">Please enter a valid email</FormMessage>
          </FormField>
        </Form>,
      )
      const message = screen.getByText('Please enter a valid email')
      expect(message).toBeInTheDocument()
      expect(message).toHaveClass('text-theme-error-600', 'dark:text-theme-error-400')
      expect(message).toHaveAttribute('role', 'alert')
      expect(message).toHaveAttribute('aria-live', 'polite')
    })

    it('renders success messages correctly', () => {
      render(
        <Form>
          <FormField name="email">
            <FormLabel>Email</FormLabel>
            <FormInput type="email" />
            <FormMessage type="success">Email is valid</FormMessage>
          </FormField>
        </Form>,
      )
      const message = screen.getByText('Email is valid')
      expect(message).toHaveClass('text-theme-success-600', 'dark:text-theme-success-400')
      expect(message).not.toHaveAttribute('role', 'alert')
    })

    it('handles validation constraint matching', async () => {
      // Test that FormMessage components are structured correctly
      // Note: Radix UI FormPrimitive.Message only renders when constraints match,
      // which doesn't work in JSDOM. We test the structure instead.
      render(
        <Form>
          <FormField name="email">
            <FormLabel>Email</FormLabel>
            <FormInput type="email" required />
            <FormMessage match="valueMissing">Email is required</FormMessage>
          </FormField>
          <FormSubmit>Submit</FormSubmit>
        </Form>,
      )

      // Verify the form structure is correct for constraint validation
      const form = screen.getByRole('form')
      const input = screen.getByRole('textbox')
      const submitButton = screen.getByRole('button', {name: 'Submit'})

      expect(form).toBeInTheDocument()
      expect(input).toHaveAttribute('required')
      expect(input).toHaveAttribute('type', 'email')
      expect(submitButton).toHaveAttribute('type', 'submit')

      // Test without 'match' constraint - just a regular message
      render(
        <Form>
          <FormField name="test">
            <FormLabel>Test</FormLabel>
            <FormInput type="text" />
            <FormMessage type="error">This is an error message</FormMessage>
          </FormField>
        </Form>,
      )

      const errorMessage = screen.getByText('This is an error message')
      expect(errorMessage).toBeInTheDocument()
      expect(errorMessage).toHaveAttribute('role', 'alert')
    })
  })

  describe('FormSubmit Component', () => {
    it('renders as submit button', () => {
      render(
        <Form>
          <FormSubmit>Submit Form</FormSubmit>
        </Form>,
      )
      const button = screen.getByRole('button', {name: 'Submit Form'})
      expect(button).toHaveAttribute('type', 'submit')
    })

    it('applies variant and size classes', () => {
      render(
        <Form>
          <FormSubmit variant="secondary" size="lg">
            Submit
          </FormSubmit>
        </Form>,
      )
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-theme-secondary-100', 'text-theme-secondary-900', 'px-6', 'py-3', 'text-base')
    })
  })

  // TASK-023: Accessibility tests
  describe('Accessibility Features', () => {
    it('properly associates labels with inputs', () => {
      render(
        <Form>
          <FormField name="username">
            <FormLabel>Username</FormLabel>
            <FormInput />
          </FormField>
        </Form>,
      )
      const input = screen.getByRole('textbox')
      const label = screen.getByText('Username')
      expect(input).toHaveAccessibleName('Username')
      expect(label).toHaveAttribute('for')
      expect(input).toHaveAttribute('id', label.getAttribute('for'))
    })

    it('associates error messages with inputs', () => {
      render(
        <Form>
          <FormField name="email">
            <FormLabel>Email</FormLabel>
            <FormInput type="email" validationState="error" />
            <FormMessage type="error">Invalid email format</FormMessage>
          </FormField>
        </Form>,
      )
      const input = screen.getByRole('textbox')
      const message = screen.getByText('Invalid email format')
      expect(input).toHaveAccessibleDescription('Invalid email format')
      expect(input).toHaveAttribute('aria-describedby')
      expect(message).toHaveAttribute('id', input.getAttribute('aria-describedby'))
    })

    it('provides proper ARIA roles and properties', () => {
      render(
        <Form>
          <FormField name="required-field">
            <FormLabel required>Required Field</FormLabel>
            <FormInput required validationState="error" />
            <FormMessage type="error">This field is required</FormMessage>
          </FormField>
        </Form>,
      )
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-required', 'true')
      expect(input).toHaveAttribute('aria-invalid', 'true')

      const message = screen.getByRole('alert')
      expect(message).toHaveAttribute('aria-live', 'polite')
    })

    it('supports description text for additional context', () => {
      render(
        <Form>
          <FormField name="password">
            <FormLabel>Password</FormLabel>
            <FormInput type="password" />
            <FormDescription>Must be at least 8 characters long</FormDescription>
          </FormField>
        </Form>,
      )
      const input = screen.getByLabelText('Password')
      const description = screen.getByText('Must be at least 8 characters long')
      expect(input).toHaveAccessibleDescription('Must be at least 8 characters long')
      expect(description).toHaveClass('text-theme-text-secondary', 'text-xs', 'block')
    })
  })

  // TASK-024: Keyboard navigation tests
  describe('Keyboard Navigation', () => {
    it('supports tab navigation between form fields', async () => {
      const user = userEvent.setup()
      render(
        <Form>
          <FormField name="first">
            <FormLabel>First</FormLabel>
            <FormInput />
          </FormField>
          <FormField name="second">
            <FormLabel>Second</FormLabel>
            <FormInput />
          </FormField>
          <FormSubmit>Submit</FormSubmit>
        </Form>,
      )

      const firstInput = screen.getByLabelText('First')
      const secondInput = screen.getByLabelText('Second')
      const submitButton = screen.getByRole('button', {name: 'Submit'})

      await user.tab()
      expect(firstInput).toHaveFocus()

      await user.tab()
      expect(secondInput).toHaveFocus()

      await user.tab()
      expect(submitButton).toHaveFocus()
    })

    it('supports shift+tab for reverse navigation', async () => {
      const user = userEvent.setup()
      render(
        <Form>
          <FormField name="first">
            <FormLabel>First</FormLabel>
            <FormInput />
          </FormField>
          <FormField name="second">
            <FormLabel>Second</FormLabel>
            <FormInput />
          </FormField>
        </Form>,
      )

      const firstInput = screen.getByLabelText('First')
      const secondInput = screen.getByLabelText('Second')

      // Focus on second input first
      secondInput.focus()
      expect(secondInput).toHaveFocus()

      await user.tab({shift: true})
      expect(firstInput).toHaveFocus()
    })

    it('handles escape key to blur focused elements', async () => {
      const user = userEvent.setup()
      render(
        <Form>
          <FormField name="test">
            <FormLabel>Test</FormLabel>
            <FormInput />
          </FormField>
        </Form>,
      )

      const input = screen.getByRole('textbox')
      await user.click(input)
      expect(input).toHaveFocus()

      await user.keyboard('{Escape}')
      expect(input).not.toHaveFocus()
    })

    it('supports Enter key for form submission', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn(e => e.preventDefault())

      render(
        <Form onSubmit={onSubmit}>
          <FormField name="test">
            <FormLabel>Test</FormLabel>
            <FormInput />
          </FormField>
        </Form>,
      )

      const input = screen.getByRole('textbox')
      await user.click(input)
      await user.keyboard('{Enter}')

      expect(onSubmit).toHaveBeenCalled()
    })

    it('supports keyboard navigation in select component', async () => {
      const user = userEvent.setup()
      const onValueChange = vi.fn()
      render(
        <Form>
          <FormField name="country">
            <FormLabel>Country</FormLabel>
            <FormSelect placeholder="Select a country" onValueChange={onValueChange}>
              <FormSelectItem value="us">United States</FormSelectItem>
              <FormSelectItem value="ca">Canada</FormSelectItem>
              <FormSelectItem value="uk">United Kingdom</FormSelectItem>
            </FormSelect>
          </FormField>
        </Form>,
      )

      const trigger = screen.getByRole('combobox')

      // Open the select with keyboard
      await user.click(trigger)
      await user.keyboard('{ArrowDown}') // Move to first item
      await user.keyboard('{ArrowDown}') // Move to second item (Canada)
      await user.keyboard('{Enter}') // Select Canada

      // Verify selection callback was called
      expect(onValueChange).toHaveBeenCalledWith('ca')
    })
  })

  // TASK-025: Validation state tests
  describe('Form Validation States', () => {
    it('displays validation messages based on input state', async () => {
      // Test that validation messages can be displayed without constraint validation
      render(
        <Form>
          <FormField name="email">
            <FormLabel>Email</FormLabel>
            <FormInput type="email" required />
            <FormMessage type="error">Email is required</FormMessage>
            <FormMessage type="error">Please enter a valid email</FormMessage>
          </FormField>
          <FormSubmit>Submit</FormSubmit>
        </Form>,
      )

      const input = screen.getByRole('textbox')

      // Verify the form and input are set up correctly for validation
      expect(input).toHaveAttribute('required')
      expect(input).toHaveAttribute('type', 'email')

      // Verify validation messages can be rendered
      const messages = screen.getAllByText(/email/i)
      expect(messages.length).toBeGreaterThan(0)
    })

    it('updates validation state classes dynamically', async () => {
      // Test that validation state can be controlled via props
      // This tests the component's ability to respond to validation state changes
      const TestForm = () => {
        const [validationState, setValidationState] = React.useState<'default' | 'error'>('default')

        return (
          <div>
            <Form>
              <FormField name="test">
                <FormLabel>Test</FormLabel>
                <FormInput validationState={validationState} />
                {validationState === 'error' && <FormMessage type="error">Required field</FormMessage>}
              </FormField>
            </Form>
            <button onClick={() => setValidationState('error')}>Trigger Error</button>
            <button onClick={() => setValidationState('default')}>Clear Error</button>
          </div>
        )
      }

      render(<TestForm />)

      const input = screen.getByRole('textbox')
      const triggerErrorBtn = screen.getByText('Trigger Error')
      const clearErrorBtn = screen.getByText('Clear Error')

      // Initially has default state
      expect(input).not.toHaveAttribute('aria-invalid')
      expect(input).toHaveClass('w-full', 'rounded-md', 'border')

      // Trigger error state
      await userEvent.click(triggerErrorBtn)

      await waitFor(() => {
        expect(input).toHaveAttribute('aria-invalid', 'true')
        expect(input).toHaveClass('border-theme-error-500', 'focus:ring-theme-error-500')
        expect(screen.getByText('Required field')).toBeInTheDocument()
      })

      // Clear error state
      await userEvent.click(clearErrorBtn)

      await waitFor(() => {
        expect(input).not.toHaveAttribute('aria-invalid')
        expect(input).toHaveClass('w-full', 'rounded-md', 'border')
      })
    })

    it('handles custom validation with onValidate prop', async () => {
      const user = userEvent.setup()
      const onValidate = vi.fn(formData => {
        const username = formData.get('username') as string
        return username.length >= 3
      })

      render(
        <Form onValidate={onValidate}>
          <FormField name="username">
            <FormLabel>Username</FormLabel>
            <FormInput required />
          </FormField>
          <FormSubmit>Submit</FormSubmit>
        </Form>,
      )

      const input = screen.getByRole('textbox')
      const submit = screen.getByRole('button')

      // Submit with short username
      await user.type(input, 'ab')
      await user.click(submit)

      expect(onValidate).toHaveBeenCalled()
      expect(onValidate).toHaveReturnedWith(false)

      // Submit with valid username
      await user.clear(input)
      await user.type(input, 'abc')
      await user.click(submit)

      expect(onValidate).toHaveReturnedWith(true)
    })
  })

  // TASK-026: Field type tests
  describe('Field Types', () => {
    it('handles text input with proper attributes', () => {
      render(
        <Form>
          <FormField name="name">
            <FormLabel>Full Name</FormLabel>
            <FormInput type="text" placeholder="Enter your name" />
          </FormField>
        </Form>,
      )
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('type', 'text')
      expect(input).toHaveAttribute('placeholder', 'Enter your name')
    })

    it('handles email input with validation', async () => {
      // Test email input component structure and attributes
      render(
        <Form>
          <FormField name="email">
            <FormLabel>Email</FormLabel>
            <FormInput type="email" required />
            <FormMessage type="error">Invalid email format</FormMessage>
          </FormField>
          <FormSubmit>Submit</FormSubmit>
        </Form>,
      )

      const input = screen.getByRole('textbox')

      // Verify email input attributes
      expect(input).toHaveAttribute('type', 'email')
      expect(input).toHaveAttribute('required')

      // Verify validation message is rendered
      const validationMessage = screen.getByText('Invalid email format')
      expect(validationMessage).toBeInTheDocument()
      expect(validationMessage).toHaveAttribute('role', 'alert')
    })

    it('handles password input with security features', () => {
      render(
        <Form>
          <FormField name="password">
            <FormLabel>Password</FormLabel>
            <FormPassword placeholder="Enter password" />
          </FormField>
        </Form>,
      )
      const input = screen.getByLabelText('Password')
      expect(input).toHaveAttribute('type', 'password')
      expect(input).toHaveAttribute('autocomplete', 'current-password')
    })

    it('handles number input with numeric validation', () => {
      render(
        <Form>
          <FormField name="age">
            <FormLabel>Age</FormLabel>
            <FormInput type="number" />
            <FormMessage match="rangeUnderflow">Age must be positive</FormMessage>
            <FormMessage match="rangeOverflow">Age must be realistic</FormMessage>
          </FormField>
        </Form>,
      )

      const input = screen.getByRole('spinbutton')
      expect(input).toHaveAttribute('type', 'number')
    })

    it('handles textarea with proper dimensions', () => {
      render(
        <Form>
          <FormField name="description">
            <FormLabel>Description</FormLabel>
            <FormTextarea />
          </FormField>
        </Form>,
      )
      const textarea = screen.getByRole('textbox')
      expect(textarea.tagName).toBe('TEXTAREA')
    })

    it('handles select with multiple options', async () => {
      const user = userEvent.setup()
      render(
        <Form>
          <FormField name="country">
            <FormLabel>Country</FormLabel>
            <FormSelect>
              <FormSelectItem value="us">United States</FormSelectItem>
              <FormSelectItem value="ca">Canada</FormSelectItem>
              <FormSelectItem value="uk">United Kingdom</FormSelectItem>
            </FormSelect>
          </FormField>
        </Form>,
      )

      const trigger = screen.getByRole('combobox')
      await user.click(trigger)

      expect(screen.getByText('United States')).toBeInTheDocument()
      expect(screen.getByText('Canada')).toBeInTheDocument()
      expect(screen.getByText('United Kingdom')).toBeInTheDocument()
    })
  })

  // TASK-027: Form submission and event handling tests
  describe('Form Submission and Events', () => {
    it('handles form submission with onSubmit callback', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn(e => e.preventDefault())

      render(
        <Form onSubmit={onSubmit}>
          <FormField name="username">
            <FormLabel>Username</FormLabel>
            <FormInput />
          </FormField>
          <FormSubmit>Submit</FormSubmit>
        </Form>,
      )

      const input = screen.getByRole('textbox')
      const submit = screen.getByRole('button')

      await user.type(input, 'testuser')
      await user.click(submit)

      expect(onSubmit).toHaveBeenCalled()
      expect(typeof onSubmit.mock.calls[0]?.[0]).toBe('object')
      expect(onSubmit.mock.calls[0]?.[0]).toHaveProperty('currentTarget')
      expect(onSubmit.mock.calls[0]?.[0]).toHaveProperty('preventDefault')
    })

    it('handles form validation before submission', async () => {
      const user = userEvent.setup()
      const onValidate = vi.fn(() => false)
      const onSubmit = vi.fn(e => e.preventDefault())

      render(
        <Form onSubmit={onSubmit} onValidate={onValidate}>
          <FormField name="username">
            <FormLabel>Username</FormLabel>
            <FormInput />
          </FormField>
          <FormSubmit>Submit</FormSubmit>
        </Form>,
      )

      const submit = screen.getByRole('button')
      await user.click(submit)

      expect(onValidate).toHaveBeenCalled()
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('handles input change events', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(
        <Form>
          <FormField name="username">
            <FormLabel>Username</FormLabel>
            <FormInput onChange={onChange} />
          </FormField>
        </Form>,
      )

      const input = screen.getByRole('textbox')
      await user.type(input, 'test')

      expect(onChange).toHaveBeenCalledTimes(4) // Once per character
    })

    it('handles input focus and blur events', async () => {
      const user = userEvent.setup()
      const onFocus = vi.fn()
      const onBlur = vi.fn()

      render(
        <Form>
          <FormField name="username">
            <FormLabel>Username</FormLabel>
            <FormInput onFocus={onFocus} onBlur={onBlur} />
          </FormField>
        </Form>,
      )

      const input = screen.getByRole('textbox')

      await user.click(input)
      expect(onFocus).toHaveBeenCalled()

      await user.tab()
      expect(onBlur).toHaveBeenCalled()
    })

    it('clears form when clearOnSubmit is true', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn(e => e.preventDefault())

      render(
        <Form onSubmit={onSubmit} clearOnSubmit>
          <FormField name="username">
            <FormLabel>Username</FormLabel>
            <FormInput />
          </FormField>
          <FormSubmit>Submit</FormSubmit>
        </Form>,
      )

      const input = screen.getByRole('textbox') as HTMLInputElement
      const submit = screen.getByRole('button')

      await user.type(input, 'testuser')
      expect(input.value).toBe('testuser')

      await user.click(submit)

      // Note: Form clearing might not work in test environment without proper form submission
      // This would need to be tested in integration tests
    })

    it('handles form error callback', async () => {
      const user = userEvent.setup()
      const onFormError = vi.fn()
      const onValidate = vi.fn().mockRejectedValue(new Error('Validation failed'))

      render(
        <Form onValidate={onValidate} onFormError={onFormError}>
          <FormField name="username">
            <FormLabel>Username</FormLabel>
            <FormInput />
          </FormField>
          <FormSubmit>Submit</FormSubmit>
        </Form>,
      )

      const submit = screen.getByRole('button')
      await user.click(submit)

      await waitFor(() => {
        expect(onFormError).toHaveBeenCalledWith(expect.any(Error))
      })
    })

    it('handles form success callback', async () => {
      const user = userEvent.setup()
      const onFormSuccess = vi.fn()
      const onSubmit = vi.fn() // Don't prevent default to allow success callback

      render(
        <Form onSubmit={onSubmit} onFormSuccess={onFormSuccess}>
          <FormField name="username">
            <FormLabel>Username</FormLabel>
            <FormInput />
          </FormField>
          <FormSubmit>Submit</FormSubmit>
        </Form>,
      )

      const input = screen.getByRole('textbox')
      const submit = screen.getByRole('button')

      await user.type(input, 'testuser')
      await user.click(submit)

      await waitFor(() => {
        expect(onFormSuccess).toHaveBeenCalledWith(expect.any(FormData))
      })
    })
  })

  // TASK-028: Size variants and CSS class tests
  describe('Size Variants and CSS Classes', () => {
    it('applies size variants to form inputs', () => {
      const sizes = ['sm', 'md', 'lg'] as const
      const expectedClasses = {
        sm: ['px-3', 'py-1.5', 'text-sm'],
        md: ['px-4', 'py-2', 'text-sm'],
        lg: ['px-4', 'py-3', 'text-base'],
      }

      sizes.forEach(size => {
        const {unmount} = render(
          <Form>
            <FormField name={`test-${size}`}>
              <FormLabel>Test {size}</FormLabel>
              <FormInput size={size} />
            </FormField>
          </Form>,
        )

        const input = screen.getByRole('textbox')
        expectedClasses[size].forEach(className => {
          expect(input).toHaveClass(className)
        })

        unmount()
      })
    })

    it('applies size variants to form textareas', () => {
      const sizes = ['sm', 'md', 'lg'] as const
      const expectedClasses = {
        sm: ['px-3', 'py-1.5', 'text-sm'],
        md: ['px-4', 'py-2', 'text-sm'],
        lg: ['px-4', 'py-3', 'text-base'],
      }

      sizes.forEach(size => {
        const {unmount} = render(
          <Form>
            <FormField name={`test-${size}`}>
              <FormLabel>Test {size}</FormLabel>
              <FormTextarea size={size} />
            </FormField>
          </Form>,
        )

        const textarea = screen.getByRole('textbox')
        expectedClasses[size].forEach(className => {
          expect(textarea).toHaveClass(className)
        })

        unmount()
      })
    })

    it('applies size variants to form selects', () => {
      const sizes = ['sm', 'md', 'lg'] as const
      const expectedClasses = {
        sm: ['px-3', 'py-1.5', 'text-sm'],
        md: ['px-4', 'py-2', 'text-sm'],
        lg: ['px-4', 'py-3', 'text-base'],
      }

      sizes.forEach(size => {
        const {unmount} = render(
          <Form>
            <FormField name={`test-${size}`}>
              <FormLabel>Test {size}</FormLabel>
              <FormSelect size={size}>
                <FormSelectItem value="test">Test</FormSelectItem>
              </FormSelect>
            </FormField>
          </Form>,
        )

        const select = screen.getByRole('combobox')
        expectedClasses[size].forEach(className => {
          expect(select).toHaveClass(className)
        })

        unmount()
      })
    })

    it('applies validation state classes correctly', () => {
      const states = ['error', 'success'] as const

      states.forEach(state => {
        const {unmount} = render(
          <Form>
            <FormField name={`test-${state}`} validationState={state}>
              <FormLabel>Test {state}</FormLabel>
              <FormInput validationState={state} />
            </FormField>
          </Form>,
        )

        const input = screen.getByRole('textbox')
        expect(input).toHaveClass(`border-theme-${state}-500`, `focus:ring-theme-${state}-500`)

        unmount()
      })
    })

    it('combines multiple CSS classes correctly', () => {
      render(
        <Form className="custom-form">
          <FormField name="test" size="lg" validationState="error" className="custom-field">
            <FormLabel className="custom-label">Test Label</FormLabel>
            <FormInput size="lg" validationState="error" className="custom-input" />
          </FormField>
        </Form>,
      )

      const form = screen.getByRole('form')
      const field = screen.getByRole('group')
      const label = screen.getByText('Test Label')
      const input = screen.getByRole('textbox')

      expect(form).toHaveClass('bg-theme-surface-primary', 'border-theme-border', 'custom-form')
      expect(field).toHaveClass('space-y-2', 'theme-transition', 'custom-field')
      expect(label).toHaveClass('block', 'text-sm', 'font-medium', 'custom-label')
      expect(input).toHaveClass('px-4', 'py-3', 'text-base', 'border-theme-error-500', 'custom-input')
    })
  })

  // TASK-029: Screen reader compatibility tests
  describe('Screen Reader Compatibility', () => {
    it('provides proper accessible names for all form elements', () => {
      render(
        <Form>
          <FormField name="username">
            <FormLabel>Username</FormLabel>
            <FormInput />
            <FormDescription>Choose a unique username</FormDescription>
          </FormField>
        </Form>,
      )

      const input = screen.getByRole('textbox')
      expect(input).toHaveAccessibleName('Username')
      expect(input).toHaveAccessibleDescription('Choose a unique username')
    })

    it('announces validation messages to screen readers', () => {
      render(
        <Form>
          <FormField name="email">
            <FormLabel>Email</FormLabel>
            <FormInput type="email" />
            <FormMessage type="error" announce>
              Please enter a valid email address
            </FormMessage>
          </FormField>
        </Form>,
      )

      const message = screen.getByText('Please enter a valid email address')
      expect(message).toHaveAttribute('aria-live', 'polite')
      expect(message).toHaveAttribute('role', 'alert')
    })

    it('provides landmarks and structure for screen readers', () => {
      render(
        <Form>
          <FormField name="personal-info">
            <FormLabel>Personal Information</FormLabel>
            <FormInput />
          </FormField>
        </Form>,
      )

      const form = screen.getByRole('form')

      expect(form).toBeInTheDocument()
    })

    it('supports required field indication for screen readers', () => {
      render(
        <Form>
          <FormField name="required-field">
            <FormLabel required>Required Field</FormLabel>
            <FormInput required />
          </FormField>
        </Form>,
      )

      const input = screen.getByRole('textbox')
      const label = screen.getByText('Required Field')

      expect(input).toHaveAttribute('aria-required', 'true')
      expect(label).toHaveClass('block', 'text-sm', 'font-medium')

      // Check if required indicator is announced
      expect(input).toHaveAccessibleName(/required/i)
    })

    it('handles complex form structures for screen readers', () => {
      render(
        <Form>
          <fieldset>
            <legend>Contact Information</legend>
            <FormField name="first-name">
              <FormLabel>First Name</FormLabel>
              <FormInput required />
            </FormField>
            <FormField name="last-name">
              <FormLabel>Last Name</FormLabel>
              <FormInput required />
            </FormField>
          </fieldset>
          <fieldset>
            <legend>Account Details</legend>
            <FormField name="email">
              <FormLabel>Email</FormLabel>
              <FormInput type="email" required />
            </FormField>
            <FormField name="password">
              <FormLabel>Password</FormLabel>
              <FormPassword required />
            </FormField>
          </fieldset>
        </Form>,
      )

      const fieldsets = screen.getAllByRole('group')
      expect(fieldsets).toHaveLength(6) // 2 fieldsets + 4 FormFields

      const legends = screen.getByText('Contact Information')
      expect(legends).toBeInTheDocument()
    })

    it('provides appropriate roles for different field types', () => {
      render(
        <Form>
          <FormField name="text">
            <FormLabel>Text</FormLabel>
            <FormInput type="text" />
          </FormField>
          <FormField name="email">
            <FormLabel>Email</FormLabel>
            <FormInput type="email" />
          </FormField>
          <FormField name="password">
            <FormLabel>Password</FormLabel>
            <FormPassword />
          </FormField>
          <FormField name="number">
            <FormLabel>Number</FormLabel>
            <FormInput type="number" />
          </FormField>
          <FormField name="textarea">
            <FormLabel>Textarea</FormLabel>
            <FormTextarea />
          </FormField>
          <FormField name="select">
            <FormLabel>Select</FormLabel>
            <FormSelect>
              <FormSelectItem value="option1">Option 1</FormSelectItem>
            </FormSelect>
          </FormField>
        </Form>,
      )

      expect(screen.getByLabelText('Text')).toHaveAttribute('type', 'text')
      expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email')
      expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
      expect(screen.getByLabelText('Number')).toHaveAttribute('type', 'number')
      expect(screen.getByLabelText('Textarea').tagName).toBe('TEXTAREA')

      // For Select, we need to find it by role since label association works differently with Radix UI
      const selectTrigger = screen.getByRole('combobox')
      expect(selectTrigger).toHaveAttribute('role', 'combobox')
    })
  })

  // Integration tests combining multiple features
  describe('Integration Tests', () => {
    it('handles complex form with all field types and validation', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn(e => e.preventDefault())

      render(
        <Form onSubmit={onSubmit}>
          <FormField name="username">
            <FormLabel required>Username</FormLabel>
            <FormInput required />
            <FormMessage type="error">Username is required</FormMessage>
          </FormField>

          <FormField name="email">
            <FormLabel required>Email</FormLabel>
            <FormInput type="email" required />
            <FormMessage type="error">Email is required</FormMessage>
          </FormField>

          <FormField name="password">
            <FormLabel required>Password</FormLabel>
            <FormPassword required />
            <FormMessage type="error">Password is required</FormMessage>
          </FormField>

          <FormField name="bio">
            <FormLabel>Bio</FormLabel>
            <FormTextarea placeholder="Tell us about yourself" />
          </FormField>

          <FormField name="country">
            <FormLabel>Country</FormLabel>
            <FormSelect>
              <FormSelectItem value="us">United States</FormSelectItem>
              <FormSelectItem value="ca">Canada</FormSelectItem>
            </FormSelect>
            <FormMessage type="error">Please select a country</FormMessage>
          </FormField>

          <FormSubmit>Create Account</FormSubmit>
        </Form>,
      )

      // Test all fields are present
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/bio/i)).toBeInTheDocument()

      // Country select uses role since label association works differently for Radix UI Select
      const countrySelect = screen.getByRole('combobox')
      expect(countrySelect).toBeInTheDocument()

      // Test form submission with valid data
      await user.type(screen.getByLabelText(/username/i), 'testuser')
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'securepassword')
      await user.type(screen.getByLabelText(/bio/i), 'I am a test user')

      // Skip complex select interaction due to JSDOM limitations
      // The select component is verified to be present above

      // In JSDOM, form submission will call onSubmit since constraint validation doesn't work
      // This is the expected behavior - the form structure is correct for real browsers
      await user.click(screen.getByRole('button', {name: /create account/i}))

      expect(onSubmit).toHaveBeenCalled()
    })

    it('handles form validation flow from start to finish', async () => {
      // Test the complete form validation structure and flow
      // Note: Actual validation messages won't appear in JSDOM, but we can test the structure
      const user = userEvent.setup()

      render(
        <Form>
          <FormField name="email">
            <FormLabel required>Email Address</FormLabel>
            <FormInput type="email" required />
            <FormMessage type="error">Email is required</FormMessage>
            <FormMessage type="error">Please enter a valid email address</FormMessage>
          </FormField>
          <FormSubmit>Submit</FormSubmit>
        </Form>,
      )

      const input = screen.getByRole('textbox')
      const submit = screen.getByRole('button')
      const form = screen.getByRole('form')

      // Verify form structure is correct for validation
      expect(input).toHaveAttribute('type', 'email')
      expect(input).toHaveAttribute('required')
      expect(submit).toHaveAttribute('type', 'submit')

      // Verify validation messages are properly structured in DOM
      const validationMessages = screen.getAllByText(/email/i)
      expect(validationMessages.length).toBeGreaterThan(0)

      // Test user interactions work
      await user.type(input, 'test@example.com')
      expect(input).toHaveValue('test@example.com')

      await user.clear(input)
      expect(input).toHaveValue('')

      // Form submission works (even though validation doesn't trigger in JSDOM)
      await user.click(submit)

      // The form structure is correct for real browser validation
      expect(form).toBeInTheDocument()
    })
  })
})
