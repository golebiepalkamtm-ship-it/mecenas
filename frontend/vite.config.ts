// Vite Configuration v1.0.1
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './', // CRITICAL: Makes assets load correctly in Electron/Tauri from local filesystem
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
  }
})
