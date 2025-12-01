import {defineConfig} from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  outDir: 'dist',
  format: ['esm'],
  outExtensions: () => ({
    js: '.js',
    dts: '.d.ts',
  }),
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
