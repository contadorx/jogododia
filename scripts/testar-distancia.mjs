// Testes da partida à distância (lib/protocolo.ts), sem rede: dois aparelhos simulados trocando
// mensagens, inclusive com mensagens perdidas e repetidas. Rode com `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mapaDaFrota, sortearFrota } from "../lib/batalha.ts";
import { atirar, ehMensagem, ficarPronto, novaSala, receber, reenviar, revanche, vezAtual } from "../lib/protocolo.ts";

function semente(s) {
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Simula a sala: cada aparelho tem a sua partida; o que um manda vai para a fila do outro.
 * `perda`: chance de uma mensagem sumir; `repete`: chance de chegar duas vezes.
 */
function simular({ seed = 1, perda = 0, repete = 0, deNovo = false, conferirVez = false } = {}) {
  const sorte = semente(seed);
  const A = { id: "A", partida: novaSala("ABC234", "criador", "A", { deNovo }), fila: [] };
  const B = { id: "B", partida: novaSala("ABC234", "convidado", "B"), fila: [] };
  const outroDe = (x) => (x === A ? B : A);

  const mandar = (de, msgs) => {
    for (const m of msgs) {
      assert.equal(ehMensagem(m), true, `mensagem inválida: ${JSON.stringify(m)}`);
      if (sorte() < perda) continue;
      const copia = JSON.parse(JSON.stringify(m)); // como na rede
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
        aplicar(x, receber(x.partida, m, de, sorte));
        algo = true;
      }
    }
    return algo;
  };

  // os dois entram (cada um avisa o seu estado) e montam a frota
  mandar(A, reenviar(A.partida));
  mandar(B, reenviar(B.partida));
  aplicar(B, ficarPronto(B.partida, sortearFrota(sorte), sorte));
  aplicar(A, ficarPronto(A.partida, sortearFrota(sorte), sorte));

  let rodadas = 0;
  while (rodadas++ < 5000) {
    while (entregar());
    if (A.partida.fase === "fim" && B.partida.fase === "fim") break;
    if (conferirVez && A.partida.fase === "jogando" && B.partida.fase === "jogando" && !A.partida.pendente && !B.partida.pendente) {
      assert.notEqual(vezAtual(A.partida), vezAtual(B.partida), `semente ${seed}: os dois acham que a vez é ${vezAtual(A.partida)}`);
    }
    // quem tem a vez atira numa casa ainda não usada (de propósito, primeiro nas casas dos navios)
    const vez = [A, B].find((x) => vezAtual(x.partida) === "eu" && !x.partida.pendente);
    if (vez) {
      const alvoFrota = [...mapaDaFrota(outroDe(vez).partida.frota).keys()];
      const livres = [...alvoFrota, ...Array.from({ length: 100 }, (_, i) => i)].filter((c) => !(c in vez.partida.tiros));
      const casa = sorte() < 0.6 ? livres[0] : livres[Math.floor(sorte() * livres.length)];
      aplicar(vez, atirar(vez.partida, casa));
    } else {
      // ninguém pode jogar: algo se perdeu, então cada um manda de novo (como o temporizador do site)
      mandar(A, reenviar(A.partida));
      mandar(B, reenviar(B.partida));
    }
  }
  return { A: A.partida, B: B.partida, rodadas };
}

test("partida completa sem perda: um vence, o outro perde, e os tabuleiros batem", () => {
  for (let seed = 1; seed <= 50; seed++) {
    const { A, B } = simular({ seed });
    assert.equal(A.fase, "fim", `semente ${seed}`);
    assert.equal(B.fase, "fim", `semente ${seed}`);
    assert.notEqual(A.resultado, B.resultado);
    const vencedor = A.resultado === "venci" ? A : B;
    const perdedor = vencedor === A ? B : A;
    assert.equal(vencedor.afundadosDele.length, 5);
    // cada tiro do vencedor foi recebido, na mesma ordem, pelo perdedor
    assert.deepEqual(vencedor.ordemTiros, perdedor.recebidos.slice(0, vencedor.ordemTiros.length));
    assert.equal(perdedor.recebidos.length, vencedor.ordemTiros.length);
  }
});

test("com mensagens perdidas e repetidas a partida termina igual", () => {
  for (let seed = 1; seed <= 60; seed++) {
    const { A, B, rodadas } = simular({ seed, perda: 0.3, repete: 0.2 });
    assert.ok(rodadas < 5000, `semente ${seed} travou`);
    assert.equal(A.fase, "fim", `semente ${seed}`);
    assert.equal(B.fase, "fim", `semente ${seed}`);
    assert.notEqual(A.resultado, B.resultado);
    // ninguém contou um tiro duas vezes
    assert.equal(new Set(A.recebidos).size, A.recebidos.length);
    assert.equal(new Set(B.recebidos).size, B.recebidos.length);
    // os tiros batem dos dois lados; a única diferença possível é o último tiro de quem perdeu,
    // que pode ficar sem resposta porque a partida acabou antes dela chegar
    const bate = (atirador, alvo) => {
      const base = JSON.stringify(atirador.ordemTiros);
      const comPendente = atirador.pendente ? JSON.stringify([...atirador.ordemTiros, atirador.pendente.casa]) : null;
      const recebidos = JSON.stringify(alvo.recebidos);
      return recebidos === base || (atirador.resultado === "perdi" && recebidos === comPendente);
    };
    assert.ok(bate(A, B), `semente ${seed}: tiros de A`);
    assert.ok(bate(B, A), `semente ${seed}: tiros de B`);
  }
});

test("depois de cada troca de mensagens, os dois aparelhos concordam de quem é a vez", () => {
  for (let seed = 1; seed <= 30; seed++) {
    for (const deNovo of [false, true]) {
      const { A, B } = simular({ seed, deNovo, conferirVez: true });
      assert.notEqual(A.resultado, B.resultado);
    }
  }
});

test("com 'acertou, joga de novo' a vez fica com quem acertou", () => {
  const { A, B } = simular({ seed: 7, deNovo: true });
  assert.equal(B.regras.deNovo, true); // o convidado recebeu o combinado de quem criou
  assert.notEqual(A.resultado, B.resultado);
});

test("só atira na sua vez, uma vez por resposta", () => {
  let a = novaSala("ABC234", "criador", "A");
  a = { ...a, fase: "jogando", quemComeca: "B", frota: sortearFrota(semente(3)) };
  assert.deepEqual(atirar(a, 10).enviar, []);
  a = { ...a, quemComeca: "A" };
  const p1 = atirar(a, 10);
  assert.equal(p1.enviar[0].t, "tiro");
  assert.deepEqual(atirar(p1.partida, 11).enviar, []); // esperando resposta
});

test("revanche: os dois acabam na mesma partida nova", () => {
  const { A, B } = simular({ seed: 4 });
  const ra = revanche(A);
  assert.equal(ra.partida.p, 2);
  const rb0 = receber(B, ra.enviar[0], "A");
  assert.equal(rb0.partida.outro.p, 2);
  const rb = revanche(rb0.partida);
  assert.equal(rb.partida.p, 2);
  assert.equal(rb.partida.fase, "montando");
  assert.equal(rb.partida.frota.length, 0);
});

test("mensagens estranhas vindas da rede são ignoradas", () => {
  assert.equal(ehMensagem({ t: "tiro", p: 1, n: 1, casa: 150 }), false);
  assert.equal(ehMensagem({ t: "abracadabra", p: 1 }), false);
  assert.equal(ehMensagem(null), false);
  assert.equal(ehMensagem({ t: "status", p: 1, fase: "pronto" }), true);
});
