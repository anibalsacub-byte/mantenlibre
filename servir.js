// Servidor local opcional: `node servir.js` y abre http://localhost:8080
// (la aplicación también funciona abriendo index.html con doble clic).
const http = require('http');
const fs = require('fs');
const path = require('path');

const raiz = __dirname;
const puerto = Number(process.env.PORT) || 8080;
const tipos = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };

http.createServer((req, res) => {
  const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const archivo = path.join(raiz, ruta === '/' ? 'index.html' : ruta);
  if (!archivo.startsWith(raiz)) return res.writeHead(403).end();
  fs.readFile(archivo, (err, datos) => {
    if (err) return res.writeHead(404).end('No encontrado');
    res.writeHead(200, { 'Content-Type': (tipos[path.extname(archivo)] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(datos);
  });
}).listen(puerto, () => console.log(`MantenLibre en http://localhost:${puerto}`));
