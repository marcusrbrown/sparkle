---
"@sparkle/theme": patch
---

Remove `@ts-expect-error` suppressions and `any` typing from the React Native `Appearance` global check in `useColorScheme`, replacing them with local interfaces (`RNAppearancePreferences`, `RNAppearanceApi`, `GlobalWithRNAppearance`) so the optional global is accessed in a type-safe way.
