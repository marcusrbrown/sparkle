---
title: API Reference
layout: ~/layouts/api.astro
---

[**Sparkle Design System API**](../README.md)

***

[Sparkle Design System API](../README.md) / theme/src

# theme/src

## Classes

### ThemeValidator

Theme configuration validator
Provides comprehensive validation for design token integrity, accessibility compliance,
and platform compatibility

#### Example

```typescript
const validator = new ThemeValidator()
const result = validator.validate(lightTokens)

if (!result.isValid) {
  console.error('Theme validation failed:', result.errors)
}
```

#### Methods

##### validate()

> **validate**(`theme`, `options`): [`ValidationResult`](#validationresult)

Validate a theme configuration

###### Parameters

###### theme

`ThemeConfig`

Theme configuration to validate

###### options

[`ValidationOptions`](#validationoptions) = `{}`

Validation options

###### Returns

[`ValidationResult`](#validationresult)

Validation result with errors and warnings

***

### TokenTransformer

Cross-platform token transformer
Converts design tokens between web (CSS custom properties) and native (React Native StyleSheet) formats

#### Example

```typescript
const transformer = new TokenTransformer()

// Transform to web format
const webResult = transformer.transform(lightTokens, { platform: 'web' })

// Transform to native format
const nativeResult = transformer.transform(lightTokens, { platform: 'native' })
```

#### Methods

##### clearCache()

> **clearCache**(): `void`

Clear transformation cache
Useful when tokens have been updated

###### Returns

`void`

##### getCacheStats()

> **getCacheStats**(): `object`

Get cache statistics

###### Returns

`object`

###### keys

> **keys**: `string`[]

###### size

> **size**: `number`

##### toNative()

> **toNative**(`tokens`, `options`): [`NativeTheme`](#nativetheme)

Transform tokens to native format (React Native StyleSheet)

###### Parameters

###### tokens

`ThemeConfig`

Source theme configuration

###### options

`Omit`\<[`TransformOptions`](#transformoptions), `"platform"`\> = `{}`

Native-specific options

###### Returns

[`NativeTheme`](#nativetheme)

Native theme object

##### toWeb()

> **toWeb**(`tokens`, `options`): [`CSSCustomProperties`](#csscustomproperties)

Transform tokens to web format (CSS custom properties)

###### Parameters

###### tokens

`ThemeConfig`

Source theme configuration

###### options

`Omit`\<[`TransformOptions`](#transformoptions), `"platform"`\> = `{}`

Web-specific options

###### Returns

[`CSSCustomProperties`](#csscustomproperties)

CSS custom properties object

##### transform()

> **transform**(`tokens`, `options`): [`TransformResult`](#transformresult)

Transform design tokens to target platform format

###### Parameters

###### tokens

`ThemeConfig`

Source theme configuration

###### options

[`TransformOptions`](#transformoptions)

Transformation options

###### Returns

[`TransformResult`](#transformresult)

Transformation result with platform-specific tokens

## Interfaces

### CSSCustomProperties

Type for CSS custom properties object

***

### NativeShadowStyle

React Native shadow style properties
Platform-specific shadow handling for iOS and Android

***

### NativeTheme

React Native StyleSheet compatible theme object
Numeric values for dimensions, hex/rgb colors for colors

***

### NativeThemeProviderProps

Props for the NativeThemeProvider component

#### Properties

##### children

> **children**: `ReactNode`

Child components that will have access to the theme context

##### defaultTheme?

> `optional` **defaultTheme**: [`ThemeMode`](#thememode)

Default theme mode to use on first load

###### Default

```ts
'system'
```

##### disableSystemTheme?

> `optional` **disableSystemTheme**: `boolean`

Whether to disable system theme detection

###### Default

```ts
false
```

##### storageKey?

> `optional` **storageKey**: `string`

Storage key for persisting theme preference

###### Default

```ts
'sparkle-theme'
```

##### themes?

> `optional` **themes**: [`ThemeCollection`](#themecollection)

Custom theme configurations to override defaults

###### Default

```ts
{ light: lightTokens, dark: darkTokens }
```

##### updateStatusBar?

> `optional` **updateStatusBar**: `boolean`

Whether to automatically update StatusBar style based on theme

###### Default

```ts
true
```

***

### ThemeCollection

Theme collection mapping theme modes to their configurations

***

### ThemeContextValue

Theme context value interface providing complete theme state and controls

#### Properties

##### activeTheme

> **activeTheme**: [`ThemeMode`](#thememode)

Currently selected theme mode (user preference)

##### error

> **error**: `Error` \| `null`

Error state if theme loading or validation fails

##### isLoading

> **isLoading**: `boolean`

Loading state during theme initialization or transitions

##### setTheme()

> **setTheme**: (`theme`) => `void`

Function to change the theme mode
Handles persistence and CSS variable updates automatically

###### Parameters

###### theme

[`ThemeMode`](#thememode)

###### Returns

`void`

##### systemTheme

> **systemTheme**: [`SystemColorScheme`](#systemcolorscheme)

System detected color scheme (independent of user preference)

##### theme

> **theme**: `ThemeConfig`

Current active theme configuration with all design tokens

***

### ThemePluginOptions

Configuration options for the theme plugin

#### Properties

##### darkMode?

> `optional` **darkMode**: `boolean`

Whether to include dark mode support (default: true)

##### includeCSSVariables?

> `optional` **includeCSSVariables**: `boolean`

Whether to include CSS custom properties in base layer (default: true)

##### prefix?

> `optional` **prefix**: `string`

Prefix for CSS custom properties (default: 'theme')

##### rootSelector?

> `optional` **rootSelector**: `string`

Selector for CSS custom properties (default: ':root')

***

### ThemeProviderProps

Props for the ThemeProvider component

#### Properties

##### children

> **children**: `ReactNode`

Child components that will have access to the theme context

##### cssSelector?

> `optional` **cssSelector**: `string`

CSS selector for injecting CSS variables

###### Default

```ts
':root'
```

##### defaultTheme?

> `optional` **defaultTheme**: [`ThemeMode`](#thememode)

Default theme mode to use on first load

###### Default

```ts
'system'
```

##### disableSystemTheme?

> `optional` **disableSystemTheme**: `boolean`

Whether to disable system theme detection

###### Default

```ts
false
```

##### storageKey?

> `optional` **storageKey**: `string`

Storage key for persisting theme preference

###### Default

```ts
'sparkle-theme'
```

##### themes?

> `optional` **themes**: [`ThemeCollection`](#themecollection)

Custom theme configurations to override defaults

###### Default

```ts
{ light: lightTokens, dark: darkTokens }
```

***

### ThemeShowcaseProps

Theme examples and showcase components (Phase 5)

#### Properties

##### className?

> `optional` **className**: `string`

Additional CSS classes for the showcase container

##### showColorPalette?

> `optional` **showColorPalette**: `boolean`

Whether to show the color palette demonstration

###### Default

```ts
true
```

##### showComponents?

> `optional` **showComponents**: `boolean`

Whether to show component demonstrations

###### Default

```ts
true
```

##### showSemanticColors?

> `optional` **showSemanticColors**: `boolean`

Whether to show semantic color demonstrations

###### Default

```ts
true
```

***

### TransformOptions

Token transformation options

#### Properties

##### baseFontSize?

> `optional` **baseFontSize**: `number`

Base font size for rem calculations (default: 16)

##### flattenColors?

> `optional` **flattenColors**: `boolean`

Whether to flatten nested color objects for easier access (native only)

##### platform

> **platform**: [`Platform`](#platform-2)

Target platform for transformation

##### prefix?

> `optional` **prefix**: `string`

Optional prefix for CSS variables (web only)

##### selector?

> `optional` **selector**: `string`

CSS selector for CSS variables (web only, default: ':root')

***

### TransformResult

Result of token transformation

#### Properties

##### metadata

> **metadata**: `object`

Transformation metadata

###### options

> **options**: [`TransformOptions`](#transformoptions)

###### tokenCount

> **tokenCount**: `number`

###### transformedAt

> **transformedAt**: `string`

##### platform

> **platform**: [`Platform`](#platform-2)

Target platform

##### source

> **source**: `ThemeConfig`

Original theme configuration

##### tokens

> **tokens**: [`NativeTheme`](#nativetheme) \| [`CSSCustomProperties`](#csscustomproperties)

Transformed tokens (CSS variables for web, native theme for mobile)

***

### ValidationError

Validation error with specific context

#### Properties

##### expected?

> `optional` **expected**: `string`

Expected value type or format

##### message

> **message**: `string`

Error message describing the validation failure

##### path

> **path**: `string`

Path to the invalid property (e.g., 'colors.primary.500')

##### severity

> **severity**: `"error"` \| `"warning"`

Severity level of the validation error

##### value

> **value**: `unknown`

The invalid value that caused the error

***

### ValidationOptions

Validation options for theme configuration

#### Properties

##### checkRequiredProperties?

> `optional` **checkRequiredProperties**: `boolean`

Whether to check for missing required properties (default: true)

##### minContrastRatio?

> `optional` **minContrastRatio**: `number`

Minimum contrast ratio for WCAG compliance (default: 4.5 for AA)

##### strictMode?

> `optional` **strictMode**: `boolean`

Whether to treat warnings as errors (default: false)

##### validateColorContrast?

> `optional` **validateColorContrast**: `boolean`

Whether to validate color contrast ratios (default: true)

##### validateCSSValues?

> `optional` **validateCSSValues**: `boolean`

Whether to validate CSS value formats (default: true)

##### validateSpacingScale?

> `optional` **validateSpacingScale**: `boolean`

Whether to validate spacing scale consistency (default: true)

***

### ValidationResult

Validation result containing errors and warnings

#### Properties

##### errors

> **errors**: [`ValidationError`](#validationerror)[]

Array of validation errors found

##### isValid

> **isValid**: `boolean`

Whether the theme configuration is valid

##### summary

> **summary**: `object`

Summary of validation results

###### checkedProperties

> **checkedProperties**: `number`

###### totalErrors

> **totalErrors**: `number`

###### totalWarnings

> **totalWarnings**: `number`

##### warnings

> **warnings**: [`ValidationError`](#validationerror)[]

Array of validation warnings found

## Type Aliases

### Platform

> **Platform** = `"web"` \| `"native"`

Platform target for token transformation

***

### SystemColorScheme

> **SystemColorScheme** = `"light"` \| `"dark"`

System detected color scheme

***

### ThemeMode

> **ThemeMode** = `"light"` \| `"dark"` \| `"system"`

Theme mode options supporting light/dark themes and system preference

## Variables

### baseTokens

> `const` **baseTokens**: `ThemeConfig`

Base design tokens following Design Tokens Community Group specification
These tokens serve as the foundation for all theme variants

#### See

https://design-tokens.github.io/community-group/

***

### darkTokens

> `const` **darkTokens**: `ThemeConfig`

Dark theme tokens extending the base design system
Optimized for dark mode interfaces with appropriate contrast ratios
Following WCAG AA guidelines for accessibility

***

### DEFAULT\_THEME\_STORAGE\_KEY

> `const` **DEFAULT\_THEME\_STORAGE\_KEY**: `"sparkle-theme"` = `'sparkle-theme'`

Default storage key for theme persistence

***

### defaultTransformer

> `const` **defaultTransformer**: [`TokenTransformer`](#tokentransformer)

Default transformer instance for convenience

***

### lightTokens

> `const` **lightTokens**: `ThemeConfig`

Light theme tokens extending the base design system
Optimized for light mode interfaces with appropriate contrast ratios

***

### nativePersistence

> `const` **nativePersistence**: `object`

React Native-specific theme persistence using AsyncStorage

#### Type Declaration

##### isSupported()

> **isSupported**(): `Promise`\<`boolean`\>

Checks if AsyncStorage is available

###### Returns

`Promise`\<`boolean`\>

Promise resolving to true if AsyncStorage is supported and accessible

##### load()

> **load**(`storageKey`): `Promise`\<[`ThemeMode`](#thememode) \| `null`\>

Loads theme preference from AsyncStorage

###### Parameters

###### storageKey

`string` = `DEFAULT_THEME_STORAGE_KEY`

The key to use for AsyncStorage

###### Returns

`Promise`\<[`ThemeMode`](#thememode) \| `null`\>

Promise resolving to the stored theme mode or null if not found

##### remove()

> **remove**(`storageKey`): `Promise`\<`void`\>

Removes theme preference from AsyncStorage

###### Parameters

###### storageKey

`string` = `DEFAULT_THEME_STORAGE_KEY`

The key to use for AsyncStorage

###### Returns

`Promise`\<`void`\>

##### save()

> **save**(`theme`, `storageKey`): `Promise`\<`void`\>

Saves theme preference to AsyncStorage

###### Parameters

###### theme

[`ThemeMode`](#thememode)

The theme mode to save

###### storageKey

`string` = `DEFAULT_THEME_STORAGE_KEY`

The key to use for AsyncStorage

###### Returns

`Promise`\<`void`\>

***

### persistenceMigration

> `const` **persistenceMigration**: `object`

Utility for migrating theme data between storage keys
Useful for updating storage keys while preserving user preferences

#### Type Declaration

##### isValidThemeMode()

> **isValidThemeMode**(`value`): `value is ThemeMode`

Validates that a stored value is a valid theme mode

###### Parameters

###### value

`unknown`

The value to validate

###### Returns

`value is ThemeMode`

true if the value is a valid ThemeMode

##### migrate()

> **migrate**(`oldKey`, `newKey`, `removeOld`): `Promise`\<`boolean`\>

Migrates theme preference from old key to new key

###### Parameters

###### oldKey

`string`

The old storage key

###### newKey

`string`

The new storage key

###### removeOld

`boolean` = `true`

Whether to remove the old key after migration

###### Returns

`Promise`\<`boolean`\>

Promise<boolean> indicating success of migration

***

### ThemeContext

> `const` **ThemeContext**: `Context`\<[`ThemeContextValue`](#themecontextvalue) \| `null`\>

React Context for theme management across the application

This context provides access to:
- Current theme configuration with design tokens
- Theme switching functionality with persistence
- System color scheme detection
- Loading and error states

Must be used within a ThemeProvider or NativeThemeProvider

#### Example

```tsx
const { theme, setTheme, activeTheme } = useTheme();

// Access theme tokens
const primaryColor = theme.colors.primary[500];

// Change theme
setTheme('dark');
```

***

### themePersistence

> `const` **themePersistence**: `object`

Platform-agnostic theme persistence interface
Automatically detects the environment and uses appropriate storage method

#### Type Declaration

##### isSupported()

> **isSupported**(): `boolean` \| `Promise`\<`boolean`\>

Checks if storage is available

###### Returns

`boolean` \| `Promise`\<`boolean`\>

boolean or Promise<boolean> depending on platform

##### load()

> **load**(`storageKey?`): [`ThemeMode`](#thememode) \| `Promise`\<ThemeMode \| null\> \| `null`

Loads theme preference from appropriate storage

###### Parameters

###### storageKey?

`string`

The key to use for storage

###### Returns

[`ThemeMode`](#thememode) \| `Promise`\<ThemeMode \| null\> \| `null`

Theme mode or Promise<ThemeMode> depending on platform

##### remove()

> **remove**(`storageKey?`): `void` \| `Promise`\<`void`\>

Removes theme preference from appropriate storage

###### Parameters

###### storageKey?

`string`

The key to use for storage

###### Returns

`void` \| `Promise`\<`void`\>

void or Promise<void> depending on platform

##### save()

> **save**(`theme`, `storageKey?`): `void` \| `Promise`\<`void`\>

Saves theme preference to appropriate storage

###### Parameters

###### theme

[`ThemeMode`](#thememode)

The theme mode to save

###### storageKey?

`string`

The key to use for storage

###### Returns

`void` \| `Promise`\<`void`\>

void or Promise<void> depending on platform

***

### tokenUtils

> `const` **tokenUtils**: `object`

Utility functions for common token transformations

#### Type Declaration

##### compareThemes()

> **compareThemes**(`theme1`, `theme2`): `string`[]

Compare two theme configurations for differences

###### Parameters

###### theme1

`ThemeConfig`

First theme configuration

###### theme2

`ThemeConfig`

Second theme configuration

###### Returns

`string`[]

Array of differences found

##### extractColorPalette()

> **extractColorPalette**(`theme`, `colorKey`): `Record`\<`string` \| `number`, `string`\> \| `undefined`

Extract specific color palette from theme

###### Parameters

###### theme

`ThemeConfig`

Theme configuration

###### colorKey

`string`

Color key to extract (e.g., 'primary', 'neutral')

###### Returns

`Record`\<`string` \| `number`, `string`\> \| `undefined`

Color scale object

##### getColorNames()

> **getColorNames**(`theme`): `string`[]

Get all semantic color names from theme

###### Parameters

###### theme

`ThemeConfig`

Theme configuration

###### Returns

`string`[]

Array of color names

##### getSpacingKeys()

> **getSpacingKeys**(`theme`): (`string` \| `number`)[]

Get all spacing scale keys

###### Parameters

###### theme

`ThemeConfig`

Theme configuration

###### Returns

(`string` \| `number`)[]

Array of spacing keys

##### mergeThemes()

> **mergeThemes**(`baseTheme`, `overrideTheme`): `ThemeConfig`

Merge two theme configurations with the second overriding the first

###### Parameters

###### baseTheme

`ThemeConfig`

Base theme configuration

###### overrideTheme

`Partial`\<`ThemeConfig`\>

Theme configuration to merge on top

###### Returns

`ThemeConfig`

Merged theme configuration

***

### webPersistence

> `const` **webPersistence**: `object`

Web-specific theme persistence using localStorage

#### Type Declaration

##### isSupported()

> **isSupported**(): `boolean`

Checks if localStorage is available

###### Returns

`boolean`

true if localStorage is supported and accessible

##### load()

> **load**(`storageKey`): [`ThemeMode`](#thememode) \| `null`

Loads theme preference from localStorage

###### Parameters

###### storageKey

`string` = `DEFAULT_THEME_STORAGE_KEY`

The key to use for localStorage

###### Returns

[`ThemeMode`](#thememode) \| `null`

The stored theme mode or null if not found

##### remove()

> **remove**(`storageKey`): `void`

Removes theme preference from localStorage

###### Parameters

###### storageKey

`string` = `DEFAULT_THEME_STORAGE_KEY`

The key to use for localStorage

###### Returns

`void`

##### save()

> **save**(`theme`, `storageKey`): `void`

Saves theme preference to localStorage

###### Parameters

###### theme

[`ThemeMode`](#thememode)

The theme mode to save

###### storageKey

`string` = `DEFAULT_THEME_STORAGE_KEY`

The key to use for localStorage

###### Returns

`void`

## Functions

### createNativeStyleUtils()

> **createNativeStyleUtils**(`nativeTheme`): `object`

Creates a React Native StyleSheet from native theme tokens
Convenience function for creating common styles

#### Parameters

##### nativeTheme

[`NativeTheme`](#nativetheme)

Native theme object

#### Returns

`object`

Object with common style utilities

##### borderRadius

> **borderRadius**: `object`

###### Index Signature

\[`k`: `string`\]: `object`

##### colors

> **colors**: `object`

###### Index Signature

\[`key`: `string`\]: \{ `backgroundColor`: `string`; \} \| \{ `color`: `string`; \}

##### shadows

> **shadows**: `Record`\<`string`, [`NativeShadowStyle`](#nativeshadowstyle)\> = `nativeTheme.shadows`

##### spacing

> **spacing**: `object`

###### Index Signature

\[`key`: `string`\]: \{ `padding`: `number`; \} \| \{ `margin`: `number`; \}

##### typography

> **typography**: `object`

###### Index Signature

\[`k`: `string`\]: `object`

#### Example

```typescript
const theme = generateNativeTheme(lightTokens)
const styleUtils = createNativeStyleUtils(theme)

// Use in component
<View style={[styleUtils.spacing.p4, styleUtils.colors.bgPrimary]} />
```

***

### createThemePlugin()

> **createThemePlugin**(`themes`, `options`): `PluginWithConfig`

Creates a Tailwind CSS plugin for theme integration

#### Parameters

##### themes

`Record`\<`string`, `ThemeConfig`\>

##### options

[`ThemePluginOptions`](#themepluginoptions) = `{}`

#### Returns

`PluginWithConfig`

***

### cssPropertiesToString()

> **cssPropertiesToString**(`cssVariables`, `selector`): `string`

Converts CSS custom properties object to CSS string
for injection into stylesheets or CSS-in-JS

#### Parameters

##### cssVariables

[`CSSCustomProperties`](#csscustomproperties)

Object of CSS custom properties

##### selector

`string` = `':root'`

CSS selector to apply variables to (default: ':root')

#### Returns

`string`

CSS string with custom properties

#### Example

```typescript
const cssString = cssPropertiesToString(cssVars)
// Returns: ':root { --sparkle-color-primary-500: #3b82f6; }'
```

***

### cssVar()

> **cssVar**(`category`, `key`, `fallback?`, `prefix?`): `string`

Creates CSS variable reference string for use in other CSS

#### Parameters

##### category

`string`

Token category (e.g., 'color', 'spacing')

##### key

`string`

Token key path (e.g., 'primary-500', 'md')

##### fallback?

`string`

Optional fallback value

##### prefix?

`string` = `'sparkle'`

Optional prefix (default: 'sparkle')

#### Returns

`string`

CSS var() function string

#### Example

```typescript
cssVar('color', 'primary-500')
// Returns: 'var(--sparkle-color-primary-500)'

cssVar('spacing', 'md', '1rem', 'app')
// Returns: 'var(--app-spacing-md, 1rem)'
```

***

### generateCSSVariables()

> **generateCSSVariables**(`tokens`, `prefix`): [`CSSCustomProperties`](#csscustomproperties)

Generates CSS custom properties (CSS variables) from design tokens
for web platform integration with Tailwind CSS and other frameworks

#### Parameters

##### tokens

`ThemeConfig`

Theme configuration object with design tokens

##### prefix

`string` = `'sparkle'`

Optional prefix for CSS variable names (default: 'sparkle')

#### Returns

[`CSSCustomProperties`](#csscustomproperties)

Object of CSS custom properties that can be applied to :root

#### Example

```typescript
const cssVars = generateCSSVariables(lightTokens)
// Returns: { '--sparkle-color-primary-500': '#3b82f6', ... }
```

***

### generateNativeTheme()

> **generateNativeTheme**(`tokens`, `options`): [`NativeTheme`](#nativetheme)

Generates React Native StyleSheet compatible theme object from design tokens
Converts CSS values to React Native compatible numeric and string values

#### Parameters

##### tokens

`ThemeConfig`

Theme configuration object with design tokens

##### options

Configuration options for conversion

###### baseFontSize?

`number`

Base font size for rem conversion (default: 16)

###### flattenColors?

`boolean`

Whether to flatten nested color objects (default: true)

#### Returns

[`NativeTheme`](#nativetheme)

Native theme object compatible with React Native StyleSheet

#### Example

```typescript
const nativeTheme = generateNativeTheme(lightTokens)
const styles = StyleSheet.create({
  container: {
    backgroundColor: nativeTheme.colors.background.primary,
    padding: nativeTheme.spacing[4],
  }
})
```

***

### generateThemeCSS()

> **generateThemeCSS**(`tokens`, `options`): `string`

Generates CSS custom properties string directly from theme tokens
Convenience function that combines generateCSSVariables and cssPropertiesToString

#### Parameters

##### tokens

`ThemeConfig`

Theme configuration object

##### options

Configuration options

###### prefix?

`string`

Optional prefix for CSS variable names (default: 'sparkle')

###### selector?

`string`

CSS selector to apply variables to (default: ':root')

#### Returns

`string`

CSS string ready for injection

#### Example

```typescript
const css = generateThemeCSS(lightTokens, { prefix: 'app' })
document.querySelector('style')?.appendChild(document.createTextNode(css))
```

***

### isValidTheme()

> **isValidTheme**(`theme`): `boolean`

Check if a theme configuration passes basic validation
Quick boolean check without detailed error information

#### Parameters

##### theme

`ThemeConfig`

Theme configuration to check

#### Returns

`boolean`

Whether the theme is valid

***

### NativeThemeProvider()

> **NativeThemeProvider**(`__namedParameters`): `Element`

NativeThemeProvider component for React Native applications

Provides theme management functionality with:
- Automatic system theme detection using Appearance API
- AsyncStorage persistence
- StatusBar style integration
- Theme validation and error handling

#### Parameters

##### \_\_namedParameters

[`NativeThemeProviderProps`](#nativethemeproviderprops)

#### Returns

`Element`

#### Example

```tsx
function App() {
  return (
    <NativeThemeProvider defaultTheme="system">
      <YourAppComponents />
    </NativeThemeProvider>
  );
}
```

***

### parseNumericValue()

> **parseNumericValue**(`value`, `baseFontSize`): `number`

Converts a CSS dimension string to a React Native numeric value
Handles rem, px, and numeric values

#### Parameters

##### value

CSS dimension string (e.g., '1rem', '16px', '1.5')

`string` | `number`

##### baseFontSize

`number` = `16`

Base font size for rem conversion (default: 16)

#### Returns

`number`

Numeric value for React Native

#### Example

```typescript
parseNumericValue('1rem') // Returns: 16
parseNumericValue('24px') // Returns: 24
parseNumericValue('1.5') // Returns: 1.5
```

***

### parseShadow()

> **parseShadow**(`boxShadow`): [`NativeShadowStyle`](#nativeshadowstyle)

Converts CSS box-shadow to React Native shadow properties
Attempts to extract shadow values for cross-platform compatibility

#### Parameters

##### boxShadow

`string`

CSS box-shadow string

#### Returns

[`NativeShadowStyle`](#nativeshadowstyle)

Native shadow style object

#### Example

```typescript
parseShadow('0 4px 6px rgba(0, 0, 0, 0.1)')
// Returns: { shadowOffset: { width: 0, height: 4 }, shadowRadius: 6, ... }
```

***

### ThemeProvider()

> **ThemeProvider**(`__namedParameters`): `Element`

ThemeProvider component for web applications

Provides theme management functionality with:
- Automatic system theme detection
- localStorage persistence
- CSS variable injection
- Theme validation and error handling

#### Parameters

##### \_\_namedParameters

[`ThemeProviderProps`](#themeproviderprops)

#### Returns

`Element`

#### Example

```tsx
function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <YourAppComponents />
    </ThemeProvider>
  );
}
```

***

### ThemeShowcase()

> **ThemeShowcase**(`__namedParameters`): `Element`

ThemeShowcase component demonstrating all theme features

This component provides a comprehensive demonstration of the theme system
including color palettes, semantic colors, and themed UI components.

#### Parameters

##### \_\_namedParameters

[`ThemeShowcaseProps`](#themeshowcaseprops)

#### Returns

`Element`

***

### useColorScheme()

> **useColorScheme**(): `"light"` \| `"dark"`

Custom hook for detecting system color scheme preference
Works on both web (via matchMedia) and React Native (via Appearance API)

#### Returns

`"light"` \| `"dark"`

Current system color scheme ('light' or 'dark')

***

### useTheme()

> **useTheme**(): [`ThemeContextValue`](#themecontextvalue)

Custom hook for consuming theme context

#### Returns

[`ThemeContextValue`](#themecontextvalue)

Theme context value with current theme and controls

#### Throws

Error if used outside of ThemeProvider or NativeThemeProvider

***

### validateTheme()

> **validateTheme**(`theme`, `options?`): [`ValidationResult`](#validationresult)

Quick validation function for theme configuration
Convenience function that creates a validator instance and runs validation

#### Parameters

##### theme

`ThemeConfig`

Theme configuration to validate

##### options?

[`ValidationOptions`](#validationoptions)

Validation options

#### Returns

[`ValidationResult`](#validationresult)

Validation result

#### Example

```typescript
const result = validateTheme(lightTokens, { strictMode: true })
if (!result.isValid) {
  console.error('Theme validation failed')
}
```
