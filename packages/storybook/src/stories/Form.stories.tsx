import type {Meta, StoryObj} from '@storybook/react-vite'

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
} from '@sparkle/ui'
import React, {useState} from 'react'

/**
 * Form component built with Radix UI primitives providing accessible form fields with validation.
 *
 * ## Features
 * - **Accessibility**: Full WCAG 2.1 AA compliance with ARIA attributes
 * - **Validation**: Built-in validation states (error, success, default)
 * - **Field Types**: Support for text, email, password, textarea, and select fields
 * - **Size Variants**: Small (sm), medium (md), and large (lg) sizes
 * - **Keyboard Navigation**: Full keyboard support for all interactions
 * - **Screen Reader Support**: Proper announcements and associations
 *
 * ## Basic Usage
 * ```tsx
 * <Form>
 *   <FormField name="email">
 *     <FormLabel>Email</FormLabel>
 *     <FormInput type="email" placeholder="Enter your email" />
 *     <FormMessage match="valueMissing">Email is required</FormMessage>
 *   </FormField>
 *   <FormSubmit>Submit</FormSubmit>
 * </Form>
 * ```
 */
const meta = {
  title: 'Components/Form',
  component: Form,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Accessible form component with comprehensive validation and field type support.',
      },
    },
  },
  argTypes: {
    children: {
      control: false,
      description: 'Form content including fields and submit button',
    },
    onSubmit: {
      action: 'form submitted',
      description: 'Form submission handler',
    },
    clearOnSubmit: {
      control: 'boolean',
      description: 'Whether to clear form after successful submission',
      defaultValue: false,
    },
    preventDefaultSubmission: {
      control: 'boolean',
      description: 'Whether to prevent default form submission behavior',
      defaultValue: false,
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Form>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Default form with basic fields demonstrating standard usage patterns.
 * This is the most common form configuration with text and email inputs.
 */
export const Default: Story = {
  args: {
    clearOnSubmit: false,
    preventDefaultSubmission: true,
  },
  argTypes: {
    onSubmit: {action: 'form submitted'},
  },
  render: args => (
    <Form {...args} className="w-80 space-y-4">
      <FormField name="name">
        <FormLabel>Full Name</FormLabel>
        <FormInput placeholder="Enter your full name" />
        <FormDescription>Your first and last name</FormDescription>
      </FormField>

      <FormField name="email">
        <FormLabel>Email Address</FormLabel>
        <FormInput type="email" placeholder="Enter your email" />
        <FormMessage match="valueMissing">Email is required</FormMessage>
        <FormMessage match="typeMismatch">Please enter a valid email</FormMessage>
      </FormField>

      <FormSubmit className="w-full">Submit</FormSubmit>
    </Form>
  ),
}

/**
 * Interactive playground story with comprehensive controls for testing all form features.
 * Use the controls panel to experiment with different configurations.
 */
export const Playground: Story = {
  args: {
    clearOnSubmit: false,
    preventDefaultSubmission: true,
  },
  argTypes: {
    onSubmit: {action: 'form submitted'},
    clearOnSubmit: {
      control: 'boolean',
      description: 'Clear form after successful submission',
    },
    preventDefaultSubmission: {
      control: 'boolean',
      description: 'Prevent default form submission',
    },
  },
  render: args => {
    const [fieldSize, setFieldSize] = useState<'sm' | 'md' | 'lg'>('md')
    const [validationState, setValidationState] = useState<'default' | 'error' | 'success'>('default')
    const [isDisabled, setIsDisabled] = useState(false)
    const [showPasswordToggle, setShowPasswordToggle] = useState(true)

    return (
      <div className="w-96">
        {/* Controls Panel */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3">
          <h3 className="font-semibold text-gray-900 mb-2">Interactive Controls</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Field Size</label>
              <select
                value={fieldSize}
                onChange={e => setFieldSize(e.target.value as 'sm' | 'md' | 'lg')}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              >
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Validation State</label>
              <select
                value={validationState}
                onChange={e => setValidationState(e.target.value as 'default' | 'error' | 'success')}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              >
                <option value="default">Default</option>
                <option value="error">Error</option>
                <option value="success">Success</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isDisabled}
                onChange={e => setIsDisabled(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Disabled State</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showPasswordToggle}
                onChange={e => setShowPasswordToggle(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Password Toggle</span>
            </label>
          </div>
        </div>

        {/* Interactive Form */}
        <Form {...args} className="space-y-4">
          <FormField name="username" size={fieldSize} validationState={validationState}>
            <FormLabel required>Username</FormLabel>
            <FormInput
              size={fieldSize}
              validationState={validationState}
              disabled={isDisabled}
              placeholder="Enter username"
            />
            {validationState === 'error' && <FormMessage type="error">Username is required</FormMessage>}
            {validationState === 'success' && <FormMessage type="success">Username is available</FormMessage>}
          </FormField>

          <FormField name="email" size={fieldSize} validationState={validationState}>
            <FormLabel required>Email</FormLabel>
            <FormInput
              type="email"
              size={fieldSize}
              validationState={validationState}
              disabled={isDisabled}
              placeholder="Enter email"
            />
            <FormDescription>We'll never share your email</FormDescription>
          </FormField>

          <FormField name="password" size={fieldSize} validationState={validationState}>
            <FormLabel required>Password</FormLabel>
            <FormPassword
              size={fieldSize}
              validationState={validationState}
              disabled={isDisabled}
              showToggle={showPasswordToggle}
              placeholder="Enter password"
            />
          </FormField>

          <FormField name="country" size={fieldSize}>
            <FormLabel>Country</FormLabel>
            <FormSelect size={fieldSize} disabled={isDisabled} placeholder="Select country">
              <FormSelectItem value="us">United States</FormSelectItem>
              <FormSelectItem value="ca">Canada</FormSelectItem>
              <FormSelectItem value="uk">United Kingdom</FormSelectItem>
            </FormSelect>
          </FormField>

          <FormField name="bio" size={fieldSize}>
            <FormLabel>Bio</FormLabel>
            <FormTextarea size={fieldSize} disabled={isDisabled} placeholder="Tell us about yourself" />
          </FormField>

          <FormSubmit className="w-full" size={fieldSize} disabled={isDisabled}>
            Create Account
          </FormSubmit>
        </Form>
      </div>
    )
  },
}

/**
 * Demonstrates all validation states including error, success, and default.
 * Shows how validation messages appear and how states affect visual styling.
 */
export const ValidationStates: Story = {
  render: () => {
    const [emailState, setEmailState] = useState<'default' | 'error' | 'success'>('default')

    return (
      <div className="space-y-8 w-80">
        <Form>
          <h3 className="text-lg font-semibold mb-4">Default State</h3>
          <FormField name="default-field" validationState="default">
            <FormLabel>Default Field</FormLabel>
            <FormInput placeholder="This is a default field" />
            <FormDescription>No validation state applied</FormDescription>
          </FormField>
        </Form>

        <Form>
          <h3 className="text-lg font-semibold mb-4">Error State</h3>
          <FormField name="error-field" validationState="error">
            <FormLabel>Email with Error</FormLabel>
            <FormInput type="email" placeholder="invalid-email" validationState="error" />
            <FormMessage type="error">Please enter a valid email address</FormMessage>
          </FormField>
        </Form>

        <Form>
          <h3 className="text-lg font-semibold mb-4">Success State</h3>
          <FormField name="success-field" validationState="success">
            <FormLabel>Validated Field</FormLabel>
            <FormInput placeholder="user@example.com" validationState="success" />
            <FormMessage type="success">Email format is valid</FormMessage>
          </FormField>
        </Form>

        <Form>
          <h3 className="text-lg font-semibold mb-4">Interactive State</h3>
          <FormField name="interactive-email" validationState={emailState}>
            <FormLabel>Interactive Email</FormLabel>
            <FormInput
              type="email"
              placeholder="Change validation state"
              validationState={emailState}
              onChange={e => {
                const value = e.target.value
                if (!value) {
                  setEmailState('default')
                } else if (value.includes('@') && value.includes('.')) {
                  setEmailState('success')
                } else {
                  setEmailState('error')
                }
              }}
            />
            <FormMessage type="error" style={{display: emailState === 'error' ? 'block' : 'none'}}>
              Please enter a valid email
            </FormMessage>
            <FormMessage type="success" style={{display: emailState === 'success' ? 'block' : 'none'}}>
              Email format is correct
            </FormMessage>
          </FormField>
        </Form>
      </div>
    )
  },
}

/**
 * Showcases all supported field types including their specific attributes and behaviors.
 * Each field type has appropriate validation and input constraints.
 */
export const FieldTypes: Story = {
  render: () => (
    <Form className="w-80 space-y-4">
      <FormField name="text">
        <FormLabel>Text Input</FormLabel>
        <FormInput type="text" placeholder="Enter some text" />
        <FormDescription>Standard text input field</FormDescription>
      </FormField>

      <FormField name="email">
        <FormLabel>Email Input</FormLabel>
        <FormInput type="email" placeholder="user@example.com" />
        <FormMessage match="typeMismatch">Please enter a valid email</FormMessage>
      </FormField>

      <FormField name="password">
        <FormLabel>Password Input</FormLabel>
        <FormPassword placeholder="Enter your password" showToggle />
        <FormDescription>Password with visibility toggle</FormDescription>
      </FormField>

      <FormField name="number">
        <FormLabel>Number Input</FormLabel>
        <FormInput type="number" placeholder="Enter a number" />
        <FormMessage match="rangeUnderflow">Number must be positive</FormMessage>
        <FormMessage match="rangeOverflow">Number must be reasonable</FormMessage>
      </FormField>

      <FormField name="tel">
        <FormLabel>Phone Number</FormLabel>
        <FormInput type="tel" placeholder="+1 (555) 000-0000" />
        <FormDescription>Telephone number input</FormDescription>
      </FormField>

      <FormField name="url">
        <FormLabel>Website URL</FormLabel>
        <FormInput type="url" placeholder="https://example.com" />
        <FormMessage match="typeMismatch">Please enter a valid URL</FormMessage>
      </FormField>

      <FormField name="search">
        <FormLabel>Search</FormLabel>
        <FormInput type="search" placeholder="Search..." />
        <FormDescription>Search input with clear functionality</FormDescription>
      </FormField>

      <FormField name="textarea">
        <FormLabel>Description</FormLabel>
        <FormTextarea placeholder="Enter a detailed description..." />
        <FormDescription>Multi-line text input</FormDescription>
      </FormField>

      <FormField name="country">
        <FormLabel>Country</FormLabel>
        <FormSelect placeholder="Select your country">
          <FormSelectItem value="us">United States</FormSelectItem>
          <FormSelectItem value="ca">Canada</FormSelectItem>
          <FormSelectItem value="uk">United Kingdom</FormSelectItem>
          <FormSelectItem value="au">Australia</FormSelectItem>
          <FormSelectItem value="de">Germany</FormSelectItem>
          <FormSelectItem value="fr">France</FormSelectItem>
        </FormSelect>
        <FormDescription>Dropdown selection field</FormDescription>
      </FormField>

      <FormSubmit className="w-full">Submit Form</FormSubmit>
    </Form>
  ),
}

/**
 * Demonstrates size variants (sm, md, lg) for all form components.
 * Shows how sizing affects both visual appearance and interactive area.
 */
export const SizeVariants: Story = {
  render: () => (
    <div className="space-y-8">
      <Form className="w-80">
        <h3 className="text-lg font-semibold mb-4">Small Size (sm)</h3>
        <div className="space-y-3">
          <FormField name="small-text" size="sm">
            <FormLabel>Text Input</FormLabel>
            <FormInput size="sm" placeholder="Small text input" />
          </FormField>

          <FormField name="small-textarea" size="sm">
            <FormLabel>Textarea</FormLabel>
            <FormTextarea size="sm" placeholder="Small textarea" />
          </FormField>

          <FormField name="small-select" size="sm">
            <FormLabel>Select</FormLabel>
            <FormSelect size="sm" placeholder="Small select">
              <FormSelectItem value="option1">Option 1</FormSelectItem>
              <FormSelectItem value="option2">Option 2</FormSelectItem>
            </FormSelect>
          </FormField>
        </div>
      </Form>

      <Form className="w-80">
        <h3 className="text-lg font-semibold mb-4">Medium Size (md) - Default</h3>
        <div className="space-y-4">
          <FormField name="medium-text" size="md">
            <FormLabel>Text Input</FormLabel>
            <FormInput size="md" placeholder="Medium text input" />
          </FormField>

          <FormField name="medium-textarea" size="md">
            <FormLabel>Textarea</FormLabel>
            <FormTextarea size="md" placeholder="Medium textarea" />
          </FormField>

          <FormField name="medium-select" size="md">
            <FormLabel>Select</FormLabel>
            <FormSelect size="md" placeholder="Medium select">
              <FormSelectItem value="option1">Option 1</FormSelectItem>
              <FormSelectItem value="option2">Option 2</FormSelectItem>
            </FormSelect>
          </FormField>
        </div>
      </Form>

      <Form className="w-80">
        <h3 className="text-lg font-semibold mb-4">Large Size (lg)</h3>
        <div className="space-y-5">
          <FormField name="large-text" size="lg">
            <FormLabel>Text Input</FormLabel>
            <FormInput size="lg" placeholder="Large text input" />
          </FormField>

          <FormField name="large-textarea" size="lg">
            <FormLabel>Textarea</FormLabel>
            <FormTextarea size="lg" placeholder="Large textarea" />
          </FormField>

          <FormField name="large-select" size="lg">
            <FormLabel>Select</FormLabel>
            <FormSelect size="lg" placeholder="Large select">
              <FormSelectItem value="option1">Option 1</FormSelectItem>
              <FormSelectItem value="option2">Option 2</FormSelectItem>
            </FormSelect>
          </FormField>
        </div>
      </Form>
    </div>
  ),
}

/**
 * Highlights accessibility features including ARIA labels, required field indicators,
 * error message associations, and screen reader compatibility.
 */
export const AccessibilityDemo: Story = {
  render: () => (
    <Form className="w-80 space-y-4">
      <div className="p-4 bg-blue-50 rounded-lg mb-4">
        <h3 className="font-semibold text-blue-900 mb-2">♿ Accessibility Features</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• ARIA labels and descriptions</li>
          <li>• Required field indicators</li>
          <li>• Error message associations</li>
          <li>• Keyboard navigation support</li>
          <li>• Screen reader compatibility</li>
        </ul>
      </div>

      <FormField name="required-field">
        <FormLabel required>Required Field *</FormLabel>
        <FormInput placeholder="This field is required" required aria-describedby="required-field-description" />
        <FormDescription id="required-field-description">
          This field demonstrates required field indication
        </FormDescription>
        <FormMessage match="valueMissing">This field is required</FormMessage>
      </FormField>

      <FormField name="described-field">
        <FormLabel>Field with Description</FormLabel>
        <FormInput placeholder="Field with help text" aria-describedby="described-field-help" />
        <FormDescription id="described-field-help">
          This description is properly associated with the input for screen readers
        </FormDescription>
      </FormField>

      <FormField name="error-field" validationState="error">
        <FormLabel>Field with Error</FormLabel>
        <FormInput
          placeholder="This field has an error"
          validationState="error"
          aria-invalid="true"
          aria-describedby="error-field-message"
        />
        <FormMessage type="error" id="error-field-message" role="alert">
          This error message is announced by screen readers
        </FormMessage>
      </FormField>

      <fieldset className="border rounded-lg p-4">
        <legend className="text-sm font-medium px-2">Grouped Fields</legend>
        <div className="space-y-3">
          <FormField name="first-name">
            <FormLabel>First Name</FormLabel>
            <FormInput placeholder="First name" />
          </FormField>

          <FormField name="last-name">
            <FormLabel>Last Name</FormLabel>
            <FormInput placeholder="Last name" />
          </FormField>
        </div>
      </fieldset>

      <FormSubmit className="w-full" aria-describedby="submit-description">
        Submit Form
      </FormSubmit>
      <FormDescription id="submit-description">Press Enter or click to submit the form</FormDescription>
    </Form>
  ),
}

/**
 * Interactive demonstration of keyboard navigation patterns including tab order,
 * Enter to submit, Escape to reset, and arrow key navigation for selects.
 */
export const KeyboardNavigation: Story = {
  render: () => (
    <div className="w-80">
      <div className="p-4 bg-green-50 rounded-lg mb-4">
        <h3 className="font-semibold text-green-900 mb-2">⌨️ Keyboard Navigation</h3>
        <ul className="text-sm text-green-800 space-y-1">
          <li>
            • <kbd className="px-1 py-0.5 bg-white rounded text-xs">Tab</kbd> - Move to next field
          </li>
          <li>
            • <kbd className="px-1 py-0.5 bg-white rounded text-xs">Shift+Tab</kbd> - Move to previous field
          </li>
          <li>
            • <kbd className="px-1 py-0.5 bg-white rounded text-xs">Enter</kbd> - Submit form
          </li>
          <li>
            • <kbd className="px-1 py-0.5 bg-white rounded text-xs">Escape</kbd> - Clear/reset
          </li>
          <li>
            • <kbd className="px-1 py-0.5 bg-white rounded text-xs">↑↓</kbd> - Navigate select options
          </li>
          <li>
            • <kbd className="px-1 py-0.5 bg-white rounded text-xs">Space</kbd> - Toggle password visibility
          </li>
        </ul>
      </div>

      <Form
        className="space-y-4"
        onSubmit={e => {
          e.preventDefault()
          // Form submitted successfully with keyboard navigation preserved
        }}
      >
        <FormField name="field1">
          <FormLabel>Field 1 (Tab Index 1)</FormLabel>
          <FormInput placeholder="First field in tab order" />
        </FormField>

        <FormField name="field2">
          <FormLabel>Field 2 (Tab Index 2)</FormLabel>
          <FormInput placeholder="Second field in tab order" />
        </FormField>

        <FormField name="password">
          <FormLabel>Password (Tab Index 3)</FormLabel>
          <FormPassword placeholder="Use Space to toggle visibility" showToggle />
          <FormDescription>Focus the toggle button and press Space to show/hide</FormDescription>
        </FormField>

        <FormField name="country">
          <FormLabel>Country (Tab Index 4)</FormLabel>
          <FormSelect placeholder="Use arrow keys to navigate">
            <FormSelectItem value="us">United States</FormSelectItem>
            <FormSelectItem value="ca">Canada</FormSelectItem>
            <FormSelectItem value="uk">United Kingdom</FormSelectItem>
            <FormSelectItem value="au">Australia</FormSelectItem>
          </FormSelect>
          <FormDescription>Open with Enter/Space, navigate with arrow keys</FormDescription>
        </FormField>

        <FormField name="description">
          <FormLabel>Description (Tab Index 5)</FormLabel>
          <FormTextarea placeholder="Multi-line text area" />
        </FormField>

        <div className="flex gap-2">
          <FormSubmit>Submit (Tab Index 6)</FormSubmit>
          <button type="reset" className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
            Reset (Tab Index 7)
          </button>
        </div>
      </Form>
    </div>
  ),
}

/**
 * Real-world example showcasing a complex registration form with multiple field types,
 * validation logic, conditional fields, and comprehensive form submission handling.
 */
export const ComplexForm: Story = {
  render: () => {
    const [formData, setFormData] = useState({
      accountType: '',
      companyName: '',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      website: '',
      country: '',
      interests: '',
      newsletter: false,
    })

    const [errors, setErrors] = useState<Record<string, string>>({})
    const [submitted, setSubmitted] = useState(false)

    const validateForm = () => {
      const newErrors: Record<string, string> = {}

      if (!formData.firstName) newErrors.firstName = 'First name is required'
      if (!formData.lastName) newErrors.lastName = 'Last name is required'
      if (!formData.email) newErrors.email = 'Email is required'
      if (!formData.password) newErrors.password = 'Password is required'
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
      if (formData.accountType === 'business' && !formData.companyName) {
        newErrors.companyName = 'Company name is required for business accounts'
      }

      setErrors(newErrors)
      return Object.keys(newErrors).length === 0
    }

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      if (validateForm()) {
        setSubmitted(true)
        setTimeout(() => setSubmitted(false), 3000)
      }
    }

    const updateField = (field: string, value: string | boolean) => {
      setFormData(prev => ({...prev, [field]: value}))
      if (errors[field]) {
        setErrors(prev => ({...prev, [field]: ''}))
      }
    }

    if (submitted) {
      return (
        <div className="w-96 p-6 bg-green-50 border border-green-200 rounded-lg text-center">
          <div className="text-green-600 text-4xl mb-2">✅</div>
          <h3 className="text-lg font-semibold text-green-900 mb-2">Registration Successful!</h3>
          <p className="text-green-700">Welcome to Sparkle, {formData.firstName}!</p>
        </div>
      )
    }

    return (
      <Form className="w-96 space-y-4" onSubmit={handleSubmit}>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold">Create Your Account</h2>
          <p className="text-gray-600">Join Sparkle to get started</p>
        </div>

        <FormField name="accountType">
          <FormLabel required>Account Type</FormLabel>
          <FormSelect
            placeholder="Select account type"
            value={formData.accountType}
            onValueChange={value => updateField('accountType', value)}
          >
            <FormSelectItem value="personal">Personal</FormSelectItem>
            <FormSelectItem value="business">Business</FormSelectItem>
            <FormSelectItem value="non-profit">Non-Profit</FormSelectItem>
          </FormSelect>
        </FormField>

        {formData.accountType === 'business' && (
          <FormField name="companyName" validationState={errors.companyName ? 'error' : 'default'}>
            <FormLabel required>Company Name</FormLabel>
            <FormInput
              placeholder="Enter your company name"
              value={formData.companyName}
              onChange={e => updateField('companyName', e.target.value)}
              validationState={errors.companyName ? 'error' : 'default'}
            />
            {errors.companyName && <FormMessage type="error">{errors.companyName}</FormMessage>}
          </FormField>
        )}

        <div className="grid grid-cols-2 gap-3">
          <FormField name="firstName" validationState={errors.firstName ? 'error' : 'default'}>
            <FormLabel required>First Name</FormLabel>
            <FormInput
              placeholder="First name"
              value={formData.firstName}
              onChange={e => updateField('firstName', e.target.value)}
              validationState={errors.firstName ? 'error' : 'default'}
            />
            {errors.firstName && <FormMessage type="error">{errors.firstName}</FormMessage>}
          </FormField>

          <FormField name="lastName" validationState={errors.lastName ? 'error' : 'default'}>
            <FormLabel required>Last Name</FormLabel>
            <FormInput
              placeholder="Last name"
              value={formData.lastName}
              onChange={e => updateField('lastName', e.target.value)}
              validationState={errors.lastName ? 'error' : 'default'}
            />
            {errors.lastName && <FormMessage type="error">{errors.lastName}</FormMessage>}
          </FormField>
        </div>

        <FormField name="email" validationState={errors.email ? 'error' : 'default'}>
          <FormLabel required>Email Address</FormLabel>
          <FormInput
            type="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={e => updateField('email', e.target.value)}
            validationState={errors.email ? 'error' : 'default'}
          />
          {errors.email && <FormMessage type="error">{errors.email}</FormMessage>}
        </FormField>

        <FormField name="password" validationState={errors.password ? 'error' : 'default'}>
          <FormLabel required>Password</FormLabel>
          <FormPassword
            placeholder="Create a strong password"
            value={formData.password}
            onChange={e => updateField('password', e.target.value)}
            showToggle
            validationState={errors.password ? 'error' : 'default'}
          />
          {errors.password && <FormMessage type="error">{errors.password}</FormMessage>}
          <FormDescription>Password must be at least 8 characters long</FormDescription>
        </FormField>

        <FormField name="confirmPassword" validationState={errors.confirmPassword ? 'error' : 'default'}>
          <FormLabel required>Confirm Password</FormLabel>
          <FormPassword
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={e => updateField('confirmPassword', e.target.value)}
            validationState={errors.confirmPassword ? 'error' : 'default'}
          />
          {errors.confirmPassword && <FormMessage type="error">{errors.confirmPassword}</FormMessage>}
        </FormField>

        <FormField name="phone">
          <FormLabel>Phone Number</FormLabel>
          <FormInput
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={formData.phone}
            onChange={e => updateField('phone', e.target.value)}
          />
          <FormDescription>Optional - for account recovery</FormDescription>
        </FormField>

        {formData.accountType === 'business' && (
          <FormField name="website">
            <FormLabel>Website</FormLabel>
            <FormInput
              type="url"
              placeholder="https://yourcompany.com"
              value={formData.website}
              onChange={e => updateField('website', e.target.value)}
            />
          </FormField>
        )}

        <FormField name="country">
          <FormLabel>Country</FormLabel>
          <FormSelect
            placeholder="Select your country"
            value={formData.country}
            onValueChange={value => updateField('country', value)}
          >
            <FormSelectItem value="us">United States</FormSelectItem>
            <FormSelectItem value="ca">Canada</FormSelectItem>
            <FormSelectItem value="uk">United Kingdom</FormSelectItem>
            <FormSelectItem value="au">Australia</FormSelectItem>
            <FormSelectItem value="de">Germany</FormSelectItem>
            <FormSelectItem value="fr">France</FormSelectItem>
            <FormSelectItem value="jp">Japan</FormSelectItem>
            <FormSelectItem value="other">Other</FormSelectItem>
          </FormSelect>
        </FormField>

        <FormField name="interests">
          <FormLabel>Tell us about your interests</FormLabel>
          <FormTextarea
            placeholder="What brings you to Sparkle? What are you hoping to achieve?"
            defaultValue={formData.interests}
          />
          <FormDescription>Help us personalize your experience (optional)</FormDescription>
        </FormField>

        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            id="newsletter"
            checked={formData.newsletter}
            onChange={e => updateField('newsletter', e.target.checked)}
            className="mt-1"
          />
          <div className="flex-1">
            <label htmlFor="newsletter" className="text-sm font-medium">
              Subscribe to newsletter
            </label>
            <p className="text-xs text-gray-600 mt-1">
              Get updates about new features and best practices. Unsubscribe anytime.
            </p>
          </div>
        </div>

        <FormSubmit className="w-full" disabled={!formData.firstName || !formData.email}>
          Create Account
        </FormSubmit>

        <p className="text-xs text-gray-500 text-center">
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </p>
      </Form>
    )
  },
}
