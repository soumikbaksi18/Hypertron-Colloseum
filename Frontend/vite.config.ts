import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const root = path.dirname(fileURLToPath(import.meta.url));

function mimeFor(file: string): string {
  if (file.endsWith('.wasm')) return 'application/wasm';
  if (file.endsWith('.js')) return 'text/javascript';
  if (file.endsWith('.json')) return 'application/json';
  return 'application/octet-stream';
}

function servePrefix(urlPrefix: string, dir: string): Plugin {
  return {
    name: `serve-${urlPrefix}`,
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? '';
        if (!url.startsWith(urlPrefix)) {
          next();
          return;
        }
        const rel = decodeURIComponent(url.slice(urlPrefix.length));
        const file = path.resolve(dir, rel);
        if (!file.startsWith(path.resolve(dir)) || !fs.existsSync(file)) {
          next();
          return;
        }
        const stat = fs.statSync(file);
        if (stat.isDirectory()) {
          next();
          return;
        }
        res.setHeader('Content-Type', mimeFor(file));
        res.setHeader('Cache-Control', 'no-store');
        fs.createReadStream(file).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    servePrefix('/keys/', path.resolve(root, '../keys')),
    servePrefix('/wasm/', path.resolve(root, '../prover-wasm/pkg')),
  ],
  define: {
    global: 'globalThis',
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/v1': 'http://localhost:4000',
      '/dev': 'http://localhost:4000',
      '/idx': {
        target: 'http://127.0.0.1:4002',
        rewrite: (path) => path.replace(/^\/idx/, ''),
      },
    },
    fs: {
      allow: ['..'],
    },
  },
});
