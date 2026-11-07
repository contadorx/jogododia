// Testes das regras de hex, trilha, damas e descubra o código, e de cada um na partida à distância.
import { test } from "node:test";
import assert from "node:assert/strict";
import { reproduzir } from "../lib/jogos/motor.ts";
import { N_HEX, TOTAL_HEX, motorHex, vizinhasHex } from "../lib/jogos/hex.ts";
import { MOINHOS, VIZINHOS, jogadasTrilha, motorTrilha, removiveis } from "../lib/jogos/trilha.ts";
import { escura, lancesDamas, motorDamas } from "../lib/jogos/damas.ts";
import { PALPITES, comparar, motorCodigo } from "../lib/jogos/codigo.ts";
import { semente, simularSala } from "./testar-turnos.mjs";

const sorteio = (lista, sorte) => lista[Math.floor(sorte() * lista.length)];

function partidasAleatorias(motor, jogadas, conferir, { vezes = 100, limite = 3000 } = {}) {
  const fins = [];
  for (let s = 1; s <= vezes; s++) {
    const sorte = semente(s);
    let e = motor.inicial();
    let n = 0;
    while (!motor.resultado(e)) {
      const opcoes = jogadas(e, sorte);
      assert.ok(opcoes.length > 0, `semente ${s}: sem jogada e sem resultado`);
      const j = sorteio(opcoes, sorte);
      assert.ok(motor.valida(e, j), `semente ${s}: jogada sorteada inválida ${JSON.stringify(j)}`);
      assert.ok(motor.ehJogada(JSON.parse(JSON.stringify(j))));
      e = motor.aplicar(e, j);
      conferir?.(e);
      assert.ok(++n < limite, `semente ${s}: a partida não termina`);
    }
    fins.push(motor.resultado(e));
  }
  return fins;
}

// ------------------------------------------------------------------- hex

const jogadasHex = (e) => e.casas.flatMap((c, casa) => (c === null ? [{ casa }] : []));

test("Hex: vizinhas e cantos", () => {
  assert.equal(vizinhasHex(0).length, 2);
  assert.equal(vizinhasHex(N_HEX - 1).length, 3);
  assert.equal(vizinhasHex(4 * N_HEX + 4).length, 6);
  for (let i = 0; i < TOTAL_HEX; i++) for (const v of vizinhasHex(i)) assert.ok(vizinhasHex(v).includes(i));
});

test("Hex: o vermelho liga a linha de cima à de baixo", () => {
  const jogadas = [];
  for (let r = 0; r < N_HEX; r++) {
    jogadas.push({ casa: r * N_HEX + 4 }); // vermelho desce pela coluna 4
    if (r < N_HEX - 1) jogadas.push({ casa: r * N_HEX + 0 }); // azul enrola na coluna 0
  }
  const e = reproduzir(motorHex, jogadas);
  assert.deepEqual(motorHex.resultado(e), { vencedor: 0, motivo: "ligou as suas duas bordas" });
  assert.equal(e.caminho.length, N_HEX);
});

test("Hex: o azul liga a esquerda à direita, inclusive em zigue-zague", () => {
  // azul: (4,0) (4,1) (3,2) (3,3) ... usa a vizinha (r-1, c+1)
  const azul = [36, 37, 29, 30, 22, 23, 15, 16, 8];
  const vermelho = [0, 1, 2, 3, 5, 6, 7, 9, 10];
  const jogadas = [];
  for (let k = 0; k < azul.length; k++) {
    jogadas.push({ casa: vermelho[k] });
    jogadas.push({ casa: azul[k] });
  }
  const e = reproduzir(motorHex, jogadas);
  assert.equal(motorHex.resultado(e)?.vencedor, 1);
});

test("Hex: nunca termina empatado (partidas sorteadas)", () => {
  const fins = partidasAleatorias(motorHex, jogadasHex, null, { vezes: 150 });
  assert.ok(fins.every((r) => r && r.vencedor !== null));
});

test("Hex à distância", () => {
  for (let seed = 1; seed <= 15; seed++) {
    const { A, B } = simularSala(motorHex, (e, sorte) => sorteio(jogadasHex(e), sorte), { seed, perda: 0.25, repete: 0.15 });
    assert.equal(A.fase, "fim");
    assert.deepEqual(A.jogadas, B.jogadas);
  }
});

// ------------------------------------------------------------------- trilha

test("Trilha: vizinhos de mão dupla e 16 moinhos de pontos vizinhos", () => {
  for (let i = 0; i < 24; i++) for (const v of VIZINHOS[i]) assert.ok(VIZINHOS[v].includes(i), `${i}-${v}`);
  assert.equal(MOINHOS.length, 16);
  for (const [a, b, c] of MOINHOS) {
    assert.ok(VIZINHOS[a].includes(b) && VIZINHOS[b].includes(c), `moinho ${a}-${b}-${c}`);
  }
});

test("Trilha: moinho na colocação tira peça, e peça em moinho fica protegida", () => {
  let e = motorTrilha.inicial();
  // brancas (0): 0, 1 e depois 2 (moinho); pretas (1): 21, 22, 23 (moinho antes)
  const lances = [
    { de: null, para: 0, tira: null },
    { de: null, para: 21, tira: null },
    { de: null, para: 1, tira: null },
    { de: null, para: 22, tira: null },
    { de: null, para: 9, tira: null },
  ];
  for (const j of lances) e = motorTrilha.aplicar(e, j);
  // pretas fecham 21-22-23 e tiram uma branca: 0 e 1 não estão em moinho, 9 também não
  assert.equal(motorTrilha.valida(e, { de: null, para: 23, tira: null }), false, "fez moinho: tem que tirar");
  assert.equal(motorTrilha.valida(e, { de: null, para: 23, tira: 0 }), true);
  e = motorTrilha.aplicar(e, { de: null, para: 23, tira: 0 });
  assert.deepEqual(e.noTabuleiro, [2, 3]);
  // brancas não conseguem tirar peça do moinho 21-22-23 se houver outra solta
  const casas = [...e.casas];
  casas[18] = 1;
  assert.deepEqual(removiveis(casas, 1), [18]);
  // se todas estão em moinho, qualquer uma pode sair
  assert.deepEqual(removiveis(e.casas, 1), [21, 22, 23]);
});

test("Trilha: com 3 peças a pessoa voa; com 2, perde", () => {
  const e = {
    ...motorTrilha.inicial(),
    casas: [0, 0, null, null, null, null, null, null, null, 0, null, null, null, null, null, null, null, null, 1, 1, null, 1, null, 1],
    naMao: [0, 0],
    noTabuleiro: [3, 4],
    vez: 0,
  };
  const destinosDe9 = jogadasTrilha(e).filter((j) => j.de === 9).map((j) => j.para);
  assert.ok(destinosDe9.length > 3, "voa para qualquer ponto livre");
  // brancas voam de 9 para 2, fecham 0-1-2 e tiram uma preta solta
  const d = motorTrilha.aplicar(e, { de: 9, para: 2, tira: 18 });
  assert.equal(d.fim, null);
  assert.deepEqual(d.noTabuleiro, [3, 3]);
});

test("Trilha: quem fica sem movimento perde", () => {
  // pretas com 4 peças presas nos cantos de fora por brancas
  const casas = Array(24).fill(null);
  for (const p of [0, 2, 21, 23]) casas[p] = 1;
  for (const p of [1, 9, 14, 22, 3]) casas[p] = 0;
  const e = { ...motorTrilha.inicial(), casas, naMao: [0, 0], noTabuleiro: [5, 4], vez: 0 };
  const d = motorTrilha.aplicar(e, { de: 3, para: 4, tira: null });
  assert.equal(d.fim?.vencedor, 0);
});

test("Trilha: partidas sorteadas terminam e as contas de peças batem", () => {
  partidasAleatorias(motorTrilha, (e) => jogadasTrilha(e), (e) => {
    for (const l of [0, 1]) assert.equal(e.casas.filter((c) => c === l).length, e.noTabuleiro[l]);
  });
});

test("Trilha à distância", () => {
  for (let seed = 1; seed <= 15; seed++) {
    const { A, B } = simularSala(motorTrilha, (e, sorte) => sorteio(jogadasTrilha(e), sorte), { seed, perda: 0.25, repete: 0.15 });
    assert.equal(A.fase, "fim");
    assert.deepEqual(A.jogadas, B.jogadas);
  }
});

// ------------------------------------------------------------------- damas

const casa = (nome) => (8 - Number(nome[1])) * 8 + (nome.charCodeAt(0) - 97); // "a1" → índice
const vazio = () => ({ ...motorDamas.inicial(), casas: Array(64).fill(null) });
const por = (e, mapa) => {
  const casas = [...e.casas];
  for (const [nome, peca] of Object.entries(mapa)) casas[casa(nome)] = peca;
  return { ...e, casas };
};
const B = { l: 0, d: false };
const P = { l: 1, d: false };
const BD = { l: 0, d: true };
const PD = { l: 1, d: true };

test("Damas: a1 é escura, 12 pedras de cada lado e 7 lances de abertura", () => {
  assert.ok(escura(casa("a1")));
  assert.ok(escura(casa("h8")));
  const e = motorDamas.inicial();
  assert.equal(e.casas.filter((p) => p && p.l === 0).length, 12);
  assert.equal(lancesDamas(e).length, 7);
});

test("Damas: captura obrigatória, para trás também, e lei da maioria", () => {
  // branca em d4; pretas em c5 (captura para a frente) e em e3 + c1... monta: para trás pega 2
  let e = por(vazio(), { d4: B, c5: P, e3: P, g3: P, h8: PD });
  // para a frente: d4 x c5 → b6 (1 peça). Para trás: d4 x e3 → f2, f2 x g3 → h4 (2 peças)
  const lances = lancesDamas(e);
  assert.equal(lances.length, 1);
  assert.deepEqual(lances[0].caminho, [casa("d4"), casa("f2"), casa("h4")]);
  assert.equal(motorDamas.valida(e, { caminho: [casa("d4"), casa("b6")] }), false);
  e = motorDamas.aplicar(e, { caminho: lances[0].caminho });
  assert.equal(e.casas[casa("e3")], null);
  assert.equal(e.casas[casa("g3")], null);
  assert.equal(e.casas[casa("c5")]?.l, 1);
});

test("Damas: a dama voa e captura de longe, escolhendo onde parar", () => {
  const e = por(vazio(), { a1: BD, d4: P, h8: PD });
  const lances = lancesDamas(e);
  // pula d4 e pode parar em e5, f6 ou g7
  assert.deepEqual(
    lances.map((l) => l.caminho[1]).sort((a, b) => a - b),
    [casa("e5"), casa("f6"), casa("g7")].sort((a, b) => a - b),
  );
});

test("Damas: pedra que só passa pela última fileira no meio da captura não vira dama", () => {
  // branca em b6 captura c7 → d8 e continua d8 x e7 → f6: termina em f6, sem coroar
  const e = por(vazio(), { b6: B, c7: P, e7: P, a1: PD });
  const [lance] = lancesDamas(e);
  assert.deepEqual(lance.caminho, [casa("b6"), casa("d8"), casa("f6")]);
  const d = motorDamas.aplicar(e, { caminho: lance.caminho });
  assert.equal(d.casas[casa("f6")]?.d, false);
  // e a que termina na última fileira vira
  const f = motorDamas.aplicar(por(vazio(), { b6: B, c7: P, h2: PD }), { caminho: [casa("b6"), casa("d8")] });
  assert.equal(f.casas[casa("d8")]?.d, true);
});

test("Damas: peça capturada só sai no fim e não pode ser pulada duas vezes", () => {
  // dama branca em a1, pretas em c3 e e5 e f6... a dama não pode voltar pela peça já pulada
  const e = por(vazio(), { a1: BD, c3: P, e3: P, h8: PD });
  for (const l of lancesDamas(e)) assert.equal(new Set(l.capturadas).size, l.capturadas.length);
});

test("Damas: 20 lances seguidos só de damas é empate", () => {
  // as duas damas vão e voltam sem nunca ficar na mira uma da outra
  let e = por(vazio(), { a3: BD, h8: PD });
  const idaEVolta = [
    ["a3", "c1"],
    ["h8", "g7"],
    ["c1", "a3"],
    ["g7", "h8"],
  ];
  let n = 0;
  while (!e.fim && n < 30) {
    const [de, para] = idaEVolta[n % 4];
    const caminho = [casa(de), casa(para)];
    assert.ok(motorDamas.valida(e, { caminho }), `lance ${n + 1}`);
    e = motorDamas.aplicar(e, { caminho });
    n++;
  }
  assert.equal(e.fim?.vencedor, null);
  assert.equal(n, 20);
});

test("Damas: partidas sorteadas terminam", () => {
  const fins = partidasAleatorias(motorDamas, (e) => lancesDamas(e).map((l) => ({ caminho: l.caminho })), null, { vezes: 60 });
  assert.ok(fins.length === 60);
});

test("Damas à distância", () => {
  for (let seed = 1; seed <= 10; seed++) {
    const { A, B } = simularSala(motorDamas, (e, sorte) => ({ caminho: sorteio(lancesDamas(e), sorte).caminho }), { seed, perda: 0.25, repete: 0.15 });
    assert.equal(A.fase, "fim");
    assert.deepEqual(A.jogadas, B.jogadas);
  }
});

// ------------------------------------------------------------------- descubra o código

test("Descubra o código: respostas", () => {
  assert.deepEqual(comparar("1234", "1234"), { certos: 4, fora: 0 });
  assert.deepEqual(comparar("1234", "4321"), { certos: 0, fora: 4 });
  assert.deepEqual(comparar("1256", "1234"), { certos: 2, fora: 0 });
  assert.deepEqual(comparar("5612", "1234"), { certos: 0, fora: 2 });
  assert.deepEqual(comparar("1324", "1234"), { certos: 2, fora: 2 });
});

const SEGREDOS = ["1234", "5678"];
/** O que cada aparelho faz na sua vez: pronto, chute sorteado, resposta e revelação automáticas. */
function jogadaCodigo(e, sorte, segredos = SEGREDOS) {
  switch (e.fase) {
    case "escolher":
      return { t: "pronto" };
    case "chutar": {
      const alvo = segredos[1 - e.vez];
      // às vezes chuta certo, para a partida acabar de vários jeitos
      if (sorte() < 0.12) return { t: "palpite", d: alvo };
      const digitos = [..."0123456789"].sort(() => sorte() - 0.5).slice(0, 4).join("");
      return { t: "palpite", d: digitos };
    }
    case "responder":
      return { t: "resposta", ...comparar(e.palpites.at(-1).d, segredos[e.vez]) };
    case "revelar":
      return { t: "revela", d: segredos[e.vez] };
  }
}

test("Descubra o código: quem começou e acertou dá a última chance ao outro", () => {
  const jogadas = [
    { t: "pronto" },
    { t: "pronto" },
    { t: "palpite", d: "5678" }, // lado 0 acerta de primeira
    { t: "resposta", certos: 4, fora: 0 },
  ];
  let e = reproduzir(motorCodigo, jogadas);
  assert.equal(e.fase, "chutar");
  assert.equal(e.vez, 1, "o lado 1 ainda chuta");
  e = motorCodigo.aplicar(e, { t: "palpite", d: "1234" });
  e = motorCodigo.aplicar(e, { t: "resposta", certos: 4, fora: 0 });
  assert.equal(e.fase, "revelar");
  e = motorCodigo.aplicar(motorCodigo.aplicar(e, { t: "revela", d: "1234" }), { t: "revela", d: "5678" });
  assert.deepEqual(motorCodigo.resultado(e), { vencedor: null, motivo: "os dois descobriram, em 1 palpites" });
});

test("Descubra o código: ninguém descobre em 12 é empate; resposta impossível é recusada", () => {
  let e = reproduzir(motorCodigo, [{ t: "pronto" }, { t: "pronto" }]);
  for (let k = 0; k < PALPITES * 2; k++) {
    e = motorCodigo.aplicar(e, { t: "palpite", d: "9876" });
    assert.equal(motorCodigo.valida(e, { t: "resposta", certos: 3, fora: 1 }), false);
    e = motorCodigo.aplicar(e, { t: "resposta", certos: 0, fora: 0 });
  }
  assert.equal(e.fase, "revelar");
});

test("Descubra o código: partidas sorteadas, respostas sempre batem com o código revelado", () => {
  const fins = partidasAleatorias(motorCodigo, (e, sorte) => [jogadaCodigo(e, sorte)], (e) => {
    if (e.fase !== "fim") return;
    for (const p of e.palpites) assert.deepEqual(p.resposta, comparar(p.d, e.revelados[1 - p.lado]));
  });
  assert.ok(fins.some((r) => r.vencedor === 0) && fins.some((r) => r.vencedor === 1) && fins.some((r) => r.vencedor === null));
});

test("Descubra o código à distância (cada aparelho responde com o seu código)", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const { A, B } = simularSala(motorCodigo, (e, sorte) => jogadaCodigo(e, sorte), { seed, perda: 0.25, repete: 0.15 });
    assert.equal(A.fase, "fim");
    assert.deepEqual(A.jogadas, B.jogadas);
  }
});
