/**
 * A marca do site: um tabuleiro de quatro casas com uma peça. Usa as mesmas cores do catavento
 * do Brincadeira do Dia (amarelo, branco e verde, contorno azul-marinho), para os dois sites
 * parecerem da mesma família.
 *
 * Desenho numa grade de 64 x 64, só com caminhos. Daqui saem o <Selo> do site, o favicon e os
 * ícones do app (public/icons, gerados uma vez a partir deste desenho).
 */
const TINTA = "#1C2333";
export const AZUL_MARCA = "#2F55C9";
const SOL = "#FFC845";
const FOLHA = "#23804F";
const BRANCO = "#FFFFFF";

export type Forma = { d: string; preenche?: string; contorno?: string; espessura?: number };

export const FORMAS_MARCA: readonly Forma[] = [
  { d: "M8 8H32V32H8Z", preenche: SOL },
  { d: "M32 8H56V32H32Z", preenche: BRANCO },
  { d: "M8 32H32V56H8Z", preenche: BRANCO },
  { d: "M32 32H56V56H32Z", preenche: FOLHA },
  { d: "M32 8V56M8 32H56", contorno: TINTA, espessura: 3 },
  { d: "M11 8H53Q56 8 56 11V53Q56 56 53 56H11Q8 56 8 53V11Q8 8 11 8Z", contorno: TINTA, espessura: 3 },
  // a peça, na casa branca de cima
  { d: "M37 20A7 7 0 1 0 51 20A7 7 0 1 0 37 20Z", preenche: AZUL_MARCA, contorno: TINTA, espessura: 3 },
];

const paraSvg = (formas: readonly Forma[]) =>
  formas
    .map(
      (f) =>
        `<path d="${f.d}" fill="${f.preenche ?? "none"}"${
          f.contorno ? ` stroke="${f.contorno}" stroke-width="${f.espessura}" stroke-linejoin="round" stroke-linecap="round"` : ""
        }/>`,
    )
    .join("");

export const MARCA_CORPO = paraSvg(FORMAS_MARCA);

/** SVG completo da marca, com fundo opcional (ícones do app). */
export function marcaSvg({ fundo, raio = 0, escala = 1, tamanho = 64 }: { fundo?: string; raio?: number; escala?: number; tamanho?: number } = {}) {
  const quadro = fundo ? `<rect width="64" height="64" rx="${raio}" fill="${fundo}"/>` : "";
  const corpo = `<g transform="translate(32 32) scale(${escala}) translate(-32 -32)">${MARCA_CORPO}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${tamanho}" height="${tamanho}">${quadro}${corpo}</svg>`;
}
