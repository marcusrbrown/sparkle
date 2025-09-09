---
title: Component Reference
description: Complete reference of all available Sparkle UI components with examples and usage guidelines.
---

## Form Components

### Form

Root form component that provides context and validation for form fields.

**Usage:**

```tsx
import { Form } from '@sparkle/ui'

<Form onSubmit={handleSubmit}>
  {/* Form fields go here */}
</Form>
```

**Key Features:**

- Form validation context
- Error handling and display
- Accessibility features
- TypeScript integration

---

### FormField

Generic field wrapper that provides consistent layout and validation display.

**Usage:**

```tsx
import { FormField, FormInput, FormLabel, FormMessage } from '@sparkle/ui'

<FormField name="email">
  <FormLabel>Email Address</FormLabel>
  <FormInput type="email" placeholder="Enter your email" />
  <FormMessage />
</FormField>
```

**Key Features:**

- Consistent field layout
- Error message display
- Accessibility labeling
- Validation integration

---

### FormControl

Base control component that wraps form inputs with proper accessibility.

**Usage:**

```tsx
import { FormControl } from '@sparkle/ui'

<FormControl>
  <FormLabel>Username</FormLabel>
  <FormInput name="username" />
  <FormDescription>Choose a unique username</FormDescription>
  <FormMessage />
</FormControl>
```

**Key Features:**

- ARIA associations
- Error state handling
- Description text support
- Consistent spacing

---

### FormInput

Text input component with validation and accessibility features.

**Usage:**

```tsx
import { FormInput } from '@sparkle/ui'

<FormInput
  name="username"
  type="text"
  placeholder="Enter username"
  required
/>
```

**Props:**

- `type`: Input type (text, email, tel, etc.)
- `placeholder`: Placeholder text
- `required`: Mark as required field
- `disabled`: Disable the input
- Standard HTML input attributes

---

### FormPassword

Password input with show/hide toggle functionality.

**Usage:**

```tsx
import { FormPassword } from '@sparkle/ui'

<FormPassword
  name="password"
  placeholder="Enter password"
  required
/>
```

**Key Features:**

- Show/hide password toggle
- Secure input handling
- Accessibility support
- Validation integration

---

### FormTextarea

Multi-line text input for longer content.

**Usage:**

```tsx
import { FormTextarea } from '@sparkle/ui'

<FormTextarea
  name="description"
  placeholder="Enter description"
  rows={4}
/>
```

**Props:**

- `rows`: Number of visible rows
- `cols`: Number of visible columns
- `resize`: Control resize behavior
- Standard HTML textarea attributes

---

### FormSelect

Dropdown selection component with proper accessibility.

**Usage:**

```tsx
import { FormSelect } from '@sparkle/ui'

<FormSelect name="country" defaultValue="">
  <option value="">Select a country</option>
  <option value="us">United States</option>
  <option value="ca">Canada</option>
</FormSelect>
```

**Key Features:**

- Custom styling
- Accessibility support
- Keyboard navigation
- Validation integration

---

### FormLabel

Accessible label component for form fields.

**Usage:**

```tsx
import { FormLabel } from '@sparkle/ui'

<FormLabel htmlFor="email">
  Email Address
  <span className="required">*</span>
</FormLabel>
```

**Key Features:**

- Proper label association
- Required field indicators
- Consistent typography
- Click-to-focus behavior

---

### FormDescription

Help text component for providing field guidance.

**Usage:**

```tsx
import { FormDescription } from '@sparkle/ui'

<FormDescription>
  Your email will be used for account notifications
</FormDescription>
```

**Key Features:**

- Descriptive text styling
- ARIA associations
- Consistent appearance
- Responsive design

---

### FormMessage

Error and status message component for form validation.

**Usage:**

```tsx
import { FormMessage } from '@sparkle/ui'

<FormMessage type="error">
  This field is required
</FormMessage>
```

**Props:**

- `type`: Message type (error, warning, success, info)
- `children`: Message content

**Key Features:**

- Multiple message types
- Icon integration
- Color-coded styling
- Screen reader support

---

### FormSubmit

Submit button component optimized for forms.

**Usage:**

```tsx
import { FormSubmit } from '@sparkle/ui'

<FormSubmit
  variant="primary"
  loading={isSubmitting}
  disabled={!isValid}
>
  Submit Form
</FormSubmit>
```

**Props:**

- `loading`: Show loading state
- `disabled`: Disable submission
- `variant`: Button style variant
- Standard button attributes

---

## Interface Components

### Button

Primary interface element for user actions.

**Usage:**

```tsx
import { Button } from '@sparkle/ui'

<Button
  variant="primary"
  size="md"
  onClick={handleClick}
>
  Click Me
</Button>
```

**Variants:**

- `primary`: Main call-to-action styling
- `secondary`: Secondary action styling
- `outline`: Outlined button styling

**Sizes:**

- `sm`: Small button size
- `md`: Medium button size (default)
- `lg`: Large button size

**Key Features:**

- Multiple variants and sizes
- Loading states support
- Icon integration
- Accessibility compliance
- Keyboard navigation
- Focus management

## Component Combinations

### Complete Form Example

```tsx
import {
  Button,
  Form,
  FormDescription,
  FormField,
  FormInput,
  FormLabel,
  FormMessage,
  FormPassword,
  FormSelect,
  FormSubmit,
  FormTextarea
} from '@sparkle/ui'

function ContactForm() {
  const handleSubmit = (data) => {
    // Handle form submission
  }

  return (
    <Form onSubmit={handleSubmit}>
      <FormField name="name">
        <FormLabel>Full Name</FormLabel>
        <FormInput
          type="text"
          placeholder="Enter your full name"
          required
        />
        <FormMessage />
      </FormField>

      <FormField name="email">
        <FormLabel>Email Address</FormLabel>
        <FormInput
          type="email"
          placeholder="Enter your email"
          required
        />
        <FormDescription>
          We'll never share your email with anyone else
        </FormDescription>
        <FormMessage />
      </FormField>

      <FormField name="password">
        <FormLabel>Password</FormLabel>
        <FormPassword
          placeholder="Enter a secure password"
          required
        />
        <FormMessage />
      </FormField>

      <FormField name="country">
        <FormLabel>Country</FormLabel>
        <FormSelect name="country" defaultValue="">
          <option value="">Select a country</option>
          <option value="us">United States</option>
          <option value="ca">Canada</option>
          <option value="uk">United Kingdom</option>
        </FormSelect>
        <FormMessage />
      </FormField>

      <FormField name="message">
        <FormLabel>Message</FormLabel>
        <FormTextarea
          placeholder="Enter your message"
          rows={4}
        />
        <FormMessage />
      </FormField>

      <div className="form-actions">
        <Button type="button" variant="secondary">
          Cancel
        </Button>
        <FormSubmit variant="primary">
          Submit
        </FormSubmit>
      </div>
    </Form>
  )
}
```

## Best Practices

### Component Usage

1. **Always use FormField** for consistent layout and validation
2. **Include FormMessage** for error display
3. **Provide meaningful labels** and descriptions
4. **Use appropriate input types** for better UX
5. **Handle loading and disabled states** appropriately

### Accessibility

1. **Associate labels** with their corresponding inputs
2. **Provide descriptive text** using FormDescription
3. **Use semantic HTML elements** whenever possible
4. **Test with keyboard navigation** and screen readers
5. **Ensure sufficient color contrast** for all text

### Performance

1. **Use controlled components** sparingly for large forms
2. **Implement field-level validation** instead of form-level when possible
3. **Debounce validation** for better user experience
4. **Consider virtualization** for very long forms
