# @sparkle/ui

A modern, accessible, and type-safe UI component library built with React and TypeScript.

## Features

- 🎨 Modern design system with customizable themes
- 📦 Tree-shakeable ESM package
- 🔒 Type-safe components with full TypeScript support
- ♿️ Accessible components following WAI-ARIA guidelines
- 🧪 Comprehensive test coverage
- 📚 Detailed documentation and examples

## Installation

```bash
pnpm add @sparkle/ui
```

## Usage

```tsx
import {Button} from "@sparkle/ui"

function App() {
  return (
    <Button variant="primary" size="md">
      Click me
    </Button>
  )
}
```

## Components

### Button

A versatile button component with multiple variants and sizes.

```tsx
<>
  <Button variant="primary" size="md">
    Primary Button
  </Button>

  <Button variant="secondary" size="sm">
    Secondary Button
  </Button>

  <Button variant="outline" size="lg">
    Outline Button
  </Button>
</>
```

## Development

### Setup

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Start development: `pnpm dev`

### Commands

- `pnpm build` - Build the package
- `pnpm test` - Run tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Run tests with coverage report

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT © [Your Name]
