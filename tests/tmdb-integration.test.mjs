import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
async function bind(server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return server.address().port;
}
async function freePort() {
  const s = createServer();
  const port = await bind(s);
  await new Promise((resolve, reject) => s.close(error => error ? reject(error) : resolve()));
  return port;
}
async function awaitRunning(base, child) {
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) throw new Error(`Uygulama başlatılamadı: ${child.exitCode}`);
    try { const response = await fetch(`${base}/api/config`); if (response.ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 80));
  }
  throw new Error('Uygulama başlatılamadı: bekleme süresi doldu');
}

test('TMDB sunucu entegrasyonu: canlı keşfetme, arama, sayfalama ve oyuncular', { timeout: 16000 }, async () => {
  const requests = [];
  const upstream = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    requests.push({ url, auth: req.headers.authorization });
    res.writeHead(200, { 'content-type': 'application/json' });
    if (url.pathname === '/3/trending/all/week') {
      res.end(JSON.stringify({ page:1,total_pages:9,results:[
        { id:12,media_type:'movie',title:'Test Film',poster_path:'/a.jpg',vote_average:8.1 },
        { id:13,media_type:'tv',name:'Test Dizi',poster_path:'/b.jpg',vote_average:7.2 },
        { id:14,media_type:'person',name:'Kişi' }
      ] }));
    } else if (url.pathname === '/3/search/multi') {
      res.end(JSON.stringify({ page:2,total_pages:4,results:[{ id:99,media_type:'movie',title:'Aranan Film',poster_path:'/p.jpg' }] }));
    } else if (url.pathname === '/3/movie/12/credits') {
      res.end(JSON.stringify({ cast:[{name:'Oyuncu A',character:'Ana karakter',profile_path:'/actor.jpg'}] }));
    } else {
      res.writeHead(404); res.end('{}');
    }
  });
  const upstreamPort = await bind(upstream);
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['server/server.mjs'], {
    cwd:root,
    env: { ...process.env, PORT:String(port), TMDB_TOKEN:'fake-test-token', TMDB_API_BASE_URL:`http://127.0.0.1:${upstreamPort}/3` },
    stdio:'ignore'
  });
  try {
    await awaitRunning(base, child);
    assert.deepEqual(await (await fetch(`${base}/api/config`)).json(), {mode:'tmdb'});
    const featured = await (await fetch(`${base}/api/search?q=`)).json();
    assert.deepEqual(featured.results.map(r=>r.media_type), ['movie','tv']);
    assert.equal(featured.total_pages, 9);
    const searched = await (await fetch(`${base}/api/search?q=Matrix&page=2`)).json();
    assert.equal(searched.page, 2);
    assert.equal(searched.results[0].poster_path, '/p.jpg');
    const credits = await (await fetch(`${base}/api/credits?type=movie&id=12`)).json();
    assert.equal(credits.cast[0].profile_path, '/actor.jpg');
    assert.ok(requests.some(r=>r.url.pathname==='/3/trending/all/week'));
    assert.ok(requests.some(r=>r.url.pathname==='/3/search/multi' && r.url.searchParams.get('query')==='Matrix' && r.url.searchParams.get('page')==='2'));
    assert.ok(requests.every(r=>r.auth==='Bearer fake-test-token'));
  } finally {
    child.kill();
    await new Promise(resolve => upstream.close(resolve));
  }
});
