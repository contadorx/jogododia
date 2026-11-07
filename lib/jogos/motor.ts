/**
 * Contrato das regras de um jogo de dois jogadores, por turnos e sem informação escondida
 * (xadrez, damas, quatro em linha...). Cada jogo implementa este contrato num arquivo próprio,
 * só com funções puras, e ganha de graça os dois modos: no mesmo aparelho e à distância.
 *
 * A partida inteira é a lista de jogadas: o estado sai de reproduzir as jogadas a partir do
 * início. Os dois aparelhos guardam a mesma lista (lib/jogos/turnos.ts) e chegam ao mesmo estado.
 */

/** 0 = quem começa; 1 = o outro. */
export type Lado = 0 | 1;

/** null = a partida continua. vencedor null = empate. */
export type Resultado = { vencedor: Lado | null; motivo?: string } | null;

export interface Motor<E, J> {
  id: string;
  inicial(): E;
  /** De quem é a vez. */
  vez(e: E): Lado;
  /** A jogada vale neste estado (inclui ser a vez de quem joga, já que a vez está no estado). */
  valida(e: E, j: J): boolean;
  /** Aplica uma jogada válida e devolve o estado novo (sem mudar o anterior). */
  aplicar(e: E, j: J): E;
  resultado(e: E): Resultado;
  /** Confere o formato de uma jogada que chegou pela rede (nunca confie no que chega). */
  ehJogada(x: unknown): x is J;
}

export const outroLado = (l: Lado): Lado => (l === 0 ? 1 : 0);

export function reproduzir<E, J>(motor: Motor<E, J>, jogadas: readonly J[]): E {
  let e = motor.inicial();
  for (const j of jogadas) e = motor.aplicar(e, j);
  return e;
}

/** Inteiro entre min e max (inclusive), para conferir dados que chegam pela rede. */
export const inteiro = (x: unknown, min: number, max: number): x is number =>
  typeof x === "number" && Number.isInteger(x) && x >= min && x <= max;
