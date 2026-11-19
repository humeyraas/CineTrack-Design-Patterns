import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
try { process.loadEnvFile(path.join(root, ".env")); } catch (error) { if (error?.code !== "ENOENT") throw error; }
const demo = JSON.parse(await fs.readFile(path.join(root, "data", "demo-catalog.json"), "utf8"));
const port = Number.parseInt(process.env.PORT || "3000", 10);
const token = (process.env.TMDB_TOKEN || "").trim();
const apiBase = "https://api.themoviedb.org/3";

function json(res, status, value) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(value));
}
async function tmdbGet(route) {
  const response = await fetch(`${apiBase}${route}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`TMDB API HTTP ${response.status}`);
  return await response.json();
}
function demoSearch(q) {
  const needle = q.toLocaleLowerCase("tr-TR");
  return { results: demo.results.filter(x => (`${x.title || x.name} ${x.overview}`).toLocaleLowerCase("tr-TR").includes(needle)) };
}
async function serveFile(res, requestedPath) {
  let filepath;
  if (requestedPath === "/" || requestedPath === "/index.html") filepath = path.join(root, "public/index.html");
  else if (requestedPath === "/style.css") filepath = path.join(root, "public/style.css");
  else if (/^\/dist\/(?:src\/)[\w/-]+\.js$/.test(requestedPath)) filepath = path.join(root, requestedPath.slice(1));
  else { json(res, 404, { error: "Dosya bulunamadı" }); return; }
  try {
    const contents = await fs.readFile(filepath);
    const contentType = filepath.endsWith(".html") ? "text/html; charset=utf-8" : filepath.endsWith(".css") ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8";
    res.writeHead(200, { "Content-Type": contentType, "X-Content-Type-Options": "nosniff" });
    res.end(contents);
  } catch { json(res, 404, { error: "Dosya bulunamadı; önce npm run build komutunu çalıştır." }); }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost");
    if (req.method !== "GET") return json(res, 405, { error: "Yalnızca GET desteklenir." });
    if (url.pathname === "/api/config") return json(res, 200, { mode: token ? "tmdb" : "demo" });
    if (url.pathname === "/api/search") {
      const q = (url.searchParams.get("q") || "").trim().slice(0, 100);
      if (!q || !token) return json(res, 200, demoSearch(q));
      const data = await tmdbGet(`/search/multi?query=${encodeURIComponent(q)}&include_adult=false&language=tr-TR&page=1`);
      return json(res, 200, { results: (data.results || []).filter(item => item.media_type === "movie" || item.media_type === "tv").slice(0, 20) });
    }
    if (url.pathname === "/api/credits") {
      const kind = url.searchParams.get("type");
      const id = Number(url.searchParams.get("id"));
      if ((kind !== "movie" && kind !== "tv") || !Number.isSafeInteger(id) || id < 1) return json(res, 400, { error: "Geçersiz yapım" });
      if (!token) {
        const item = demo.results.find(item => item.media_type === kind && item.id === id);
        return json(res, 200, { cast: (item?.cast || []).map(name => ({ name })) });
      }
      const data = await tmdbGet(`/${kind}/${id}/credits?language=tr-TR`);
      return json(res, 200, { cast: (data.cast || []).slice(0, 12).map(person => ({ name: person.name })) });
    }
    return await serveFile(res, decodeURIComponent(url.pathname));
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    return json(res, 502, { error: "Veri alınamadı. İnternet veya TMDB tokenını kontrol edin." });
  }
});
server.listen(port, "127.0.0.1", () => {
  console.log(`\n🎬 CineTrack hazır: http://localhost:${port}`);
  console.log(`Veri modu: ${token ? "TMDB API" : "DEMO (API anahtarı gerekmiyor)"}\n`);
});
