import {defineConfig} from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts', './src/tailwind/index.ts', './src/react-native/index.ts'],
  outDir: 'dist',
  dts: true,
  external: [
    'react',
    'react-dom',
    'react-native',
    'tailwindcss',
    '@react-native-async-storage/async-storage',
    '@sparkle/types',
    '@sparkle/utils',
    // Externalize Node.js specific modules for browser compatibility
    'node:module',
    'node:path',
    'node:fs',
    'node:url',
  ],
  platform: 'browser',
  target: 'es2020',
  format: ['esm', 'cjs'],
  // Generate sourcemaps for better debugging
  sourcemap: true,
  // Clean output directory before build
  clean: true,
})
