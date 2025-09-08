---
title: FormField
description: "Form field wrapper component with theme-aware styling that manages accessibility and validation Uses CSS custom properties from @sparkle/theme for consistent theming across light/dark modes and provides proper field grouping."
---

# FormField

Form field wrapper component with theme-aware styling that manages accessibility and validation

Uses CSS custom properties from @sparkle/theme for consistent theming across light/dark modes and provides proper field grouping.

## Import

```tsx
import { FormField } from '@sparkle/ui'
```

## Props

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `name` | `string` | ✓ | `` | Field name for form submission and validation |
| `validationState` | `"default" \| "success" \| "error" \| undefined` |  | `` | Validation state of the field |
| `size` | `"sm" \| "md" \| "lg" \| undefined` |  | `` | Size variant for the field |
| `children` | `React.ReactNode` | ✓ | `` | Field children content |

## Basic Usage

```tsx
import { FormField } from '@sparkle/ui'

export function Example() {
  return <FormField />
}
```

## Styling

This component uses theme-aware CSS custom properties for consistent styling across light and dark modes. You can customize the appearance by:

1. **Theme Variables**: Modify theme tokens in your `@sparkle/theme` configuration
2. **CSS Classes**: Apply custom CSS classes via the `className` prop
3. **CSS-in-JS**: Use styled-components or emotion with the component

## Accessibility

This component follows accessibility best practices with proper ARIA attributes and keyboard support.

## Related Components

- [Form](./form)
- [FormControl](./form-control)
- [FormDescription](./form-description)
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

- [components/Form/FormField.tsx](https://github.com/marcusrbrown/sparkle/blob/main/packages/ui/src/components/Form/FormField.tsx)

## API Reference

For detailed TypeScript definitions and additional API information, see:

- [API Documentation](/api/ui/src#formfield)
