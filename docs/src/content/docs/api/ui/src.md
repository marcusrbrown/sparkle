---
title: API Reference
layout: ~/layouts/api.astro
---

[**Sparkle Design System API**](../README.md)

***

[Sparkle Design System API](../README.md) / ui/src

# ui/src

## Type Aliases

### As

> **As**\<`Props`\> = `React.ElementType`\<`Props`\>

Common type definitions for UI components

#### Type Parameters

##### Props

`Props` = `any`

## Variables

### Button

> `const` **Button**: `ForwardRefExoticComponent`\<`ButtonProps` & `RefAttributes`\<`HTMLButtonElement`\>\>

Button component with theme-aware styling and semantic color variants

#### Description

A versatile button component that provides theme-aware styling, semantic color variants,
multiple size options, and comprehensive accessibility features. Fully integrated with
the `@sparkle/theme` system for consistent styling across light/dark modes.

#### Features

- **Theme Integration**: Fully integrated with @sparkle/theme system supporting light/dark modes
- **Semantic Colors**: Support for success, warning, and error variants for contextual actions
- **Accessibility**: Full WCAG 2.1 AA compliance with proper focus states and keyboard navigation
- **Size Variants**: Small (sm), medium (md), and large (lg) sizes
- **Style Variants**: Primary, secondary, outline, and ghost appearances
- **Cross-Platform**: Compatible with both web and React Native environments

#### Examples

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

#### Accessibility

- Keyboard navigation: Enter/Space to activate, Tab to focus
- Focus indicators: Visible focus ring for keyboard navigation
- Screen readers: Properly announced with role="button"
- Disabled state: Not keyboard-navigable when disabled
- ARIA support: Use aria-label for icon-only buttons, aria-busy for loading states

#### Theme-tokens

- `--theme-primary-*`: Primary button variants
- `--theme-success-*`: Success semantic variants
- `--theme-warning-*`: Warning semantic variants
- `--theme-error-*`: Error semantic variants
- `--theme-surface-*`: Secondary and ghost variants
- `--theme-border`: Outline variant

#### Best-practices

- Use semantic variants for contextual actions (success, warning, error)
- Provide descriptive text or aria-label for all buttons
- Use appropriate variant hierarchy (primary for main action)
- Include loading states for async actions
- Disable buttons during processing to prevent double-submission

#### See

[Storybook Documentation](https://storybook.sparkle.mrbro.dev/?path=/docs/components-button--docs)

***

### FormControl

> `const` **FormControl**: `ForwardRefExoticComponent`\<`FormControlProps` & `RefAttributes`\<`HTMLInputElement`\>\>

Form control wrapper component with theme-aware styling that handles input focus and validation

Uses CSS custom properties from @sparkle/theme for consistent theming
across light/dark modes. Primarily a pass-through wrapper for Radix Form.Control.

***

### FormDescription

> `const` **FormDescription**: `ForwardRefExoticComponent`\<`FormDescriptionProps` & `RefAttributes`\<`HTMLParagraphElement`\>\>

Form description component with theme-aware styling for providing additional field context

Automatically connects to form controls via aria-describedby
Uses CSS custom properties from @sparkle/theme for consistent theming.

***

### FormField

> `const` **FormField**: `ForwardRefExoticComponent`\<`FormFieldProps` & `RefAttributes`\<`HTMLDivElement`\>\>

Form field wrapper component with theme-aware styling that manages accessibility and validation

Uses CSS custom properties from @sparkle/theme for consistent theming
across light/dark modes and provides proper field grouping.

***

### FormInput

> `const` **FormInput**: `ForwardRefExoticComponent`\<`FormInputProps` & `RefAttributes`\<`HTMLInputElement`\>\>

Form input component with theme-aware styling for different input types with proper accessibility

Uses CSS custom properties from @sparkle/theme for consistent theming
across light/dark modes and supports validation states with semantic colors.

***

### FormLabel

> `const` **FormLabel**: `ForwardRefExoticComponent`\<`FormLabelProps` & `RefAttributes`\<`HTMLLabelElement`\>\>

Form label component with theme-aware styling and proper accessibility associations and required field indicators

Uses CSS custom properties from @sparkle/theme for consistent theming
across light/dark modes and supports disabled states.

***

### FormMessage

> `const` **FormMessage**: `ForwardRefExoticComponent`\<`FormMessageProps` & `RefAttributes`\<`HTMLSpanElement`\>\>

Form message component with theme-aware styling for displaying validation feedback

Uses CSS custom properties from @sparkle/theme for consistent theming
across light/dark modes and supports semantic colors for different message types.

***

### FormPassword

> `const` **FormPassword**: `ForwardRefExoticComponent`\<`FormPasswordProps` & `RefAttributes`\<`HTMLInputElement`\>\>

Form password component with theme-aware styling and optional show/hide toggle

Uses CSS custom properties from @sparkle/theme for consistent theming
across light/dark modes and supports validation states with semantic colors.

***

### FormSelect

> `const` **FormSelect**: `ForwardRefExoticComponent`\<`FormSelectProps` & `RefAttributes`\<`HTMLButtonElement`\>\>

Form select component with theme-aware styling using Radix UI Select primitives

Uses CSS custom properties from @sparkle/theme for consistent theming
across light/dark modes and supports validation states with semantic colors.

***

### FormSubmit

> `const` **FormSubmit**: `ForwardRefExoticComponent`\<`FormSubmitProps` & `RefAttributes`\<`HTMLButtonElement`\>\>

Form submit button component with theme-aware styling and proper form association

Uses CSS custom properties from @sparkle/theme for consistent theming
across light/dark modes and follows the same patterns as the Button component.

***

### FormTextarea

> `const` **FormTextarea**: `ForwardRefExoticComponent`\<`FormTextareaProps` & `RefAttributes`\<`HTMLTextAreaElement`\>\>

Form textarea component with theme-aware styling for multi-line text input

Uses CSS custom properties from @sparkle/theme for consistent theming
across light/dark modes and supports validation states with semantic colors.

## Functions

### createComponent()

> **createComponent**\<`Props`, `DefaultElement`\>(`render`, `defaultElement`): (`props`) => `null` \| `ReactElement`\<`unknown`, `string` \| `JSXElementConstructor`\<`any`\>\> & `object`

Creates a type-safe component factory

#### Type Parameters

##### Props

`Props` *extends* `object`

##### DefaultElement

`DefaultElement` *extends* [`As`](#as)

#### Parameters

##### render

(`props`) => `null` \| `ReactElement`\<`unknown`, `string` \| `JSXElementConstructor`\<`any`\>\>

##### defaultElement

`DefaultElement`

#### Returns

(`props`) => `null` \| `ReactElement`\<`unknown`, `string` \| `JSXElementConstructor`\<`any`\>\> & `object`

***

### cx()

> **cx**(...`args`): `string`

Combines multiple class names into a single string

#### Parameters

##### args

...(`undefined` \| `null` \| `string` \| `false` \| `Record`\<`string`, `boolean`\>)[]

#### Returns

`string`
