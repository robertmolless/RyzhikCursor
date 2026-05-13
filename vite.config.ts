import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/RyzhikCursor/' : './',
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2022',
    assetsInlineLimit: 8192,
    sourcemap: true,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
