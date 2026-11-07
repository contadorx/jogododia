"use client";

import { Chess } from "chess.js";
import { useEffect, useMemo, useState } from "react";
import type { Lado } from "@/lib/jogos/motor";
import { emPortugues, lancesPossiveis, motorXadrez, type EstadoXadrez, type JogadaXadrez, type Promocao } from "@/lib/jogos/xadrez";
import { Girar } from "../Icones";
import { lado } from "./cores";
import { JogoPorTurnos, type ConfigJogo, type PropsTabuleiro } from "./JogoPorTurnos";

const CLARA = "#f0d9b5";
const ESCURA = "#b58863";
const COLUNAS = "abcdefgh";
/** Os mesmos desenhos (cheios) para os dois lados; a cor vem do CSS. O ︎ pede o desenho de texto, não o emoji. */
const DESENHO: Record<string, string> = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
const NOME: Record<string, string> = { k: "rei", q: "dama", r: "torre", b: "bispo", n: "cavalo", p: "peão" };
const FONTE = '"Noto Sans Symbols 2", "Segoe UI Symbol", "Apple Symbols", "DejaVu Sans", sans-serif';
const INICIO: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };

function Peca({ tipo, cor, tamanho = "clamp(26px, 9.6vw, 50px)" }: { tipo: string; cor: "w" | "b"; tamanho?: string }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none select-none leading-none"
      style={{
        fontFamily: FONTE,
        fontSize: tamanho,
        color: cor === "w" ? "#ffffff" : "#1c2333",
        WebkitTextStroke: cor === "w" ? "1.2px #1c2333" : undefined,
        textShadow: "0 2px 2px rgba(0,0,0,.25)",
      }}
    >
      {`${DESENHO[tipo]}︎`}
    </span>
  );
}

/** As peças que cada lado já capturou (contando pelo que falta do outro). */
function capturadas(c: Chess, de: "w" | "b") {
  const doOutro = de === "w" ? "b" : "w";
  const contagem: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
  for (const linha of c.board()) for (const p of linha) if (p && p.color === doOutro && p.type !== "k") contagem[p.type] += 1;
  return (["q", "r", "b", "n", "p"] as const).flatMap((t) => Array(Math.max(0, INICIO[t] - contagem[t])).fill(t) as string[]);
}

function TabuleiroXadrez({ estado, jogador, podeJogar, aoJogar }: PropsTabuleiro<EstadoXadrez, JogadaXadrez>) {
  const [sel, setSel] = useState<string | null>(null);
  const [promocao, setPromocao] = useState<{ de: string; para: string } | null>(null);
  const [girado, setGirado] = useState(false);
  useEffect(() => {
    setSel(null);
    setPromocao(null);
  }, [estado]);

  const c = useMemo(() => new Chess(estado.fen), [estado.fen]);
  const tabuleiro = c.board();
  const destinos = useMemo(() => (podeJogar && sel ? lancesPossiveis(estado, sel) : []), [estado, podeJogar, sel]);
  const origens = useMemo(() => new Set<string>(podeJogar ? lancesPossiveis(estado).map((m) => m.from) : []), [estado, podeJogar]);
  const corDaVez = estado.vez === 0 ? "w" : "b";
  const reiEmXeque = estado.xeque
    ? tabuleiro.flat().find((p) => p && p.type === "k" && p.color === corDaVez)?.square
    : undefined;

  const debaixo: Lado = (jogador === 1 ? 1 : 0) as Lado;
  const virado = (debaixo === 1) !== girado;
  const linhas = virado ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
  const colunas = virado ? [...COLUNAS].reverse() : [...COLUNAS];

  const tocar = (casa: string) => {
    if (!podeJogar) return;
    if (origens.has(casa) && casa !== sel) return setSel(casa);
    if (casa === sel) return setSel(null);
    const lance = destinos.filter((m) => m.to === casa);
    if (!sel || lance.length === 0) return setSel(null);
    if (lance.some((m) => m.promotion)) return setPromocao({ de: sel, para: casa });
    aoJogar({ de: sel, para: casa });
  };

  const alvo = new Map<string, string>(destinos.map((m) => [m.to, m.captured ? "captura" : "livre"]));
  const ultima = estado.ultima;
  const cima: "w" | "b" = virado ? "w" : "b";
  const baixo: "w" | "b" = virado ? "b" : "w";
  const linhaDeCapturadas = (de: "w" | "b") => {
    const lista = capturadas(c, de);
    return (
      <p className="m-0 flex min-h-7 flex-wrap items-center gap-0.5 text-sm text-suave" aria-label={`Capturadas pelas ${de === "w" ? "brancas" : "pretas"}: ${lista.length}`}>
        {lista.length === 0 ? <span>nenhuma peça capturada ainda</span> : lista.map((t, i) => <Peca key={i} tipo={t} cor={de === "w" ? "b" : "w"} tamanho="20px" />)}
      </p>
    );
  };

  return (
    <div className="flex flex-col gap-1.5">
      {linhaDeCapturadas(cima)}
      <div className="relative">
        <div className="grid grid-cols-8 overflow-hidden rounded-xl border-4" style={{ borderColor: "#6b4526" }} role="grid" aria-label="Tabuleiro de xadrez">
          {linhas.flatMap((l, li) =>
            colunas.map((col, ci) => {
              const casa = `${col}${l}`;
              const p = tabuleiro[8 - l][COLUNAS.indexOf(col)];
              // a1 é escura: coluna (a = 0) + linha (1) ímpar
              const escura = (COLUNAS.indexOf(col) + l) % 2 === 1;
              const ativa = podeJogar && (origens.has(casa) || alvo.has(casa));
              const destaque = sel === casa ? "var(--color-azul)" : ultima && (ultima.de === casa || ultima.para === casa) ? "var(--color-sol)" : null;
              return (
                <button
                  key={casa}
                  type="button"
                  disabled={!ativa}
                  onClick={() => tocar(casa)}
                  aria-label={`${casa}${p ? `, ${NOME[p.type]} ${p.color === "w" ? (p.type === "q" || p.type === "r" ? "branca" : "branco") : p.type === "q" || p.type === "r" ? "preta" : "preto"}` : ""}`}
                  className="relative flex aspect-square items-center justify-center"
                  style={{
                    background: reiEmXeque === casa ? "radial-gradient(circle, #ff6b4a 0%, #c8381f 75%)" : escura ? ESCURA : CLARA,
                    boxShadow: destaque ? `inset 0 0 0 ${sel === casa ? 4 : 3}px ${destaque}` : undefined,
                  }}
                >
                  {p ? <Peca tipo={p.type} cor={p.color} /> : null}
                  {alvo.get(casa) === "livre" ? <span aria-hidden="true" className="absolute inset-[37%] rounded-full bg-tinta/35" /> : null}
                  {alvo.get(casa) === "captura" ? <span aria-hidden="true" className="absolute inset-[4%] rounded-full ring-[4px] ring-tinta/40" /> : null}
                  {li === 7 ? (
                    <span aria-hidden="true" className="absolute bottom-0 right-[3px] text-[10px] font-bold" style={{ color: escura ? CLARA : ESCURA }}>
                      {col}
                    </span>
                  ) : null}
                  {ci === 0 ? (
                    <span aria-hidden="true" className="absolute left-[3px] top-0 text-[10px] font-bold" style={{ color: escura ? CLARA : ESCURA }}>
                      {l}
                    </span>
                  ) : null}
                </button>
              );
            }),
          )}
        </div>
        {promocao ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-tinta/60 p-4" role="dialog" aria-label="Escolha a peça da promoção">
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-4">
              <p className="m-0 text-center font-bold">O peão chegou ao fim. Vira qual peça?</p>
              <div className="flex gap-2">
                {(["q", "r", "b", "n"] as Promocao[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => aoJogar({ ...promocao, promo: t })}
                    aria-label={NOME[t]}
                    className="flex h-16 w-16 items-center justify-center rounded-xl ring-1 ring-borda hover:ring-azul"
                    style={{ background: CLARA }}
                  >
                    <Peca tipo={t} cor={corDaVez} tamanho="40px" />
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setPromocao(null)} className="text-[15px] font-bold text-suave underline underline-offset-2">
                Voltar
              </button>
            </div>
          </div>
        ) : null}
      </div>
      {linhaDeCapturadas(baixo)}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={() => setGirado(!girado)} className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-bold text-suave underline underline-offset-2">
          <Girar />
          Girar o tabuleiro
        </button>
        {estado.lances.length ? (
          <details className="text-sm">
            <summary className="cursor-pointer font-bold text-suave">Lances da partida ({estado.lances.length})</summary>
            <p className="m-0 mt-1 max-w-[30rem] leading-relaxed">
              {estado.lances
                .map((san, i) => (i % 2 === 0 ? `${i / 2 + 1}. ${emPortugues(san)}` : emPortugues(san)))
                .join(" ")}
            </p>
          </details>
        ) : null}
      </div>
    </div>
  );
}

const config: ConfigJogo<EstadoXadrez, JogadaXadrez> = {
  motor: motorXadrez,
  nome: "Xadrez",
  lados: [lado("branco", "brancas", "as"), lado("preto", "pretas", "as")],
  Tabuleiro: TabuleiroXadrez,
  lembrete: "Toque numa peça sua para ver para onde ela pode ir. O jogo só aceita lances permitidos, inclusive roque, en passant e promoção.",
  aviso: (e) => (e.xeque ? `Xeque! O rei das ${e.vez === 0 ? "brancas" : "pretas"} está ameaçado: o próximo lance tem que tirá-lo do perigo.` : null),
};

export function JogarXadrez({ conversa }: { conversa: readonly string[] }) {
  return <JogoPorTurnos config={config} conversa={conversa} />;
}

