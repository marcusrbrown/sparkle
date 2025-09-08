---
title: FormTextarea
description: "Form textarea component with theme-aware styling for multi-line text input Uses CSS custom properties from @sparkle/theme for consistent theming across light/dark modes and supports validation states with semantic colors."
---

# FormTextarea

Form textarea component with theme-aware styling for multi-line text input

Uses CSS custom properties from @sparkle/theme for consistent theming across light/dark modes and supports validation states with semantic colors.

## Import

```tsx
import { FormTextarea } from '@sparkle/ui'
```

## Props

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `size` | `"sm" \| "md" \| "lg" \| undefined` |  | `` | Size variant for the textarea |
| `validationState` | `"default" \| "success" \| "error" \| undefined` |  | `` | Validation state for styling |
| `placeholder` | `string \| undefined` |  | `` | Textarea placeholder text |
| `disabled` | `boolean \| undefined` |  | `` | Whether the textarea is disabled |
| `required` | `boolean \| undefined` |  | `` | Whether the textarea is required |

## Basic Usage

```tsx
import { FormTextarea } from '@sparkle/ui'

export function Example() {
  return <FormTextarea />
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
- [FormMessage](./form-message)
- [FormPassword](./form-password)
- [FormSelect](./form-select)
- [FormSelectItem](./form-select-item)
- [FormSubmit](./form-submit)

## Source Code

View the source code for this component on GitHub:

- [components/Form/FormTextarea.tsx](https://github.com/marcusrbrown/sparkle/blob/main/packages/ui/src/components/Form/FormTextarea.tsx)

## API Reference

For detailed TypeScript definitions and additional API information, see:

- [API Documentation](/api/ui/src#formtextarea)
