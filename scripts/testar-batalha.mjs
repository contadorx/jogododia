// Testes das regras da batalha naval (lib/batalha.ts). Rode com `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FROTA,
  TOTAL_CASAS,
  aguaEmVolta,
  ajustarNaBorda,
  aproveitamento,
  casasDoNavio,
  coordenada,
  encaixe,
  frotaCompleta,
  grupoDeAcertos,
  mapaDaFrota,
  responderTiro,
  situacaoDaFrota,
  sortearFrota,
  vizinhas,
} from "../lib/batalha.ts";

/** Sorteio com semente, para os testes darem sempre o mesmo resultado. */
function semente(s) {
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("coordenadas: letra da coluna e número da linha", () => {
  assert.equal(coordenada(0), "A1");
  assert.equal(coordenada(14), "E2");
  assert.equal(coordenada(99), "J10");
  assert.equal(coordenada(41), "B5");
});

test("navio não pode sair do tabuleiro", () => {
  assert.equal(casasDoNavio(5, 6, "h"), null);
  assert.deepEqual(casasDoNavio(5, 5, "h"), [5, 6, 7, 8, 9]);
  assert.equal(casasDoNavio(3, 80, "v"), null);
  assert.deepEqual(casasDoNavio(3, 70, "v"), [70, 80, 90]);
});

test("ajuste na borda puxa o navio para dentro", () => {
  assert.equal(ajustarNaBorda(5, 8, "h"), 5);
  assert.equal(ajustarNaBorda(4, 92, "v"), 62);
  assert.equal(ajustarNaBorda(2, 33, "h"), 33);
});

test("vizinhas contam as diagonais e respeitam as bordas", () => {
  assert.equal(vizinhas(0).length, 3);
  assert.equal(vizinhas(9).length, 3);
  assert.equal(vizinhas(45).length, 8);
  assert.equal(vizinhas(50).length, 5);
});

test("navios não sobrepõem nem encostam, nem na diagonal", () => {
  const frota = [{ navioId: "destroier", casa: 0, orientacao: "h" }]; // A1 e B1
  assert.deepEqual(encaixe(frota, "cruzador", 2, "h"), { ok: false, motivo: "encosta" }); // C1 encosta em B1
  assert.deepEqual(encaixe(frota, "cruzador", 12, "h"), { ok: false, motivo: "encosta" }); // C2 encosta na diagonal
  assert.deepEqual(encaixe(frota, "cruzador", 1, "v"), { ok: false, motivo: "ocupada" });
  assert.equal(encaixe(frota, "cruzador", 3, "h").ok, true); // D1 a F1: tem uma casa de água no meio
  assert.deepEqual(encaixe(frota, "porta-avioes", 7, "h"), { ok: false, motivo: "fora" });
  // mover o próprio navio para perto de onde ele está não conta como encostar nele mesmo
  assert.equal(encaixe(frota, "destroier", 1, "h").ok, true);
});

test("sorteio sempre monta uma frota válida", () => {
  for (let s = 1; s <= 500; s++) {
    const frota = sortearFrota(semente(s));
    assert.equal(frotaCompleta(frota), true);
    assert.equal(mapaDaFrota(frota).size, TOTAL_CASAS);
    for (const p of frota) {
      const outros = frota.filter((x) => x !== p);
      assert.equal(encaixe(outros, p.navioId, p.casa, p.orientacao).ok, true, `semente ${s}: ${p.navioId} encosta`);
    }
  }
});

test("responder tiro: água, acertou, afundou, fim de jogo e repetido", () => {
  const frota = [
    { navioId: "porta-avioes", casa: 0, orientacao: "h" }, // A1–E1
    { navioId: "encouracado", casa: 20, orientacao: "h" }, // A3–D3
    { navioId: "cruzador", casa: 40, orientacao: "h" }, // A5–C5
    { navioId: "submarino", casa: 60, orientacao: "h" }, // A7–C7
    { navioId: "destroier", casa: 80, orientacao: "h" }, // A9–B9
  ];
  assert.deepEqual(responderTiro(frota, [], 99), { tipo: "agua" });
  assert.deepEqual(responderTiro(frota, [], 80), { tipo: "acertou", navioId: "destroier" });
  assert.deepEqual(responderTiro(frota, [80], 81), { tipo: "afundou", navioId: "destroier", fimDeJogo: false });
  assert.deepEqual(responderTiro(frota, [80], 80), { tipo: "repetido" });

  // todas as casas atingidas menos B9 (a última do destróier): o tiro em B9 encerra o jogo
  const todas = [...mapaDaFrota(frota).keys()].filter((c) => c !== 81);
  assert.deepEqual(responderTiro(frota, todas, 81), {
    tipo: "afundou",
    navioId: "destroier",
    fimDeJogo: true,
  });

  const situacao = situacaoDaFrota(frota, [0, 1, 80, 81]);
  assert.equal(situacao.find((s) => s.navioId === "porta-avioes").acertos, 2);
  assert.equal(situacao.find((s) => s.navioId === "destroier").afundou, true);
});

test("grupo de acertos e água em volta do navio afundado", () => {
  // acertos em B2 e C2; o tiro que afundou foi em D2 (cruzador)
  const tiros = { 11: "acerto", 12: "acerto", 13: "afundou", 55: "acerto" };
  assert.deepEqual(grupoDeAcertos(tiros, 13), [11, 12, 13]);

  const marcadas = new Set([11, 12, 13, 55, 0]);
  const agua = aguaEmVolta([11, 12, 13], marcadas);
  assert.equal(agua.includes(0), false); // já estava marcada
  assert.equal(agua.includes(55), false); // longe
  assert.deepEqual(agua, [1, 2, 3, 4, 10, 14, 20, 21, 22, 23, 24]);
});

test("aproveitamento dos tiros", () => {
  assert.deepEqual(aproveitamento({}), { tiros: 0, acertos: 0, porcentagem: 0 });
  assert.deepEqual(aproveitamento({ 1: "agua", 2: "acerto", 3: "afundou", 4: "agua" }), {
    tiros: 4,
    acertos: 2,
    porcentagem: 50,
  });
});

test("a frota tem 5 navios e 17 casas", () => {
  assert.equal(FROTA.length, 5);
  assert.equal(TOTAL_CASAS, 17);
});
