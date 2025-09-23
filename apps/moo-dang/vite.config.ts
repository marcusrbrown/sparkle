import {resolve} from 'node:path'
import react from '@vitejs/plugin-react-swc'
import {defineConfig} from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/workers': resolve(__dirname, './src/workers'),
      '@/shell': resolve(__dirname, './src/shell'),
      '@/wasm': resolve(__dirname, './src/wasm'),
    },
  },
  // WASM support configuration
  assetsInclude: ['**/*.wasm'],
  server: {
    fs: {
      // Allow serving WASM files from the project and workspace
      allow: ['..', resolve(__dirname, './src/wasm')],
    },
  },
  worker: {
    format: 'es',
    plugins: () => [react()],
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          xterm: ['@xterm/xterm', '@xterm/addon-fit'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'src/**/__tests__/*.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/src/wasm/**/*.zig'],
  },
})
