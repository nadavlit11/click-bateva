import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth', 'firebase/storage', 'firebase/functions'],
          'vendor-leaflet': ['leaflet', 'react-leaflet'],
          'vendor-recharts': ['recharts'],
          'vendor-router': ['react-router-dom'],
        },
      },
    },
  },
  test: {
    environment: 'node',
  },
})
