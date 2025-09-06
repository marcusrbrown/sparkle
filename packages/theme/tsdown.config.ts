import {defineConfig} from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts', './src/tailwind/index.ts', './src/react-native/index.ts'],
  outDir: 'dist',
  format: ['esm', 'cjs'],
  dts: {
    sourcemap: true,
  },
  sourcemap: true,
  clean: true,
  external: [
    // React ecosystem
    'react',
    'react-dom',
    'react-native',
    // Third-party dependencies
    'tailwindcss',
    '@react-native-async-storage/async-storage',
    // Internal Sparkle packages
    '@sparkle/types',
    '@sparkle/utils',
    '@sparkle/theme',
    '@sparkle/config',
    '@sparkle/ui',
    '@sparkle/error-testing',
    '@sparkle/storybook',
    // Externalize Node.js specific modules for browser compatibility
    'node:module',
    'node:path',
    'node:fs',
    'node:url',
  ],
  platform: 'browser',
  target: 'es2020',
})
