// Testes da partida à distância dos jogos por turnos (lib/jogos/turnos.ts), sem rede: dois aparelhos
// simulados jogando com jogadas sorteadas, inclusive com mensagens perdidas e repetidas.
import { test } from "node:test";
import assert from "node:assert/strict";
import { reproduzir } from "../lib/jogos/motor.ts";
import { ehMsgT, jogarT, meuLado, novaSalaT, receberT, reenviarT, revancheT } from "../lib/jogos/turnos.ts";
import { motorNim } from "../lib/jogos/nim.ts";

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

const jogadaNim = (e, sorte) => {
  const filas = e.filas.map((v, i) => [v, i]).filter(([v]) => v > 0);
  const [v, i] = filas[Math.floor(sorte() * filas.length)];
  return { fila: i, quantos: 1 + Math.floor(sorte() * v) };
};

test("Nim: regras básicas", () => {
  let e = motorNim.inicial();
  assert.equal(motorNim.valida(e, { fila: 0, quantos: 2 }), false);
  assert.equal(motorNim.valida(e, { fila: 3, quantos: 7 }), true);
  e = motorNim.aplicar(e, { fila: 3, quantos: 7 });
  assert.deepEqual(e.filas, [1, 3, 5, 0]);
  assert.equal(motorNim.vez(e), 1);
  // lado 1 tira a fileira 0, lado 0 a fileira 1, lado 1 a fileira 2: o lado 1 tirou o último
  for (const [fila, quantos] of [[0, 1], [1, 3], [2, 5]]) e = motorNim.aplicar(e, { fila, quantos });
  assert.deepEqual(motorNim.resultado(e), { vencedor: 1, motivo: "tirou o último palito" });
});

test("à distância: os dois aparelhos terminam com a mesma lista de jogadas", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const { A, B } = simularSala(motorNim, jogadaNim, { seed });
    assert.equal(A.fase, "fim", `semente ${seed}`);
    assert.deepEqual(A.jogadas, B.jogadas);
    assert.notEqual(meuLado(A), meuLado(B));
  }
});

test("à distância com 30% das mensagens perdidas e 20% repetidas", () => {
  for (let seed = 1; seed <= 60; seed++) {
    const { A, B } = simularSala(motorNim, jogadaNim, { seed, perda: 0.3, repete: 0.2 });
    assert.equal(A.fase, "fim", `semente ${seed}`);
    assert.equal(B.fase, "fim", `semente ${seed}`);
    assert.deepEqual(A.jogadas, B.jogadas);
  }
});

test("revanche alterna quem começa", () => {
  const { A, B } = simularSala(motorNim, jogadaNim, { seed: 3 });
  const comecou = A.quemComeca;
  let a = revancheT(A);
  let b = receberT(motorNim, B, a.enviar[0], "A").partida;
  b = revancheT(b);
  // o criador recebe o status do convidado na partida nova e decide
  const r = receberT(motorNim, a.partida, b.enviar[0], "B");
  assert.equal(r.partida.fase, "jogando");
  assert.equal(r.partida.p, 2);
  assert.notEqual(r.partida.quemComeca, comecou);
});

test("jogada fora da vez ou inválida não entra", () => {
  let a = { ...novaSalaT("nim", "ABC234", "criador", "A"), fase: "jogando", quemComeca: "B" };
  assert.equal(jogarT(motorNim, a, { fila: 3, quantos: 1 }).enviar.length, 0); // vez do B
  a = { ...a, quemComeca: "A" };
  assert.equal(jogarT(motorNim, a, { fila: 0, quantos: 5 }).enviar.length, 0); // inválida
  assert.equal(jogarT(motorNim, a, { fila: 0, quantos: 1 }).enviar.length, 1);
  // mensagem com jogada mal formada é rejeitada
  assert.equal(ehMsgT({ t: "jogada", p: 1, n: 0, j: { fila: 9, quantos: 1 } }, motorNim.ehJogada), false);
});
