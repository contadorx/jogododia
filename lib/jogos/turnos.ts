/**
 * Partida à distância de qualquer jogo por turnos (lib/jogos/motor.ts): os dois aparelhos guardam a
 * mesma lista de jogadas. Funções puras, sem rede, testadas em scripts/testar-turnos.mjs.
 *
 * - Quem cria a sala sorteia quem começa (e, na revanche, quem não começou começa).
 * - Cada jogada leva a posição dela na lista (n). Repetida é ignorada; se chegar uma jogada "do
 *   futuro", o aparelho avisa até onde tem e o outro manda o que falta.
 * - Os dois trocam o status (partida, fase e tamanho da lista) quando algo muda e de tempos em
 *   tempos; quem está na frente reenvia as jogadas que o outro não tem.
 */
import { outroLado, reproduzir, type Lado, type Motor } from "./motor.ts";

export type Papel = "criador" | "convidado";
export type FaseT = "esperando" | "jogando" | "fim";

export type MsgT<J> =
  | { t: "status"; p: number; fase: FaseT; n: number }
  | { t: "comeca"; p: number; quem: string }
  | { t: "jogada"; p: number; n: number; j: J };

export type PartidaT<J> = {
  v: 1;
  jogo: string;
  codigo: string;
  papel: Papel;
  meuId: string;
  /** Número da partida dentro da sala (a revanche soma 1). */
  p: number;
  fase: FaseT;
  /** Id de quem joga com o lado 0 (quem começa). */
  quemComeca: string | null;
  /** Quem começou a partida anterior, para alternar na revanche. */
  comecouAntes: string | null;
  jogadas: J[];
  outro: { id: string; p: number; fase: FaseT; n: number } | null;
};

export type PassoT<J> = { partida: PartidaT<J>; enviar: MsgT<J>[] };

const nada = <J>(partida: PartidaT<J>): PassoT<J> => ({ partida, enviar: [] });

export function novaSalaT<J>(jogo: string, codigo: string, papel: Papel, meuId: string): PartidaT<J> {
  return { v: 1, jogo, codigo, papel, meuId, p: 1, fase: "esperando", quemComeca: null, comecouAntes: null, jogadas: [], outro: null };
}

export function meuLado<J>(partida: PartidaT<J>): Lado | null {
  if (!partida.quemComeca) return null;
  return partida.quemComeca === partida.meuId ? 0 : 1;
}

export const statusT = <J>(partida: PartidaT<J>): MsgT<J> => ({ t: "status", p: partida.p, fase: partida.fase, n: partida.jogadas.length });

/** Quem cria a sala decide quem começa: sorteio na primeira, alternado na revanche. */
function decidir<J>(partida: PartidaT<J>, outroId: string, sortear: () => number): PassoT<J> {
  const quem = partida.comecouAntes ? (partida.comecouAntes === partida.meuId ? outroId : partida.meuId) : sortear() < 0.5 ? partida.meuId : outroId;
  const nova: PartidaT<J> = { ...partida, fase: "jogando", quemComeca: quem };
  return { partida: nova, enviar: [{ t: "comeca", p: nova.p, quem }, statusT(nova)] };
}

/** Faz a minha jogada (só na minha vez e se for válida). */
export function jogarT<E, J>(motor: Motor<E, J>, partida: PartidaT<J>, j: J): PassoT<J> {
  if (partida.fase !== "jogando") return nada(partida);
  const lado = meuLado(partida);
  const estado = reproduzir(motor, partida.jogadas);
  if (lado === null || motor.resultado(estado) || motor.vez(estado) !== lado || !motor.valida(estado, j)) return nada(partida);
  const jogadas = [...partida.jogadas, j];
  const acabou = motor.resultado(motor.aplicar(estado, j)) !== null;
  const nova: PartidaT<J> = { ...partida, jogadas, fase: acabou ? "fim" : "jogando" };
  return { partida: nova, enviar: [{ t: "jogada", p: nova.p, n: jogadas.length - 1, j }] };
}

export function receberT<E, J>(motor: Motor<E, J>, partida: PartidaT<J>, msg: MsgT<J>, de: string, sortear: () => number = Math.random): PassoT<J> {
  switch (msg.t) {
    case "status": {
      const anterior = partida.outro;
      const nova: PartidaT<J> = { ...partida, outro: { id: de, p: msg.p, fase: msg.fase, n: msg.n } };
      const enviar: MsgT<J>[] = [];
      const mudou = !anterior || anterior.id !== de || anterior.p !== msg.p || anterior.fase !== msg.fase || anterior.n !== msg.n;
      if (mudou) enviar.push(statusT(nova));
      if (msg.p === nova.p) {
        if (nova.papel === "criador" && !nova.quemComeca && nova.fase === "esperando") {
          const r = decidir(nova, de, sortear);
          return { partida: r.partida, enviar: [...r.enviar] };
        }
        // o outro ainda não sabe quem começa
        if (nova.papel === "criador" && nova.quemComeca && msg.fase === "esperando") enviar.push({ t: "comeca", p: nova.p, quem: nova.quemComeca });
        // o outro está atrasado: manda as jogadas que faltam
        for (let n = msg.n; n < nova.jogadas.length; n++) enviar.push({ t: "jogada", p: nova.p, n, j: nova.jogadas[n] });
      }
      return { partida: nova, enviar };
    }

    case "comeca": {
      if (msg.p !== partida.p || partida.fase !== "esperando") return nada(partida);
      const nova: PartidaT<J> = { ...partida, fase: "jogando", quemComeca: msg.quem };
      return { partida: nova, enviar: [statusT(nova)] };
    }

    case "jogada": {
      if (msg.p !== partida.p || partida.fase === "esperando") return nada(partida);
      const n = partida.jogadas.length;
      if (msg.n < n) return nada(partida); // repetida
      if (msg.n > n) return { partida, enviar: [statusT(partida)] }; // faltou alguma: pede de novo
      const lado = meuLado(partida);
      const estado = reproduzir(motor, partida.jogadas);
      if (lado === null || motor.resultado(estado) || motor.vez(estado) !== outroLado(lado) || !motor.valida(estado, msg.j)) return nada(partida);
      const jogadas = [...partida.jogadas, msg.j];
      const acabou = motor.resultado(motor.aplicar(estado, msg.j)) !== null;
      const nova: PartidaT<J> = { ...partida, jogadas, fase: acabou ? "fim" : "jogando" };
      return { partida: nova, enviar: acabou ? [statusT(nova)] : [] };
    }
  }
}

/** O que mandar de novo depois de uma queda ou de um tempo parado. */
export const reenviarT = <J>(partida: PartidaT<J>): MsgT<J>[] => [statusT(partida)];

/** Jogar de novo na mesma sala, alternando quem começa. Se o outro já pediu, entra na partida dele. */
export function revancheT<J>(partida: PartidaT<J>): PassoT<J> {
  const p = partida.outro && partida.outro.p > partida.p ? partida.outro.p : partida.p + 1;
  const nova: PartidaT<J> = { ...partida, p, fase: "esperando", quemComeca: null, comecouAntes: partida.quemComeca, jogadas: [] };
  return { partida: nova, enviar: [statusT(nova)] };
}

export function ehMsgT<J>(x: unknown, ehJogada: (j: unknown) => j is J): x is MsgT<J> {
  const m = x as Record<string, unknown> | null;
  if (!m || typeof m !== "object" || typeof m.p !== "number") return false;
  switch (m.t) {
    case "status":
      return typeof m.n === "number" && typeof m.fase === "string" && ["esperando", "jogando", "fim"].includes(m.fase);
    case "comeca":
      return typeof m.quem === "string";
    case "jogada":
      return typeof m.n === "number" && Number.isInteger(m.n) && m.n >= 0 && ehJogada(m.j);
    default:
      return false;
  }
}
