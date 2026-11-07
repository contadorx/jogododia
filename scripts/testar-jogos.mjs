// Testes das regras dos jogos por turnos (lib/jogos/*.ts) e de cada um deles na partida à distância.
import { test } from "node:test";
import assert from "node:assert/strict";
import { reproduzir } from "../lib/jogos/motor.ts";
import { casaQ, motorQuatro } from "../lib/jogos/quatro.ts";
import { HORIZONTAIS, LADO_P, TOTAL_LINHAS, ladosDoQuadrado, linhaH, linhaV, motorPontinhos, quadradosDaLinha } from "../lib/jogos/pontinhos.ts";
import { CASAS, alimenta, casasJogaveis, motorMancala } from "../lib/jogos/mancala.ts";
import { semente, simularSala } from "./testar-turnos.mjs";

const sorteio = (lista, sorte) => lista[Math.floor(sorte() * lista.length)];

/** Joga partidas inteiras com jogadas sorteadas e confere uma regra a cada passo. */
function partidasAleatorias(motor, jogadas, conferir, { vezes = 200, limite = 2000 } = {}) {
  for (let s = 1; s <= vezes; s++) {
    const sorte = semente(s);
    let e = motor.inicial();
    let n = 0;
    while (!motor.resultado(e)) {
      const opcoes = jogadas(e);
      assert.ok(opcoes.length > 0, `semente ${s}: sem jogada possível e sem resultado`);
      const j = sorteio(opcoes, sorte);
      assert.ok(motor.valida(e, j));
      assert.ok(motor.ehJogada(JSON.parse(JSON.stringify(j))));
      e = motor.aplicar(e, j);
      conferir?.(e);
      assert.ok(++n < limite, `semente ${s}: a partida não termina`);
    }
  }
}

// ------------------------------------------------------------------- quatro em linha

const jogadasQuatro = (e) => [0, 1, 2, 3, 4, 5, 6].map((coluna) => ({ coluna })).filter((j) => motorQuatro.valida(e, j));

test("Quatro em linha: a peça cai até embaixo e a coluna enche", () => {
  let e = motorQuatro.inicial();
  for (let i = 0; i < 6; i++) e = motorQuatro.aplicar(e, { coluna: 3 });
  assert.equal(e.alturas[3], 6);
  assert.equal(motorQuatro.valida(e, { coluna: 3 }), false);
  assert.equal(e.grade[casaQ(0, 3)], 0);
  assert.equal(e.grade[casaQ(5, 3)], 1);
});

test("Quatro em linha: horizontal, vertical e diagonal", () => {
  // horizontal na linha de baixo
  let e = reproduzir(motorQuatro, [0, 0, 1, 1, 2, 2, 3].map((coluna) => ({ coluna })));
  assert.deepEqual(motorQuatro.resultado(e), { vencedor: 0, motivo: "alinhou quatro peças" });
  assert.deepEqual(e.linha, [casaQ(0, 0), casaQ(0, 1), casaQ(0, 2), casaQ(0, 3)]);
  // vertical do segundo jogador
  e = reproduzir(motorQuatro, [0, 6, 1, 6, 2, 6, 0, 6].map((coluna) => ({ coluna })));
  assert.equal(motorQuatro.resultado(e)?.vencedor, 1);
  // diagonal subindo para a direita
  e = reproduzir(motorQuatro, [0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3].map((coluna) => ({ coluna })));
  assert.equal(motorQuatro.resultado(e)?.vencedor, 0);
  assert.deepEqual(e.linha, [casaQ(0, 0), casaQ(1, 1), casaQ(2, 2), casaQ(3, 3)]);
  // depois de ganhar, ninguém joga mais
  assert.equal(motorQuatro.valida(e, { coluna: 5 }), false);
});

test("Quatro em linha: partidas sorteadas sempre terminam, com no máximo 42 peças", () => {
  partidasAleatorias(motorQuatro, jogadasQuatro, (e) => {
    assert.equal(e.grade.filter((x) => x !== null).length, e.feitas);
    assert.ok(e.feitas <= 42);
  });
});

test("Quatro em linha: grade cheia sem linha é empate", () => {
  const ordem = [2, 4, 0, 5, 0, 6, 0, 1, 1, 5, 3, 4, 1, 0, 0, 0, 3, 1, 6, 2, 1, 2, 2, 3, 4, 6, 5, 3, 1, 3, 6, 6, 3, 2, 6, 5, 2, 5, 4, 5, 4, 4];
  let e = motorQuatro.inicial();
  for (const coluna of ordem) {
    assert.ok(motorQuatro.valida(e, { coluna }), `coluna ${coluna} na jogada ${e.feitas + 1}`);
    e = motorQuatro.aplicar(e, { coluna });
  }
  assert.equal(e.feitas, 42);
  assert.deepEqual(motorQuatro.resultado(e), { vencedor: null, motivo: "a grade encheu sem ninguém alinhar quatro" });
});

test("Quatro em linha à distância: os dois aparelhos ficam iguais, mesmo perdendo mensagens", () => {
  for (let seed = 1; seed <= 30; seed++) {
    const { A, B } = simularSala(motorQuatro, (e, sorte) => sorteio(jogadasQuatro(e), sorte), { seed, perda: 0.25, repete: 0.15 });
    assert.equal(A.fase, "fim");
    assert.equal(B.fase, "fim");
    assert.deepEqual(A.jogadas, B.jogadas);
  }
});

// ------------------------------------------------------------------- pontinhos

const jogadasPontinhos = (e) =>
  e.linhas.flatMap((dono, linha) => (dono === null ? [{ linha }] : []));

test("Pontinhos: cada linha é lado de 1 ou 2 quadrados, e cada quadrado tem 4 lados", () => {
  const contagem = Array(LADO_P * LADO_P).fill(0);
  for (let l = 0; l < TOTAL_LINHAS; l++) {
    const q = quadradosDaLinha(l);
    assert.ok(q.length === 1 || q.length === 2);
    for (const x of q) contagem[x]++;
  }
  assert.ok(contagem.every((n) => n === 4));
  assert.equal(HORIZONTAIS, 20);
});

test("Pontinhos: quem fecha o quadrado marca e joga de novo", () => {
  let e = motorPontinhos.inicial();
  const [cima, baixo, esquerda, direita] = ladosDoQuadrado(0, 0);
  e = motorPontinhos.aplicar(e, { linha: cima }); // lado 0
  e = motorPontinhos.aplicar(e, { linha: baixo }); // lado 1
  e = motorPontinhos.aplicar(e, { linha: esquerda }); // lado 0
  assert.equal(e.vez, 1);
  e = motorPontinhos.aplicar(e, { linha: direita }); // lado 1 fecha
  assert.equal(e.quadrados[0], 1);
  assert.deepEqual(e.pontos, [0, 1]);
  assert.equal(e.vez, 1, "joga de novo");
  assert.equal(motorPontinhos.valida(e, { linha: direita }), false);
});

test("Pontinhos: uma linha pode fechar dois quadrados de uma vez", () => {
  let e = motorPontinhos.inicial();
  const linhas = [linhaH(0, 0), linhaH(1, 0), linhaV(0, 0), linhaH(0, 1), linhaH(1, 1), linhaV(0, 2)];
  for (const linha of linhas) e = motorPontinhos.aplicar(e, { linha });
  const vez = e.vez;
  e = motorPontinhos.aplicar(e, { linha: linhaV(0, 1) });
  assert.equal(e.pontos[vez], 2);
  assert.equal(e.vez, vez);
});

test("Pontinhos: partidas sorteadas terminam com 16 quadrados distribuídos", () => {
  partidasAleatorias(motorPontinhos, jogadasPontinhos, (e) => {
    assert.equal(e.pontos[0] + e.pontos[1], e.quadrados.filter((x) => x !== null).length);
  });
  const e = reproduzir(motorPontinhos, Array.from({ length: TOTAL_LINHAS }, (_, linha) => ({ linha })));
  assert.equal(e.pontos[0] + e.pontos[1], 16);
  assert.ok(motorPontinhos.resultado(e));
});

test("Pontinhos à distância, com a vez repetida de quem fecha quadrado", () => {
  for (let seed = 1; seed <= 30; seed++) {
    const { A, B } = simularSala(motorPontinhos, (e, sorte) => sorteio(jogadasPontinhos(e), sorte), { seed, perda: 0.25, repete: 0.15 });
    assert.equal(A.fase, "fim");
    assert.deepEqual(A.jogadas, B.jogadas);
  }
});

// ------------------------------------------------------------------- mancala (awalé)

const jogadasMancala = (e) => casasJogaveis(e).map((casa) => ({ casa }));
const total = (e) => e.casas.reduce((a, b) => a + b, 0) + e.colhidas[0] + e.colhidas[1];

test("Mancala: semeia uma por casa, no sentido anti-horário", () => {
  const e = motorMancala.aplicar(motorMancala.inicial(), { casa: 4 });
  assert.deepEqual(e.casas, [4, 4, 4, 4, 0, 5, 5, 5, 5, 4, 4, 4]);
  assert.equal(e.vez, 1);
  assert.deepEqual(e.rastro?.caminho, [5, 6, 7, 8]);
});

test("Mancala: colhe 2 ou 3 e volta colhendo as casas anteriores do outro", () => {
  const e = { ...motorMancala.inicial(), casas: [0, 0, 0, 0, 0, 3, 1, 2, 1, 5, 5, 5] };
  const d = motorMancala.aplicar(e, { casa: 5 }); // cai em 6, 7, 8 → 2, 3, 2
  assert.deepEqual(d.rastro?.colhidas, [8, 7, 6]);
  assert.deepEqual(d.colhidas, [7, 0]);
  assert.deepEqual(d.casas, [0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5]);
});

test("Mancala: a colheita para numa casa que não tem 2 ou 3", () => {
  const e = { ...motorMancala.inicial(), casas: [0, 0, 0, 0, 0, 3, 1, 4, 1, 5, 5, 5] };
  const d = motorMancala.aplicar(e, { casa: 5 }); // 6→2, 7→5, 8→2
  assert.deepEqual(d.rastro?.colhidas, [8]);
  assert.deepEqual(d.colhidas, [2, 0]);
});

test("Mancala: colher tudo do outro não vale (a colheita é perdoada)", () => {
  const e = { ...motorMancala.inicial(), casas: [1, 0, 0, 0, 0, 2, 1, 1, 0, 0, 0, 0], colhidas: [20, 23] };
  const d = motorMancala.aplicar(e, { casa: 5 }); // 6→2, 7→2: levaria tudo
  assert.equal(d.rastro?.perdoou, true);
  assert.deepEqual(d.colhidas, [20, 23]);
  assert.equal(d.fim, null);
  assert.deepEqual(d.casas.slice(6), [2, 2, 0, 0, 0, 0]);
});

test("Mancala: com 12 ou mais sementes, a casa de origem é pulada", () => {
  const e = { ...motorMancala.inicial(), casas: [12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], colhidas: [18, 18] };
  const d = motorMancala.aplicar(e, { casa: 0 });
  assert.equal(d.casas[0], 0);
  assert.equal(d.rastro?.caminho.at(-1), 1, "a 12ª semente cai na casa 1, depois de pular a 0");
  assert.equal(d.rastro?.caminho.includes(0), false);
});

test("Mancala: se o outro está sem sementes, é obrigado a alimentar", () => {
  const e = { ...motorMancala.inicial(), casas: [1, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0], colhidas: [22, 23] };
  assert.deepEqual(casasJogaveis(e), [4]);
  assert.equal(alimenta(e, 0), false);
  assert.equal(motorMancala.valida(e, { casa: 0 }), false);
});

test("Mancala: sem como alimentar, quem tem sementes fica com elas e a partida acaba", () => {
  // o lado 1 joga a última semente dele para o lado 0; o lado 0 não consegue devolver
  const e = { ...motorMancala.inicial(), vez: 1, casas: [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], colhidas: [20, 24] };
  const d = motorMancala.aplicar(e, { casa: 11 }); // cai na casa 0 → 4, o lado 1 fica vazio
  assert.ok(d.fim);
  assert.deepEqual(d.colhidas, [24, 24]);
  assert.equal(d.fim?.vencedor, null);
});

test("Mancala: partidas sorteadas guardam as 48 sementes e sempre terminam", () => {
  partidasAleatorias(motorMancala, jogadasMancala, (e) => {
    assert.equal(total(e), 48);
    assert.ok(e.casas.every((n) => n >= 0));
    if (!e.fim) assert.ok(jogadasMancala(e).length > 0, "quem joga tem jogada");
  });
});

test("Mancala à distância", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const { A, B } = simularSala(motorMancala, (e, sorte) => sorteio(jogadasMancala(e), sorte), { seed, perda: 0.25, repete: 0.15 });
    assert.equal(A.fase, "fim");
    assert.deepEqual(A.jogadas, B.jogadas);
  }
  assert.equal(CASAS, 12);
});
