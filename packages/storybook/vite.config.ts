import {resolve} from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import {defineConfig} from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@moo-dang': resolve(__dirname, '../../apps/moo-dang/src'),
    },
  },
})
