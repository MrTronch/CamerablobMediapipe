import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wav':'audio/wav'};
http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}const bytes=await readFile(target);res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(bytes);}catch{res.writeHead(404);res.end('No encontrado');}}).listen(4173,'127.0.0.1',()=>console.log('Blob Tracking: http://localhost:4173'));
