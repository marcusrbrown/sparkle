---
"@sparkle/ui": patch
---

Fix `ButtonProps` to extend `React.ButtonHTMLAttributes<HTMLButtonElement>` instead of the generic `HTMLProperties<HTMLButtonElement>`, so native button attributes (`disabled`, `type`, `form`, `autoFocus`, etc.) are actually part of the public type. Previously `ButtonProps` only inherited generic `HTMLAttributes`, which does not include `disabled`, despite the component's own JSDoc example and Tailwind `disabled:*` variants assuming it was supported. Consumers had to reach for an `as any` cast to pass `disabled` (as seen in the Storybook stories, now fixed to use the prop directly).
