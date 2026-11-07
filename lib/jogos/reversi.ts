/**
 * Reversi: tabuleiro de 8 por 8, começa com 4 peças no meio. Na sua vez, ponha uma peça de modo a
 * prender, numa linha reta (deitada, em pé ou na diagonal), uma ou mais peças do outro entre a peça
 * nova e outra sua: as peças presas viram para a sua cor. Quem não tem jogada passa a vez (o site
 * passa sozinho). Quando ninguém mais pode jogar, ganha quem tiver mais peças.
 *
 * As pretas (lado 0) começam. Casa (linha r, coluna c), índice r * 8 + c, com a linha 0 lá em cima.
 */
import { inteiro, outroLado, type Lado, type Motor } from "./motor.ts";

export const LADO_RV = 8;
const DIRECOES = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
] as const;

export type EstadoReversi = {
  casas: (Lado | null)[];
  vez: Lado;
  feitas: number;
  ultima: number | null;
  /** Peças que viraram na última jogada (para destacar). */
  viradas: number[];
  /** Quem acabou de passar a vez por não ter jogada. */
  passou: Lado | null;
  fim: { vencedor: Lado | null; motivo: string } | null;
};

export type JogadaReversi = { casa: number };

/** As peças do outro que viram se `lado` jogar em `casa` (vazio = jogada não vale). */
export function viradasPor(casas: readonly (Lado | null)[], casa: number, lado: Lado): number[] {
  if (casas[casa] !== null) return [];
  const r0 = Math.floor(casa / LADO_RV);
  const c0 = casa % LADO_RV;
  const todas: number[] = [];
  for (const [dr, dc] of DIRECOES) {
    const linha: number[] = [];
    let r = r0 + dr;
    let c = c0 + dc;
    while (r >= 0 && r < LADO_RV && c >= 0 && c < LADO_RV && casas[r * LADO_RV + c] === outroLado(lado)) {
      linha.push(r * LADO_RV + c);
      r += dr;
      c += dc;
    }
    if (linha.length && r >= 0 && r < LADO_RV && c >= 0 && c < LADO_RV && casas[r * LADO_RV + c] === lado) todas.push(...linha);
  }
  return todas;
}

export const jogadasDe = (casas: readonly (Lado | null)[], lado: Lado) =>
  casas.flatMap((_, i) => (viradasPor(casas, i, lado).length ? [i] : []));

export const contar = (casas: readonly (Lado | null)[]): [number, number] => [
  casas.filter((c) => c === 0).length,
  casas.filter((c) => c === 1).length,
];

function inicial(): EstadoReversi {
  const casas: (Lado | null)[] = Array(LADO_RV * LADO_RV).fill(null);
  // d5 e e4 pretas, d4 e e5 brancas
  casas[3 * 8 + 3] = 0;
  casas[4 * 8 + 4] = 0;
  casas[3 * 8 + 4] = 1;
  casas[4 * 8 + 3] = 1;
  return { casas, vez: 0, feitas: 0, ultima: null, viradas: [], passou: null, fim: null };
}

export const motorReversi: Motor<EstadoReversi, JogadaReversi> = {
  id: "reversi",
  inicial,
  vez: (e) => e.vez,
  valida: (e, j) => !e.fim && j.casa >= 0 && j.casa < LADO_RV * LADO_RV && viradasPor(e.casas, j.casa, e.vez).length > 0,
  aplicar: (e, j) => {
    const viradas = viradasPor(e.casas, j.casa, e.vez);
    if (!viradas.length) return e;
    const casas = [...e.casas];
    casas[j.casa] = e.vez;
    for (const v of viradas) casas[v] = e.vez;
    const outro = outroLado(e.vez);
    const base = { casas, feitas: e.feitas + 1, ultima: j.casa, viradas };
    if (jogadasDe(casas, outro).length) return { ...base, vez: outro, passou: null, fim: null };
    if (jogadasDe(casas, e.vez).length) return { ...base, vez: e.vez, passou: outro, fim: null };
    const [p, b] = contar(casas);
    const fim =
      p === b
        ? { vencedor: null, motivo: `${p} peças para cada um` }
        : { vencedor: (p > b ? 0 : 1) as Lado, motivo: `${Math.max(p, b)} peças a ${Math.min(p, b)}` };
    return { ...base, vez: outro, passou: null, fim };
  },
  resultado: (e) => e.fim,
  ehJogada: (x): x is JogadaReversi => !!x && typeof x === "object" && inteiro((x as JogadaReversi).casa, 0, LADO_RV * LADO_RV - 1),
};
