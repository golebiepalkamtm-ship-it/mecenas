// Vite Configuration v1.0.3
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
    watch: {
      usePolling: true,
    }
  },
  optimizeDeps: {
    rolldownOptions: {
      // Aligning with Vite 8 / Rolldown standards
      // jsx is handled via tsconfig.app.json automatically
    }
  }
})
