// vite.config.js - ✅ 100% FIXED + Tailwind + Proxy
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()  // ✅ CORRECT Tailwind Vite plugin
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',  // Your Express backend
        changeOrigin: true,
        secure: false
      }
    }
  }
})
