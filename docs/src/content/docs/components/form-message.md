---
title: FormMessage
description: "Form message component with theme-aware styling for displaying validation feedback Uses CSS custom properties from @sparkle/theme for consistent theming across light/dark modes and supports semantic colors for different message types."
---

# FormMessage

Form message component with theme-aware styling for displaying validation feedback

Uses CSS custom properties from @sparkle/theme for consistent theming across light/dark modes and supports semantic colors for different message types.

## Import

```tsx
import { FormMessage } from '@sparkle/ui'
```

## Props

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `match` | `"valueMissing" \| "typeMismatch" \| "patternMismatch" \| "tooLong" \| "tooShort" \| "rangeUnderflow" \| "rangeOverflow" \| "stepMismatch" \| "badInput" \| "valid" \| undefined` |  | `` | Built-in validation constraint to match |
| `children` | `React.ReactNode` | ✓ | `` | Message children content |
| `announce` | `boolean \| undefined` |  | `` | Whether to announce the message to screen readers |
| `type` | `"success" \| "error" \| "info" \| undefined` |  | `` | Type of message for styling |

## Basic Usage

```tsx
import { FormMessage } from '@sparkle/ui'

export function Example() {
  return <FormMessage />
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
- [FormLabel](./form-label)
- [FormPassword](./form-password)
- [FormSelect](./form-select)
- [FormSelectItem](./form-select-item)
- [FormSubmit](./form-submit)
- [FormTextarea](./form-textarea)
