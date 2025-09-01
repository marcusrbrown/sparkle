# @sparkle/ui

A modern, accessible, and type-safe UI component library built with React and TypeScript.

## Features

- 🎨 Modern design system with customizable themes
- 📦 Tree-shakeable ESM package
- 🔒 Type-safe components with full TypeScript support
- ♿️ Accessible components following WAI-ARIA guidelines
- 🧪 Comprehensive test coverage
- 📚 Detailed documentation and examples

## Installation

```bash
pnpm add @sparkle/ui
```

## Usage

```tsx
import {Button} from "@sparkle/ui"

function App() {
  return (
    <Button variant="primary" size="md">
      Click me
    </Button>
  )
}
```

## Components

### Button

A versatile button component with multiple variants and sizes.

```tsx
<>
  <Button variant="primary" size="md">
    Primary Button
  </Button>

  <Button variant="secondary" size="sm">
    Secondary Button
  </Button>

  <Button variant="outline" size="lg">
    Outline Button
  </Button>
</>
```

### Form

A comprehensive, accessible form component library built with Radix UI primitives. Provides WCAG 2.1 AA compliant form elements with built-in validation, keyboard navigation, and screen reader support.

#### Basic Usage

```tsx
import {Form} from "@sparkle/ui"

function ContactForm() {
  return (
    <Form onSubmit={(e) => {
      e.preventDefault()
      // Handle form submission
    }}>
      <Form.Field name="email">
        <Form.Label>Email Address</Form.Label>
        <Form.Control>
          <Form.Input type="email" placeholder="Enter your email" />
        </Form.Control>
        <Form.Description>We'll never share your email.</Form.Description>
        <Form.Message match="valueMissing">
          Please enter your email address.
        </Form.Message>
      </Form.Field>

      <Form.Submit>Submit</Form.Submit>
    </Form>
  )
}
```

#### Compound Component Pattern

The Form component uses a compound component pattern for maximum flexibility:

```tsx
// Available components:
// <Form />              - Root form container
// <Form.Field />        - Field wrapper with validation context
// <Form.Label />        - Accessible label with proper associations
// <Form.Control />      - Control wrapper for input elements
// <Form.Input />        - Text input with validation support
// <Form.Password />     - Password input with visibility toggle
// <Form.Textarea />     - Multi-line text input
// <Form.Select />       - Dropdown select with Radix UI primitives
// <Form.SelectItem />   - Individual select option
// <Form.Message />      - Validation message with error/success states
// <Form.Description />  - Help text and field descriptions
// <Form.Submit />       - Submit button with form state integration
```

#### Field Types and Validation

```tsx
function RegistrationForm() {
  return (
    <Form>
      {/* Text input with validation */}
      <Form.Field name="username" validationState="error">
        <Form.Label>Username</Form.Label>
        <Form.Control>
          <Form.Input
            type="text"
            size="md"
            placeholder="Choose a username"
          />
        </Form.Control>
        <Form.Message match="tooShort">
          Username must be at least 3 characters.
        </Form.Message>
      </Form.Field>

      {/* Email input */}
      <Form.Field name="email">
        <Form.Label>Email</Form.Label>
        <Form.Control>
          <Form.Input type="email" size="lg" />
        </Form.Control>
        <Form.Message match="typeMismatch">
          Please enter a valid email address.
        </Form.Message>
      </Form.Field>

      {/* Password input */}
      <Form.Field name="password">
        <Form.Label>Password</Form.Label>
        <Form.Control>
          <Form.Password size="md" />
        </Form.Control>
      </Form.Field>

      {/* Textarea */}
      <Form.Field name="bio">
        <Form.Label>Bio</Form.Label>
        <Form.Control>
          <Form.Textarea
            placeholder="Tell us about yourself"
            rows={4}
          />
        </Form.Control>
      </Form.Field>

      {/* Select dropdown */}
      <Form.Field name="country">
        <Form.Label>Country</Form.Label>
        <Form.Control>
          <Form.Select>
            <Form.SelectItem value="us">United States</Form.SelectItem>
            <Form.SelectItem value="ca">Canada</Form.SelectItem>
            <Form.SelectItem value="uk">United Kingdom</Form.SelectItem>
          </Form.Select>
        </Form.Control>
      </Form.Field>
    </Form>
  )
}
```

#### Validation States

Forms support three validation states: `default`, `error`, and `success`.

```tsx
<>
  {/* Error state example */}
  <Form.Field name="email" validationState="error">
    <Form.Label>Email Address</Form.Label>
    <Form.Control>
      <Form.Input type="email" />
    </Form.Control>
    <Form.Message match="valueMissing">This field is required.</Form.Message>
  </Form.Field>

  {/* Success state example */}
  <Form.Field name="username" validationState="success">
    <Form.Label>Username</Form.Label>
    <Form.Control>
      <Form.Input type="text" />
    </Form.Control>
    <Form.Message>Username is available!</Form.Message>
  </Form.Field>
</>
```

#### Size Variants

All form inputs support three size variants: `sm`, `md` (default), and `lg`.

```tsx
<>
  <Form.Input size="sm" placeholder="Small input" />
  <Form.Input size="md" placeholder="Medium input" />
  <Form.Input size="lg" placeholder="Large input" />

  <Form.Textarea size="sm" />
  <Form.Select size="lg">
    <Form.SelectItem value="option">Option</Form.SelectItem>
  </Form.Select>
</>
```

#### Accessibility Features

The Form component provides comprehensive accessibility support:

- **ARIA Labels**: Automatic `aria-labelledby` and `aria-describedby` associations
- **Keyboard Navigation**: Full keyboard support for all interactive elements
- **Screen Reader Support**: Proper announcements for validation state changes
- **Error Handling**: Live error announcements with `aria-live` regions
- **Focus Management**: Logical tab order and focus indicators
- **WCAG 2.1 AA Compliance**: Meets accessibility guidelines

#### Advanced Usage

```tsx
function AdvancedForm() {
  const handleSubmit = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    // Process form data
  }

  const handleValidation = (formData) => {
    // Custom validation logic
    return formData.get('email')?.includes('@')
  }

  return (
    <Form
      onSubmit={handleSubmit}
      onValidate={handleValidation}
      clearOnSubmit={true}
      preventDefaultSubmission={false}
    >
      {/* Form fields */}
    </Form>
  )
}
```

#### Mobile Compatibility

Form components are designed for web environments using HTML form elements. For React Native applications:

- ✅ **Import Compatible**: Components can be imported without errors
- ⚠️ **Runtime Adaptation Needed**: Requires React Native Web or platform-specific adaptations for native rendering
- ✅ **TypeScript Support**: Full type safety in all environments

#### Props Reference

##### Form Props

- `onSubmit?: (event: FormEvent) => void` - Form submission handler
- `onValidate?: (formData: FormData) => boolean | Promise<boolean>` - Custom validation
- `clearOnSubmit?: boolean` - Clear form after successful submission
- `preventDefaultSubmission?: boolean` - Prevent default browser submission

##### FormField Props

- `name: string` - Field name (required)
- `validationState?: 'default' | 'error' | 'success'` - Validation state
- `size?: 'sm' | 'md' | 'lg'` - Size variant

##### FormInput/FormPassword/FormTextarea Props

- `size?: 'sm' | 'md' | 'lg'` - Size variant
- `type?: string` - Input type (FormInput only)
- Plus all standard HTML input/textarea attributes

##### FormMessage Props

- `match?: string | (value: string, formData: FormData) => boolean` - Validation condition
- `validationType?: 'valueMissing' | 'typeMismatch' | ...` - Built-in validation types

## Development

### Setup

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Start development: `pnpm dev`

### Commands

- `pnpm build` - Build the package
- `pnpm test` - Run tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Run tests with coverage report

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT © [Your Name]
