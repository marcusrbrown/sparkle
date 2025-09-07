---
title: FormLabel
description: "Form label component with theme-aware styling and proper accessibility associations and required field indicators Uses CSS custom properties from @sparkle/theme for consistent theming across light/dark modes and supports disabled states."
---

# FormLabel

Form label component with theme-aware styling and proper accessibility associations and required field indicators

Uses CSS custom properties from @sparkle/theme for consistent theming across light/dark modes and supports disabled states.

## Import

```tsx
import { FormLabel } from '@sparkle/ui'
```

## Props

| Prop          | Type                   | Required | Default | Description                             |
| ------------- | ---------------------- | -------- | ------- | --------------------------------------- |
| `children`    | `React.ReactNode`      | ✓        | ``      | Label children content                  |
| `required`    | `boolean \| undefined` |          | ``      | Whether the field is required           |
| `disabled`    | `boolean \| undefined` |          | ``      | Whether the field is disabled           |
| `description` | `string \| undefined`  |          | ``      | Optional description text for the field |

## Basic Usage

```tsx
import { FormLabel } from '@sparkle/ui'

export function Example() {
  return <FormLabel />
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
- [FormField](./form-field)
- [FormInput](./form-input)
- [FormMessage](./form-message)
- [FormPassword](./form-password)
- [FormSelect](./form-select)
- [FormSelectItem](./form-select-item)
- [FormSubmit](./form-submit)
- [FormTextarea](./form-textarea)
