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
| `onSubmit` | `((event: React.FormEvent<HTMLFormElement>) => void) \| undefined` |  | `` | Form submission handler |
| `clearOnSubmit` | `boolean \| undefined` |  | `` | Clear validation state on form reset |
| `preventDefaultSubmission` | `boolean \| undefined` |  | `` | Whether to prevent default form submission |
| `onValidate` | `((formData: FormData) => boolean \| Promise<boolean>) \| undefined` |  | `` | Form validation handler called before submission |
| `onFormError` | `((error: Error) => void) \| undefined` |  | `` | Error handler for form submission errors |
| `onFormSuccess` | `((formData: FormData) => void) \| undefined` |  | `` | Success handler for successful form submission |

## Basic Usage

```tsx
import { Form } from '@sparkle/ui'

export function Example() {
  return <Form />
}
```

## Styling

This component uses theme-aware CSS custom properties for consistent styling across light and dark modes. You can customize the appearance by:

1. **Theme Variables**: Modify theme tokens in your `@sparkle/theme` configuration
2. **CSS Classes**: Apply custom CSS classes via the `className` prop
3. **CSS-in-JS**: Use styled-components or emotion with the component

## Accessibility

Includes proper form labeling, validation states, and error messaging for screen readers.

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

## Source Code

View the source code for this component on GitHub:

- [components/Form/Form.tsx](https://github.com/marcusrbrown/sparkle/blob/main/packages/ui/src/components/Form/Form.tsx)

## API Reference

For detailed TypeScript definitions and additional API information, see:

- [API Documentation](/api/ui/src#form)
