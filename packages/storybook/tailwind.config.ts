import type {Config} from 'tailwindcss'
import {tailwindConfig} from '@sparkle/config'

export default {
  ...tailwindConfig,
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './.storybook/**/*.{js,ts,jsx,tsx,mdx}',
    '../**/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
} as Config
