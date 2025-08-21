import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react-swc'
import {resolve} from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      '@': resolve(__dirname, './'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./test/setup.ts'],
    include: ['**/__tests__/*.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', './src/config/**', '**/react-native/**', '**/react-native-*/**'],
    deps: {
      inline: ['react-native', 'react-native-web'],
    },
  },
})
