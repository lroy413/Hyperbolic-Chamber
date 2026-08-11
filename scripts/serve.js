/* A local server for dist/, because a service worker, the manifest and
   persistent storage all need an origin — none of them work from file://.
   node scripts/serve.js [port]   default 8787 */
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..','dist');
const PORT=parseInt(process.argv[2],10)||8787;
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json',
  '.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.css':'text/css'};
http.createServer((req,res)=>{
  let u=decodeURIComponent(req.url.split('?')[0]);
  if(u==='/')u='/index.html';
  const f=path.join(ROOT,u);
  if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.statusCode=404;return res.end('not found');}
  res.setHeader('content-type',MIME[path.extname(f)]||'application/octet-stream');
  res.setHeader('cache-control','no-cache');
  if(u==='/sw.js')res.setHeader('service-worker-allowed','/');
  res.end(fs.readFileSync(f));
}).listen(PORT,()=>console.log('Oboros on http://localhost:'+PORT+'  (dist/)'));
