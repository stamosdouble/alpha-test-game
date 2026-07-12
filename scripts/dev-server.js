/**
 * Dev static server with no-cache headers so PNG/JS swaps show on refresh.
 * Usage: npm start  →  http://127.0.0.1:8080/
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
};

function send(res, status, body, type) {
  res.writeHead(status, {
    'Content-Type': type || 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    Pragma: 'no-cache',
    Expires: '0',
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  try {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    let rel = urlPath === '/' ? '/index.html' : urlPath;
    rel = path.normalize(rel).replace(/^(\.\.[/\\])+/, '');
    const filePath = path.join(ROOT, rel);

    if (!filePath.startsWith(ROOT)) {
      send(res, 403, 'Forbidden');
      return;
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      send(res, 404, `Not found: ${rel}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, fs.readFileSync(filePath), TYPES[ext] || 'application/octet-stream');
  } catch (err) {
    send(res, 500, String(err && err.message ? err.message : err));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${PORT}/`;
  console.log(`\n  Paper Squadron art server`);
  console.log(`  ${url}`);
  console.log(`  Swap PNGs in /assets then refresh — no-cache is on.\n`);

  const opener =
    process.platform === 'darwin' ? 'open' :
    process.platform === 'win32' ? 'start' :
    'xdg-open';
  exec(`${opener} ${url}`, () => {});
});
