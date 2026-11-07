// Testes do Stop (lib/jogos/stop.ts): pontos com vários jogadores, a votação do "não vale" e partidas
// à distância simuladas com 2 a 6 aparelhos, mensagens perdidas e repetidas, gente que cai e volta.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CONFIG_PADRAO,
  LETRAS_STOP,
  MAX_ELENCO,
  MAX_JOGADORES,
  abrirProxima,
  anular,
  atual,
  comecar,
  conferirCategoria,
  ehMsgStop,
  faseDe,
  ficarPronto,
  meuIndice,
  normalizar,
  novaPartidaStop,
  parar,
  placarStop,
  podeSeguirSem,
  problema,
  receberStop,
  reenviarStop,
  revancheStop,
  seguirSem,
  sortearLetra,
  votosParaAnular,
} from "../lib/jogos/stop.ts";
import { semente } from "./apoio-testes.mjs";

/** Uma rodada montada à mão: `palavras[k]` são as respostas do jogador k (só a categoria animal). */
function rodada(palavras, votos = {}) {
  return {
    r: 1,
    letra: "B",
    quem: palavras.map((_, k) => k),
    inicio: 0,
    respostas: Object.fromEntries(palavras.map((w, k) => [k, { animal: w }])),
    votos,
    prontos: [],
    parou: null,
    fecheiEm: null,
    pontos: null,
  };
}
const pontos = (r) => conferirCategoria(r, "animal").map((c) => c.pontos);

test("Stop: palavras e pontos com vários jogadores", () => {
  assert.equal(normalizar("  Ônibus  Espacial "), "onibus espacial");
  assert.equal(problema("", "B"), "em branco");
  assert.equal(problema("Gato", "B"), "não começa com B");
  assert.equal(problema("B", "B"), "curta demais");
  assert.equal(problema("Ábaco", "A"), null);
  assert.deepEqual(pontos(rodada(["Baleia", "Boi"])), [10, 10]);
  assert.deepEqual(pontos(rodada(["Baleia", "baleia "])), [5, 5]);
  assert.deepEqual(pontos(rodada(["Baleia", ""])), [10, 0]);
  assert.deepEqual(pontos(rodada(["Baleia", "Gato"])), [10, 0]);
  assert.deepEqual(pontos(rodada(["", ""])), [0, 0]);
  // três jogadores: dois iguais ganham 5, o diferente 10
  assert.deepEqual(pontos(rodada(["Baleia", "Boi", "BALEIA"])), [5, 10, 5]);
  // palavra que não vale não faz a outra virar repetida
  assert.deepEqual(pontos(rodada(["Bode", "Gato", "Bode", "Burro"])), [5, 0, 5, 10]);
});

test("Stop: não vale quando a maioria dos outros marca", () => {
  assert.deepEqual([2, 3, 4, 5, 6].map(votosParaAnular), [1, 2, 2, 3, 3]);
  // dois jogadores: basta o outro (como antes)
  assert.deepEqual(pontos(rodada(["Bxyz", "Boi"], { 1: ["animal:bxyz"] })), [0, 10]);
  // três: um voto não basta, dois bastam
  assert.deepEqual(pontos(rodada(["Bxyz", "Boi", "Bode"], { 1: ["animal:bxyz"] })), [10, 10, 10]);
  assert.deepEqual(pontos(rodada(["Bxyz", "Boi", "Bode"], { 1: ["animal:bxyz"], 2: ["animal:bxyz"] })), [0, 10, 10]);
  const celula = conferirCategoria(rodada(["Bxyz", "Boi", "Bode"], { 1: ["animal:bxyz"] }), "animal")[0];
  assert.equal(celula.votos, 1);
  assert.equal(celula.anulada, false);
  // quem escreveu a mesma palavra não vota nela, e conta como "vale": com 2 de 3, não cai
  assert.deepEqual(pontos(rodada(["Bxyz", "Bxyz", "Bode"], { 1: ["animal:bxyz"], 2: ["animal:bxyz"] })), [5, 5, 10]);
  // seis jogadores: precisa de 3 dos 5 outros
  const seis = ["Bxyz", "Boi", "Bode", "Burro", "Besouro", "Bugio"];
  assert.equal(pontos(rodada(seis, { 1: ["animal:bxyz"], 2: ["animal:bxyz"] }))[0], 10);
  assert.equal(pontos(rodada(seis, { 1: ["animal:bxyz"], 2: ["animal:bxyz"], 5: ["animal:bxyz"] }))[0], 0);
  // voto vale só para a categoria em que foi dado
  assert.deepEqual(pontos(rodada(["Bxyz", "Boi"], { 1: ["comida:bxyz"] })), [10, 10]);
});

test("Stop: a letra não se repete na partida", () => {
  const sorte = semente(5);
  const usadas = [];
  for (let i = 0; i < LETRAS_STOP.length; i++) usadas.push(sortearLetra(usadas, sorte));
  assert.equal(new Set(usadas).size, LETRAS_STOP.length);
});

/**
 * Vários aparelhos jogando uma partida inteira. O primeiro cria a sala. `quedas`: de vez em quando
 * alguém sai da sala (não manda nem recebe nada) e volta depois; quem criou a sala segue sem ele
 * quando pode. `atrasado`: o último só entra depois da primeira rodada começar.
 */
function simular({ seed = 1, n = 3, perda = 0, repete = 0, anulacoes = true, quedas = false, atrasado = false, config = CONFIG_PADRAO } = {}) {
  const sorte = semente(seed);
  let agora = 1000;
  const devs = Array.from({ length: n }, (_, k) => ({
    id: `J${k}`,
    partida: novaPartidaStop("ABC234", k === 0 ? "criador" : "convidado", `J${k}`),
    fila: [],
    rascunho: {},
    presente: !(atrasado && k === n - 1),
    pedido: false,
    volta: 0,
  }));
  const [criador] = devs;
  const presentes = () => devs.filter((d) => d.presente).map((d) => d.id);
  const ctx = (d) => ({ agora, presentes: presentes(), rascunho: d.rascunho, sorte });
  let enviadas = 0;
  const mandar = (de, msgs) => {
    if (!de.presente) return;
    for (const m of msgs) {
      assert.ok(ehMsgStop(m), `mensagem inválida: ${JSON.stringify(m)}`);
      enviadas++;
      for (const outro of devs) {
        if (outro === de || !outro.presente || sorte() < perda) continue;
        const copia = JSON.parse(JSON.stringify(m));
        outro.fila.push({ m: copia, de: de.id });
        if (sorte() < repete) outro.fila.push({ m: copia, de: de.id });
      }
    }
  };
  const aplicar = (d, passo) => {
    const antes = `${d.partida.p}.${atual(d.partida)?.r ?? 0}`;
    d.partida = passo.partida;
    // rodada nova: o rascunho começa vazio (como na tela)
    if (`${d.partida.p}.${atual(d.partida)?.r ?? 0}` !== antes) d.rascunho = {};
    mandar(d, passo.enviar);
    if (passo.responder) d.pedido = true;
  };
  const entregar = () => {
    let algo = false;
    for (const d of devs) {
      let k = 0;
      while (d.fila.length) {
        const { m, de } = d.fila.shift();
        aplicar(d, receberStop(d.partida, m, de, ctx(d)));
        algo = true;
        assert.ok(++k < 5000, "mensagens sem fim");
      }
    }
    return algo;
  };
  for (const d of devs) mandar(d, reenviarStop(d.partida));
  let passos = 0;
  for (; passos < 60000; passos++) {
    agora += 250;
    while (entregar());
    // os pedidos de "manda de novo" juntados num envio só
    for (const d of devs) {
      if (d.pedido && d.presente) {
        d.pedido = false;
        mandar(d, reenviarStop(d.partida));
      }
    }
    if (devs.every((d) => d.presente && d.partida.fim && d.partida.p === criador.partida.p)) break;
    const d = devs[Math.floor(sorte() * n)];
    if (!d.presente) {
      // volta depois de um tempo (o atrasado entra quando a primeira rodada já começou)
      const podeVoltar = atrasado && d === devs[n - 1] ? criador.partida.rodadas.length > 0 : agora > d.volta;
      if (podeVoltar && sorte() < 0.2) {
        d.presente = true;
        mandar(d, reenviarStop(d.partida));
      }
      continue;
    }
    if (quedas && d !== criador && sorte() < 0.004) {
      d.presente = false;
      d.fila = [];
      d.volta = agora + 5000 + sorte() * 60000;
      continue;
    }
    const fase = faseDe(d.partida);
    const r = atual(d.partida);
    const eu = meuIndice(d.partida);
    if (sorte() < 0.08) mandar(d, reenviarStop(d.partida));
    else if (d === criador && fase === "esperando" && (!atrasado || devs.filter((x) => x.presente).length >= 2)) aplicar(d, comecar(d.partida, config, ctx(d)));
    else if (d === criador && fase === "entre") aplicar(d, abrirProxima(d.partida, ctx(d)));
    else if (fase === "escrevendo" && r) {
      if (agora - r.inicio > d.partida.config.tempo * 1000) aplicar(d, parar(d.partida, d.rascunho, false, agora));
      else {
        const cats = d.partida.config.categorias;
        const c = cats[Math.floor(sorte() * cats.length)];
        // palavras curtas e poucas letras no fim: assim aparecem palavras repetidas
        d.rascunho = { ...d.rascunho, [c]: sorte() < 0.85 ? `${r.letra}${"aeo"[Math.floor(sorte() * 3)]}la` : "xyz" };
        const tudo = cats.every((k) => (d.rascunho[k] ?? "").trim());
        if (tudo && sorte() < 0.2) aplicar(d, parar(d.partida, d.rascunho, true, agora));
      }
    } else if ((fase === "conferindo" || fase === "aguardando") && r) {
      if (d === criador) {
        // quem criou a sala segue sem quem saiu, quando pode
        for (const i of r.quem) if (podeSeguirSem(d.partida, i, presentes()) && sorte() < 0.3) aplicar(d, seguirSem(d.partida, i, ctx(d)));
      }
      if (fase === "conferindo" && !r.prontos.includes(eu)) {
        if (anulacoes && sorte() < 0.25) {
          const outros = r.quem.filter((i) => i !== eu);
          const i = outros[Math.floor(sorte() * outros.length)];
          const cats = d.partida.config.categorias;
          const c = cats[Math.floor(sorte() * cats.length)];
          const w = r.respostas[i]?.[c] ?? "";
          if (w) aplicar(d, anular(d.partida, c, w, sorte() < 0.7));
        } else if (sorte() < 0.35) aplicar(d, ficarPronto(d.partida, ctx(d)));
      }
    }
  }
  return { devs: devs.map((d) => d.partida), passos, enviadas };
}

function conferirIguais(partidas, rotulo) {
  const [a, ...outros] = partidas;
  assert.ok(a.fim, `${rotulo}: quem criou a sala não terminou`);
  for (const b of outros) {
    assert.ok(b.fim, `${rotulo}: ${b.meuId} não terminou`);
    assert.equal(b.p, a.p);
    assert.deepEqual(b.elenco, a.elenco, `${rotulo}: elenco diferente`);
    assert.deepEqual(
      b.rodadas.map((r) => [r.letra, r.quem, r.pontos]),
      a.rodadas.map((r) => [r.letra, r.quem, r.pontos]),
      `${rotulo}: rodadas diferentes em ${b.meuId}`,
    );
    assert.deepEqual(placarStop(b).total, placarStop(a).total, `${rotulo}: placar diferente em ${b.meuId}`);
  }
  assert.equal(a.rodadas.length, a.config.total, `${rotulo}: faltaram rodadas`);
  assert.ok(a.rodadas.every((r) => r.pontos && r.quem.length >= 2), `${rotulo}: rodada sem pontos`);
}

test("Stop à distância: de 2 a 6 aparelhos terminam com as mesmas rodadas e o mesmo placar", () => {
  for (let n = 2; n <= MAX_JOGADORES; n++) {
    for (let seed = 1; seed <= 12; seed++) {
      const { devs } = simular({ seed, n });
      conferirIguais(devs, `n=${n} semente ${seed}`);
      // ninguém caiu: todos jogaram todas as rodadas, e as respostas chegaram iguais em todos
      for (const r of devs[0].rodadas) assert.equal(r.quem.length, n);
      for (let k = 0; k < devs[0].rodadas.length; k++) {
        for (const b of devs.slice(1)) assert.deepEqual(b.rodadas[k].respostas, devs[0].rodadas[k].respostas, `n=${n} semente ${seed} rodada ${k + 1}`);
      }
    }
  }
});

test("Stop à distância com 30% de mensagens perdidas e 20% repetidas", () => {
  for (const n of [2, 3, 6]) {
    for (let seed = 1; seed <= 10; seed++) conferirIguais(simular({ seed, n, perda: 0.3, repete: 0.2 }).devs, `n=${n} semente ${seed}`);
  }
});

test("Stop à distância: gente que cai e volta, e quem criou a sala segue sem ela", () => {
  let seguiuSem = 0;
  for (const n of [3, 4, 6]) {
    for (let seed = 1; seed <= 15; seed++) {
      const { devs } = simular({ seed, n, quedas: true, perda: 0.05 });
      conferirIguais(devs, `n=${n} semente ${seed}`);
      seguiuSem += devs[0].rodadas.filter((r) => r.quem.length < n).length;
    }
  }
  assert.ok(seguiuSem > 0, "nenhuma rodada seguiu sem alguém: o teste não exercitou a queda");
});

test("Stop à distância: quem chega depois entra na rodada seguinte", () => {
  for (let seed = 1; seed <= 10; seed++) {
    const { devs } = simular({ seed, n: 4, atrasado: true });
    conferirIguais(devs, `semente ${seed}`);
    const atrasado = devs[0].elenco.indexOf("J3");
    assert.ok(atrasado > 0, "o atrasado entrou no elenco");
    assert.ok(!devs[0].rodadas[0].quem.includes(atrasado), "não jogou a primeira rodada");
    assert.ok(devs[0].rodadas.some((r) => r.quem.includes(atrasado)), "jogou alguma rodada depois");
  }
});

/** Sala com três aparelhos montada passo a passo, com todas as mensagens entregues na hora. */
function salaDeTres() {
  const devs = ["A", "B", "C"].map((id, k) => ({ id, partida: novaPartidaStop("ABC234", k ? "convidado" : "criador", id), rascunho: {} }));
  const ctx = (d, presentes = ["A", "B", "C"]) => ({ agora: 0, presentes, rascunho: d.rascunho, sorte: semente(3) });
  const entregar = (de, msgs, presentes = ["A", "B", "C"]) => {
    for (const m of msgs) {
      for (const d of devs) {
        if (d === de || !presentes.includes(d.id)) continue;
        const passo = receberStop(d.partida, JSON.parse(JSON.stringify(m)), de.id, ctx(d, presentes));
        d.partida = passo.partida;
        entregar(d, passo.enviar, presentes);
      }
    }
  };
  const fazer = (d, passo, presentes) => {
    d.partida = passo.partida;
    entregar(d, passo.enviar, presentes);
  };
  for (const d of devs) entregar(d, reenviarStop(d.partida));
  return { devs, ctx, fazer };
}

test("Stop: quando um pede Stop, a rodada fecha para todos com o que cada um já escreveu", () => {
  const { devs, ctx, fazer } = salaDeTres();
  const [A, B, C] = devs;
  assert.deepEqual(A.partida.elenco, ["A", "B", "C"]);
  assert.equal(meuIndice(C.partida), 2);
  fazer(A, comecar(A.partida, CONFIG_PADRAO, ctx(A)));
  assert.equal(faseDe(B.partida), "escrevendo");
  const letra = atual(A.partida).letra;
  B.rascunho = { nome: `${letra}ia` };
  C.rascunho = {};
  const tudo = Object.fromEntries(CONFIG_PADRAO.categorias.map((c) => [c, `${letra}ola`]));
  fazer(A, parar(A.partida, tudo, true, 0));
  for (const d of devs) assert.equal(faseDe(d.partida), "conferindo", d.id);
  assert.equal(atual(C.partida).respostas[1].nome, `${letra}ia`);
  assert.equal(atual(C.partida).respostas[2].animal, "");
  assert.equal(atual(B.partida).parou, 0, "B sabe que foi a Arara que pediu Stop");
  // todos prontos: quem criou a sala fecha e abre a próxima
  for (const d of devs) fazer(d, ficarPronto(d.partida, ctx(d)));
  for (const d of devs) assert.equal(atual(d.partida).r, 2, d.id);
  assert.deepEqual(B.partida.rodadas[0].pontos, A.partida.rodadas[0].pontos);
});

test("Stop: seguir sem quem saiu", () => {
  const { devs, ctx, fazer } = salaDeTres();
  const [A, B, C] = devs;
  fazer(A, comecar(A.partida, CONFIG_PADRAO, ctx(A)));
  const letra = atual(A.partida).letra;
  const tudo = Object.fromEntries(CONFIG_PADRAO.categorias.map((c) => [c, `${letra}ola`]));
  // C sai antes do Stop: as respostas dele faltam
  const semC = ["A", "B"];
  assert.equal(podeSeguirSem(A.partida, 2, semC), false, "antes de alguém fechar as respostas, ainda não");
  fazer(A, parar(A.partida, tudo, true, 0), semC);
  assert.equal(faseDe(A.partida), "aguardando");
  assert.equal(podeSeguirSem(A.partida, 2, ["A", "B", "C"]), false, "quem está na sala não");
  assert.equal(podeSeguirSem(A.partida, 1, semC), false, "quem respondeu e está na sala não");
  fazer(A, seguirSem(A.partida, 2, ctx(A, semC)), semC);
  assert.deepEqual(atual(A.partida).quem, [0, 1]);
  assert.equal(faseDe(B.partida), "conferindo");
  fazer(A, ficarPronto(A.partida, ctx(A, semC)), semC);
  fazer(B, ficarPronto(B.partida, ctx(B, semC)), semC);
  // C continua fora: a rodada 2 abre só com A e B
  assert.deepEqual(atual(A.partida).quem, [0, 1]);
  // C volta: recebe a sala e fica de fora até a próxima
  for (const m of reenviarStop(A.partida)) C.partida = receberStop(C.partida, m, "A", ctx(C)).partida;
  assert.equal(faseDe(C.partida), "fora");
  // com dois, seguir sem quem não respondeu não vale (sobraria um só); sem estar pronto, vale
  fazer(A, parar(A.partida, tudo, true, 0));
  assert.equal(podeSeguirSem(A.partida, 1, ["A"]), true, "B respondeu e saiu: conta como pronto");
  fazer(A, ficarPronto(A.partida, ctx(A, ["A"])), ["A"]);
  fazer(A, seguirSem(A.partida, 1, ctx(A, ["A"])), ["A"]);
  assert.equal(faseDe(A.partida), "entre", "rodada fechada, mas só A está na sala");
  assert.equal(abrirProxima(A.partida, ctx(A, ["A"])).partida, A.partida);
  fazer(A, abrirProxima(A.partida, ctx(A)));
  assert.deepEqual(atual(A.partida).quem, [0, 1, 2], "C volta a jogar");
  assert.equal(faseDe(C.partida), "escrevendo");
});

test("Stop: revanche, com quem foi convidado pedindo antes ou depois", () => {
  const { devs } = simular({ seed: 7, n: 3 });
  const [A, B, C] = devs;
  const sorte = semente(9);
  const ctx = (presentes = ["J0", "J1", "J2"]) => ({ agora: 0, presentes, rascunho: {}, sorte });
  // B pede antes de quem criou a sala
  let b = revancheStop(B);
  assert.equal(b.partida.p, 2);
  let a = receberStop(A, b.enviar[0], "J1", ctx()).partida;
  assert.equal(comecar(a, CONFIG_PADRAO, ctx()).partida, a, "quem criou a sala ainda está no fim");
  a = revancheStop(a);
  b = receberStop(b.partida, a.enviar[0], "J0", ctx());
  assert.equal(faseDe(b.partida), "esperando");
  // C ainda vê o resultado: fica sabendo que a sala seguiu, mas não sai do fim sozinho
  let c = receberStop(C, a.enviar[0], "J0", ctx()).partida;
  assert.equal(faseDe(c), "fim");
  assert.equal(c.pSala, 2);
  // começa só com quem pediu para jogar de novo
  const inicio = comecar(a.partida, CONFIG_PADRAO, ctx());
  assert.deepEqual(atual(inicio.partida).quem, [0, 1]);
  c = revancheStop(c).partida;
  assert.equal(c.p, 2);
  c = receberStop(c, inicio.enviar[0], "J0", ctx()).partida;
  assert.equal(faseDe(c), "fora", "C entra na rodada seguinte");
});

test("Stop: sala cheia", () => {
  let a = novaPartidaStop("ABC234", "criador", "A");
  const ctx = { agora: 0, presentes: [], rascunho: {} };
  for (let k = 1; k < MAX_ELENCO + 3; k++) {
    const visitante = novaPartidaStop("ABC234", "convidado", `V${k}`);
    const passo = receberStop(a, reenviarStop(visitante)[0], `V${k}`, ctx);
    a = passo.partida;
    const respondido = receberStop(visitante, passo.enviar[0], "A", ctx).partida;
    assert.equal(faseDe(respondido), k < MAX_ELENCO ? "esperando" : "cheia", `visitante ${k}`);
  }
  assert.equal(a.elenco.length, MAX_ELENCO);
});

test("Stop: não vota na própria palavra nem fora da conferência", () => {
  const { devs, ctx, fazer } = salaDeTres();
  const [A, B] = devs;
  fazer(A, comecar(A.partida, CONFIG_PADRAO, ctx(A)));
  const letra = atual(A.partida).letra;
  assert.equal(anular(B.partida, "animal", `${letra}ola`, true).partida, B.partida, "escrevendo ainda");
  B.rascunho = { animal: `${letra}ola` };
  fazer(A, parar(A.partida, { animal: `${letra}ola`, nome: `${letra}ia` }, true, 0));
  assert.equal(anular(B.partida, "animal", `${letra}ola`, true).partida, B.partida, "a palavra também é dele");
  assert.equal(anular(B.partida, "nome", "Qualquer", true).partida, B.partida, "ninguém escreveu");
  const voto = anular(B.partida, "nome", `${letra}ia`, true);
  assert.deepEqual(atual(voto.partida).votos[1], [`nome:${normalizar(`${letra}ia`)}`]);
});

test("Stop: mensagem estranha é recusada", () => {
  const eu = { t: "eu", p: 1, r: 1, respostas: null, anuladas: [], pronto: false, parou: false, tenho: 0 };
  assert.equal(ehMsgStop(eu), true);
  assert.equal(ehMsgStop({ ...eu, respostas: { hacker: "x" } }), false);
  assert.equal(ehMsgStop({ ...eu, respostas: { nome: "x".repeat(41) } }), false);
  assert.equal(ehMsgStop({ ...eu, anuladas: ["hacker:x"] }), false);
  assert.equal(ehMsgStop({ ...eu, tenho: true }), false);
  const sala = { t: "sala", p: 1, elenco: ["A", "B"], config: CONFIG_PADRAO, rodadas: [{ letra: "B", quem: [0, 1], pontos: null }], fim: false };
  assert.equal(ehMsgStop(sala), true);
  assert.equal(ehMsgStop({ ...sala, config: { categorias: ["nome"], total: 5, tempo: 120 } }), false);
  assert.equal(ehMsgStop({ ...sala, rodadas: [{ letra: "B", quem: [0, 2], pontos: null }] }), false, "jogador fora do elenco");
  assert.equal(ehMsgStop({ ...sala, rodadas: [{ letra: "K", quem: [0, 1], pontos: null }] }), false, "letra fora da lista");
  assert.equal(ehMsgStop({ ...sala, rodadas: [{ letra: "B", quem: [0, 1], pontos: [10] }] }), false, "pontos sem dono");
  assert.equal(ehMsgStop({ ...sala, elenco: ["A", "A"] }), false);
});
