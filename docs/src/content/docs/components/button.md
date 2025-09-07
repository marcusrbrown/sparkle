---
title: Button
description: "Button component with theme-aware styling and semantic color variants Uses CSS custom properties from @sparkle/theme for consistent theming across light/dark modes and supports semantic color variants for contextual actions (success, warning, error)."
---

# Button

Button component with theme-aware styling and semantic color variants

Uses CSS custom properties from @sparkle/theme for consistent theming across light/dark modes and supports semantic color variants for contextual actions (success, warning, error).

## Import

```tsx
import { Button } from '@sparkle/ui'
```

## Props

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `variant` | `"primary" \| "secondary" \| "outline" \| "ghost" \| undefined` |  | `` | The variant style of the button |
| `size` | `"sm" \| "md" \| "lg" \| undefined` |  | `` | The size of the button |
| `semantic` | `"default" \| "success" \| "warning" \| "error" \| undefined` |  | `` | The semantic color variant for contextual styling |

## Basic Usage

```tsx
import { Button } from '@sparkle/ui'

export function Example() {
  return <Button />
}
```

## Styling

This component uses theme-aware CSS custom properties for consistent styling across light and dark modes. You can customize the appearance by:

1. **Theme Variables**: Modify theme tokens in your `@sparkle/theme` configuration
2. **CSS Classes**: Apply custom CSS classes via the `className` prop
3. **CSS-in-JS**: Use styled-components or emotion with the component

## Accessibility

Supports keyboard navigation, focus management, and screen reader announcements. Use semantic button elements for actions.

## Related Components

No directly related components found.
