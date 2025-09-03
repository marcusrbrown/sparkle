import {defineConfig} from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  outDir: 'dist',
  dts: true,
  external: [
    'react-native',
    '@react-native-async-storage/async-storage',
    // Externalize Node.js specific modules for browser compatibility
    'node:module',
    'node:path',
    'node:fs',
    'node:url',
  ],
  platform: 'browser',
  target: 'es2020',
})
