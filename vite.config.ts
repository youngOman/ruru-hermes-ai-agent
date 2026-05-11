import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    allowedHosts: ['.trycloudflare.com', '.loca.lt', '.serveo.net', '.serveousercontent.com'],
    proxy: {
      // Gateway: OpenAI-compatible chat / models
      '/v1': {
        target: 'http://127.0.0.1:8642',
        changeOrigin: true,
      },
      // Admin dashboard: skills / sessions / logs / status / config ...
      // Backend is the `hermes dashboard` server (defaults to :9119).
      '/api': {
        target: 'http://127.0.0.1:9119',
        changeOrigin: true,
      },
      // The HTML root of the dashboard server — we hit it once to extract the
      // session token (window.__HERMES_SESSION_TOKEN__) used to authenticate
      // /api requests. Mounted under /__hermes_dashboard__ to avoid colliding
      // with our own SPA routes.
      '/__hermes_dashboard__': {
        target: 'http://127.0.0.1:9119',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/__hermes_dashboard__/, '/'),
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5174,
  },
})
