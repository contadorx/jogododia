// Gera public/og.png (1200 x 630), a imagem que aparece quando alguém manda um link do site
// no WhatsApp, Facebook, Telegram etc. Rode com: npm run og
// Usa o Playwright, que não fica no package.json. Se faltar:
//   npm i --no-save playwright && npx playwright install chromium
// (Com um Chrome já instalado: npm i --no-save playwright-core e CHROME=/caminho/do/chrome npm run og)
// O conteúdo fica no meio: o WhatsApp às vezes recorta a imagem em quadrado.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { marcaSvg } from "../lib/marca.ts";

function carregarPlaywright() {
  const exigir = createRequire(import.meta.url);
  for (const nome of ["playwright", "playwright-core"]) {
    try {
      return exigir(nome);
    } catch {
      /* tenta o próximo */
    }
  }
  console.error("Este script usa o Playwright. Rode antes: npm i --no-save playwright && npx playwright install chromium");
  process.exit(1);
}

const { chromium } = carregarPlaywright();
const fonte = (p) => pathToFileURL(path.resolve("node_modules", p)).href;

const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><style>
@font-face{font-family:Bri;src:url(${fonte("@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2")}) format("woff2");font-weight:200 800}
@font-face{font-family:Atk;src:url(${fonte("@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-normal.woff2")}) format("woff2");font-weight:400}
@font-face{font-family:Atk;src:url(${fonte("@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-normal.woff2")}) format("woff2");font-weight:700}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;background:#2F55C9;color:#fff;font-family:Atk;position:relative;
  display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.marca{width:176px;height:176px}
h1{font:800 70px/1 Bri;letter-spacing:-.025em;margin-top:14px}
p{font-size:30px;line-height:1.3;color:#E8EEFC;max-width:640px;margin-top:16px}
.selo{margin-top:24px;background:#FFC845;color:#1C2333;font-weight:700;font-size:23px;padding:10px 22px;border-radius:999px}
.f{position:absolute}
</style>
<svg class="f" style="left:-60px;top:-60px" width="250" height="250"><rect x="10" y="10" width="230" height="230" rx="40" fill="#FFC845"/></svg>
<svg class="f" style="right:-50px;bottom:-60px" width="240" height="240"><circle cx="120" cy="120" r="110" fill="#23804F"/></svg>
<svg class="f" style="right:96px;top:72px" width="64" height="64"><rect x="6" y="6" width="52" height="52" rx="10" fill="none" stroke="#E8EEFC" stroke-width="7"/></svg>
<svg class="f" style="left:120px;bottom:84px" width="60" height="60"><circle cx="30" cy="30" r="24" fill="none" stroke="#FFC845" stroke-width="7"/></svg>
<div class="marca">${marcaSvg({ tamanho: 176 })}</div>
<h1>Jogo do Dia</h1>
<p>Jogos clássicos e educativos para jogar junto com seu filho.</p>
<span class="selo">De 7 a 12 anos, de graça e sem cadastro</span>
</html>`;

const arquivo = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "og-")), "og.html");
fs.writeFileSync(arquivo, html);
const navegador = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const pagina = await navegador.newPage({ viewport: { width: 1200, height: 630 } });
await pagina.goto(pathToFileURL(arquivo).href);
await pagina.evaluate(() => document.fonts.ready);
await pagina.screenshot({ path: path.resolve("public/og.png") });
await navegador.close();
console.log("Imagem de prévia gerada em public/og.png");
