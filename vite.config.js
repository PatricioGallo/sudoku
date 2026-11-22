import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// `--mode mock` usa un backend simulado (sin Supabase) para probar la app.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@api': fileURLToPath(new URL(mode === 'mock' ? './src/api/mock.js' : './src/api/supabase.js', import.meta.url)),
    },
  },
}))
