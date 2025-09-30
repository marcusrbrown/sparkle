# Legacy Documentation (Deprecated)

> **⚠️ This directory is deprecated as of September 30, 2025**

All content from this directory has been migrated to the main documentation site at `docs/src/content/docs/`.

## Migration Summary

- **best-practices-for-sparkle-development.md** → Content was mostly generic monorepo best practices with external references. Core Sparkle-specific patterns are documented in the main documentation site.
- **development-workflows.md** → Migrated to `docs/src/content/docs/development/workflows.md`
- **troubleshooting-guide.md** → Migrated to `docs/src/content/docs/development/troubleshooting.md`
- **project-guide.md** → Content merged into existing `docs/src/content/docs/getting-started/project-structure.md`

## Current Documentation

Visit the Sparkle documentation site:

- **Online**: https://sparkle.mrbro.dev
- **Local**: Run `pnpm --filter @sparkle/docs dev` from the repository root

## Why This Directory Was Deprecated

1. **Duplication**: Content was duplicated between docs-legacy and the main docs site
2. **Consistency**: Having multiple documentation locations created confusion
3. **Maintenance**: Updates were not consistently applied across both locations
4. **Discoverability**: The main Astro Starlight documentation site provides better navigation and search

## Accessing Documentation

### For Development Workflows

See [Development Workflows](../docs/src/content/docs/development/workflows.md) for:

- Fast development startup sequences
- Enhanced build processes
- Incremental TypeScript compilation
- Workspace validation and health checks
- Performance monitoring

### For Troubleshooting

See [Troubleshooting Guide](../docs/src/content/docs/development/troubleshooting.md) for:

- Quick diagnostics
- Common issues and solutions
- Environment setup issues
- Recovery procedures
- Getting help

### For Project Structure

See [Project Structure](../docs/src/content/docs/getting-started/project-structure.md) for:

- Monorepo organization
- Package architecture
- Dependency graph
- Package deep dives

## Removal Timeline

This directory will be removed in a future major version release. Please update any references to point to the main documentation site.
