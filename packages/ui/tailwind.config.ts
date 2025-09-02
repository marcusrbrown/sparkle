import type {Config} from 'tailwindcss'
import {tailwindConfig} from '@sparkle/config'

export default {
  ...tailwindConfig,
  content: ['./src/**/*.{js,ts,jsx,tsx}', './index.html'],
} as Config
