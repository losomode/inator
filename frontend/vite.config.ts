import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@modules': path.resolve(__dirname, 'src/modules'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    open: false,
    // Allow deployment domain and bare variant for external deployments
    allowedHosts: process.env.VITE_DEPLOY_DOMAIN
      ? [
          process.env.VITE_DEPLOY_DOMAIN,
          process.env.VITE_DEPLOY_DOMAIN.replace(/^www\./, ''),
        ]
      : [],
  },
  build: {
    outDir: 'dist',
  },
});
