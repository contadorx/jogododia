// Gera out/sw.js depois do `next build` (mesmo esquema do Brincadeira do Dia).
// O service worker guarda as páginas no aparelho: depois da primeira visita, o jogo abre sem internet.
// Os arquivos .txt (dados de navegação interna do Next) são guardados sob demanda, não na instalação.
// A cada build o nome do cache muda, e a versão antiga é apagada na próxima visita.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const OUT = path.resolve("out");
if (!fs.existsSync(OUT)) {
  console.error("Pasta out/ não encontrada. Rode `next build` antes.");
  process.exit(1);
}

function listar(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? listar(p) : [p];
  });
}

const IGNORAR = new Set(["sw.js"]);
const arquivos = listar(OUT)
  .map((p) => "/" + path.relative(OUT, p).split(path.sep).join("/"))
  .filter((u) => !IGNORAR.has(u.slice(1)) && !u.endsWith(".map"))
  // fontes: os navegadores atuais usam só .woff2; o subconjunto vietnamita não é usado
  .filter((u) => !u.endsWith(".woff") && !u.includes("vietnamese"))
  // dados de navegação interna (RSC): guardados sob demanda
  .filter((u) => !u.endsWith(".txt"))
  // imagem da prévia de links: só quem busca é o WhatsApp, o Facebook etc.
  .filter((u) => u !== "/og.png");

// Páginas: "/sobre/index.html" também é guardada como "/sobre/".
const urls = new Set();
for (const u of arquivos) {
  urls.add(u);
  if (u.endsWith("/index.html")) urls.add(u.slice(0, -"index.html".length));
}
const lista = [...urls].sort();

const hash = crypto.createHash("sha256");
for (const u of arquivos) hash.update(u).update(fs.readFileSync(path.join(OUT, u)));
const versao = "jdd-" + hash.digest("hex").slice(0, 12);

const sw = `/* Gerado por scripts/gerar-sw.mjs. Não edite à mão. */
const CACHE = ${JSON.stringify(versao)};
const ARQUIVOS = ${JSON.stringify(lista)};

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // métricas e links externos seguem direto
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    let resp = await cache.match(req, { ignoreSearch: true });
    if (!resp && req.mode === "navigate") {
      const caminho = url.pathname.endsWith("/") ? url.pathname : url.pathname + "/";
      resp = (await cache.match(caminho)) || (await cache.match(caminho + "index.html"));
    }
    if (resp) return resp;
    try {
      const rede = await fetch(req);
      if (rede.ok && rede.type === "basic") cache.put(req, rede.clone()).catch(() => {});
      return rede;
    } catch (err) {
      if (req.mode === "navigate") return (await cache.match("/")) || Response.error();
      throw err;
    }
  })());
});
`;

fs.writeFileSync(path.join(OUT, "sw.js"), sw);
const kb = arquivos.reduce((t, u) => t + fs.statSync(path.join(OUT, u)).size, 0) / 1024;
console.log(`sw.js gerado: ${lista.length} endereços no cache (${kb.toFixed(0)} KB), versão ${versao}`);
