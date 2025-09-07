---
title: API Reference
layout: ~/layouts/api.astro
---

[**Sparkle Design System API**](../README.md)

***

[Sparkle Design System API](../README.md) / utils/src

# utils/src

## Functions

### slugify()

> **slugify**(`str`): `string`

Generates a URL-friendly slug from a string

#### Parameters

##### str

`string`

The input string

#### Returns

`string`

The slugified string

***

### toKebabCase()

> **toKebabCase**(`str`): `string`

Converts a string to kebab case

#### Parameters

##### str

`string`

The input string

#### Returns

`string`

The kebab-cased string

***

### toTitleCase()

> **toTitleCase**(`str`): `string`

Capitalizes the first letter of each word in a string

#### Parameters

##### str

`string`

The input string

#### Returns

`string`

The title-cased string

***

### truncate()

> **truncate**(`str`, `maxLength`): `string`

Truncates a string to a maximum length with ellipsis

#### Parameters

##### str

`string`

The input string

##### maxLength

`number`

The maximum length

#### Returns

`string`

The truncated string

***

### useAsync()

> **useAsync**\<`T`\>(`asyncFn`): \[`boolean`, `null` \| `Error`, (...`args`) => `Promise`\<`ReturnType`\<`T`\>\>\]

Custom hook for handling async operations safely

#### Type Parameters

##### T

`T` *extends* (...`args`) => `Promise`\<`any`\>

#### Parameters

##### asyncFn

`T`

The async function to execute

#### Returns

\[`boolean`, `null` \| `Error`, (...`args`) => `Promise`\<`ReturnType`\<`T`\>\>\]

Tuple containing loading state, error state, and memoized callback

***

### useClickOutside()

> **useClickOutside**\<`T`\>(`handler`): `RefObject`\<`null` \| `T`\>

Custom hook for handling click outside events

#### Type Parameters

##### T

`T` *extends* `HTMLElement`

#### Parameters

##### handler

() => `void`

The callback to execute when clicking outside

#### Returns

`RefObject`\<`null` \| `T`\>

Ref to attach to the element

***

### useDebounce()

> **useDebounce**\<`T`\>(`value`, `delay`): `T`

Custom hook for debouncing values

#### Type Parameters

##### T

`T`

#### Parameters

##### value

`T`

The value to debounce

##### delay

`number`

The delay in milliseconds

#### Returns

`T`

The debounced value
