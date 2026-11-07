/**
 * Hex: tabuleiro em losango de 9 por 9 casas hexagonais. Na sua vez, ponha uma peça em qualquer casa
 * livre. O vermelho tenta ligar as duas bordas vermelhas (a de cima à direita e a de baixo à
 * esquerda); o azul, as duas bordas azuis. Peças não saem do lugar. Hex nunca termina empatado:
 * quando o tabuleiro enche, alguém sempre ligou as suas bordas.
 *
 * Casa (linha r, coluna c), índice r * 9 + c. Vizinhas: (r, c±1), (r±1, c), (r-1, c+1), (r+1, c-1).
 * O lado 0 (vermelho) liga a linha 0 à linha 8; o lado 1 (azul) liga a coluna 0 à coluna 8.
 */
import { inteiro, outroLado, type Lado, type Motor } from "./motor.ts";

export const N_HEX = 9;
export const TOTAL_HEX = N_HEX * N_HEX;

export function vizinhasHex(i: number): number[] {
  const r = Math.floor(i / N_HEX);
  const c = i % N_HEX;
  const lista: number[] = [];
  for (const [dr, dc] of [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [1, -1],
  ]) {
    const rr = r + dr;
    const cc = c + dc;
    if (rr >= 0 && rr < N_HEX && cc >= 0 && cc < N_HEX) lista.push(rr * N_HEX + cc);
  }
  return lista;
}

/** A borda de saída e a de chegada de cada lado. */
const naPrimeira = (lado: Lado, i: number) => (lado === 0 ? Math.floor(i / N_HEX) === 0 : i % N_HEX === 0);
const naUltima = (lado: Lado, i: number) => (lado === 0 ? Math.floor(i / N_HEX) === N_HEX - 1 : i % N_HEX === N_HEX - 1);

/** O caminho mais curto de peças do lado que liga as duas bordas dele, se existir. */
export function caminhoHex(casas: readonly (Lado | null)[], lado: Lado): number[] | null {
  const veio = new Map<number, number>();
  const fila: number[] = [];
  for (let i = 0; i < TOTAL_HEX; i++) {
    if (casas[i] === lado && naPrimeira(lado, i)) {
      veio.set(i, -1);
      fila.push(i);
    }
  }
  for (let k = 0; k < fila.length; k++) {
    const i = fila[k];
    if (naUltima(lado, i)) {
      const caminho: number[] = [];
      for (let x = i; x !== -1; x = veio.get(x) ?? -1) caminho.push(x);
      return caminho.reverse();
    }
    for (const v of vizinhasHex(i)) {
      if (casas[v] === lado && !veio.has(v)) {
        veio.set(v, i);
        fila.push(v);
      }
    }
  }
  return null;
}

export type EstadoHex = {
  casas: (Lado | null)[];
  vez: Lado;
  feitas: number;
  vencedor: Lado | null;
  caminho: number[] | null;
  ultima: number | null;
};

export type JogadaHex = { casa: number };

export const motorHex: Motor<EstadoHex, JogadaHex> = {
  id: "hex",
  inicial: () => ({ casas: Array(TOTAL_HEX).fill(null), vez: 0, feitas: 0, vencedor: null, caminho: null, ultima: null }),
  vez: (e) => e.vez,
  valida: (e, j) => e.vencedor === null && j.casa >= 0 && j.casa < TOTAL_HEX && e.casas[j.casa] === null,
  aplicar: (e, j) => {
    const casas = [...e.casas];
    casas[j.casa] = e.vez;
    const caminho = caminhoHex(casas, e.vez);
    return {
      casas,
      vez: caminho ? e.vez : outroLado(e.vez),
      feitas: e.feitas + 1,
      vencedor: caminho ? e.vez : null,
      caminho,
      ultima: j.casa,
    };
  },
  resultado: (e) => (e.vencedor === null ? null : { vencedor: e.vencedor, motivo: "ligou as suas duas bordas" }),
  ehJogada: (x): x is JogadaHex => !!x && typeof x === "object" && inteiro((x as JogadaHex).casa, 0, TOTAL_HEX - 1),
};
