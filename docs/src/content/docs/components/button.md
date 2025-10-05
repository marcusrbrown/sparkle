---
title: Button
description: "Button component with theme-aware styling and semantic color variants"
---

# Button

Button component with theme-aware styling and semantic color variants

## Import

```tsx
import { Button } from '@sparkle/ui'
```

## Props

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `variant` | `"primary" \| "secondary" \| "outline" \| "ghost" \| undefined` |  | `` | The visual style variant of the button |
| `size` | `"sm" \| "md" \| "lg" \| undefined` |  | `` | The size of the button |
| `semantic` | `"default" \| "success" \| "warning" \| "error" \| undefined` |  | `` | The semantic color variant for contextual styling |

## Examples

### Basic usage

```tsx
import { Button } from '@sparkle/ui'

function Example() {
  return (
    <Button onClick={() => console.log('Clicked!')}>
      Click Me
    </Button>
  )
}
```

### Style variants

```tsx
<>
  // High emphasis primary button
  <Button variant="primary">Save Changes</Button>

  // Medium emphasis secondary button
  <Button variant="secondary">Cancel</Button>

  // Low emphasis outline button
  <Button variant="outline">Learn More</Button>

  // Minimal ghost button
  <Button variant="ghost">Dismiss</Button>
</>
```

### Semantic colors for contextual actions

```tsx
<>
  // Success action (positive outcome)
  <Button variant="primary" semantic="success">
    Approve Request
  </Button>

  // Warning action (proceed with caution)
  <Button variant="primary" semantic="warning">
    Archive Item
  </Button>

  // Error action (destructive)
  <Button variant="primary" semantic="error">
    Delete Account
  </Button>
</>
```

### Size variants

```tsx
<>
  // Small button for compact UI
  <Button size="sm">Small</Button>

  // Default medium size
  <Button size="md">Medium</Button>

  // Large button for hero sections
  <Button size="lg">Large CTA</Button>
</>
```

### Form submission

```tsx
function ContactForm() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
  }

  return (
    <form onSubmit={handleSubmit}>
      <Button type="submit" variant="primary" size="lg">
        Send Message
      </Button>
    </form>
  )
}
```

### Loading state

```tsx
function SaveButton() {
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await saveData()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Button onClick={handleSave} disabled={isSaving} semantic="success">
      {isSaving ? 'Saving...' : 'Save Changes'}
    </Button>
  )
}
```

### Button with icons

```tsx
import { PlusIcon } from '@your-icon-library'

<>
  // Icon + Text
  <Button variant="primary">
    <PlusIcon className="w-4 h-4 mr-2" />
    Add Item
  </Button>

  // Icon only (with proper aria-label)
  <Button variant="ghost" aria-label="Delete item">
    <TrashIcon className="w-5 h-5" />
  </Button>
</>
```

### Confirmation dialog

```tsx
function DeleteConfirmation({ onConfirm, onCancel }) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button variant="primary" semantic="error" onClick={onConfirm}>
        Delete
      </Button>
    </div>
  )
}
```

## Features

**Theme Integration**: Fully integrated with @sparkle/theme system supporting light/dark modes

- **Semantic Colors**: Support for success, warning, and error variants for contextual actions
- **Accessibility**: Full WCAG 2.1 AA compliance with proper focus states and keyboard navigation
- **Size Variants**: Small (sm), medium (md), and large (lg) sizes
- **Style Variants**: Primary, secondary, outline, and ghost appearances
- **Cross-Platform**: Compatible with both web and React Native environments

## Best Practices

- Use semantic variants for contextual actions (success, warning, error)
- Provide descriptive text or aria-label for all buttons
- Use appropriate variant hierarchy (primary for main action)
- Include loading states for async actions
- Disable buttons during processing to prevent double-submission

## Theme Integration

This component uses CSS custom properties from `@sparkle/theme` for consistent styling across light and dark modes.

### Design Tokens Used

- `--theme-primary-*`: Primary button variants
- `--theme-success-*`: Success semantic variants
- `--theme-warning-*`: Warning semantic variants
- `--theme-error-*`: Error semantic variants
- `--theme-surface-*`: Secondary and ghost variants
- `--theme-border`: Outline variant

You can customize the appearance by:

1. **Theme Variables**: Modify theme tokens in your `@sparkle/theme` configuration
2. **CSS Classes**: Apply custom CSS classes via the `className` prop
3. **CSS-in-JS**: Use styled-components or emotion with the component

## Accessibility

Keyboard navigation: Enter/Space to activate, Tab to focus

- Focus indicators: Visible focus ring for keyboard navigation
- Screen readers: Properly announced with role="button"
- Disabled state: Not keyboard-navigable when disabled
- ARIA support: Use aria-label for icon-only buttons, aria-busy for loading states

## Related Components

No directly related components found.

## Additional Resources

- [View source code](https://github.com/marcusrbrown/sparkle/blob/main/packages/ui/src/components/Button/Button.tsx)
- [API Documentation](/api/ui/src#button)
