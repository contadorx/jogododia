// Testes de reversi, Go e jogo da onça, e de cada um na partida à distância.
import { test } from "node:test";
import assert from "node:assert/strict";
import { reproduzir } from "../lib/jogos/motor.ts";
import { contar, jogadasDe, motorReversi, viradasPor } from "../lib/jogos/reversi.ts";
import { KOMI, contarArea, motorGo } from "../lib/jogos/go.ts";
import { LINHAS_ONCA, PONTOS_ONCA, lancesOnca, motorOnca, vizinhosOnca } from "../lib/jogos/onca.ts";
import { semente, simularSala } from "./apoio-testes.mjs";

const sorteio = (lista, sorte) => lista[Math.floor(sorte() * lista.length)];
function partidasAleatorias(motor, jogadas, conferir, { vezes = 60, limite = 4000 } = {}) {
  const fins = [];
  for (let s = 1; s <= vezes; s++) {
    const sorte = semente(s);
    let e = motor.inicial();
    let n = 0;
    while (!motor.resultado(e)) {
      const opcoes = jogadas(e, sorte);
      assert.ok(opcoes.length > 0, `semente ${s}: sem jogada e sem resultado`);
      const j = sorteio(opcoes, sorte);
      assert.ok(motor.valida(e, j), `semente ${s}: jogada inválida ${JSON.stringify(j)}`);
      assert.ok(motor.ehJogada(JSON.parse(JSON.stringify(j))));
      e = motor.aplicar(e, j);
      conferir?.(e);
      assert.ok(++n < limite, `semente ${s}: não termina`);
    }
    fins.push(motor.resultado(e));
  }
  return fins;
}
const casa = (nome) => (8 - Number(nome[1])) * 8 + (nome.charCodeAt(0) - 97);

// ------------------------------------------------------------------- reversi

const jogadasReversi = (e) => jogadasDe(e.casas, e.vez).map((casa) => ({ casa }));

test("Reversi: começo com 4 jogadas e peças que viram", () => {
  const e = motorReversi.inicial();
  assert.deepEqual(contar(e.casas), [2, 2]);
  assert.equal(jogadasReversi(e).length, 4);
  // pretas em d3 prendem a branca de d4
  assert.deepEqual(viradasPor(e.casas, casa("d3"), 0), [casa("d4")]);
  const d = motorReversi.aplicar(e, { casa: casa("d3") });
  assert.deepEqual(contar(d.casas), [4, 1]);
  assert.equal(d.vez, 1);
  assert.equal(motorReversi.valida(d, { casa: casa("a1") }), false);
});

test("Reversi: quem não tem jogada passa a vez sozinho", () => {
  // procura, em partidas sorteadas, o momento em que alguém passa
  let achou = 0;
  for (let seed = 1; seed <= 200 && achou < 5; seed++) {
    const sorte = semente(seed);
    let e = motorReversi.inicial();
    while (!e.fim) {
      const quem = e.vez;
      e = motorReversi.aplicar(e, sorteio(jogadasReversi(e), sorte));
      if (e.passou !== null && !e.fim) {
        achou++;
        assert.equal(e.vez, quem, "a vez continua com quem jogou");
        assert.equal(jogadasDe(e.casas, e.passou).length, 0, "quem passou não tinha jogada");
      }
    }
  }
  assert.ok(achou > 0, "nenhuma partida teve passe");
});

test("Reversi: partidas sorteadas terminam, sem passar de 64 peças", () => {
  const fins = partidasAleatorias(motorReversi, jogadasReversi, (e) => {
    const [p, b] = contar(e.casas);
    assert.ok(p + b <= 64);
  });
  assert.ok(fins.some((r) => r.vencedor === 0) && fins.some((r) => r.vencedor === 1));
});

test("Reversi à distância", () => {
  for (let seed = 1; seed <= 12; seed++) {
    const { A, B } = simularSala(motorReversi, (e, sorte) => sorteio(jogadasReversi(e), sorte), { seed, perda: 0.25, repete: 0.15 });
    assert.equal(A.fase, "fim");
    assert.deepEqual(A.jogadas, B.jogadas);
  }
});

// ------------------------------------------------------------------- go

const P = (r, c) => r * 9 + c;
const jogarGo = (lista) => reproduzir(motorGo, lista.map((x) => (x === "passa" ? { passa: true } : { casa: x })));

test("Go: captura, suicídio e repetição", () => {
  // pretas cercam a branca de (1,1)
  let e = jogarGo([P(0, 1), P(1, 1), P(1, 0), P(8, 8), P(1, 2), P(8, 7), P(2, 1)]);
  assert.equal(e.casas[P(1, 1)], null, "a branca foi capturada");
  assert.deepEqual(e.capturas, [1, 0]);
  // brancas não podem jogar no buraco cercado (seria suicídio)
  assert.equal(motorGo.valida(e, { casa: P(1, 1) }), false);
  // ko: a preta em (1,2) captura a branca de (1,1); a branca não pode recapturar na hora
  e = jogarGo([P(0, 1), P(0, 2), P(1, 0), P(1, 1), P(2, 1), P(2, 2), P(8, 8), P(1, 3), P(1, 2)]);
  assert.equal(e.casas[P(1, 1)], null);
  assert.deepEqual(e.capturas, [1, 0]);
  assert.equal(motorGo.valida(e, { casa: P(1, 1) }), false, "recaptura imediata repete a posição");
  // depois de uma troca em outro lugar, a recaptura vale
  e = motorGo.aplicar(motorGo.aplicar(e, { casa: P(8, 0) }), { casa: P(7, 0) });
  assert.equal(motorGo.valida(e, { casa: P(1, 1) }), true);
});

test("Go: dois passes acabam e a área é contada com a compensação", () => {
  // pretas fazem uma parede na coluna 3; brancas na coluna 5
  const lista = [];
  for (let r = 0; r < 9; r++) lista.push(P(r, 3), P(r, 5));
  lista.push("passa", "passa");
  const e = jogarGo(lista);
  const { pontos } = contarArea(e.casas);
  assert.equal(pontos[0], 9 * 4, "colunas 0 a 3");
  assert.equal(pontos[1], 9 * 4, "colunas 5 a 8");
  assert.equal(e.fim?.vencedor, 1, "empate de área: a compensação decide");
  assert.equal(e.fim?.pontos[1], 36 + KOMI);
});

test("Go: partidas sorteadas terminam", () => {
  partidasAleatorias(
    motorGo,
    (e, sorte) => {
      const livres = e.casas.flatMap((c, i) => (c === null && motorGo.valida(e, { casa: i }) ? [{ casa: i }] : []));
      return livres.length && sorte() > 0.04 ? livres : [{ passa: true }];
    },
    null,
    { vezes: 20 },
  );
});

test("Go à distância", () => {
  for (let seed = 1; seed <= 6; seed++) {
    const { A, B } = simularSala(
      motorGo,
      (e, sorte) => {
        const livres = e.casas.flatMap((c, i) => (c === null && motorGo.valida(e, { casa: i }) ? [{ casa: i }] : []));
        return livres.length && sorte() > 0.05 ? sorteio(livres, sorte) : { passa: true };
      },
      { seed, perda: 0.25, repete: 0.15 },
    );
    assert.equal(A.fase, "fim");
    assert.deepEqual(A.jogadas, B.jogadas);
  }
});

// ------------------------------------------------------------------- jogo da onça

const ponto = (x, y) => PONTOS_ONCA.findIndex(([a, b]) => a === x && b === y);
const jogadasOnca = (e) => lancesOnca(e).map((caminho) => ({ caminho }));

test("Onça: tabuleiro com 31 pontos, linhas de mão dupla e toca ligada pelo meio", () => {
  assert.equal(PONTOS_ONCA.length, 31);
  for (let i = 0; i < 31; i++) for (const v of vizinhosOnca(i)) assert.ok(vizinhosOnca(v).includes(i));
  assert.equal(vizinhosOnca(ponto(2, 2)).length, 8, "centro tem 8 vizinhos");
  assert.equal(vizinhosOnca(ponto(1, 2)).length, 4, "ponto ímpar só tem linhas retas");
  assert.deepEqual(new Set(vizinhosOnca(ponto(2, 0))), new Set([ponto(1, 0), ponto(3, 0), ponto(2, 1), ponto(1, 1), ponto(3, 1), ponto(1, -1), ponto(2, -1), ponto(3, -1)]));
  assert.ok(LINHAS_ONCA.length > 0);
});

test("Onça: começo com 3 lances para a onça e cachorros sem capturar", () => {
  const e = motorOnca.inicial();
  assert.equal(e.cachorros.length, 14);
  assert.equal(lancesOnca(e).length, 3);
  const d = motorOnca.aplicar(e, { caminho: [ponto(2, 2), ponto(2, 1)] });
  assert.equal(d.vez, 1);
  for (const l of lancesOnca(d)) assert.equal(l.length, 2, "cachorro só anda");
});

test("Onça: pulo, pulos emendados (parando quando quiser) e pulo para dentro da toca", () => {
  const base = { ...motorOnca.inicial(), onca: ponto(0, 4), cachorros: [ponto(0, 3), ponto(0, 1), ponto(4, 4)] };
  const lances = lancesOnca(base).map((l) => l.join(","));
  const um = [ponto(0, 4), ponto(0, 2)].join(",");
  const dois = [ponto(0, 4), ponto(0, 2), ponto(0, 0)].join(",");
  assert.ok(lances.includes(um) && lances.includes(dois));
  const d = motorOnca.aplicar(base, { caminho: dois.split(",").map(Number) });
  assert.equal(d.capturados, 2);
  assert.equal(d.cachorros.length, 1);
  // da linha 1, pulando o ponto de entrada da toca, cai dentro dela
  const toca = { ...motorOnca.inicial(), onca: ponto(2, 1), cachorros: [ponto(2, 0), ponto(4, 4)] };
  assert.ok(lancesOnca(toca).some((l) => l.length === 2 && l[1] === ponto(2, -1)));
  const diag = { ...motorOnca.inicial(), onca: ponto(3, 1), cachorros: [ponto(2, 0), ponto(4, 4)] };
  assert.ok(lancesOnca(diag).some((l) => l[1] === ponto(1, -1)), "diagonal continua na lateral da toca");
  const dentro = { ...motorOnca.inicial(), onca: ponto(0, -2), cachorros: [ponto(2, -2), ponto(4, 4)] };
  assert.ok(lancesOnca(dentro).some((l) => l[1] === ponto(4, -2)), "pulo na base da toca");
});

test("Onça: ganha com 5 capturas; os cachorros ganham cercando", () => {
  const quase = { ...motorOnca.inicial(), onca: ponto(0, 4), cachorros: [ponto(0, 3), ponto(4, 4)], capturados: 4 };
  const d = motorOnca.aplicar(quase, { caminho: [ponto(0, 4), ponto(0, 2)] });
  assert.deepEqual(d.fim, { vencedor: 0, motivo: "capturou 5 cachorros" });
  // onça no canto (0,4) (sem diagonal: 0+4 é par, tem diagonal para (1,3)); cerco completo
  const cerco = { ...motorOnca.inicial(), vez: 1, onca: ponto(0, 4), cachorros: [ponto(0, 3), ponto(1, 4), ponto(0, 2), ponto(2, 4), ponto(2, 2), ponto(1, 2)] };
  // o cachorro de (1,2) desce para (1,3): a onça fica sem passo e sem pulo
  const fecha = motorOnca.aplicar(cerco, { caminho: [ponto(1, 2), ponto(1, 3)] });
  assert.equal(fecha.fim?.vencedor, 1);
});

test("Onça: partidas sorteadas terminam", () => {
  const fins = partidasAleatorias(motorOnca, jogadasOnca, (e) => assert.equal(e.cachorros.length + e.capturados, 14));
  assert.ok(fins.length === 60);
});

test("Onça à distância", () => {
  for (let seed = 1; seed <= 12; seed++) {
    const { A, B } = simularSala(motorOnca, (e, sorte) => sorteio(jogadasOnca(e), sorte), { seed, perda: 0.25, repete: 0.15 });
    assert.equal(A.fase, "fim");
    assert.deepEqual(A.jogadas, B.jogadas);
  }
});
