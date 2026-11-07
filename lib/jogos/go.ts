/**
 * Go, no tabuleiro de 9 por 9.
 *
 * - As pretas (lado 0) começam. Na sua vez, ponha uma pedra num cruzamento livre, ou passe.
 * - Pedras da mesma cor encostadas (na horizontal ou vertical) formam um grupo. Os cruzamentos
 *   livres em volta são as liberdades. O grupo que fica sem nenhuma liberdade é capturado.
 * - Não vale jogar onde a sua pedra ficaria sem liberdade (a não ser que ela capture), nem repetir
 *   uma posição que já apareceu na partida (assim ninguém fica capturando e recapturando para sempre).
 * - Quando os dois passam seguido, a partida acaba e o site conta a área: pedras de cada um mais os
 *   cruzamentos vazios cercados só por pedras dele. As brancas ganham 7,5 de compensação, porque as
 *   pretas começam (o meio ponto evita empate). Pedras "mortas" não saem sozinhas: capture antes de passar.
 */
import { inteiro, outroLado, type Lado, type Motor } from "./motor.ts";

export const N_GO = 9;
export const KOMI = 7.5;
const TOTAL = N_GO * N_GO;

export type JogadaGo = { casa: number } | { passa: true };

export type EstadoGo = {
  casas: (Lado | null)[];
  vez: Lado;
  capturas: [number, number];
  /** Passes seguidos (2 = fim). */
  passes: number;
  feitas: number;
  ultima: number | "passou" | null;
  /** Posições que já apareceram, para a regra da repetição. */
  vistas: string[];
  fim: { vencedor: Lado; motivo: string; pontos: [number, number]; territorio: (Lado | null)[] } | null;
};

export function vizinhasGo(i: number): number[] {
  const r = Math.floor(i / N_GO);
  const c = i % N_GO;
  const v: number[] = [];
  if (r > 0) v.push(i - N_GO);
  if (r < N_GO - 1) v.push(i + N_GO);
  if (c > 0) v.push(i - 1);
  if (c < N_GO - 1) v.push(i + 1);
  return v;
}

/** O grupo da pedra em i e as liberdades dele. */
export function grupoDe(casas: readonly (Lado | null)[], i: number): { pedras: number[]; liberdades: number } {
  const cor = casas[i];
  const visto = new Set([i]);
  const livres = new Set<number>();
  const fila = [i];
  for (let k = 0; k < fila.length; k++) {
    for (const v of vizinhasGo(fila[k])) {
      if (casas[v] === null) livres.add(v);
      else if (casas[v] === cor && !visto.has(v)) {
        visto.add(v);
        fila.push(v);
      }
    }
  }
  return { pedras: fila, liberdades: livres.size };
}

const chave = (casas: readonly (Lado | null)[]) => casas.map((c) => (c === null ? "." : c === 0 ? "x" : "o")).join("");

/** Tenta a jogada: devolve o tabuleiro novo e quantas pedras capturou, ou null se não vale. */
function tentar(e: EstadoGo, casa: number): { casas: (Lado | null)[]; capturou: number } | null {
  if (e.fim || casa < 0 || casa >= TOTAL || e.casas[casa] !== null) return null;
  const casas = [...e.casas];
  casas[casa] = e.vez;
  let capturou = 0;
  for (const v of vizinhasGo(casa)) {
    if (casas[v] === outroLado(e.vez)) {
      const g = grupoDe(casas, v);
      if (g.liberdades === 0) {
        for (const p of g.pedras) casas[p] = null;
        capturou += g.pedras.length;
      }
    }
  }
  if (grupoDe(casas, casa).liberdades === 0) return null;
  if (e.vistas.includes(chave(casas))) return null;
  return { casas, capturou };
}

/** Área de cada um: pedras + cruzamentos vazios cercados só por ele. */
export function contarArea(casas: readonly (Lado | null)[]): { pontos: [number, number]; territorio: (Lado | null)[] } {
  const territorio: (Lado | null)[] = Array(TOTAL).fill(null);
  const pontos: [number, number] = [casas.filter((c) => c === 0).length, casas.filter((c) => c === 1).length];
  const visto = new Set<number>();
  for (let i = 0; i < TOTAL; i++) {
    if (casas[i] !== null || visto.has(i)) continue;
    const regiao = [i];
    const bordas = new Set<Lado>();
    visto.add(i);
    for (let k = 0; k < regiao.length; k++) {
      for (const v of vizinhasGo(regiao[k])) {
        const c = casas[v];
        if (c === null) {
          if (!visto.has(v)) {
            visto.add(v);
            regiao.push(v);
          }
        } else bordas.add(c);
      }
    }
    if (bordas.size === 1) {
      const dono = [...bordas][0];
      pontos[dono] += regiao.length;
      for (const p of regiao) territorio[p] = dono;
    }
  }
  return { pontos, territorio };
}

const meio = (n: number) => String(n).replace(".", ",");

export const motorGo: Motor<EstadoGo, JogadaGo> = {
  id: "go",
  inicial: () => {
    const casas: (Lado | null)[] = Array(TOTAL).fill(null);
    return { casas, vez: 0, capturas: [0, 0], passes: 0, feitas: 0, ultima: null, vistas: [chave(casas)], fim: null };
  },
  vez: (e) => e.vez,
  valida: (e, j) => ("passa" in j ? !e.fim : tentar(e, j.casa) !== null),
  aplicar: (e, j) => {
    if ("passa" in j) {
      const passes = e.passes + 1;
      const base = { ...e, vez: outroLado(e.vez), passes, feitas: e.feitas + 1, ultima: "passou" as const };
      if (passes < 2) return base;
      const { pontos, territorio } = contarArea(e.casas);
      const final: [number, number] = [pontos[0], pontos[1] + KOMI];
      const vencedor: Lado = final[0] > final[1] ? 0 : 1;
      return {
        ...base,
        fim: { vencedor, motivo: `pretas ${meio(final[0])} × brancas ${meio(final[1])}, contando ${meio(KOMI)} de compensação para as brancas`, pontos: final, territorio },
      };
    }
    const t = tentar(e, j.casa);
    if (!t) return e;
    const capturas: [number, number] = [e.capturas[0], e.capturas[1]];
    capturas[e.vez] += t.capturou;
    return { ...e, casas: t.casas, vez: outroLado(e.vez), capturas, passes: 0, feitas: e.feitas + 1, ultima: j.casa, vistas: [...e.vistas, chave(t.casas)] };
  },
  resultado: (e) => (e.fim ? { vencedor: e.fim.vencedor, motivo: e.fim.motivo } : null),
  ehJogada: (x): x is JogadaGo => {
    const j = x as Record<string, unknown> | null;
    if (!j || typeof j !== "object") return false;
    if ("passa" in j) return j.passa === true && Object.keys(j).length === 1;
    return inteiro(j.casa, 0, TOTAL - 1);
  },
};
