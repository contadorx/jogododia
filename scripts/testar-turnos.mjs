// Testes da partida à distância dos jogos por turnos (lib/jogos/turnos.ts), sem rede: dois aparelhos
// simulados jogando com jogadas sorteadas, inclusive com mensagens perdidas e repetidas.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ehMsgT, jogarT, meuLado, novaSalaT, receberT, revancheT } from "../lib/jogos/turnos.ts";
import { motorNim } from "../lib/jogos/nim.ts";
import { simularSala } from "./apoio-testes.mjs";

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
