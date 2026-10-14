import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const assets = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/app.js': 'app.js',
  '/app.css': 'app.css',
};
const types = { html: 'text/html', js: 'text/javascript', css: 'text/css' };
const server = createServer(async (req, res) => {
  const file = assets[new URL(req.url, 'http://localhost').pathname];
  if (!file) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  try {
    const bytes = await readFile(resolve('dist-preview', file));
    res.writeHead(200, {
      'Content-Type': types[file.split('.').pop()],
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(bytes);
  } catch {
    res.writeHead(503);
    res.end('Build the review first.');
  }
});
server.listen(4174, '127.0.0.1', () =>
  console.log('Fictional review ready at http://localhost:4174/'),
);
