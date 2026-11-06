import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const base = resolve(import.meta.dirname,'..');
const files = { '/': ['preview/index.html','text/html'], '/client.js': ['lib/client.js','text/javascript'] };
const port = Number(process.env.PORT || 4318);
createServer(async (req,res) => {
  if (req.method === 'POST' && req.url === '/report') {
    let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 65536) { res.writeHead(413).end(); return; } }
    console.log('BROWSER_REPORT',body); res.writeHead(204).end(); return;
  }
  const entry = files[req.url];
  if (!entry) { res.writeHead(404).end(); return; }
  try { res.writeHead(200,{ 'content-type': entry[1], 'cache-control': 'no-store' }); res.end(await readFile(resolve(base,entry[0]))); }
  catch { res.writeHead(500).end('Build the plugin first.'); }
}).listen(port,'127.0.0.1',() => console.log(`Galaxy preview: http://127.0.0.1:${port}`));
