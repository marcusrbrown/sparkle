---
title: FormDescription
description: "Form description component with theme-aware styling for providing additional field context"
---

# FormDescription

Form description component with theme-aware styling for providing additional field context

Automatically connects to form controls via aria-describedby Uses CSS custom properties from @sparkle/theme for consistent theming.

## Import

```tsx
import { FormDescription } from '@sparkle/ui'
```

## Props

| Prop       | Type                   | Required | Default | Description                                     |
| ---------- | ---------------------- | -------- | ------- | ----------------------------------------------- |
| `children` | `React.ReactNode`      | ✓        | ``      | Description text content                        |
| `disabled` | `boolean \| undefined` |          | ``      | Whether the description is for a disabled field |

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
- [FormField](./form-field)
- [FormInput](./form-input)
- [FormLabel](./form-label)
- [FormMessage](./form-message)
- [FormPassword](./form-password)
- [FormSelect](./form-select)
- [FormSelectItem](./form-select-item)
- [FormSubmit](./form-submit)
- [FormTextarea](./form-textarea)

## Additional Resources

- [View source code](https://github.com/marcusrbrown/sparkle/blob/main/packages/ui/src/components/Form/FormDescription.tsx)
- [API Documentation](/api/ui/src#formdescription)
