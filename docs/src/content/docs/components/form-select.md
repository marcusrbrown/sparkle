---
title: FormSelect
description: "Form select component with theme-aware styling using Radix UI Select primitives"
---

# FormSelect

Form select component with theme-aware styling using Radix UI Select primitives

Uses CSS custom properties from @sparkle/theme for consistent theming across light/dark modes and supports validation states with semantic colors.

## Import

```tsx
import { FormSelect } from '@sparkle/ui'
```

## Props

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `size` | `"sm" \| "md" \| "lg" \| undefined` |  | `` | Size variant for the select |
| `validationState` | `"default" \| "success" \| "error" \| undefined` |  | `` | Validation state for styling |
| `placeholder` | `string \| undefined` |  | `` | Placeholder text when no value is selected |
| `disabled` | `boolean \| undefined` |  | `` | Whether the select is disabled |
| `required` | `boolean \| undefined` |  | `` | Whether the select is required |
| `value` | `string \| undefined` |  | `` | Select value |
| `onValueChange` | `((value: string) => void) \| undefined` |  | `` | Select change handler |
| `children` | `React.ReactNode` | ✓ | `` | Select children (SelectItem components) |

## Theme Integration

This component uses CSS custom properties from `@sparkle/theme` for consistent styling across light and dark modes.

### Design Tokens Used

- `--theme-*`: Uses theme design tokens for consistent styling

You can customize the appearance by:

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
- [FormSelectItem](./form-select-item)
- [FormSubmit](./form-submit)
- [FormTextarea](./form-textarea)

## Additional Resources

- [View source code](https://github.com/marcusrbrown/sparkle/blob/main/packages/ui/src/components/Form/FormSelect.tsx)
- [API Documentation](/api/ui/src#formselect)
