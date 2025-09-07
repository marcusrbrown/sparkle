---
title: Components Overview
description: Explore Sparkle's comprehensive collection of accessible React components.
---

## Component Library

Sparkle provides a comprehensive set of React components built with accessibility, type safety, and customization in mind. All components are:

- **TypeScript-first** with full type definitions
- **Accessible by default** with ARIA support
- **Themeable** via design tokens
- **Composable** following React patterns

## Component Categories

### Form Elements

Essential form components for user input:

- **Button** - Primary actions and interactions
- **Input** - Text input with validation
- **Select** - Dropdown selection
- **Checkbox** - Boolean selections
- **Radio** - Single choice from options

### Layout

Structural components for page organization:

- **Container** - Content width management
- **Grid** - Responsive grid system
- **Flex** - Flexible box layouts
- **Stack** - Vertical and horizontal spacing

### Navigation

Components for site navigation:

- **Header** - Site header with branding
- **Nav** - Primary navigation
- **Breadcrumbs** - Hierarchical navigation
- **Tabs** - Content organization

### Feedback

Components for user feedback and status:

- **Alert** - Important messages
- **Toast** - Temporary notifications
- **Progress** - Loading and progress indicators
- **Badge** - Status and count indicators

## Getting Started

```tsx
import { Alert, Button, Input } from '@sparkle/ui'

function ContactForm() {
  return (
    <form>
      <Input
        label="Email"
        type="email"
        required
      />
      <Button
        type="submit"
        variant="primary"
      >
        Send Message
      </Button>
      <Alert variant="info">
        We'll respond within 24 hours
      </Alert>
    </form>
  )
}
```

## Component Status

Components are categorized by stability:

- **🟢 Stable** - Production ready, stable API
- **🟡 Beta** - Functional but API may change
- **🔴 Experimental** - Early development, breaking changes expected

## Documentation Format

Each component page includes:

- **API Reference** - Props, types, and methods
- **Live Examples** - Interactive component demos
- **Accessibility** - ARIA patterns and keyboard support
- **Theming** - Customization options
- **Code Examples** - Copy-paste ready code

Browse components by category or use the search to find specific functionality.
