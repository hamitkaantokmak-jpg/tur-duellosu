// Small cross-platform static test server; no dependency or Python alias required.
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(process.argv[3] || '.'), port = Number(process.argv[2] || 4173);
const types = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.wasm':'application/wasm', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml'};
http.createServer((req,res)=>{
  let name; try { name = decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch {res.writeHead(400).end();return;}
  if(name==='/favicon.ico'){res.writeHead(204).end();return;}
  const file=path.resolve(root, '.'+name, name.endsWith('/')?'index.html':'');
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.stat(file,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);});
}).listen(port,'127.0.0.1',()=>console.log('Static server on '+port));
