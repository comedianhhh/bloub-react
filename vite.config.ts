import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

// `pnpm dev` serves the demo in `demo/`; `pnpm build` emits the library from `src/`.
export default defineConfig(({ command }) => ({
  plugins: [react(), ...(command === 'build' ? [dts({ include: ['src'], exclude: ['src/**/*.test.ts'] })] : [])],
  root: command === 'build' ? undefined : 'demo',
  server: { port: 5191 },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'bloub-react'
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime']
    }
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx']
  }
}))
