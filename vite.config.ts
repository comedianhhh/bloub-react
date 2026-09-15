import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import { defineConfig } from 'vitest/config'

// `pnpm dev` serves the demo in `demo/`; `pnpm build` emits the library from
// `src/`; vitest runs from the package root.
export default defineConfig(({ command, mode }) => ({
  plugins: [react(), ...(command === 'build' ? [dts({ include: ['src'], exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx'] })] : [])],
  root: command === 'serve' && mode !== 'test' ? 'demo' : undefined,
  server: { port: 5191 },
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
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
