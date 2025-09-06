import {resolve} from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import {defineConfig} from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    cssCodeSplit: false,
    rollupOptions: {
      external: ['react', 'react-dom', '@sparkle/types', '@sparkle/utils', '@sparkle/theme', '@sparkle/config'],
      output: {
        assetFileNames: assetInfo => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'styles.css'
          }
          return '[name].[ext]'
        },
      },
    },
  },
  css: {
    postcss: {},
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
  },
})
