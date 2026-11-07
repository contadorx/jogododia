/**
 * Jogo da onça, jogado pelos povos Bororo (Mato Grosso) e Manchineri (Acre), entre outros.
 *
 * - Tabuleiro: uma grade de 5 por 5 pontos com diagonais (como o do alquerque) e, de um lado, um
 *   triângulo com mais 6 pontos: a toca da onça. Ao todo, 31 pontos.
 * - Uma onça, no centro, contra 14 cachorros, nas duas fileiras e meia do lado oposto à toca.
 * - A onça joga primeiro. Cada um, na sua vez, anda uma peça para um ponto vizinho livre, seguindo
 *   as linhas.
 * - A onça captura pulando um cachorro vizinho, em linha reta, para o ponto livre logo depois dele, e
 *   pode emendar outros pulos na mesma vez (se quiser). Os cachorros não capturam.
 * - A onça ganha se capturar 5 cachorros. Os cachorros ganham se deixarem a onça sem nenhum movimento.
 * - Para a partida não rodar para sempre: 80 jogadas seguidas sem captura é empate.
 *
 * Pontos: os 25 da grade são (x, y), com x e y de 0 a 4 e a linha y = 0 encostada na toca (índice
 * y * 5 + x). Os 6 da toca têm y = -1 (x = 1, 2, 3) e y = -2 (x = 0, 2, 4), índices 25 a 30.
 */
import type { Lado, Motor } from "./motor.ts";

export const PONTOS_ONCA: readonly (readonly [number, number])[] = [
  ...Array.from({ length: 25 }, (_, i) => [i % 5, Math.floor(i / 5)] as const),
  [1, -1],
  [2, -1],
  [3, -1],
  [0, -2],
  [2, -2],
  [4, -2],
];
const indice = (x: number, y: number) => PONTOS_ONCA.findIndex(([a, b]) => a === x && b === y);

/** As linhas do tabuleiro (cada par é um trecho entre dois pontos vizinhos). */
export const LINHAS_ONCA: readonly (readonly [number, number])[] = (() => {
  const l: [number, number][] = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const i = y * 5 + x;
      if (x < 4) l.push([i, i + 1]);
      if (y < 4) l.push([i, i + 5]);
      // diagonais saem dos pontos em que x + y é par
      if ((x + y) % 2 === 0 && y < 4) {
        if (x < 4) l.push([i, i + 6]);
        if (x > 0) l.push([i, i + 4]);
      }
    }
  }
  const [ml, mc, mr, tl, tc, tr] = [indice(1, -1), indice(2, -1), indice(3, -1), indice(0, -2), indice(2, -2), indice(4, -2)];
  const entrada = indice(2, 0);
  l.push([entrada, ml], [entrada, mc], [entrada, mr], [ml, mc], [mc, mr], [ml, tl], [mc, tc], [mr, tr], [tl, tc], [tc, tr]);
  return l;
})();

const VIZINHOS: number[][] = PONTOS_ONCA.map(() => []);
for (const [a, b] of LINHAS_ONCA) {
  VIZINHOS[a].push(b);
  VIZINHOS[b].push(a);
}
export const vizinhosOnca = (i: number) => VIZINHOS[i];

const direcao = (a: number, b: number) => {
  const [xa, ya] = PONTOS_ONCA[a];
  const [xb, yb] = PONTOS_ONCA[b];
  return [Math.sign(xb - xa), Math.sign(yb - ya)] as const;
};

/** O ponto depois de b, seguindo a linha a → b (ou -1). */
function seguinte(a: number, b: number): number {
  const [dx, dy] = direcao(a, b);
  return VIZINHOS[b].find((c) => {
    const [ex, ey] = direcao(b, c);
    return c !== a && ex === dx && ey === dy;
  }) ?? -1;
}

export const PARA_VENCER = 5;
export const LIMITE_ONCA = 80;

export type JogadaOnca = { caminho: number[] };
export type EstadoOnca = {
  onca: number;
  cachorros: number[];
  vez: Lado;
  capturados: number;
  semCaptura: number;
  feitas: number;
  ultima: { caminho: number[]; pegos: number[] } | null;
  fim: { vencedor: Lado | null; motivo: string } | null;
};

const ocupado = (e: Pick<EstadoOnca, "onca" | "cachorros">, p: number) => e.onca === p || e.cachorros.includes(p);

/** Todos os lances de quem joga agora. Para a onça, cada pulo emendado também pode parar no meio. */
export function lancesOnca(e: EstadoOnca): number[][] {
  if (e.fim) return [];
  if (e.vez === 1) return e.cachorros.flatMap((d) => VIZINHOS[d].filter((v) => !ocupado(e, v)).map((v) => [d, v]));
  const lances: number[][] = VIZINHOS[e.onca].filter((v) => !ocupado(e, v)).map((v) => [e.onca, v]);
  // pulos: o cachorro pulado sai na hora, e o ponto de onde a onça saiu fica livre
  const pular = (pos: number, caminho: number[], cachorros: number[]) => {
    for (const v of VIZINHOS[pos]) {
      if (!cachorros.includes(v)) continue;
      const alvo = seguinte(pos, v);
      if (alvo === -1 || cachorros.includes(alvo)) continue;
      const novo = [...caminho, alvo];
      lances.push(novo);
      pular(alvo, novo, cachorros.filter((c) => c !== v));
    }
  };
  pular(e.onca, [e.onca], e.cachorros);
  return lances;
}

/** Os cachorros pulados num lance da onça. */
function pegosNoCaminho(e: EstadoOnca, caminho: number[]): number[] {
  const pegos: number[] = [];
  for (let k = 1; k < caminho.length; k++) {
    const meio = VIZINHOS[caminho[k - 1]].find((v) => e.cachorros.includes(v) && seguinte(caminho[k - 1], v) === caminho[k]);
    if (meio !== undefined && !VIZINHOS[caminho[k - 1]].includes(caminho[k])) pegos.push(meio);
  }
  return pegos;
}

const mesmo = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((x, i) => x === b[i]);

export const motorOnca: Motor<EstadoOnca, JogadaOnca> = {
  id: "jogo-da-onca",
  inicial: () => ({
    onca: 12,
    // as fileiras y = 2 (menos o centro), 3 e 4
    cachorros: [10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
    vez: 0,
    capturados: 0,
    semCaptura: 0,
    feitas: 0,
    ultima: null,
    fim: null,
  }),
  vez: (e) => e.vez,
  valida: (e, j) => lancesOnca(e).some((l) => mesmo(l, j.caminho)),
  aplicar: (e, j) => {
    if (!lancesOnca(e).some((l) => mesmo(l, j.caminho))) return e;
    const fim = j.caminho[j.caminho.length - 1];
    let novo: EstadoOnca;
    if (e.vez === 0) {
      const pegos = pegosNoCaminho(e, j.caminho);
      const capturados = e.capturados + pegos.length;
      novo = {
        ...e,
        onca: fim,
        cachorros: e.cachorros.filter((c) => !pegos.includes(c)),
        capturados,
        semCaptura: pegos.length ? 0 : e.semCaptura + 1,
        vez: 1,
        feitas: e.feitas + 1,
        ultima: { caminho: j.caminho, pegos },
      };
      if (capturados >= PARA_VENCER) return { ...novo, fim: { vencedor: 0, motivo: `capturou ${capturados} cachorros` } };
    } else {
      novo = {
        ...e,
        cachorros: e.cachorros.map((c) => (c === j.caminho[0] ? fim : c)),
        semCaptura: e.semCaptura + 1,
        vez: 0,
        feitas: e.feitas + 1,
        ultima: { caminho: j.caminho, pegos: [] },
      };
      if (lancesOnca(novo).length === 0) return { ...novo, fim: { vencedor: 1, motivo: "cercaram a onça" } };
    }
    if (novo.semCaptura >= LIMITE_ONCA) return { ...novo, fim: { vencedor: null, motivo: `${LIMITE_ONCA} jogadas seguidas sem captura` } };
    return novo;
  },
  resultado: (e) => e.fim,
  ehJogada: (x): x is JogadaOnca => {
    const j = x as JogadaOnca | null;
    return (
      !!j &&
      Array.isArray(j.caminho) &&
      j.caminho.length >= 2 &&
      j.caminho.length <= 16 &&
      j.caminho.every((v) => typeof v === "number" && Number.isInteger(v) && v >= 0 && v < PONTOS_ONCA.length)
    );
  },
};
