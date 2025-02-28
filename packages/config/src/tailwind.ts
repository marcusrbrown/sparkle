import type {Config} from 'tailwindcss'

export const colors = {
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
} as const

export const borderRadius = {
  none: '0px',
  sm: '0.125rem',
  DEFAULT: '0.25rem',
  md: 'var(--radius)',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
} as const

export const tailwindConfig = {
  theme: {
    extend: {
      colors,
      borderRadius,
    },
  },
  plugins: [require('@tailwindcss/forms')],
} satisfies Config

export default tailwindConfig
