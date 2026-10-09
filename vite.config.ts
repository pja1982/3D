import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function localStorageApiPlugin(): Plugin {
  const dataDir = path.resolve(__dirname, 'data');
  const dbFile = path.resolve(dataDir, 'print-tracker-db.json');

  return {
    name: 'local-storage-api',
    configureServer(server) {
      server.middlewares.use('/api/storage', (req, res, next) => {
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }

        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          if (fs.existsSync(dbFile)) {
            try {
              const content = fs.readFileSync(dbFile, 'utf-8');
              res.statusCode = 200;
              res.end(content || '{}');
              return;
            } catch {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Failed to read database file' }));
              return;
            }
          } else {
            res.statusCode = 200;
            res.end(JSON.stringify({ empty: true }));
            return;
          }
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              fs.writeFileSync(dbFile, JSON.stringify(parsed, null, 2), 'utf-8');
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, savedAt: new Date().toISOString() }));
            } catch (err: any) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Invalid JSON payload', message: err?.message }));
            }
          });
          return;
        }

        next();
      });

      server.middlewares.use('/api/status', (req, res, next) => {
        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              status: 'online',
              mode: 'docker-local',
              storagePath: 'data/print-tracker-db.json',
              timestamp: new Date().toISOString(),
            })
          );
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react(), localStorageApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});

