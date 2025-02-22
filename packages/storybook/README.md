# Sparkle Storybook

This package contains the Storybook configuration for the Sparkle monorepo. It serves as a central development environment and documentation hub for all UI components across packages.

## Getting Started

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Start Storybook development server:

   ```bash
   pnpm dev
   ```

3. Build static Storybook:

   ```bash
   pnpm build
   ```

4. Preview built Storybook:
   ```bash
   pnpm preview
   ```

## Adding Stories

1. Create stories in your package's `src` directory with the `.stories.tsx` extension
2. Stories will be automatically discovered and included in Storybook
3. Follow the standard Storybook format:

   ```tsx
   import type {Meta, StoryObj} from "@storybook/react"
   import {YourComponent} from "./YourComponent"

   const meta = {
     title: "Components/YourComponent",
     component: YourComponent,
   } satisfies Meta<typeof YourComponent>

   export default meta
   type Story = StoryObj<typeof meta>

   export const Default: Story = {
     args: {
       // Your component props here
     },
   }
   ```

## Features

- Central development environment for all UI components
- Automatic discovery of stories across all packages
- Interactive documentation and testing
- Component playground with controls
- Responsive design testing
- Accessibility checks
- Documentation through MDX

## Best Practices

1. Write comprehensive documentation for each component
2. Include multiple story variants to showcase different use cases
3. Use controls to demonstrate component flexibility
4. Add accessibility information and test cases
5. Keep stories focused and maintainable
