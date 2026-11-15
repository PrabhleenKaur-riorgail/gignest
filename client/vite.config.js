import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, requests to /api and /socket.io are forwarded to the backend on port 5000,
// so the browser sees one origin and there are no CORS problems.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/socket.io': { target: 'http://localhost:5000', ws: true },
    },
  },
});
