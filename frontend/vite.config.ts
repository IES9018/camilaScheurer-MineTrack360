import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// El servidor de desarrollo corre en el contenedor frontend-dev (SPEC R-06).
// El proxy evita CORS: el navegador habla con :5173 y Vite reenvía /api al backend.
const apiTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // escuchar en 0.0.0.0 para que el host pueda abrir la página
    port: 5173,
    strictPort: true,
    // Las carpetas montadas desde Windows no avisan cambios: se usa polling
    watch:
      process.env.VITE_USE_POLLING === 'true'
        ? { usePolling: true, interval: 300 }
        : undefined,
    proxy: { '/api': { target: apiTarget, changeOrigin: true } },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
  },
});
