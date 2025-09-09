// @ts-check
import react from '@astrojs/react'
import starlight from '@astrojs/starlight'
import {defineConfig} from 'astro/config'

// https://astro.build/config
export default defineConfig({
  site: 'https://sparkle.mrbro.dev',
  integrations: [
    react(),
    starlight({
      title: 'Sparkle Design System',
      description:
        'Comprehensive documentation for the Sparkle Design System - TypeScript-first component library with cross-platform design tokens, automated testing, and interactive examples.',
      logo: {
        src: './src/assets/sparkle-logo.svg',
        replacesTitle: false,
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub Repository',
          href: 'https://github.com/marcusrbrown/sparkle',
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/marcusrbrown/sparkle/edit/main/docs/',
      },
      customCss: [
        // Path to custom CSS file for Sparkle theme customization
        './src/styles/custom.css',
      ],
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 4,
      },
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            {label: 'Introduction', slug: 'getting-started/introduction'},
            {label: 'Installation', slug: 'getting-started/installation'},
            {label: 'Quick Start', slug: 'getting-started/quick-start'},
            {label: 'Project Structure', slug: 'getting-started/project-structure'},
          ],
        },
        {
          label: 'UI Components',
          badge: 'New',
          items: [
            {label: 'Overview', slug: 'components/overview'},
            {label: 'Architecture', slug: 'components/architecture'},
            {label: 'Component Reference', slug: 'components/reference'},
            {label: 'Button', slug: 'components/button'},
            {label: 'Form', slug: 'components/form'},
          ],
        },
        {
          label: 'Interactive Playground',
          badge: 'Demo',
          items: [
            {label: 'Interactive Demos', slug: 'playground/interactive-demos'},
            {label: 'Button Example', slug: 'playground/button-example'},
            {label: 'Live Code Editor', slug: 'playground/live-code-editor'},
          ],
        },
        {
          label: 'Theme System',
          badge: 'Core',
          items: [
            {label: 'Overview', slug: 'theme/overview'},
            {label: 'Design Tokens', slug: 'theme/design-tokens'},
            {label: 'Customization', slug: 'theme/customization'},
            {label: 'Cross-Platform', slug: 'theme/cross-platform'},
          ],
        },
        {
          label: 'TypeScript Types',
          items: [
            {label: 'Overview', slug: 'types/overview'},
            {label: 'Interfaces', slug: 'types/interfaces'},
            {label: 'Type Patterns', slug: 'types/patterns'},
          ],
        },
        {
          label: 'Utilities',
          items: [
            {label: 'Overview', slug: 'utils/overview'},
            {label: 'React Hooks', slug: 'utils/react-hooks'},
            {label: 'String Utilities', slug: 'utils/string-utilities'},
          ],
        },
        {
          label: 'Error Testing',
          items: [
            {label: 'Overview', slug: 'error-testing/overview'},
            {label: 'Test Builder', slug: 'error-testing/test-builder'},
            {label: 'Testing Strategies', slug: 'error-testing/testing-strategies'},
          ],
        },
        {
          label: 'Development',
          items: [
            {label: 'Contributing', slug: 'development/contributing'},
            {label: 'React Integration Test', slug: 'development/react-integration-test'},
          ],
        },
        {
          label: 'API Reference',
          autogenerate: {directory: 'reference'},
        },
      ],
    }),
  ],
  vite: {
    optimizeDeps: {
      include: ['@monaco-editor/react', 'monaco-editor'],
    },
    worker: {
      format: 'es',
    },
    define: {
      // Monaco Editor environment variables
      global: 'globalThis',
    },
  },
})
