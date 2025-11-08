import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow external connections
    port: 3000,
    strictPort: false,
    // Allow all hosts (for EC2/public hosting)
    // In production, you may want to restrict this
    allowedHosts: [
      'localhost',
      '.localhost',
      '.amazonaws.com',
      '.compute.amazonaws.com',
      // Add your EC2 host or use environment variable
      process.env.VITE_ALLOWED_HOST || 'ec2-18-217-144-130.us-east-2.compute.amazonaws.com'
    ],
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: process.env.VITE_WS_URL || 'ws://localhost:8000',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});

