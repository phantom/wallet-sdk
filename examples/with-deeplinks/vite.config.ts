import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      'stream': 'stream-browserify',
    },
  },
  server: {
    host: '0.0.0.0', // Allow external connections
    allowedHosts: ['localhost', '1276bd99e8ce.ngrok-free.app'], // Allow specific ngrok domain
    headers: {
      'ngrok-skip-browser-warning': 'true', // Skip ngrok browser warning
    },
  },
})