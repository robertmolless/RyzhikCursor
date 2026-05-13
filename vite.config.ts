import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

declare const process: { env: Record<string, string | undefined> };

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// GitHub Pages: repo name = RyzhikCursor
// For Telegram Mini Apps, set VITE_BASE=/ before building.
const base = process.env.VITE_BASE ?? '/RyzhikCursor/';

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    target: 'es2020',
    sourcemap: process.env.VITE_SOURCEMAP === '1',
    chunkSizeWarningLimit: 1500,
  },
  server: {
    host: true,
    port: 5173,
  },
});
