/**
 * Pontinhos (o "jogo dos quadradinhos"): uma grade de 5 por 5 pontos forma 16 quadrados. Na sua vez,
 * ligue dois pontos vizinhos. Quem fecha o quarto lado de um quadrado fica com ele e joga de novo.
 * Quando todas as linhas estiverem feitas, ganha quem tiver mais quadrados.
 */
import { inteiro, outroLado, type Lado, type Motor } from "./motor.ts";

/** Quadrados em cada lado da grade (a grade tem LADO + 1 pontos por lado). */
export const LADO_P = 4;
/** Linhas horizontais: LADO + 1 fileiras de LADO linhas. As verticais vêm depois delas. */
export const HORIZONTAIS = (LADO_P + 1) * LADO_P;
export const TOTAL_LINHAS = 2 * HORIZONTAIS;
export const TOTAL_QUADRADOS = LADO_P * LADO_P;

/** Linha horizontal que sai do ponto (fileira f, coluna c) para a direita. */
export const linhaH = (f: number, c: number) => f * LADO_P + c;
/** Linha vertical que sai do ponto (fileira f, coluna c) para baixo. */
export const linhaV = (f: number, c: number) => HORIZONTAIS + f * (LADO_P + 1) + c;

export const ladosDoQuadrado = (f: number, c: number) => [linhaH(f, c), linhaH(f + 1, c), linhaV(f, c), linhaV(f, c + 1)];

/** De onde até onde vai a linha, em pontos (fileira, coluna). */
export function pontasDaLinha(l: number): { f: number; c: number; horizontal: boolean } {
  if (l < HORIZONTAIS) return { f: Math.floor(l / LADO_P), c: l % LADO_P, horizontal: true };
  const v = l - HORIZONTAIS;
  return { f: Math.floor(v / (LADO_P + 1)), c: v % (LADO_P + 1), horizontal: false };
}

/** Os quadrados (1 ou 2) que têm essa linha como lado, pelo índice f * LADO + c. */
export function quadradosDaLinha(l: number): number[] {
  const { f, c, horizontal } = pontasDaLinha(l);
  const lista: number[] = [];
  if (horizontal) {
    if (f > 0) lista.push((f - 1) * LADO_P + c);
    if (f < LADO_P) lista.push(f * LADO_P + c);
  } else {
    if (c > 0) lista.push(f * LADO_P + c - 1);
    if (c < LADO_P) lista.push(f * LADO_P + c);
  }
  return lista;
}

export type EstadoPontinhos = {
  /** Quem fez cada linha (null = ainda não feita). */
  linhas: (Lado | null)[];
  /** Dono de cada quadrado. */
  quadrados: (Lado | null)[];
  vez: Lado;
  pontos: [number, number];
  feitas: number;
};

export type JogadaPontinhos = { linha: number };

export const motorPontinhos: Motor<EstadoPontinhos, JogadaPontinhos> = {
  id: "pontinhos",
  inicial: () => ({
    linhas: Array(TOTAL_LINHAS).fill(null),
    quadrados: Array(TOTAL_QUADRADOS).fill(null),
    vez: 0,
    pontos: [0, 0],
    feitas: 0,
  }),
  vez: (e) => e.vez,
  valida: (e, j) => j.linha >= 0 && j.linha < TOTAL_LINHAS && e.linhas[j.linha] === null,
  aplicar: (e, j) => {
    const linhas = [...e.linhas];
    linhas[j.linha] = e.vez;
    const quadrados = [...e.quadrados];
    const pontos: [number, number] = [e.pontos[0], e.pontos[1]];
    let fechou = false;
    for (const q of quadradosDaLinha(j.linha)) {
      const f = Math.floor(q / LADO_P);
      const c = q % LADO_P;
      if (quadrados[q] === null && ladosDoQuadrado(f, c).every((l) => linhas[l] !== null)) {
        quadrados[q] = e.vez;
        pontos[e.vez] += 1;
        fechou = true;
      }
    }
    return { linhas, quadrados, pontos, vez: fechou ? e.vez : outroLado(e.vez), feitas: e.feitas + 1 };
  },
  resultado: (e) => {
    if (e.feitas < TOTAL_LINHAS) return null;
    const [a, b] = e.pontos;
    if (a === b) return { vencedor: null, motivo: `${a} quadrados para cada um` };
    return { vencedor: a > b ? 0 : 1, motivo: `${Math.max(a, b)} quadrados a ${Math.min(a, b)}` };
  },
  ehJogada: (x): x is JogadaPontinhos => !!x && typeof x === "object" && inteiro((x as JogadaPontinhos).linha, 0, TOTAL_LINHAS - 1),
};
