import {defineConfig} from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  outDir: 'dist',
  dts: true,
  external: ['react-native', '@react-native-async-storage/async-storage'],
})
