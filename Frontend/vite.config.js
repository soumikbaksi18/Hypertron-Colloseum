import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
    plugins: [react(), tailwindcss()],
    define: {
        global: 'globalThis',
    },
    server: {
        port: 5173,
        proxy: {
            '/v1': 'http://localhost:4000',
            '/dev': 'http://localhost:4000',
        },
    },
});
