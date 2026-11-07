// Testes do xadrez (lib/jogos/xadrez.ts): lances especiais, fins de partida e a partida à distância.
import { test } from "node:test";
import assert from "node:assert/strict";
import { reproduzir } from "../lib/jogos/motor.ts";
import { emPortugues, lancesPossiveis, motorXadrez } from "../lib/jogos/xadrez.ts";
import { semente, simularSala } from "./apoio-testes.mjs";

const J = (de, para, promo) => (promo ? { de, para, promo } : { de, para });
const jogar = (lista) => reproduzir(motorXadrez, lista.map(([de, para, promo]) => J(de, para, promo)));
const sorteio = (lista, sorte) => lista[Math.floor(sorte() * lista.length)];
const aoAcaso = (e, sorte) => {
  const m = sorteio(lancesPossiveis(e), sorte);
  return J(m.from, m.to, m.promotion);
};

test("Xadrez: 20 lances de abertura e lance ilegal recusado", () => {
  const e = motorXadrez.inicial();
  assert.equal(lancesPossiveis(e).length, 20);
  assert.equal(motorXadrez.valida(e, J("e2", "e5")), false);
  assert.equal(motorXadrez.valida(e, J("e7", "e5")), false, "não é a vez das pretas");
  assert.equal(motorXadrez.valida(e, J("g1", "f3")), true);
});

test("Xadrez: mate do pastor", () => {
  const e = jogar([["e2", "e4"], ["e7", "e5"], ["f1", "c4"], ["b8", "c6"], ["d1", "h5"], ["g8", "f6"], ["h5", "f7"]]);
  assert.deepEqual(motorXadrez.resultado(e), { vencedor: 0, motivo: "xeque-mate" });
  assert.equal(emPortugues(e.lances.at(-1)), "Dxf7#");
  assert.equal(lancesPossiveis(e).length, 0);
});

test("Xadrez: roque, en passant e promoção", () => {
  // roque pequeno das brancas
  let e = jogar([["e2", "e4"], ["e7", "e5"], ["g1", "f3"], ["b8", "c6"], ["f1", "c4"], ["g8", "f6"]]);
  assert.ok(motorXadrez.valida(e, J("e1", "g1")));
  e = motorXadrez.aplicar(e, J("e1", "g1"));
  assert.equal(e.lances.at(-1), "O-O");
  // en passant
  e = jogar([["e2", "e4"], ["a7", "a6"], ["e4", "e5"], ["d7", "d5"]]);
  assert.ok(motorXadrez.valida(e, J("e5", "d6")));
  e = motorXadrez.aplicar(e, J("e5", "d6"));
  assert.equal(e.lances.at(-1), "exd6");
  // promoção: precisa dizer a peça
  e = jogar([["h2", "h4"], ["g7", "g5"], ["h4", "g5"], ["h7", "h6"], ["g5", "h6"], ["g8", "f6"], ["h6", "h7"], ["f6", "g8"]]);
  assert.equal(motorXadrez.valida(e, J("h7", "h8", "q")), false, "a torre preta está em h8");
  assert.equal(motorXadrez.valida(e, J("h7", "g8")), false, "sem dizer a peça não vale");
  assert.ok(motorXadrez.valida(e, J("h7", "g8", "q")));
  assert.ok(motorXadrez.valida(e, J("h7", "g8", "n")));
  e = motorXadrez.aplicar(e, J("h7", "g8", "q"));
  assert.match(e.fen, /^rnbqkbQr/);
  assert.equal(emPortugues(e.lances.at(-1)), "hxg8=D");
});

test("Xadrez: afogamento e repetição empatam", () => {
  // afogamento conhecido em 10 lances (Sam Loyd)
  const e = jogar([
    ["e2", "e3"], ["a7", "a5"], ["d1", "h5"], ["a8", "a6"], ["h5", "a5"], ["h7", "h5"], ["h2", "h4"], ["a6", "h6"],
    ["a5", "c7"], ["f7", "f6"], ["c7", "d7"], ["e8", "f7"], ["d7", "b7"], ["d8", "d3"], ["b7", "b8"], ["d3", "h7"],
    ["b8", "c8"], ["f7", "g6"], ["c8", "e6"],
  ]);
  assert.equal(motorXadrez.resultado(e)?.vencedor, null);
  assert.match(motorXadrez.resultado(e)?.motivo ?? "", /afogamento/);
  // cavalos indo e voltando: a posição inicial aparece pela terceira vez
  const r = jogar([["g1", "f3"], ["g8", "f6"], ["f3", "g1"], ["f6", "g8"], ["g1", "f3"], ["g8", "f6"], ["f3", "g1"], ["f6", "g8"]]);
  assert.deepEqual(motorXadrez.resultado(r), { vencedor: null, motivo: "a mesma posição apareceu três vezes" });
});

test("Xadrez: jogada que chega pela rede é conferida", () => {
  assert.equal(motorXadrez.ehJogada({ de: "e2", para: "e4" }), true);
  assert.equal(motorXadrez.ehJogada({ de: "e2", para: "e9" }), false);
  assert.equal(motorXadrez.ehJogada({ de: "e7", para: "e8", promo: "k" }), false);
  assert.equal(motorXadrez.ehJogada({ de: "e2" }), false);
});

test("Xadrez: partidas sorteadas sempre terminam", () => {
  for (let s = 1; s <= 25; s++) {
    const sorte = semente(s);
    let e = motorXadrez.inicial();
    let n = 0;
    while (!motorXadrez.resultado(e)) {
      e = motorXadrez.aplicar(e, aoAcaso(e, sorte));
      assert.ok(++n < 2000, `semente ${s}`);
    }
  }
});

test("Xadrez à distância", () => {
  for (let seed = 1; seed <= 6; seed++) {
    const { A, B } = simularSala(motorXadrez, aoAcaso, { seed, perda: 0.25, repete: 0.15 });
    assert.equal(A.fase, "fim");
    assert.deepEqual(A.jogadas, B.jogadas);
  }
});
