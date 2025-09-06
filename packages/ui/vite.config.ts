import {resolve} from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import {defineConfig} from 'vite'

export default defineConfig(({mode}) => {
  // CSS-only build mode for hybrid tsdown + Vite CSS approach
  if (mode === 'css-only') {
    return {
      plugins: [tailwindcss()],
      build: {
        lib: {
          entry: resolve(__dirname, 'src/styles.css'),
          formats: ['es'],
          fileName: 'styles-temp',
        },
        cssCodeSplit: true, // Allow CSS splitting for CSS-only build
        emptyOutDir: false, // Don't empty out dir to preserve tsdown outputs
        sourcemap: true, // Enable source maps for CSS debugging
        rollupOptions: {
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
    }
  }

  // Default configuration for dev and testing
  return {
    plugins: [react(), tailwindcss()],
    build: {
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        formats: ['es'],
        fileName: 'index',
      },
      cssCodeSplit: false,
      sourcemap: true, // Enable source maps for debugging
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
  }
})
