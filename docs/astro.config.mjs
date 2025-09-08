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
          items: [{label: 'Overview', slug: 'components/overview'}],
        },
        {
          label: 'Theme System',
          badge: 'Core',
          items: [{label: 'Overview', slug: 'theme/overview'}],
        },
        {
          label: 'TypeScript Types',
          items: [{label: 'Overview', slug: 'types/overview'}],
        },
        {
          label: 'Utilities',
          items: [{label: 'Overview', slug: 'utils/overview'}],
        },
        {
          label: 'Error Testing',
          items: [{label: 'Overview', slug: 'error-testing/overview'}],
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
})
