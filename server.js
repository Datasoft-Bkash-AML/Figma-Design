const http = require('http');
const fs = require('fs');
const path = require('path');
const port = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');

const mime = (p) => {
  if (p.endsWith('.html')) return 'text/html';
  if (p.endsWith('.js')) return 'application/javascript';
  if (p.endsWith('.css')) return 'text/css';
  if (p.endsWith('.png')) return 'image/png';
  if (p.endsWith('.jpg') || p.endsWith('.jpeg')) return 'image/jpeg';
  if (p.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
};

const server = http.createServer((req, res) => {
  let p = req.url === '/' ? '/index.html' : req.url;
  const file = path.join(publicDir, decodeURIComponent(p));
  if (!file.startsWith(publicDir)) return res.writeHead(403).end('Forbidden');
  fs.readFile(file, (err, data) => {
    if (err) return res.writeHead(404).end('Not found');
    res.setHeader('Content-Type', mime(file));
    res.end(data);
  });
});

server.listen(port, () => console.log(`Server running at http://localhost:${port}`));
