import {defineConfig} from 'tsdown'

export default defineConfig({
  entry: [
    './src/index.ts',
    './src/dom/index.ts',
    './src/react/index.ts',
    './src/console/index.ts',
    './src/terminal/index.ts',
    './src/lifecycle/index.ts',
  ],
  outDir: 'dist',
  format: ['esm'],
  outExtensions: () => ({
    js: '.js',
    dts: '.d.ts',
  }),
  dts: true,
  clean: true,
})
