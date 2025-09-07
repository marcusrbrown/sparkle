---
title: FormInput
description: "Form input component with theme-aware styling for different input types with proper accessibility Uses CSS custom properties from @sparkle/theme for consistent theming across light/dark modes and supports validation states with semantic colors."
---

# FormInput

Form input component with theme-aware styling for different input types with proper accessibility

Uses CSS custom properties from @sparkle/theme for consistent theming across light/dark modes and supports validation states with semantic colors.

## Import

```tsx
import { FormInput } from '@sparkle/ui'
```

## Props

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `type` | `"number" \| "text" \| "email" \| "password" \| "tel" \| "url" \| "search" \| undefined` |  | `` | Input type |
| `size` | `"sm" \| "md" \| "lg" \| undefined` |  | `` | Size variant for the input |
| `validationState` | `"default" \| "success" \| "error" \| undefined` |  | `` | Validation state for styling |
| `placeholder` | `string \| undefined` |  | `` | Input placeholder text |
| `disabled` | `boolean \| undefined` |  | `` | Whether the field is disabled |
| `required` | `boolean \| undefined` |  | `` | Whether the field is required |
| `value` | `string \| undefined` |  | `` | Input value |
| `onChange` | `((event: React.ChangeEvent<HTMLInputElement>) => void) \| undefined` |  | `` | Input change handler |
| `onFocus` | `((event: React.FocusEvent<HTMLInputElement, Element>) => void) \| undefined` |  | `` | Input focus handler |
| `onBlur` | `((event: React.FocusEvent<HTMLInputElement, Element>) => void) \| undefined` |  | `` | Input blur handler |
| `onKeyDown` | `((event: React.KeyboardEvent<HTMLInputElement>) => void) \| undefined` |  | `` | Input key down handler for keyboard navigation |

## Basic Usage

```tsx
import { FormInput } from '@sparkle/ui'

export function Example() {
  return <FormInput />
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
- [FormLabel](./form-label)
- [FormMessage](./form-message)
- [FormPassword](./form-password)
- [FormSelect](./form-select)
- [FormSelectItem](./form-select-item)
- [FormSubmit](./form-submit)
- [FormTextarea](./form-textarea)
