import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const isWindows = process.platform === 'win32';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('react-dom') || id.includes('/react/') || id.includes('react-router')) {
            return 'vendor-react';
          }
          if (id.includes('@tanstack/react-query')) return 'vendor-query';
          if (id.includes('i18next') || id.includes('react-i18next')) return 'vendor-i18n';
          if (id.includes('qrcode.react')) return 'vendor-qrcode';
        },
      },
    },
  },
  server: {
    port: 5174,
    watch: isWindows ? { usePolling: true, interval: 1000 } : undefined,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
});
