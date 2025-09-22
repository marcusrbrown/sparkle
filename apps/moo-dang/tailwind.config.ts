import type {Config} from 'tailwindcss'
import {tailwindConfig} from '@sparkle/config'

/**
 * Tailwind CSS configuration for moo-dang WASM web shell.
 *
 * Extends the base Sparkle configuration with application-specific
 * customizations for terminal and shell interface styling.
 */
const config: Config = {
  ...tailwindConfig,
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    // Include Sparkle UI components in the content scan
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    ...tailwindConfig.theme,
    extend: {
      ...tailwindConfig.theme?.extend,
      // Terminal-specific customizations will be added here in future phases
      fontFamily: {
        mono: ['Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'monospace'],
      },
    },
  },
}

export default config
