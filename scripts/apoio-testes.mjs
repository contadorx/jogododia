// Apoio dos testes: sorteio com semente e a sala à distância simulada (sem rede), para qualquer jogo
// por turnos. Fica fora dos arquivos testar-*.mjs para não rodar testes ao ser importado.
import assert from "node:assert/strict";
import { reproduzir } from "../lib/jogos/motor.ts";
import { ehMsgT, jogarT, meuLado, novaSalaT, receberT, reenviarT } from "../lib/jogos/turnos.ts";

export function semente(s) {
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Simula a sala com qualquer motor. `sortearJogada(estado, sorte)` escolhe uma jogada válida.
 * Devolve as duas partidas no fim.
 */
export function simularSala(motor, sortearJogada, { seed = 1, perda = 0, repete = 0 } = {}) {
  const sorte = semente(seed);
  const A = { id: "A", partida: novaSalaT(motor.id, "ABC234", "criador", "A"), fila: [] };
  const B = { id: "B", partida: novaSalaT(motor.id, "ABC234", "convidado", "B"), fila: [] };
  const outroDe = (x) => (x === A ? B : A);
  const mandar = (de, msgs) => {
    for (const m of msgs) {
      assert.ok(ehMsgT(m, motor.ehJogada), `mensagem inválida: ${JSON.stringify(m)}`);
      if (sorte() < perda) continue;
      const copia = JSON.parse(JSON.stringify(m));
      outroDe(de).fila.push({ m: copia, de: de.id });
      if (sorte() < repete) outroDe(de).fila.push({ m: copia, de: de.id });
    }
  };
  const aplicar = (x, passo) => {
    x.partida = passo.partida;
    mandar(x, passo.enviar);
  };
  const entregar = () => {
    let algo = false;
    for (const x of [A, B]) {
      while (x.fila.length) {
        const { m, de } = x.fila.shift();
        aplicar(x, receberT(motor, x.partida, m, de, sorte));
        algo = true;
      }
    }
    return algo;
  };
  mandar(A, reenviarT(A.partida));
  mandar(B, reenviarT(B.partida));
  for (let rodada = 0; rodada < 20000; rodada++) {
    while (entregar());
    if (A.partida.fase === "fim" && B.partida.fase === "fim" && A.partida.jogadas.length === B.partida.jogadas.length) break;
    const daVez = [A, B].find((x) => {
      if (x.partida.fase !== "jogando") return false;
      const e = reproduzir(motor, x.partida.jogadas);
      return !motor.resultado(e) && motor.vez(e) === meuLado(x.partida);
    });
    if (daVez && sorte() < 0.9) {
      const e = reproduzir(motor, daVez.partida.jogadas);
      aplicar(daVez, jogarT(motor, daVez.partida, sortearJogada(e, sorte)));
    } else {
      mandar(A, reenviarT(A.partida));
      mandar(B, reenviarT(B.partida));
    }
  }
  return { A: A.partida, B: B.partida };
}

