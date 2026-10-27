const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(process.argv[2] || '.');
http.createServer((req,res)=>{
 const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file = path.resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
 if (!file.startsWith(root + path.sep)) {res.writeHead(403).end();return;}
 fs.readFile(file,(err,data)=>{
  if(err){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.jpg':'image/jpeg','.png':'image/png'})[path.extname(file)] || 'application/octet-stream');
  res.end(data);
 });
}).listen(8000,'127.0.0.1',()=>console.log('Serving '+root+' at http://127.0.0.1:8000/BloomCart/'));
