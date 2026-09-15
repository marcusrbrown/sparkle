---
"@sparkle/docs": patch
---

Drop the workspace-root `typedoc` devDependency workaround now that `typedoc-plugin-frontmatter@1.3.2` declares its own `typedoc` peer dependency (typedoc2md/typedoc-plugin-markdown#891), and bump `typedoc-plugin-frontmatter` to `1.3.2` in `docs/package.json`.
