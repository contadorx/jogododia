/**
 * Quatro em linha: grade em pé de 7 colunas por 6 linhas. Na sua vez, solte uma peça numa coluna:
 * ela cai até a casa vazia mais baixa. Ganha quem alinhar 4 peças da sua cor na horizontal, na
 * vertical ou na diagonal. Grade cheia sem ninguém alinhar é empate.
 */
import { inteiro, outroLado, type Lado, type Motor } from "./motor.ts";

export const COLUNAS = 7;
export const LINHAS = 6;

/** Índice da casa. A linha 0 é a de baixo. */
export const casaQ = (linha: number, coluna: number) => linha * COLUNAS + coluna;

export type EstadoQuatro = {
  grade: (Lado | null)[];
  /** Quantas peças já tem em cada coluna. */
  alturas: number[];
  vez: Lado;
  feitas: number;
  vencedor: Lado | null;
  /** Casas da linha vencedora. */
  linha: number[] | null;
  /** Casa da última peça. */
  ultima: number | null;
};

export type JogadaQuatro = { coluna: number };

const DIRECOES = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
] as const;

/** A linha de 4 ou mais que passa pela casa, se houver. */
function linhaQuePassa(grade: (Lado | null)[], linha: number, coluna: number): number[] | null {
  const cor = grade[casaQ(linha, coluna)];
  if (cor === null) return null;
  for (const [dl, dc] of DIRECOES) {
    const casas = [casaQ(linha, coluna)];
    for (const sentido of [1, -1]) {
      let l = linha + dl * sentido;
      let c = coluna + dc * sentido;
      while (l >= 0 && l < LINHAS && c >= 0 && c < COLUNAS && grade[casaQ(l, c)] === cor) {
        casas.push(casaQ(l, c));
        l += dl * sentido;
        c += dc * sentido;
      }
    }
    if (casas.length >= 4) return casas.sort((a, b) => a - b);
  }
  return null;
}

export const motorQuatro: Motor<EstadoQuatro, JogadaQuatro> = {
  id: "quatro-em-linha",
  inicial: () => ({
    grade: Array(COLUNAS * LINHAS).fill(null),
    alturas: Array(COLUNAS).fill(0),
    vez: 0,
    feitas: 0,
    vencedor: null,
    linha: null,
    ultima: null,
  }),
  vez: (e) => e.vez,
  valida: (e, j) => e.linha === null && e.feitas < COLUNAS * LINHAS && j.coluna >= 0 && j.coluna < COLUNAS && e.alturas[j.coluna] < LINHAS,
  aplicar: (e, j) => {
    const linha = e.alturas[j.coluna];
    const grade = [...e.grade];
    grade[casaQ(linha, j.coluna)] = e.vez;
    const alturas = e.alturas.map((a, c) => (c === j.coluna ? a + 1 : a));
    const venceu = linhaQuePassa(grade, linha, j.coluna);
    return {
      grade,
      alturas,
      vez: venceu ? e.vez : outroLado(e.vez),
      feitas: e.feitas + 1,
      vencedor: venceu ? e.vez : null,
      linha: venceu,
      ultima: casaQ(linha, j.coluna),
    };
  },
  resultado: (e) => {
    if (e.vencedor !== null) return { vencedor: e.vencedor, motivo: "alinhou quatro peças" };
    if (e.feitas === COLUNAS * LINHAS) return { vencedor: null, motivo: "a grade encheu sem ninguém alinhar quatro" };
    return null;
  },
  ehJogada: (x): x is JogadaQuatro => !!x && typeof x === "object" && inteiro((x as JogadaQuatro).coluna, 0, COLUNAS - 1),
};
