// @ts-check
import react from '@astrojs/react'
import starlight from '@astrojs/starlight'
import {defineConfig} from 'astro/config'

// https://astro.build/config
export default defineConfig({
  site: 'https://sparkle.mrbro.dev',
  // Image optimization configuration for performance
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        limitInputPixels: false, // Allow large images for diagrams
      },
    },
    // Configure remote image optimization (if needed for CDN)
    domains: ['sparkle.mrbro.dev'],
    remotePatterns: [{protocol: 'https'}],
  },
  // Build optimization for production
  build: {
    inlineStylesheets: 'auto', // Automatically inline small CSS files
    assets: '_astro', // Asset directory for cache busting
  },
  // Compression and minification
  compressHTML: true,
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
      favicon: '/favicon.svg',
      head: [
        {
          tag: 'meta',
          attrs: {
            name: 'theme-color',
            content: '#3b82f6', // Sparkle primary brand color
          },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:image',
            content: 'https://sparkle.mrbro.dev/sparkle-og-image.png',
          },
        },
        // Accessibility enhancements
        {
          tag: 'meta',
          attrs: {
            name: 'viewport',
            content: 'width=device-width, initial-scale=1.0, viewport-fit=cover',
          },
        },
        // Preload critical resources for better performance
        {
          tag: 'link',
          attrs: {
            rel: 'preload',
            href: '/fonts/system-ui.woff2',
            as: 'font',
            type: 'font/woff2',
            crossorigin: 'anonymous',
          },
        },
      ],
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
        // Path to Sparkle Design System theme CSS generated from tokens
        './src/styles/sparkle-theme.css',
      ],
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 4,
      },
      pagination: true, // Enable prev/next navigation links
      lastUpdated: true, // Enable last updated timestamps
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
                {label: 'Token Transformation', slug: 'theme/token-transformation'},
                {label: 'Theme Providers', slug: 'theme/providers'},
                {label: 'Cross-Platform', slug: 'theme/cross-platform'},
                {label: 'Customization', slug: 'theme/customization'},
                {label: 'Complete Workflow', slug: 'theme/workflow'},
                {label: 'Advanced Customization', slug: 'theme/advanced'},
                {label: 'Troubleshooting', slug: 'theme/troubleshooting'},
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

        // Component Library Section - Logical progression through components
        {
          label: 'Component Library',
          collapsed: false,
          items: [
            // Component Overview and Architecture - Start here
            {label: 'Overview', slug: 'components/overview'},
            {label: 'Architecture', slug: 'components/architecture'},

            // Core Components - Essential building blocks
            {
              label: 'Core Components',
              items: [{label: 'Button', slug: 'components/button'}],
            },

            // Form Components - Grouped for better organization and logical flow
            {
              label: 'Form Components',
              collapsed: true,
              items: [
                {label: 'Form Container', slug: 'components/form'},
                {label: 'Form Control', slug: 'components/form-control'},
                {label: 'Form Field', slug: 'components/form-field'},
                {label: 'Form Label', slug: 'components/form-label'},
                {label: 'Form Input', slug: 'components/form-input'},
                {label: 'Form Textarea', slug: 'components/form-textarea'},
                {label: 'Form Select', slug: 'components/form-select'},
                {label: 'Form Password', slug: 'components/form-password'},
                {label: 'Form Message', slug: 'components/form-message'},
                {label: 'Form Description', slug: 'components/form-description'},
                {label: 'Form Submit', slug: 'components/form-submit'},
              ],
            },

            // Complete Component Reference - Final stop for comprehensive info
            {label: 'Complete Reference', slug: 'components/reference'},
          ],
        },

        // Utilities and Tools - Logical progression from basic to advanced
        {
          label: 'Utilities & Tools',
          collapsed: true,
          items: [
            // React Utilities - Ordered from basic to advanced
            {
              label: 'React Utilities',
              items: [
                {label: 'Overview', slug: 'utils/overview'},
                {label: 'String Utilities', slug: 'utils/string-utilities'},
                {label: 'React Hooks', slug: 'utils/react-hooks'},
                {label: 'Advanced Patterns', slug: 'utils/advanced-patterns', badge: 'Advanced'},
                {label: 'API Reference', slug: 'utils/reference', badge: 'API'},
              ],
            },
            // Testing Tools - Ordered from basic to advanced
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

        // Interactive Features - Demo and playground content
        {
          label: 'Interactive Features',
          badge: 'Demo',
          collapsed: true,
          items: [
            {label: 'Interactive Demos', slug: 'playground/interactive-demos'},
            {label: 'Component Examples', slug: 'playground/button-example'},
            {label: 'Live Code Editor', slug: 'playground/live-code-editor'},
            {label: 'Syntax Highlighting', slug: 'playground/syntax-highlighting'},
            {label: 'Copy Demo', slug: 'playground/copy-demo'},
            {label: 'Responsive Preview', slug: 'playground/responsive-preview'},
            {label: 'Theme Toggle & Preview', slug: 'playground/theme-toggle'},
          ],
        },

        // API Documentation - Technical reference
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

        // Guides - Best practices and patterns
        {
          label: 'Guides',
          collapsed: true,
          items: [
            {label: 'Accessibility Guide', slug: 'guides/accessibility'},
            {label: 'ARIA Labels', slug: 'guides/aria-labels'},
            {label: 'Heading Hierarchy', slug: 'guides/heading-hierarchy'},
            {label: 'Screen Reader Testing', slug: 'guides/screen-reader-testing'},
            {label: 'Performance Optimization', slug: 'guides/performance'},
          ],
        },

        // Development and Contributing - Final section for contributors
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
