// Vite Configuration v1.0.3
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const rootEnvDir = path.resolve(process.cwd(), '..')
  const env = loadEnv(mode, rootEnvDir, '')

  const supabaseUrl = (env.VITE_SUPABASE_URL || env.SUPABASE_URL || '').trim()
  const supabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '').trim()

  return {
    plugins: [react(), tailwindcss()],
    base: './',
    envDir: rootEnvDir,
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    server: {
      port: 3000,
      strictPort: true,
      host: '0.0.0.0',
      hmr: {
        host: 'localhost',
        protocol: 'ws',
      },
      allowedHosts: true,
      watch: {
        usePolling: true,
      },
    },
    optimizeDeps: {
      rolldownOptions: {},
    },
  }
})
