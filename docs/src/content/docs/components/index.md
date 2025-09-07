---
title: UI Components
description: Complete reference for all Sparkle UI components
---

# UI Components

This section contains documentation for all components in the `@sparkle/ui` package. Each component includes detailed API documentation, usage examples, and interactive demos.

## Available Components

- [Button](./button) - Button component with theme-aware styling and semantic color variants Uses CSS custom properties from @sparkle/theme for consistent theming across light/dark modes and supports semantic color variants for contextual actions (success, warning, error).
- [Form](./form) - Form component with accessible validation and submission handling
- [FormControl](./form-control) - Form control wrapper component with theme-aware styling that handles input focus and validation Uses CSS custom properties from @sparkle/theme for consistent theming across light/dark modes. Primarily a pass-through wrapper for Radix Form.Control.
- [FormDescription](./form-description) - Form description component with theme-aware styling for providing additional field context Automatically connects to form controls via aria-describedby Uses CSS custom properties from @sparkle/theme for consistent theming.
- [FormField](./form-field) - Form field wrapper component with theme-aware styling that manages accessibility and validation Uses CSS custom properties from @sparkle/theme for consistent theming across light/dark modes and provides proper field grouping.
- [FormInput](./form-input) - Form input component with theme-aware styling for different input types with proper accessibility Uses CSS custom properties from @sparkle/theme for consistent theming across light/dark modes and supports validation states with semantic colors.
- [FormLabel](./form-label) - Form label component with theme-aware styling and proper accessibility associations and required field indicators Uses CSS custom properties from @sparkle/theme for consistent theming across light/dark modes and supports disabled states.
- [FormMessage](./form-message) - Form message component with theme-aware styling for displaying validation feedback Uses CSS custom properties from @sparkle/theme for consistent theming across light/dark modes and supports semantic colors for different message types.
- [FormPassword](./form-password) - Form password component with theme-aware styling and optional show/hide toggle Uses CSS custom properties from @sparkle/theme for consistent theming across light/dark modes and supports validation states with semantic colors.
- [FormSelect](./form-select) - Form select component with theme-aware styling using Radix UI Select primitives Uses CSS custom properties from @sparkle/theme for consistent theming across light/dark modes and supports validation states with semantic colors.
- [FormSelectItem](./form-select-item) - No description available
- [FormSubmit](./form-submit) - Form submit button component with theme-aware styling and proper form association Uses CSS custom properties from @sparkle/theme for consistent theming across light/dark modes and follows the same patterns as the Button component.
- [FormTextarea](./form-textarea) - Form textarea component with theme-aware styling for multi-line text input Uses CSS custom properties from @sparkle/theme for consistent theming across light/dark modes and supports validation states with semantic colors.

## Getting Started

To use any of these components in your project:

```bash
pnpm add @sparkle/ui @sparkle/theme
```

```tsx
import { Button } from '@sparkle/ui'
import '@sparkle/ui/styles.css'

export function MyComponent() {
  return <Button variant="primary">Click me</Button>
}
```

## Component Patterns

All Sparkle UI components follow these patterns:

- **Theme Integration**: Components use CSS custom properties from `@sparkle/theme`
- **Accessibility**: Built with accessibility best practices and ARIA support
- **TypeScript**: Full TypeScript support with detailed prop interfaces
- **Flexible Styling**: Support for custom className props and CSS-in-JS
- **Forward Refs**: All components properly forward refs for library integration
