import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import os from 'os';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  cacheDir: path.resolve(os.tmpdir(), 'vite-hostel-frontend-cache'),
  server: {
    port: 5173,
    host: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios', 'lucide-react', 'recharts'],
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'axios'],
          icons: ['lucide-react'],
        },
      },
    },
  },
});
