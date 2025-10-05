---
title: FormSubmit
description: "Form submit button component with theme-aware styling and proper form association"
---

# FormSubmit

Form submit button component with theme-aware styling and proper form association

Uses CSS custom properties from @sparkle/theme for consistent theming across light/dark modes and follows the same patterns as the Button component.

## Import

```tsx
import { FormSubmit } from '@sparkle/ui'
```

## Props

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `size` | `"sm" \| "md" \| "lg" \| undefined` |  | `` | Size variant for the submit button |
| `variant` | `"primary" \| "secondary" \| "outline" \| undefined` |  | `` | Visual variant for the submit button |
| `disabled` | `boolean \| undefined` |  | `` | Whether the submit button is disabled |
| `children` | `React.ReactNode` | ✓ | `` | Submit button children content |

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
- [FormSelect](./form-select)
- [FormSelectItem](./form-select-item)
- [FormTextarea](./form-textarea)

## Additional Resources

- [View source code](https://github.com/marcusrbrown/sparkle/blob/main/packages/ui/src/components/Form/FormSubmit.tsx)
- [API Documentation](/api/ui/src#formsubmit)
