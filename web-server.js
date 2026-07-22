'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { URL } = require('url');

const ROOT = __dirname;
const WIDGETS = path.join(ROOT, 'widgets');
const HOST = '127.0.0.1';
const PORT = 8080;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function send(res, status, body, headers = {}) {
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  res.writeHead(status, {
    'Content-Length': payload.length,
    'Cache-Control': 'no-store',
    ...headers
  });
  res.end(payload);
}

function sendJson(res, value) {
  send(res, 200, JSON.stringify(value), {
    'Content-Type': 'application/json; charset=utf-8'
  });
}

function safeJsonLoad(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function toWebPath(...parts) {
  return parts.map(part => String(part).replace(/\\/g, '/')).join('/');
}

function handleWidgetsApi(res) {
  const entries = [];
  if (fs.existsSync(WIDGETS)) {
    const folders = fs.readdirSync(WIDGETS, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort((a, b) => a.localeCompare(b));

    for (const folder of folders) {
      const folderPath = path.join(WIDGETS, folder);
      const indexPath = path.join(folderPath, 'index.html');
      if (!fs.existsSync(indexPath)) continue;

      const manifest = safeJsonLoad(path.join(folderPath, 'manifest.json'));
      const icon = manifest.preview_icon || '';
      entries.push({
        folder,
        path: toWebPath('widgets', folder),
        entryUrl: toWebPath('widgets', folder, 'index.html'),
        manifest,
        iconUrl: icon ? toWebPath('widgets', folder, icon) : ''
      });
    }
  }
  sendJson(res, entries);
}

function resolveStaticPath(requestPath) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(requestPath);
  } catch {
    return null;
  }

  const normalizedPath = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
  const relativePath = normalizedPath === path.sep || normalizedPath === '.'
    ? 'index.html'
    : normalizedPath.replace(/^[/\\]+/, '');
  const resolved = path.resolve(ROOT, relativePath);
  const relative = path.relative(ROOT, resolved);

  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return resolved;
}

function serveStatic(req, res, pathname) {
  let filePath = resolveStaticPath(pathname);
  if (!filePath) {
    send(res, 400, 'Bad request', { 'Content-Type': 'text/plain; charset=utf-8' });
    return;
  }

  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
  } catch {
    send(res, 404, 'Not found', { 'Content-Type': 'text/plain; charset=utf-8' });
    return;
  }

  fs.readFile(filePath, (err, body) => {
    if (err) {
      send(res, 404, 'Not found', { 'Content-Type': 'text/plain; charset=utf-8' });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, body, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream'
    });
  });
}

function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      send(res, 405, 'Method not allowed', { 'Content-Type': 'text/plain; charset=utf-8' });
      return;
    }

    if (url.pathname === '/api/widgets') {
      handleWidgetsApi(res);
      return;
    }

    serveStatic(req, res, url.pathname);
  });
}

function startServer(options = {}) {
  const host = options.host || HOST;
  const port = options.port || PORT;
  const server = createServer();

  if (typeof options.onError === 'function') {
    server.on('error', options.onError);
  }
  if (typeof options.onListening === 'function') {
    server.once('listening', options.onListening);
  }

  server.listen(port, host, () => {
    if (!options.silent) {
      console.log(`Serving http://${host}:${port}/`);
    }
  });

  return server;
}

if (require.main === module) {
  const server = startServer();

  process.on('SIGINT', () => server.close(() => process.exit(0)));
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
}

module.exports = { HOST, PORT, createServer, startServer };
