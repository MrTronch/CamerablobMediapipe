import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wav':'audio/wav','.ttf':'font/ttf','.svg':'image/svg+xml'};
let port=4173;
const server=http.createServer(async(req,res)=>{try{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 const bytes=await readFile(target);
 res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);
}catch{res.writeHead(404);res.end('No encontrado');}});
server.on('error',error=>{
 if(error.code==='EADDRINUSE'&&port<4183){server.listen(++port,'127.0.0.1');return;}
 console.error('No se pudo iniciar el servidor:',error.message);process.exitCode=1;
});
server.on('listening',()=>{
 const url=`http://localhost:${port}`;
 console.log(`Blob Trackin Camera: ${url}\nMantén esta ventana abierta mientras usas la cámara. Ctrl+C para cerrar.`);
 if(process.argv.includes('--open')){
  const command=process.platform==='win32'?'explorer.exe':process.platform==='darwin'?'open':'xdg-open';
  execFile(command,[url],error=>{if(error)console.log(`Abre ${url} en tu navegador.`);});
 }
});
server.listen(port,'127.0.0.1');
