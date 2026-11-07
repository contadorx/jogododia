/**
 * Trilha (moinho), com 9 peças para cada um.
 *
 * - Primeiro, cada um põe uma peça por vez num ponto livre, até pôr as 9.
 * - Depois, cada um move uma peça por vez para um ponto vizinho livre, seguindo as linhas.
 * - Quem tem só 3 peças pode "voar": mover uma peça para qualquer ponto livre.
 * - Fez uma linha de 3 peças suas (um moinho)? Tire uma peça do outro. Peças que estão num moinho
 *   ficam protegidas, a não ser que todas as peças do outro estejam em moinhos.
 * - Perde quem ficar com 2 peças ou não tiver como mover nenhuma peça.
 * - Para a partida não rodar para sempre: 50 jogadas seguidas sem ninguém tirar peça é empate.
 *
 * Os 24 pontos, numerados assim (3 quadrados, um dentro do outro, ligados pelo meio dos lados):
 *
 *   0 ----------- 1 ----------- 2
 *   |   3 ------- 4 ------- 5   |
 *   |   |   6 --- 7 --- 8   |   |
 *   9 - 10 - 11        12 - 13 - 14
 *   |   |  15 -- 16 -- 17   |   |
 *   |  18 ------ 19 ------ 20   |
 *  21 ---------- 22 ---------- 23
 */
import { inteiro, outroLado, type Lado, type Motor } from "./motor.ts";

export const PONTOS = 24;
export const PECAS_TRILHA = 9;
export const LIMITE_TRILHA = 50;

export const VIZINHOS: readonly (readonly number[])[] = [
  [1, 9], [0, 2, 4], [1, 14],
  [4, 10], [1, 3, 5, 7], [4, 13],
  [7, 11], [4, 6, 8], [7, 12],
  [0, 10, 21], [3, 9, 11, 18], [6, 10, 15], [8, 13, 17], [5, 12, 14, 20], [2, 13, 23],
  [11, 16], [15, 17, 19], [12, 16],
  [10, 19], [16, 18, 20, 22], [13, 19],
  [9, 22], [19, 21, 23], [14, 22],
];

export const MOINHOS: readonly (readonly number[])[] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10, 11], [12, 13, 14], [15, 16, 17], [18, 19, 20], [21, 22, 23],
  [0, 9, 21], [3, 10, 18], [6, 11, 15], [1, 4, 7], [16, 19, 22], [8, 12, 17], [5, 13, 20], [2, 14, 23],
];

/** Posição de cada ponto numa grade de 7 por 7 (coluna, linha), para desenhar. */
export const POSICAO: readonly (readonly [number, number])[] = [
  [0, 0], [3, 0], [6, 0],
  [1, 1], [3, 1], [5, 1],
  [2, 2], [3, 2], [4, 2],
  [0, 3], [1, 3], [2, 3], [4, 3], [5, 3], [6, 3],
  [2, 4], [3, 4], [4, 4],
  [1, 5], [3, 5], [5, 5],
  [0, 6], [3, 6], [6, 6],
];

export type JogadaTrilha = { de: number | null; para: number; tira: number | null };

export type EstadoTrilha = {
  casas: (Lado | null)[];
  naMao: [number, number];
  noTabuleiro: [number, number];
  vez: Lado;
  semCaptura: number;
  feitas: number;
  ultima: JogadaTrilha | null;
  fim: { vencedor: Lado | null; motivo: string } | null;
};

export const formaMoinho = (casas: readonly (Lado | null)[], ponto: number, lado: Lado) =>
  MOINHOS.some((m) => m.includes(ponto) && m.every((p) => casas[p] === lado));

/** Peças do lado que podem ser tiradas: as que não estão em moinho (ou todas, se todas estiverem). */
export function removiveis(casas: readonly (Lado | null)[], lado: Lado): number[] {
  const dele = casas.flatMap((c, i) => (c === lado ? [i] : []));
  const soltas = dele.filter((i) => !formaMoinho(casas, i, lado));
  return soltas.length > 0 ? soltas : dele;
}

/** Fase de quem joga agora. */
export function faseDe(e: EstadoTrilha): "por" | "mover" | "voar" {
  if (e.naMao[e.vez] > 0) return "por";
  return e.noTabuleiro[e.vez] === 3 ? "voar" : "mover";
}

/** Para onde a peça em `de` pode ir (ou onde pôr, com de = null). */
export function destinos(e: EstadoTrilha, de: number | null): number[] {
  const livres = (lista: readonly number[]) => lista.filter((p) => e.casas[p] === null);
  const fase = faseDe(e);
  if (fase === "por") return de === null ? livres([...Array(PONTOS).keys()]) : [];
  if (de === null || e.casas[de] !== e.vez) return [];
  return fase === "voar" ? livres([...Array(PONTOS).keys()]) : livres(VIZINHOS[de]);
}

/** Depois de pôr ou mover para `para`, que peças do outro dá para tirar (vazio se não fez moinho). */
export function tirarDepois(e: EstadoTrilha, de: number | null, para: number): number[] {
  const casas = [...e.casas];
  if (de !== null) casas[de] = null;
  casas[para] = e.vez;
  return formaMoinho(casas, para, e.vez) ? removiveis(casas, outroLado(e.vez)) : [];
}

/** Todas as jogadas de quem joga agora (com a escolha da peça a tirar, quando houver). */
export function jogadasTrilha(e: EstadoTrilha): JogadaTrilha[] {
  if (e.fim) return [];
  const origens = faseDe(e) === "por" ? [null] : e.casas.flatMap((c, i) => (c === e.vez ? [i] : []));
  return origens.flatMap((de) =>
    destinos(e, de).flatMap((para): JogadaTrilha[] => {
      const tira = tirarDepois(e, de, para);
      return tira.length ? tira.map((t) => ({ de, para, tira: t })) : [{ de, para, tira: null }];
    }),
  );
}

export const motorTrilha: Motor<EstadoTrilha, JogadaTrilha> = {
  id: "trilha",
  inicial: () => ({
    casas: Array(PONTOS).fill(null),
    naMao: [PECAS_TRILHA, PECAS_TRILHA],
    noTabuleiro: [0, 0],
    vez: 0,
    semCaptura: 0,
    feitas: 0,
    ultima: null,
    fim: null,
  }),
  vez: (e) => e.vez,
  valida: (e, j) => {
    if (e.fim || !destinos(e, j.de).includes(j.para)) return false;
    const tira = tirarDepois(e, j.de, j.para);
    return tira.length ? j.tira !== null && tira.includes(j.tira) : j.tira === null;
  },
  aplicar: (e, j) => {
    const quem = e.vez;
    const outro = outroLado(quem);
    const casas = [...e.casas];
    const naMao: [number, number] = [e.naMao[0], e.naMao[1]];
    const noTabuleiro: [number, number] = [e.noTabuleiro[0], e.noTabuleiro[1]];
    if (j.de === null) {
      naMao[quem] -= 1;
      noTabuleiro[quem] += 1;
    } else casas[j.de] = null;
    casas[j.para] = quem;
    if (j.tira !== null) {
      casas[j.tira] = null;
      noTabuleiro[outro] -= 1;
    }
    const movendo = e.naMao[0] === 0 && e.naMao[1] === 0;
    const novo: EstadoTrilha = {
      casas,
      naMao,
      noTabuleiro,
      vez: outro,
      semCaptura: j.tira !== null ? 0 : movendo ? e.semCaptura + 1 : 0,
      feitas: e.feitas + 1,
      ultima: j,
      fim: null,
    };
    if (naMao[outro] + noTabuleiro[outro] < 3) return { ...novo, fim: { vencedor: quem, motivo: "deixou o outro com só 2 peças" } };
    if (naMao[outro] === 0 && noTabuleiro[outro] > 3 && jogadasTrilha(novo).length === 0) {
      return { ...novo, fim: { vencedor: quem, motivo: "deixou o outro sem nenhuma peça para mover" } };
    }
    if (novo.semCaptura >= LIMITE_TRILHA) return { ...novo, fim: { vencedor: null, motivo: `${LIMITE_TRILHA} jogadas sem ninguém tirar peça` } };
    return novo;
  },
  resultado: (e) => e.fim,
  ehJogada: (x): x is JogadaTrilha => {
    const j = x as JogadaTrilha | null;
    if (!j || typeof j !== "object") return false;
    const ponto = (v: unknown) => v === null || inteiro(v, 0, PONTOS - 1);
    return ponto(j.de) && inteiro(j.para, 0, PONTOS - 1) && ponto(j.tira);
  },
};
