/**
 * Nim: fileiras de 1, 3, 5 e 7 palitos. Na sua vez, tire quantos quiser de uma fileira só.
 * Quem tirar o último palito ganha. (Existe uma estratégia que sempre ganha, e achar ela é o jogo.)
 */
import { inteiro, outroLado, type Lado, type Motor } from "./motor.ts";

export type EstadoNim = { filas: number[]; vez: Lado; ultimo: Lado | null };
export type JogadaNim = { fila: number; quantos: number };

export const FILAS_NIM = [1, 3, 5, 7];

export const motorNim: Motor<EstadoNim, JogadaNim> = {
  id: "nim",
  inicial: () => ({ filas: [...FILAS_NIM], vez: 0, ultimo: null }),
  vez: (e) => e.vez,
  valida: (e, j) => j.fila >= 0 && j.fila < e.filas.length && j.quantos >= 1 && j.quantos <= e.filas[j.fila],
  aplicar: (e, j) => ({
    filas: e.filas.map((v, i) => (i === j.fila ? v - j.quantos : v)),
    vez: outroLado(e.vez),
    ultimo: e.vez,
  }),
  resultado: (e) => (e.filas.every((v) => v === 0) ? { vencedor: e.ultimo, motivo: "tirou o último palito" } : null),
  ehJogada: (x): x is JogadaNim => {
    const j = x as JogadaNim | null;
    return !!j && inteiro(j.fila, 0, FILAS_NIM.length - 1) && inteiro(j.quantos, 1, 7);
  },
};

/** A conta secreta do Nim: o "ou exclusivo" das fileiras. Zero = quem vai jogar está em desvantagem. */
export const somaNim = (filas: readonly number[]) => filas.reduce((a, b) => a ^ b, 0);
