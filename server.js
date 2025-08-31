const http = require('http');
const fs = require('fs');
const path = require('path');
const port = process.env.PORT || 3000;
const viewsDir = path.join(__dirname, 'src/views');
const assetsDir = path.join(__dirname, 'public/assets');

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
  let url = req.url;
  // Serve static assets
  if (url.startsWith('/assets/')) {
    const assetPath = path.join(assetsDir, url.replace('/assets/', ''));
    if (!assetPath.startsWith(assetsDir)) return res.writeHead(403).end('Forbidden');
    return fs.readFile(assetPath, (err, data) => {
      if (err) return res.writeHead(404).end('Not found');
      res.setHeader('Content-Type', mime(assetPath));
      res.end(data);
    });
  }
  // Serve HTML views
  let view = url === '/' ? 'index.html' : url.replace(/^\//, '');
  const viewPath = path.join(viewsDir, view);
  if (!viewPath.startsWith(viewsDir)) return res.writeHead(403).end('Forbidden');
  fs.readFile(viewPath, (err, data) => {
    if (err) return res.writeHead(404).end('Not found');
    res.setHeader('Content-Type', mime(viewPath));
    res.end(data);
  });
});

server.listen(port, () => console.log(`Server running at http://localhost:${port}`));
