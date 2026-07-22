'use strict';

const http = require('http');

const HOST = '127.0.0.1';
const PORT = 3748;

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url !== '/levels' && req.url !== '/') {
    res.writeHead(404);
    res.end();
    return;
  }

  const t = Date.now() / 1000;
  const left = 0.35 + 0.25 * (Math.sin(t * 2.2) + 1) / 2;
  const right = 0.30 + 0.30 * (Math.sin(t * 1.7 + 0.7) + 1) / 2;
  const body = JSON.stringify({ L: clamp01(left), R: clamp01(right) });

  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
});

server.listen(PORT, HOST, () => {
  console.log(`Serving dummy levels at http://${HOST}:${PORT}/levels`);
});

process.on('SIGINT', () => server.close(() => process.exit(0)));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
