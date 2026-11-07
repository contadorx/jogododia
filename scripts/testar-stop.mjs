// Testes do Stop (lib/jogos/stop.ts): pontos, letras e a partida à distância simulada, com mensagens
// perdidas e repetidas.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CONFIG_PADRAO,
  LETRAS_STOP,
  anular,
  atual,
  comecar,
  ehMsgStop,
  faseDe,
  ficarPronto,
  normalizar,
  novaPartidaStop,
  parar,
  placarStop,
  pontosDaCategoria,
  problema,
  receberStop,
  reenviarStop,
  revancheStop,
  sortearLetra,
} from "../lib/jogos/stop.ts";
import { semente } from "./apoio-testes.mjs";

test("Stop: palavras e pontos", () => {
  assert.equal(normalizar("  Ônibus  Espacial "), "onibus espacial");
  assert.equal(problema("", "B"), "em branco");
  assert.equal(problema("Gato", "B"), "não começa com B");
  assert.equal(problema("B", "B"), "curta demais");
  assert.equal(problema("Ábaco", "A"), null);
  assert.deepEqual(pontosDaCategoria("Bola", "Bolo", "B", []), [10, 10]);
  assert.deepEqual(pontosDaCategoria("Bola", "bola ", "B", []), [5, 5]);
  assert.deepEqual(pontosDaCategoria("Bola", "", "B", []), [10, 0]);
  assert.deepEqual(pontosDaCategoria("Bola", "Gato", "B", []), [10, 0]);
  assert.deepEqual(pontosDaCategoria("Bola", "Bxyz", "B", ["bxyz"]), [10, 0], "palavra que o outro não aceitou");
  assert.deepEqual(pontosDaCategoria("", "", "B", []), [0, 0]);
});

test("Stop: a letra não se repete na partida", () => {
  const sorte = semente(5);
  const usadas = [];
  for (let i = 0; i < LETRAS_STOP.length; i++) usadas.push(sortearLetra(usadas, sorte));
  assert.equal(new Set(usadas).size, LETRAS_STOP.length);
});

/** Dois aparelhos jogando uma partida inteira; devolve as duas partidas no fim. */
function simular({ seed = 1, perda = 0, repete = 0, anulacoes = true } = {}) {
  const sorte = semente(seed);
  let agora = 1000;
  const A = { id: "A", partida: novaPartidaStop("ABC234", "criador", "A"), fila: [], rascunho: {} };
  const B = { id: "B", partida: novaPartidaStop("ABC234", "convidado", "B"), fila: [], rascunho: {} };
  const outroDe = (x) => (x === A ? B : A);
  const mandar = (de, msgs) => {
    for (const m of msgs) {
      assert.ok(ehMsgStop(m), `mensagem inválida: ${JSON.stringify(m)}`);
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
      let n = 0;
      while (x.fila.length) {
        const { m, de } = x.fila.shift();
        aplicar(x, receberStop(x.partida, m, de, x.rascunho, agora, sorte));
        algo = true;
        assert.ok(++n < 5000, "mensagens sem fim");
      }
    }
    return algo;
  };
  // os dois entram: cada um avisa onde está
  mandar(A, reenviarStop(A.partida));
  mandar(B, reenviarStop(B.partida));
  for (let passo = 0; passo < 20000; passo++) {
    agora += 500;
    while (entregar());
    if (A.partida.fim && B.partida.fim) break;
    const x = sorte() < 0.5 ? A : B;
    const fase = faseDe(x.partida);
    const r = atual(x.partida);
    // como na tela: de tempos em tempos cada aparelho repete o que tem, em qualquer fase
    if (sorte() < 0.15) mandar(x, reenviarStop(x.partida));
    else if (x === A && fase === "esperando" && A.partida.outro?.p === A.partida.p) aplicar(A, comecar(A.partida, CONFIG_PADRAO, agora, sorte));
    else if (fase === "escrevendo" && r) {
      // escreve uma palavra numa categoria; às vezes pede Stop (com tudo preenchido)
      const cats = x.partida.config.categorias;
      const c = cats[Math.floor(sorte() * cats.length)];
      x.rascunho = { ...x.rascunho, [c]: sorte() < 0.8 ? `${r.letra}${"aeiou"[Math.floor(sorte() * 5)]}la` : "xyz" };
      const tudo = cats.every((k) => (x.rascunho[k] ?? "").trim());
      if (tudo && sorte() < 0.3) aplicar(x, parar(x.partida, x.rascunho));
    } else if (fase === "conferindo" && r) {
      if (anulacoes && sorte() < 0.2) {
        const palavras = Object.values(r.dele ?? {}).filter(Boolean);
        if (palavras.length) aplicar(x, anular(x.partida, palavras[Math.floor(sorte() * palavras.length)], sorte() < 0.7));
      } else if (sorte() < 0.4) aplicar(x, ficarPronto(x.partida, agora, sorte));
    }
    // rascunho novo a cada rodada
    for (const y of [A, B]) if (faseDe(y.partida) !== "escrevendo") y.rascunho = {};
  }
  return { A: A.partida, B: B.partida };
}

test("Stop à distância: os dois terminam com as mesmas rodadas e o placar espelhado", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const { A, B } = simular({ seed });
    assert.ok(A.fim && B.fim, `semente ${seed}: não terminou`);
    assert.equal(A.rodadas.length, CONFIG_PADRAO.total);
    assert.deepEqual(
      A.rodadas.map((r) => r.letra),
      B.rodadas.map((r) => r.letra),
    );
    for (let i = 0; i < A.rodadas.length; i++) {
      assert.deepEqual(A.rodadas[i].minhas, B.rodadas[i].dele, `semente ${seed}, rodada ${i + 1}`);
      assert.deepEqual(A.rodadas[i].anuladasPorMim, B.rodadas[i].anuladasPeloOutro);
    }
    const pa = placarStop(A).total;
    const pb = placarStop(B).total;
    assert.deepEqual(pa, [pb[1], pb[0]], `semente ${seed}: placar diferente`);
  }
});

test("Stop à distância com 30% de mensagens perdidas e 20% repetidas", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const { A, B } = simular({ seed, perda: 0.3, repete: 0.2 });
    assert.ok(A.fim && B.fim, `semente ${seed}: não terminou`);
    assert.deepEqual(placarStop(A).total, [...placarStop(B).total].reverse());
  }
});

test("Stop: quando um pede Stop, a rodada fecha para o outro com o que ele já escreveu", () => {
  let a = novaPartidaStop("ABC234", "criador", "A");
  let b = novaPartidaStop("ABC234", "convidado", "B");
  a = receberStop(a, reenviarStop(b)[0], "B", {}, 0).partida;
  const inicio = comecar(a, CONFIG_PADRAO, 0, semente(1));
  a = inicio.partida;
  b = receberStop(b, inicio.enviar[0], "A", {}, 0).partida;
  const letra = atual(a).letra;
  const tudo = Object.fromEntries(CONFIG_PADRAO.categorias.map((c) => [c, `${letra}ola`]));
  const stop = parar(a, tudo);
  const resposta = receberStop(b, stop.enviar[0], "A", { nome: `${letra}ia` }, 0);
  assert.equal(faseDe(resposta.partida), "conferindo");
  assert.equal(atual(resposta.partida).minhas.nome, `${letra}ia`);
  assert.equal(atual(resposta.partida).minhas.animal, "");
  assert.equal(resposta.enviar.length, 1, "manda as respostas para quem pediu Stop");
});

test("Stop: revanche começa uma partida nova na mesma sala", () => {
  const { A, B } = simular({ seed: 7 });
  let a = revancheStop(A);
  let b = receberStop(B, a.enviar[0], "A", {}, 0).partida;
  b = revancheStop(b).partida;
  assert.equal(b.p, 2);
  assert.equal(a.partida.p, 2);
  // o criador só começa quando sabe que o outro também está na partida 2
  assert.equal(comecar(a.partida, CONFIG_PADRAO, 0).partida.rodadas.length, 0);
  const comOutro = receberStop(a.partida, reenviarStop(b)[0], "B", {}, 0).partida;
  assert.equal(comecar(comOutro, CONFIG_PADRAO, 0).partida.rodadas.length, 1);
});

test("Stop: mensagem estranha é recusada", () => {
  assert.equal(ehMsgStop({ t: "eu", p: 1, r: 1, respostas: { hacker: "x" }, anuladas: [], pronto: false, parou: false, tenho: false }), false);
  assert.equal(ehMsgStop({ t: "rodada", p: 1, r: 1, letra: "B", config: { categorias: ["nome"], total: 5, tempo: 120 }, ant: [] }), false);
  assert.equal(ehMsgStop({ t: "eu", p: 1, r: 1, respostas: null, anuladas: [], pronto: false, parou: false, tenho: false }), true);
});
