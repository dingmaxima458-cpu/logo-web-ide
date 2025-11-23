import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file from parent directory (project root)
  const env = loadEnv(mode, '..', '');
  
  return {
    // Load environment variables from parent directory (project root)
    envDir: '..',
    
    plugins: [react()],
    server: {
      host: env.VITE_HOST || '0.0.0.0',
      port: parseInt(env.VITE_PORT || '5173', 10),
      strictPort: false,
      // Allow all hosts (for EC2/public hosting)
      // In production, you may want to restrict this
      allowedHosts: [
        'localhost',
        '.localhost',
        '.amazonaws.com',
        '.compute.amazonaws.com',
        // Add your EC2 host or use environment variable
        env.VITE_ALLOWED_HOST || 'ec2-18-217-144-130.us-east-2.compute.amazonaws.com'
      ],
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3001',
          changeOrigin: true,
        },
        '/ws': {
          target: env.VITE_WS_URL || 'ws://localhost:3002',
          ws: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  };
});

