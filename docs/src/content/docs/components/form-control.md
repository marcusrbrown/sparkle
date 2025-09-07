---
title: FormControl
description: "Form control wrapper component with theme-aware styling that handles input focus and validation Uses CSS custom properties from @sparkle/theme for consistent theming across light/dark modes. Primarily a pass-through wrapper for Radix Form.Control."
---

# FormControl

Form control wrapper component with theme-aware styling that handles input focus and validation

Uses CSS custom properties from @sparkle/theme for consistent theming across light/dark modes. Primarily a pass-through wrapper for Radix Form.Control.

## Import

```tsx
import { FormControl } from '@sparkle/ui'
```

## Props

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `asChild` | `boolean \| undefined` |  | `` | Use the child component as the control element |
| `size` | `"sm" \| "md" \| "lg" \| undefined` |  | `` | Size variant for the control |
| `validationState` | `"default" \| "success" \| "error" \| undefined` |  | `` | Validation state for styling |
| `disabled` | `boolean \| undefined` |  | `` | Whether the control is disabled |

## Basic Usage

```tsx
import { FormControl } from '@sparkle/ui'

export function Example() {
  return <FormControl />
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
