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
        // Getting Started Section - Foundational information
        {
          label: 'Getting Started',
          items: [
            {label: 'Introduction', slug: 'getting-started/introduction'},
            {label: 'Installation', slug: 'getting-started/installation'},
            {label: 'Quick Start', slug: 'getting-started/quick-start'},
            {label: 'Project Structure', slug: 'getting-started/project-structure'},
          ],
        },

        // Core System Documentation
        {
          label: 'Design System',
          collapsed: false,
          items: [
            // Theme System - Core foundation
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
            // TypeScript Types - Type definitions
            {
              label: 'TypeScript Types',
              badge: 'Types',
              items: [
                {label: 'Overview', slug: 'types/overview'},
                {label: 'Interfaces', slug: 'types/interfaces'},
                {label: 'Type Patterns', slug: 'types/patterns'},
              ],
            },
          ],
        },

        // Component Library Section
        {
          label: 'Component Library',
          collapsed: false,
          items: [
            // Component Overview and Architecture
            {label: 'Overview', slug: 'components/overview'},
            {label: 'Architecture', slug: 'components/architecture'},

            // Core Components
            {
              label: 'Core Components',
              items: [{label: 'Button', slug: 'components/button'}],
            },

            // Form Components - Grouped for better organization
            {
              label: 'Form Components',
              collapsed: true,
              items: [
                {label: 'Form Container', slug: 'components/form'},
                {label: 'Form Control', slug: 'components/form-control'},
                {label: 'Form Field', slug: 'components/form-field'},
                {label: 'Form Input', slug: 'components/form-input'},
                {label: 'Form Label', slug: 'components/form-label'},
                {label: 'Form Message', slug: 'components/form-message'},
                {label: 'Form Password', slug: 'components/form-password'},
                {label: 'Form Select', slug: 'components/form-select'},
                {label: 'Form Textarea', slug: 'components/form-textarea'},
                {label: 'Form Submit', slug: 'components/form-submit'},
                {label: 'Form Description', slug: 'components/form-description'},
              ],
            },

            // Complete Component Reference
            {label: 'Complete Reference', slug: 'components/reference'},
          ],
        },

        // Utilities and Tools
        {
          label: 'Utilities & Tools',
          collapsed: true,
          items: [
            // React Utilities
            {
              label: 'React Utilities',
              items: [
                {label: 'Overview', slug: 'utils/overview'},
                {label: 'React Hooks', slug: 'utils/react-hooks'},
                {label: 'String Utilities', slug: 'utils/string-utilities'},
              ],
            },
            // Testing Tools
            {
              label: 'Testing Framework',
              badge: 'Testing',
              items: [
                {label: 'Overview', slug: 'error-testing/overview'},
                {label: 'Test Builder', slug: 'error-testing/test-builder'},
                {label: 'Testing Strategies', slug: 'error-testing/testing-strategies'},
              ],
            },
          ],
        },

        // Interactive Features
        {
          label: 'Interactive Features',
          badge: 'Demo',
          collapsed: true,
          items: [
            {label: 'Interactive Demos', slug: 'playground/interactive-demos'},
            {label: 'Component Examples', slug: 'playground/button-example'},
            {label: 'Live Code Editor', slug: 'playground/live-code-editor'},
            {label: 'Copy Demo', slug: 'playground/copy-demo'},
          ],
        },

        // API Documentation
        {
          label: 'API Reference',
          badge: 'API',
          collapsed: true,
          items: [
            {label: 'API Overview', slug: 'api/readme'},
            {
              label: 'Package APIs',
              items: [
                {
                  label: 'UI Components',
                  autogenerate: {directory: 'api/ui'},
                },
                {
                  label: 'Theme System',
                  autogenerate: {directory: 'api/theme'},
                },
                {
                  label: 'Types',
                  autogenerate: {directory: 'api/types'},
                },
                {
                  label: 'Utilities',
                  autogenerate: {directory: 'api/utils'},
                },
                {
                  label: 'Error Testing',
                  autogenerate: {directory: 'api/error-testing'},
                },
              ],
            },
          ],
        },

        // Development and Contributing
        {
          label: 'Development',
          badge: 'Dev',
          collapsed: true,
          items: [
            {label: 'Contributing Guide', slug: 'development/contributing'},
            {label: 'React Integration Test', slug: 'development/react-integration-test'},
          ],
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
