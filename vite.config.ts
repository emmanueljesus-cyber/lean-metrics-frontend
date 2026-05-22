import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [tailwindcss()],

  // Multi-page app: cada HTML é um entry point separado
  build: {
    rollupOptions: {
      input: {
        main:         resolve(__dirname, 'index.html'),
        dashboard:    resolve(__dirname, 'dashboard.html'),
        relatorio:    resolve(__dirname, 'relatorio.html'),
        quickReport:  resolve(__dirname, 'quick-report.html'),
      },
    },
  },

  // Dev server — proxy para a API local evita problemas de CORS em dev
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
