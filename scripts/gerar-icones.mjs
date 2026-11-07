// Gera os ícones de public/icons a partir do desenho de lib/marca.ts. Rode com: npm run icones
// Usa o sharp, que não fica no package.json (só serve para gerar imagens). Se faltar:
//   npm i --no-save sharp
import fs from "node:fs";
import { createRequire } from "node:module";
import { marcaSvg } from "../lib/marca.ts";

let sharp;
try {
  sharp = createRequire(import.meta.url)("sharp");
} catch {
  console.error("Este script usa o sharp. Rode antes: npm i --no-save sharp");
  process.exit(1);
}

const PASTA = "public/icons";
fs.mkdirSync(PASTA, { recursive: true });

// Na aba do navegador o tabuleiro ocupa quase tudo; nos ícones do app, fundo branco com folga.
// Ícone "mascarável": o Android recorta em círculo, então o desenho fica dentro dos 80% do meio.
const favicon = marcaSvg({ escala: 1.15 });
fs.writeFileSync(`${PASTA}/favicon.svg`, favicon);

const gerar = (svg, tamanho, arquivo) =>
  sharp(Buffer.from(svg), { density: 600 }).resize(tamanho, tamanho).png().toFile(`${PASTA}/${arquivo}`);

await gerar(favicon, 48, "favicon-48.png");
await gerar(marcaSvg({ fundo: "#FFFFFF", escala: 0.9 }), 180, "apple-touch-icon.png");
await gerar(marcaSvg({ fundo: "#FFFFFF", raio: 14, escala: 0.9 }), 192, "icone-192.png");
await gerar(marcaSvg({ fundo: "#FFFFFF", raio: 14, escala: 0.9 }), 512, "icone-512.png");
await gerar(marcaSvg({ fundo: "#FFFFFF", escala: 0.7 }), 192, "icone-mascaravel-192.png");
await gerar(marcaSvg({ fundo: "#FFFFFF", escala: 0.7 }), 512, "icone-mascaravel-512.png");
console.log("Ícones gerados em public/icons");
