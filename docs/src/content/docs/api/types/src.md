---
title: API Reference
layout: ~/layouts/api.astro
---

[**Sparkle Design System API**](../README.md)

***

[Sparkle Design System API](../README.md) / types/src

# types/src

## Interfaces

### AnimationScale

Animation scale for durations, easing curves, and transitions

***

### ApiResponse\<T\>

Common API response types

#### Type Parameters

##### T

`T` = `unknown`

***

### BaseProps

Common component prop types

#### Extended by

- [`FieldProps`](#fieldprops)
- [`FormMessageProps`](#formmessageprops)

***

### BorderRadiusScale

Border radius scale for consistent corner radius values

***

### ColorScale

Color scale definition for theme colors
Supports both named colors and numeric scales (50, 100, 200, etc.)

***

### FieldProps

Common form field props

#### Extends

- [`BaseProps`](#baseprops)

#### Extended by

- [`FormFieldProps`](#formfieldprops)

***

### FormFieldProps

Extended form field props for advanced form components

#### Extends

- [`FieldProps`](#fieldprops)

#### Properties

##### name

> **name**: `string`

Field name for form submission and validation

##### size?

> `optional` **size**: `"sm"` \| `"md"` \| `"lg"`

Size variant for the field

##### type?

> `optional` **type**: `"text"` \| `"email"` \| `"password"` \| `"textarea"` \| `"select"`

Field type for input elements

##### validationState?

> `optional` **validationState**: `"default"` \| `"error"` \| `"success"`

Validation state of the field

***

### FormMessageProps

Form validation message props

#### Extends

- [`BaseProps`](#baseprops)

#### Properties

##### match()?

> `optional` **match**: (`value`, `formData`) => `boolean` \| `Promise`\<`boolean`\>

Custom validation function

###### Parameters

###### value

`string`

###### formData

`FormData`

###### Returns

`boolean` \| `Promise`\<`boolean`\>

##### validationType?

> `optional` **validationType**: `"valueMissing"` \| `"typeMismatch"` \| `"patternMismatch"` \| `"tooLong"` \| `"tooShort"` \| `"rangeUnderflow"` \| `"rangeOverflow"` \| `"stepMismatch"` \| `"badInput"`

Built-in validation type

***

### PaginationParams

Common pagination parameters

***

### ShadowScale

Shadow scale for box shadows and elevation

***

### SpacingScale

Spacing scale for consistent spacing values

***

### ThemeConfig

Comprehensive theme configuration with design token system
Compatible with both Tailwind CSS (web) and React Native StyleSheet (mobile)

#### Properties

##### animation

> **animation**: [`AnimationScale`](#animationscale)

Animation system for durations, easing, and transitions

##### borderRadius

> **borderRadius**: [`BorderRadiusScale`](#borderradiusscale)

Border radius system for consistent corner treatments

##### colors

> **colors**: [`ColorScale`](#colorscale)

Color system with semantic and brand colors
Supports nested scales (e.g., primary: { 50: '#...', 500: '#...' })

##### shadows

> **shadows**: [`ShadowScale`](#shadowscale)

Shadow system for elevation and depth

##### spacing

> **spacing**: [`SpacingScale`](#spacingscale)

Spacing scale for margins, padding, gaps, and layout

##### typography

> **typography**: [`TypographyScale`](#typographyscale)

Typography system with fonts, sizes, weights, and spacing

***

### TypographyScale

Typography scale with font families, sizes, weights, and line heights

***

### User

Common user types
