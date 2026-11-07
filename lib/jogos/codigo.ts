/**
 * Descubra o código: cada um escolhe um código secreto de 4 algarismos diferentes (de 0 a 9). Na sua
 * vez, você chuta o código do outro e recebe a resposta: quantos algarismos estão certos e no lugar
 * certo, e quantos estão no código mas em outro lugar. Ganha quem descobrir primeiro.
 *
 * Para ser justo, se quem começou descobrir, o outro ainda tem uma última chance de empatar. Depois
 * de 12 palpites de cada um sem ninguém descobrir, é empate.
 *
 * O código fica só no aparelho de quem escolheu. Por isso, aqui a partida também é uma lista de
 * jogadas, mas a resposta a cada palpite é uma jogada de quem tem o código (o aparelho responde
 * sozinho), e no fim cada aparelho revela o seu código, para o outro ver.
 *
 *   pronto (lado 0) → pronto (lado 1) → palpite (0) → resposta (1) → palpite (1) → resposta (0) → ...
 *   ... → revela (0) → revela (1) → fim
 */
import { inteiro, outroLado, type Lado, type Motor } from "./motor.ts";

export const DIGITOS = 4;
export const PALPITES = 12;

export type Resposta = { certos: number; fora: number };

export type JogadaCodigo =
  | { t: "pronto" }
  | { t: "palpite"; d: string }
  | { t: "resposta"; certos: number; fora: number }
  | { t: "revela"; d: string };

export type Palpite = { lado: Lado; d: string; resposta: Resposta | null };

export type FaseCodigo = "escolher" | "chutar" | "responder" | "revelar" | "fim";

export type EstadoCodigo = {
  fase: FaseCodigo;
  vez: Lado;
  prontos: number;
  palpites: Palpite[];
  /** Em que palpite cada um acertou (1 = no primeiro). */
  acertou: [number | null, number | null];
  revelados: [string | null, string | null];
  feitas: number;
};

/** 4 algarismos, sem repetir. */
export const codigoValido = (d: unknown): d is string => typeof d === "string" && /^\d{4}$/.test(d) && new Set(d).size === DIGITOS;

/** A resposta de um palpite contra um código. */
export function comparar(palpite: string, codigo: string): Resposta {
  let certos = 0;
  let fora = 0;
  for (let i = 0; i < DIGITOS; i++) {
    if (palpite[i] === codigo[i]) certos++;
    else if (codigo.includes(palpite[i])) fora++;
  }
  return { certos, fora };
}

export const palpitesDe = (e: EstadoCodigo, lado: Lado) => e.palpites.filter((p) => p.lado === lado);

export const motorCodigo: Motor<EstadoCodigo, JogadaCodigo> = {
  id: "descubra-o-codigo",
  inicial: () => ({ fase: "escolher", vez: 0, prontos: 0, palpites: [], acertou: [null, null], revelados: [null, null], feitas: 0 }),
  vez: (e) => e.vez,
  valida: (e, j) => {
    switch (j.t) {
      case "pronto":
        return e.fase === "escolher";
      case "palpite":
        return e.fase === "chutar" && codigoValido(j.d);
      case "resposta":
        return e.fase === "responder" && j.certos + j.fora <= DIGITOS && !(j.certos === DIGITOS - 1 && j.fora === 1);
      case "revela":
        return e.fase === "revelar" && codigoValido(j.d);
    }
  },
  aplicar: (e, j) => {
    const base = { ...e, feitas: e.feitas + 1 };
    switch (j.t) {
      case "pronto": {
        const prontos = e.prontos + 1;
        return { ...base, prontos, fase: prontos === 2 ? "chutar" : "escolher", vez: prontos === 2 ? 0 : 1 };
      }
      case "palpite":
        return { ...base, palpites: [...e.palpites, { lado: e.vez, d: j.d, resposta: null }], fase: "responder", vez: outroLado(e.vez) };
      case "resposta": {
        const palpites = [...e.palpites];
        const ultimo = palpites[palpites.length - 1];
        palpites[palpites.length - 1] = { ...ultimo, resposta: { certos: j.certos, fora: j.fora } };
        const quem = ultimo.lado;
        const acertou: [number | null, number | null] = [e.acertou[0], e.acertou[1]];
        if (j.certos === DIGITOS) acertou[quem] = palpites.filter((p) => p.lado === quem).length;
        // a rodada fecha quando o palpite do lado 1 (o segundo a chutar) recebe a resposta
        const rodadaFechada = quem === 1;
        const n1 = palpites.filter((p) => p.lado === 1).length;
        const acabou = rodadaFechada && (acertou[0] !== null || acertou[1] !== null || n1 >= PALPITES);
        if (acabou) return { ...base, palpites, acertou, fase: "revelar", vez: 0 };
        return { ...base, palpites, acertou, fase: "chutar", vez: outroLado(quem) };
      }
      case "revela": {
        const revelados: [string | null, string | null] = [e.revelados[0], e.revelados[1]];
        revelados[e.vez] = j.d;
        return e.vez === 0 ? { ...base, revelados, vez: 1 } : { ...base, revelados, fase: "fim", vez: 0 };
      }
    }
  },
  resultado: (e) => {
    if (e.fase !== "fim") return null;
    const [a, b] = e.acertou;
    if (a !== null && b !== null) return { vencedor: null, motivo: `os dois descobriram, em ${a} palpites` };
    if (a !== null) return { vencedor: 0, motivo: `descobriu o código em ${a} ${a === 1 ? "palpite" : "palpites"}` };
    if (b !== null) return { vencedor: 1, motivo: `descobriu o código em ${b} ${b === 1 ? "palpite" : "palpites"}` };
    return { vencedor: null, motivo: `ninguém descobriu em ${PALPITES} palpites` };
  },
  ehJogada: (x): x is JogadaCodigo => {
    const j = x as Record<string, unknown> | null;
    if (!j || typeof j !== "object") return false;
    switch (j.t) {
      case "pronto":
        return true;
      case "palpite":
      case "revela":
        return codigoValido(j.d);
      case "resposta":
        return inteiro(j.certos, 0, DIGITOS) && inteiro(j.fora, 0, DIGITOS);
      default:
        return false;
    }
  },
};
