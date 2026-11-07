"use client";

import { useState } from "react";
import { N_HEX, TOTAL_HEX, motorHex, type EstadoHex, type JogadaHex } from "@/lib/jogos/hex";
import { COR, lado } from "./cores";
import { JogoPorTurnos, type ConfigJogo, type PropsTabuleiro } from "./JogoPorTurnos";

const CORES = [COR.vermelho, COR.azul] as const;
/** Distância entre centros de casas vizinhas. */
const D = 40;
/** Raio do hexágono (do centro até a ponta). */
const S = D / Math.sqrt(3);
const ALTURA = Math.sqrt(3) / 2;

/** O losango fica em pé: a casa (0,0) em cima e a (8,8) embaixo. */
const centro = (i: number) => {
  const r = Math.floor(i / N_HEX);
  const c = i % N_HEX;
  return { x: 0.5 * (c - r) * D, y: ALTURA * (c + r) * D };
};

const hexagono = (x: number, y: number, s = S) =>
  Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 180) * (60 * k - 90);
    return `${(x + s * Math.cos(a)).toFixed(1)},${(y + s * Math.sin(a)).toFixed(1)}`;
  }).join(" ");

const MEIO = 0.5 * (N_HEX - 1) * D;
const MARGEM = 26;
const CAIXA = {
  x: -MEIO - D / 2 - MARGEM,
  y: -S - MARGEM,
  w: 2 * MEIO + D + 2 * MARGEM,
  h: 2 * ALTURA * (N_HEX - 1) * D + 2 * S + 2 * MARGEM,
};

/** As quatro bordas: as do vermelho (linhas 0 e 8) e as do azul (colunas 0 e 8), um pouco para fora. */
function Bordas() {
  const topo = centro(0);
  const direita = centro(N_HEX - 1);
  const esquerda = centro((N_HEX - 1) * N_HEX);
  const baixo = centro(TOTAL_HEX - 1);
  const fora = D * 0.78;
  const linha = (a: { x: number; y: number }, b: { x: number; y: number }, nx: number, ny: number, cor: string) => (
    <line x1={a.x + nx * fora} y1={a.y + ny * fora} x2={b.x + nx * fora} y2={b.y + ny * fora} stroke={cor} strokeWidth={11} strokeLinecap="round" />
  );
  return (
    <g aria-hidden="true">
      {linha(topo, direita, 0.866, -0.5, CORES[0].forte)}
      {linha(esquerda, baixo, -0.866, 0.5, CORES[0].forte)}
      {linha(topo, esquerda, -0.866, -0.5, CORES[1].forte)}
      {linha(direita, baixo, 0.866, 0.5, CORES[1].forte)}
    </g>
  );
}

function TabuleiroHex({ estado, jogador, podeJogar, aoJogar }: PropsTabuleiro<EstadoHex, JogadaHex>) {
  const [foco, setFoco] = useState<number | null>(null);
  const eu = jogador === "ambos" ? estado.vez : jogador;
  const caminho = new Set(estado.caminho ?? []);

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-painel p-2">
      <svg
        viewBox={`${CAIXA.x} ${CAIXA.y} ${CAIXA.w} ${CAIXA.h}`}
        className="block h-auto max-h-[68vh] w-full touch-manipulation select-none"
        role="group"
        aria-label="Tabuleiro de hex"
      >
        <Bordas />
        {Array.from({ length: TOTAL_HEX }, (_, i) => {
          const { x, y } = centro(i);
          const dono = estado.casas[i];
          const livre = dono === null;
          const pode = podeJogar && livre;
          const r = Math.floor(i / N_HEX);
          const c = i % N_HEX;
          const previa = pode && foco === i;
          return (
            <g key={i}>
              <polygon
                points={hexagono(x, y, S - 1.2)}
                fill={dono !== null ? CORES[dono].forte : previa ? CORES[eu].claro : "#ffffff"}
                stroke={caminho.has(i) ? "var(--color-sol)" : "var(--color-borda)"}
                strokeWidth={caminho.has(i) ? 4 : 1.5}
                role={pode ? "button" : undefined}
                tabIndex={pode ? 0 : undefined}
                aria-label={`Casa da linha ${r + 1}, coluna ${c + 1}${livre ? "" : dono === 0 ? ", vermelha" : ", azul"}`}
                className={pode ? "cursor-pointer outline-none" : undefined}
                onPointerEnter={pode ? () => setFoco(i) : undefined}
                onPointerLeave={pode ? () => setFoco((f) => (f === i ? null : f)) : undefined}
                onFocus={pode ? () => setFoco(i) : undefined}
                onBlur={pode ? () => setFoco((f) => (f === i ? null : f)) : undefined}
                onClick={pode ? () => aoJogar({ casa: i }) : undefined}
                onKeyDown={
                  pode
                    ? (ev) => {
                        if (ev.key === "Enter" || ev.key === " ") {
                          ev.preventDefault();
                          aoJogar({ casa: i });
                        }
                      }
                    : undefined
                }
              />
              {estado.ultima === i ? <circle cx={x} cy={y} r={5} fill="#ffffff" pointerEvents="none" /> : null}
            </g>
          );
        })}
      </svg>
      <p className="m-0 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm font-bold">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-2.5 w-6 rounded-full" style={{ background: CORES[0].forte }} />
          vermelho liga as bordas vermelhas
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-2.5 w-6 rounded-full" style={{ background: CORES[1].forte }} />
          azul liga as azuis
        </span>
      </p>
    </div>
  );
}

const config: ConfigJogo<EstadoHex, JogadaHex> = {
  motor: motorHex,
  nome: "Hex",
  lados: [lado("vermelho", "vermelho", "o", "o vermelho"), lado("azul", "azul", "o", "o azul")],
  Tabuleiro: TabuleiroHex,
  lembrete: "Na sua vez, ponha uma peça em qualquer casa livre. Ganha quem formar um caminho de peças suas ligando as duas bordas da sua cor.",
};

export function JogarHex({ conversa }: { conversa: readonly string[] }) {
  return <JogoPorTurnos config={config} conversa={conversa} />;
}
