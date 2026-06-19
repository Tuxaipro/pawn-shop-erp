import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const isWindows = process.platform === 'win32';

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
