---
title: API Reference
layout: ~/layouts/api.astro
---

[**Sparkle Design System API**](../README.md)

***

[Sparkle Design System API](../README.md) / ui/src

# ui/src

## Type Aliases

### As\<Props\>

> **As**\<`Props`\> = `React.ElementType`\<`Props`\>

Common type definitions for UI components

#### Type Parameters

##### Props

`Props` = `any`

## Variables

### Button

> `const` **Button**: `ForwardRefExoticComponent`\<`ButtonProps` & `RefAttributes`\<`HTMLButtonElement`\>\>

Button component with theme-aware styling and semantic color variants

Uses CSS custom properties from @sparkle/theme for consistent theming
across light/dark modes and supports semantic color variants for
contextual actions (success, warning, error).

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
