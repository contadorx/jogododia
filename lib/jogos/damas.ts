/**
 * Damas, com a regra brasileira (a mesma das competições da Confederação Brasileira de Damas):
 *
 * - Tabuleiro de 8 por 8, 12 pedras para cada um nas casas escuras. As brancas começam.
 * - A pedra anda uma casa na diagonal, para a frente. Captura pulando a peça do outro, para a frente
 *   ou para trás, e continua capturando enquanto der, no mesmo lance.
 * - Capturar é obrigatório. Havendo mais de um jeito, vale o que captura mais peças (lei da maioria);
 *   pedra e dama valem o mesmo.
 * - A pedra que termina o lance na última fileira vira dama. Se só passar por ela no meio de uma
 *   captura, não vira.
 * - A dama anda quantas casas quiser na diagonal e captura de longe: pula uma peça do outro e para em
 *   qualquer casa livre depois dela.
 * - As peças capturadas só saem no fim do lance (não dá para pular a mesma peça duas vezes).
 * - Perde quem ficar sem peças ou sem lance. 20 lances seguidos só de damas, sem captura, é empate.
 *
 * Casa (linha r, coluna c), índice r * 8 + c, com a linha 0 lá em cima (o lado das pretas). As casas
 * escuras são as de (r + c) ímpar, o que deixa a casa escura no canto esquerdo de cada jogador.
 */
import { outroLado, type Lado, type Motor } from "./motor.ts";

export const LADO_D = 8;
export const LIMITE_DAMAS = 20;

export type Peca = { l: Lado; d: boolean };
export type Lance = { caminho: number[]; capturadas: number[] };
export type JogadaDamas = { caminho: number[] };

export type EstadoDamas = {
  casas: (Peca | null)[];
  vez: Lado;
  /** Lances seguidos só de damas, sem captura. */
  soDamas: number;
  feitas: number;
  ultimo: Lance | null;
  fim: { vencedor: Lado | null; motivo: string } | null;
};

export const escura = (i: number) => (Math.floor(i / LADO_D) + (i % LADO_D)) % 2 === 1;
const DIAGONAIS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
] as const;

/** A casa a `passos` casas de i, na direção (dr, dc), ou -1 se sair do tabuleiro. */
function andar(i: number, dr: number, dc: number, passos = 1): number {
  const r = Math.floor(i / LADO_D) + dr * passos;
  const c = (i % LADO_D) + dc * passos;
  return r >= 0 && r < LADO_D && c >= 0 && c < LADO_D ? r * LADO_D + c : -1;
}

/** Para onde a pedra de cada lado anda: as brancas sobem (linha diminui), as pretas descem. */
const frente = (l: Lado) => (l === 0 ? -1 : 1);
const fileiraDeCoroar = (l: Lado) => (l === 0 ? 0 : LADO_D - 1);

/** Todas as sequências de captura da peça em `s` (só as que terminam porque não dá mais para capturar). */
function capturasDe(casas: readonly (Peca | null)[], s: number): Lance[] {
  const peca = casas[s];
  if (!peca) return [];
  const resultado: Lance[] = [];
  // a casa de onde a peça saiu fica livre durante o lance
  const livre = (q: number) => q !== -1 && (casas[q] === null || q === s);

  const seguir = (pos: number, caminho: number[], capturadas: number[]) => {
    let continuou = false;
    for (const [dr, dc] of DIAGONAIS) {
      if (!peca.d) {
        const meio = andar(pos, dr, dc);
        const depois = andar(pos, dr, dc, 2);
        const alvo = meio === -1 ? null : casas[meio];
        if (alvo && alvo.l !== peca.l && !capturadas.includes(meio) && livre(depois)) {
          continuou = true;
          seguir(depois, [...caminho, depois], [...capturadas, meio]);
        }
      } else {
        let k = 1;
        let q = andar(pos, dr, dc, k);
        while (livre(q)) q = andar(pos, dr, dc, ++k);
        if (q === -1) continue;
        const alvo = casas[q];
        if (!alvo || alvo.l === peca.l || capturadas.includes(q)) continue;
        let m = 1;
        let pouso = andar(q, dr, dc, m);
        while (livre(pouso)) {
          continuou = true;
          seguir(pouso, [...caminho, pouso], [...capturadas, q]);
          pouso = andar(q, dr, dc, ++m);
        }
      }
    }
    if (!continuou && capturadas.length > 0) resultado.push({ caminho, capturadas });
  };

  seguir(s, [s], []);
  return resultado;
}

/** Os lances permitidos para quem joga agora (já com a captura obrigatória e a lei da maioria). */
export function lancesDamas(e: Pick<EstadoDamas, "casas" | "vez">): Lance[] {
  const minhas = e.casas.flatMap((p, i) => (p && p.l === e.vez ? [i] : []));
  const capturas = minhas.flatMap((s) => capturasDe(e.casas, s));
  if (capturas.length > 0) {
    const maximo = Math.max(...capturas.map((l) => l.capturadas.length));
    return capturas.filter((l) => l.capturadas.length === maximo);
  }
  const simples: Lance[] = [];
  for (const s of minhas) {
    const peca = e.casas[s] as Peca;
    for (const [dr, dc] of DIAGONAIS) {
      if (!peca.d) {
        if (dr !== frente(peca.l)) continue;
        const q = andar(s, dr, dc);
        if (q !== -1 && e.casas[q] === null) simples.push({ caminho: [s, q], capturadas: [] });
      } else {
        for (let k = 1, q = andar(s, dr, dc); q !== -1 && e.casas[q] === null; q = andar(s, dr, dc, ++k)) {
          simples.push({ caminho: [s, q], capturadas: [] });
        }
      }
    }
  }
  return simples;
}

const mesmoCaminho = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((x, i) => x === b[i]);

function inicialDamas(): EstadoDamas {
  const casas: (Peca | null)[] = Array(LADO_D * LADO_D).fill(null);
  for (let i = 0; i < casas.length; i++) {
    if (!escura(i)) continue;
    const r = Math.floor(i / LADO_D);
    if (r <= 2) casas[i] = { l: 1, d: false };
    if (r >= 5) casas[i] = { l: 0, d: false };
  }
  return { casas, vez: 0, soDamas: 0, feitas: 0, ultimo: null, fim: null };
}

export const motorDamas: Motor<EstadoDamas, JogadaDamas> = {
  id: "damas",
  inicial: inicialDamas,
  vez: (e) => e.vez,
  valida: (e, j) => !e.fim && lancesDamas(e).some((l) => mesmoCaminho(l.caminho, j.caminho)),
  aplicar: (e, j) => {
    const lance = lancesDamas(e).find((l) => mesmoCaminho(l.caminho, j.caminho));
    if (!lance) return e;
    const casas = [...e.casas];
    const origem = lance.caminho[0];
    const destino = lance.caminho[lance.caminho.length - 1];
    const peca = casas[origem] as Peca;
    casas[origem] = null;
    for (const c of lance.capturadas) casas[c] = null;
    const coroa = !peca.d && Math.floor(destino / LADO_D) === fileiraDeCoroar(peca.l);
    casas[destino] = { l: peca.l, d: peca.d || coroa };
    const soDamas = peca.d && lance.capturadas.length === 0 ? e.soDamas + 1 : 0;
    const novo: EstadoDamas = { casas, vez: outroLado(e.vez), soDamas, feitas: e.feitas + 1, ultimo: lance, fim: null };
    if (lancesDamas(novo).length === 0) {
      const semPecas = !casas.some((p) => p && p.l === novo.vez);
      return { ...novo, fim: { vencedor: e.vez, motivo: semPecas ? "capturou todas as peças do outro" : "deixou o outro sem lance" } };
    }
    if (soDamas >= LIMITE_DAMAS) return { ...novo, fim: { vencedor: null, motivo: `${LIMITE_DAMAS} lances seguidos só de damas, sem captura` } };
    return novo;
  },
  resultado: (e) => e.fim,
  ehJogada: (x): x is JogadaDamas => {
    const j = x as JogadaDamas | null;
    return (
      !!j &&
      Array.isArray(j.caminho) &&
      j.caminho.length >= 2 &&
      j.caminho.length <= 16 &&
      j.caminho.every((v) => typeof v === "number" && Number.isInteger(v) && v >= 0 && v < LADO_D * LADO_D)
    );
  },
};
