import {defineConfig} from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  outDir: 'dist',
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    // React ecosystem
    'react',
    'react-dom',
    'react-native',
    // Third-party UI dependencies
    '@radix-ui/react-form',
    '@radix-ui/react-label',
    '@radix-ui/react-primitive',
    '@radix-ui/react-select',
    'clsx',
    // Internal Sparkle packages
    '@sparkle/types',
    '@sparkle/utils',
    '@sparkle/theme',
    '@sparkle/config',
    '@sparkle/ui',
    '@sparkle/error-testing',
    '@sparkle/storybook',
  ],
  target: 'es2020',
})
