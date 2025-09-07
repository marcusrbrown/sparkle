---
title: Contributing to Sparkle
description: Guidelines for contributing to the Sparkle Design System.
---

Thank you for your interest in contributing to Sparkle! This guide will help you get started.

## Development Setup

1. **Clone the repository**

```bash
git clone https://github.com/marcusrbrown/sparkle.git
cd sparkle
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Start development**

```bash
pnpm dev
```

## Project Structure

The Sparkle monorepo is organized with focused packages:

- `packages/ui` - React component library
- `packages/theme` - Design tokens and providers
- `packages/types` - TypeScript definitions
- `packages/utils` - Utility functions
- `packages/error-testing` - Testing framework

## Development Workflow

1. **Create a feature branch** from `main`
2. **Make your changes** with tests
3. **Run quality checks** with `pnpm check`
4. **Submit a pull request** with clear description

## Code Standards

- Follow TypeScript best practices
- Write comprehensive tests
- Include JSDoc documentation
- Follow accessibility guidelines

## Getting Help

- Open an issue for bugs or feature requests
- Join discussions in GitHub Discussions
- Check existing documentation and examples
